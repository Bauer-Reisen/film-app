// Seite „Kinderfilme“ bzw. „Kinderserien“: gute Titel mit passender Altersfreigabe.
// Zwei Arten: „Unterhaltung“ (gut bewertet und beliebt, dazu deutsche und neuere Titel)
// und „Wissen & Natur“ (bekannte Wissensformate und Dokus zu einem Thema).
import { KIDS, KIDS_TV } from './config.js?v=1.36.1';
import * as store from './store.js?v=1.36.1';
import * as tmdb from './tmdb.js?v=1.36.1';
import { esc, toast } from './ui.js?v=1.36.1';
import { markButtons, moreBox } from './cards.js?v=1.36.1';
import { runtimeSlot } from './runtime.js?v=1.36.1';
import { trailerBtn } from './trailer.js?v=1.36.1';
import { ageOk, ageOf } from './age.js?v=1.36.1';
import { MEDIA, mediaOf, marksOf, askStarted, stateLabel, pressedExact } from './media.js?v=1.36.1';
import { seenToast } from './via.js?v=1.36.1';
import { creditsSlot } from './credits.js?v=1.36.1';
import { TOPICS, handFor, topicOf } from './kids-wissen.js?v=1.36.1';

// Drei große Knöpfe; „Schon gesehen“ klappt die Bewertung auf
const MAIN = [['known', '✓', 'Schon gesehen'], ['want', '+', 'Merken'], ['noInterest', '–', 'Nein danke']];
const KNOWN = [['liked', '♥', 'Mag ich'], ['seen', '✓', 'Ganz okay'], ['disliked', '✕', 'Mag ich nicht']];
const KNOWN_TV = [...KNOWN, ['started', '⏸', 'Angefangen']];
const HIDE = new Set(['disliked', 'noInterest', 'dropped']);
const SEEN = new Set(['seen', 'liked', 'loved']);
const DOCS = 99;

let profile = null;
let page = 0;
let shownCount = 0;
let pool = new Map(); // id → { movie, score, why }
let justMarked = new Set(); // hier gerade als gesehen markiert – Karte bleibt stehen, bis man die Seite verlässt
let run = 0;
let forKey = null;
let md = 'movie';
let K = KIDS;
const W = () => MEDIA[md].w;
const marks = () => marksOf(profile, md);
function setMedia(p) { md = mediaOf(p); K = md === 'tv' ? { ...KIDS, ...KIDS_TV } : KIDS; }

const box = () => document.getElementById('kids-list');
const set = () => profile.settings || {};
const age = () => set().kidsAge ?? 6;
const mode = () => (set().kidsMode === 'wissen' ? 'wissen' : 'fun');
const topic = () => (mode() === 'wissen' && topicOf(set().kidsTopic) ? set().kidsTopic : null);
const short = () => !!set().kidsShort;
// Optional: auch Abenteuerfilme (z. B. Harry Potter), die bei TMDB nicht als Familienfilm gelten – nur bei Filmen
const ADVENTURE = 12;
const withAdventure = () => md === 'movie' && mode() === 'fun' && !!set().kidsAdventure;
const genres = () => (withAdventure() ? [...K.genres, ADVENTURE] : K.genres);
const shortText = () => (md === 'tv' ? `Kurze Folgen (bis ${K.shortMax} Min.)` : `Kurz (unter ${K.shortMax} Min.)`);

// Punkte: Note und Beliebtheit
const base = (m) => (m.vote_average || 0) + Math.log10(Math.max(m.vote_count || 1, 1)) * 0.6;
const WHY = {
  hand: '🎓 Bekanntes Wissensformat',
  feel: '💛 Hilft, Gefühle zu verstehen',
  studio: () => (md === 'tv' ? 'Von einem deiner Lieblingssender' : 'Von einem deiner Lieblingsstudios'),
  german: '🇩🇪 Aus Deutschland',
  recent: '🆕 Aus den letzten Jahren',
};
const BONUS = () => ({ studio: K.studioBonus, recent: K.recent.bonus, hand: K.wissen.handBonus });
const RANK = ['hand', 'feel', 'studio', 'german', 'recent']; // welcher Grund auf der Karte steht

