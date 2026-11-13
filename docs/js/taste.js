// Seite „Geschmack“: Personen, Studios/Sender und Themen in Stufen wählen, Filme oder Serien markieren, Suche.
import * as store from './store.js?v=1.14.0';
import * as tmdb from './tmdb.js?v=1.14.0';
import { esc, toast } from './ui.js?v=1.14.0';
import { runtimeSlot, titleText } from './runtime.js?v=1.14.0';
import { SEED_MOVIES, SEED_PEOPLE, SEED_STUDIOS } from './seeds.js?v=1.14.0';
import { SEED_SHOWS, SEED_TV_PEOPLE, SEED_NETWORKS } from './seeds-tv.js?v=1.14.0';
import { THEMES, themeById, themeQuery } from './themes.js?v=1.14.0';
import { MEDIA, mediaOf, marksOf, excludedGenre, askStarted, stateLabel, STARTED, creditsOf, pressed } from './media.js?v=1.14.0';
import { TASTE_HINT_AFTER } from './config.js?v=1.14.0';

const STEP = 20;
const MARKS = [
  ['seen', '✓', 'Gesehen'],
  ['liked', '♥', 'Mag ich'],
  ['disliked', '✕', 'Mag ich nicht'],
  ['want', '+', 'Merken'],
];
const MARKS_TV = [...MARKS, ['started', '⏸', 'Angefangen']];
const SEEDS = { movie: SEED_MOVIES, tv: SEED_SHOWS };
const SEED_IDS = { movie: new Set(SEED_MOVIES.map((m) => m.id)), tv: new Set(SEED_SHOWS.map((m) => m.id)) };

// Zustand der Seite – bleibt erhalten, solange die App offen ist
const ui = { sub: null, query: '', personFilter: 'all', studioFilter: 'all' };
// Listen getrennt für Filme und Serien
const fresh = () => ({ showAll: false, done: null, personal: [], personalKey: '', shown: STEP, extra: [], extraLang: null, discoverPage: 0 });
const per = { movie: fresh(), tv: fresh() };
const films = { movie: new Map(), tv: new Map() }; // id → Film/Serie (für die Zusatzangaben beim Markieren)
const persons = new Map(); // id → Person
const companies = new Map();
const networks = new Map();
let profile = null;
let searchTimer = null;
let searchRun = 0;

const media = () => mediaOf(profile);
const cfg = () => MEDIA[media()];
const L = () => per[media()];
const marks = () => marksOf(profile);
const lang = () => profile.language.slice(0, 2); // 'de' | 'en'
const otherLanguage = () => (profile.language === 'de-DE' ? 'en-US' : 'de-DE');

// ---------- Filme/Serien vereinheitlichen ----------
const fromSeed = (m) => ({ id: m.id, title: m.t[lang()] || m.t.en, poster: m.p[lang()] || m.p.en, y: m.y, g: m.g, l: m.l, x: !!m.x });
const fromTmdb = (m) => ({
  id: m.id, title: m.title, poster: m.poster_path, y: tmdb.year(m.release_date),
  g: m.genre_ids || (m.genres || []).map((x) => x.id), l: m.original_language,
});
const remember = (list) => { list.forEach((f) => films[media()].set(f.id, f)); return list; };

function poster(path, alt = '') {
  if (!path) return `<div class="poster noimg" aria-hidden="true">Kein Poster</div>`;
  return `<img class="poster" src="${tmdb.img(path, 'w185')}" srcset="${tmdb.img(path, 'w185')} 185w, ${tmdb.img(path, 'w342')} 342w"
    sizes="(min-width: 768px) 200px, 100px" width="100" height="150" loading="lazy" decoding="async" alt="${esc(alt)}">`;
}

// Ein Lieblingsfilm zählt auch als „Mag ich“; „Angefangen“ umfasst Weiterschauen und Abgebrochen

function filmCard(f) {
  const s = marks()[f.id]?.s || null;
  const tv = media() === 'tv';
  const buttons = tv ? MARKS_TV : MARKS;
  return `
    <article class="film ${s ? 'is-marked' : ''} ${s === 'loved' ? 'is-loved' : ''}" data-film="${f.id}">
      <button type="button" class="poster-btn" data-mark="loved" aria-pressed="${s === 'loved'}" aria-label="${esc(f.title)} als ${cfg().w.fav}">
        ${poster(f.poster)}
        <span class="poster-star" aria-hidden="true">${s === 'loved' ? '★' : '☆'}</span>
      </button>
      <div class="film-info">
        <h3 class="film-title">${titleText(f.title, f.id, media()) || esc(f.title)}${f.y ? ` <span class="year">${f.y}${runtimeSlot(f.id, media())}</span>` : ` <span class="year">${runtimeSlot(f.id, media())}</span>`}</h3>
        ${f.why ? `<p class="film-why">Von deinen Lieblingen: ${esc(f.why)}</p>` : ''}
        <p class="film-state">${s ? esc(stateLabel(media(), s)) : ''}</p>
        <div class="marks ${tv ? 'marks-5' : ''}" role="group" aria-label="${esc(f.title)} markieren">
          ${buttons.map(([key, icon, label]) => `
            <button type="button" class="mark mark-${key}" data-mark="${key}" aria-pressed="${pressed(s, key)}"><span aria-hidden="true">${icon}</span> ${label}</button>`).join('')}
        </div>
      </div>
    </article>`;
}

