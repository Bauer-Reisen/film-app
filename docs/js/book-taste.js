// Seite „Geschmack“ bei Büchern: Autor·innen, Themen und Genres in Stufen, Bücher markieren, Suche (auch ISBN), Scannen.
import * as store from './store.js?v=1.12.0';
import * as books from './books.js?v=1.12.0';
import { esc, toast } from './ui.js?v=1.12.0';
import { SEED_BOOKS, SEED_AUTHORS } from './seeds-books.js?v=1.12.0';
import { THEMES, themeById } from './themes.js?v=1.12.0';
import { BOOK_GENRES, bookGenreById } from './book-genres.js?v=1.12.0';
import { MEDIA, stateLabel, pressed } from './media.js?v=1.12.0';
import { TASTE_HINT_AFTER } from './config.js?v=1.12.0';
import { authorsFromFilms } from './bridge-books.js?v=1.12.0';

const STEP = 20;
const SCAN = false; // Scannen kommt in 1.13.0
export const BOOK_MARKS = [
  ['seen', '✓', 'Gelesen'],
  ['liked', '♥', 'Mag ich'],
  ['disliked', '✕', 'Mag ich nicht'],
  ['want', '+', 'Merken'],
  ['dropped', '⏹', 'Abgebrochen'],
];
const W = MEDIA.book.w;

const ui = { sub: null, query: '' };
const L = { showAll: false, done: null, personal: [], personalKey: '', shown: STEP, extra: [], extraKey: '', page: 0 };
const known = new Map(); // id → Buch (für die Angaben beim Markieren)
const authorsSeen = new Map();
let profile = null;
let searchTimer = null;
let searchRun = 0;

const marks = () => profile.books || {};
const lang = () => books.readLang(profile);
const remember = (list) => { list.forEach((b) => known.set(b.id, b)); return list; };
export const rememberBooks = remember;

// ---------- Karten ----------
export function coverImg(id, alt = '') {
  if (!id) return `<div class="poster noimg" aria-hidden="true">${W.noPoster}</div>`;
  return `<img class="poster" src="${books.cover(id, 'M')}" srcset="${books.cover(id, 'M')} 180w, ${books.cover(id, 'L')} 400w"
    sizes="(min-width: 768px) 200px, 100px" width="100" height="150" loading="lazy" decoding="async" alt="${esc(alt)}">`;
}
export const bookMeta = (b) => [b.a, b.y, books.pagesText(b.pg)].filter(Boolean).join(' · ');

function bookCard(b) {
  const s = marks()[b.id]?.s || null;
  return `
    <article class="film book ${s ? 'is-marked' : ''} ${s === 'loved' ? 'is-loved' : ''}" data-book="${b.id}">
      <button type="button" class="poster-btn" data-bmark="loved" aria-pressed="${s === 'loved'}" aria-label="${esc(b.title)} als ${W.fav}">
        ${coverImg(b.cover)}
        <span class="poster-star" aria-hidden="true">${s === 'loved' ? '★' : '☆'}</span>
      </button>
      <div class="film-info">
        <h3 class="film-title">${esc(b.title)}</h3>
        <p class="book-meta muted small">${esc(bookMeta(b))}</p>
        ${b.why ? `<p class="film-why">Von deinen Lieblingen: ${esc(b.why)}</p>` : ''}
        <p class="film-state">${s ? esc(stateLabel('book', s)) : ''}</p>
        <div class="marks marks-5" role="group" aria-label="${esc(b.title)} markieren">
          ${BOOK_MARKS.map(([key, icon, label]) => `
            <button type="button" class="mark mark-${key}" data-bmark="${key}" aria-pressed="${pressed(s, key)}"><span aria-hidden="true">${icon}</span> ${label}</button>`).join('')}
        </div>
      </div>
    </article>`;
}

function updateCard(card, id) {
  const s = marks()[id]?.s || null;
  card.classList.toggle('is-marked', !!s);
  card.classList.toggle('is-loved', s === 'loved');
  card.querySelector('.poster-star').textContent = s === 'loved' ? '★' : '☆';
  card.querySelector('.film-state').textContent = s ? stateLabel('book', s) : '';
  card.querySelectorAll('[data-bmark]').forEach((b) => b.setAttribute('aria-pressed', String(pressed(s, b.dataset.bmark))));
}

