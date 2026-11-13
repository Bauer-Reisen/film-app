// Seite „Lieblingsbuch“: eins deiner ★-Bücher zum Wiederlesen.
// Bevorzugt Bücher, die hier am längsten nicht mehr kamen. Funktioniert auch ohne Netz (gespeicherte Angaben).
import * as store from './store.js?v=1.21.0';
import * as books from './books.js?v=1.21.0';
import { esc, toast } from './ui.js?v=1.21.0';
import { MEDIA } from './media.js?v=1.21.0';
import { coverImg, bookMeta } from './book-taste.js?v=1.21.0';
import { movieHint } from './book-extra.js?v=1.21.0';

const W = MEDIA.book.w;
let profile = null;
let cur = null; // { profileId, book, onlyLiked }
let skipped = new Set();
let run = 0;
const box = () => document.getElementById('rewatch');
const pool = (status) => Object.entries(profile.books || {}).filter(([, m]) => m.s === status).map(([id]) => id);

function pick() {
  let ids = pool('loved');
  let onlyLiked = false;
  if (!ids.length) { ids = pool('liked'); onlyLiked = true; }
  const last = profile.rewatchShownBook || {};
  const fresh = ids.filter((id) => !skipped.has(id));
  const list = (fresh.length ? fresh : ids).map((id) => ({ id, t: last[id] || 0, r: Math.random() })).sort((a, b) => a.t - b.t || a.r - b.r);
  const top = list.slice(0, Math.max(1, Math.ceil(list.length / 3)));
  const choice = top[Math.floor(Math.random() * top.length)];
  return choice ? { id: choice.id, onlyLiked } : null;
}

export function render(p) {
  profile = p;
  if (cur && cur.profileId !== p.id) { cur = null; skipped = new Set(); }
  return `
    <p class="back"><a href="#/vorschlaege">← Vorschläge</a></p>
    <h1>${W.fav}</h1>
    <p class="muted small">Lust, ein Buch noch einmal zu lesen, das du liebst? Hier kommt eins deiner ★-Bücher.</p>
    <div id="rewatch" aria-live="polite"></div>`;
}

export async function mount(p) {
  profile = p;
  if (cur) { paint(); return; }
  await next();
}

async function next() {
  const mine = ++run;
  const choice = pick();
  if (!choice) {
    box().innerHTML = `<div class="card placeholder"><p><strong>Du hast noch keine ${W.favs}.</strong></p>
      <p class="muted">Tipp unter „Geschmack“ oder bei den Vorschlägen aufs Cover – dann wird das Buch zum ★ ${W.fav}.</p>
      <p><a class="btn btn-primary" href="#/geschmack">Zum Geschmack</a></p></div>`;
    return;
  }
  const m = profile.books[choice.id];
  // Erst mit den gespeicherten Angaben zeigen, dann (wenn online) ergänzen
  const saved = { id: choice.id, title: m.n || 'Buch', a: m.a, ak: m.ak, y: m.y, pg: m.pg, cover: m.c };
  skipped.add(choice.id);
  store.updateProfile(profile.id, { rewatchShownBook: { ...(profile.rewatchShownBook || {}), [choice.id]: Date.now() } });
  profile = store.getProfile(profile.id);
  cur = { profileId: profile.id, book: saved, onlyLiked: choice.onlyLiked };
  paint();
  const fresh = await books.byId(choice.id, books.readLang(profile)).catch(() => null);
  if (fresh && mine === run && box() && cur?.book.id === choice.id) { cur.book = { ...saved, ...fresh, cover: fresh.cover || saved.cover }; paint(); }
}

function paint() {
  const b = cur.book;
  const count = pool('loved').length;
  box().innerHTML = `
    ${cur.onlyLiked ? `<p class="muted small">Noch keine ★-${W.favs} – deshalb eins, das du magst.</p>` : ''}
    <article class="group-film book">
      <div class="group-cover">${coverImg(b.cover, `Cover: ${b.title}`)}</div>
      <div class="group-info">
        <h2 class="group-title">${esc(b.title)}</h2>
        <p class="group-meta">${esc(bookMeta(b))}</p>
        <p class="known">${cur.onlyLiked ? '♥ Mag ich' : `★ Eins deiner ${W.favs}`}</p>
        <details class="overview" data-bdesc="${esc(b.id)}"><summary>Worum ging's nochmal?</summary><p class="muted">Lädt …</p></details>
        ${movieHint(b.id, b.title, b.a)}
        <div class="group-actions">
          <button class="btn btn-primary btn-big" type="button" data-brw="read">Das lese ich nochmal</button>
          <button class="btn btn-big" type="button" data-brw="next">Anderes Lieblingsbuch</button>
        </div>
        ${count > 1 ? `<p class="muted small">Du hast ${count} ${W.favs}. Die, die du lange nicht hier hattest, kommen zuerst.</p>` : ''}
      </div>
    </article>`;
}

export function handleClick(e) {
  const act = e.target.closest('[data-brw]')?.dataset.brw;
  if (!act) return false;
  if (act === 'next') { next(); return true; }
  if (act === 'read') { toast(`Viel Spaß mit „${cur.book.title}“!`); cur = null; location.hash = '#/vorschlaege'; return true; }
  return true;
}
