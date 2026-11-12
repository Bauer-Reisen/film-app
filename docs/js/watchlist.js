// Seite „Merkliste“: alle Filme mit „Merken“, neueste zuerst.
// Titel und Poster kommen immer in der Profilsprache (Startliste oder TMDB).
import * as store from './store.js?v=1.1.0';
import * as tmdb from './tmdb.js?v=1.1.0';
import { esc, toast } from './ui.js?v=1.1.0';
import { trailerBtn } from './trailer.js?v=1.1.0';
import { SEED_MOVIES } from './seeds.js?v=1.1.0';

const seedById = new Map(SEED_MOVIES.map((m) => [m.id, m]));
const ACTIONS = [
  ['seen', '✓', 'Gesehen'],
  ['liked', '♥', 'Mag ich'],
  ['disliked', '✕', 'Mag ich nicht'],
  ['remove', '–', 'Entfernen'],
];
const LABEL = { seen: 'Gesehen', liked: 'Mag ich', disliked: 'Mag ich nicht', remove: 'Entfernt', loved: '★ Lieblingsfilm' };

let profile = null;
let run = 0;
const info = new Map(); // id → { title, poster, y, runtime, overview, g, l }

const box = () => document.getElementById('watch-list');
const wanted = () => Object.entries(profile.movies).filter(([, m]) => m.s === 'want').sort((a, b) => b[1].t - a[1].t).map(([id, m]) => ({ id: Number(id), ...m }));

export function render(p) {
  profile = p;
  return `
    <h1>Merkliste</h1>
    <div id="watch-list" aria-live="polite"><p class="muted center">Lädt …</p></div>`;
}

export async function mount(p) {
  profile = p;
  const mine = ++run;
  const list = wanted();
  if (!list.length) {
    box().innerHTML = `<div class="card placeholder">
      <p><strong>Noch nichts gemerkt.</strong></p>
      <p class="muted">Tippe bei einem Film auf „+ Merken“ – unter „Vorschläge“ oder „Geschmack“. Dann steht er hier.</p>
      <p><a class="btn btn-primary btn-big" href="#/vorschlaege">Zu den Vorschlägen</a></p></div>`;
    return;
  }
  const lang = profile.language.slice(0, 2);
  await Promise.all(list.map(async (m) => {
    const seed = seedById.get(m.id);
    let d = null;
    try { d = await tmdb.get(`movie/${m.id}`, { language: profile.language }); } catch { /* ohne Details weiter */ }
    info.set(m.id, {
      title: d?.title || seed?.t[lang] || m.n || 'Unbekannter Film',
      poster: d?.poster_path || seed?.p[lang] || null,
      y: tmdb.year(d?.release_date) || m.y,
      runtime: d?.runtime || null,
      overview: d?.overview || '',
      g: m.g, l: m.l,
    });
  }));
  if (mine !== run || !box()) return;
  box().innerHTML = `
    <p class="muted small" id="watch-count"></p>
    <div class="suggestions">${list.map(card).join('')}</div>`;
  updateCount();
}

function updateCount() {
  const n = wanted().length;
  const el = document.getElementById('watch-count');
  if (el) el.textContent = n ? `${n} ${n === 1 ? 'Film' : 'Filme'} gemerkt. Tipp aufs Poster = ★ Lieblingsfilm.` : 'Alles abgehakt – die Merkliste ist leer.';
}

function card(m) {
  const x = info.get(m.id);
  const meta = [x.y, x.runtime ? `${x.runtime} Min.` : null].filter(Boolean).join(' · ');
  const poster = x.poster
    ? `<img class="poster" src="${tmdb.img(x.poster, 'w185')}" srcset="${tmdb.img(x.poster, 'w185')} 185w, ${tmdb.img(x.poster, 'w342')} 342w" sizes="(min-width: 768px) 140px, 100px" width="100" height="150" loading="lazy" decoding="async" alt="">`
    : '<div class="poster noimg" aria-hidden="true">Kein Poster</div>';
  return `
    <article class="film sg" data-wfilm="${m.id}">
      <button type="button" class="poster-btn" data-wl="loved" aria-label="${esc(x.title)} als Lieblingsfilm">
        ${poster}<span class="poster-star" aria-hidden="true">☆</span>
      </button>
      <div class="film-info">
        <h3 class="film-title">${esc(x.title)}</h3>
        <p class="rating muted small">${esc(meta)}</p>
        <div class="film-extra">${x.overview ? `<details class="overview"><summary>Worum geht's?</summary><p>${esc(x.overview)}</p></details>` : ''}${trailerBtn(m.id, x.title)}</div>
        <div class="marks" role="group" aria-label="${esc(x.title)}">
          ${ACTIONS.map(([key, icon, label]) => `<button type="button" class="mark mark-${key}" data-wl="${key}"><span aria-hidden="true">${icon}</span> ${label}</button>`).join('')}
        </div>
      </div>
    </article>`;
}

export function handleClick(e) {
  const btn = e.target.closest('[data-wl]');
  if (!btn) return false;
  const cardEl = btn.closest('[data-wfilm]');
  const id = Number(cardEl.dataset.wfilm);
  const action = btn.dataset.wl;
  const x = info.get(id);
  const old = store.setMovie(profile.id, id, action === 'remove' ? null : action, { g: x.g, l: x.l, y: x.y, n: x.title });
  cardEl.hidden = true;
  updateCount();
  toast(`${LABEL[action]}: ${x.title}`, {
    label: 'Rückgängig',
    run: () => { store.restoreMovie(profile.id, id, old); cardEl.hidden = false; updateCount(); },
  });
  return true;
}
