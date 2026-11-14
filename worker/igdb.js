// Spiele: IGDB über Twitch-Zugang (Secrets TWITCH_CLIENT_ID / TWITCH_CLIENT_SECRET).
// Von außen kommen NUR feste Adressen mit Zahlen/kurzem Suchtext. Die eigentliche
// IGDB-Abfrage baut der Worker selbst – mit festen Feldern und fester Obergrenze.

const DAY = 86400;

// Felder, die die App für eine Spielkarte braucht
const CARD = [
  'name', 'cover.image_id', 'first_release_date', 'genres', 'themes', 'platforms',
  'total_rating', 'total_rating_count', 'game_modes', 'game_type', 'franchises', 'collections',
  'multiplayer_modes.platform', 'multiplayer_modes.offlinecoop', 'multiplayer_modes.offlinecoopmax',
  'multiplayer_modes.onlinecoop', 'multiplayer_modes.splitscreen', 'multiplayer_modes.offlinemax',
  'game_localizations.name', 'game_localizations.region',
].join(',');
const DETAIL = `${CARD},summary,similar_games,videos.video_id,videos.name,involved_companies.company.name,involved_companies.developer`;

// Nur Hauptspiele, Remakes, Remaster, eigenständige Erweiterungen (Nummern: siehe check-igdb.js)
const TYPES = '(0,4,8,9)';

