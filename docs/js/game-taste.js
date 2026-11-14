// Seite „Geschmack“ bei Spielen: 3 Startfragen, Startliste (ca. 100), Suche, „Weitere laden“.
// Knöpfe: Gespielt · Mag ich · Mag ich nicht · Merken; Tipp aufs Cover = ★ Lieblingsspiel.
import * as store from './store.js?v=1.28.0';
import * as games from './games.js?v=1.28.0';
import { esc, dialog, toast } from './ui.js?v=1.28.0';
import { pressed } from './media.js?v=1.28.0';
import { PLATFORMS, MODES, TIMES } from './game-data.js?v=1.28.0';
import { SEED_GAMES } from './seeds-games.js?v=1.28.0';

const GAME_MARKS = [['seen', '✓', 'Gespielt'], ['liked', '♥', 'Mag ich'], ['disliked', '✕', 'Mag ich nicht'], ['want', '+', 'Merken']];
const W = games.W;

let profile = null;
const ui = { query: '' };
const known = new Map(); // id → Spiel (für Markierungen)
const extra = { list: [], offset: 0, key: '' };
let searchTimer = null;
let searchRun = 0;
const marks = () => profile.games || {};
const body = () => document.getElementById('taste-body');

// Von außen („🎮 Das Spiel dazu“ bei Filmen/Serien/Büchern): gleich danach suchen
export function openSearch(q) { ui.query = q || ''; }

// ---------- Die 3 Startfragen (auch unter „Profil“ änderbar) ----------
export async function setupDialog(p) {
  const s = games.settingsOf(p);
  const box = (name, val, text, on) => `<label class="radio"><input type="checkbox" name="${name}" value="${val}"${on ? ' checked' : ''}> ${text}</label>`;
  const res = await dialog({
    title: 'Drei kurze Fragen',
    body: `
      <fieldset class="field"><legend><strong>Worauf spielst du?</strong> (mehrere möglich)</legend>
        ${PLATFORMS.map((x) => box(`plat_${x.id}`, 1, esc(x.n), s.plats.includes(x.id))).join('')}
        ${box('plat_all', 1, 'Egal – alle', p.settings?.gameSetup && !s.plats.length)}
        <span class="muted small">PS5 spielt auch PS4-Spiele, Xbox Series auch Xbox One, Switch 2 auch Switch.</span>
      </fieldset>
      <fieldset class="field"><legend><strong>Wie viel Zeit hast du meistens?</strong></legend>
        ${[{ id: '', n: 'Egal', d: '' }, ...TIMES].map((t) => `<label class="radio"><input type="radio" name="time" value="${t.id}"${s.time === t.id ? ' checked' : ''}> ${t.n}${t.d ? ` <span class="muted">(${t.d})</span>` : ''}</label>`).join('')}
      </fieldset>
      <fieldset class="field"><legend><strong>Wie spielst du am liebsten?</strong> (mehrere möglich)</legend>
        ${MODES.map((m) => box(`mode_${m.id}`, 1, m.n, s.modes.includes(m.id))).join('')}
        <span class="muted small">Nichts angehakt = egal.</span>
      </fieldset>
      <p class="muted small">Das kannst du später unter „Profil“ ändern.</p>`,
    buttons: [{ label: 'Abbrechen', value: false }, { label: 'Speichern', value: true, primary: true }],
    validate: (f) => (Object.keys(f).some((k) => k.startsWith('plat_')) ? '' : 'Bitte mindestens eine Plattform wählen – oder „Egal – alle“.'),
  });
  if (!res?.value) return false;
  const f = res.fields;
  const plats = f.plat_all ? [] : PLATFORMS.filter((x) => f[`plat_${x.id}`]).map((x) => x.id);
  const fresh = store.getProfile(p.id);
  store.updateProfile(p.id, {
    settings: { ...fresh.settings, gamePlatforms: plats, gameTime: f.time || '', gameModes: MODES.filter((m) => f[`mode_${m.id}`]).map((m) => m.id), gameSetup: true },
  });
  toast('Gespeichert.');
  return true;
}

