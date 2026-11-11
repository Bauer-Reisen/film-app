// Seite „Geschmack“: Filme markieren, Lieblingspersonen und -studios wählen, Suche.
import * as store from './store.js?v=0.6.0';
import * as tmdb from './tmdb.js?v=0.6.0';
import { esc, toast } from './ui.js?v=0.6.0';
import { SEED_MOVIES, SEED_PEOPLE, SEED_STUDIOS } from './seeds.js?v=0.6.0';

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
  sub: 'filme', query: '', showAll: false, done: null,
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

// ---------- Personen und Studios ----------
function personCard(x) {
  persons.set(x.id, x);
  const fav = profile.people.some((e) => e.id === x.id);
  const photo = x.p ? `<img class="face" src="${tmdb.img(x.p, 'w185')}" alt="" loading="lazy" width="72" height="72">`
    : `<span class="face noimg" aria-hidden="true">${esc(x.n.slice(0, 1))}</span>`;
  const known = x.k?.[lang()]?.length ? x.k[lang()] : x.k?.en || [];
  return `
    <button type="button" class="tile ${fav ? 'is-fav' : ''}" data-person="${x.id}" aria-pressed="${fav}">
      ${photo}
      <span class="tile-name">${esc(x.n)}</span>
      <span class="tile-sub">${x.r === 'director' ? 'Regie' : 'Schauspiel'}${known.length ? ` · ${esc(known.join(', '))}` : ''}</span>
      <span class="star">${fav ? '★ Favorit' : '☆ Favorit'}</span>
    </button>`;
}

function studioCard(x) {
  companies.set(x.id, x);
  const fav = profile.companies.some((e) => e.id === x.id);
  const logo = x.logo ? `<span class="logo"><img src="${tmdb.img(x.logo, 'w185')}" alt="" loading="lazy"></span>`
    : `<span class="logo noimg" aria-hidden="true">${esc(x.n.slice(0, 2))}</span>`;
  return `
    <button type="button" class="tile ${fav ? 'is-fav' : ''}" data-company="${x.id}" aria-pressed="${fav}">
      ${logo}
      <span class="tile-name">${esc(x.n)}</span>
      <span class="tile-sub">${x.i ? '<span class="tag tag-indie">Indie</span> ' : ''}${esc(x.c || '')}</span>
      <span class="star">${fav ? '★ Favorit' : '☆ Favorit'}</span>
    </button>`;
}

function updateTile(tile, fav) {
  tile.classList.toggle('is-fav', fav);
  tile.setAttribute('aria-pressed', String(fav));
  tile.querySelector('.star').textContent = fav ? '★ Favorit' : '☆ Favorit';
}

const errorBox = (msg, retry) => `<div class="card center"><p>${esc(msg)}</p><button class="btn" type="button" data-taste="${retry}">Nochmal versuchen</button></div>`;

