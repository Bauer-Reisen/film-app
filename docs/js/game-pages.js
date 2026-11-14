// Spiele-Bereich: Seiten-Tabelle (wie BOOK_PAGES), gemeinsame Klicks (Trailer, „Mehr dazu“),
// Brücke „🎮 Das Spiel dazu“ auf Film-, Serien- und Buchkarten.
// Wird von app.js erst geladen, wenn Spiele eingeschaltet sind (loadGames).
import * as games from './games.js?v=1.28.1';
import * as taste from './game-taste.js?v=1.28.1';
import * as suggest from './game-suggest.js?v=1.28.1';
import * as list from './game-list.js?v=1.28.1';
import { WORLDS } from './seeds-games.js?v=1.28.1';
import { showVideo } from './trailer.js?v=1.28.1';
import { esc, toast } from './ui.js?v=1.28.1';

export const setupDialog = taste.setupDialog;
export const openSearch = taste.openSearch;

// Gemeinsame Klicks auf allen Spiele-Seiten
async function common(e) {
  const t = e.target.closest('[data-gtrailer]');
  if (t) {
    try {
      const key = await games.trailerKey(t.dataset.gtrailer);
      if (key) showVideo(key, t.dataset.title || ''); else toast(`Zu „${t.dataset.title}“ gibt es leider keinen Trailer.`);
    } catch (err) { toast(err.message); }
    return true;
  }
  return false;
}
// „Mehr dazu“ aufgeklappt: Inhaltsangabe (meist Englisch) nachladen
document.addEventListener('toggle', async (e) => {
  const el = e.target.querySelector?.('[data-gsummary]:not([data-done])');
  if (!e.target.open || !el) return;
  el.dataset.done = '1';
  try {
    const d = await games.details(el.dataset.gsummary);
    const dev = (d?.involved_companies || []).filter((c) => c.developer).map((c) => c.company?.name).filter(Boolean).slice(0, 2).join(', ');
    el.innerHTML = `${d?.summary ? esc(d.summary) : 'Keine Beschreibung vorhanden.'}${dev ? `<br><span class="small">Studio: ${esc(dev)}</span>` : ''}`;
    el.lang = 'en';
  } catch { el.textContent = 'Beschreibung gerade nicht erreichbar.'; }
}, true);

const later = (title) => ({
  title,
  render: () => `<p class="back"><a href="#/vorschlaege">← Vorschläge</a></p><h1>${title}</h1>
    <div class="card placeholder"><p><strong>Bei Spielen kommt das später.</strong></p>
    <p class="muted">Die Spiele sind noch eine Testversion: Geschmack, Vorschläge und Merkliste gibt es schon.</p></div>`,
  mount: null,
  click: () => false,
});
const wrap = (click) => (e) => { if (e.target.closest('[data-gtrailer]')) { common(e); return true; } return click(e); };

export function pages(current, view) {
  return {
    vorschlaege: { render: () => suggest.render(current()), mount: () => suggest.mount(current()), click: wrap((e) => suggest.handleClick(e, setupDialog)) },
    geschmack: { render: () => taste.render(current()), mount: () => taste.mount(current(), view), click: wrap(taste.handleClick) },
    merkliste: { render: () => list.render(current()), mount: () => list.mount(current()), click: wrap(list.handleClick) },
    ueberrasch: later('Überrasch mich'),
    liebling: later('Lieblingsspiel'),
    gruppe: later('Gruppenabend'),
    kinder: later('Kinderspiele'),
  };
}

// ---------- Brücke: auf Film-, Serien- und Buchkarten „🎮 Das Spiel dazu“ ----------
const index = new Map(); // 'movie:120' → Welt
for (const w of WORLDS) {
  w.movie.forEach((id) => index.set(`movie:${id}`, w));
  w.tv.forEach((id) => index.set(`tv:${id}`, w));
  w.books.forEach((id) => index.set(`book:${id}`, w));
}
const SEL = '[data-sgfilm], [data-wfilm], [data-sgbook], [data-wbook]';
export function decorate(root, media) {
  for (const card of root.querySelectorAll(SEL)) {
    if (card.dataset.gb) continue;
    card.dataset.gb = '1';
    const id = card.dataset.sgfilm || card.dataset.wfilm || card.dataset.sgbook || card.dataset.wbook;
    const md = card.dataset.sgbook || card.dataset.wbook ? 'book' : media;
    const w = index.get(`${md}:${id}`);
    if (!w) continue;
    const links = w.games.slice(0, 3).map((g) => `<a href="#/geschmack" data-gamebridge="${esc(g.n)}">${esc(g.n)}</a>`).join(', ');
    const html = `<p class="small game-bridge">🎮 ${w.games.length > 1 ? 'Die Spiele dazu' : 'Das Spiel dazu'}: ${links}</p>`;
    const more = card.querySelector('.more-body');
    if (more) more.insertAdjacentHTML('beforeend', html);
    else card.querySelector('.film-info')?.insertAdjacentHTML('beforeend', html);
  }
}