// ---------- Seite ----------
export function render(p) {
  profile = p;
  return `
    <h1>Geschmack</h1>
    <p class="muted small game-settings">Für: ${esc(games.settingsText(p))} · <button type="button" class="link-btn" data-gtaste="setup">ändern</button></p>
    <label class="search">
      <span class="sr-only">Suche</span>
      <input id="taste-search" type="search" inputmode="search" enterkeyhint="search" autocomplete="off"
        placeholder="Spiel suchen" value="${esc(ui.query)}">
    </label>
    <div id="taste-body" aria-live="polite"></div>
    ${games.igdbLink}`;
}

export async function mount(p) {
  profile = p;
  const input = document.getElementById('taste-search');
  input?.addEventListener('input', () => {
    clearTimeout(searchTimer);
    ui.query = input.value.trim();
    searchTimer = setTimeout(fillBody, 400);
  });
  input?.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); clearTimeout(searchTimer); fillBody(); input.blur(); } });
  if (!p.settings?.gameSetup) {
    body().innerHTML = `<div class="card placeholder"><p><strong>Willkommen bei den Spielen!</strong></p>
      <p class="muted">Erst drei kurze Fragen: Plattform, Zeit und wie du spielst. Dann zeigt die App nur Spiele, die du auch spielen kannst.</p>
      <p><button class="btn btn-primary btn-big" type="button" data-gtaste="setup">Los geht’s</button></p></div>`;
    return; // Fragen erst auf Knopfdruck (sonst kollidiert es mit dem Rundgang neuer Profile)
  }
  fillBody();
}
// Seite neu zeichnen (app.js hört auf hashchange)
export const refresh = () => window.dispatchEvent(new HashChangeEvent('hashchange'));

// Sortierung: auf meinen Plattformen zuerst, dann bekannteste; Unmarkierte vor Markierten
function sortList(list) {
  const mine = (g) => (games.onMine(g, profile) ? 0 : 1);
  return [...list].sort((a, b) => mine(a) - mine(b) || (!!marks()[a.id]) - (!!marks()[b.id]) || b.rc - a.rc);
}

async function fillBody() {
  const el = body();
  if (!el) return;
  if (ui.query.length >= 2) {
    const mine = ++searchRun;
    el.innerHTML = '<p class="muted center">Suche …</p>';
    let list = [];
    try { list = await games.search(ui.query); } catch (err) { if (mine === searchRun) el.innerHTML = `<p class="muted center">${esc(err.message)}</p>`; return; }
    if (mine !== searchRun) return;
    list = list.filter((g) => g.rc || g.c).sort((a, b) => b.rc - a.rc);
    list.forEach((g) => known.set(g.id, g));
    el.innerHTML = list.length
      ? `<div class="films">${list.map(card).join('')}</div>`
      : '<p class="muted center">Nichts gefunden. Tipp: den englischen Originaltitel versuchen.</p>';
    games.fillTimes(el);
    return;
  }
  const seeds = sortList(SEED_GAMES.filter((g) => !extra.list.some((x) => x.id === g.id)));
  [...seeds, ...extra.list].forEach((g) => known.set(g.id, g));
  const n = Object.keys(marks()).length;
  el.innerHTML = `
    <p class="muted small">${n ? `${n} markiert. ` : ''}Markiere Spiele, die du kennst – schon 5 bis 10 reichen. Tipp aufs Cover = ★ ${W.fav}.</p>
    <div class="films">${[...seeds, ...extra.list].map(card).join('')}</div>
    <div class="row center-row"><button class="btn" type="button" data-gtaste="more">Weitere laden</button></div>`;
  games.fillTimes(el);
}