const ints = (s, max = 50) => {
  const list = String(s || '').split(',').map((x) => x.trim()).filter((x) => /^\d{1,9}$/.test(x)).map(Number);
  return [...new Set(list)].slice(0, max);
};
const int = (s, lo, hi, dflt) => {
  const n = /^\d{1,9}$/.test(String(s ?? '')) ? Number(s) : dflt;
  return Math.min(hi, Math.max(lo, n));
};
// Suchtext: nur Buchstaben, Ziffern, Leerzeichen, höchstens 60 Zeichen
const cleanText = (s) =>
  String(s || '').replace(/['’]/g, '').replace(/[^\p{L}\p{N} ]+/gu, ' ').replace(/\s+/g, ' ').trim().slice(0, 60)
    .replace(/[\\"]/g, (c) => '\\' + c).replace(/;/g, '');

// Feste Adressen → [Endpunkt, Abfrage, Sekunden im Zwischenspeicher] oder null
function build(path, q) {
  let m;
  if (path === '/igdb/search') {
    const t = cleanText(q.get('q'));
    if (t.length < 2) return null;
    return ['games', `search "${t}"; fields ${CARD}; where game_type = ${TYPES} & version_parent = null; limit 30;`, DAY];
  }
  if ((m = path.match(/^\/igdb\/game\/(\d{1,9})$/))) return ['games', `fields ${DETAIL}; where id = ${m[1]};`, 7 * DAY];
  if (path === '/igdb/games') {
    const ids = ints(q.get('ids'));
    if (!ids.length) return null;
    return ['games', `fields ${CARD}; where id = (${ids.join(',')}); limit 50;`, 7 * DAY];
  }
  if ((m = path.match(/^\/igdb\/similar\/(\d{1,9})$/))) {
    return ['similar', `fields similar_games; where id = ${m[1]};`, 7 * DAY]; // zweiter Schritt unten
  }
  if (path === '/igdb/discover') {
    const plats = ints(q.get('platforms'), 30);
    if (!plats.length) return null;
    const where = [`platforms = (${plats.join(',')})`, `game_type = ${TYPES}`, 'version_parent = null',
      `total_rating_count >= ${int(q.get('min'), 5, 5000, 50)}`, `total_rating >= ${int(q.get('rating'), 0, 100, 0)}`];
    const genre = ints(q.get('genres'), 5);
    if (genre.length) where.push(`genres = (${genre.join(',')})`);
    const mode = ints(q.get('modes'), 6);
    if (mode.length) where.push(`game_modes = (${mode.join(',')})`);
    // nur erschienene Spiele (bis heute), auf Wunsch Zeitraum
    const from = int(q.get('from'), 1970, 2100, 1970), to = int(q.get('to'), 1970, 2100, 2100);
    const until = Math.min(Date.UTC(to + 1, 0, 1), Date.now()) / 1000 | 0;
    where.push(`first_release_date >= ${Date.UTC(from, 0, 1) / 1000}`, `first_release_date < ${until}`);
    const sort = q.get('sort') === 'rating' ? 'total_rating desc' : 'total_rating_count desc';
    return ['games', `fields ${CARD}; where ${where.join(' & ')}; sort ${sort}; limit 50; offset ${int(q.get('offset'), 0, 1000, 0)};`, DAY];
  }
  if (path === '/igdb/time') {
    const ids = ints(q.get('ids'));
    if (!ids.length) return null;
    return ['game_time_to_beats', `fields game_id,hastily,normally,completely,count; where game_id = (${ids.join(',')}); limit 50;`, 7 * DAY];
  }
  // Nachschlage-Listen (für Prüfskript und App): Nummer → Name
  if ((m = path.match(/^\/igdb\/meta\/(platforms|genres|game_modes|game_types|game_statuses|themes|regions)$/))) {
    const extra = { platforms: ',name,abbreviation,platform_family', game_types: ',type', game_statuses: ',status' }[m[1]] ?? ',name';
    const ep = m[1] === 'regions' ? 'regions' : m[1];
    return [ep, `fields id${extra}; sort id asc; limit 500;`, 7 * DAY];
  }
  return null;
}

export const isIgdb = (path) => path.startsWith('/igdb/');

// Twitch-Zugang nur im Speicher (nie zwischenspeichern, nie ins Log)
let token = null; // { value, until }
async function getToken(env, fresh = false) {
  if (!fresh && token && Date.now() < token.until) return token.value;
  const params = new URLSearchParams({ client_id: env.TWITCH_CLIENT_ID, client_secret: env.TWITCH_CLIENT_SECRET, grant_type: 'client_credentials' });
  const res = await fetch(`https://id.twitch.tv/oauth2/token?${params}`, { method: 'POST' });
  if (!res.ok) throw new Error('twitch');
  const j = await res.json();
  token = { value: j.access_token, until: Date.now() + (j.expires_in - 300) * 1000 }; // 5 Min. Puffer
  return token.value;
}

async function igdb(env, endpoint, body) {
  for (let attempt = 0; attempt < 2; attempt++) {
    const t = await getToken(env, attempt > 0);
    const res = await fetch(`https://api.igdb.com/v4/${endpoint}`, {
      method: 'POST',
      headers: { 'Client-ID': env.TWITCH_CLIENT_ID, Authorization: `Bearer ${t}`, Accept: 'application/json' },
      body,
    });
    if (res.status === 401 && attempt === 0) { token = null; continue; } // einmal neu holen
    return res;
  }
}

export async function handleIgdb(request, env, ctx, reply) {
  const url = new URL(request.url);
  const job = build(url.pathname, url.searchParams);
  if (!job) return reply(403, { error: 'Adresse nicht erlaubt' });
  if (!env.TWITCH_CLIENT_ID || !env.TWITCH_CLIENT_SECRET) return reply(500, { error: 'Zugang fehlt im Worker (Secrets TWITCH_CLIENT_ID / TWITCH_CLIENT_SECRET)' });
  const [endpoint, body, maxAge] = job;

  // Zwischenspeicher bei Cloudflare (Schlüssel = Adresse ohne Header)
  const key = new Request(`https://cache.film-app/${url.pathname}?${[...url.searchParams].sort().map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&')}`);
  const cache = typeof caches !== 'undefined' ? caches.default : null;
  if (cache) {
    const hit = await cache.match(key);
    if (hit) return reply(200, await hit.text(), { 'Cache-Control': `public, max-age=${maxAge}`, 'X-Cache': 'HIT' });
  }

  let res;
  try {
    if (endpoint === 'similar') {
      const first = await igdb(env, 'games', body);
      const ids = first.ok ? ((await first.json())[0]?.similar_games || []).slice(0, 20) : [];
      res = ids.length ? await igdb(env, 'games', `fields ${CARD}; where id = (${ids.join(',')}); limit 20;`) : first.ok ? new Response('[]') : first;
    } else res = await igdb(env, endpoint, body);
  } catch { return reply(502, { error: 'IGDB nicht erreichbar' }); }
  const text = await res.text();
  if (!res.ok) return reply(res.status === 429 ? 429 : 502, { error: `IGDB antwortet ${res.status}`, detail: text.slice(0, 300) }, { 'Cache-Control': 'no-store', ...(res.status === 429 ? { 'Retry-After': '2' } : {}) });
  if (cache) {
    const stored = new Response(text, { headers: { 'Content-Type': 'application/json', 'Cache-Control': `public, max-age=${maxAge}` } });
    ctx.waitUntil(cache.put(key, stored));
  }
  return reply(200, text, { 'Cache-Control': `public, max-age=${maxAge}`, 'X-Cache': 'MISS' });
}
