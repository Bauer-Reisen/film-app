// Seite „Überrasch mich“: Vorhang → Aufdecken → Rückmeldung oder anderer Film.
import * as store from './store.js?v=1.36.0';
import * as tmdb from './tmdb.js?v=1.36.0';
import { esc, toast } from './ui.js?v=1.36.0';
import { markButtons } from './cards.js?v=1.36.0';
import { trailerBtn } from './trailer.js?v=1.36.0';
import { draw, genreName } from './surprise.js?v=1.36.0';
import { currentIds } from './suggest.js?v=1.36.0';
import { MEDIA, mediaOf, marksOf, tvLength, askStarted, stateLabel, STARTED, pressed, pressedExact } from './media.js?v=1.36.0';
import { seenToast } from './via.js?v=1.36.0';
import { creditsSlot, fillCredits } from './credits.js?v=1.36.0';

// Drei große Knöpfe; „Schon gesehen“ klappt die Bewertung auf
const MAIN = [['known', '✓', 'Schon gesehen'], ['want', '+', 'Merken'], ['noInterest', '–', 'Nein danke']];
const KNOWN = [['liked', '♥', 'Mag ich'], ['seen', '✓', 'Ganz okay'], ['disliked', '✕', 'Mag ich nicht']];
const KNOWN_TV = [...KNOWN, ['started', '⏸', 'Angefangen']];

let profile = null;
let cur = null; // { profileId, media, movie, genre, revealed }
let md = 'movie';
let busy = false;
// Höchstlänge für Filme (der große Knopf = egal wie lang)
// Zahl = höchstens so viele Minuten, negativ = mindestens (Lust auf ein langes Epos)
const LIMITS = [[90, 'bis 90 Min.'], [120, 'bis 2 Std.'], [-150, '🎬 Epos (ab 2½ Std.)']];
const limitText = (max) => LIMITS.find((l) => l[0] === max)?.[1] || '';
// Erst: „Nicht zu lang?“ unter dem großen Knopf. Unter dem Vorhang: Länge wechseln (mit „egal“)
const limitRow = (now) => {
  if (md !== 'movie') return '';
  const btn = (n, l) => `<button class="btn btn-small" type="button" data-sn="draw" data-max="${n}"${now === undefined ? '' : ` aria-pressed="${(now || 0) === n}"`}>${l}</button>`;
  const list = now === undefined ? LIMITS : [[0, 'egal'], ...LIMITS];
  return `<div class="sneak-limits" role="group" aria-label="Länge"><span class="muted small">${now === undefined ? 'Wie lang?' : 'Länge:'}</span>${list.map(([n, l]) => btn(n, l)).join('')}</div>`;
};

const box = () => document.getElementById('sneak');

export function render(p) {
  profile = p;
  md = mediaOf(p);
  if (cur && (cur.profileId !== p.id || cur.media !== md)) cur = null;
  return `<h1>Überrasch mich</h1><div id="sneak" aria-live="polite"></div>`;
}

export function mount(p) {
  profile = p;
  md = mediaOf(p);
  paint();
}

