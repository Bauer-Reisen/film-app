// Cloudflare Worker: reicht Leseanfragen an TMDB weiter und ergänzt dabei den
// geheimen Schlüssel (Secret TMDB_TOKEN). Der Schlüssel verlässt den Worker nie.

import { isIgdb, handleIgdb } from './igdb.js';

// Nur diese TMDB-Adressen sind erlaubt – alles andere wird abgelehnt.
// Rechts: wie lange der Browser die Antwort aufheben darf (Sekunden).
const DAY = 86400;
const ROUTES = [
  [/^\/3\/discover\/movie$/, DAY],
  [/^\/3\/movie\/\d+$/, 7 * DAY],
  [/^\/3\/movie\/\d+\/recommendations$/, 7 * DAY],
  [/^\/3\/movie\/\d+\/credits$/, 7 * DAY],
  [/^\/3\/movie\/\d+\/release_dates$/, 7 * DAY],
  [/^\/3\/person\/\d+$/, 7 * DAY],
  [/^\/3\/person\/\d+\/movie_credits$/, 7 * DAY],
  [/^\/3\/company\/\d+$/, 7 * DAY],
  [/^\/3\/collection\/\d+$/, DAY], // Filmreihen (für neue Teile)
  [/^\/3\/search\/(movie|person|company|keyword)$/, 3600],
  [/^\/3\/movie\/\d+\/keywords$/, 7 * DAY],
  [/^\/3\/genre\/(movie|tv)\/list$/, 7 * DAY],
  // Serien
  [/^\/3\/discover\/tv$/, DAY],
  [/^\/3\/tv\/\d+$/, 7 * DAY],
  [/^\/3\/tv\/\d+\/(recommendations|keywords|aggregate_credits|content_ratings)$/, 7 * DAY],
  [/^\/3\/person\/\d+\/tv_credits$/, 7 * DAY],
  [/^\/3\/search\/tv$/, 3600],
  [/^\/3\/network\/\d+$/, 7 * DAY],
  [/^\/3\/configuration$/, 7 * DAY],
];

// Bücher: Open Library (frei, ohne Schlüssel). /ol/… wird an openlibrary.org weitergereicht.
const OL_ROUTES = [
  [/^\/ol\/search\.json$/, DAY],
  [/^\/ol\/search\/authors\.json$/, DAY],
  [/^\/ol\/isbn\/[\dXx]{10,13}\.json$/, 7 * DAY],
  [/^\/ol\/works\/OL\d+W\.json$/, 7 * DAY],
  [/^\/ol\/works\/OL\d+W\/(ratings|editions)\.json$/, 7 * DAY],
  [/^\/ol\/authors\/OL\d+A\.json$/, 7 * DAY],
];

export default {
  async fetch(request, env, ctx) {
    // Statistik-Seite: direkt im Browser aufrufen, mit Passwort (Secret STATS_KEY)
    if (new URL(request.url).pathname === '/stats' && request.method === 'GET') return statsPage(request, env);

    const origin = request.headers.get('Origin') || '';
    const allowed = (env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
    const cors = allowed.includes(origin)
      ? { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Methods': 'GET, OPTIONS', Vary: 'Origin' }
      : {};

    const reply = (status, body, extra = {}) =>
      new Response(typeof body === 'string' ? body : JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json; charset=utf-8', ...cors, ...extra },
      });

    if (!cors['Access-Control-Allow-Origin']) return reply(403, { error: 'Herkunft nicht erlaubt' });
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: { ...cors, 'Access-Control-Max-Age': '86400' } });
    if (request.method !== 'GET') return reply(405, { error: 'Nur Lesen erlaubt' });

    const url = new URL(request.url);
    const olRoute = OL_ROUTES.find(([re]) => re.test(url.pathname));
    const game = isIgdb(url.pathname);
    const route = olRoute || ROUTES.find(([re]) => re.test(url.pathname));
    if (!route && !game && url.pathname !== '/stats/ping') return reply(403, { error: 'Adresse nicht erlaubt' });

    if (env.RATE_LIMITER) {
      const ip = request.headers.get('CF-Connecting-IP') || 'unbekannt';
      const { success } = await env.RATE_LIMITER.limit({ key: ip });
      if (!success) return reply(429, { error: 'Zu viele Anfragen – kurz warten' }, { 'Retry-After': '10' });
    }

    if (url.pathname === '/stats/ping') return statsPing(url, env, ctx, reply);
    if (game) return handleIgdb(request, env, ctx, reply);
    if (olRoute) return openLibrary(url, olRoute[1], reply);

    if (!env.TMDB_TOKEN) return reply(500, { error: 'Schlüssel fehlt im Worker (Secret TMDB_TOKEN)' });

    const params = new URLSearchParams(url.search);
    params.delete('api_key'); // nie fremde Schlüssel durchreichen
    const target = `https://api.themoviedb.org${url.pathname}?${params}`;

    let upstream;
    try {
      upstream = await fetch(target, {
        headers: { Authorization: `Bearer ${env.TMDB_TOKEN}`, Accept: 'application/json' },
      });
    } catch {
      return reply(502, { error: 'TMDB nicht erreichbar' });
    }

    const body = await upstream.text();
    const cache = upstream.ok ? { 'Cache-Control': `public, max-age=${route[1]}` } : { 'Cache-Control': 'no-store' };
    const retry = upstream.headers.get('Retry-After');
    return reply(upstream.status, body, { ...cache, ...(retry ? { 'Retry-After': retry } : {}) });
  },
};

