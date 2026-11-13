// Seite „Merkliste“: alle Filme bzw. Serien mit „Merken“, neueste zuerst.
// Bei Serien steht oben „Weiterschauen“ (angefangen, will ich zu Ende schauen).
// Titel und Poster kommen immer in der Profilsprache (Startliste oder TMDB).
import * as store from './store.js?v=1.25.0';
import * as tmdb from './tmdb.js?v=1.25.0';
import { esc, toast } from './ui.js?v=1.25.0';
import { trailerBtn } from './trailer.js?v=1.25.0';
import { titleText } from './runtime.js?v=1.25.0';
import { SEED_MOVIES } from './seeds.js?v=1.25.0';
import { SEED_SHOWS } from './seeds-tv.js?v=1.25.0';
import { peopleSlot, fillPeopleSlots } from './people.js?v=1.25.0';
import { markButtons, moreBox } from './cards.js?v=1.25.0';
import { MEDIA, mediaOf, marksOf, tvLength, askStarted, stateLabel, justWatchUrl, shopLink } from './media.js?v=1.25.0';

const seedById = { movie: new Map(SEED_MOVIES.map((m) => [m.id, m])), tv: new Map(SEED_SHOWS.map((m) => [m.id, m])) };
// Zwei große Knöpfe; „Gesehen“ klappt die Bewertung auf
const MAIN = [['known', '✓', 'Gesehen'], ['remove', '–', 'Entfernen']];
const KNOWN = [['liked', '♥', 'Mag ich'], ['seen', '✓', 'Ganz okay'], ['disliked', '✕', 'Mag ich nicht']];
const KNOWN_TV = [...KNOWN, ['started', '⏸', 'Angefangen']];

let profile = null;
let run = 0;
const info = new Map(); // 'media:id' → { title, poster, y, length, overview, g, l }

const media = () => mediaOf(profile);
const box = () => document.getElementById('watch-list');
const listOf = (status) => Object.entries(marksOf(profile)).filter(([, m]) => m.s === status).sort((a, b) => b[1].t - a[1].t).map(([id, m]) => ({ id: Number(id), ...m }));

export function render(p) {
  profile = p;
  return `
    <h1>Merkliste</h1>
    <div id="watch-list" aria-live="polite"><p class="muted center">Lädt …</p></div>`;
}

export async function mount(p) {
  profile = p;
  const mine = ++run;
  const md = media();
  const w = MEDIA[md].w;
  const paused = md === 'tv' ? listOf('paused') : [];
  const wanted = listOf('want');
  if (!wanted.length && !paused.length) {
    box().innerHTML = `<div class="card placeholder">
      <p><strong>Noch nichts gemerkt.</strong></p>
      <p class="muted">Tippe bei ${w.ofA} auf „+ Merken“ – unter „Vorschläge“ oder „Geschmack“. Dann steht ${md === 'tv' ? 'sie' : 'er'} hier.${md === 'tv' ? ' Serien mit „Angefangen → Will ich weiterschauen“ stehen ganz oben.' : ''}</p>
      <p><a class="btn btn-primary btn-big" href="#/vorschlaege">Zu den Vorschlägen</a></p></div>`;
    return;
  }
  const lang = profile.language.slice(0, 2);
  await Promise.all([...paused, ...wanted].map(async (m) => {
    const seed = seedById[md].get(m.id);
    let d = null;
    try { d = await tmdb.get(`${MEDIA[md].path}/${m.id}`, { language: profile.language }); } catch { /* ohne Details weiter */ }
    info.set(`${md}:${m.id}`, {
      title: d?.title || seed?.t[lang] || m.n || w.unknown,
      poster: d?.poster_path || seed?.p[lang] || null,
      y: tmdb.year(d?.release_date) || m.y,
      length: md === 'tv' ? tvLength(d) : d?.runtime ? `${d.runtime} Min.` : '',
      overview: d?.overview || '',
      g: m.g, l: m.l,
    });
  }));
  if (mine !== run || !box() || media() !== md) return;
  box().innerHTML = `
    ${paused.length ? `<h2>Weiterschauen</h2><p class="muted small">Angefangen und liegen geblieben – die willst du noch zu Ende schauen.</p>
      <div class="suggestions">${paused.map(card).join('')}</div>${wanted.length ? '<h2>Gemerkt</h2>' : ''}` : ''}
    <p class="muted small" id="watch-count"></p>
    <div class="suggestions">${wanted.map(card).join('')}</div>`;
  updateCount();
  fillPeopleSlots(box());
}

function updateCount() {
  const md = media();
  const n = listOf('want').length;
  const w = MEDIA[md].w;
  const el = document.getElementById('watch-count');
  if (el) el.textContent = n ? `${n} ${n === 1 ? w.one : w.many} gemerkt. Tipp aufs Poster = ★ ${w.fav}.` : 'Alles abgehakt – die Merkliste ist leer.';
}

function card(m) {
  const md = media();
  const x = info.get(`${md}:${m.id}`);
  const meta = [x.y, x.length].filter(Boolean).join(' · ');
  const poster = x.poster
    ? `<img class="poster" src="${tmdb.img(x.poster, 'w185')}" srcset="${tmdb.img(x.poster, 'w185')} 185w, ${tmdb.img(x.poster, 'w342')} 342w" sizes="(min-width: 768px) 140px, 100px" width="100" height="150" loading="lazy" decoding="async" alt="">`
    : '<div class="poster noimg" aria-hidden="true">Kein Poster</div>';
  return `
    <article class="film sg" data-wfilm="${m.id}">
      <button type="button" class="poster-btn" data-wl="loved" aria-label="${esc(x.title)} als ${MEDIA[md].w.fav}">
        ${poster}<span class="poster-star" aria-hidden="true">☆</span>
      </button>
      <div class="film-info">
        <h3 class="film-title">${titleText(x.title, m.id, md) || esc(x.title)}</h3>
        <p class="rating muted small">${esc(meta)}</p>
        <div class="film-extra">${moreBox(x.overview ? `<p>${esc(x.overview)}</p>` : '', `
          ${peopleSlot(m.id, md)}
          <p class="shop-links">${shopLink(esc(justWatchUrl(x.title, profile.language)), '📺 Wo kann ich das schauen?')}</p>`)}${trailerBtn(m.id, x.title, false, md)}</div>
        ${markButtons('data-wl', x.title, MAIN, md === 'tv' ? KNOWN_TV : KNOWN)}
      </div>
    </article>`;
}

export function handleClick(e) {
  const btn = e.target.closest('[data-wl]');
  if (!btn) return false;
  act(btn);
  return true;
}

async function act(btn) {
  const md = media();
  const cardEl = btn.closest('[data-wfilm]');
  const id = Number(cardEl.dataset.wfilm);
  let action = btn.dataset.wl;
  const x = info.get(`${md}:${id}`);
  const before = marksOf(profile)[id]?.s;
  if (action === 'started') {
    action = await askStarted(x.title);
    if (!action || action === before) return;
  }
  const old = store.setMark(profile.id, md, id, action === 'remove' ? null : action, { g: x.g, l: x.l, y: x.y, n: x.title });
  const label = action === 'remove' ? 'Entfernt' : stateLabel(md, action).replace(/^[^\p{L}]+/u, '');
  if (action === 'paused') { mount(profile); } else { cardEl.hidden = true; updateCount(); }
  toast(`${label}: ${x.title}`, {
    label: 'Rückgängig',
    run: () => { store.restoreMark(profile.id, md, id, old); if (action === 'paused') mount(profile); else { cardEl.hidden = false; updateCount(); } },
  });
}
