// Seite „Vorschläge“ bei Büchern: Liste mit Begründung, Rückmeldungen, Rückgängig, „Mehr“,
// „Heute Lust auf …“ und „Aus welcher Zeit“.
import * as store from './store.js?v=1.17.0';
import * as books from './books.js?v=1.17.0';
import { esc, toast } from './ui.js?v=1.17.0';
import { THEMES, themeById } from './themes.js?v=1.17.0';
import { MEDIA, stateLabel } from './media.js?v=1.17.0';
import { computeBooks, visibleBooks, hasBookSources, BOOK_ERAS, bookEraById, BOOK_POINTS } from './book-recommend.js?v=1.17.0';
import { coverImg, bookMeta, rememberBooks } from './book-taste.js?v=1.17.0';
import { movieHint } from './book-extra.js?v=1.17.0';

const FEEDBACK = [
  ['want', '+', 'Merken'],
  ['seen', '✓', 'Gelesen'],
  ['liked', '♥', 'Mag ich'],
  ['disliked', '✕', 'Mag ich nicht'],
  ['noInterest', '–', 'Kein Interesse'],
];
const W = MEDIA.book.w;
const BLOCK = BOOK_POINTS.blockSize;
const label = (s) => stateLabel('book', s).replace(/^[^\p{L}]+/u, '');

let profile = null;
let pool = [];
let shown = [];
let page = 1;
let run = 0;
const byId = new Map();
let mood = '';
let era = '';
const calc = () => computeBooks(profile, page, { theme: mood, era });
const box = () => document.getElementById('suggest-list');

function pickers() {
  const withB = THEMES.filter((t) => t.b?.length);
  const favs = (profile.themes || []).map((t) => themeById.get(t.id)).filter((t) => t?.b?.length);
  const rest = withB.filter((t) => !favs.includes(t)).sort((a, b) => a.n.localeCompare(b.n, 'de'));
  const opt = (t) => `<option value="${t.id}" ${t.id === mood ? 'selected' : ''}>${esc(t.n)}</option>`;
  return `
    <label class="mood"><span>Heute Lust auf</span>
      <select id="mood">
        <option value="">alles, was zu mir passt</option>
        ${favs.length ? `<optgroup label="Deine Lieblingsthemen">${favs.map(opt).join('')}</optgroup>` : ''}
        <optgroup label="${favs.length ? 'Weitere Themen' : 'Themen'}">${rest.map(opt).join('')}</optgroup>
      </select>
    </label>
    <label class="mood"><span>Aus welcher Zeit</span>
      <select id="era">
        <option value="">egal</option>
        ${BOOK_ERAS.map((e) => `<option value="${e.id}" ${e.id === era ? 'selected' : ''}>${esc(e.n)}</option>`).join('')}
      </select>
    </label>`;
}

export function render(p) {
  profile = p;
  return `
    <h1>Vorschläge</h1>
    <nav class="modes" aria-label="Besondere Vorschläge">
      <a class="mode" href="#/liebling"><span aria-hidden="true">★</span> ${W.fav}</a>
    </nav>
    ${pickers()}
    <div id="suggest-list" aria-live="polite"><p class="muted center">Suche passende Bücher …</p></div>`;
}

export async function mount(p) {
  profile = p;
  byId.clear();
  const mine = ++run;
  shown = []; page = 1;
  const sel = document.getElementById('mood');
  const selEra = document.getElementById('era');
  if (sel && selEra) sel.onchange = selEra.onchange = () => {
    mood = sel.value;
    era = selEra.value;
    box().innerHTML = '<p class="muted center">Suche passende Bücher …</p>';
    mount(profile);
  };
  if (!hasBookSources(p) && !mood && !era) {
    box().innerHTML = `
      <div class="card placeholder">
        <p><strong>Noch keine Vorschläge – die App kennt deinen Lesegeschmack noch nicht.</strong></p>
        <p class="muted">Markiere unter „Geschmack“ ein paar Bücher mit „Mag ich“, wähle Lieblingsautor·innen oder scanne dein Bücherregal. Gemochte Filme und Serien zählen auch.</p>
        <p><a class="btn btn-primary btn-big" href="#/geschmack">Zum Geschmack</a></p>
      </div>`;
    return;
  }
  try {
    pool = await calc();
  } catch (err) {
    if (mine === run && box()) box().innerHTML = errorBox(err.message);
    return;
  }
  if (mine !== run || !box()) return;
  pool.forEach((x) => byId.set(x.book.id, x));
  rememberBooks(pool.map((x) => x.book));
  const first = visibleBooks(profile, pool).slice(0, BLOCK);
  shown = first.map((x) => x.book.id);
  if (!first.length) {
    box().innerHTML = `<div class="card placeholder"><p><strong>Gerade keine neuen Vorschläge.</strong></p>
      <p class="muted">Markiere unter „Geschmack“ weitere Bücher oder Autor·innen – dann kommen neue dazu.</p></div>`;
    return;
  }
  const head = mood || era
    ? `${[mood && `Thema „${esc(themeById.get(mood).n)}“`, era && esc(bookEraById.get(era).n)].filter(Boolean).join(', ')} – sortiert nach deinem Geschmack.`
    : 'Passend zu dem, was du magst – auch zu deinen Filmen und Serien.';
  box().innerHTML = `
    <p class="muted small">${head} Tipp aufs Cover = ★ ${W.fav}.</p>
    <div class="suggestions">${first.map(card).join('')}</div>
    <div class="row center-row"><button class="btn btn-primary" type="button" data-bsg="more">Mehr Vorschläge</button></div>`;
}