const yearsAgo = (n) => new Date(Date.now() - n * 365 * 86400000).toISOString().slice(0, 10);

// Die Abfragen für eine Seite – je nach Art
function jobs(a) {
  const c = MEDIA[md];
  const tv = md === 'tv';
  const lang = profile.language;
  const without = tv ? `${K.without},${c.without}` : '27,53,10752';
  const len = short() ? { 'with_runtime.lte': K.shortMax } : {};
  const deAge = { certification_country: 'DE', 'certification.lte': a };
  const q = (src, gs, params) => tmdb.get(c.discover, { language: lang, sort_by: 'vote_count.desc', page, ...len, ...params }).then((d) => ({ src, gs, d }));
  if (mode() === 'wissen') {
    const list = topic() ? [topicOf(topic())] : TOPICS;
    const docs = list.filter((t) => t[3]);
    const feel = topic() ? list.filter((t) => !t[3]) : []; // Gefühle-Filme nur, wenn man das Thema wählt
    const out = [];
    const kw = (ts) => ts.map((t) => t[2]).join('|');
    const wv = { 'vote_average.gte': K.wissen.minVote, 'vote_count.gte': K.wissen.minVotes };
    if (docs.length) out.push(q('docs', [DOCS], { with_genres: String(DOCS), without_genres: tv ? '80,10768,10764,10767,10763' : '10402,27,53,80,10752', with_keywords: kw(docs), ...wv }));
    if (feel.length) out.push(q('feelq', genres(), { with_genres: genres().join('|'), without_genres: without, with_keywords: kw(feel), ...deAge, ...wv }));
    return out;
  }
  const common = { with_genres: genres().join('|'), without_genres: without, 'vote_average.gte': K.minVote, 'vote_count.gte': K.minVotes };
  const since = yearsAgo(K.recent.years);
  const out = [
    q('de', genres(), { ...common, ...deAge }),
    // Ohne deutsche Freigabe: US-Freigabe, wird unten am einzelnen Titel nachgeprüft
    q('us', genres(), { ...common, certification_country: 'US', certification: K.usFallback[a].join('|') }),
    // Deutsche Titel haben wenige Stimmen – nach Beliebtheit, aus den letzten Jahren, und fest eingemischt (siehe ordered)
    q('german', genres(), { ...common, ...deAge, with_origin_country: 'DE', sort_by: 'popularity.desc', [tv ? 'first_air_date.gte' : 'primary_release_date.gte']: yearsAgo(K.german.years), 'vote_average.gte': K.german.minVote, 'vote_count.gte': K.german.minVotes }),
    q('recent', genres(), { ...common, ...deAge, [tv ? 'first_air_date.gte' : 'primary_release_date.gte']: since, 'vote_count.gte': K.recent.minVotes }),
  ];
  // Lieblingsstudios bzw. bei Serien Lieblingssender bekommen einen kleinen Vorrang
  const studios = tv ? (profile.networks || []).map((n) => n.id) : profile.companies.map((x) => [x.id, ...(x.also || [])]).flat();
  if (studios.length) out.push(q('studio', genres(), { ...common, ...deAge, [tv ? 'with_networks' : 'with_companies']: studios.join('|') }));
  return out;
}

// Details auf Deutsch (FLIMMO/FBW kennen nur deutsche Titel) mit Freigabe
const details = (id) => tmdb.get(`${MEDIA[md].path}/${id}`, { language: 'de-DE', append_to_response: md === 'tv' ? 'content_ratings' : 'release_dates' });
const lengthOk = (det) => {
  if (!short()) return true;
  const n = md === 'tv' ? det.episode_run_time?.[0] : det.runtime;
  return !n || n <= K.shortMax;
};