function updateFilmCard(card, id) {
  const s = marks()[id]?.s || null;
  card.classList.toggle('is-marked', !!s);
  card.classList.toggle('is-loved', s === 'loved');
  card.querySelector('.poster-star').textContent = s === 'loved' ? '★' : '☆';
  card.querySelector('.film-state').textContent = s ? stateLabel(media(), s) : '';
  card.querySelectorAll('[data-mark]').forEach((b) => b.setAttribute('aria-pressed', String(pressed(s, b.dataset.mark))));
}

// ---------- Personen, Studios, Sender, Themen: Kacheln mit Stufen ----------
const LIST = { person: 'people', company: 'companies', network: 'networks', theme: 'themes' };
const tier = (kind, id) => { const e = (profile[LIST[kind]] || []).find((x) => x.id === id); return e ? store.tierOf(e) : 0; };

function tierButtons(name, w) {
  return `
    <span class="tier" role="group" aria-label="${esc(name)}: wie gern?">
      <button type="button" class="tier-btn tier-2" data-tier="2" aria-pressed="${w === 2}">★ Liebe</button>
      <button type="button" class="tier-btn tier-1" data-tier="1" aria-pressed="${w === 1}">♥ Gern</button>
    </span>`;
}

function personCard(x) {
  persons.set(x.id, x);
  const w = tier('person', x.id);
  const photo = x.p ? `<img class="face" src="${tmdb.img(x.p, 'w185')}" alt="" loading="lazy" width="72" height="72">`
    : `<span class="face noimg" aria-hidden="true">${esc(x.n.slice(0, 1))}</span>`;
  const known = x.k?.[lang()]?.length ? x.k[lang()] : x.k?.en || [];
  const sub = x.count ? (x.count === 1 ? (media() === 'tv' ? 'in einer deiner Serien' : 'in einem deiner Filme') :`in ${x.count} ${cfg().w.ofYours}`) : known.join(', ');
  return `
    <div class="tile w${w}" data-person="${x.id}">
      ${photo}
      <span class="tile-name">${esc(x.n)}</span>
      <span class="tile-sub">${x.r === 'director' ? cfg().w.director : 'Schauspiel'}${sub ? ` · ${esc(sub)}` : ''}</span>
      ${tierButtons(x.n, w)}
    </div>`;
}

function logoTile(kind, x, sub) {
  const w = tier(kind, x.id);
  const logo = x.logo ? `<span class="logo"><img src="${tmdb.img(x.logo, 'w185')}" alt="" loading="lazy"></span>`
    : `<span class="logo noimg" aria-hidden="true">${esc(x.n.slice(0, 2))}</span>`;
  return `
    <div class="tile w${w}" data-${kind}="${x.id}">
      ${logo}
      <span class="tile-name">${esc(x.n)}</span>
      <span class="tile-sub">${sub}</span>
      ${tierButtons(x.n, w)}
    </div>`;
}
function studioCard(x) {
  companies.set(x.id, x);
  return logoTile('company', x, `${x.i ? '<span class="tag tag-indie">Indie</span> ' : ''}${esc(x.c || '')}`);
}
function networkCard(x) {
  networks.set(x.id, x);
  return logoTile('network', x, esc(x.c || ''));
}

// Beispiele passend zu Filme/Serien und zur Sprache des Profils
function themeExample(t) {
  const en = lang() === 'en';
  const ex = media() === 'tv' ? (en && t.tvEn) || t.tv : (en && t.exEn) || t.ex;
  return ex ? `z. B. ${ex}` : 'Bei Serien kaum eingetragen';
}

function themeCard(t) {
  const w = tier('theme', t.id);
  return `
    <div class="tile theme w${w}" data-theme="${t.id}">
      <span class="tile-name">${esc(t.n)}</span>
      <span class="tile-sub">${esc(themeExample(t))}</span>
      ${tierButtons(t.n, w)}
    </div>`;
}