// ---------- Kacheln mit Stufen ----------
const LIST = { author: 'authors', theme: 'themes', bgenre: 'bookGenres' };
const tier = (kind, id) => { const e = (profile[LIST[kind]] || []).find((x) => x.id === id); return e ? store.tierOf(e) : 0; };
const tierButtons = (name, w) => `
  <span class="tier" role="group" aria-label="${esc(name)}: wie gern?">
    <button type="button" class="tier-btn tier-2" data-btier="2" aria-pressed="${w === 2}">★ Liebe</button>
    <button type="button" class="tier-btn tier-1" data-btier="1" aria-pressed="${w === 1}">♥ Gern</button>
  </span>`;

function authorCard(x) {
  authorsSeen.set(x.id, x);
  const w = tier('author', x.id);
  const sub = x.count ? (x.count === 1 ? `in einem ${x.fromFilms ? 'deiner Filme/Serien' : 'deiner Bücher'}` : `in ${x.count} ${x.fromFilms ? 'deiner Filme/Serien' : 'deiner Bücher'}`) : x.k;
  return `
    <div class="tile w${w}" data-author="${x.id}">
      <span class="face-wrap"><img class="face" src="${books.authorPhoto(x.id)}" alt="" loading="lazy" width="72" height="72" data-initial="${esc(x.n.slice(0, 1))}"></span>
      <span class="tile-name">${esc(x.n)}</span>
      <span class="tile-sub">Autor·in${sub ? ` · ${esc(sub)}` : ''}</span>
      ${tierButtons(x.n, w)}
    </div>`;
}

function themeExample(t) {
  return t.bEx ? `z. B. ${t.bEx}` : 'Bei Büchern kaum eingetragen';
}
function themeCard(t) {
  const w = tier('theme', t.id);
  return `
    <div class="tile theme w${w}" data-btheme="${t.id}">
      <span class="tile-name">${esc(t.n)}</span>
      <span class="tile-sub">${esc(themeExample(t))}</span>
      ${tierButtons(t.n, w)}
    </div>`;
}
function genreCard(g) {
  const w = tier('bgenre', g.id);
  return `
    <div class="tile theme w${w}" data-bgenre="${g.id}">
      <span class="tile-name">${esc(g.n)}</span>
      <span class="tile-sub">${esc(g.ex || '')}</span>
      ${tierButtons(g.n, w)}
    </div>`;
}
const updateTile = (tile, w) => {
  tile.classList.remove('w0', 'w1', 'w2');
  tile.classList.add(`w${w}`);
  tile.querySelectorAll('[data-btier]').forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.btier) === w)));
};
const byTier = (a, b) => store.tierOf(b) - store.tierOf(a) || b.t - a.t;
const nothingRated = () => !(profile.authors || []).length && !(profile.bookGenres || []).length && !(profile.themes || []).length;

// Bild fehlt? Dann den Anfangsbuchstaben zeigen
function photoFallback(e) {
  const img = e.target;
  if (!(img instanceof HTMLImageElement) || !img.classList.contains('face') || !img.dataset.initial) return;
  img.replaceWith(Object.assign(document.createElement('span'), { className: 'face noimg', textContent: img.dataset.initial, ariaHidden: 'true' }));
}

// ---------- Seite ----------
export function render(p) {
  profile = p;
  if (!ui.sub) ui.sub = nothingRated() && !Object.keys(p.books || {}).length ? 'autoren' : 'buecher';
  const key = `${lang()}`;
  if (L.extraKey !== key) { L.extra = []; L.page = 0; L.extraKey = key; L.personalKey = ''; }
  const tab = (k, label) => `<button type="button" class="seg" data-bsub="${k}" aria-pressed="${ui.sub === k}">${label}</button>`;
  return `
    <h1>Geschmack</h1>
    ${SCAN ? '<p class="row scan-row"><a class="btn btn-primary btn-big" href="#/scannen"><span aria-hidden="true">📷</span> Bücher scannen</a></p>' : ''}
    <label class="search">
      <span class="sr-only">Suche</span>
      <input id="taste-search" type="search" inputmode="search" enterkeyhint="search" autocomplete="off"
        placeholder="Buch, Autor·in, Thema oder ISBN suchen" value="${esc(ui.query)}">
    </label>
    <div class="segmented sub-tabs" role="group" aria-label="Bereich">
      ${tab('autoren', 'Autor·innen')}${tab('themen', 'Themen')}${tab('genres', 'Genres')}${tab('buecher', 'Bücher')}
    </div>
    <div id="taste-body" aria-live="polite"></div>`;
}

