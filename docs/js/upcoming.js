// Kasten „Demnächst von deinen Lieblingen“ oben bei den Vorschlägen (nur Filme).
// Neue Filme deiner Lieblingspersonen und -studios und neue Teile deiner ★/♥-Filmreihen.
// Erscheint nur, wenn es etwas gibt; höchstens drei Einträge. „Kein Interesse“ = „Nein danke“ (kommt nie wieder).
import * as store from './store.js?v=1.29.1';
import * as tmdb from './tmdb.js?v=1.29.1';
import { esc, toast } from './ui.js?v=1.29.1';
import { trailerBtn } from './trailer.js?v=1.29.1';
import { marksOf, creditsOf } from './media.js?v=1.29.1';
import { UPCOMING as U } from './config.js?v=1.29.1';

const LIKED = new Set(['liked', 'loved']);
let profile = null;
let items = [];
let run = 0;

const iso = (d) => d.toISOString().slice(0, 10);
const box = () => document.getElementById('upcoming');
const fmt = (s) => new Date(`${s}T12:00:00`).toLocaleDateString('de-DE', { day: 'numeric', month: 'numeric', year: 'numeric' });

// Start in Deutschland (Kino, sonst digital), sonst das allgemeine Datum
export function startText(d) {
  const de = (d.release_dates?.results || []).find((r) => r.iso_3166_1 === 'DE')?.release_dates || [];
  const pick = (types) => de.filter((r) => types.includes(r.type) && r.release_date).map((r) => r.release_date.slice(0, 10)).sort()[0];
  const cinema = pick([2, 3]);
  if (cinema) return `Kinostart ${fmt(cinema)}`;
  const digital = pick([4, 5]);
  if (digital) return `Erscheint ${fmt(digital)}`;
  return d.release_date ? `Start ${fmt(d.release_date)}` : 'Termin noch offen';
}
export const isUpcoming = (d) => !!d?.release_date && d.release_date > iso(new Date());

export const upcomingSlot = () => '<section id="upcoming" class="upcoming" hidden aria-label="Demnächst von deinen Lieblingen"></section>';

// Kandidaten sammeln: id → { movie, score, why }
async function collect() {
  const today = new Date();
  const from = iso(new Date(today.getTime() + 86400000));
  const until = iso(new Date(today.getTime() + U.months * 30 * 86400000));
  const lang = profile.language;
  const marks = marksOf(profile, 'movie');
  const cands = new Map();
  const add = (m, score, why) => {
    if (!m.release_date || m.release_date < from || m.release_date > until || marks[m.id] || m.adult) return;
    const c = cands.get(m.id);
    if (!c) { cands.set(m.id, { movie: m, score, why }); return; }
    if (score > c.score) c.why = why; // der stärkste Grund wird angezeigt
    c.score = Math.max(c.score, score) + 0.5; // mehrere Gründe zählen etwas mehr
  };
  const jobs = [];
  // Lieblingspersonen: nur echte Regie bzw. Hauptrollen
  for (const p of profile.people.slice(0, U.people)) {
    jobs.push(tmdb.get(`person/${p.id}/movie_credits`, { language: lang }).then((d) => {
      for (const m of creditsOf(d, p.role, 'movie')) {
        add(m, p.role === 'director' ? 3 : 2, p.role === 'director' ? `Neuer Film von ${p.n}` : `Neuer Film mit ${p.n}`);
      }
    }));
  }
  // Lieblingsstudios: die bekanntesten kommenden Filme
  for (const c of profile.companies.slice(0, U.companies)) {
    jobs.push(tmdb.get('discover/movie', {
      language: lang, with_companies: [c.id, ...(c.also || [])].join('|'), 'primary_release_date.gte': from, 'primary_release_date.lte': until, sort_by: 'popularity.desc',
    }).then((d) => (d.results || []).slice(0, 2).forEach((m) => add(m, 1, `Neu von ${c.n}`))));
  }
  // Fortsetzungen: bei den bekanntesten kommenden Filmen nachsehen, ob sie zu einer deiner Filmreihen gehören
  const liked = new Set(Object.entries(marks).filter(([, m]) => LIKED.has(m.s)).map(([id]) => Number(id)));
  if (liked.size) {
    for (let page = 1; page <= U.sequelPages; page++) {
      jobs.push(tmdb.get('discover/movie', {
        language: lang, 'primary_release_date.gte': from, 'primary_release_date.lte': until, sort_by: 'popularity.desc', page,
      }).then(async (d) => {
        const det = await Promise.allSettled((d.results || []).filter((m) => !marks[m.id]).map((m) => tmdb.get(`movie/${m.id}`, { language: lang })));
        const withSet = det.filter((r) => r.status === 'fulfilled' && r.value.belongs_to_collection).map((r) => r.value);
        await Promise.allSettled(withSet.map(async (m) => {
          const col = await tmdb.get(`collection/${m.belongs_to_collection.id}`, { language: lang });
          const mine = (col.parts || []).filter((x) => liked.has(x.id));
          if (!mine.length) return;
          const best = mine.find((x) => marks[x.id].s === 'loved') || mine[0];
          const loved = marks[best.id].s === 'loved';
          add(m, loved ? 5 : 4, `Neuer Teil von „${marks[best.id].n || best.title}“, ${loved ? 'den du liebst' : 'den du magst'}`);
        }));
      }));
    }
  }
  await Promise.allSettled(jobs);
  return [...cands.values()].sort((a, b) => b.score - a.score || a.movie.release_date.localeCompare(b.movie.release_date));
}