function updateTile(tile, w) {
  tile.classList.remove('w0', 'w1', 'w2');
  tile.classList.add(`w${w}`);
  tile.querySelectorAll('[data-tier]').forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.tier) === w)));
}

// Gewählte zuerst: Liebe vor Gern, dann die zuletzt gewählten
const byTier = (a, b) => store.tierOf(b) - store.tierOf(a) || b.t - a.t;
const nothingRated = () => !profile.people.length && !profile.companies.length && !(profile.themes || []).length && !(profile.networks || []).length;

const errorBox = (msg, retry) => `<div class="card center"><p>${esc(msg)}</p><button class="btn" type="button" data-taste="${retry}">Nochmal versuchen</button></div>`;

// ---------- Seite ----------
export function render(p) {
  profile = p;
  const tv = media() === 'tv';
  // Wer neu ist, fängt bei den Personen an; danach geht es mit den Filmen weiter
  if (!ui.sub) ui.sub = nothingRated() && !Object.keys(p.movies).length && !Object.keys(p.shows || {}).length ? 'personen' : 'filme';
  // Studios gibt es nur bei Filmen, Sender nur bei Serien
  if (tv && ui.sub === 'studios') ui.sub = 'sender';
  if (!tv && ui.sub === 'sender') ui.sub = 'studios';
  if (L().extraLang !== p.language) { L().extra = []; L().discoverPage = 0; L().extraLang = p.language; }
  const tab = (key, label) => `<button type="button" class="seg" data-sub="${key}" aria-pressed="${ui.sub === key}">${label}</button>`;
  return `
    <h1>Geschmack</h1>
    <label class="search">
      <span class="sr-only">Suche</span>
      <input id="taste-search" type="search" inputmode="search" enterkeyhint="search" autocomplete="off"
        placeholder="${tv ? 'Serie, Person, Sender oder Thema suchen' : 'Film, Person, Studio oder Thema suchen'}" value="${esc(ui.query)}">
    </label>
    <div class="segmented sub-tabs" role="group" aria-label="Bereich">
      ${tab('personen', 'Personen')}${tv ? tab('sender', 'Sender') : tab('studios', 'Studios')}${tab('themen', 'Themen')}${tab('filme', cfg().w.many)}
    </div>
    <div id="taste-body" aria-live="polite"></div>`;
}

export function mount(view, p) {
  profile = p;
  L().done = null; // beim Öffnen neu festhalten, was erledigt ist
  const input = view.querySelector('#taste-search');
  input.addEventListener('input', () => {
    ui.query = input.value;
    clearTimeout(searchTimer);
    searchTimer = setTimeout(fillBody, ui.query.trim().length >= 2 ? 400 : 0);
  });
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); input.blur(); } });
  fillBody();
}

function body() { return document.getElementById('taste-body'); }

function fillBody() {
  const el = body();
  if (!el) return;
  document.querySelector('.sub-tabs')?.toggleAttribute('hidden', ui.query.trim().length >= 2);
  if (ui.query.trim().length >= 2) return runSearch();
  if (ui.sub === 'filme') return fillFilms();
  if (ui.sub === 'personen') return fillPeople();
  if (ui.sub === 'themen') return fillThemes();
  if (ui.sub === 'sender') return fillNetworks();
  return fillStudios();
}

// ----- Filme / Serien -----
// Beim Öffnen der Seite wird festgehalten, was schon erledigt ist (markiert oder übersprungen).
// Diese bleiben ausgeblendet; was man jetzt markiert, bleibt bis zum nächsten Öffnen sichtbar.
// Reihenfolge: Titel der Lieblinge → Startliste → weitere bekannte Titel von TMDB.
// Serien, die in Deutschland wenig bekannt sind (x), kommen ganz ans Ende.
const allFilms = () => {
  const seen = new Set();
  const list = [...L().personal, ...SEEDS[media()].map(fromSeed), ...L().extra].filter((f) => !seen.has(f.id) && seen.add(f.id));
  return remember([...list.filter((f) => !f.x), ...list.filter((f) => f.x)]);
};
const candidates = () => (L().showAll ? allFilms() : allFilms().filter((f) => !L().done.has(f.id)));
const passedList = () => (media() === 'tv' ? profile.passedTv : profile.passed) || [];

function snapshotDone() {
  L().done = new Set([...Object.keys(marks()).map(Number), ...passedList()]);
  L().shown = STEP;
}

