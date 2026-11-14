// Prüft unsere Annahmen über IGDB – NUR über den Worker (der Rechner braucht keine Zugangsdaten).
// Aufruf: node scripts/check-igdb.js
// Gibt pro Annahme OK, HINWEIS oder FEHLT aus und listet die Nummern, die die App braucht.

const WORKER = process.env.WORKER_URL || 'https://film-app-tmdb.film-app.workers.dev';
const ORIGIN = 'http://localhost:5500';

async function api(path, origin = ORIGIN) {
  const headers = origin ? { Origin: origin } : {};
  let res = await fetch(`${WORKER}${path}`, { headers });
  for (let i = 0; res.status === 429 && i < 5; i++) {
    await new Promise((r) => setTimeout(r, 3000));
    res = await fetch(`${WORKER}${path}`, { headers });
  }
  const body = await res.json().catch(() => ({}));
  return { status: res.status, headers: res.headers, body };
}
const results = [];
const report = (status, title, detail = '') => {
  results.push(status);
  console.log(`${status.padEnd(7)} ${title}${detail ? '\n        ' + detail : ''}`);
};

console.log(`\nPrüfe IGDB über ${WORKER}\n`);

// 1. Zugang
const plats = await api('/igdb/meta/platforms');
if (plats.status !== 200) {
  report('FEHLT', 'Twitch-Zugang im Worker', `Status ${plats.status}: ${JSON.stringify(plats.body)}`);
  process.exit(1);
}
report('OK', 'Twitch-Zugang im Worker funktioniert', `${plats.body.length} Plattformen`);

// 2. Plattform-Nummern (nicht raten – nachschlagen)
const want = {
  'PC/Steam Deck': /^PC \(Microsoft Windows\)$/, 'PlayStation 5': /^PlayStation 5$/, 'PlayStation 4': /^PlayStation 4$/,
  'Xbox Series': /^Xbox Series X\|S$/, 'Xbox One': /^Xbox One$/, 'Nintendo Switch 2': /^Nintendo Switch 2$/, 'Nintendo Switch': /^Nintendo Switch$/,
  'Linux': /^Linux$/, 'Mac': /^Mac$/, 'PlayStation 3': /^PlayStation 3$/, 'Xbox 360': /^Xbox 360$/, 'Wii U': /^Wii U$/, 'Wii': /^Wii$/,
};
const found = {};
for (const [k, re] of Object.entries(want)) {
  const p = plats.body.find((x) => re.test(x.name));
  found[k] = p?.id;
  p ? report('OK', `Plattform ${k}`, `Nummer ${p.id} (${p.name})`) : report('FEHLT', `Plattform ${k}`);
}

// 3. Weitere Nummern
for (const [list, names] of [
  ['genres', ['Indie', 'Role-playing (RPG)', 'Shooter', 'Adventure', 'Platform', 'Puzzle', 'Strategy', 'Racing', 'Fighting', 'Simulator', 'Sport']],
  ['game_modes', ['Single player', 'Multiplayer', 'Co-operative', 'Split screen', 'Massively Multiplayer Online (MMO)', 'Battle Royale']],
  ['game_types', ['main_game', 'standalone_expansion', 'remake', 'remaster', 'expanded_game', 'port', 'dlc_addon', 'bundle']],
  ['game_statuses', ['released', 'alpha', 'beta', 'early_access', 'cancelled', 'rumored']],
]) {
  const r = await api(`/igdb/meta/${list}`);
  if (r.status !== 200) { report('FEHLT', `Liste ${list}`, `Status ${r.status}`); continue; }
  const hits = names.map((n) => { const x = r.body.find((e) => e.name === n); return `${n}=${x ? x.id : '?'}`; });
  report(hits.some((h) => h.endsWith('?')) ? 'HINWEIS' : 'OK', `Nummern ${list}`, hits.join(' · '));
}