// Open Library: ohne Schlüssel, Antworten bei Cloudflare zwischenspeichern (schont Open Library)
async function openLibrary(url, maxAge, reply) {
  const target = `https://openlibrary.org${url.pathname.slice(3)}${url.search}`;
  let upstream;
  try {
    upstream = await fetch(target, {
      headers: { Accept: 'application/json', 'User-Agent': 'film-app-worker/1.0' },
      redirect: 'follow',
      cf: { cacheTtl: maxAge, cacheEverything: true },
    });
  } catch {
    return reply(502, { error: 'Open Library nicht erreichbar' });
  }
  const body = await upstream.text();
  const cache = upstream.ok ? { 'Cache-Control': `public, max-age=${maxAge}` } : { 'Cache-Control': 'no-store' };
  return reply(upstream.status, body, cache);
}

// ---------- Nutzungs-Zählung (anonym) ----------
// Die App meldet einmal am Tag: Zufallsnummer des Geräts, Android/iPhone/Computer, installiert ja/nein.
// Keine Namen, keine Markierungen, keine IP-Adresse wird gespeichert.
const berlinDay = (t = new Date()) => t.toLocaleDateString('sv-SE', { timeZone: 'Europe/Berlin' });

async function statsPing(url, env, ctx, reply) {
  const id = url.searchParams.get('d') || '';
  const platform = url.searchParams.get('p') || '';
  const installed = url.searchParams.get('i') === '1' ? 1 : 0;
  const num = (k) => Math.min(100000, Math.max(0, parseInt(url.searchParams.get(k), 10) || 0));
  const [hg, ho, hb] = [num('hg'), num('ho'), num('hb')]; // Trefferquote dieses Geräts: gefallen / okay / nicht
  if (!/^[a-f0-9-]{16,40}$/.test(id) || !['android', 'ios', 'desktop'].includes(platform)) return reply(400, { error: 'Ungültig' });
  if (!env.STATS) return reply(200, '{}');
  const day = berlinDay();
  ctx.waitUntil(env.STATS.batch([
    env.STATS.prepare('INSERT OR IGNORE INTO visits (day, id) VALUES (?, ?)').bind(day, id),
    env.STATS.prepare(`INSERT INTO devices (id, first_day, last_day, platform, installed, hit_good, hit_ok, hit_bad) VALUES (?1, ?2, ?2, ?3, ?4, ?5, ?6, ?7)
      ON CONFLICT(id) DO UPDATE SET last_day = ?2, platform = ?3, installed = MAX(installed, ?4), hit_good = ?5, hit_ok = ?6, hit_bad = ?7`).bind(id, day, platform, installed, hg, ho, hb),
  ]).catch(() => {}));
  return reply(200, '{}', { 'Cache-Control': 'no-store' });
}

async function sameText(a, b) {
  const enc = new TextEncoder();
  const [x, y] = await Promise.all([crypto.subtle.digest('SHA-256', enc.encode(a)), crypto.subtle.digest('SHA-256', enc.encode(b))]);
  return crypto.subtle.timingSafeEqual(x, y);
}