// Titel der gewählten Personen, Studios, Sender und Themen – bekannte zuerst, damit man schnell abhaken kann
async function loadPersonal() {
  const md = media();
  const c = MEDIA[md];
  const people = [...profile.people].sort(byTier).slice(0, 15);
  const comps = [...profile.companies].sort(byTier).slice(0, 8);
  const nets = md === 'tv' ? [...(profile.networks || [])].sort(byTier).slice(0, 8) : [];
  const themes = [...(profile.themes || [])].sort(byTier).filter((x) => themeById.has(x.id)).slice(0, 8);
  const key = JSON.stringify([profile.language, md, people.map((x) => [x.id, x.w]), comps.map((x) => [x.id, x.w]), nets.map((x) => [x.id, x.w]), themes.map((x) => [x.id, x.w])]);
  if (key === L().personalKey) return;
  const lng = profile.language;
  const disc = (params) => tmdb.get(c.discover, { language: lng, sort_by: 'vote_count.desc', without_genres: c.without, ...params });
  const jobs = [
    ...people.map((x) => tmdb.get(`person/${x.id}/${c.credits}`, { language: lng }).then((d) => ({ w: store.tierOf(x), why: x.n, list: creditsOf(d, x.role, md) }))),
    ...comps.map((x) => disc({ with_companies: [x.id, ...(x.also || [])].join('|') }).then((d) => ({ w: store.tierOf(x), why: x.n, list: d.results || [] }))),
    ...nets.map((x) => disc({ with_networks: x.id }).then((d) => ({ w: store.tierOf(x), why: x.n, list: d.results || [] }))),
    ...themes.map((x) => disc(themeQuery(themeById.get(x.id), md, c.without)).then((d) => ({ w: store.tierOf(x), why: themeById.get(x.id).n, list: d.results || [] }))),
  ];
  const results = (await Promise.allSettled(jobs)).filter((r) => r.status === 'fulfilled').map((r) => r.value);
  const today = new Date().toISOString().slice(0, 10);
  const minVotes = md === 'tv' ? 50 : 100;
  const map = new Map();
  for (const { w, why, list } of results) {
    for (const m of list) {
      if (m.adult || !m.poster_path || !m.release_date || m.release_date > today || (m.vote_count || 0) < minVotes) continue;
      if (md === 'tv' && excludedGenre(m)) continue;
      const e = map.get(m.id) || { m, score: 0, why: [] };
      e.score += w;
      if (!e.why.includes(why)) e.why.push(why);
      map.set(m.id, e);
    }
  }
  L().personal = [...map.values()]
    .sort((a, b) => b.score - a.score || (b.m.vote_count || 0) - (a.m.vote_count || 0))
    .slice(0, 400)
    .map((e) => ({ ...fromTmdb(e.m), why: e.why.slice(0, 2).join(', ') }));
  L().personalKey = key;
}

// Notfalls weitere Titel bei TMDB holen, bis genug da sind
async function ensure(n) {
  const c = cfg();
  // Die wenig bekannten (x) am Ende zählen nicht mit – sonst kämen keine weiteren bekannten Titel nach
  while (candidates().filter((f) => !f.x).length < n && L().discoverPage < 50) {
    L().discoverPage++;
    const data = await tmdb.get(c.discover, { language: profile.language, sort_by: 'vote_count.desc', without_genres: c.without, page: L().discoverPage });
    const known = new Set([...SEED_IDS[media()], ...L().extra.map((f) => f.id)]);
    // Serien ohne deutsche Inhaltsangabe liefen in Deutschland vermutlich kaum → nach hinten
    const rare = (m) => media() === 'tv' && profile.language === 'de-DE' && !m.overview;
    L().extra.push(...(data.results || []).filter((m) => !known.has(m.id)).map((m) => ({ ...fromTmdb(m), x: rare(m) })));
  }
}

const tip = () => `<div class="card hint"><p><strong>Tipp:</strong> Wähl zuerst unter
  <button class="link-btn" type="button" data-sub="personen">Personen</button>,
  ${media() === 'tv' ? '<button class="link-btn" type="button" data-sub="sender">Sender</button>' : '<button class="link-btn" type="button" data-sub="studios">Studios</button>'} und
  <button class="link-btn" type="button" data-sub="themen">Themen</button>, was du magst.
  Dann zeigt dir diese Liste zuerst deren ${cfg().w.many}.</p></div>`;

// Ab genug Markierungen: Hinweis, bei den Vorschlägen weiterzumachen (einmal wegtippen = weg)
function suggestHint() {
  const md = media();
  const n = Object.keys(marks()).length;
  if (n < TASTE_HINT_AFTER || profile.settings?.hintDone?.[md]) return '';
  const w = cfg().w;
  return `<div class="card hint" data-hint="suggest">
    <p><strong>Die App kennt deinen Geschmack jetzt gut.</strong></p>
    <p>Mach am besten bei den Vorschlägen weiter: Dort kommen nur noch ${w.many}, die zu dir passen – und du kannst sie genauso als Gesehen, Mag ich usw. markieren.</p>
    <div class="row"><a class="btn btn-primary" href="#/vorschlaege">Zu den Vorschlägen</a>
    <button class="btn" type="button" data-taste="hint-hide">Ausblenden</button></div></div>`;
}

