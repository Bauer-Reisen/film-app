// „Überrasch mich“ bei Büchern: ein viel gelesenes, gut bewertetes Buch aus einem Genre, das du sonst nicht liest.
// Vorhang (nur Genre, Zeit, Seitenzahl) → Aufdecken → Rückmeldung oder anderes Buch.
import * as store from './store.js?v=1.27.0';
import * as books from './books.js?v=1.27.0';
import { esc, toast } from './ui.js?v=1.27.0';
import { markButtons } from './cards.js?v=1.27.0';
import { SURPRISE } from './config.js?v=1.27.0';
import { BOOK_GENRES, bookGenreById } from './book-genres.js?v=1.27.0';
import { MEDIA, stateLabel, pressed, pressedExact } from './media.js?v=1.27.0';
import { coverImg, bookMetaHtml, nextStatus } from './book-taste.js?v=1.27.0';
import { movieHint } from './book-extra.js?v=1.27.0';
import { currentBookIds } from './book-suggest.js?v=1.27.0';

// Drei große Knöpfe; „Schon gelesen“ klappt die Bewertung auf
const MAIN = [['known', '✓', 'Schon gelesen'], ['want', '+', 'Merken'], ['noInterest', '–', 'Nein danke']];
const KNOWN = [['liked', '♥', 'Mag ich'], ['seen', '✓', 'Ganz okay'], ['disliked', '✕', 'Mag ich nicht']];
const W = MEDIA.book.w;
const MIN_READERS = 150;  // viel gelesen
const MIN_RATING = 3.8;   // gut bewertet (wenn es Bewertungen gibt)
const BUNDLE = books.BUNDLE; // Sammelbände, Boxen, Lernhilfen (gemeinsam in books.js)
const pickRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];

let profile = null;
let cur = null; // { profileId, book, genre, revealed }
let busy = false;
const box = () => document.getElementById('sneak');

// Kern: Genres, die mindestens 15 % der gelesenen Bücher ausmachen
function coreGenres(p) {
  const read = Object.values(p.books || {}).filter((m) => ['seen', 'liked', 'loved'].includes(m.s));
  const out = new Set((p.bookGenres || []).filter((g) => store.tierOf(g) === 2).map((g) => g.id));
  if (read.length < SURPRISE.minProfileFilms) return out;
  const c = {};
  read.forEach((m) => (m.g || []).forEach((g) => { c[g] = (c[g] || 0) + 1; }));
  Object.entries(c).filter(([, n]) => n / read.length >= SURPRISE.coreShare).forEach(([g]) => out.add(g));
  return out;
}

// Fremde Genres, das am längsten nicht gezeigte zuerst (Kinderbücher nur, wenn man welche mag)
function foreignGenres(p) {
  const core = coreGenres(p);
  const kids = Object.values(p.books || {}).some((m) => ['liked', 'loved'].includes(m.s) && (m.g || []).includes('kinder'));
  const all = BOOK_GENRES.map((g) => g.id).filter((g) => g !== 'kinder' || kids);
  const list = all.filter((g) => !core.has(g));
  const last = p.surpriseLastGenreBook || {};
  return (list.length ? list : all).map((g) => ({ g, t: last[g] || 0, r: Math.random() })).sort((a, b) => a.t - b.t || a.r - b.r).map((x) => x.g);
}

export async function drawBook(p) {
  const lang = books.readLang(p);
  const marks = p.books || {};
  const shown = new Set([...(p.surpriseShownBook || []).map((x) => x.id), ...(p.pendingBooks || []).map((x) => x.id)]);
  const exclude = currentBookIds();
  const known = books.knownMatcher(p);
  const ok = (b, strict) => b.cover && !marks[b.id] && !known(b) && !shown.has(b.id) && !exclude.has(b.id) && !BUNDLE.test(b.title)
    && !(lang === 'en' && b.edLang === false)
    && b.r >= (strict ? MIN_READERS : 50) && (!b.rating || b.rating >= (strict ? MIN_RATING : 3.5));
  const genres = foreignGenres(p);
  let found = null; let genre = null;
  for (const [i, g] of genres.slice(0, 4).entries()) {
    const q = bookGenreById.get(g).q.map((s) => `subject_key:${s}`).join(' OR ');
    for (const page of [1 + Math.floor(Math.random() * 3), 1]) {
      const list = await books.search({ q, sort: 'readinglog', page }, lang, 40).catch(() => []);
      const fits = list.filter((b) => ok(b, i < 2));
      if (fits.length) { found = pickRandom(fits.slice(0, 15)); genre = g; break; }
    }
    if (found) break;
  }
  if (!found) return null;
  const now = Date.now();
  store.updateProfile(p.id, {
    surpriseShownBook: [...(p.surpriseShownBook || []), { id: found.id, t: now }].slice(-500),
    surpriseLastGenreBook: { ...(p.surpriseLastGenreBook || {}), [genre]: now },
  });
  return { book: found, genre };
}

