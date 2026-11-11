// Seite „Geschmack“: Personen, Studios und Themen in Stufen wählen, Filme markieren, Suche.
import * as store from './store.js?v=0.7.0';
import * as tmdb from './tmdb.js?v=0.7.0';
import { esc, toast } from './ui.js?v=0.7.0';
import { SEED_MOVIES, SEED_PEOPLE, SEED_STUDIOS } from './seeds.js?v=0.7.0';
import { THEMES, themeById } from './themes.js?v=0.7.0';

const STEP = 20;
const MARKS = [
  ['seen', '✓', 'Gesehen'],
  ['liked', '♥', 'Mag ich'],
  ['disliked', '✕', 'Mag ich nicht'],
  ['want', '+', 'Merken'],
];
const STATE_LABEL = { loved: '★ Lieblingsfilm', seen: '✓ Gesehen', liked: '♥ Mag ich', disliked: '✕ Mag ich nicht', want: '+ Gemerkt', noInterest: 'Kein Interesse' };
const SEED_IDS = new Set(SEED_MOVIES.map((m) => m.id));

// Zustand der Seite – bleibt erhalten, solange die App offen ist
const ui = {
  sub: null, query: '', showAll: false, done: null, personal: [], personalKey: '',
  shown: STEP, extra: [], extraLang: null, discoverPage: 0,
  personFilter: 'all', studioFilter: 'all',
};
const films = new Map();   // id → Film (für die Zusatzangaben beim Markieren)
const persons = new Map(); // id → Person
const companies = new Map();
let profile = null;
let searchTimer = null;
let searchRun = 0;

const lang = () => profile.language.slice(0, 2); // 'de' | 'en'
const otherLanguage = () => (profile.language === 'de-DE' ? 'en-US' : 'de-DE');

// ---------- Filme vereinheitlichen ----------
const fromSeed = (m) => ({ id: m.id, title: m.t[lang()] || m.t.en, poster: m.p[lang()] || m.p.en, y: m.y, g: m.g, l: m.l });
const fromTmdb = (m) => ({
  id: m.id, title: m.title, poster: m.poster_path, y: tmdb.year(m.release_date),
  g: m.genre_ids || (m.genres || []).map((x) => x.id), l: m.original_language,
});
const remember = (list) => { list.forEach((f) => films.set(f.id, f)); return list; };

function poster(path, alt = '') {
  if (!path) return `<div class="poster noimg" aria-hidden="true">Kein Poster</div>`;
  return `<img class="poster" src="${tmdb.img(path, 'w185')}" srcset="${tmdb.img(path, 'w185')} 185w, ${tmdb.img(path, 'w342')} 342w"
    sizes="(min-width: 768px) 200px, 100px" width="100" height="150" loading="lazy" decoding="async" alt="${esc(alt)}">`;
}

// Ein Lieblingsfilm zählt auch als „Mag ich“
const pressed = (s, key) => s === key || (s === 'loved' && key === 'liked');

function filmCard(f) {
  const s = profile.movies[f.id]?.s || null;
  return `
    <article class="film ${s ? 'is-marked' : ''} ${s === 'loved' ? 'is-loved' : ''}" data-film="${f.id}">
      <button type="button" class="poster-btn" data-mark="loved" aria-pressed="${s === 'loved'}" aria-label="${esc(f.title)} als Lieblingsfilm">
        ${poster(f.poster)}
        <span class="poster-star" aria-hidden="true">${s === 'loved' ? '★' : '☆'}</span>
      </button>
      <div class="film-info">
        <h3 class="film-title">${esc(f.title)}${f.y ? ` <span class="year">${f.y}</span>` : ''}</h3>
        ${f.why ? `<p class="film-why">Von deinen Lieblingen: ${esc(f.why)}</p>` : ''}
        <p class="film-state">${s ? esc(STATE_LABEL[s]) : ''}</p>
        <div class="marks" role="group" aria-label="${esc(f.title)} markieren">
          ${MARKS.map(([key, icon, label]) => `
            <button type="button" class="mark mark-${key}" data-mark="${key}" aria-pressed="${pressed(s, key)}"><span aria-hidden="true">${icon}</span> ${label}</button>`).join('')}
        </div>
      </div>
    </article>`;
}