async function fillFilms() {
  const el = body();
  const md = media();
  if (!L().done) snapshotDone();
  const w = cfg().w;
  const marked = Object.keys(marks()).length;
  const passed = passedList().length;
  if (!nothingRated() && !L().personal.length) el.innerHTML = `<p class="muted center">Suche ${w.many} deiner Lieblinge …</p>`;
  try { await loadPersonal(); } catch { /* dann eben ohne */ }
  try { await ensure(L().shown); } catch (err) { toast(err.message); }
  if (body() !== el || ui.sub !== 'filme' || ui.query.trim().length >= 2 || media() !== md) return;
  const doneInfo = L().showAll
    ? `<p class="muted small">Du siehst alle ${w.many}, auch die schon markierten. <button class="btn btn-small" type="button" data-taste="toggle-all">Nur neue zeigen</button></p>`
    : L().done.size
      ? `<p class="muted small">${marked} markiert${passed ? `, ${passed} übersprungen` : ''} – die sind ausgeblendet, hier kommen nur neue. <button class="btn btn-small" type="button" data-taste="toggle-all">Alle zeigen</button></p>`
      : '';
  const started = md === 'tv' ? ' „Angefangen“ = du hast sie nicht zu Ende geschaut.' : '';
  el.innerHTML = `
    <p class="muted small">Tipp an, was du kennst. Unbekannte ${w.many} einfach überscrollen. Nochmal tippen nimmt die Markierung zurück.${started} <strong>Aufs Poster tippen = ★ ${w.fav}.</strong></p>
    ${nothingRated() ? tip() : suggestHint()}
    ${doneInfo}
    <div class="films">${candidates().slice(0, L().shown).map(filmCard).join('')}</div>
    <div class="row center-row">
      <button class="btn btn-primary" type="button" data-taste="more">Weitere laden</button>
    </div>`;
}

async function loadMore(btn) {
  const grid = body()?.querySelector('.films');
  if (!grid) return;
  const present = [...grid.querySelectorAll('[data-film]')].map((c) => +c.dataset.film);
  // Wer weiterblättert, ist an den bisherigen vorbei – die nicht markierten gelten als übersprungen
  if (!L().showAll) store.addPassed(profile.id, present.filter((id) => !marks()[id]), media());
  L().shown += STEP;
  btn.disabled = true; btn.textContent = 'Lädt …';
  try { await ensure(L().shown); } catch (err) { L().shown -= STEP; toast(err.message); }
  btn.disabled = false; btn.textContent = 'Weitere laden';
  const have = new Set(present);
  grid.insertAdjacentHTML('beforeend', candidates().slice(0, L().shown).filter((f) => !have.has(f.id)).map(filmCard).join(''));
}

// ----- Personen -----
const seedPerson = new Map([...SEED_PEOPLE, ...SEED_TV_PEOPLE].map((x) => [x.id, x]));
const asPerson = (e) => seedPerson.get(e.id) || { id: e.id, n: e.n || 'Unbekannt', r: e.role, p: e.p };

function fillPeople() {
  const el = body();
  const f = ui.personFilter;
  const keep = (x) => f === 'all' || x.r === f;
  const rated = [...profile.people].sort(byTier).map(asPerson).filter(keep);
  const ratedIds = new Set(profile.people.map((x) => x.id));
  const fb = (key, label) => `<button type="button" class="seg" data-pfilter="${key}" aria-pressed="${f === key}">${label}</button>`;
  // Bei Serien zuerst die Serien-Personen, dann die aus den Filmen
  const seen = new Set();
  const known = (media() === 'tv' ? [...SEED_TV_PEOPLE, ...SEED_PEOPLE] : SEED_PEOPLE).filter((x) => !seen.has(x.id) && seen.add(x.id));
  el.innerHTML = `
    <div class="segmented filter" role="group" aria-label="Filter">${fb('all', 'Alle')}${fb('actor', 'Schauspiel')}${fb('director', cfg().w.director)}</div>
    <p class="muted small"><strong>★ Liebe</strong> = auf jeden Fall, <strong>♥ Gern</strong> = sehe ich gern, nichts gewählt = egal. Nochmal tippen nimmt die Wahl zurück. Gilt für Filme und Serien.</p>
    ${rated.length ? `<h2>Deine Lieblinge</h2><div class="tiles">${rated.map(personCard).join('')}</div>` : ''}
    <div id="from-liked"></div>
    <h2>Bekannte Namen</h2>
    <div class="tiles" id="known-people">${known.filter((x) => keep(x) && !ratedIds.has(x.id)).map(personCard).join('')}</div>`;
  fillFromLiked(keep, ratedIds);
}

