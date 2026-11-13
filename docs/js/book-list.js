// Seite „Leseliste“: alle Bücher mit „Merken“ oder „Weiterlesen“ (liegen geblieben), neueste zuerst.
// Titel und Cover in der Lesesprache des Profils.
import * as store from './store.js?v=1.26.0';
import * as books from './books.js?v=1.26.0';
import { esc, toast } from './ui.js?v=1.26.0';
import { stateLabel, amazonBookUrl, shopLink } from './media.js?v=1.26.0';
import { coverImg, bookMetaHtml } from './book-taste.js?v=1.26.0';
import { markButtons, moreBox } from './cards.js?v=1.26.0';
import { movieHint } from './book-extra.js?v=1.26.0';
import { fillSeriesSlots } from './book-series.js?v=1.26.0';

// Zwei große Knöpfe; „Gelesen“ klappt die Bewertung auf
const MAIN = [['known', '✓', 'Gelesen'], ['remove', '–', 'Entfernen']];
const KNOWN = [['liked', '♥', 'Mag ich'], ['seen', '✓', 'Ganz okay'], ['disliked', '✕', 'Mag ich nicht'], ['dropped', '⏹', 'Abgebrochen']];

let profile = null;
let run = 0;
const info = new Map();
const box = () => document.getElementById('watch-list');
const wanted = () => Object.entries(profile.books || {}).filter(([, m]) => m.s === 'want' || m.s === 'paused').sort((a, b) => b[1].t - a[1].t).map(([id, m]) => ({ id, ...m }));

export function render(p) {
  profile = p;
  return `
    <h1>Leseliste</h1>
    <div id="watch-list" aria-live="polite"><p class="muted center">Lädt …</p></div>`;
}

export async function mount(p) {
  profile = p;
  const mine = ++run;
  const list = wanted();
  if (!list.length) {
    box().innerHTML = `<div class="card placeholder">
      <p><strong>Noch nichts auf der Leseliste.</strong></p>
      <p class="muted">Tippe bei einem Buch auf „+ Merken“ – unter „Vorschläge“ oder „Geschmack“. Oder scanne Bücher, die bei dir im Regal stehen, mit „Steht im Regal“.</p>
      <p><a class="btn btn-primary btn-big" href="#/vorschlaege">Zu den Vorschlägen</a></p></div>`;
    return;
  }
  const lang = books.readLang(profile);
  // Angaben vom Markieren sofort zeigen, Titel/Cover in der Lesesprache nachladen
  await Promise.all(list.map(async (m) => {
    let b = null;
    try { b = await books.byId(m.id, lang); } catch { /* ohne Netz: gespeicherte Angaben */ }
    info.set(m.id, { id: m.id, title: b?.title || m.n || 'Unbekanntes Buch', cover: b?.cover || m.c || null, a: b?.a || m.a, y: b?.y || m.y, pg: b?.pg || m.pg, g: m.g, ak: m.ak });
  }));
  if (mine !== run || !box()) return;
  box().innerHTML = `
    <p class="muted small" id="watch-count"></p>
    <div class="suggestions">${list.map(card).join('')}</div>`;
  updateCount();
  fillSeriesSlots(box(), profile, { back: '#/merkliste', earlier: true });
}

function updateCount() {
  const n = wanted().length;
  const el = document.getElementById('watch-count');
  if (el) el.textContent = n ? `${n} ${n === 1 ? 'Buch' : 'Bücher'} auf der Leseliste. Tipp aufs Cover = ★ Lieblingsbuch.` : 'Alles gelesen – die Leseliste ist leer.';
}

function card(m) {
  const x = info.get(m.id);
  return `
    <article class="film sg book" data-wbook="${esc(m.id)}">
      <button type="button" class="poster-btn" data-wbl="loved" aria-label="${esc(x.title)} als Lieblingsbuch">
        ${coverImg(x.cover)}<span class="poster-star" aria-hidden="true">☆</span>
      </button>
      <div class="film-info">
        <h3 class="film-title">${esc(x.title)}</h3>
        <p class="book-meta muted small">${bookMetaHtml(x)}</p>
        ${m.s === 'paused' ? '<p class="small">⏸ Angefangen – liegt bereit zum Weiterlesen</p>' : ''}
        ${(profile.shelf || []).some((s) => s.id === m.id) ? '<p class="small">📚 Steht bei euch im Regal</p>' : ''}
        <div class="film-extra">${moreBox('<p class="muted">Lädt …</p>', `
          <p class="series-slot small" data-bseries-for="${esc(m.id)}"></p>
          ${movieHint(m.id, x.title, x.a)}
          ${(profile.shelf || []).some((s) => s.id === m.id) ? '' : `<p class="shop-links">${shopLink(esc(amazonBookUrl(x.title, x.a, profile.language)), '🛒 Bei Amazon ansehen')}</p>`}`, m.id)}</div>
        ${markButtons('data-wbl', x.title, MAIN, KNOWN)}
      </div>
    </article>`;
}

export function handleClick(e) {
  const btn = e.target.closest('[data-wbl]');
  if (!btn) return false;
  const cardEl = btn.closest('[data-wbook]');
  const id = cardEl.dataset.wbook;
  const action = btn.dataset.wbl;
  const x = info.get(id);
  const old = store.setMark(profile.id, 'book', id, action === 'remove' ? null : action, books.markMeta(x));
  cardEl.hidden = true;
  updateCount();
  toast(`${action === 'remove' ? 'Entfernt' : stateLabel('book', action).replace(/^[^\p{L}]+/u, '')}: ${x.title}`, {
    label: 'Rückgängig',
    run: () => { store.restoreMark(profile.id, 'book', id, old); cardEl.hidden = false; updateCount(); },
  });
  return true;
}