export function mount(view, p) {
  profile = p;
  L.done = null;
  const input = view.querySelector('#taste-search');
  input.addEventListener('input', () => {
    ui.query = input.value;
    clearTimeout(searchTimer);
    searchTimer = setTimeout(fillBody, ui.query.trim().length >= 2 ? 450 : 0);
  });
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); input.blur(); } });
  view.addEventListener('error', photoFallback, true);
  fillBody();
}

const body = () => document.getElementById('taste-body');
const searching = () => ui.query.trim().length >= 2;

function fillBody() {
  const el = body();
  if (!el) return;
  document.querySelector('.sub-tabs')?.toggleAttribute('hidden', searching());
  if (searching()) return runSearch();
  if (ui.sub === 'buecher') return fillBooks();
  if (ui.sub === 'themen') return fillThemes();
  if (ui.sub === 'genres') return fillGenres();
  return fillAuthors();
}

// ----- Bücher -----
const seedList = () => [...SEED_BOOKS].sort((a, b) => b.r - a.r).map((b) => books.fromSeed(b, lang()));
const allBooks = () => {
  const seen = new Set();
  return remember([...L.personal, ...seedList(), ...L.extra].filter((b) => !seen.has(b.id) && seen.add(b.id)));
};
const candidates = () => (L.showAll ? allBooks() : allBooks().filter((b) => !L.done.has(b.id)));
function snapshotDone() {
  L.done = new Set([...Object.keys(marks()), ...(profile.passedBook || [])]);
  L.shown = STEP;
}

// Bücher der gewählten Autor·innen, Genres und Themen zuerst
async function loadPersonal() {
  const auths = [...(profile.authors || [])].sort(byTier).slice(0, 12);
  const genres = [...(profile.bookGenres || [])].sort(byTier).filter((x) => bookGenreById.has(x.id)).slice(0, 6);
  const themes = [...(profile.themes || [])].sort(byTier).filter((x) => themeById.get(x.id)?.b?.length).slice(0, 6);
  const key = JSON.stringify([lang(), auths.map((x) => [x.id, x.w]), genres.map((x) => [x.id, x.w]), themes.map((x) => [x.id, x.w])]);
  if (key === L.personalKey) return;
  const subj = (list) => list.map((s) => `subject_key:${s}`).join(' OR ');
  const jobs = [
    ...auths.map((x) => books.search({ q: `author_key:${x.id.replace('/authors/', '')}`, sort: 'readinglog' }, lang(), 30).then((list) => ({ w: store.tierOf(x), why: x.n, list }))),
    ...genres.map((x) => books.search({ q: subj(bookGenreById.get(x.id).q), sort: 'readinglog' }, lang(), 30).then((list) => ({ w: store.tierOf(x), why: bookGenreById.get(x.id).n, list }))),
    ...themes.map((x) => books.search({ q: subj(themeById.get(x.id).b), sort: 'readinglog' }, lang(), 30).then((list) => ({ w: store.tierOf(x), why: themeById.get(x.id).n, list }))),
  ];
  const results = (await Promise.allSettled(jobs)).filter((r) => r.status === 'fulfilled').map((r) => r.value);
  const map = new Map();
  for (const { w, why, list } of results) {
    for (const b of list) {
      if (!b.cover || b.r < 20) continue;
      const e = map.get(b.id) || { b, score: 0, why: [] };
      e.score += w;
      if (!e.why.includes(why)) e.why.push(why);
      map.set(b.id, e);
    }
  }
  L.personal = [...map.values()].sort((a, b) => b.score - a.score || b.b.r - a.b.r).slice(0, 300).map((e) => ({ ...e.b, why: e.why.slice(0, 2).join(', ') }));
  L.personalKey = key;
}

// Nach der Startliste: weitere beliebte Bücher von Open Library (meistgelesene zuerst)
async function ensure(n) {
  while (candidates().length < n && L.page < 20) {
    L.page++;
    const have = new Set([...SEED_BOOKS.map((b) => b.id), ...L.extra.map((b) => b.id)]);
    const list = await books.search({ q: 'subject_key:fiction', sort: 'readinglog', page: L.page }, lang(), 40);
    L.extra.push(...list.filter((b) => b.cover && !have.has(b.id)));
  }
}

const tip = () => `<div class="card hint"><p><strong>Tipp:</strong> Wähl zuerst unter
  <button class="link-btn" type="button" data-bsub="autoren">Autor·innen</button>,
  <button class="link-btn" type="button" data-bsub="genres">Genres</button> und
  <button class="link-btn" type="button" data-bsub="themen">Themen</button>, was du gern liest.
  Dann zeigt dir diese Liste zuerst deren Bücher. Oder scanne gleich die Bücher in deinem Regal.</p></div>`;

