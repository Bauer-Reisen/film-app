// Spiele: Abfragen an IGDB (immer über den Worker), Karten-Bausteine, Spielzeit.
// Wird erst geladen, wenn man oben auf „Spiele“ umschaltet (app.js: loadGames).
import { WORKER_URL } from './config.js?v=1.38.1';
import { esc } from './ui.js?v=1.38.1';
import { compact, GENRES, PLATFORM_SHORT, PLATFORMS, platformIds, MODES, fitsMode, timeLevel, timeIndex } from './game-data.js?v=1.38.1';
import { MEDIA, stateLabel } from './media.js?v=1.38.1';

export const W = MEDIA.game.w;
const memo = new Map();
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function load(url) {
  for (let attempt = 0; ; attempt++) {
    let res;
    try { res = await fetch(url); } catch { throw new Error('Keine Verbindung. Bist du online?'); }
    if (res.status === 429 && attempt < 3) { await wait(1500 * (attempt + 1)); continue; }
    if (!res.ok) throw new Error('Die Spieldaten sind gerade nicht erreichbar.');
    return res.json();
  }
}
// get('discover', { platforms: '167,48' }) → Liste in kurzer Form
export function get(path, params = {}) {
  const clean = Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''));
  const qs = new URLSearchParams(clean).toString();
  const url = `${WORKER_URL}/igdb/${path}${qs ? `?${qs}` : ''}`;
  if (!memo.has(url)) {
    const p = load(url).then((list) => (path === 'time' ? list : (Array.isArray(list) ? list : []).map(compact)));
    memo.set(url, p);
    p.catch(() => memo.delete(url));
  }
  return memo.get(url);
}
export const search = (q) => get('search', { q });
// Mehrere Spiele per Nummern (höchstens 50 je Abfrage)
export async function byIds(ids) {
  const list = [...new Set(ids.map(Number))].filter(Boolean);
  const out = [];
  for (let i = 0; i < list.length; i += 50) out.push(...await get('games', { ids: list.slice(i, i + 50).sort((a, b) => a - b).join(',') }));
  return out;
}

// ---------- Spielzeit (eigener Endpunkt, „ca. 12 Std.“) ----------
const hours = new Map(); // id → Stunden (null = unbekannt)
export const hoursOf = (id) => hours.get(Number(id));
export async function loadTimes(ids) {
  const need = [...new Set(ids.map(Number))].filter((id) => id && !hours.has(id));
  for (let i = 0; i < need.length; i += 50) {
    const part = need.slice(i, i + 50);
    let rows = [];
    try { rows = await get('time', { ids: part.sort((a, b) => a - b).join(',') }); } catch { continue; }
    part.forEach((id) => hours.set(id, null));
    // nur ab 3 Angaben und höchstens 250 Std. (Endlos-Spiele wie League of Legends haben sonst Fantasiewerte)
    for (const r of rows) if (r.normally && (r.count || 0) >= 3 && r.normally <= 250 * 3600) hours.set(r.game_id, Math.max(1, Math.round(r.normally / 3600)));
  }
}
export const timeText = (id) => { const h = hoursOf(id); return h ? `ca. ${h} Std.` : ''; };
// Platzhalter in den Karten; fillTimes füllt alle auf einmal (eine Abfrage für bis zu 50 Spiele)
export const playtimeSlot = (id) => `<span class="runtime" data-playtime="${id}"></span>`;
export async function fillTimes(root) {
  const els = [...root.querySelectorAll('[data-playtime]:not([data-done])')];
  if (!els.length) return;
  await loadTimes(els.map((el) => el.dataset.playtime));
  for (const el of els) { el.dataset.done = '1'; const t = timeText(el.dataset.playtime); el.textContent = t ? ` · ${t}` : ''; }
}

