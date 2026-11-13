// Baut die Startauswahl für Serien (docs/js/seeds-tv.js): Serien, Serien-Personen und Sender
// mit Titel und Poster auf Deutsch und Englisch. Läuft über den Worker.
// Aufruf: node scripts/make-seeds-tv.js   (dauert einige Minuten wegen des Missbrauchsschutzes)
// Zwischenergebnisse liegen in .seed-cache-tv.json, damit ein Abbruch nicht alles neu startet.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const WORKER = 'https://film-app-tmdb.film-app.workers.dev';
const CACHE = '.seed-cache-tv.json';
const cache = existsSync(CACHE) ? JSON.parse(readFileSync(CACHE, 'utf8')) : {};
const saveCache = () => writeFileSync(CACHE, JSON.stringify(cache));

async function api(path, params = {}) {
  const key = path + '?' + new URLSearchParams(params);
  if (cache[key]) return cache[key];
  for (let i = 0; i < 12; i++) {
    const res = await fetch(`${WORKER}/3/${key}`, { headers: { Origin: 'http://localhost:5500' } });
    if (res.status === 429) { await new Promise((r) => setTimeout(r, 10000)); continue; }
    const body = await res.json();
    if (!res.ok) throw new Error(`${key}: ${res.status} ${JSON.stringify(body)}`);
    cache[key] = body;
    saveCache();
    return body;
  }
  throw new Error(`${key}: zu oft abgewiesen`);
}

// ---------- Serien: quer durch Jahrzehnte, Genres und Länder (englischer Titel | Startjahr) ----------
const SHOWS = `
The Twilight Zone|1959; Star Trek|1966; Monty Python's Flying Circus|1969; Sesame Street|1969; Columbo|1971; M*A*S*H|1972;
Heidi|1974; Derrick|1974; Fawlty Towers|1975; Maya the Bee|1975; The Muppet Show|1976; Dallas|1978; Magnum, P.I.|1980;
Meister Eder und sein Pumuckl|1982; Knight Rider|1982; Cheers|1982; The A-Team|1983; Blackadder|1983; Miami Vice|1984;
MacGyver|1985; The Golden Girls|1985; Star Trek: The Next Generation|1987; Married... with Children|1987; The Simpsons|1989;
Seinfeld|1989; Dragon Ball Z|1989; Baywatch|1989; Twin Peaks|1990; The Fresh Prince of Bel-Air|1990; Mr. Bean|1990; Pingu|1990;
Absolutely Fabulous|1992; Frasier|1993; The X-Files|1993; Friends|1994; ER|1994; Neon Genesis Evangelion|1995;
Pride and Prejudice|1995; Buffy the Vampire Slayer|1997; Pokémon|1997; Cowboy Bebop|1998; Sex and the City|1998;
The Sopranos|1999; The West Wing|1999; SpongeBob SquarePants|1999; One Piece|1999; Inspector Montalbano|1999;
Gilmore Girls|2000; Curb Your Enthusiasm|2000; Six Feet Under|2001; 24|2001; Band of Brothers|2001; The Office|2001;
The Wire|2002; Naruto|2002; Arrested Development|2003; Lost|2004; Desperate Housewives|2004; Stromberg|2004; Peppa Pig|2004;
Grey's Anatomy|2005; The Office|2005; Prison Break|2005; How I Met Your Mother|2005; Doctor Who|2005; Kaamelott|2005;
Avatar: The Last Airbender|2005; Spiral|2005; Dexter|2006; 30 Rock|2006; Death Note|2006; The IT Crowd|2006;
Türkisch für Anfänger|2006; Mad Men|2007; The Big Bang Theory|2007; Skins|2007; The Killing|2007; Shaun the Sheep|2007;
Breaking Bad|2008; Sons of Anarchy|2008; Parks and Recreation|2009; Modern Family|2009; Community|2009;
Fullmetal Alchemist: Brotherhood|2009; Midnight Diner|2009; The Walking Dead|2010; Boardwalk Empire|2010; Sherlock|2010;
Downton Abbey|2010; Luther|2010; Borgen|2010; Adventure Time|2010; Prisoners of War|2010; Game of Thrones|2011; Homeland|2011;
Black Mirror|2011; The Bridge|2011; Der Tatortreiniger|2011; Magnificent Century|2011; Top Boy|2011; Veep|2012; Line of Duty|2012;
Lilyhammer|2012; Gravity Falls|2012; The Returned|2012; House of Cards|2013; Orange Is the New Black|2013; Brooklyn Nine-Nine|2013;
Peaky Blinders|2013; Broadchurch|2013; Attack on Titan|2013; Rick and Morty|2013; Hannibal|2013; Orphan Black|2013; Shtisel|2013;
PAW Patrol|2013; True Detective|2014; Fargo|2014; The Leftovers|2014; BoJack Horseman|2014; Happy Valley|2014; Gomorrah|2014;
Inside No. 9|2014; Better Call Saul|2015; Mr. Robot|2015; Narcos|2015; Schitt's Creek|2015; Deutschland 83|2015; Fauda|2015;
Call My Agent!|2015; The Bureau|2015; Skam|2015; Trapped|2015; Reply 1988|2015; Club de Cuervos|2015; Occupied|2015;
Stranger Things|2016; Westworld|2016; The Crown|2016; Atlanta|2016; This Is Us|2016; The Good Place|2016; Fleabag|2016;
Guardian: The Lonely and Great God|2016; 3%|2016; Dark|2017; Babylon Berlin|2017; Money Heist|2017; Big Little Lies|2017;
The Handmaid's Tale|2017; Mindhunter|2017; Ozark|2017; The Marvelous Mrs. Maisel|2017; 4 Blocks|2017; Charité|2017;
Anne with an E|2017; Suburra|2017; Succession|2018; Barry|2018; Killing Eve|2018; Elite|2018; Sacred Games|2018;
My Brilliant Friend|2018; Derry Girls|2018; Bluey|2018; My Mister|2018; Mr Inbetween|2018; Das Boot|2018; Euphoria|2019;
Chernobyl|2019; The Mandalorian|2019; Watchmen|2019; The Boys|2019; Sex Education|2019; Kingdom|2019;
Crash Landing on You|2019; How to Sell Drugs Online (Fast)|2019; The Family Man|2019; Der Pass|2019; Ted Lasso|2020;
The Queen's Gambit|2020; Normal People|2020; Unorthodox|2020; Bridgerton|2020; Ragnarok|2020; Panchayat|2020; Ethos|2020;
The White Lotus|2021; Squid Game|2021; Only Murders in the Building|2021; Arcane|2021; Lupin|2021; Young Royals|2021;
Severance|2022; The Bear|2022; Wednesday|2022; House of the Dragon|2022; Andor|2022; Slow Horses|2022; Kleo|2022;
Extraordinary Attorney Woo|2022; The Glory|2022; The Last of Us|2023; Beef|2023; Moving|2023;
Frieren: Beyond Journey's End|2023; Shōgun|2024; Baby Reindeer|2024; The Penguin|2024; Adolescence|2025; The Pitt|2025;
The Studio|2025
`.split(';').map((s) => s.trim()).filter(Boolean).map((s) => { const [t, y] = s.split('|'); return { t, y: +y }; });

