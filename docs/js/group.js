// Seite „Gruppenabend“: ein Film, der zu dir passt und in eine Runde passt.
// Jedes Handy rechnet für sich – man zeigt sich die Vorschläge und stimmt ab.
import { GROUP as G } from './config.js?v=1.3.2';
import * as store from './store.js?v=1.3.2';
import * as tmdb from './tmdb.js?v=1.3.2';
import { esc, toast } from './ui.js?v=1.3.2';
import { trailerBtn } from './trailer.js?v=1.3.2';
import { compute, hasSources, genreTilt } from './recommend.js?v=1.3.2';
import { ageOk, discoverAge } from './age.js?v=1.3.2';

const COMEDY = 35;
const LIKED = new Set(['liked', 'loved']);
const AGES = [[0, 'egal'], [12, 'ab 12'], [16, 'ab 16']];

let profile = null;
let list = [];          // Kandidaten, sortiert
let pos = 0;            // wo wir in der Liste stehen
let cur = null;         // { item, details }
let skipped = new Set(); // heute Abend übersprungen
let skippedFor = null;
let phase = 'pick';     // 'pick' | 'watching'
let run = 0;

const box = () => document.getElementById('group');
const opts = () => ({ horror: false, war: false, age: 0, ...(profile.settings || {}).group });
function setOpts(change) {
  const settings = { ...(profile.settings || {}), group: { ...opts(), ...change } };
  store.updateProfile(profile.id, { settings });
  profile = store.getProfile(profile.id);
}

// ---------- Gruppen-Regeln ----------
function genresOk(genres) {
  const o = opts();
  const easy = new Set(G.easyGenres);
  if (o.horror) easy.add(G.optionalGenres.horror);
  if (o.war) easy.add(G.optionalGenres.krieg);
  if (!genres.some((g) => easy.has(g))) return false;
  if (!o.horror && genres.includes(G.optionalGenres.horror)) return false;
  if (!o.war && genres.includes(G.optionalGenres.krieg)) return false;
  if (G.onlyWithComedy.some((g) => genres.includes(g)) && !genres.includes(COMEDY)) return false;
  return true;
}
const popular = (m) => (m.vote_average || 0) >= G.minVote && (m.vote_count || 0) >= G.minVotes;
const bonus = (genres) => Object.entries(G.bonus).reduce((sum, [g, b]) => sum + (genres.includes(Number(g)) ? b : 0), 0);
// Ausgeschlossen: Mag ich nicht, Kein Interesse, Gesehen ohne Mag ich
const allowed = (id) => { const s = profile.movies[id]?.s; return !s || s === 'want' || LIKED.has(s); };

// ---------- Kandidaten sammeln ----------
async function candidates() {
  const lang = profile.language;
  const o = opts();
  const today = new Date().toISOString().slice(0, 10);
  const tilt = genreTilt(profile);
  const out = new Map();
  const put = (m, score, why, known, source = 'pop') => {
    const g = m.genre_ids || (m.genres || []).map((x) => x.id);
    if (m.adult || !m.poster_path || !m.release_date || m.release_date > today) return;
    if (!genresOk(g) || !popular(m) || !allowed(m.id)) return;
    const prev = out.get(m.id);
    const s = score + bonus(g);
    if (!prev || prev.score < s) out.set(m.id, { movie: m, score: s, why, known, source });
  };

  // 1. die normalen Vorschläge
  const jobs = [];
  if (hasSources(profile)) {
    jobs.push(compute(profile, 1).then((recs) => recs.forEach((r) => put(r.movie, r.score, r.text, false, r.source))).catch(() => {}));
  }
  // 2. beliebte Filme mit lockeren Genres
  const easy = [...G.easyGenres, ...(o.horror ? [G.optionalGenres.horror] : []), ...(o.war ? [G.optionalGenres.krieg] : [])];
  for (let page = 1; page <= 3; page++) {
    jobs.push(tmdb.get('discover/movie', {
      language: lang, sort_by: 'vote_count.desc', with_genres: easy.join('|'), without_genres: 10770,
      'vote_average.gte': G.minVote, 'vote_count.gte': G.minVotes, 'with_runtime.lte': G.maxRuntime, page, ...discoverAge(o.age),
    }).then((d) => (d.results || []).forEach((m) => put(m, tilt(m.genre_ids) + (m.vote_average - 6.5), 'Beliebt in Runden', false))).catch(() => {}));
  }
  await Promise.all(jobs);

  // 3. Filme, die du schon gesehen und gemocht hast (ohne Abfrage: Liste aus dem Profil)
  const known = Object.entries(profile.movies).filter(([, m]) => LIKED.has(m.s)).sort((a, b) => (b[1].s === 'loved') - (a[1].s === 'loved') || b[1].t - a[1].t).slice(0, 40);

  const fresh = [...out.values()].filter((x) => !LIKED.has(profile.movies[x.movie.id]?.s));
  fresh.sort((a, b) => b.score - a.score || (b.movie.vote_count || 0) - (a.movie.vote_count || 0));
  // Abwechslung: jeder weitere Film aus derselben Quelle verliert etwas
  const seenSrc = {};
  const mixed = [];
  let rest = fresh;
  while (rest.length) {
    let best = 0;
    rest.forEach((x, i) => { if (x.score - (seenSrc[x.source] || 0) * 1.5 > rest[best].score - (seenSrc[rest[best].source] || 0) * 1.5) best = i; });
    const [x] = rest.splice(best, 1);
    seenSrc[x.source] = (seenSrc[x.source] || 0) + 1;
    mixed.push(x);
  }
  // Bekannte kommen hinten dran – sie werden erst beim Zeigen mit Details geprüft
  const knownItems = known.map(([id, m]) => ({ movie: { id: Number(id), title: m.n, genre_ids: m.g }, score: 0, why: '', known: true, needsDetails: true }))
    .filter((x) => !x.movie.genre_ids?.length || genresOk(x.movie.genre_ids));
  return [...mixed, ...knownItems];
}

