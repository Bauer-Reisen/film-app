// Seite „Wie fandst du sie?“: Bücher eins nach dem anderen kurz bewerten.
// Kommt direkt nach dem Scannen oder dem Einfügen einer geteilten Liste; auch später über „Geschmack“ erreichbar.
// Offen sind: Bücher auf der Warteliste (pendingBooks, noch gar nicht markiert) und ältere, nur als „Gelesen“ markierte.
import * as store from './store.js?v=1.21.0';
import { esc } from './ui.js?v=1.21.0';
import { MEDIA } from './media.js?v=1.21.0';
import { coverImg, bookMeta, openSub, openSeries } from './book-taste.js?v=1.21.0';
import { seriesOf } from './book-series.js?v=1.21.0';
import { readLang } from './books.js?v=1.21.0';

const W = MEDIA.book.w;
// Zu Ende gelesen → wie war's? Angefangen → abgebrochen oder liegen geblieben?
// Noch gar nicht → nur „im Regal“ (kommt NICHT auf die Leseliste; taucht passend in Vorschlägen mit Regal-Hinweis auf)
const CHOICES = [
  ['loved', '★', 'Liebe ich', 'btn-primary'],
  ['liked', '♥', 'Gut', ''],
  ['disliked', '✕', 'Nicht gut', ''],
  ['keep', '✓', 'Gelesen – weiß nicht mehr', ''],
  ['dropped', '⏹', 'Abgebrochen – passte nicht', ''],
  ['paused', '⏸', 'Liegen geblieben – weiterlesen', ''],
  ['shelf', '📚', 'Noch nicht gelesen', 'wide'],
];

let profile = null;
let queue = null;   // Werk-Nummern in Reihenfolge
let pos = 0;
let answers = [];   // { id, old, choice }

// Warteliste (in Reihenfolge) und nur als „Gelesen“ markierte, noch nie gefragte (neueste zuerst)
export const unrated = (p) => [
  ...(p.pendingBooks || []).map((x) => x.id),
  ...Object.entries(p.books || {}).filter(([, m]) => m.s === 'seen' && !m.r).sort((a, b) => b[1].t - a[1].t).map(([id]) => id),
];
const pendingOf = (id) => (profile.pendingBooks || []).find((x) => x.id === id);
const isOpen = (id) => !!pendingOf(id) || (profile.books?.[id]?.s === 'seen' && !profile.books[id].r);
// Nach „Weiter scannen“: Kamera gleich starten
let autoCamera = false;
export const takeAutoCamera = () => { const a = autoCamera; autoCamera = false; return a; };

// Vom Scannen aus: genau diese Bücher abfragen
export function startRating(ids) { queue = [...ids]; pos = 0; answers = []; }

const box = () => document.getElementById('rate');

export function render(p) {
  profile = p;
  if (!queue) { queue = unrated(p); pos = 0; answers = []; }
  return `
    <p class="back"><a href="#/geschmack">← Geschmack</a></p>
    <h1>Wie fandst du sie?</h1>
    <div id="rate" aria-live="polite"></div>`;
}

export function mount(p) { profile = p; paint(); }
export function leave() { if (pos >= (queue || []).length) queue = null; }

function paint() {
  const el = box();
  if (!el) return;
  // Inzwischen anderswo bewertet? Überspringen
  while (pos < queue.length && !isOpen(queue[pos]) && !answers.some((a) => a.id === queue[pos])) pos++;
  if (pos >= queue.length) { el.innerHTML = summary(); return; }
  const id = queue[pos];
  const m = pendingOf(id) || profile.books[id];
  const b = { title: m.n || 'Buch', a: m.a, y: m.y, pg: m.pg, cover: m.c };
  el.innerHTML = `
    <p class="muted small">Buch ${pos + 1} von ${queue.length} · Ein Tipp, dann kommt das nächste. Du kannst jederzeit aufhören – der Rest wartet unter „Geschmack“ auf dich.</p>
    <article class="rate-card">
      <div class="group-cover">${coverImg(b.cover, `Cover: ${b.title}`)}</div>
      <h2 class="group-title">${esc(b.title)}</h2>
      <p class="group-meta">${esc(bookMeta(b))}</p>
      <p class="small" id="rate-series"></p>
      <details class="overview rate-desc" data-bdesc="${esc(id)}" open><summary>Worum ging's?</summary><p class="muted">Lädt …</p></details>
      <div class="rate-choices" role="group" aria-label="Wie fandst du ${esc(b.title)}?">
        ${CHOICES.map(([k, icon, label, cls]) => `<button type="button" class="btn btn-big ${cls === 'wide' ? 'rate-wide' : cls}" data-rate="${k}"><span aria-hidden="true">${icon}</span> ${label}</button>`).join('')}
      </div>
    </article>
    <p class="row center-row">
      ${pos > 0 ? '<button class="btn" type="button" data-rateact="back">← Voriges Buch</button>' : ''}
      <button class="btn" type="button" data-rateact="stop">Später weitermachen</button>
    </p>`;
  // Inhaltsangabe gleich laden (sie ist schon aufgeklappt)
  el.querySelector('details[data-bdesc]')?.dispatchEvent(new Event('toggle'));
  // Teil einer Reihe? Dann die anderen Bände anbieten
  seriesOf([id], readLang(profile)).then((map) => {
    const ser = map.get(id);
    const slot = document.getElementById('rate-series');
    if (!ser || !slot || queue?.[pos] !== id) return;
    slot.innerHTML = `📚 ${ser.ord && /^\d+$/.test(ser.ord) ? `Band ${ser.ord} der Reihe` : 'Aus der Reihe'} „${esc(ser.n)}“ · <a href="#/geschmack" data-rateseries="${esc(ser.id)}" data-rateseriesname="${esc(ser.n)}">Andere Bände abhaken</a>`;
  });
}

