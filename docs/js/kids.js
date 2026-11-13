// Seite „Kinderfilme“ bzw. „Kinderserien“: gute Titel mit passender Altersfreigabe.
// Es zählt vor allem Bewertung und Beliebtheit – Kinder haben ihren eigenen Geschmack.
import { KIDS, KIDS_TV } from './config.js?v=1.12.0';
import * as store from './store.js?v=1.12.0';
import * as tmdb from './tmdb.js?v=1.12.0';
import { esc, toast } from './ui.js?v=1.12.0';
import { runtimeSlot } from './runtime.js?v=1.12.0';
import { trailerBtn } from './trailer.js?v=1.12.0';
import { ageOk } from './age.js?v=1.12.0';
import { MEDIA, mediaOf, marksOf, askStarted, stateLabel, STARTED, pressed } from './media.js?v=1.12.0';

const FEEDBACK = [
  ['want', '+', 'Merken'],
  ['seen', '✓', 'Gesehen'],
  ['liked', '♥', 'Mag ich'],
  ['disliked', '✕', 'Mag ich nicht'],
  ['noInterest', '–', 'Kein Interesse'],
];
const FEEDBACK_TV = [...FEEDBACK.slice(0, 4), ['started', '⏸', 'Angefangen'], FEEDBACK[4]];
const HIDE = new Set(['disliked', 'noInterest', 'dropped']);
const SEEN = new Set(['seen', 'liked', 'loved']);

let profile = null;
let page = 0;
let shownCount = 0;
let pool = new Map(); // id → { movie, score, why }
let run = 0;
let forAge = null;
let md = 'movie';
let K = KIDS;
const W = () => MEDIA[md].w;
const marks = () => marksOf(profile, md);
function setMedia(p) { md = mediaOf(p); K = md === 'tv' ? { ...KIDS, ...KIDS_TV } : KIDS; }

const box = () => document.getElementById('kids-list');
const age = () => profile.settings?.kidsAge ?? 6;

// Punkte: Note und Beliebtheit, kleiner Vorrang für eigene Lieblingsstudios
const base = (m) => (m.vote_average || 0) + Math.log10(Math.max(m.vote_count || 1, 1)) * 0.6;

async function loadPage(mine) {
  page++;
  const a = age();
  const lang = profile.language;
  const today = new Date().toISOString().slice(0, 10);
  const c = MEDIA[md];
  const common = { language: lang, with_genres: K.genres.join('|'), without_genres: md === 'tv' ? `${K.without},${c.without}` : '27,53,10752', 'vote_average.gte': K.minVote, 'vote_count.gte': K.minVotes, sort_by: 'vote_count.desc', page };
  // Lieblingsstudios bzw. bei Serien Lieblingssender bekommen einen kleinen Vorrang
  const studios = md === 'tv' ? (profile.networks || []).map((n) => n.id) : profile.companies.map((x) => [x.id, ...(x.also || [])]).flat();
  const jobs = [
    tmdb.get(c.discover, { ...common, certification_country: 'DE', 'certification.lte': a }).then((d) => ({ src: 'de', d })),
    // Ohne deutsche Freigabe: US-Freigabe, wird unten am einzelnen Film nachgeprüft
    tmdb.get(c.discover, { ...common, certification_country: 'US', certification: K.usFallback[a].join('|') }).then((d) => ({ src: 'us', d })),
  ];
  if (studios.length) {
    jobs.push(tmdb.get(c.discover, { ...common, certification_country: 'DE', 'certification.lte': a, [md === 'tv' ? 'with_networks' : 'with_companies']: studios.join('|') }).then((d) => ({ src: 'studio', d })));
  }
  const settled = await Promise.allSettled(jobs);
  if (mine !== run) return false;
  const ok = settled.filter((r) => r.status === 'fulfilled').map((r) => r.value);
  if (!ok.length) throw settled[0].reason;

  const fresh = new Map();
  let added = 0;
  for (const { src, d } of ok) {
    for (const m of d.results || []) {
      if (m.adult || !m.poster_path || !m.release_date || m.release_date > today) continue;
      if (HIDE.has(marks()[m.id]?.s)) continue;
      const known = pool.get(m.id);
      const score = base(m) + (src === 'studio' ? K.studioBonus : 0);
      if (known) { if (src === 'studio' && !known.studio) { known.score += K.studioBonus; known.studio = true; } continue; }
      const dup = fresh.get(m.id);
      if (dup) { if (src === 'studio' && !dup.studio) { dup.score += K.studioBonus; dup.studio = true; } continue; }
      fresh.set(m.id, { movie: m, score, studio: src === 'studio', page });
    }
  }
  // Jeden Titel einzeln prüfen: die strengste deutsche Freigabe zählt, sonst die US-Freigabe
  await Promise.allSettled([...fresh.values()].map(async (x) => {
    // auf Deutsch laden: FLIMMO kennt nur deutsche Titel (der Link unten sucht danach)
    const det = await tmdb.get(`${c.path}/${x.movie.id}`, { language: 'de-DE', append_to_response: md === 'tv' ? 'content_ratings' : 'release_dates' });
    x.de = det.title;
    if (ageOk(det, a)) { pool.set(x.movie.id, x); added++; }
  }));
  return added > 0 || (ok[0].d.total_pages || 1) > page;
}

