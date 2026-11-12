// Cloudflare Worker: reicht Leseanfragen an TMDB weiter und ergänzt dabei den
// geheimen Schlüssel (Secret TMDB_TOKEN). Der Schlüssel verlässt den Worker nie.

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

export default {
  async fetch(request, env) {
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
    const route = ROUTES.find(([re]) => re.test(url.pathname));
    if (!route) return reply(403, { error: 'Adresse nicht erlaubt' });

    if (env.RATE_LIMITER) {
      const ip = request.headers.get('CF-Connecting-IP') || 'unbekannt';
      const { success } = await env.RATE_LIMITER.limit({ key: ip });
      if (!success) return reply(429, { error: 'Zu viele Anfragen – kurz warten' }, { 'Retry-After': '10' });
    }

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