function suggestHint() {
  const n = Object.keys(marks()).length;
  if (n < TASTE_HINT_AFTER || profile.settings?.hintDone?.book) return '';
  return `<div class="card hint" data-hint="suggest">
    <p><strong>Die App kennt deinen Lesegeschmack jetzt gut.</strong></p>
    <p>Mach am besten bei den Vorschlägen weiter: Dort kommen nur noch Bücher, die zu dir passen.</p>
    <div class="row"><a class="btn btn-primary" href="#/vorschlaege">Zu den Vorschlägen</a>
    <button class="btn" type="button" data-btaste="hint-hide">Ausblenden</button></div></div>`;
}

async function fillBooks() {
  const el = body();
  if (!L.done) snapshotDone();
  const marked = Object.keys(marks()).length;
  const passed = (profile.passedBook || []).length;
  if (!nothingRated() && !L.personal.length) el.innerHTML = '<p class="muted center">Suche Bücher deiner Lieblinge …</p>';
  try { await loadPersonal(); } catch { /* dann eben ohne */ }
  try { await ensure(L.shown); } catch (err) { toast(err.message); }
  if (body() !== el || ui.sub !== 'buecher' || searching()) return;
  const doneInfo = L.showAll
    ? '<p class="muted small">Du siehst alle Bücher, auch die schon markierten. <button class="btn btn-small" type="button" data-btaste="toggle-all">Nur neue zeigen</button></p>'
    : L.done.size
      ? `<p class="muted small">${marked} markiert${passed ? `, ${passed} übersprungen` : ''} – die sind ausgeblendet, hier kommen nur neue. <button class="btn btn-small" type="button" data-btaste="toggle-all">Alle zeigen</button></p>`
      : '';
  el.innerHTML = `
    <p class="muted small">Tipp an, was du gelesen hast. Unbekannte einfach überscrollen. Nochmal tippen nimmt die Markierung zurück. „Abgebrochen“ = nicht zu Ende gelesen. <strong>Aufs Cover tippen = ★ ${W.fav}.</strong></p>
    ${nothingRated() ? tip() : suggestHint()}
    ${doneInfo}
    <div class="films">${candidates().slice(0, L.shown).map(bookCard).join('')}</div>
    <div class="row center-row"><button class="btn btn-primary" type="button" data-btaste="more">Weitere laden</button></div>`;
}

async function loadMore(btn) {
  const grid = body()?.querySelector('.films');
  if (!grid) return;
  const present = [...grid.querySelectorAll('[data-book]')].map((c) => c.dataset.book);
  if (!L.showAll) store.addPassed(profile.id, present.filter((id) => !marks()[id]), 'book');
  L.shown += STEP;
  btn.disabled = true; btn.textContent = 'Lädt …';
  try { await ensure(L.shown); } catch (err) { L.shown -= STEP; toast(err.message); }
  btn.disabled = false; btn.textContent = 'Weitere laden';
  const have = new Set(present);
  grid.insertAdjacentHTML('beforeend', candidates().slice(0, L.shown).filter((b) => !have.has(b.id)).map(bookCard).join(''));
}

// ----- Autor·innen -----
const seedAuthor = new Map(SEED_AUTHORS.map((x) => [x.id, x]));
function fillAuthors() {
  const el = body();
  const rated = [...(profile.authors || [])].sort(byTier).map((e) => seedAuthor.get(e.id) || { id: e.id, n: e.n || 'Unbekannt', k: e.k || '' });
  const ratedIds = new Set((profile.authors || []).map((x) => x.id));
  el.innerHTML = `
    <p class="muted small"><strong>★ Liebe</strong> = lese ich auf jeden Fall, <strong>♥ Gern</strong> = lese ich gern, nichts gewählt = egal. Nochmal tippen nimmt die Wahl zurück.</p>
    ${rated.length ? `<h2>Deine Lieblinge</h2><div class="tiles">${rated.map(authorCard).join('')}</div>` : ''}
    <div id="from-liked"></div>
    <div id="from-films"></div>
    <h2>Bekannte Namen</h2>
    <div class="tiles" id="known-people">${SEED_AUTHORS.filter((x) => !ratedIds.has(x.id)).map(authorCard).join('')}</div>`;
  fromLiked(ratedIds);
  fromFilms(ratedIds);
}