// Ungesehene zuerst (nach Punkten), dann gesehene mit Hinweis
function ordered() {
  const list = [...pool.values()].filter((x) => !HIDE.has(marks()[x.movie.id]?.s));
  const isSeen = (x) => SEEN.has(marks()[x.movie.id]?.s);
  return list.sort((a, b) => isSeen(a) - isSeen(b) || b.score - a.score);
}

export function render(p) {
  profile = p;
  setMedia(p);
  const a = age();
  return `
    <p class="back"><a href="#/vorschlaege">← Vorschläge</a></p>
    <h1>${W().kids}</h1>
    <div class="segmented ages" role="group" aria-label="Altersfreigabe">
      ${K.ages.map((x) => `<button type="button" class="seg" data-kid-age="${x}" aria-pressed="${x === a}">ab ${x}</button>`).join('')}
    </div>
    <p class="muted small">Nach deutscher FSK, sonst nach US-Freigabe. Vor allem gut bewertete und beliebte ${W().many}.</p>
    <details class="flimmo-info">
      <summary>Was ist FLIMMO? <span aria-hidden="true">▾</span></summary>
      <p>FLIMMO ist ein kostenloser Ratgeber für Eltern. Fachleute schauen sich Filme und Serien an und schreiben, ab welchem Alter sie wirklich passen – und was Kinder vielleicht ängstigen oder überfordern könnte. Die FSK sagt nur, was erlaubt ist; FLIMMO sagt, was gut passt.</p>
      <p>Auf jeder Karte führt „Bei FLIMMO nachsehen ↗“ direkt zur Suche dort.</p>
    </details>
    <div id="kids-list" aria-live="polite"><p class="muted center">Suche ${W().kids} …</p></div>`;
}

export async function mount(p) {
  profile = p;
  setMedia(p);
  const mine = ++run;
  const key = `${p.id}:${md}:${age()}`;
  if (forAge !== key) { pool = new Map(); page = 0; forAge = key; }
  shownCount = 0;
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
    box().innerHTML = `<div class="card placeholder"><p><strong>Gerade keine passenden ${W().many} gefunden.</strong></p></div>`;
    return;
  }
  box().innerHTML = `
    <div class="suggestions">${items.map(card).join('')}</div>
    <div class="row center-row"><button class="btn btn-primary" type="button" data-kid="more">Mehr laden</button></div>`;
}

// FLIMMO (Elternratgeber) zeigt, ab welchem Alter ein Titel wirklich passt – dort nach dem Titel suchen
// Nur der Haupttitel: „Coco - Lebendiger als das Leben!“ findet FLIMMO nicht, „Coco“ schon
const mainTitle = (t) => { const m = String(t).split(/\s[-–:]\s|:\s/)[0].trim(); return m.length >= 2 ? m : String(t); };
const flimmoLink = (title) => `<a class="btn btn-small flimmo-link" href="https://www.flimmo.de/?q=${encodeURIComponent(mainTitle(title))}" target="_blank" rel="noopener" aria-label="Bei FLIMMO nachsehen: ${esc(title)}">Bei FLIMMO nachsehen ↗</a>`;