// Wer kommt in deinen gemochten Filmen/Serien am häufigsten vor? (★ zählt doppelt)
async function fillFromLiked(keep, skip) {
  const md = media();
  const liked = Object.entries(marks()).filter(([, m]) => m.s === 'liked' || m.s === 'loved').sort((a, b) => b[1].t - a[1].t).slice(0, 30);
  if (!liked.length) return;
  const found = new Map();
  const load = ([id, m]) => (md === 'tv'
    ? tmdb.get(`tv/${id}`, { append_to_response: 'aggregate_credits' }).then((d) => ({
      directors: d.created_by || [], cast: (d.aggregate_credits?.cast || []).filter((x) => x.order < 5), w: m.s === 'loved' ? 2 : 1,
    }))
    : tmdb.get(`movie/${id}/credits`).then((c) => ({
      directors: (c.crew || []).filter((x) => x.job === 'Director'), cast: (c.cast || []).filter((x) => x.order < 5), w: m.s === 'loved' ? 2 : 1,
    })));
  const results = await Promise.allSettled(liked.map(load));
  for (const r of results) {
    if (r.status !== 'fulfilled') continue;
    const { directors, cast, w } = r.value;
    const picks = [...directors.map((x) => ({ ...x, r: 'director' })), ...cast.map((x) => ({ ...x, r: 'actor' }))];
    for (const x of picks) {
      if (skip.has(x.id)) continue;
      const key = `${x.id}-${x.r}`;
      const e = found.get(key) || { ...(seedPerson.get(x.id) || {}), id: x.id, n: x.name, r: x.r, p: x.profile_path, count: 0, score: 0, pop: x.popularity || 0 };
      e.count++; e.score += w;
      found.set(key, e);
    }
  }
  if (media() !== md) return;
  // Wer in mehreren Titeln vorkommt, steht oben; bei Gleichstand Regie zuerst
  const list = [...found.values()].filter(keep)
    .sort((a, b) => b.score - a.score || (b.r === 'director') - (a.r === 'director') || b.pop - a.pop)
    .filter((x, i, arr) => arr.findIndex((y) => y.id === x.id) === i)
    .slice(0, 16);
  const box = document.getElementById('from-liked');
  if (!box || !list.length) return;
  box.innerHTML = `<h2>Aus deinen ${cfg().w.many}</h2><p class="muted small">Wer in den ${cfg().w.many}, die du magst, am häufigsten vorkommt.</p><div class="tiles">${list.map(personCard).join('')}</div>`;
  // Diese nicht nochmal unter „Bekannte Namen“ zeigen
  list.forEach((x) => document.querySelector(`#known-people [data-person="${x.id}"]`)?.remove());
}

// ----- Studios -----
const seedStudio = new Map(SEED_STUDIOS.map((x) => [x.id, x]));
function fillStudios() {
  const el = body();
  const f = ui.studioFilter;
  const keep = (x) => f === 'all' || x.i;
  const rated = [...profile.companies].sort(byTier).map((e) => seedStudio.get(e.id) || { id: e.id, n: e.n || 'Unbekannt', logo: e.logo, c: e.c }).filter(keep);
  const ratedIds = new Set(profile.companies.map((x) => x.id));
  const fb = (key, label) => `<button type="button" class="seg" data-sfilter="${key}" aria-pressed="${f === key}">${label}</button>`;
  el.innerHTML = `
    <div class="segmented filter" role="group" aria-label="Filter">${fb('all', 'Alle')}${fb('indie', 'Klein & Independent')}</div>
    <p class="muted small">Von A24 bis Netflix. <strong>★ Liebe</strong> oder <strong>♥ Gern</strong>, nichts gewählt = egal.</p>
    ${rated.length ? `<h2>Deine Lieblinge</h2><div class="tiles">${rated.map(studioCard).join('')}</div><h2>Weitere Studios</h2>` : ''}
    <div class="tiles">${SEED_STUDIOS.filter((x) => keep(x) && !ratedIds.has(x.id)).map(studioCard).join('')}</div>`;
}