// Handliste (nur „Wissen“, nur einmal): die Freigabe bei TMDB zählt, sonst unsere Altersangabe
async function loadHand(a, fresh) {
  await Promise.allSettled(handFor(md, topic()).map(async ([id, tp, minAge]) => {
    if (pool.has(id) || HIDE.has(marks()[id]?.s) || SEEN.has(marks()[id]?.s)) return;
    const det = await details(id);
    const fsk = ageOf(det);
    if ((fsk ?? minAge) > a || !det.poster_path || !lengthOk(det)) return;
    const m = { id, title: det.title, poster_path: det.poster_path, release_date: det.release_date, overview: det.overview, vote_average: det.vote_average, vote_count: det.vote_count, original_language: det.original_language, genre_ids: (det.genres || []).map((g) => g.id) };
    fresh.set(id, { movie: m, score: base(m) + K.wissen.handBonus, why: new Set([tp === 'gefuehle' ? 'feel' : 'hand']), de: det.title, checked: true });
  }));
}

async function loadPage(mine) {
  page++;
  const a = age();
  const today = new Date().toISOString().slice(0, 10);
  const fresh = new Map();
  const settled = await Promise.allSettled([...jobs(a), ...(mode() === 'wissen' && page === 1 ? [loadHand(a, fresh).then(() => null)] : [])]);
  if (mine !== run) return false;
  const ok = settled.filter((r) => r.status === 'fulfilled' && r.value).map((r) => r.value);
  if (!ok.length && !fresh.size) throw settled[0].reason || new Error('Gerade nichts gefunden.');

  for (const { src, gs, d } of ok) {
    for (const m of d.results || []) {
      if (m.adult || !m.poster_path || !m.release_date || m.release_date > today) continue;
      if (!(m.genre_ids || []).some((g) => gs.includes(g))) continue; // nur echte Kinder-/Familientitel bzw. Dokus
      if (HIDE.has(marks()[m.id]?.s) || SEEN.has(marks()[m.id]?.s)) continue; // Gesehenes gar nicht erst vorschlagen
      const x = pool.get(m.id) || fresh.get(m.id);
      const bonus = BONUS()[src] || 0;
      const tag = RANK.includes(src);
      if (x) { if (tag && !x.why.has(src)) { x.why.add(src); x.score += bonus; } continue; }
      fresh.set(m.id, { movie: m, score: base(m) + bonus, why: new Set(tag ? [src] : []) });
    }
  }
  // Jeden Titel einzeln prüfen: die strengste deutsche Freigabe zählt, sonst die US-Freigabe
  let added = 0;
  await Promise.allSettled([...fresh.values()].map(async (x) => {
    if (x.checked) { pool.set(x.movie.id, x); added++; return; }
    const det = await details(x.movie.id);
    x.de = det.title;
    if (ageOk(det, a)) { pool.set(x.movie.id, x); added++; }
  }));
  return added > 0 || ok.some((r) => (r.d.total_pages || 1) > page);
}

// Nur Ungesehene, nach Punkten (eben hier markierte bleiben an ihrem Platz stehen)
// Bei „Unterhaltung“ ist jeder 4. Platz ein deutscher Titel (die haben sonst gegen die Welterfolge keine Chance)
function ordered() {
  const list = [...pool.values()]
    .filter((x) => { const st = marks()[x.movie.id]?.s; return !HIDE.has(st) && (!SEEN.has(st) || justMarked.has(x.movie.id)); })
    .sort((a, b) => b.score - a.score);
  if (mode() !== 'fun') return list;
  const de = list.filter((x) => x.why.has('german'));
  const rest = list.filter((x) => !x.why.has('german'));
  const out = [];
  while (rest.length || de.length) out.push((out.length % K.german.every === K.german.every - 1 && de.length) || !rest.length ? de.shift() : rest.shift());
  return out;
}