// Wer kommt in deinen gemochten Büchern am häufigsten vor? (★ zählt doppelt)
function fromLiked(skip) {
  const found = new Map();
  for (const m of Object.values(marks())) {
    if (!['liked', 'loved'].includes(m.s) || !m.ak || skip.has(m.ak)) continue;
    const e = found.get(m.ak) || { ...(seedAuthor.get(m.ak) || {}), id: m.ak, n: m.a || seedAuthor.get(m.ak)?.n || 'Unbekannt', count: 0, score: 0 };
    e.count++; e.score += m.s === 'loved' ? 2 : 1;
    found.set(m.ak, e);
  }
  const list = [...found.values()].sort((a, b) => b.score - a.score).slice(0, 12);
  const box = document.getElementById('from-liked');
  if (!box || !list.length) return;
  box.innerHTML = `<h2>Aus deinen Büchern</h2><div class="tiles">${list.map(authorCard).join('')}</div>`;
  list.forEach((x) => document.querySelector(`#known-people [data-author="${x.id}"]`)?.remove());
}

// Brücke: Wer hat die Vorlagen deiner Lieblingsfilme und -serien geschrieben? (z. B. Stephen King)
async function fromFilms(skip) {
  let list = [];
  try { list = (await authorsFromFilms(profile)).filter((x) => !skip.has(x.id)); } catch { return; }
  const box = document.getElementById('from-films');
  if (!box || !list.length || ui.sub !== 'autoren' || searching()) return;
  box.innerHTML = `<h2>Aus deinen Filmen und Serien</h2><p class="muted small">Sie haben die Bücher zu Filmen und Serien geschrieben, die du magst.</p>
    <div class="tiles">${list.map((x) => authorCard({ ...x, fromFilms: true })).join('')}</div>`;
  list.forEach((x) => document.querySelector(`#known-people [data-author="${x.id}"]`)?.remove());
}

// ----- Themen und Genres -----
function fillThemes() {
  const ratedIds = new Set((profile.themes || []).map((x) => x.id));
  const rated = [...(profile.themes || [])].sort(byTier).map((x) => themeById.get(x.id)).filter(Boolean);
  body().innerHTML = `
    <p class="muted small">Worum soll es gehen? Dieselben Themen wie bei Filmen und Serien – was du hier wählst, gilt überall.</p>
    ${rated.length ? `<h2>Deine Lieblingsthemen</h2><div class="tiles">${rated.map(themeCard).join('')}</div><h2>Weitere Themen</h2>` : ''}
    <div class="tiles">${THEMES.filter((t) => !ratedIds.has(t.id)).map(themeCard).join('')}</div>`;
}
function fillGenres() {
  const ratedIds = new Set((profile.bookGenres || []).map((x) => x.id));
  const rated = [...(profile.bookGenres || [])].sort(byTier).map((x) => bookGenreById.get(x.id)).filter(Boolean);
  body().innerHTML = `
    <p class="muted small">Was liest du gern? <strong>★ Liebe</strong> oder <strong>♥ Gern</strong>, nichts gewählt = egal.</p>
    ${rated.length ? `<h2>Deine Lieblingsgenres</h2><div class="tiles">${rated.map(genreCard).join('')}</div><h2>Weitere Genres</h2>` : ''}
    <div class="tiles">${BOOK_GENRES.filter((g) => !ratedIds.has(g.id)).map(genreCard).join('')}</div>`;
}