// ----- Sender (nur bei Serien) -----
const seedNetwork = new Map(SEED_NETWORKS.map((x) => [x.id, x]));
function fillNetworks() {
  const el = body();
  const rated = [...(profile.networks || [])].sort(byTier).map((e) => seedNetwork.get(e.id) || { id: e.id, n: e.n || 'Unbekannt', logo: e.logo, c: e.c });
  const ratedIds = new Set((profile.networks || []).map((x) => x.id));
  const studios = profile.companies.length ? ` Deine Lieblingsstudios aus den Filmen (z. B. ${esc(profile.companies[0].n || 'A24')}) zählen bei Serien auch.` : '';
  el.innerHTML = `
    <p class="muted small">Sender und Streamingdienste, deren Serien du magst. <strong>★ Liebe</strong> oder <strong>♥ Gern</strong>, nichts gewählt = egal.${studios}</p>
    ${rated.length ? `<h2>Deine Lieblingssender</h2><div class="tiles">${rated.map(networkCard).join('')}</div><h2>Weitere Sender</h2>` : ''}
    <div class="tiles">${SEED_NETWORKS.filter((x) => !ratedIds.has(x.id)).map(networkCard).join('')}</div>`;
}

// ----- Themen -----
function fillThemes() {
  const el = body();
  const ratedIds = new Set((profile.themes || []).map((x) => x.id));
  const rated = [...(profile.themes || [])].sort(byTier).map((x) => themeById.get(x.id)).filter(Boolean);
  el.innerHTML = `
    <p class="muted small">Worum soll es gehen? Wähl Geschichten und Stimmungen, die du magst – die Vorschläge für Filme und Serien berücksichtigen das.</p>
    ${rated.length ? `<h2>Deine Lieblingsthemen</h2><div class="tiles">${rated.map(themeCard).join('')}</div><h2>Weitere Themen</h2>` : ''}
    <div class="tiles">${THEMES.filter((t) => !ratedIds.has(t.id)).map(themeCard).join('')}</div>
    <p class="muted small">Hinweis: Kameraführung lässt sich bei TMDB leider nicht abfragen, „Gespräche & Dialoge“ ist nur bei wenigen Titeln eingetragen.</p>`;
}

// ----- Suche -----
async function runSearch() {
  const q = ui.query.trim();
  const run = ++searchRun;
  const el = body();
  const md = media();
  const c = cfg();
  el.innerHTML = '<p class="muted center">Suche …</p>';
  try {
    const [own, other, people, comps] = await Promise.all([
      tmdb.get(c.search, { query: q, language: profile.language }),
      tmdb.get(c.search, { query: q, language: otherLanguage() }),
      tmdb.get('search/person', { query: q, language: profile.language }),
      md === 'movie' ? tmdb.get('search/company', { query: q }) : Promise.resolve({ results: [] }),
    ]);
    // Treffer beider Sprachen zusammenführen; Titel immer in der Profilsprache
    const ownIds = new Set((own.results || []).map((m) => m.id));
    const extraIds = (other.results || []).filter((m) => !ownIds.has(m.id)).slice(0, 5).map((m) => m.id);
    const extra = await Promise.all(extraIds.map((id) => tmdb.get(`${c.path}/${id}`, { language: profile.language }).catch(() => null)));
    const movieList = remember([...(own.results || []), ...extra.filter(Boolean)]
      .filter((m) => md !== 'tv' || !excludedGenre(m))
      .sort((a, b) => (b.vote_count || 0) - (a.vote_count || 0)).slice(0, 12).map(fromTmdb));
    const personList = (people.results || [])
      .filter((x) => ['Acting', 'Directing', 'Writing', 'Creator'].includes(x.known_for_department) && (x.known_for || []).length)
      .slice(0, 8).map((x) => ({
        id: x.id, n: x.name, p: x.profile_path, r: x.known_for_department === 'Acting' ? 'actor' : 'director',
        k: { [lang()]: (x.known_for || []).filter((k) => k.media_type === md).slice(0, 2).map((k) => k.title || k.name) },
      }));
    const compList = (comps.results || []).slice(0, 6).map((x) => ({ id: x.id, n: x.name, logo: x.logo_path, c: x.origin_country }));
    const ql = q.toLowerCase();
    const netList = md === 'tv'
      ? [...new Map([...SEED_NETWORKS, ...(profile.networks || [])].map((x) => [x.id, seedNetwork.get(x.id) || x])).values()].filter((x) => x.n.toLowerCase().includes(ql))
      : [];
    const themeList = THEMES.filter((t) => t.n.toLowerCase().includes(ql));
    if (run !== searchRun || !body() || media() !== md) return; // inzwischen weiter getippt
    if (!movieList.length && !personList.length && !compList.length && !netList.length && !themeList.length) {
      el.innerHTML = `<p class="muted center">Nichts gefunden für „${esc(q)}“. Vielleicht anders geschrieben?</p>`;
      return;
    }
    el.innerHTML = `
      ${movieList.length ? `<h2>${c.w.many}</h2><div class="films">${movieList.map(filmCard).join('')}</div>` : ''}
      ${personList.length ? `<h2>Personen</h2><div class="tiles">${personList.map(personCard).join('')}</div>` : ''}
      ${netList.length ? `<h2>Sender</h2><div class="tiles">${netList.map(networkCard).join('')}</div>` : ''}
      ${themeList.length ? `<h2>Themen</h2><div class="tiles">${themeList.map(themeCard).join('')}</div>` : ''}
      ${compList.length ? `<h2>Studios</h2><div class="tiles">${compList.map(studioCard).join('')}</div>` : ''}`;
  } catch (err) {
    if (run === searchRun && body()) el.innerHTML = errorBox(err.message, 'search');
  }
}