// Auswahl oben (wird bei jeder Änderung neu gezeichnet)
function controls() {
  const a = age();
  const wis = mode() === 'wissen';
  const t = topic();
  const chip = (key, label) => `<button type="button" class="chip" data-kid-topic="${key}" aria-pressed="${t === key || (!t && !key)}">${label}</button>`;
  return `
    <div class="segmented kids-mode" role="group" aria-label="Art">
      <button type="button" class="seg" data-kid-mode="fun" aria-pressed="${!wis}">🎈 Unterhaltung</button>
      <button type="button" class="seg" data-kid-mode="wissen" aria-pressed="${wis}">🎓 Wissen & Natur</button>
    </div>
    ${wis ? `<div class="chip-scroll kids-topics" role="group" aria-label="Thema">${chip('', 'Alle Themen')}${TOPICS.map(([k, l]) => chip(k, l)).join('')}</div>` : ''}
    <div class="segmented ages" role="group" aria-label="Altersfreigabe">
      ${K.ages.map((x) => `<button type="button" class="seg" data-kid-age="${x}" aria-pressed="${x === a}">ab ${x}</button>`).join('')}
    </div>
    <label class="radio kids-adv"><input type="checkbox" data-kid-short${short() ? ' checked' : ''}> <span>${shortText()} <span class="muted small">– gut für die Kleinen</span></span></label>
    ${md === 'movie' && !wis ? `<label class="radio kids-adv"><input type="checkbox" data-kid-adv${withAdventure() ? ' checked' : ''}> <span>Auch Abenteuerfilme <span class="muted small">(z. B. Harry Potter – nicht extra für Kinder gemacht)</span></span></label>` : ''}
    <p class="muted small">${wis
      ? 'Bekannte Wissenssendungen und gut bewertete Dokus zum Thema – nach FSK bzw. US-Freigabe.'
      : `Nach deutscher FSK, sonst nach US-Freigabe. Gut bewertete und beliebte ${W().many}, dazu deutsche und neuere.`}</p>`;
}

export function render(p) {
  profile = p;
  setMedia(p);
  return `
    <p class="back"><a href="#/vorschlaege">← Vorschläge</a></p>
    <h1>${W().kids}</h1>
    <div id="kids-controls">${controls()}</div>
    <details class="flimmo-info">
      <summary>Was sind FLIMMO${md === 'movie' ? ' und FBW' : ''}? <span aria-hidden="true">▾</span></summary>
      <p><strong>FLIMMO</strong> ist ein kostenloser Ratgeber für Eltern. Fachleute schauen sich Filme und Serien an und schreiben, ab welchem Alter sie wirklich passen – und was Kinder vielleicht ängstigen oder überfordern könnte. Die FSK sagt nur, was erlaubt ist; FLIMMO sagt, was gut passt.</p>
      ${md === 'movie' ? '<p>Die <strong>FBW</strong> (Deutsche Film- und Medienbewertung) prüft Filme auf ihre Qualität und vergibt die Prädikate „wertvoll“ und „besonders wertvoll“ – mit einer Begründung, die man nachlesen kann.</p>' : ''}
      <p>Auf jeder Karte unter „Mehr“ führt ein Link direkt zur Suche dort.</p>
    </details>
    <div id="kids-list" aria-live="polite"><p class="muted center">Suche ${W().kids} …</p></div>`;
}

export async function mount(p) {
  profile = p;
  setMedia(p);
  const mine = ++run;
  const key = `${p.id}:${md}:${age()}:${withAdventure()}:${mode()}:${topic()}:${short()}`;
  if (forKey !== key) { pool = new Map(); page = 0; forKey = key; }
  shownCount = 0;
  justMarked = new Set();
  try {
    while (pool.size < 20 && page < 5) { if (!(await loadPage(mine))) break; if (mine !== run) return; }
  } catch (err) {
    if (mine === run && box()) box().innerHTML = `<div class="card center"><p>${esc(err.message)}</p><button class="btn" type="button" data-kid="retry">Nochmal versuchen</button></div>`;
    return;
  }
  if (mine !== run || !box() || mediaOf(profile) !== md) return;
  paint();
}

