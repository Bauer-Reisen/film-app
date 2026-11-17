// Seite „Merkliste“ bei Spielen: alles mit „Merken“, neueste zuerst. Angaben vom Markieren (ohne Abfrage).
import * as store from './store.js?v=1.37.0';
import * as games from './games.js?v=1.37.0';
import { esc, toast } from './ui.js?v=1.37.0';
import { markButtons } from './cards.js?v=1.37.0';
import { gameMore } from './game-suggest.js?v=1.37.0';
import { pageEl } from './media.js?v=1.37.0';

const MAIN = [['known', '✓', 'Gespielt'], ['remove', '–', 'Entfernen']];
const KNOWN = [['liked', '♥', 'Mag ich'], ['seen', '✓', 'Ganz okay'], ['disliked', '✕', 'Mag ich nicht']];

let profile = null;
const wanted = () => Object.entries(store.getProfile(profile.id).games || {}).filter(([, m]) => m.s === 'want')
  .sort((a, b) => b[1].t - a[1].t).map(([id, m]) => ({ id: Number(id), n: m.n, c: m.c, y: m.y, g: m.g || [], p: m.p || [], m: m.m || [], cm: m.cm || 0, on: m.on, rc: 0 }));

export function render(p) {
  profile = p;
  const list = wanted();
  if (!list.length) {
    return `<h1>Merkliste</h1><div class="card placeholder">
      <p><strong>Noch nichts auf der Merkliste.</strong></p>
      <p class="muted">Tippe bei einem Spiel auf „+ Merken“ – unter „Vorschläge“ oder „Geschmack“.</p>
      <p><a class="btn btn-primary btn-big" href="#/vorschlaege">Zu den Vorschlägen</a></p></div>`;
  }
  return `
    <h1>Merkliste</h1>
    <p class="muted small" id="watch-count"></p>
    <div class="suggestions">${list.map(card).join('')}</div>
    ${games.igdbLink}`;
}
export function mount() { updateCount(); games.fillTimes(document.getElementById('view')); }

function updateCount() {
  const n = wanted().length;
  const el = pageEl('watch-count', 'game');
  if (el) el.textContent = n ? `${n} ${n === 1 ? 'Spiel' : 'Spiele'} auf der Merkliste.` : 'Alles gespielt – die Merkliste ist leer.';
}

function card(g) {
  return `
    <article class="film sg game" data-wgame="${g.id}">
      <button type="button" class="poster-btn" data-wgl="loved" aria-label="${esc(g.n)} als ${games.W.fav}">
        ${games.coverImg(g.c)}<span class="poster-star" aria-hidden="true">☆</span>
      </button>
      <div class="film-info">
        <h3 class="film-title">${esc(g.n)}</h3>
        <p class="muted small">${esc(games.metaLine(g))}${games.playtimeSlot(g.id)}</p>
        <p class="small">🎮 ${esc(games.platformText(g, profile))}</p>
        ${games.couchText(g) ? `<p class="small">${esc(games.couchText(g))}</p>` : ''}
        <p class="row"><button type="button" class="btn btn-small" data-gtrailer="${g.id}" data-title="${esc(g.n)}"><span aria-hidden="true">▶</span> Trailer</button></p>
        <div class="film-extra">${gameMore(g)}</div>
        ${markButtons('data-wgl', g.n, MAIN, KNOWN)}
      </div>
    </article>`;
}

export function handleClick(e) {
  const btn = e.target.closest('[data-wgl]');
  if (!btn) return false;
  const el = btn.closest('[data-wgame]');
  const id = Number(el.dataset.wgame);
  const action = btn.dataset.wgl;
  const old = store.setMark(profile.id, 'game', id, action === 'remove' ? null : action);
  el.hidden = true;
  updateCount();
  toast(`${action === 'remove' ? 'Entfernt' : games.label(action)}: ${old?.n || ''}`, {
    label: 'Rückgängig',
    run: () => { store.restoreMark(profile.id, 'game', id, old); el.hidden = false; updateCount(); },
  });
  return true;
}