// Nächsten Film holen, der alle Regeln einhält (Länge und Alter brauchen die Details)
async function nextValid(mine) {
  const o = opts();
  while (pos < list.length) {
    const item = list[pos++];
    const id = item.movie.id;
    if (skipped.has(id) || !allowed(id)) continue;
    if (!item.known && profile.movies[id] && profile.movies[id].s !== 'want') continue;
    let d;
    try { d = await tmdb.get(`movie/${id}`, { language: profile.language, append_to_response: 'release_dates' }); } catch { continue; }
    if (mine !== run) return null;
    const g = (d.genres || []).map((x) => x.id);
    if (!d.poster_path || !d.runtime || d.runtime > G.maxRuntime) continue;
    if (!genresOk(g) || !popular(d) || !ageOk(d, o.age || null)) continue;
    return { item, details: d };
  }
  return null;
}

// ---------- Anzeige ----------
export function render(p) {
  profile = p;
  if (skippedFor !== p.id) { skipped = new Set(); skippedFor = p.id; cur = null; phase = 'pick'; }
  return `
    <p class="back"><a href="#/vorschlaege">← Vorschläge</a></p>
    <h1>Gruppenabend</h1>
    <p class="muted small">Jeder tippt auf dem eigenen Handy hier – dann zeigt ihr euch die Vorschläge und stimmt ab.</p>
    <div id="group-opts"></div>
    <div id="group" aria-live="polite"></div>`;
}

function paintOpts() {
  const el = document.getElementById('group-opts');
  if (!el) return;
  const o = opts();
  el.innerHTML = `
    <div class="group-opts">
      <div class="segmented" role="group" aria-label="Altersfreigabe">
        ${AGES.map(([a, label]) => `<button type="button" class="seg" data-gr-age="${a}" aria-pressed="${o.age === a}">${a ? label : 'Alter: egal'}</button>`).join('')}
      </div>
      <div class="row">
        <button type="button" class="btn toggle" data-gr-opt="horror" aria-pressed="${o.horror}">+ Horror</button>
        <button type="button" class="btn toggle" data-gr-opt="war" aria-pressed="${o.war}">+ Krieg</button>
      </div>
    </div>`;
}

export async function mount(p) {
  profile = p;
  paintOpts();
  if (cur) { paint(); return; }
  await start();
}

async function start() {
  const mine = ++run;
  cur = null; phase = 'pick';
  if (box()) box().innerHTML = '<p class="muted center">Suche einen Film für die Runde …</p>';
  list = await candidates();
  if (mine !== run) return;
  pos = 0;
  await next(mine);
}

async function next(mine = ++run) {
  if (box()) box().innerHTML = '<p class="muted center">Suche einen Film für die Runde …</p>';
  cur = await nextValid(mine);
  if (mine !== run) return;
  paint();
}

const firstSentence = (t) => (t || '').match(/^.*?[.!?](\s|$)/)?.[0].trim() || t || '';

