// Prüft unsere Annahmen über TMDB – über den echten Worker.
// Aufruf: npm run check
// Gibt pro Annahme OK, HINWEIS oder FEHLT aus.

const WORKER = process.env.WORKER_URL || 'https://film-app-tmdb.film-app.workers.dev';
const ORIGIN = 'http://localhost:5500';

async function api(path, params = {}, origin = ORIGIN) {
  const url = `${WORKER}/3/${path}?${new URLSearchParams(params)}`;
  let res = await fetch(url, { headers: origin ? { Origin: origin } : {} });
  for (let i = 0; res.status === 429 && i < 6; i++) {
    await new Promise((r) => setTimeout(r, 10000)); // Missbrauchsschutz: kurz warten
    res = await fetch(url, { headers: origin ? { Origin: origin } : {} });
  }
  const body = await res.json().catch(() => ({}));
  return { status: res.status, headers: res.headers, body };
}

const results = [];
const report = (status, title, detail = '') => {
  results.push(status);
  console.log(`${status.padEnd(7)} ${title}${detail ? '\n        ' + detail : ''}`);
};

console.log(`\nPrüfe TMDB über ${WORKER}\n`);

// 1. Worker + Schlüssel
{
  const r = await api('configuration');
  r.status === 200 ? report('OK', 'Schlüssel funktioniert') : report('FEHLT', 'Schlüssel funktioniert', `Status ${r.status}: ${JSON.stringify(r.body)}`);
  const cc = r.headers.get('cache-control') || '';
  cc.includes('max-age') ? report('OK', 'Worker setzt Zwischenspeicher-Angabe', cc) : report('FEHLT', 'Worker setzt Zwischenspeicher-Angabe');
}

// 2. Schutz
{
  const a = await api('configuration', {}, 'https://fremde-seite.example');
  const b = await api('account', {});
  a.status === 403 && b.status === 403
    ? report('OK', 'Worker lehnt fremde Seiten und fremde Adressen ab')
    : report('FEHLT', 'Worker-Schutz', `fremde Seite: ${a.status}, fremde Adresse: ${b.status}`);
}

// 3. Poster je Sprache
{
  const ids = [278, 603, 129, 680, 13, 120, 19404];
  const detail = [];
  let differ = 0;
  for (const id of ids) {
    const de = (await api(`movie/${id}`, { language: 'de-DE' })).body;
    const en = (await api(`movie/${id}`, { language: 'en-US' })).body;
    if (de.poster_path !== en.poster_path) differ++;
    detail.push(`${en.title} → DE „${de.title}“, Poster ${de.poster_path === en.poster_path ? 'gleich' : 'verschieden'}`);
  }
  report(differ ? 'OK' : 'HINWEIS', `Details: Poster unterscheidet sich je Sprache (${differ}/${ids.length})`, detail.join('\n        '));

  const ld = (await api('discover/movie', { language: 'de-DE', sort_by: 'vote_count.desc' })).body.results || [];
  const le = (await api('discover/movie', { language: 'en-US', sort_by: 'vote_count.desc' })).body.results || [];
  const map = new Map(le.map((m) => [m.id, m.poster_path]));
  const d = ld.filter((m) => map.has(m.id) && map.get(m.id) !== m.poster_path).length;
  report(d ? 'OK' : 'HINWEIS', `Listen: Poster unterscheidet sich je Sprache (${d}/${ld.length})`);
}

// 4. Suche deutsch + englisch
{
  const de = (await api('search/movie', { query: 'Die Verurteilten', language: 'de-DE' })).body.results || [];
  const en = (await api('search/movie', { query: 'The Shawshank Redemption', language: 'de-DE' })).body.results || [];
  const ok = de.some((m) => m.id === 278) && en.some((m) => m.id === 278);
  report(ok ? 'OK' : 'FEHLT', 'Suche findet denselben Film unter deutschem und englischem Titel');
}