// ---------- Seite ----------
export function render(p) {
  profile = p;
  if (ui.extraLang !== p.language) { ui.extra = []; ui.discoverPage = 0; ui.extraLang = p.language; }
  const tab = (key, label) => `<button type="button" class="seg" data-sub="${key}" aria-pressed="${ui.sub === key}">${label}</button>`;
  return `
    <h1>Geschmack</h1>
    <label class="search">
      <span class="sr-only">Suche</span>
      <input id="taste-search" type="search" inputmode="search" enterkeyhint="search" autocomplete="off"
        placeholder="Film, Person oder Studio suchen" value="${esc(ui.query)}">
    </label>
    <div class="segmented sub-tabs" role="group" aria-label="Bereich">
      ${tab('filme', 'Filme')}${tab('personen', 'Personen')}${tab('studios', 'Studios')}
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
  return fillStudios();
}

// ----- Filme -----
// Beim Öffnen der Seite wird festgehalten, was schon erledigt ist (markiert oder übersprungen).
// Diese Filme bleiben ausgeblendet; was man jetzt markiert, bleibt bis zum nächsten Öffnen sichtbar.
const allFilms = () => remember([...SEED_MOVIES.map(fromSeed), ...ui.extra]);
const candidates = () => (ui.showAll ? allFilms() : allFilms().filter((f) => !ui.done.has(f.id)));

function snapshotDone() {
  ui.done = new Set([...Object.keys(profile.movies).map(Number), ...(profile.passed || [])]);
  ui.shown = STEP;
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

async function fillFilms() {
  const el = body();
  if (!ui.done) snapshotDone();
  const marked = Object.keys(profile.movies).length;
  const passed = (profile.passed || []).length;
  try { await ensure(ui.shown); } catch (err) { toast(err.message); }
  if (body() !== el || ui.sub !== 'filme' || ui.query.trim().length >= 2) return;
  const doneInfo = ui.showAll
    ? `<p class="muted small">Du siehst alle Filme, auch die schon markierten. <button class="btn btn-small" type="button" data-taste="toggle-all">Nur neue zeigen</button></p>`
    : ui.done.size
      ? `<p class="muted small">${marked} markiert${passed ? `, ${passed} übersprungen` : ''} – die sind ausgeblendet, hier kommen nur neue. <button class="btn btn-small" type="button" data-taste="toggle-all">Alle zeigen</button></p>`
      : '';
  el.innerHTML = `
    <p class="muted small">Tipp an, was du kennst. Unbekannte Filme einfach überscrollen. Nochmal tippen nimmt die Markierung zurück. <strong>Aufs Poster tippen = ★ Lieblingsfilm.</strong></p>
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
async function fillPeople() {
  const el = body();
  const f = ui.personFilter;
  const keep = (x) => f === 'all' || x.r === f;
  const seedIds = new Set(SEED_PEOPLE.map((x) => x.id));
  const favs = profile.people.filter((x) => !seedIds.has(x.id)).map((x) => ({ id: x.id, n: x.n || 'Unbekannt', r: x.role, p: x.p }));
  const fb = (key, label) => `<button type="button" class="seg" data-pfilter="${key}" aria-pressed="${f === key}">${label}</button>`;
  el.innerHTML = `
    <div class="segmented filter" role="group" aria-label="Filter">${fb('all', 'Alle')}${fb('actor', 'Schauspiel')}${fb('director', 'Regie')}</div>
    <p class="muted small">Tipp an, wen du gern siehst. Deren Filme bekommen bei den Vorschlägen Vorrang.</p>
    ${favs.filter(keep).length ? `<h2>Deine Favoriten</h2><div class="tiles">${favs.filter(keep).map(personCard).join('')}</div>` : ''}
    <div id="from-liked"></div>
    <h2>Bekannte Namen</h2>
    <div class="tiles">${SEED_PEOPLE.filter(keep).map(personCard).join('')}</div>`;
  fillFromLiked(keep, new Set([...seedIds, ...favs.map((x) => x.id)]));
}

// Personen aus Filmen, die man mag (Regie + die ersten drei Rollen)
async function fillFromLiked(keep, skip) {
  const liked = Object.entries(profile.movies).filter(([, m]) => (m.s === 'liked' || m.s === 'loved')).sort((a, b) => b[1].t - a[1].t).slice(0, 6);
  if (!liked.length) return;
  const found = new Map();
  try {
    const credits = await Promise.all(liked.map(([id]) => tmdb.get(`movie/${id}/credits`)));
    for (const c of credits) {
      const picks = [
        ...(c.crew || []).filter((x) => x.job === 'Director').map((x) => ({ ...x, r: 'director' })),
        ...(c.cast || []).slice(0, 3).map((x) => ({ ...x, r: 'actor' })),
      ];
      for (const x of picks) if (!skip.has(x.id) && !found.has(x.id)) found.set(x.id, { id: x.id, n: x.name, r: x.r, p: x.profile_path });
    }
  } catch { return; } // nur eine Zugabe – bei Fehler einfach weglassen
  const list = [...found.values()].filter(keep);
  const box = document.getElementById('from-liked');
  if (box && list.length) box.innerHTML = `<h2>Aus Filmen, die du magst</h2><div class="tiles">${list.map(personCard).join('')}</div>`;
}

// ----- Studios -----
function fillStudios() {
  const el = body();
  const f = ui.studioFilter;
  const seedIds = new Set(SEED_STUDIOS.map((x) => x.id));
  const favs = profile.companies.filter((x) => !seedIds.has(x.id)).map((x) => ({ id: x.id, n: x.n || 'Unbekannt', logo: x.logo, c: x.c }));
  const list = SEED_STUDIOS.filter((x) => f === 'all' || x.i);
  const fb = (key, label) => `<button type="button" class="seg" data-sfilter="${key}" aria-pressed="${f === key}">${label}</button>`;
  el.innerHTML = `
    <div class="segmented filter" role="group" aria-label="Filter">${fb('all', 'Alle')}${fb('indie', 'Klein & Independent')}</div>
    <p class="muted small">Studios mit eigener Handschrift – zum Beispiel A24 oder Studio Ghibli. Ihre Filme bekommen bei den Vorschlägen einen Bonus.</p>
    ${favs.length && f === 'all' ? `<h2>Deine Favoriten</h2><div class="tiles">${favs.map(studioCard).join('')}</div><h2>Bekannte Studios</h2>` : ''}
    <div class="tiles">${list.map(studioCard).join('')}</div>`;
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
    if (run !== searchRun || !body()) return; // inzwischen weiter getippt
    if (!movieList.length && !personList.length && !compList.length) {
      el.innerHTML = `<p class="muted center">Nichts gefunden für „${esc(q)}“. Vielleicht anders geschrieben?</p>`;
      return;
    }
    el.innerHTML = `
      ${movieList.length ? `<h2>Filme</h2><div class="films">${movieList.map(filmCard).join('')}</div>` : ''}
      ${personList.length ? `<h2>Personen</h2><div class="tiles">${personList.map(personCard).join('')}</div>` : ''}
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
  const person = e.target.closest('[data-person]');
  if (person) {
    const x = persons.get(+person.dataset.person);
    const fav = store.togglePerson(profile.id, { id: x.id, role: x.r, n: x.n, p: x.p });
    document.querySelectorAll(`[data-person="${x.id}"]`).forEach((t) => updateTile(t, fav));
    return true;
  }
  const comp = e.target.closest('[data-company]');
  if (comp) {
    const x = companies.get(+comp.dataset.company);
    const fav = store.toggleCompany(profile.id, { id: x.id, n: x.n, logo: x.logo, c: x.c, ...(x.also ? { also: x.also } : {}) });
    document.querySelectorAll(`[data-company="${x.id}"]`).forEach((t) => updateTile(t, fav));
    return true;
  }
  const sub = e.target.closest('[data-sub]');
  if (sub) { ui.sub = sub.dataset.sub; document.querySelectorAll('[data-sub]').forEach((b) => b.setAttribute('aria-pressed', String(b === sub))); fillBody(); return true; }
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