async function loadMore(btn) {
  btn.disabled = true; btn.textContent = 'Lädt …';
  const plats = games.myPlatformIds(profile).join(',');
  if (extra.key !== plats) { extra.key = plats; extra.list = []; extra.offset = 0; }
  const have = new Set([...SEED_GAMES.map((g) => g.id), ...extra.list.map((g) => g.id)]);
  let fresh = [];
  try {
    for (let i = 0; i < 3 && fresh.length < 20; i++) {
      const list = await games.get('discover', { platforms: plats, min: 50, offset: extra.offset });
      extra.offset += 50;
      fresh.push(...list.filter((g) => !have.has(g.id) && have.add(g.id)));
      if (list.length < 50) break;
    }
  } catch (err) { toast(err.message); }
  fresh = fresh.slice(0, 30);
  extra.list.push(...fresh);
  fresh.forEach((g) => known.set(g.id, g));
  btn.disabled = false; btn.textContent = 'Weitere laden';
  if (!fresh.length) { btn.hidden = true; toast('Keine weiteren Spiele gefunden.'); return; }
  btn.closest('.row').previousElementSibling.insertAdjacentHTML('beforeend', fresh.map(card).join(''));
  games.fillTimes(body());
}

function card(g) {
  const s = marks()[g.id]?.s || null;
  return `
    <article class="film game ${s ? 'is-marked' : ''} ${s === 'loved' ? 'is-loved' : ''}" data-game="${g.id}">
      <button type="button" class="poster-btn" data-gmark="poster" aria-pressed="${s === 'loved'}" aria-label="${esc(g.n)} als ${W.fav}">
        ${games.coverImg(g.c)}
        <span class="poster-star" aria-hidden="true">${s === 'loved' ? '★' : '☆'}</span>
      </button>
      <div class="film-info">
        <h3 class="film-title">${esc(g.n)}</h3>
        <p class="muted small">${esc(games.metaLine(g))}${games.playtimeSlot(g.id)}</p>
        <p class="muted small">🎮 ${esc(games.platformText(g, profile))}</p>
        <p class="film-state">${s ? esc(games.label(s)) : ''}</p>
        <div class="marks marks-4" role="group" aria-label="${esc(g.n)} markieren">
          ${GAME_MARKS.map(([key, icon, text]) => `
            <button type="button" class="mark mark-${key}" data-gmark="${key}" aria-pressed="${pressed(s, key)}"><span aria-hidden="true">${icon}</span> ${text}</button>`).join('')}
        </div>
      </div>
    </article>`;
}

function updateCard(el, id) {
  const s = marks()[id]?.s || null;
  el.classList.toggle('is-marked', !!s);
  el.classList.toggle('is-loved', s === 'loved');
  el.querySelector('.poster-star').textContent = s === 'loved' ? '★' : '☆';
  el.querySelector('.poster-btn').setAttribute('aria-pressed', String(s === 'loved'));
  el.querySelector('.film-state').textContent = s ? games.label(s) : '';
  el.querySelectorAll('.mark[data-gmark]').forEach((b) => b.setAttribute('aria-pressed', String(pressed(s, b.dataset.gmark))));
}

function mark(el, key) {
  const id = Number(el.dataset.game);
  const g = known.get(id) || {};
  const old = marks()[id]?.s || null;
  const next = key === 'poster' ? (old === 'loved' ? 'liked' : 'loved') : (pressed(old, key) ? null : key);
  store.setMark(profile.id, 'game', id, next, games.markMeta(g));
  profile = store.getProfile(profile.id);
  document.querySelectorAll(`[data-game="${id}"]`).forEach((c) => updateCard(c, id));
}

export function handleClick(e) {
  const m = e.target.closest('[data-gmark]');
  if (m) { mark(m.closest('[data-game]'), m.dataset.gmark); return true; }
  const act = e.target.closest('[data-gtaste]')?.dataset.gtaste;
  if (act === 'setup') { setupDialog(store.getProfile(profile.id)).then((ok) => ok && refresh()); return true; }
  if (act === 'more') { loadMore(e.target.closest('[data-gtaste]')); return true; }
  return false;
}
