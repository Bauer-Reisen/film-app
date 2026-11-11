// Prüft Themen-Stichwörter bei TMDB: gibt es sie, und wie viele gute Filme haben sie?
// Aufruf: node scripts/check-themes.js
const WORKER = 'https://film-app-tmdb.film-app.workers.dev';
const api = async (path, params) => {
  for (let i = 0; i < 8; i++) {
    const r = await fetch(`${WORKER}/3/${path}?${new URLSearchParams(params)}`, { headers: { Origin: 'http://localhost:5500' } });
    if (r.status === 429) { await new Promise((ok) => setTimeout(ok, 8000)); continue; }
    return r.json();
  }
};
const WORDS = process.argv.slice(2).length ? process.argv.slice(2) : `underdog|rags to riches|sports|time travel|heist|revenge|road trip|road movie|coming of age|based on true story|biography|survival|courtroom|single location|friendship|dystopia|space|outer space|dark comedy|black comedy|satire|twist ending|plot twist|nonlinear timeline|mind bending|conspiracy|musician|female protagonist|feel good|one take|long take|cult film|zombie|superhero|spy|mafia|gangster|whodunit|buddy comedy|romantic comedy|dialogue|dialogue driven|philosophy|artificial intelligence|parody|slapstick|mockumentary|serial killer|haunted house|post-apocalyptic future|cyberpunk|martial arts|samurai|dysfunctional family|small town|high school|wedding|christmas|underwater|prison|escape|hacker|alien|dinosaur|robot|time loop|amnesia|parallel world|dream|visually stunning|stylized violence|anti hero|family relationships|mentor|teacher|chess|music|dance|cooking|food|wine|journalism|politics|war crimes|holocaust|cold war|new york city|paris, france|tokyo, japan`.split('|');

for (const w of WORDS) {
  const res = (await api('search/keyword', { query: w })).results || [];
  const k = res.find((x) => x.name.toLowerCase() === w.toLowerCase());
  if (!k) { console.log(`--  ${w.padEnd(28)} nicht gefunden (${res.slice(0, 3).map((x) => x.name).join(', ')})`); continue; }
  const d = await api('discover/movie', { with_keywords: k.id, 'vote_count.gte': 200, 'vote_average.gte': 6.5 });
  const top = (d.results || []).slice(0, 3).map((m) => m.title).join(', ');
  console.log(`${String(d.total_results).padStart(4)} ${w.padEnd(28)} id ${String(k.id).padEnd(7)} ${top}`);
}
