// Seite „Lieblingsfilm“: einer deiner ★-Filme zum Wiedersehen.
// Bevorzugt Filme, die hier am längsten nicht mehr vorgeschlagen wurden.
import * as store from './store.js?v=1.5.0';
import * as tmdb from './tmdb.js?v=1.5.0';
import { esc, toast } from './ui.js?v=1.5.0';
import { trailerBtn } from './trailer.js?v=1.5.0';

let profile = null;
let cur = null;       // { profileId, details }
let skipped = new Set();
let run = 0;

const box = () => document.getElementById('rewatch');
const pool = (status) => Object.entries(profile.movies).filter(([, m]) => m.s === status).map(([id]) => Number(id));

// Einen ziehen: aus dem am längsten nicht gezeigten Drittel zufällig
function pick() {
  let ids = pool('loved');
  let onlyLiked = false;
  if (!ids.length) { ids = pool('liked'); onlyLiked = true; }
  const last = profile.rewatchShown || {};
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
    <h1>Lieblingsfilm</h1>
    <p class="muted small">Lust auf einen Film, den du liebst? Hier kommt einer deiner ★-Filme.</p>
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
    box().innerHTML = `<div class="card placeholder"><p><strong>Du hast noch keine Lieblingsfilme.</strong></p>
      <p class="muted">Tipp unter „Geschmack“ oder bei den Vorschlägen aufs Poster – dann wird der Film zum ★ Lieblingsfilm.</p>
      <p><a class="btn btn-primary" href="#/geschmack">Zum Geschmack</a></p></div>`;
    return;
  }
  box().innerHTML = '<p class="muted center">Suche einen deiner Lieblingsfilme …</p>';
  let d;
  try { d = await tmdb.get(`movie/${choice.id}`, { language: profile.language }); } catch (err) {
    if (mine === run && box()) box().innerHTML = `<div class="card center"><p>${esc(err.message)}</p><button class="btn" type="button" data-rw="next">Nochmal versuchen</button></div>`;
    return;
  }
  if (mine !== run || !box()) return;
  skipped.add(choice.id);
  store.updateProfile(profile.id, { rewatchShown: { ...(profile.rewatchShown || {}), [choice.id]: Date.now() } });
  profile = store.getProfile(profile.id);
  cur = { profileId: profile.id, details: d, onlyLiked: choice.onlyLiked };
  paint();
}

function paint() {
  const m = cur.details;
  const y = tmdb.year(m.release_date);
  const genres = (m.genres || []).map((g) => g.name).slice(0, 3).join(', ');
  const count = pool('loved').length;
  box().innerHTML = `
    ${cur.onlyLiked ? '<p class="muted small">Noch keine ★-Lieblingsfilme – deshalb einer, den du magst.</p>' : ''}
    <article class="group-film">
      ${m.poster_path ? `<img class="group-poster" src="${tmdb.img(m.poster_path, 'w500')}" srcset="${tmdb.img(m.poster_path, 'w342')} 342w, ${tmdb.img(m.poster_path, 'w500')} 500w, ${tmdb.img(m.poster_path, 'w780')} 780w" sizes="(min-width: 768px) 340px, 90vw" alt="Plakat: ${esc(m.title)}">` : ''}
      <div class="group-info">
        <h2 class="group-title">${esc(m.title)}</h2>
        <p class="group-meta">${esc([genres, y, m.runtime ? `${m.runtime} Min.` : null].filter(Boolean).join(' · '))}</p>
        <p class="known">${cur.onlyLiked ? '♥ Mag ich' : '★ Einer deiner Lieblingsfilme'}</p>
        ${m.overview ? `<details class="overview"><summary>Worum ging's nochmal?</summary><p>${esc(m.overview)}</p></details>` : ''}
        <p>${trailerBtn(m.id, m.title)}</p>
        <div class="group-actions">
          <button class="btn btn-primary btn-big" type="button" data-rw="watch">Den schaue ich</button>
          <button class="btn btn-big" type="button" data-rw="next">Anderer Lieblingsfilm</button>
        </div>
        ${count > 1 ? `<p class="muted small">Du hast ${count} Lieblingsfilme. Die, die du lange nicht hier hattest, kommen zuerst.</p>` : ''}
      </div>
    </article>`;
}

export function handleClick(e) {
  const act = e.target.closest('[data-rw]')?.dataset.rw;
  if (!act) return false;
  if (act === 'next') { next(); return true; }
  if (act === 'watch') { toast(`Viel Spaß mit „${cur.details.title}“!`); cur = null; location.hash = '#/vorschlaege'; return true; }
  return true;
}