async function statsPage(request, env) {
  const html = (status, body, extra = {}) => new Response(`<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Statistik · Was schaue ich?</title>
<style>body{font:16px/1.45 system-ui,sans-serif;margin:0;padding:16px;background:#121214;color:#eee}h1{font-size:22px}h2{font-size:18px;margin-top:28px}.big{display:flex;flex-wrap:wrap;gap:10px}.big div{background:#1f1f24;border-radius:10px;padding:10px 14px;min-width:120px}.big b{display:block;font-size:26px}table{border-collapse:collapse;width:100%;max-width:560px}td,th{padding:4px 6px;text-align:left;border-bottom:1px solid #333}td.n{text-align:right;width:3em}.bar{height:10px;background:#f5c518;border-radius:3px}.muted{color:#aaa;font-size:14px}</style></head><body>${body}</body></html>`,
    { status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex', ...extra } });
  if (!env.STATS_KEY) return html(503, '<h1>Statistik noch nicht eingerichtet</h1><p>Im Cloudflare-Dashboard beim Worker ein Secret <b>STATS_KEY</b> (dein Passwort) eintragen.</p>');
  const auth = request.headers.get('Authorization') || '';
  const pass = auth.startsWith('Basic ') ? (atob(auth.slice(6)).split(':').slice(1).join(':')) : '';
  if (!pass || !(await sameText(pass, env.STATS_KEY))) {
    return html(401, '<h1>Passwort nötig</h1><p class="muted">Benutzername egal, Passwort = dein STATS_KEY.</p>', { 'WWW-Authenticate': 'Basic realm="Statistik", charset="UTF-8"' });
  }
  if (!env.STATS) return html(500, '<h1>Datenbank fehlt</h1>');
  const today = berlinDay();
  const ago = (n) => berlinDay(new Date(Date.now() - n * 86400000));
  const q = (sql, ...args) => env.STATS.prepare(sql).bind(...args);
  const [tot, act7, act30, plat, newDays, actDays] = await env.STATS.batch([
    q('SELECT COUNT(*) AS n, SUM(installed) AS inst, SUM(hit_good) AS hg, SUM(hit_ok) AS ho, SUM(hit_bad) AS hb FROM devices'),
    q('SELECT COUNT(DISTINCT id) AS n FROM visits WHERE day >= ?', ago(6)),
    q('SELECT COUNT(DISTINCT id) AS n FROM visits WHERE day >= ?', ago(29)),
    q('SELECT platform, COUNT(*) AS n, SUM(installed) AS inst FROM devices GROUP BY platform ORDER BY n DESC'),
    q('SELECT first_day AS day, COUNT(*) AS n FROM devices WHERE first_day >= ? GROUP BY first_day', ago(29)),
    q('SELECT day, COUNT(*) AS n FROM visits WHERE day >= ? GROUP BY day', ago(29)),
  ]);
  const t = tot.results[0] || { n: 0, inst: 0 };
  const nNew = Object.fromEntries(newDays.results.map((r) => [r.day, r.n]));
  const nAct = Object.fromEntries(actDays.results.map((r) => [r.day, r.n]));
  const max = Math.max(1, ...Object.values(nAct));
  const names = { android: 'Android', ios: 'iPhone/iPad', desktop: 'Computer' };
  const rows = Array.from({ length: 30 }, (_, i) => ago(i)).map((d) => `<tr><td>${d.slice(8)}.${d.slice(5, 7)}.</td><td class="n">${nNew[d] || 0}</td><td class="n">${nAct[d] || 0}</td><td><div class="bar" style="width:${Math.round(((nAct[d] || 0) / max) * 100)}%"></div></td></tr>`).join('');
  return html(200, `
    <h1>Was schaue ich? – Nutzung</h1>
    <div class="big">
      <div><b>${t.n}</b>Geräte insgesamt</div>
      <div><b>${nNew[today] || 0}</b>neu heute</div>
      <div><b>${act7.results[0].n}</b>aktiv (7 Tage)</div>
      <div><b>${act30.results[0].n}</b>aktiv (30 Tage)</div>
      <div><b>${t.inst || 0}</b>installiert</div>
    </div>
    <h2>Trefferquote der Vorschläge</h2>
    ${(t.hg || 0) + (t.ho || 0) + (t.hb || 0) ? `<p>Wegen eines Vorschlags geschaut, gelesen oder gespielt: <b>${(t.hg || 0) + (t.ho || 0) + (t.hb || 0)}</b> – davon gefallen <b>${t.hg || 0}</b> (${Math.round(((t.hg || 0) / ((t.hg || 0) + (t.ho || 0) + (t.hb || 0))) * 100)} %), okay ${t.ho || 0}, nicht gefallen ${t.hb || 0}.</p>` : '<p class="muted">Noch nichts gezählt.</p>'}
    <p class="muted">Stand: letzte Meldung jedes Geräts (einmal am Tag).</p>
    <h2>Geräte</h2>
    <table>${plat.results.map((r) => `<tr><td>${names[r.platform] || r.platform}</td><td class="n">${r.n}</td><td class="muted">davon installiert: ${r.inst || 0}</td></tr>`).join('')}</table>
    <h2>Letzte 30 Tage</h2>
    <table><tr><th>Tag</th><th>neu</th><th>aktiv</th><th></th></tr>${rows}</table>
    <p class="muted">Gezählt wird ein Gerät, nicht eine Person. iPhones im Browser zählen erst, wenn dort ein Profil angelegt wurde (sonst wäre jedes iPhone doppelt drin: Safari und Home-Bildschirm haben getrennte Speicher). Gelöschte Browserdaten = neues Gerät.</p>`);
}