function paint(extra = 0) {
  const list = ordered();
  shownCount = Math.max(shownCount, Math.min(list.length, 20)) + extra;
  const items = list.slice(0, shownCount);
  if (!items.length) {
    box().innerHTML = `<div class="card placeholder"><p><strong>Gerade keine passenden ${W().many} gefunden.</strong></p>
      <p class="muted">${mode() === 'wissen' && md === 'movie' ? 'Kinder-Dokus als Film gibt es zu manchen Themen kaum – bei den Kinderserien (oben auf „Serien“ umschalten) gibt es viel mehr (z. B. „Es war einmal … das Leben“, „Checker Tobi“). ' : ''}${short() ? `Vielleicht ohne „${shortText()}“ probieren – oder ein anderes Alter.` : 'Vielleicht ein anderes Thema oder Alter probieren.'}</p></div>`;
    return;
  }
  box().innerHTML = `
    <div class="suggestions">${items.map(card).join('')}</div>
    <div class="row center-row"><button class="btn btn-primary" type="button" data-kid="more">Mehr laden</button></div>`;
}

// FLIMMO (Elternratgeber) und FBW (Filmbewertung) – dort nach dem Titel suchen
// Nur der Haupttitel: „Coco - Lebendiger als das Leben!“ findet FLIMMO nicht, „Coco“ schon
const mainTitle = (t) => { const m = String(t).split(/\s[-–:]\s|:\s/)[0].trim(); return m.length >= 2 ? m : String(t); };
const flimmoLink = (title) => `<a class="btn btn-small flimmo-link" href="https://www.flimmo.de/?q=${encodeURIComponent(mainTitle(title))}" target="_blank" rel="noopener" aria-label="Bei FLIMMO nachsehen: ${esc(title)}">Bei FLIMMO nachsehen ↗</a>`;
const fbwLink = (title) => `<a class="btn btn-small flimmo-link" href="https://www.fbw-filmbewertung.com/suche?query=${encodeURIComponent(mainTitle(title))}" target="_blank" rel="noopener" aria-label="Bei der FBW nachsehen: ${esc(title)}">Bei der FBW nachsehen ↗</a>`;

function card(x) {
  const m = x.movie;
  const y = tmdb.year(m.release_date);
  const s = marks()[m.id]?.s || null;
  const why = RANK.find((r) => x.why?.has(r));
  const reason = why ? (typeof WHY[why] === 'function' ? WHY[why]() : WHY[why]) : '';
  const hint = SEEN.has(s) ? 'Schon gesehen' : s === 'paused' ? '⏸ Angefangen – willst du weiterschauen' : reason;
  const title = x.de || m.title;
  return `
    <article class="film sg ${s === 'loved' ? 'is-loved' : ''}" data-kidfilm="${m.id}">
      <button type="button" class="poster-btn" data-kfb="loved" aria-pressed="${s === 'loved'}" aria-label="${esc(m.title)} als ${W().fav}">
        <img class="poster" src="${tmdb.img(m.poster_path, 'w185')}" srcset="${tmdb.img(m.poster_path, 'w185')} 185w, ${tmdb.img(m.poster_path, 'w342')} 342w"
          sizes="(min-width: 768px) 200px, 100px" width="100" height="150" loading="lazy" decoding="async" alt="">
        <span class="poster-star" aria-hidden="true">${s === 'loved' ? '★' : '☆'}</span>
      </button>
      <div class="film-info">
        <h3 class="film-title">${esc(m.title)} <span class="year">${y || ''}${runtimeSlot(m.id, md)}</span></h3>
        ${hint ? `<p class="reason">${hint}</p>` : ''}
        <div class="film-extra">${moreBox(m.overview ? `<p>${esc(m.overview)}</p>` : '', `
          <p class="rating muted small">TMDB-Note ${(m.vote_average || 0).toFixed(1).replace('.', ',')}</p>
          ${creditsSlot(m.id, md)}
          <p class="row">${flimmoLink(title)}${md === 'movie' ? fbwLink(title) : ''}</p>`)}${trailerBtn(m.id, m.title, false, md)}</div>
        ${markButtons('data-kfb', m.title, MAIN, md === 'tv' ? KNOWN_TV : KNOWN, { s, pressed: pressedExact })}
      </div>
    </article>`;
}

