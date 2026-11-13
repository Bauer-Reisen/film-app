// Seite „Vorschläge“: Liste mit Begründung, fünf Rückmeldungen, Rückgängig, „Mehr“.
import * as store from './store.js?v=1.9.0';
import * as tmdb from './tmdb.js?v=1.9.0';
import { esc, toast } from './ui.js?v=1.9.0';
import { runtimeSlot, titleText } from './runtime.js?v=1.9.0';
import { trailerBtn } from './trailer.js?v=1.9.0';
import { compute, computeFiltered, visible, hasSources, erasFor, eraById } from './recommend.js?v=1.9.0';
import { MEDIA, mediaOf, askStarted, stateLabel } from './media.js?v=1.9.0';
import { THEMES, themeById } from './themes.js?v=1.9.0';
import { RECOMMEND } from './config.js?v=1.9.0';

const FEEDBACK = [
  ['want', '+', 'Merken'],
  ['seen', '✓', 'Gesehen'],
  ['liked', '♥', 'Mag ich'],
  ['disliked', '✕', 'Mag ich nicht'],
  ['noInterest', '–', 'Kein Interesse'],
];
const FEEDBACK_TV = [...FEEDBACK.slice(0, 4), ['started', '⏸', 'Angefangen'], FEEDBACK[4]];
const label = (md, s) => stateLabel(md, s).replace(/^[^\p{L}]+/u, '');

let profile = null;
let pool = [];       // alle berechneten Vorschläge (sortiert)
let shown = [];      // ids, die gerade auf der Seite stehen
let page = 1;
let run = 0;
const byId = new Map();
let mood = ''; // „Heute Lust auf …“ – gilt, solange die App offen ist
let era = '';  // „Aus welcher Zeit?“
let md = 'movie'; // Filme oder Serien – wie gerade oben eingestellt
const calc = () => (mood || era ? computeFiltered(profile, { theme: mood, era }, page, md) : compute(profile, page, md));
const W = () => MEDIA[md].w;

function moodPicker() {
  const favs = (profile.themes || []).filter((t) => themeById.has(t.id)).map((t) => themeById.get(t.id));
  const rest = THEMES.filter((t) => !favs.includes(t)).sort((a, b) => a.n.localeCompare(b.n, 'de'));
  const opt = (t) => `<option value="${t.id}" ${t.id === mood ? 'selected' : ''}>${esc(t.n)}</option>`;
  return `
    <label class="mood"><span>Heute Lust auf</span>
      <select id="mood">
        <option value="">alles, was zu mir passt</option>
        ${favs.length ? `<optgroup label="Deine Lieblingsthemen">${favs.map(opt).join('')}</optgroup>` : ''}
        <optgroup label="${favs.length ? 'Weitere Themen' : 'Themen'}">${rest.map(opt).join('')}</optgroup>
      </select>
    </label>
    <label class="mood"><span>Aus welcher Zeit</span>
      <select id="era">
        <option value="">egal</option>
        ${erasFor(md).map((e) => `<option value="${e.id}" ${e.id === era ? 'selected' : ''}>${esc(e.n)}</option>`).join('')}
      </select>
    </label>`;
}

const box = () => document.getElementById('suggest-list');

export function render(p) {
  profile = p;
  md = mediaOf(p);
  if (era && !eraById(md).has(era)) era = '';
  return `
    <h1>Vorschläge</h1>
    <nav class="modes" aria-label="Besondere Vorschläge">
      <a class="mode" href="#/gruppe"><span aria-hidden="true">🍿</span> Gruppenabend</a>
      <a class="mode" href="#/kinder"><span aria-hidden="true">🧸</span> ${W().kids}</a>
      <a class="mode" href="#/liebling"><span aria-hidden="true">★</span> ${W().fav}</a>
    </nav>
    ${moodPicker()}
    <div id="suggest-list" aria-live="polite"><p class="muted center">Suche passende ${W().many} …</p></div>`;
}

export async function mount(p) {
  profile = p;
  md = mediaOf(p);
  byId.clear();
  const mine = ++run;
  shown = []; page = 1;
  const sel = document.getElementById('mood');
  const selEra = document.getElementById('era');
  if (sel && selEra) sel.onchange = selEra.onchange = () => {
    mood = sel.value;
    era = selEra.value;
    box().innerHTML = `<p class="muted center">Suche passende ${W().many} …</p>`;
    mount(profile);
  };
  if (!hasSources(p, md) && !mood && !era) {
    box().innerHTML = `
      <div class="card placeholder">
        <p><strong>Noch keine Vorschläge – die App kennt deinen Geschmack noch nicht.</strong></p>
        <p class="muted">Markiere unter „Geschmack“ ein paar ${W().many} mit „Mag ich“ oder wähle Lieblingspersonen. Schon 3–5 reichen für den Anfang. Gemochte ${md === 'tv' ? 'Filme' : 'Serien'} zählen auch.</p>
        <p><a class="btn btn-primary btn-big" href="#/geschmack">Zum Geschmack</a></p>
      </div>`;
    return;
  }
  try {
    pool = await calc();
  } catch (err) {
    if (mine === run && box()) box().innerHTML = errorBox(err.message);
    return;
  }
  if (mine !== run || !box() || mediaOf(profile) !== md) return; // inzwischen woanders hingetippt
  pool.forEach((x) => byId.set(x.movie.id, x));
  const first = visible(profile, pool, md).slice(0, RECOMMEND.blockSize);
  shown = first.map((x) => x.movie.id);
  if (!first.length) {
    box().innerHTML = `<div class="card placeholder"><p><strong>Gerade keine neuen Vorschläge.</strong></p>
      <p class="muted">Markiere unter „Geschmack“ weitere ${W().many} oder Personen – dann kommen neue dazu.</p></div>`;
    return;
  }
  box().innerHTML = `
    <p class="muted small">${mood || era ? `${[mood && `Thema „${esc(themeById.get(mood).n)}“`, era && esc(eraById(md).get(era).n)].filter(Boolean).join(', ')} – sortiert nach deinem Geschmack.` : 'Passend zu dem, was du magst.'} Tipp aufs Poster = ★ ${W().fav}.</p>
    <div class="suggestions">${first.map(card).join('')}</div>
    <div class="row center-row"><button class="btn btn-primary" type="button" data-sg="more">Mehr Vorschläge</button></div>`;
}