function card(x) {
  const m = x.movie;
  const y = tmdb.year(m.release_date);
  const s = marks()[m.id]?.s || null;
  const hint = SEEN.has(s) ? 'Schon gesehen' : s === 'paused' ? '⏸ Angefangen – willst du weiterschauen' : x.studio ? (md === 'tv' ? 'Von einem deiner Lieblingssender' : 'Von einem deiner Lieblingsstudios') : '';
  const overview = m.overview ? `<details class="overview"><summary>Worum geht's?</summary><p>${esc(m.overview)}</p></details>` : '';
  return `
    <article class="film sg ${s === 'loved' ? 'is-loved' : ''}" data-kidfilm="${m.id}">
      <button type="button" class="poster-btn" data-kfb="loved" aria-pressed="${s === 'loved'}" aria-label="${esc(m.title)} als ${W().fav}">
        <img class="poster" src="${tmdb.img(m.poster_path, 'w185')}" srcset="${tmdb.img(m.poster_path, 'w185')} 185w, ${tmdb.img(m.poster_path, 'w342')} 342w"
          sizes="(min-width: 768px) 200px, 100px" width="100" height="150" loading="lazy" decoding="async" alt="">
        <span class="poster-star" aria-hidden="true">${s === 'loved' ? '★' : '☆'}</span>
      </button>
      <div class="film-info">
        <h3 class="film-title">${esc(m.title)}${y ? ` <span class="year">${y}</span>` : ''}</h3>
        ${hint ? `<p class="reason">${hint}</p>` : ''}
        <p class="rating muted small">TMDB-Note ${(m.vote_average || 0).toFixed(1).replace('.', ',')}${runtimeSlot(m.id, md)}</p>
        <div class="film-extra">${overview}${trailerBtn(m.id, m.title, false, md)}${flimmoLink(x.de || m.title)}</div>
        <div class="marks marks-5" role="group" aria-label="Rückmeldung zu ${esc(m.title)}">
          ${(md === 'tv' ? FEEDBACK_TV : FEEDBACK).map(([key, icon, label]) => `<button type="button" class="mark mark-${key}" data-kfb="${key}" aria-pressed="${pressed(s, key)}"><span aria-hidden="true">${icon}</span> ${label}</button>`).join('')}
        </div>
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
  else if (pressed(old, key)) now = null;
  else if (key === 'started') { now = await askStarted(m.title); if (!now) return; }
  else now = key;
  const prev = store.setMark(profile.id, mine, id, now, { g: m.genre_ids, l: m.original_language, y: tmdb.year(m.release_date), n: m.title });
  if (HIDE.has(now)) {
    cardEl.hidden = true;
    toast(`${stateLabel(mine, now).replace(/^[^\p{L}]+/u, '')}: ${m.title}`, { label: 'Rückgängig', run: () => { store.restoreMark(profile.id, mine, id, prev); cardEl.hidden = false; } });
    return;
  }
  cardEl.outerHTML = card(x); // Karte bleibt stehen, zeigt den neuen Stand
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

export function handleClick(e) {
  const a = e.target.closest('[data-kid-age]');
  if (a) {
    store.updateProfile(profile.id, { settings: { ...(profile.settings || {}), kidsAge: Number(a.dataset.kidAge) } });
    profile = store.getProfile(profile.id);
    document.querySelectorAll('[data-kid-age]').forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.kidAge) === age())));
    box().innerHTML = `<p class="muted center">Suche ${W().kids} …</p>`;
    mount(profile);
    return true;
  }
  const fb = e.target.closest('[data-kfb]');
  if (fb) { feedback(fb.closest('[data-kidfilm]'), fb.dataset.kfb); return true; }
  const act = e.target.closest('[data-kid]')?.dataset.kid;
  if (act === 'more') { more(e.target.closest('[data-kid]')); return true; }
  if (act === 'retry') { mount(profile); return true; }
  return false;
}