async function feedback(cardEl, key) {
  const id = Number(cardEl.dataset.kidfilm);
  const x = pool.get(id);
  if (!x) return;
  const m = x.movie;
  const mine = md;
  const old = marks()[id]?.s || null;
  let now;
  if (key === 'loved') now = old === 'loved' ? 'liked' : 'loved';
  else if (pressedExact(old, key)) now = null;
  else if (key === 'started') { now = await askStarted(m.title); if (!now) return; }
  else now = key;
  if (SEEN.has(now)) justMarked.add(id);
  const prev = store.setMark(profile.id, mine, id, now, { g: m.genre_ids, l: m.original_language, y: tmdb.year(m.release_date), n: m.title, o: 1 });
  if (HIDE.has(now)) {
    cardEl.hidden = true;
    toast(`${stateLabel(mine, now).replace(/^[^\p{L}]+/u, '')}: ${m.title}`, { label: 'Rückgängig', run: () => { store.restoreMark(profile.id, mine, id, prev); cardEl.hidden = false; } });
    return;
  }
  cardEl.outerHTML = card(x); // Karte bleibt stehen, zeigt den neuen Stand
  if (now) seenToast(`${stateLabel(mine, now).replace(/^[^\p{L}]+/u, '')}: ${m.title}`, null, profile.id, mine, id, now);
}

async function more(btn) {
  btn.disabled = true;
  btn.textContent = 'Lädt …';
  const mine = run;
  if (ordered().length < shownCount + 20 && page < 10) {
    try { await loadPage(mine); } catch { /* dann eben, was da ist */ }
  }
  if (mine !== run || !box()) return;
  const before = shownCount;
  paint(20);
  if (Math.min(shownCount, ordered().length) <= before) toast(`Mehr passende ${W().kids} gibt es gerade nicht.`);
}

// Einstellung merken, Auswahl neu zeichnen, neu suchen
function change(patch) {
  store.updateProfile(profile.id, { settings: { ...set(), ...patch } });
  profile = store.getProfile(profile.id);
  const c = document.getElementById('kids-controls');
  if (c) c.innerHTML = controls();
  box().innerHTML = `<p class="muted center">Suche ${W().kids} …</p>`;
  mount(profile);
  return true;
}

export function handleClick(e) {
  const t = e.target;
  const adv = t.closest('[data-kid-adv]');
  if (adv) return change({ kidsAdventure: adv.checked });
  const sh = t.closest('[data-kid-short]');
  if (sh) return change({ kidsShort: sh.checked });
  const mo = t.closest('[data-kid-mode]');
  if (mo) return mo.dataset.kidMode === mode() || change({ kidsMode: mo.dataset.kidMode });
  const tp = t.closest('[data-kid-topic]');
  if (tp) return change({ kidsTopic: tp.dataset.kidTopic || null });
  const a = t.closest('[data-kid-age]');
  if (a) return change({ kidsAge: Number(a.dataset.kidAge) });
  const fb = t.closest('[data-kfb]');
  if (fb) { feedback(fb.closest('[data-kidfilm]'), fb.dataset.kfb); return true; }
  const act = t.closest('[data-kid]')?.dataset.kid;
  if (act === 'more') { more(t.closest('[data-kid]')); return true; }
  if (act === 'retry') { mount(profile); return true; }
  return false;
}