// Dazu Serien, die in Deutschland besonders viele kennen (lange im Fernsehen gelaufen oder große Streaming-Erfolge)
const SHOWS_DE = `
Alf|1986; Full House|1987; Home Improvement|1991; The Nanny|1993; Beverly Hills, 90210|1990; Sailor Moon|1992;
Alarm für Cobra 11: Die Autobahnpolizei|1996; South Park|1997; Ally McBeal|1997; Stargate SG-1|1997; Charmed|1998;
Dawson's Creek|1998; The King of Queens|1998; Futurama|1999; Family Guy|1999; Digimon Adventure|1999; Malcolm in the Middle|2000;
CSI: Crime Scene Investigation|2000; Scrubs|2001; Smallville|2001; Monk|2002; Berlin, Berlin|2002; Two and a Half Men|2003;
The O.C.|2003; One Tree Hill|2003; NCIS|2003; House|2004; Boston Legal|2004; Bones|2005; Criminal Minds|2005; Supernatural|2005;
Pastewka|2005; Heroes|2006; Psych|2006; Hannah Montana|2006; Gossip Girl|2007; iCarly|2007; Phineas and Ferb|2007;
The Mentalist|2008; True Blood|2008; Merlin|2008; Fringe|2008; Doctor's Diary|2008; The Vampire Diaries|2009; Glee|2009;
Castle|2009; The Good Wife|2009; Der letzte Bulle|2010; Danni Lowinski|2010; Pretty Little Liars|2010; Spartacus|2010;
Suits|2011; Shameless|2011; New Girl|2011; Once Upon a Time|2011; Teen Wolf|2011; American Horror Story|2011; Arrow|2012;
Chicago Fire|2012; Vikings|2013; The Blacklist|2013; The 100|2014; The Flash|2014; Outlander|2014; Jane the Virgin|2014;
Club der roten Bänder|2015; Grace and Frankie|2015; Daredevil|2015; Lucifer|2016; 13 Reasons Why|2017; Riverdale|2017;
The Good Doctor|2017; Jerks.|2017; Bad Banks|2018; You|2018; The Umbrella Academy|2019; The Witcher|2019; Emily in Paris|2020;
Barbarians|2020; Biohackers|2020; Tribes of Europa|2021; Loki|2021; WandaVision|2021; The Rings of Power|2022; Reacher|2022;
One Piece|2023; Fallout|2024
`.split(';').map((s) => s.trim()).filter(Boolean).map((s) => { const [t, y] = s.split('|'); return { t, y: +y }; });