export async function fill(p) {
  profile = p;
  const mine = ++run;
  if (!p.people.length && !p.companies.length && !Object.values(marksOf(p, 'movie')).some((m) => LIKED.has(m.s))) return;
  let list;
  try { list = await collect(); } catch { return; }
  if (mine !== run || !box()) return;
  // Für die drei besten das deutsche Startdatum holen
  const top = list.slice(0, U.max);
  const det = await Promise.allSettled(top.map((x) => tmdb.get(`movie/${x.movie.id}`, { language: p.language, append_to_response: 'release_dates' })));
  if (mine !== run || !box()) return;
  items = top.map((x, i) => ({ ...x, when: det[i].status === 'fulfilled' ? startText(det[i].value) : `Start ${fmt(x.movie.release_date)}` }));
  paint();
}

function paint() {
  const el = box();
  if (!el) return;
  const open = items.filter((x) => !marksOf(profile, 'movie')[x.movie.id] || x.done);
  el.hidden = !open.length;
  el.innerHTML = open.length ? `
    <h2 class="upcoming-head">Demnächst von deinen Lieblingen</h2>
    ${open.map(row).join('')}` : '';
}

function row(x) {
  const m = x.movie;
  const st = marksOf(profile, 'movie')[m.id]?.s;
  return `
    <article class="upcoming-row" data-upfilm="${m.id}">
      ${m.poster_path ? `<img class="upcoming-poster" src="${tmdb.img(m.poster_path, 'w92')}" width="46" height="69" loading="lazy" alt="">` : '<div class="upcoming-poster noimg" aria-hidden="true"></div>'}
      <div class="upcoming-info">
        <p class="upcoming-title"><strong>${esc(m.title)}</strong></p>
        <p class="muted small">${esc(x.why)} · ${esc(x.when)}</p>
        <div class="upcoming-actions">
          ${st === 'want' ? '<span class="small">🔖 Gemerkt</span>' : `<button type="button" class="btn btn-small" data-up="want">+ Merken</button>`}
          ${trailerBtn(m.id, m.title)}
          ${st ? '' : `<button type="button" class="btn btn-small" data-up="noInterest" aria-label="Kein Interesse an ${esc(m.title)}">✕</button>`}
        </div>
      </div>
    </article>`;
}

export function handleClick(e) {
  const b = e.target.closest('[data-up]');
  if (!b) return false;
  const id = Number(b.closest('[data-upfilm]').dataset.upfilm);
  const x = items.find((i) => i.movie.id === id);
  if (!x) return true;
  const m = x.movie;
  const status = b.dataset.up;
  const old = store.setMark(profile.id, 'movie', id, status, { g: m.genre_ids, l: m.original_language, y: tmdb.year(m.release_date), n: m.title });
  profile = store.getProfile(profile.id);
  x.done = status === 'want'; // gemerkte bleiben mit „Gemerkt“ stehen
  paint();
  toast(status === 'want' ? `Gemerkt: ${m.title} – steht mit Starttermin auf der Merkliste` : `Kein Interesse: ${m.title}`, {
    label: 'Rückgängig',
    run: () => { store.restoreMark(profile.id, 'movie', id, old); profile = store.getProfile(profile.id); x.done = false; paint(); },
  });
  return true;
}