function summary() {
  const counted = answers.filter((a) => !['keep', 'shelf'].includes(a.choice));
  const liked = answers.filter((a) => ['loved', 'liked'].includes(a.choice)).length;
  const shelved = answers.filter((a) => a.choice === 'shelf').length;
  return `
    <div class="card placeholder">
      <p><strong>${answers.length ? `Fertig – danke! ${counted.length} ${counted.length === 1 ? 'Buch' : 'Bücher'} bewertet.` : 'Gerade gibt es nichts zu bewerten.'}</strong></p>
      <p class="muted">${liked ? 'Unter „Geschmack“ → Bücher kommen jetzt zuerst weitere Bücher deiner Autor·innen. Und die Vorschläge kennen deinen Lesegeschmack schon.' : 'Unter „Geschmack“ kannst du weitere Bücher markieren oder dein Regal scannen.'}</p>
      ${shelved ? `<p class="muted">📚 ${shelved} ungelesene${shelved === 1 ? 's Buch steht' : ' Bücher stehen'} jetzt „im Regal“. Auf die Leseliste kommen sie nicht. Passt eins zu deinem Geschmack, taucht es in den Vorschlägen auf – mit dem Hinweis, dass es schon bei euch im Regal steht.</p>` : ''}
      <p><a class="btn btn-primary btn-big" href="#/scannen" data-rateact="scan"><span aria-hidden="true">📷</span> Weiter scannen</a></p>
      <div class="row center-row">
        <a class="btn" href="#/geschmack" data-rateact="more">Mehr von deinen Autor·innen</a>
        <a class="btn" href="#/vorschlaege">Zu den Vorschlägen</a>
      </div>
    </div>`;
}

function answer(choice) {
  const id = queue[pos];
  const old = profile.books[id] ? { ...profile.books[id] } : null;
  const pend = pendingOf(id);
  answers = answers.filter((a) => a.id !== id);
  answers.push({ id, old, pend, choice });
  if (choice === 'shelf') {
    // Noch nicht gelesen, steht aber im Regal: keine Markierung, nur „im Regal“
    store.setShelf(profile.id, pend || { id, ...(old || {}) }, true);
    if (old) store.restoreMark(profile.id, 'book', id, null);
  } else {
    // „Weiß nicht mehr“ = „Gelesen“, wird aber nicht nochmal gefragt
    store.setMark(profile.id, 'book', id, choice === 'keep' ? 'seen' : choice, { ...(pend || {}), r: 1 });
  }
  if (pend) store.removePending(profile.id, id);
  profile = store.getProfile(profile.id);
  pos++;
  paint();
  window.scrollTo({ top: 0 });
}

function back() {
  if (pos === 0) return;
  pos--;
  const a = answers.find((x) => x.id === queue[pos]);
  if (a) {
    store.restoreMark(profile.id, 'book', a.id, a.old);
    if (a.choice === 'shelf') store.setShelf(profile.id, { id: a.id }, false);
    if (a.pend) store.addPending(profile.id, [a.pend]);
    answers = answers.filter((x) => x !== a);
    profile = store.getProfile(profile.id);
  }
  paint();
}

export function handleClick(e) {
  // Lange Inhaltsangabe: Tippen zeigt alles
  const desc = e.target.closest('.rate-desc p');
  if (desc) { desc.classList.toggle('full'); return true; }
  const r = e.target.closest('[data-rate]');
  if (r) { answer(r.dataset.rate); return true; }
  const act = e.target.closest('[data-rateact]')?.dataset.rateact;
  if (act === 'back') { back(); return true; }
  if (act === 'stop') { queue = null; location.hash = '#/geschmack'; return true; }
  if (act === 'scan') { queue = null; autoCamera = true; return false; } // Link führt zur Scan-Seite
  const rs = e.target.closest('[data-rateseries]');
  if (rs) { openSeries(rs.dataset.rateseries, rs.dataset.rateseriesname, '#/bewerten'); return false; } // Link führt zu Geschmack
  if (act === 'more') { queue = null; openSub('buecher'); return false; } // Link führt weiter
  return false;
}