// Aus der Startliste: eher international, in Deutschland wenig bekannt – kommen in der Liste erst später
const INTL = new Set(`Monty Python's Flying Circus; Fawlty Towers; Blackadder; Absolutely Fabulous; Pride and Prejudice; Cowboy Bebop;
Inspector Montalbano; Curb Your Enthusiasm; Six Feet Under; The West Wing; Arrested Development; Kaamelott; Spiral; 30 Rock;
The Killing; Midnight Diner; Prisoners of War; Borgen; Magnificent Century; Top Boy; Veep; Line of Duty; Lilyhammer; The Returned;
Hannibal; Orphan Black; Shtisel; The Leftovers; Happy Valley; Gomorrah; Inside No. 9; Fauda; Call My Agent!; The Bureau; Skam;
Trapped; Reply 1988; Club de Cuervos; Occupied; Guardian: The Lonely and Great God; 3%; Suburra; Sacred Games; My Brilliant Friend;
Derry Girls; My Mister; Mr Inbetween; Kingdom; Crash Landing on You; The Family Man; Ragnarok; Panchayat; Ethos; Kleo;
Extraordinary Attorney Woo; The Glory; Moving; Frieren: Beyond Journey's End; Watchmen; Atlanta; Schitt's Creek; Barry;
Neon Genesis Evangelion; Twin Peaks; The Twilight Zone; Cheers; Frasier`.split(';').map((s) => s.trim()));

// Personen, die vor allem durch Serien bekannt sind. Rolle „director“ = Regie oder Serienidee.
const ACTORS = `Bryan Cranston; Aaron Paul; Bob Odenkirk; Rhea Seehorn; Elisabeth Moss; Jon Hamm; Phoebe Waller-Bridge; Olivia Colman;
Jennifer Aniston; Steve Carell; Sarah Jessica Parker; James Gandolfini; Emilia Clarke; Peter Dinklage; Millie Bobby Brown;
Jenna Ortega; Jeremy Allen White; Jason Sudeikis; Kieran Culkin; Sarah Snook; Gillian Anderson; Lee Jung-jae; Louis Hofmann;
Volker Bruch; Úrsula Corberó; Claire Foy; Hugh Laurie; Benedict Cumberbatch; Kelsey Grammer; Christian Ulmen`
  .split(';').map((s) => s.trim()).filter(Boolean);
const CREATORS = `Vince Gilligan; David Chase; David Simon; Shonda Rhimes; Matthew Weiner; Jesse Armstrong; Noah Hawley; Damon Lindelof;
Michael Schur; Larry David; Charlie Brooker; Baran bo Odar; Ryan Murphy; Matt Duffer; Mike White; Taylor Sheridan; Steven Knight;
Sally Wainwright; Hwang Dong-hyuk; Craig Mazin; Tony Gilroy; Amy Sherman-Palladino; Dan Harmon; Ricky Gervais; Aaron Sorkin`
  .split(';').map((s) => s.trim()).filter(Boolean);

const year = (d) => (d ? +d.slice(0, 4) : null);
const warn = [];

// ---------- Serien ----------
const shows = [];
const netCount = new Map(); // Sender aus den Seriendaten zählen
for (const f of [...SHOWS, ...SHOWS_DE]) {
  let hits = (await api('search/tv', { query: f.t, first_air_date_year: f.y, language: 'en-US' })).results || [];
  if (!hits.length) hits = (await api('search/tv', { query: f.t, language: 'en-US' })).results || [];
  const m = hits.find((h) => Math.abs(year(h.first_air_date) - f.y) <= 1) || hits[0];
  if (!m) { warn.push(`Serie nicht gefunden: ${f.t} (${f.y})`); continue; }
  if (shows.some((x) => x.id === m.id)) continue;
  const de = await api(`tv/${m.id}`, { language: 'de-DE' });
  if (m.name.toLowerCase() !== f.t.toLowerCase() || year(m.first_air_date) !== f.y) warn.push(`Prüfen: „${f.t}“ ${f.y} → „${m.name}“ ${year(m.first_air_date)} (${m.id})`);
  for (const n of de.networks || []) {
    const e = netCount.get(n.id) || { id: n.id, n: n.name, logo: n.logo_path, c: n.origin_country || '', count: 0 };
    e.count++;
    netCount.set(n.id, e);
  }
  shows.push({
    id: m.id, y: year(m.first_air_date), g: m.genre_ids, l: m.original_language, n: m.vote_count, ...(INTL.has(f.t) ? { x: 1 } : {}),
    t: { de: de.name, en: m.name }, p: { de: de.poster_path || m.poster_path, en: m.poster_path || de.poster_path },
  });
}

