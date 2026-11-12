// Seite „Überrasch mich“: Vorhang → Aufdecken → Rückmeldung oder anderer Film.
import * as store from './store.js?v=1.6.0';
import * as tmdb from './tmdb.js?v=1.6.0';
import { esc, toast } from './ui.js?v=1.6.0';
import { trailerBtn } from './trailer.js?v=1.6.0';
import { draw, genreName } from './surprise.js?v=1.6.0';
import { currentIds } from './suggest.js?v=1.6.0';

const FEEDBACK = [
  ['want', '+', 'Merken'],
  ['seen', '✓', 'Gesehen'],
  ['liked', '♥', 'Mag ich'],
  ['disliked', '✕', 'Mag ich nicht'],
  ['noInterest', '–', 'Kein Interesse'],
];
const STATE_LABEL = { loved: '★ Lieblingsfilm', want: '+ Gemerkt', seen: '✓ Gesehen', liked: '♥ Mag ich', disliked: '✕ Mag ich nicht', noInterest: 'Kein Interesse' };
const pressed = (s, key) => s === key || (s === 'loved' && key === 'liked');

let profile = null;
let cur = null; // { profileId, movie, genre, revealed }
let busy = false;

const box = () => document.getElementById('sneak');

export function render(p) {
  profile = p;
  if (cur && cur.profileId !== p.id) cur = null;
  return `<h1>Überrasch mich</h1><div id="sneak" aria-live="polite"></div>`;
}

export function mount(p) {
  profile = p;
  paint();
}

function paint() {
  const el = box();
  if (!el) return;
  if (busy) { el.innerHTML = '<div class="curtain"><p class="curtain-text">Vorhang wird vorbereitet …</p></div>'; return; }
  if (!cur) {
    el.innerHTML = `
      <div class="card placeholder">
        <p><strong>Ein richtig guter Film – aber abseits von dem, was du sonst schaust.</strong></p>
        <p class="muted">Er kommt verdeckt wie in der Sneak Preview. Du siehst erst nur Genre, Jahrzehnt und Länge.</p>
        <p><button class="btn btn-primary btn-big" type="button" data-sn="draw">Überrasch mich</button></p>
      </div>`;
    return;
  }
  const m = cur.movie;
  const y = tmdb.year(m.release_date);
  const hint = [genreName(cur.genre, profile.language), y ? `${Math.floor(y / 10) * 10}er` : null, m.runtime ? `${m.runtime} Min.` : null].filter(Boolean).join(' · ');
  if (!cur.revealed) {
    el.innerHTML = `
      <div class="curtain">
        <p class="curtain-label">Heute im Programm</p>
        <p class="curtain-text">${esc(hint)}</p>
        <button class="btn btn-primary btn-big" type="button" data-sn="reveal">Aufdecken</button>
      </div>
      <p class="center"><button class="btn" type="button" data-sn="draw">Anderen Film</button></p>`;
    return;
  }
  const s = profile.movies[m.id]?.s || null;
  const genres = (m.genres || []).map((g) => g.name).join(', ');
  el.innerHTML = `
    <article class="reveal ${s === 'loved' ? 'is-loved' : ''}" data-snfilm="${m.id}">
      <button type="button" class="poster-btn" data-snfb="loved" aria-pressed="${s === 'loved'}" aria-label="${esc(m.title)} als Lieblingsfilm">
        <img class="poster" src="${tmdb.img(m.poster_path, 'w342')}" srcset="${tmdb.img(m.poster_path, 'w342')} 342w, ${tmdb.img(m.poster_path, 'w500')} 500w" sizes="(min-width: 768px) 260px, 60vw" alt="">
        <span class="poster-star" aria-hidden="true">${s === 'loved' ? '★' : '☆'}</span>
      </button>
      <div class="reveal-info">
        <h2 class="reveal-title">${esc(m.title)}${y ? ` <span class="year">${y}</span>` : ''}</h2>
        <p class="muted small">${esc([genres, m.runtime ? `${m.runtime} Min.` : null, m.vote_average ? `TMDB-Note ${m.vote_average.toFixed(1).replace('.', ',')}` : null].filter(Boolean).join(' · '))}</p>
        <p>${m.overview ? esc(m.overview) : '<span class="muted">Keine Inhaltsangabe.</span>'}</p>
        <p>${trailerBtn(m.id, m.title)}</p>
        <p class="film-state">${s ? esc(STATE_LABEL[s]) : ''}</p>
        <div class="marks marks-5" role="group" aria-label="Rückmeldung zu ${esc(m.title)}">
          ${FEEDBACK.map(([key, icon, label]) => `<button type="button" class="mark mark-${key}" data-snfb="${key}" aria-pressed="${pressed(s, key)}"><span aria-hidden="true">${icon}</span> ${label}</button>`).join('')}
        </div>
        <p class="center"><button class="btn btn-primary btn-big" type="button" data-sn="draw">Anderen Film</button></p>
      </div>
    </article>`;
}

async function newFilm() {
  if (busy) return;
  busy = true;
  paint();
  try {
    const res = await draw(profile, currentIds());
    cur = res ? { profileId: profile.id, movie: res.movie, genre: res.genre, revealed: false } : null;
    if (!res) toast('Gerade findet sich nichts Passendes. Versuch es gleich noch mal.');
  } catch (err) {
    toast(err.message);
  } finally {
    busy = false;
  }
  if (box()) paint();
  document.querySelector('[data-sn="reveal"]')?.focus();
}

export function handleClick(e) {
  const act = e.target.closest('[data-sn]')?.dataset.sn;
  if (act === 'draw') { newFilm(); return true; }
  if (act === 'reveal') { cur.revealed = true; paint(); return true; }
  const fb = e.target.closest('[data-snfb]');
  if (fb && cur) {
    const m = cur.movie;
    const key = fb.dataset.snfb;
    const old = profile.movies[m.id]?.s || null;
    const now = key === 'loved' ? (old === 'loved' ? 'liked' : 'loved') : pressed(old, key) ? null : key;
    // Eine Überraschung, die man mag, wird ein ganz normaler gemochter Film
    store.setMovie(profile.id, m.id, now, { g: m.genre_ids || (m.genres || []).map((g) => g.id), l: m.original_language, y: tmdb.year(m.release_date), n: m.title });
    paint();
    return true;
  }
  return false;
}