function updateFilmCard(card, id) {
  const s = profile.movies[id]?.s || null;
  card.classList.toggle('is-marked', !!s);
  card.classList.toggle('is-loved', s === 'loved');
  card.querySelector('.poster-star').textContent = s === 'loved' ? '★' : '☆';
  card.querySelector('.film-state').textContent = s ? STATE_LABEL[s] : '';
  card.querySelectorAll('[data-mark]').forEach((b) => b.setAttribute('aria-pressed', String(pressed(s, b.dataset.mark))));
}

// ---------- Personen, Studios, Themen: Kacheln mit Stufen ----------
const LIST = { person: 'people', company: 'companies', theme: 'themes' };
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
  const sub = x.count ? (x.count === 1 ? "in einem deiner Filme" : `in ${x.count} deiner Filme`) : known.join(', ');
  return `
    <div class="tile w${w}" data-person="${x.id}">
      ${photo}
      <span class="tile-name">${esc(x.n)}</span>
      <span class="tile-sub">${x.r === 'director' ? 'Regie' : 'Schauspiel'}${sub ? ` · ${esc(sub)}` : ''}</span>
      ${tierButtons(x.n, w)}
    </div>`;
}

function studioCard(x) {
  companies.set(x.id, x);
  const w = tier('company', x.id);
  const logo = x.logo ? `<span class="logo"><img src="${tmdb.img(x.logo, 'w185')}" alt="" loading="lazy"></span>`
    : `<span class="logo noimg" aria-hidden="true">${esc(x.n.slice(0, 2))}</span>`;
  return `
    <div class="tile w${w}" data-company="${x.id}">
      ${logo}
      <span class="tile-name">${esc(x.n)}</span>
      <span class="tile-sub">${x.i ? '<span class="tag tag-indie">Indie</span> ' : ''}${esc(x.c || '')}</span>
      ${tierButtons(x.n, w)}
    </div>`;
}