function paint() {
  const el = box();
  if (!el) return;
  if (busy) { el.innerHTML = '<div class="curtain"><p class="curtain-text">Vorhang wird vorbereitet …</p></div>'; return; }
  if (!cur) {
    el.innerHTML = `
      <div class="card placeholder">
        <p><strong>${md === 'tv' ? 'Eine richtig gute Serie' : 'Ein richtig guter Film'} – aber abseits von dem, was du sonst schaust.</strong></p>
        <p class="muted">${md === 'tv' ? 'Sie' : 'Er'} kommt verdeckt wie in der Sneak Preview. Du siehst erst nur Genre, Jahrzehnt und Länge.</p>
        <p><button class="btn btn-primary btn-big" type="button" data-sn="draw">Überrasch mich</button></p>
        ${limitRow()}
      </div>`;
    return;
  }
  const m = cur.movie;
  const y = tmdb.year(m.release_date);
  const length = md === 'tv' ? (m.number_of_seasons ? `${m.number_of_seasons} ${m.number_of_seasons === 1 ? 'Staffel' : 'Staffeln'}` : null) : m.runtime ? `${m.runtime} Min.` : null;
  const hint = [genreName(cur.genre, profile.language, md), y ? `${Math.floor(y / 10) * 10}er` : null, length].filter(Boolean).join(' · ');
  if (!cur.revealed) {
    el.innerHTML = `
      <div class="curtain">
        <p class="curtain-label">Heute im Programm</p>
        <p class="curtain-text">${esc(hint)}</p>
        <button class="btn btn-primary btn-big" type="button" data-sn="reveal">Aufdecken</button>
      </div>
      <p class="center"><button class="btn" type="button" data-sn="draw">${other()}</button></p>
      ${limitRow(cur.max)}`;
    return;
  }
  const s = marksOf(profile, md)[m.id]?.s || null;
  const genres = (m.genres || []).map((g) => g.name).join(', ');
  el.innerHTML = `
    <article class="reveal ${s === 'loved' ? 'is-loved' : ''}" data-snfilm="${m.id}">
      <button type="button" class="poster-btn" data-snfb="loved" aria-pressed="${s === 'loved'}" aria-label="${esc(m.title)} als ${MEDIA[md].w.fav}">
        <img class="poster" src="${tmdb.img(m.poster_path, 'w342')}" srcset="${tmdb.img(m.poster_path, 'w342')} 342w, ${tmdb.img(m.poster_path, 'w500')} 500w" sizes="(min-width: 768px) 260px, 60vw" alt="">
        <span class="poster-star" aria-hidden="true">${s === 'loved' ? '★' : '☆'}</span>
      </button>
      <div class="reveal-info">
        <h2 class="reveal-title">${esc(m.title)}${y ? ` <span class="year">${y}</span>` : ''}</h2>
        <p class="muted small">${esc([genres, md === 'tv' ? tvLength(m) : m.runtime ? `${m.runtime} Min.` : null, m.vote_average ? `TMDB-Note ${m.vote_average.toFixed(1).replace('.', ',')}` : null].filter(Boolean).join(' · '))}</p>
        <p>${m.overview ? esc(m.overview) : '<span class="muted">Keine Inhaltsangabe.</span>'}</p>
        ${creditsSlot(m.id, md)}
        <p>${trailerBtn(m.id, m.title, false, md)}</p>
        <p class="film-state">${s ? esc(stateLabel(md, s)) : ''}</p>
        ${markButtons('data-snfb', m.title, MAIN, md === 'tv' ? KNOWN_TV : KNOWN, { s, pressed: pressedExact })}
        <p class="center"><button class="btn btn-primary btn-big" type="button" data-sn="draw">${other()}</button></p>
      </div>
    </article>`;
  fillCredits(el.querySelector('[data-credits-for]')); // hier ist alles offen sichtbar
}

const other = () => (md === 'tv' ? 'Andere Serie' : cur?.max < 0 ? 'Anderes Epos' : `Anderen Film${cur?.max ? ` (${limitText(cur.max)})` : ''}`);

async function newFilm(max = null) {
  if (busy) return;
  busy = true;
  paint();
  try {
    // TMDB nennt in der Liste manchmal eine andere Länge als beim Film selbst – dann noch mal ziehen (10 Min. Spielraum)
    const fits = (r) => !r || !max || !r.movie.runtime || (max > 0 ? r.movie.runtime <= max + 10 : r.movie.runtime >= -max - 10);
    let res = await draw(profile, currentIds(md), md, max);
    for (let i = 0; i < 2 && !fits(res); i++) res = await draw(store.getProfile(profile.id) || profile, currentIds(md), md, max);
    cur = res ? { profileId: profile.id, media: md, movie: res.movie, genre: res.genre, revealed: false, max } : null;
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
  if (act === 'draw') {
    const b = e.target.closest('[data-sn]');
    // „Anderen Film“ behält die gewählte Länge
    newFilm(b.dataset.max ? Number(b.dataset.max) || null : b.closest('#sneak .card') ? null : cur?.max ?? null);
    return true;
  }
  if (act === 'reveal') { cur.revealed = true; paint(); return true; }
  const fb = e.target.closest('[data-snfb]');
  if (fb && cur) { feedback(fb.dataset.snfb); return true; }
  return false;
}

async function feedback(key) {
  const m = cur.movie;
  const mine = cur.media;
  const old = marksOf(profile, mine)[m.id]?.s || null;
  let now;
  if (key === 'loved') now = old === 'loved' ? 'liked' : 'loved';
  else if (pressedExact(old, key)) now = null;
  else if (key === 'started') { now = await askStarted(m.title); if (!now) return; }
  else now = key;
  // Eine Überraschung, die man mag, wird ein ganz normaler gemochter Titel
  store.setMark(profile.id, mine, m.id, now, { g: m.genre_ids || (m.genres || []).map((g) => g.id), l: m.original_language, y: tmdb.year(m.release_date), n: m.title, o: 1 });
  paint();
  if (now) seenToast(`${stateLabel(mine, now).replace(/^[^\p{L}]+/u, '')}: ${m.title}`, null, profile.id, mine, m.id, now);
}