export function render(p) {
  profile = p;
  if (cur && cur.profileId !== p.id) cur = null;
  return `<h1>Überrasch mich</h1><div id="sneak" aria-live="polite"></div>`;
}

export function mount(p) { profile = p; paint(); }

function paint() {
  const el = box();
  if (!el) return;
  if (busy) { el.innerHTML = '<div class="curtain"><p class="curtain-text">Vorhang wird vorbereitet …</p></div>'; return; }
  if (!cur) {
    el.innerHTML = `
      <div class="card placeholder">
        <p><strong>Ein viel gelesenes, gut bewertetes Buch – aber abseits von dem, was du sonst liest.</strong></p>
        <p class="muted">Es kommt verdeckt. Du siehst erst nur Genre, Zeit und Seitenzahl.</p>
        <p><button class="btn btn-primary btn-big" type="button" data-bsn="draw">Überrasch mich</button></p>
      </div>`;
    return;
  }
  const b = cur.book;
  const decade = b.y ? (b.y < 1900 ? 'vor 1900' : `${Math.floor(b.y / 10) * 10}er`) : null;
  const hint = [bookGenreById.get(cur.genre)?.n, decade, books.pagesText(b.pg)].filter(Boolean).join(' · ');
  if (!cur.revealed) {
    el.innerHTML = `
      <div class="curtain">
        <p class="curtain-label">Heute im Regal</p>
        <p class="curtain-text">${esc(hint)}</p>
        <button class="btn btn-primary btn-big" type="button" data-bsn="reveal">Aufdecken</button>
      </div>
      <p class="center"><button class="btn" type="button" data-bsn="draw">Anderes Buch</button></p>`;
    return;
  }
  const s = (profile.books || {})[b.id]?.s || null;
  el.innerHTML = `
    <article class="reveal book ${s === 'loved' ? 'is-loved' : ''}">
      <button type="button" class="poster-btn" data-bsnfb="loved" aria-pressed="${s === 'loved'}" aria-label="${esc(b.title)} als ${W.fav}">
        ${coverImg(b.cover)}
        <span class="poster-star" aria-hidden="true">${s === 'loved' ? '★' : '☆'}</span>
      </button>
      <div class="reveal-info">
        <h2 class="reveal-title">${esc(b.title)}</h2>
        <p class="muted small">${bookMetaHtml(b, b.rating ? [`Bewertung ${b.rating.toFixed(1).replace('.', ',')} von 5`] : [])}</p>
        <details class="overview" data-bdesc="${esc(b.id)}" open><summary>Worum geht's?</summary><p class="muted">Lädt …</p></details>
        ${movieHint(b.id, b.title, b.a)}
        <p class="film-state">${s ? esc(stateLabel('book', s)) : ''}</p>
        ${markButtons('data-bsnfb', b.title, MAIN, KNOWN, { s, pressed: pressedExact })}
        <p class="center"><button class="btn btn-primary btn-big" type="button" data-bsn="draw">Anderes Buch</button></p>
      </div>
    </article>`;
  // Die Beschreibung lädt beim Aufklappen – hier ist sie schon offen
  el.querySelector('details[data-bdesc]')?.dispatchEvent(new Event('toggle'));
}

async function newBook() {
  if (busy) return;
  busy = true;
  paint();
  try {
    const res = await drawBook(profile);
    profile = store.getProfile(profile.id);
    cur = res ? { profileId: profile.id, book: res.book, genre: res.genre, revealed: false } : null;
    if (!res) toast('Gerade findet sich nichts Passendes. Versuch es gleich noch mal.');
  } catch (err) {
    toast(err.message);
  } finally {
    busy = false;
  }
  if (box()) paint();
  document.querySelector('[data-bsn="reveal"]')?.focus();
}

export function handleClick(e) {
  const act = e.target.closest('[data-bsn]')?.dataset.bsn;
  if (act === 'draw') { newBook(); return true; }
  if (act === 'reveal' && cur) { cur.revealed = true; paint(); return true; }
  const fb = e.target.closest('[data-bsnfb]');
  if (fb && cur) {
    const b = cur.book;
    const old = (profile.books || {})[b.id]?.s || null;
    store.setMark(profile.id, 'book', b.id, nextStatus(old, fb.dataset.bsnfb), books.markMeta(b));
    profile = store.getProfile(profile.id);
    paint();
    return true;
  }
  return false;
}
