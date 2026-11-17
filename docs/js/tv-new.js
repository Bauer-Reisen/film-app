// Kasten „Neu für dich“ oben bei den Serien-Vorschlägen:
// neue Folgen deiner angefangenen Serien, neue Staffeln deiner Lieblingsserien, kommende Staffelstarts.
// Erscheint nur, wenn es etwas gibt. ✕ blendet einen Eintrag aus (bis es wieder etwas Neues gibt).
import * as store from './store.js?v=1.37.0';
import * as tmdb from './tmdb.js?v=1.37.0';
import { esc, toast } from './ui.js?v=1.37.0';
import { marksOf, pageEl } from './media.js?v=1.37.0';
import * as eps from './episodes.js?v=1.37.0';

const MAX = 4;
const LIKED = new Set(['liked', 'loved']);
let profile = null;
let items = [];
let run = 0;

const box = () => pageEl('tv-new', 'tv');
const today = () => new Date().toLocaleDateString('sv-SE');
const plus = (days) => new Date(Date.now() + days * 86400000).toLocaleDateString('sv-SE');
const hidden = () => profile.settings?.newHidden || [];

export const slot = () => '<section id="tv-new" class="upcoming" hidden aria-label="Neu für dich"></section>';

export async function fill(p) {
  profile = p;
  const mine = ++run;
  const marks = marksOf(p, 'tv');
  const paused = Object.entries(marks).filter(([, m]) => m.s === 'paused');
  const fans = Object.entries(marks).filter(([, m]) => LIKED.has(m.s) || m.s === 'seen').sort((a, b) => (b[1].s === 'loved') - (a[1].s === 'loved') || b[1].t - a[1].t).slice(0, 30);
  if (!paused.length && !fans.length) return;
  const all = [...paused, ...fans];
  const det = await Promise.allSettled(all.map(([id]) => tmdb.get(`tv/${id}`, { language: p.language })));
  if (mine !== run || !box()) return;
  const out = [];
  all.forEach(([id, m], i) => {
    if (det[i].status !== 'fulfilled') return;
    const d = det[i].value;
    const base = { id: Number(id), title: d.title || d.name || m.n, poster: d.poster_path };
    if (m.s === 'paused') {
      const pr = eps.progress(d, m);
      if (pr.kind === 'ready' && pr.isNew) out.push({ ...base, kind: 'ep', tag: `${id}:ep:${eps.se(pr.next)}`, rank: 0, next: pr.next, text: `Neue Folge seit ${eps.fmt(pr.since)} – weiter mit ${eps.se(pr.next)}` });
      return;
    }
    // fertig geschaute Serie: läuft eine neue Staffel (in den letzten 60 Tagen gestartet, nach deiner Markierung)?
    const last = d.last_episode_to_air;
    const up = d.next_episode_to_air;
    const markedDay = new Date(m.t || 0).toLocaleDateString('sv-SE');
    if (last && last.season_number >= 2 && last.air_date && last.air_date >= plus(-60) && last.air_date > markedDay) {
      const s = last.season_number;
      const start = (d.seasons || []).find((x) => x.season_number === s)?.air_date || last.air_date;
      if (start > markedDay) out.push({ ...base, kind: 'season', tag: `${id}:s${s}`, rank: 1, prev: [s - 1, (d.seasons || []).find((x) => x.season_number === s - 1)?.episode_count || 1], text: `🆕 Staffel ${s} läuft seit ${eps.fmt(start)}` });
      return;
    }
    if (up && up.episode_number === 1 && up.air_date && up.air_date >= today() && up.air_date <= plus(183) && LIKED.has(m.s)) {
      out.push({ ...base, kind: 'soon', tag: `${id}:soon${up.season_number}`, rank: 2, text: `Staffel ${up.season_number} startet am ${eps.fmt(up.air_date)}`, date: up.air_date });
    }
  });
  items = out.filter((x) => !hidden().includes(x.tag)).sort((a, b) => a.rank - b.rank || (a.date || '').localeCompare(b.date || '')).slice(0, MAX);
  paint();
}

function paint() {
  const el = box();
  if (!el) return;
  const open = items.filter((x) => !x.gone);
  el.hidden = !open.length;
  el.innerHTML = open.length ? `<h2 class="upcoming-head">Neu für dich</h2>${open.map(row).join('')}` : '';
}

function row(x) {
  const btn = x.kind === 'ep'
    ? `<button type="button" class="btn btn-small btn-primary" data-tvn="seen">✓ ${eps.se(x.next)} gesehen</button>`
    : x.kind === 'season' ? '<button type="button" class="btn btn-small btn-primary" data-tvn="watch">+ Weiterschauen</button>' : '';
  return `
    <article class="upcoming-row" data-tvnew="${esc(x.tag)}">
      ${x.poster ? `<img class="upcoming-poster" src="${tmdb.img(x.poster, 'w92')}" width="46" height="69" loading="lazy" alt="">` : '<div class="upcoming-poster noimg" aria-hidden="true"></div>'}
      <div class="upcoming-info">
        <p class="upcoming-title"><strong>${esc(x.title)}</strong></p>
        <p class="muted small">${esc(x.text)}</p>
        <div class="upcoming-actions">${btn}<button type="button" class="btn btn-small" data-tvn="hide" aria-label="Ausblenden: ${esc(x.title)}">✕</button></div>
      </div>
    </article>`;
}

export function handleClick(e) {
  const b = e.target.closest('[data-tvn]');
  if (!b) return false;
  const tag = b.closest('[data-tvnew]').dataset.tvnew;
  const x = items.find((i) => i.tag === tag);
  if (!x) return true;
  const what = b.dataset.tvn;
  if (what === 'hide') {
    store.updateProfile(profile.id, { settings: { ...(profile.settings || {}), newHidden: [...hidden(), tag].slice(-100) } });
    profile = store.getProfile(profile.id);
  } else if (what === 'seen') {
    const before = store.getMark(profile.id, 'tv', x.id)?.ep;
    eps.setEp(profile.id, x.id, x.next);
    toast(`${x.title}: ${eps.se(x.next)} gesehen`, { label: 'Rückgängig', run: () => { eps.setEp(profile.id, x.id, before); x.gone = false; paint(); } });
  } else if (what === 'watch') {
    // Vorige Staffel gilt als gesehen, weiter geht's mit der neuen
    const old = store.setMark(profile.id, 'tv', x.id, 'paused', { ep: x.prev, epT: Date.now() });
    toast(`${x.title} steht jetzt unter „Weiterschauen“ auf der Merkliste`, { label: 'Rückgängig', run: () => { store.restoreMark(profile.id, 'tv', x.id, old); x.gone = false; paint(); } });
  }
  x.gone = true;
  paint();
  return true;
}
