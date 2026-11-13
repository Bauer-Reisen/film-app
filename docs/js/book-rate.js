// Seite „Wie fandst du sie?“: gelesene Bücher eins nach dem anderen kurz bewerten.
// Kommt direkt nach dem Scannen; auch später über „Geschmack“ erreichbar (alle nur als „Gelesen“ markierten).
import * as store from './store.js?v=1.17.1';
import { esc } from './ui.js?v=1.17.1';
import { MEDIA } from './media.js?v=1.17.1';
import { coverImg, bookMeta, openSub } from './book-taste.js?v=1.17.1';

const W = MEDIA.book.w;
// Zu Ende gelesen → wie war's? Angefangen → abgebrochen oder liegen geblieben? Noch gar nicht → Leseliste
const CHOICES = [
  ['loved', '★', 'Liebe ich', 'btn-primary'],
  ['liked', '♥', 'Gut', ''],
  ['disliked', '✕', 'Nicht gut', ''],
  ['keep', '✓', 'Gelesen – weiß nicht mehr', ''],
  ['dropped', '⏹', 'Abgebrochen – passte nicht', ''],
  ['paused', '⏸', 'Liegen geblieben – weiterlesen', ''],
  ['want', '+', 'Noch nicht gelesen – auf die Leseliste', 'wide'],
];

let profile = null;
let queue = null;   // Werk-Nummern in Reihenfolge
let pos = 0;
let answers = [];   // { id, old, choice }

// Nur als „Gelesen“ markiert und noch nie gefragt – neueste zuerst
export const unrated = (p) => Object.entries(p.books || {}).filter(([, m]) => m.s === 'seen' && !m.r).sort((a, b) => b[1].t - a[1].t).map(([id]) => id);

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
  while (pos < queue.length && profile.books?.[queue[pos]]?.s !== 'seen' && !answers.some((a) => a.id === queue[pos])) pos++;
  if (pos >= queue.length) { el.innerHTML = summary(); return; }
  const id = queue[pos];
  const m = profile.books[id];
  const b = { title: m.n || 'Buch', a: m.a, y: m.y, pg: m.pg, cover: m.c };
  el.innerHTML = `
    <p class="muted small">Buch ${pos + 1} von ${queue.length} · Ein Tipp, dann kommt das nächste. Du kannst jederzeit aufhören – der Rest bleibt erst mal „Gelesen“ und lässt sich später unter „Geschmack“ bewerten.</p>
    <article class="rate-card">
      <div class="group-cover">${coverImg(b.cover, `Cover: ${b.title}`)}</div>
      <h2 class="group-title">${esc(b.title)}</h2>
      <p class="group-meta">${esc(bookMeta(b))}</p>
      <div class="rate-choices" role="group" aria-label="Wie fandst du ${esc(b.title)}?">
        ${CHOICES.map(([k, icon, label, cls]) => `<button type="button" class="btn btn-big ${cls === 'wide' ? 'rate-wide' : cls}" data-rate="${k}"><span aria-hidden="true">${icon}</span> ${label}</button>`).join('')}
      </div>
    </article>
    <p class="row center-row">
      ${pos > 0 ? '<button class="btn" type="button" data-rateact="back">← Voriges Buch</button>' : ''}
      <button class="btn" type="button" data-rateact="stop">Später weitermachen</button>
    </p>`;
}

function summary() {
  const counted = answers.filter((a) => a.choice !== 'keep');
  const liked = answers.filter((a) => ['loved', 'liked'].includes(a.choice)).length;
  return `
    <div class="card placeholder">
      <p><strong>${answers.length ? `Fertig – danke! ${counted.length} ${counted.length === 1 ? 'Buch' : 'Bücher'} bewertet.` : 'Gerade gibt es nichts zu bewerten.'}</strong></p>
      <p class="muted">${liked ? 'Unter „Geschmack“ → Bücher kommen jetzt zuerst weitere Bücher deiner Autor·innen. Und die Vorschläge kennen deinen Lesegeschmack schon.' : 'Unter „Geschmack“ kannst du weitere Bücher markieren oder dein Regal scannen.'}</p>
      <div class="row center-row">
        <a class="btn btn-primary btn-big" href="#/geschmack" data-rateact="more">Mehr von deinen Autor·innen</a>
        <a class="btn btn-big" href="#/vorschlaege">Zu den Vorschlägen</a>
      </div>
    </div>`;
}

function answer(choice) {
  const id = queue[pos];
  const old = profile.books[id];
  answers = answers.filter((a) => a.id !== id);
  answers.push({ id, old: { ...old }, choice });
  // „Weiß nicht mehr“ bleibt „Gelesen“, wird aber nicht nochmal gefragt
  store.setMark(profile.id, 'book', id, choice === 'keep' ? 'seen' : choice, { r: 1 });
  profile = store.getProfile(profile.id);
  pos++;
  paint();
  window.scrollTo({ top: 0 });
}

function back() {
  if (pos === 0) return;
  pos--;
  const a = answers.find((x) => x.id === queue[pos]);
  if (a) { store.restoreMark(profile.id, 'book', a.id, a.old); answers = answers.filter((x) => x !== a); profile = store.getProfile(profile.id); }
  paint();
}

export function handleClick(e) {
  const r = e.target.closest('[data-rate]');
  if (r) { answer(r.dataset.rate); return true; }
  const act = e.target.closest('[data-rateact]')?.dataset.rateact;
  if (act === 'back') { back(); return true; }
  if (act === 'stop') { queue = null; location.hash = '#/geschmack'; return true; }
  if (act === 'more') { queue = null; openSub('buecher'); return false; } // Link führt weiter
  return false;
}