function themeCard(t) {
  const w = tier('theme', t.id);
  return `
    <div class="tile theme w${w}" data-theme="${t.id}">
      <span class="tile-name">${esc(t.n)}</span>
      <span class="tile-sub">z. B. ${esc(t.ex)}</span>
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
const nothingRated = () => !profile.people.length && !profile.companies.length && !(profile.themes || []).length;

const errorBox = (msg, retry) => `<div class="card center"><p>${esc(msg)}</p><button class="btn" type="button" data-taste="${retry}">Nochmal versuchen</button></div>`;

// ---------- Seite ----------
export function render(p) {
  profile = p;
  // Wer neu ist, fängt bei den Personen an; danach geht es mit den Filmen weiter
  if (!ui.sub) ui.sub = nothingRated() && !Object.keys(p.movies).length ? 'personen' : 'filme';
  if (ui.extraLang !== p.language) { ui.extra = []; ui.discoverPage = 0; ui.extraLang = p.language; }
  const tab = (key, label) => `<button type="button" class="seg" data-sub="${key}" aria-pressed="${ui.sub === key}">${label}</button>`;
  return `
    <h1>Geschmack</h1>
    <label class="search">
      <span class="sr-only">Suche</span>
      <input id="taste-search" type="search" inputmode="search" enterkeyhint="search" autocomplete="off"
        placeholder="Film, Person, Studio oder Thema suchen" value="${esc(ui.query)}">
    </label>
    <div class="segmented sub-tabs" role="group" aria-label="Bereich">
      ${tab('personen', 'Personen')}${tab('studios', 'Studios')}${tab('themen', 'Themen')}${tab('filme', 'Filme')}
    </div>
    <div id="taste-body" aria-live="polite"></div>`;
}

export function mount(view, p) {
  profile = p;
  ui.done = null; // beim Öffnen neu festhalten, was erledigt ist
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
  return fillStudios();
}

// ----- Filme -----
// Beim Öffnen der Seite wird festgehalten, was schon erledigt ist (markiert oder übersprungen).
// Diese Filme bleiben ausgeblendet; was man jetzt markiert, bleibt bis zum nächsten Öffnen sichtbar.
// Reihenfolge: Filme der Lieblinge → Startliste → weitere bekannte Filme von TMDB
const allFilms = () => {
  const seen = new Set();
  return remember([...ui.personal, ...SEED_MOVIES.map(fromSeed), ...ui.extra].filter((f) => !seen.has(f.id) && seen.add(f.id)));
};
const candidates = () => (ui.showAll ? allFilms() : allFilms().filter((f) => !ui.done.has(f.id)));

function snapshotDone() {
  ui.done = new Set([...Object.keys(profile.movies).map(Number), ...(profile.passed || [])]);
  ui.shown = STEP;
}

// Filme der gewählten Personen, Studios und Themen – bekannte zuerst, damit man schnell abhaken kann
async function loadPersonal() {
  const people = [...profile.people].sort(byTier).slice(0, 15);
  const comps = [...profile.companies].sort(byTier).slice(0, 8);
  const themes = [...(profile.themes || [])].sort(byTier).filter((x) => themeById.has(x.id)).slice(0, 8);
  const key = JSON.stringify([profile.language, people.map((x) => [x.id, x.w]), comps.map((x) => [x.id, x.w]), themes.map((x) => [x.id, x.w])]);
  if (key === ui.personalKey) return;
  const lng = profile.language;
  const jobs = [
    ...people.map((x) => tmdb.get(`person/${x.id}/movie_credits`, { language: lng }).then((d) => ({
      w: store.tierOf(x), why: x.n,
      list: x.role === 'director' ? (d.crew || []).filter((m) => m.job === 'Director') : (d.cast || []).filter((m) => m.order != null && m.order <= 4),
    }))),
    ...comps.map((x) => tmdb.get('discover/movie', { language: lng, with_companies: [x.id, ...(x.also || [])].join('|'), sort_by: 'vote_count.desc' })
      .then((d) => ({ w: store.tierOf(x), why: x.n, list: d.results || [] }))),
    ...themes.map((x) => tmdb.get('discover/movie', { language: lng, with_keywords: themeById.get(x.id).k.join('|'), sort_by: 'vote_count.desc' })
      .then((d) => ({ w: store.tierOf(x), why: themeById.get(x.id).n, list: d.results || [] }))),
  ];
  const results = (await Promise.allSettled(jobs)).filter((r) => r.status === 'fulfilled').map((r) => r.value);
  const today = new Date().toISOString().slice(0, 10);
  const map = new Map();
  for (const { w, why, list } of results) {
    for (const m of list) {
      if (m.adult || !m.poster_path || !m.release_date || m.release_date > today || (m.vote_count || 0) < 100) continue;
      const e = map.get(m.id) || { m, score: 0, why: [] };
      e.score += w;
      if (!e.why.includes(why)) e.why.push(why);
      map.set(m.id, e);
    }
  }
  ui.personal = [...map.values()]
    .sort((a, b) => b.score - a.score || (b.m.vote_count || 0) - (a.m.vote_count || 0))
    .slice(0, 400)
    .map((e) => ({ ...fromTmdb(e.m), why: e.why.slice(0, 2).join(', ') }));
  ui.personalKey = key;
}

// Notfalls weitere Filme bei TMDB holen, bis genug da sind
async function ensure(n) {
  while (candidates().length < n && ui.discoverPage < 50) {
    ui.discoverPage++;
    const data = await tmdb.get('discover/movie', { language: profile.language, sort_by: 'vote_count.desc', page: ui.discoverPage });
    const known = new Set([...SEED_IDS, ...ui.extra.map((f) => f.id)]);
    ui.extra.push(...(data.results || []).filter((m) => !known.has(m.id)).map(fromTmdb));
  }
}

const TIP = `<div class="card hint"><p><strong>Tipp:</strong> Wähl zuerst unter
  <button class="link-btn" type="button" data-sub="personen">Personen</button>,
  <button class="link-btn" type="button" data-sub="studios">Studios</button> und
  <button class="link-btn" type="button" data-sub="themen">Themen</button>, was du magst.
  Dann zeigt dir diese Liste zuerst deren Filme.</p></div>`;

async function fillFilms() {
  const el = body();
  if (!ui.done) snapshotDone();
  const marked = Object.keys(profile.movies).length;
  const passed = (profile.passed || []).length;
  if (!nothingRated() && !ui.personal.length) el.innerHTML = '<p class="muted center">Suche Filme deiner Lieblinge …</p>';
  try { await loadPersonal(); } catch { /* dann eben ohne */ }
  try { await ensure(ui.shown); } catch (err) { toast(err.message); }
  if (body() !== el || ui.sub !== 'filme' || ui.query.trim().length >= 2) return;
  const doneInfo = ui.showAll
    ? `<p class="muted small">Du siehst alle Filme, auch die schon markierten. <button class="btn btn-small" type="button" data-taste="toggle-all">Nur neue zeigen</button></p>`
    : ui.done.size
      ? `<p class="muted small">${marked} markiert${passed ? `, ${passed} übersprungen` : ''} – die sind ausgeblendet, hier kommen nur neue. <button class="btn btn-small" type="button" data-taste="toggle-all">Alle zeigen</button></p>`
      : '';
  el.innerHTML = `
    <p class="muted small">Tipp an, was du kennst. Unbekannte Filme einfach überscrollen. Nochmal tippen nimmt die Markierung zurück. <strong>Aufs Poster tippen = ★ Lieblingsfilm.</strong></p>
    ${nothingRated() ? TIP : ''}
    ${doneInfo}
    <div class="films">${candidates().slice(0, ui.shown).map(filmCard).join('')}</div>
    <div class="row center-row">
      <button class="btn btn-primary" type="button" data-taste="more">Weitere laden</button>
    </div>`;
}

async function loadMore(btn) {
  const grid = body()?.querySelector('.films');
  if (!grid) return;
  const present = [...grid.querySelectorAll('[data-film]')].map((c) => +c.dataset.film);
  // Wer weiterblättert, ist an den bisherigen vorbei – die nicht markierten gelten als übersprungen
  if (!ui.showAll) store.addPassed(profile.id, present.filter((id) => !profile.movies[id]));
  ui.shown += STEP;
  btn.disabled = true; btn.textContent = 'Lädt …';
  try { await ensure(ui.shown); } catch (err) { ui.shown -= STEP; toast(err.message); }
  btn.disabled = false; btn.textContent = 'Weitere laden';
  const have = new Set(present);
  grid.insertAdjacentHTML('beforeend', candidates().slice(0, ui.shown).filter((f) => !have.has(f.id)).map(filmCard).join(''));
}

// ----- Personen -----
const seedPerson = new Map(SEED_PEOPLE.map((x) => [x.id, x]));
const asPerson = (e) => seedPerson.get(e.id) || { id: e.id, n: e.n || 'Unbekannt', r: e.role, p: e.p };

function fillPeople() {
  const el = body();
  const f = ui.personFilter;
  const keep = (x) => f === 'all' || x.r === f;
  const rated = [...profile.people].sort(byTier).map(asPerson).filter(keep);
  const ratedIds = new Set(profile.people.map((x) => x.id));
  const fb = (key, label) => `<button type="button" class="seg" data-pfilter="${key}" aria-pressed="${f === key}">${label}</button>`;
  el.innerHTML = `
    <div class="segmented filter" role="group" aria-label="Filter">${fb('all', 'Alle')}${fb('actor', 'Schauspiel')}${fb('director', 'Regie')}</div>
    <p class="muted small"><strong>★ Liebe</strong> = auf jeden Fall, <strong>♥ Gern</strong> = sehe ich gern, nichts gewählt = egal. Nochmal tippen nimmt die Wahl zurück.</p>
    ${rated.length ? `<h2>Deine Lieblinge</h2><div class="tiles">${rated.map(personCard).join('')}</div>` : ''}
    <div id="from-liked"></div>
    <h2>Bekannte Namen</h2>
    <div class="tiles" id="known-people">${SEED_PEOPLE.filter((x) => keep(x) && !ratedIds.has(x.id)).map(personCard).join('')}</div>`;
  fillFromLiked(keep, ratedIds);
}

// Wer kommt in deinen gemochten Filmen am häufigsten vor? (★ zählt doppelt)
async function fillFromLiked(keep, skip) {
  const liked = Object.entries(profile.movies).filter(([, m]) => m.s === 'liked' || m.s === 'loved').sort((a, b) => b[1].t - a[1].t).slice(0, 30);
  if (!liked.length) return;
  const found = new Map();
  const results = await Promise.allSettled(liked.map(([id, m]) => tmdb.get(`movie/${id}/credits`).then((c) => ({ c, w: m.s === 'loved' ? 2 : 1 }))));
  for (const r of results) {
    if (r.status !== 'fulfilled') continue;
    const { c, w } = r.value;
    const picks = [
      ...(c.crew || []).filter((x) => x.job === 'Director').map((x) => ({ ...x, r: 'director' })),
      ...(c.cast || []).filter((x) => x.order < 5).map((x) => ({ ...x, r: 'actor' })),
    ];
    for (const x of picks) {
      if (skip.has(x.id)) continue;
      const key = `${x.id}-${x.r}`;
      const e = found.get(key) || { ...(seedPerson.get(x.id) || {}), id: x.id, n: x.name, r: x.r, p: x.profile_path, count: 0, score: 0, pop: x.popularity || 0 };
      e.count++; e.score += w;
      found.set(key, e);
    }
  }
  // Wer in mehreren Filmen vorkommt, steht oben; bei Gleichstand Regie zuerst
  const list = [...found.values()].filter(keep)
    .sort((a, b) => b.score - a.score || (b.r === 'director') - (a.r === 'director') || b.pop - a.pop)
    .filter((x, i, arr) => arr.findIndex((y) => y.id === x.id) === i)
    .slice(0, 16);
  const box = document.getElementById('from-liked');
  if (!box || !list.length) return;
  box.innerHTML = `<h2>Aus deinen Filmen</h2><p class="muted small">Wer in den Filmen, die du magst, am häufigsten vorkommt.</p><div class="tiles">${list.map(personCard).join('')}</div>`;
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

// ----- Themen -----
function fillThemes() {
  const el = body();
  const ratedIds = new Set((profile.themes || []).map((x) => x.id));
  const rated = [...(profile.themes || [])].sort(byTier).map((x) => themeById.get(x.id)).filter(Boolean);
  el.innerHTML = `
    <p class="muted small">Worum soll es gehen? Wähl Geschichten und Stimmungen, die du magst – die Vorschläge berücksichtigen das.</p>
    ${rated.length ? `<h2>Deine Lieblingsthemen</h2><div class="tiles">${rated.map(themeCard).join('')}</div><h2>Weitere Themen</h2>` : ''}
    <div class="tiles">${THEMES.filter((t) => !ratedIds.has(t.id)).map(themeCard).join('')}</div>
    <p class="muted small">Hinweis: Kameraführung lässt sich bei TMDB leider nicht abfragen, „Gespräche & Dialoge“ ist nur bei wenigen Filmen eingetragen.</p>`;
}

// ----- Suche -----
async function runSearch() {
  const q = ui.query.trim();
  const run = ++searchRun;
  const el = body();
  el.innerHTML = '<p class="muted center">Suche …</p>';
  try {
    const [own, other, people, comps] = await Promise.all([
      tmdb.get('search/movie', { query: q, language: profile.language }),
      tmdb.get('search/movie', { query: q, language: otherLanguage() }),
      tmdb.get('search/person', { query: q, language: profile.language }),
      tmdb.get('search/company', { query: q }),
    ]);
    // Treffer beider Sprachen zusammenführen; Titel immer in der Profilsprache
    const ownIds = new Set((own.results || []).map((m) => m.id));
    const extraIds = (other.results || []).filter((m) => !ownIds.has(m.id)).slice(0, 5).map((m) => m.id);
    const extra = await Promise.all(extraIds.map((id) => tmdb.get(`movie/${id}`, { language: profile.language }).catch(() => null)));
    const movieList = remember([...(own.results || []), ...extra.filter(Boolean)]
      .sort((a, b) => (b.vote_count || 0) - (a.vote_count || 0)).slice(0, 12).map(fromTmdb));
    const personList = (people.results || [])
      .filter((x) => (x.known_for_department === 'Acting' || x.known_for_department === 'Directing') && (x.known_for || []).length)
      .slice(0, 8).map((x) => ({
        id: x.id, n: x.name, p: x.profile_path, r: x.known_for_department === 'Directing' ? 'director' : 'actor',
        k: { [lang()]: (x.known_for || []).filter((k) => k.media_type === 'movie').slice(0, 2).map((k) => k.title) },
      }));
    const compList = (comps.results || []).slice(0, 6).map((x) => ({ id: x.id, n: x.name, logo: x.logo_path, c: x.origin_country }));
    const themeList = THEMES.filter((t) => t.n.toLowerCase().includes(q.toLowerCase()));
    if (run !== searchRun || !body()) return; // inzwischen weiter getippt
    if (!movieList.length && !personList.length && !compList.length && !themeList.length) {
      el.innerHTML = `<p class="muted center">Nichts gefunden für „${esc(q)}“. Vielleicht anders geschrieben?</p>`;
      return;
    }
    el.innerHTML = `
      ${movieList.length ? `<h2>Filme</h2><div class="films">${movieList.map(filmCard).join('')}</div>` : ''}
      ${personList.length ? `<h2>Personen</h2><div class="tiles">${personList.map(personCard).join('')}</div>` : ''}
      ${themeList.length ? `<h2>Themen</h2><div class="tiles">${themeList.map(themeCard).join('')}</div>` : ''}
      ${compList.length ? `<h2>Studios</h2><div class="tiles">${compList.map(studioCard).join('')}</div>` : ''}`;
  } catch (err) {
    if (run === searchRun && body()) el.innerHTML = errorBox(err.message, 'search');
  }
}

// ---------- Klicks (von app.js weitergereicht) ----------
export function handleClick(e) {
  const markBtn = e.target.closest('[data-mark]');
  if (markBtn) {
    const card = markBtn.closest('[data-film]');
    const id = +card.dataset.film;
    const f = films.get(id) || {};
    const status = markBtn.dataset.mark;
    const old = profile.movies[id]?.s || null;
    // Stern: an/aus (aus = bleibt „Mag ich“). Sonst: zweiter Tipp nimmt zurück.
    const now = status === 'loved' ? (old === 'loved' ? 'liked' : 'loved') : pressed(old, status) ? null : status;
    store.setMovie(profile.id, id, now, { g: f.g, l: f.l, y: f.y, n: f.title });
    document.querySelectorAll(`[data-film="${id}"]`).forEach((c) => updateFilmCard(c, id));
    return true;
  }
  const tierBtn = e.target.closest('[data-tier]');
  if (tierBtn) {
    const tile = tierBtn.closest('[data-person], [data-company], [data-theme]');
    const kind = tile.dataset.person ? 'person' : tile.dataset.company ? 'company' : 'theme';
    const id = kind === 'theme' ? tile.dataset.theme : Number(tile.dataset[kind]);
    const want = Number(tierBtn.dataset.tier);
    const w = tier(kind, id) === want ? 0 : want; // nochmal tippen = egal
    let entry;
    if (kind === 'person') { const x = persons.get(id); entry = { id, role: x.r, n: x.n, p: x.p }; }
    else if (kind === 'company') { const x = companies.get(id); entry = { id, n: x.n, logo: x.logo, c: x.c, ...(x.also ? { also: x.also } : {}) }; }
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
  if (act === 'toggle-all') { ui.showAll = !ui.showAll; snapshotDone(); fillFilms(); return true; }
  if (act === 'search') { runSearch(); return true; }
  return false;
}