// Reihenfolge: zuerst die in Deutschland bekannten, dann die internationalen (x = 1);
// jeweils reihum aus den Jahrzehnten, bekannte Serien zuerst
function roundRobin(list) {
  const buckets = {};
  for (const m of list) (buckets[Math.max(1980, Math.min(Math.floor(m.y / 10) * 10, 2020))] ||= []).push(m);
  Object.values(buckets).forEach((b) => b.sort((a, b2) => b2.n - a.n));
  const order = [2010, 2000, 2020, 1990, 2010, 1980, 2000, 2020, 2010, 1990];
  const out = [];
  while (out.length < list.length) for (const d of order) if (buckets[d]?.length) out.push(buckets[d].shift());
  return out;
}
const ordered = [...roundRobin(shows.filter((m) => !m.x)), ...roundRobin(shows.filter((m) => m.x))];
ordered.forEach((m) => delete m.n);

// ---------- Personen ----------
const people = [];
for (const [names, role, depts] of [[ACTORS, 'actor', ['Acting']], [CREATORS, 'director', ['Writing', 'Directing', 'Production', 'Creator']]]) {
  for (const name of names) {
    const en = (await api('search/person', { query: name, language: 'en-US' })).results || [];
    const p = en.filter((h) => depts.includes(h.known_for_department)).sort((a, b) => b.popularity - a.popularity)[0] || en[0];
    if (!p) { warn.push(`Person nicht gefunden: ${name}`); continue; }
    if (p.name !== name) warn.push(`Prüfen: ${name} → ${p.name} (${p.id})`);
    const de = ((await api('search/person', { query: name, language: 'de-DE' })).results || []).find((h) => h.id === p.id) || p;
    const kf = (x) => (x.known_for || []).filter((k) => k.media_type === 'tv').slice(0, 2).map((k) => k.name);
    people.push({ id: p.id, n: p.name, r: role, p: p.profile_path, k: { de: kf(de), en: kf(p) } });
  }
}

// ---------- Sender: die häufigsten in der Startliste ----------
// Wichtige Sender kommen auch dann dazu, wenn sie nur einmal vorkommen; „Syndication“ ist kein Sender
const WANTED = ['ZDF', 'ZDFneo', 'ARTE', 'arte', 'Sky Atlantic', 'Sky Deutschland', 'Starz', 'Paramount+', 'Peacock', 'Adult Swim',
  'Cartoon Network', 'NRK1', 'SVT1', 'RÚV', 'TV 2', 'Antena 3', 'JTBC', 'KBS2', 'SBS', 'Kan 11', 'RTL', 'ProSieben', 'Sat.1', 'Canal+', 'France 2', 'Rai 1'];
const networks = [...netCount.values()]
  .filter((x) => x.n !== 'Syndication' && (x.count >= 2 || WANTED.includes(x.n)))
  .sort((a, b) => b.count - a.count)
  .filter((x, i, arr) => arr.findIndex((y) => y.n === x.n) === i).slice(0, 50).map(({ count, ...x }) => x);

const out = `// Startauswahl für Serien – erzeugt mit: node scripts/make-seeds-tv.js
// t = Titel, p = Poster (je Sprache), y = Startjahr, g = Genres, l = Originalsprache, x = eher international (kommt später)
// Personen: r = actor/director (Regie oder Serienidee), k = bekannt aus. Sender: c = Land
export const SEED_SHOWS = ${JSON.stringify(ordered)};
export const SEED_TV_PEOPLE = ${JSON.stringify(people)};
export const SEED_NETWORKS = ${JSON.stringify(networks)};
`;
writeFileSync('docs/js/seeds-tv.js', out);
console.log(`Fertig: ${ordered.length} Serien, ${people.length} Personen, ${networks.length} Sender.`);
if (warn.length) console.log('\n' + warn.join('\n'));