const errorBox = (msg) => `<div class="card center"><p>${esc(msg)}</p><button class="btn" type="button" data-bsg="retry">Nochmal versuchen</button></div>`;

function card(x) {
  const b = x.book;
  const rating = b.rating ? `Bewertung ${b.rating.toFixed(1).replace('.', ',')} von 5 · ` : '';
  return `
    <article class="film sg book" data-sgbook="${esc(b.id)}">
      <button type="button" class="poster-btn" data-bfb="loved" aria-label="${esc(b.title)} als ${W.fav}">
        ${coverImg(b.cover)}
        <span class="poster-star" aria-hidden="true">☆</span>
      </button>
      <div class="film-info">
        <h3 class="film-title">${esc(b.title)}</h3>
        <p class="book-meta muted small">${esc(bookMeta(b))}</p>
        <p class="reason">${esc(x.text)}</p>
        <p class="rating muted small">${rating}${(b.r || 0).toLocaleString('de-DE')} Leser·innen bei Open Library</p>
        <div class="film-extra"><details class="overview" data-bdesc="${esc(b.id)}"><summary>Worum geht's?</summary><p class="muted">Lädt …</p></details></div>
        ${movieHint(b.id, b.title, b.a)}
        <div class="marks marks-5" role="group" aria-label="Rückmeldung zu ${esc(b.title)}">
          ${FEEDBACK.map(([key, icon, text]) => `<button type="button" class="mark mark-${key}" data-bfb="${key}"><span aria-hidden="true">${icon}</span> ${text}</button>`).join('')}
        </div>
      </div>
    </article>`;
}

function nextFromPool(n) {
  const taken = new Set(shown);
  return visibleBooks(profile, pool).filter((x) => !taken.has(x.book.id)).slice(0, n);
}

function append(items) {
  const list = box()?.querySelector('.suggestions');
  if (!list || !items.length) return;
  items.forEach((x) => shown.push(x.book.id));
  list.insertAdjacentHTML('beforeend', items.map(card).join(''));
}

async function refreshPool() {
  try {
    const fresh = await calc();
    fresh.forEach((x) => byId.set(x.book.id, x));
    rememberBooks(fresh.map((x) => x.book));
    pool = fresh;
  } catch { /* alte Liste bleibt */ }
}

async function feedback(cardEl, status) {
  const id = cardEl.dataset.sgbook;
  const x = byId.get(id);
  if (!x) return;
  const b = x.book;
  const old = store.setMark(profile.id, 'book', id, status, books.markMeta(b));
  cardEl.hidden = true;
  toast(`${label(status)}: ${b.title}`, {
    label: 'Rückgängig',
    run: () => { store.restoreMark(profile.id, 'book', id, old); cardEl.hidden = false; },
  });
  await refreshPool();
  append(nextFromPool(1));
}

async function more(btn) {
  btn.disabled = true;
  btn.textContent = 'Lädt …';
  let items = nextFromPool(BLOCK);
  if (items.length < BLOCK && page < 5) {
    page++;
    await refreshPool();
    items = nextFromPool(BLOCK);
  }
  append(items);
  btn.disabled = false;
  btn.textContent = 'Mehr Vorschläge';
  if (!items.length) { btn.hidden = true; toast('Mehr Vorschläge gibt es gerade nicht. Markiere weitere Bücher!'); }
}

export function handleClick(e) {
  const fb = e.target.closest('[data-bfb]');
  if (fb) { feedback(fb.closest('[data-sgbook]'), fb.dataset.bfb); return true; }
  const act = e.target.closest('[data-bsg]');
  if (act?.dataset.bsg === 'more') { more(act); return true; }
  if (act?.dataset.bsg === 'retry') { mount(profile); return true; }
  return false;
}

export const currentBookIds = () => new Set(shown);