// ---------- Klicks (von app.js weitergereicht) ----------
async function mark(card, status) {
  const md = media();
  const id = +card.dataset.film;
  const f = { ...(films[md].get(id) || {}) };
  f.title = card.querySelector('[data-titlefix]')?.textContent || f.title; // ggf. der englische statt fremder Schrift
  const old = marks()[id]?.s || null;
  let now;
  if (status === 'loved') now = old === 'loved' ? 'liked' : 'loved'; // Stern: an/aus (aus = bleibt „Mag ich“)
  else if (pressed(old, status)) now = null; // zweiter Tipp nimmt zurück
  else if (status === 'started') { now = await askStarted(f.title || ''); if (!now) return; }
  else now = status;
  store.setMark(profile.id, md, id, now, { g: f.g, l: f.l, y: f.y, n: f.title });
  document.querySelectorAll(`[data-film="${id}"]`).forEach((c) => updateFilmCard(c, id));
  // Grenze gerade erreicht? Dann den Hinweis oben einblenden
  const grid = body()?.querySelector('.films');
  if (grid && !body().querySelector('[data-hint]')) {
    const hint = suggestHint();
    if (hint) { body().insertAdjacentHTML('afterbegin', hint); toast('Tipp: Ab jetzt geht es bei den Vorschlägen am schnellsten weiter – Hinweis ganz oben.'); }
  }
}

export function handleClick(e) {
  const markBtn = e.target.closest('[data-mark]');
  if (markBtn) { mark(markBtn.closest('[data-film]'), markBtn.dataset.mark); return true; }
  const tierBtn = e.target.closest('[data-tier]');
  if (tierBtn) {
    const tile = tierBtn.closest('[data-person], [data-company], [data-network], [data-theme]');
    const kind = tile.dataset.person ? 'person' : tile.dataset.company ? 'company' : tile.dataset.network ? 'network' : 'theme';
    const id = kind === 'theme' ? tile.dataset.theme : Number(tile.dataset[kind]);
    const want = Number(tierBtn.dataset.tier);
    const w = tier(kind, id) === want ? 0 : want; // nochmal tippen = egal
    let entry;
    if (kind === 'person') { const x = persons.get(id); entry = { id, role: x.r, n: x.n, p: x.p }; }
    else if (kind === 'company') { const x = companies.get(id); entry = { id, n: x.n, logo: x.logo, c: x.c, ...(x.also ? { also: x.also } : {}) }; }
    else if (kind === 'network') { const x = networks.get(id); entry = { id, n: x.n, logo: x.logo, c: x.c }; }
    else entry = { id };
    store.setTier(LIST[kind], profile.id, entry, w);
    document.querySelectorAll(`[data-${kind}="${id}"]`).forEach((t) => updateTile(t, w));
    return true;
  }
  const sub = e.target.closest('[data-sub]');
  if (sub) {
    ui.sub = sub.dataset.sub;
    document.querySelectorAll('.sub-tabs [data-sub]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.sub === ui.sub)));
    fillBody();
    return true;
  }
  const pf = e.target.closest('[data-pfilter]');
  if (pf) { ui.personFilter = pf.dataset.pfilter; fillPeople(); return true; }
  const sf = e.target.closest('[data-sfilter]');
  if (sf) { ui.studioFilter = sf.dataset.sfilter; fillStudios(); return true; }
  const act = e.target.closest('[data-taste]')?.dataset.taste;
  if (act === 'more') { loadMore(e.target.closest('[data-taste]')); return true; }
  if (act === 'hint-hide') {
    const md = media();
    store.updateProfile(profile.id, { settings: { ...profile.settings, hintDone: { ...(profile.settings?.hintDone || {}), [md]: true } } });
    body()?.querySelector('[data-hint]')?.remove();
    return true;
  }
  if (act === 'toggle-all') { L().showAll = !L().showAll; snapshotDone(); fillFilms(); return true; }
  if (act === 'search') { runSearch(); return true; }
  return false;
}