const errorBox = (msg) => `<div class="card center"><p>${esc(msg)}</p><button class="btn" type="button" data-sg="retry">Nochmal versuchen</button></div>`;

function card(x) {
  const m = x.movie;
  const y = tmdb.year(m.release_date);
  const overview = m.overview ? `<details class="overview"><summary>Worum geht's?</summary><p>${esc(m.overview)}</p></details>` : '';
  return `
    <article class="film sg" data-sgfilm="${m.id}">
      <button type="button" class="poster-btn" data-fb="loved" aria-label="${esc(m.title)} als ${W().fav}">
        <img class="poster" src="${tmdb.img(m.poster_path, 'w185')}" srcset="${tmdb.img(m.poster_path, 'w185')} 185w, ${tmdb.img(m.poster_path, 'w342')} 342w"
          sizes="(min-width: 768px) 200px, 100px" width="100" height="150" loading="lazy" decoding="async" alt="">
        <span class="poster-star" aria-hidden="true">☆</span>
      </button>
      <div class="film-info">
        <h3 class="film-title">${titleText(m.title, m.id, md) || esc(m.title)}${y ? ` <span class="year">${y}</span>` : ''}</h3>
        <p class="reason">${esc(x.text)}</p>
        <p class="rating muted small">TMDB-Note ${m.vote_average.toFixed(1).replace('.', ',')}${runtimeSlot(m.id, md)}</p>
        <div class="film-extra">${overview}${trailerBtn(m.id, m.title, false, md)}</div>
        <div class="marks marks-5" role="group" aria-label="Rückmeldung zu ${esc(m.title)}">
          ${(md === 'tv' ? FEEDBACK_TV : FEEDBACK).map(([key, icon, label]) => `<button type="button" class="mark mark-${key}" data-fb="${key}"><span aria-hidden="true">${icon}</span> ${label}</button>`).join('')}
        </div>
      </div>
    </article>`;
}

// Nächsten passenden Vorschlag ans Ende hängen, damit die Liste voll bleibt
function nextFromPool(n) {
  const taken = new Set(shown);
  return visible(profile, pool, md).filter((x) => !taken.has(x.movie.id)).slice(0, n);
}

function append(items) {
  const list = box()?.querySelector('.suggestions');
  if (!list || !items.length) return;
  items.forEach((x) => shown.push(x.movie.id));
  list.insertAdjacentHTML('beforeend', items.map(card).join(''));
}

// Nach jeder Rückmeldung neu rechnen (höchstens eine neue Abfrage, der Rest ist gemerkt)
async function refreshPool() {
  try {
    const fresh = await calc();
    fresh.forEach((x) => byId.set(x.movie.id, x));
    pool = fresh;
  } catch { /* alte Liste bleibt */ }
}

async function feedback(cardEl, status) {
  const id = Number(cardEl.dataset.sgfilm);
  const x = byId.get(id);
  if (!x) return;
  const m = x.movie;
  const mine = md;
  const title = cardEl.querySelector('[data-titlefix]')?.textContent || m.title; // ggf. der englische statt fremder Schrift
  if (status === 'started') { status = await askStarted(title); if (!status) return; }
  const old = store.setMark(profile.id, mine, id, status, { g: m.genre_ids, l: m.original_language, y: tmdb.year(m.release_date), n: title });
  cardEl.hidden = true;
  toast(`${label(mine, status)}: ${title}`, {
    label: 'Rückgängig',
    run: () => { store.restoreMark(profile.id, mine, id, old); cardEl.hidden = false; },
  });
  await refreshPool();
  append(nextFromPool(1));
}

async function more(btn) {
  btn.disabled = true;
  btn.textContent = 'Lädt …';
  let items = nextFromPool(RECOMMEND.blockSize);
  if (items.length < RECOMMEND.blockSize && page < 5) {
    page++;
    await refreshPool();
    items = nextFromPool(RECOMMEND.blockSize);
  }
  append(items);
  btn.disabled = false;
  btn.textContent = 'Mehr Vorschläge';
  if (!items.length) { btn.hidden = true; toast(`Mehr Vorschläge gibt es gerade nicht. Markiere weitere ${W().many}!`); }
}

export function handleClick(e) {
  const fb = e.target.closest('[data-fb]');
  if (fb) { feedback(fb.closest('[data-sgfilm]'), fb.dataset.fb); return true; }
  const act = e.target.closest('[data-sg]');
  if (act?.dataset.sg === 'more') { more(act); return true; }
  if (act?.dataset.sg === 'retry') { mount(profile); return true; }
  return false;
}

// Für „Überrasch mich“: was gerade bei den Vorschlägen steht, soll dort nicht kommen
export const currentIds = (media = 'movie') => (media === md ? new Set(shown) : new Set());