// ----- Suche: Titel, Autor·in, ISBN -----
async function runSearch() {
  const q = ui.query.trim();
  const run = ++searchRun;
  const el = body();
  el.innerHTML = '<p class="muted center">Suche …</p>';
  try {
    const isbn = books.cleanIsbn(q);
    const [found, auths] = await Promise.all([
      isbn ? books.byIsbn(isbn, lang()).then((b) => (b ? [b] : [])) : books.search({ q }, lang(), 15),
      isbn ? Promise.resolve([]) : books.searchAuthors(q, 6).catch(() => []),
    ]);
    // Bekannte zuerst: Startliste, dann nach Zahl der Leser·innen
    const rank = (b) => (books.seedBook.has(b.id) ? 1e6 : 0) + (b.r || 0);
    const list = remember(found.filter((b) => isbn || b.r >= 2 || b.cover).sort((a, b) => rank(b) - rank(a)).slice(0, 12));
    const ql = q.toLowerCase();
    const themeList = THEMES.filter((t) => t.n.toLowerCase().includes(ql));
    const genreList = BOOK_GENRES.filter((g) => g.n.toLowerCase().includes(ql) || g.en.toLowerCase().includes(ql));
    if (run !== searchRun || !body()) return;
    if (!list.length && !auths.length && !themeList.length && !genreList.length) {
      el.innerHTML = `<p class="muted center">Nichts gefunden für „${esc(q)}“.${isbn ? ' Diese ISBN kennt Open Library nicht – such nach dem Titel.' : ' Vielleicht anders geschrieben?'}</p>`;
      return;
    }
    el.innerHTML = `
      ${list.length ? `<h2>Bücher</h2><div class="films">${list.map(bookCard).join('')}</div>` : ''}
      ${auths.length ? `<h2>Autor·innen</h2><div class="tiles">${auths.map(authorCard).join('')}</div>` : ''}
      ${genreList.length ? `<h2>Genres</h2><div class="tiles">${genreList.map(genreCard).join('')}</div>` : ''}
      ${themeList.length ? `<h2>Themen</h2><div class="tiles">${themeList.map(themeCard).join('')}</div>` : ''}`;
  } catch (err) {
    if (run === searchRun && body()) el.innerHTML = `<div class="card center"><p>${esc(err.message)}</p><button class="btn" type="button" data-btaste="search">Nochmal versuchen</button></div>`;
  }
}

// ---------- Markieren (auch von anderen Buch-Seiten genutzt) ----------
// Ein Tipp aufs Cover: ★ an/aus (aus = bleibt „Mag ich“). Ein Tipp auf einen leuchtenden Knopf nimmt zurück.
export function nextStatus(old, key) {
  if (key === 'loved') return old === 'loved' ? 'liked' : 'loved';
  return pressed(old, key) ? null : key;
}

function mark(card, key) {
  const id = card.dataset.book;
  const b = known.get(id) || {};
  const old = marks()[id]?.s || null;
  store.setMark(profile.id, 'book', id, nextStatus(old, key), books.markMeta(b));
  document.querySelectorAll(`[data-book="${id}"]`).forEach((c) => updateCard(c, id));
  if (body()?.querySelector('.films') && !body().querySelector('[data-hint]')) {
    const hint = suggestHint();
    if (hint) { body().insertAdjacentHTML('afterbegin', hint); toast('Tipp: Ab jetzt geht es bei den Vorschlägen am schnellsten weiter – Hinweis ganz oben.'); }
  }
}

export function handleClick(e) {
  const markBtn = e.target.closest('[data-bmark]');
  if (markBtn) { mark(markBtn.closest('[data-book]'), markBtn.dataset.bmark); return true; }
  const tierBtn = e.target.closest('[data-btier]');
  if (tierBtn) {
    const tile = tierBtn.closest('[data-author], [data-btheme], [data-bgenre]');
    const kind = tile.dataset.author ? 'author' : tile.dataset.btheme ? 'theme' : 'bgenre';
    const id = tile.dataset.author || tile.dataset.btheme || tile.dataset.bgenre;
    const want = Number(tierBtn.dataset.btier);
    const w = tier(kind, id) === want ? 0 : want;
    const x = authorsSeen.get(id);
    const entry = kind === 'author' ? { id, n: x?.n || '', k: x?.k || '' } : { id };
    store.setTier(LIST[kind], profile.id, entry, w);
    const sel = kind === 'author' ? `[data-author="${id}"]` : kind === 'theme' ? `[data-btheme="${id}"]` : `[data-bgenre="${id}"]`;
    document.querySelectorAll(sel).forEach((t) => updateTile(t, w));
    return true;
  }
  const sub = e.target.closest('[data-bsub]');
  if (sub) {
    ui.sub = sub.dataset.bsub;
    document.querySelectorAll('.sub-tabs [data-bsub]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.bsub === ui.sub)));
    fillBody();
    return true;
  }
  const act = e.target.closest('[data-btaste]')?.dataset.btaste;
  if (act === 'more') { loadMore(e.target.closest('[data-btaste]')); return true; }
  if (act === 'hint-hide') {
    store.updateProfile(profile.id, { settings: { ...profile.settings, hintDone: { ...(profile.settings?.hintDone || {}), book: true } } });
    body()?.querySelector('[data-hint]')?.remove();
    return true;
  }
  if (act === 'toggle-all') { L.showAll = !L.showAll; snapshotDone(); fillBooks(); return true; }
  if (act === 'search') { runSearch(); return true; }
  return false;
}