// 4. Suche, Details, Trailer, ähnliche
const s = await api('/igdb/search?q=' + encodeURIComponent('hades'));
const hades = (s.body || []).find((g) => g.name === 'Hades');
hades ? report('OK', 'Suche findet „Hades“', `Nummer ${hades.id}, Bewertung ${Math.round(hades.total_rating)} (${hades.total_rating_count})`) : report('FEHLT', 'Suche findet „Hades“', JSON.stringify(s.body).slice(0, 200));
const bad = await api('/igdb/search?q=' + encodeURIComponent('x"; fields *; limit 500;'));
bad.status === 200 && bad.body.length <= 30 ? report('OK', 'Suche mit Sonderzeichen bleibt harmlos', `${bad.body.length} Treffer`) : report('HINWEIS', 'Suche mit Sonderzeichen', `Status ${bad.status}`);
const witcher = (await api('/igdb/search?q=' + encodeURIComponent('witcher 3 wild hunt'))).body?.[0];
const de = witcher?.game_localizations?.map((l) => `${l.name} (Region ${l.region})`).join(', ');
report(witcher ? 'OK' : 'FEHLT', 'Lokalisierte Titel', witcher ? `${witcher.name}: ${de || 'keine Lokalisierung eingetragen'}` : '');
const regions = await api('/igdb/meta/regions');
report(regions.status === 200 ? 'OK' : 'HINWEIS', 'Regionen', (regions.body || []).map((r) => `${r.id}=${r.name}`).join(' · '));

if (hades) {
  const d = await api(`/igdb/game/${hades.id}`);
  const g = d.body?.[0] || {};
  report(g.videos?.length ? 'OK' : 'HINWEIS', 'Trailer (YouTube-Nummer)', g.videos?.slice(0, 2).map((v) => `${v.name}: ${v.video_id}`).join(' · '));
  report(g.similar_games?.length ? 'OK' : 'FEHLT', 'Ähnliche Spiele', `${g.similar_games?.length || 0} Stück`);
  const sim = await api(`/igdb/similar/${hades.id}`);
  report(sim.body?.length ? 'OK' : 'FEHLT', 'Adresse /igdb/similar', (sim.body || []).slice(0, 5).map((x) => x.name).join(', '));
  report(g.multiplayer_modes ? 'OK' : 'HINWEIS', 'Mehrspieler-Angaben bei Hades', JSON.stringify(g.multiplayer_modes || 'keine (Einzelspieler)'));
  const t = await api(`/igdb/time?ids=${hades.id},1942`);
  const fmt = (x) => `${x.game_id}: normal ${Math.round(x.normally / 3600)} Std. (${x.count} Angaben)`;
  report(t.body?.length ? 'OK' : 'FEHLT', 'Spielzeit (game_time_to_beats)', (t.body || []).map(fmt).join(' · '));
}

// 5. Couch-Koop am Beispiel It Takes Two
const itt = (await api('/igdb/search?q=' + encodeURIComponent('it takes two'))).body?.find((g) => g.name === 'It Takes Two');
report(itt?.multiplayer_modes?.some((m) => m.offlinecoop || m.splitscreen) ? 'OK' : 'HINWEIS', 'Couch-Koop erkennbar (It Takes Two)', JSON.stringify(itt?.multiplayer_modes || '-').slice(0, 300));

// 6. Entdecken nach Plattform/Genre
if (found['Nintendo Switch']) {
  const d = await api(`/igdb/discover?platforms=${found['Nintendo Switch']}&genres=32&min=15&rating=75`);
  report(d.body?.length ? 'OK' : 'FEHLT', 'Entdecken: Indies auf Switch', (d.body || []).slice(0, 6).map((x) => x.name).join(', '));
}

// 7. Zwischenspeicher bei Cloudflare
{
  const p = `/igdb/games?ids=1942,${hades?.id || 1}`;
  await api(p);
  await new Promise((r) => setTimeout(r, 1500));
  const r2 = await api(p);
  const x = r2.headers.get('x-cache');
  report(x === 'HIT' ? 'OK' : 'HINWEIS', 'Zwischenspeicher (caches.default) auf workers.dev', `zweiter Abruf: ${x}; Browser: ${r2.headers.get('cache-control')}`);
}

// 8. Schutz
{
  const a = await api('/igdb/meta/platforms', 'https://fremde-seite.example');
  const b = await api('/igdb/frei?query=fields%20*');
  const c = await api('/igdb/games?ids=abc');
  a.status === 403 && b.status === 403 && c.status === 403 ? report('OK', 'Fremde Seiten, freie Abfragen und falsche Nummern werden abgelehnt') : report('FEHLT', 'Schutz', `${a.status} ${b.status} ${c.status}`);
}

const bad2 = results.filter((r) => r === 'FEHLT').length;
console.log(`\n${bad2 ? `✋ ${bad2} Annahme(n) stimmen nicht.` : '✓ Alle wichtigen Annahmen stimmen.'}\n`);