// 5. Filter
{
  const base = { sort_by: 'vote_count.desc', 'vote_count.gte': 300 };
  const all = (await api('discover/movie', base)).body.total_results;
  const kr = (await api('discover/movie', { ...base, with_origin_country: 'KR' })).body;
  const ko = (await api('discover/movie', { ...base, with_original_language: 'ko' })).body;
  const krOk = kr.total_results < all && (kr.results || []).every((m) => (m.origin_country || []).includes('KR'));
  report(krOk ? 'OK' : 'HINWEIS', `Länderfilter (with_origin_country): ${kr.total_results} von ${all}`);
  const koOk = ko.total_results < all && (ko.results || []).every((m) => m.original_language === 'ko');
  report(koOk ? 'OK' : 'FEHLT', `Sprachfilter (with_original_language): ${ko.total_results} von ${all}`);

  const andR = (await api('discover/movie', { ...base, with_genres: '35,16' })).body.total_results;
  const orR = (await api('discover/movie', { ...base, with_genres: '35|16' })).body.total_results;
  report(orR > andR ? 'OK' : 'HINWEIS', `Genre: Komma = UND (${andR}), Strich | = ODER (${orR})`);

  const rt = (await api('discover/movie', { ...base, 'with_runtime.lte': 130 })).body.total_results;
  report(rt < all ? 'OK' : 'HINWEIS', `Längenfilter (with_runtime.lte=130): ${rt} von ${all}`);
}

// 6. Altersfreigabe
{
  const base = { sort_by: 'vote_count.desc', 'vote_count.gte': 300, with_genres: '10751|16' };
  const de6 = (await api('discover/movie', { ...base, certification_country: 'DE', 'certification.lte': '6' })).body;
  const us = (await api('discover/movie', { ...base, certification_country: 'US', certification: 'G|PG' })).body;
  report(de6.total_results > 20 ? 'OK' : 'HINWEIS', `FSK-Filter DE bis 6: ${de6.total_results} Filme`, (de6.results || []).slice(0, 5).map((m) => m.title).join(', '));
  report(us.total_results > 20 ? 'OK' : 'HINWEIS', `US-Freigabe G/PG: ${us.total_results} Filme`);
  const top = (de6.results || []).slice(0, 3);
  for (const m of top) {
    const rd = (await api(`movie/${m.id}/release_dates`)).body.results || [];
    const deCert = rd.find((r) => r.iso_3166_1 === 'DE')?.release_dates?.map((x) => x.certification).filter(Boolean).join('/') || '–';
    console.log(`        Stichprobe ${m.title}: FSK ${deCert}`);
  }
}

// 7. Inhaltsangabe auf Deutsch
{
  const list = (await api('discover/movie', { language: 'de-DE', sort_by: 'vote_count.desc', 'vote_count.gte': 300, page: 5 })).body.results || [];
  const empty = list.filter((m) => !m.overview).length;
  report(empty < list.length / 2 ? 'OK' : 'HINWEIS', `Deutsche Inhaltsangabe fehlt bei ${empty} von ${list.length} Filmen (Stichprobe)`);
}

// 8. Studios
{
  const names = ['A24', 'Neon', 'Blumhouse Productions', 'Studio Ghibli', 'Focus Features', 'Searchlight Pictures',
    'Annapurna Pictures', 'Plan B Entertainment', 'StudioCanal', 'X Filme Creative Pool', 'Toho', 'CJ Entertainment',
    'Pixar', 'Warner Bros. Pictures', 'Universal Pictures', 'Aardman', 'Laika', 'Constantin Film'];
  console.log('STUDIOS (Name → Nummer, Anzahl Filme mit ≥ 100 Stimmen)');
  for (const name of names) {
    const hits = ((await api('search/company', { query: name })).body.results || []).slice(0, 4);
    const rows = [];
    for (const c of hits) {
      const n = (await api('discover/movie', { with_companies: c.id, 'vote_count.gte': 100 })).body.total_results;
      rows.push({ id: c.id, name: c.name, land: c.origin_country, n });
    }
    rows.sort((a, b) => b.n - a.n);
    const best = rows[0];
    console.log(`        ${name.padEnd(24)} → ${best ? `${best.id} „${best.name}“ (${best.land || '?'}) ${best.n} Filme` : 'nicht gefunden'}${rows[1] && rows[1].n > 0 ? `   [auch: ${rows[1].id} ${rows[1].n}]` : ''}`);
  }
}

const bad = results.filter((s) => s === 'FEHLT').length;
console.log(`\n${bad ? `✋ ${bad} Annahme(n) stimmen nicht – Plan anpassen.` : '✓ Alle wichtigen Annahmen stimmen.'}\n`);
process.exit(bad ? 1 : 0);