// ---------- Profil-Einstellungen ----------
export const settingsOf = (p) => ({
  plats: p.settings?.gamePlatforms || [], time: p.settings?.gameTime || '', modes: p.settings?.gameModes || [],
});
export const myPlatformIds = (p) => platformIds(settingsOf(p).plats);
export function settingsText(p) {
  const s = settingsOf(p);
  const plats = s.plats.length ? PLATFORMS.filter((x) => s.plats.includes(x.id)).map((x) => x.n).join(', ') : 'alle Plattformen';
  const time = timeIndex(s.time) >= 0 ? ['kurze Spiele', 'mittellange Spiele', 'lange Spiele'][timeIndex(s.time)] : 'Länge egal';
  return `${plats} · ${time}`;
}
export const onMine = (g, p) => { const mine = myPlatformIds(p); return (g.p || []).some((x) => mine.includes(x)); };
export const fitsModes = (g, mode) => !mode || fitsMode(g, mode); // mode: Filter „Heute: …“ ('' = egal)
export const timeDistance = (g, p) => {
  const want = timeIndex(settingsOf(p).time);
  const lvl = timeLevel(hoursOf(g.id));
  return want < 0 || lvl == null ? 0 : Math.abs(want - lvl);
};

// ---------- Karten-Bausteine ----------
export const cover = (id, size = 't_cover_big') => (id ? `https://images.igdb.com/igdb/image/upload/${size}/${id}.jpg` : null);
export function coverImg(id, alt = '') {
  if (!id) return `<div class="poster noimg" aria-hidden="true">${W.noPoster}</div>`;
  return `<img class="poster" src="${cover(id)}" width="100" height="133" loading="lazy" decoding="async" alt="${esc(alt)}">`;
}
export const genreText = (g) => (g.g || []).filter((x) => x !== 32).map((x) => GENRES[x]).filter(Boolean).slice(0, 2).join(', ');
export const isIndie = (g) => (g.g || []).includes(32);
// Plattform-Hinweis: wo kann ICH es spielen? (abwärtskompatibel: „PS4 – läuft auf deiner PS5“)
export function platformText(g, p) {
  const s = settingsOf(p).plats;
  const out = [];
  for (const pl of PLATFORMS.filter((x) => (s.length ? s.includes(x.id) : true))) {
    if (pl.ids.some((x) => g.p.includes(x))) out.push(PLATFORM_SHORT[pl.ids[0]]);
    else if (pl.also?.some((x) => g.p.includes(x))) out.push(`${PLATFORM_SHORT[pl.also[0]]} (läuft auf ${PLATFORM_SHORT[pl.ids[0]]})`);
  }
  if (!out.length) return (g.p || []).map((x) => PLATFORM_SHORT[x]).filter(Boolean).slice(0, 4).join(', ');
  return [...new Set(out)].join(', ');
}
export const couchText = (g) => (g.cm ? `🛋️ Koop${g.cm > 1 ? ` für ${g.cm}` : ''} auf einer Konsole` : '');
export const metaLine = (g) => [g.y, genreText(g), isIndie(g) ? 'Indie' : ''].filter(Boolean).join(' · ');
export const markMeta = (g) => ({ n: g.n, y: g.y, g: g.g, c: g.c, p: g.p, m: g.m, cm: g.cm, on: g.on });
export const label = (s) => stateLabel('game', s).replace(/^[^\p{L}]+/u, '');
export const igdbLink = '<p class="muted small center data-credit">Spieldaten: <a href="https://www.igdb.com/" target="_blank" rel="noopener">IGDB.com</a></p>';
export const gameUrl = (g) => `https://www.igdb.com/search?type=1&q=${encodeURIComponent(g.n)}`;

// Trailer: YouTube-Nummer aus den Details
export async function trailerKey(id) {
  const url = `${WORKER_URL}/igdb/game/${Number(id)}`;
  if (!memo.has(url)) { const p = load(url); memo.set(url, p); p.catch(() => memo.delete(url)); }
  const d = (await memo.get(url))?.[0];
  const vids = d?.videos || [];
  return (vids.find((v) => /trailer/i.test(v.name || '')) || vids[0])?.video_id || null;
}
export async function details(id) {
  const url = `${WORKER_URL}/igdb/game/${Number(id)}`;
  if (!memo.has(url)) { const p = load(url); memo.set(url, p); p.catch(() => memo.delete(url)); }
  return (await memo.get(url))?.[0] || null;
}
