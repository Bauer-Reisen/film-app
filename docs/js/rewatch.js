// Seite „Lieblingsfilm“ bzw. „Lieblingsserie“: einer deiner ★-Titel zum Wiedersehen.
// Bevorzugt Filme, die hier am längsten nicht mehr vorgeschlagen wurden.
import * as store from './store.js?v=1.12.0';
import * as tmdb from './tmdb.js?v=1.12.0';
import { esc, toast } from './ui.js?v=1.12.0';
import { trailerBtn } from './trailer.js?v=1.12.0';
import { MEDIA, mediaOf, marksOf, fieldName, tvLength } from './media.js?v=1.12.0';

let profile = null;
let cur = null;       // { profileId, details }
let skipped = new Set();
let run = 0;
let md = 'movie';
const W = () => MEDIA[md].w;
const shownKey = () => fieldName('rewatchShown', md);

const box = () => document.getElementById('rewatch');
const pool = (status) => Object.entries(marksOf(profile, md)).filter(([, m]) => m.s === status).map(([id]) => Number(id));

// Einen ziehen: aus dem am längsten nicht gezeigten Drittel zufällig
function pick() {
  let ids = pool('loved');
  let onlyLiked = false;
  if (!ids.length) { ids = pool('liked'); onlyLiked = true; }
  const last = profile[shownKey()] || {};
  const fresh = ids.filter((id) => !skipped.has(id));
  const list = (fresh.length ? fresh : ids).map((id) => ({ id, t: last[id] || 0, r: Math.random() })).sort((a, b) => a.t - b.t || a.r - b.r);
  const top = list.slice(0, Math.max(1, Math.ceil(list.length / 3)));
  const choice = top[Math.floor(Math.random() * top.length)];
  return choice ? { id: choice.id, onlyLiked } : null;
}

export function render(p) {
  profile = p;
  md = mediaOf(p);
  if (cur && (cur.profileId !== p.id || cur.media !== md)) { cur = null; skipped = new Set(); }
  return `
    <p class="back"><a href="#/vorschlaege">← Vorschläge</a></p>
    <h1>${W().fav}</h1>
    <p class="muted small">Lust auf ${md === 'tv' ? 'eine Serie, die' : 'einen Film, den'} du liebst? Hier kommt ${md === 'tv' ? 'eine' : 'einer'} deiner ★-${W().many}.</p>
    <div id="rewatch" aria-live="polite"></div>`;
}

export async function mount(p) {
  profile = p;
  md = mediaOf(p);
  if (cur) { paint(); return; }
  await next();
}

async function next() {
  const mine = ++run;
  const choice = pick();
  if (!choice) {
    box().innerHTML = `<div class="card placeholder"><p><strong>Du hast noch keine ${W().favs}.</strong></p>
      <p class="muted">Tipp unter „Geschmack“ oder bei den Vorschlägen aufs Poster – dann wird ${md === 'tv' ? 'die Serie zur' : 'der Film zum'} ★ ${W().fav}.</p>
      <p><a class="btn btn-primary" href="#/geschmack">Zum Geschmack</a></p></div>`;
    return;
  }
  box().innerHTML = `<p class="muted center">Suche ${md === 'tv' ? 'eine' : 'einen'} deiner ${W().favs} …</p>`;
  const mine2 = md;
  let d;
  try { d = await tmdb.get(`${MEDIA[md].path}/${choice.id}`, { language: profile.language }); } catch (err) {
    if (mine === run && box()) box().innerHTML = `<div class="card center"><p>${esc(err.message)}</p><button class="btn" type="button" data-rw="next">Nochmal versuchen</button></div>`;
    return;
  }
  if (mine !== run || !box() || mine2 !== md) return;
  skipped.add(choice.id);
  store.updateProfile(profile.id, { [shownKey()]: { ...(profile[shownKey()] || {}), [choice.id]: Date.now() } });
  profile = store.getProfile(profile.id);
  cur = { profileId: profile.id, media: md, details: d, onlyLiked: choice.onlyLiked };
  paint();
}

function paint() {
  const m = cur.details;
  const y = tmdb.year(m.release_date);
  const genres = (m.genres || []).map((g) => g.name).slice(0, 3).join(', ');
  const count = pool('loved').length;
  box().innerHTML = `
    ${cur.onlyLiked ? `<p class="muted small">Noch keine ★-${W().favs} – deshalb ${md === 'tv' ? 'eine, die' : 'einer, den'} du magst.</p>` : ''}
    <article class="group-film">
      ${m.poster_path ? `<img class="group-poster" src="${tmdb.img(m.poster_path, 'w500')}" srcset="${tmdb.img(m.poster_path, 'w342')} 342w, ${tmdb.img(m.poster_path, 'w500')} 500w, ${tmdb.img(m.poster_path, 'w780')} 780w" sizes="(min-width: 768px) 340px, 90vw" alt="Plakat: ${esc(m.title)}">` : ''}
      <div class="group-info">
        <h2 class="group-title">${esc(m.title)}</h2>
        <p class="group-meta">${esc([genres, y, md === 'tv' ? tvLength(m) : m.runtime ? `${m.runtime} Min.` : null].filter(Boolean).join(' · '))}</p>
        <p class="known">${cur.onlyLiked ? '♥ Mag ich' : `★ ${md === 'tv' ? 'Eine' : 'Einer'} deiner ${W().favs}`}</p>
        ${m.overview ? `<details class="overview"><summary>Worum ging's nochmal?</summary><p>${esc(m.overview)}</p></details>` : ''}
        <p>${trailerBtn(m.id, m.title, false, md)}</p>
        <div class="group-actions">
          <button class="btn btn-primary btn-big" type="button" data-rw="watch">${md === 'tv' ? 'Die schaue ich' : 'Den schaue ich'}</button>
          <button class="btn btn-big" type="button" data-rw="next">${md === 'tv' ? 'Andere Lieblingsserie' : 'Anderer Lieblingsfilm'}</button>
        </div>
        ${count > 1 ? `<p class="muted small">Du hast ${count} ${W().favs}. Die, die du lange nicht hier hattest, kommen zuerst.</p>` : ''}
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