function paint() {
  const el = box();
  if (!el) return;
  if (!cur) {
    el.innerHTML = `<div class="card placeholder"><p><strong>Gerade findet sich kein weiterer passender Film.</strong></p>
      <p class="muted">Probier „+ Horror“ oder „+ Krieg“, eine andere Altersgrenze – oder fang von vorn an.</p>
      <p><button class="btn btn-primary" type="button" data-gr="restart">Von vorn</button></p></div>`;
    return;
  }
  const m = cur.details;
  const y = tmdb.year(m.release_date);
  const s = profile.movies[m.id]?.s || null;
  const genres = (m.genres || []).map((g) => g.name).slice(0, 3).join(', ');
  const knownHint = LIKED.has(s) ? '<p class="known">Kennst du schon – hat dir gefallen</p>' : '';
  const why = !LIKED.has(s) && cur.item.why ? `<p class="reason">${esc(cur.item.why)}</p>` : '';
  const actions = phase === 'watching'
    ? `<div class="card hint"><p><strong>Viel Spaß! Wie war's?</strong></p>
        <div class="row"><button class="btn" type="button" data-gr="rate-liked">♥ Mag ich</button>
        <button class="btn" type="button" data-gr="rate-disliked">✕ Mag ich nicht</button>
        <button class="btn" type="button" data-gr="rate-later">Später</button></div></div>`
    : `<div class="group-actions">
        <button class="btn btn-primary btn-big" type="button" data-gr="watch">Den schauen wir</button>
        <button class="btn btn-big" type="button" data-gr="seen">Schon gesehen</button>
        <button class="btn btn-big" type="button" data-gr="other">Anderer Vorschlag</button>
      </div>`;
  el.innerHTML = `
    <article class="group-film" data-grfilm="${m.id}">
      <img class="group-poster" src="${tmdb.img(m.poster_path, 'w500')}" srcset="${tmdb.img(m.poster_path, 'w342')} 342w, ${tmdb.img(m.poster_path, 'w500')} 500w, ${tmdb.img(m.poster_path, 'w780')} 780w" sizes="(min-width: 768px) 340px, 90vw" alt="Plakat: ${esc(m.title)}">
      <div class="group-info">
        <h2 class="group-title">${esc(m.title)}</h2>
        <p class="group-meta">${esc([genres, y, `${m.runtime} Min.`].filter(Boolean).join(' · '))}</p>
        ${knownHint}${why}
        <p>${m.overview ? esc(firstSentence(m.overview)) : ''}</p>
        <p>${trailerBtn(m.id, m.title)}</p>
        ${actions}
      </div>
    </article>`;
}

const meta = (m) => ({ g: (m.genres || []).map((g) => g.id), l: m.original_language, y: tmdb.year(m.release_date), n: m.title });

export function handleClick(e) {
  const age = e.target.closest('[data-gr-age]');
  if (age) { setOpts({ age: Number(age.dataset.grAge) }); paintOpts(); start(); return true; }
  const opt = e.target.closest('[data-gr-opt]');
  if (opt) { const k = opt.dataset.grOpt; setOpts({ [k]: !opts()[k] }); paintOpts(); start(); return true; }
  const act = e.target.closest('[data-gr]')?.dataset.gr;
  if (!act) return false;
  const m = cur?.details;
  if (act === 'restart') { skipped = new Set(); start(); return true; }
  if (!m) return true;
  const s = profile.movies[m.id]?.s || null;
  if (act === 'other') { skipped.add(m.id); next(); return true; }
  if (act === 'seen') {
    skipped.add(m.id);
    // Schon gemocht? Dann bleibt „Mag ich“ – nur für heute übersprungen
    if (!LIKED.has(s)) {
      const old = store.setMovie(profile.id, m.id, 'seen', meta(m));
      toast(`Gesehen: ${m.title}`, { label: 'Rückgängig', run: () => store.restoreMovie(profile.id, m.id, old) });
    }
    next();
    return true;
  }
  if (act === 'watch') {
    if (!s || s === 'want') store.setMovie(profile.id, m.id, 'seen', meta(m));
    phase = 'watching';
    paint();
    return true;
  }
  if (act === 'rate-liked' || act === 'rate-disliked') {
    const status = act === 'rate-liked' ? (s === 'loved' ? 'loved' : 'liked') : 'disliked';
    store.setMovie(profile.id, m.id, status, meta(m));
    toast(status === 'disliked' ? `Mag ich nicht: ${m.title}` : `Mag ich: ${m.title}`);
    phase = 'pick'; skipped.add(m.id); cur = null;
    location.hash = '#/vorschlaege';
    return true;
  }
  if (act === 'rate-later') { phase = 'pick'; skipped.add(m.id); cur = null; location.hash = '#/vorschlaege'; return true; }
  return true;
}
