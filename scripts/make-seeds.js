// Baut die Startauswahl (docs/js/seeds.js): Filme, Personen und Studios
// mit Titel und Poster auf Deutsch und Englisch. Läuft über den Worker.
// Aufruf: node scripts/make-seeds.js   (dauert ca. 10 Minuten wegen des Missbrauchsschutzes)
// Zwischenergebnisse liegen in .seed-cache.json, damit ein Abbruch nicht alles neu startet.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const WORKER = 'https://film-app-tmdb.film-app.workers.dev';
const CACHE = '.seed-cache.json';
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

// ---------- Filme: quer durch Jahrzehnte, Genres und Länder ----------
const FILMS = `
Rashomon|1950; Sunset Boulevard|1950; Singin' in the Rain|1952; Tokyo Story|1953; Seven Samurai|1954; Rear Window|1954;
La Strada|1954; 12 Angry Men|1957; Wild Strawberries|1957; Vertigo|1958; Some Like It Hot|1959; North by Northwest|1959;
The 400 Blows|1959; Ben-Hur|1959; Psycho|1960; Breakfast at Tiffany's|1961; Lawrence of Arabia|1962; Dr. Strangelove|1964;
Mary Poppins|1964; The Sound of Music|1965; The Good, the Bad and the Ugly|1966; The Graduate|1967; 2001: A Space Odyssey|1968;
Once Upon a Time in the West|1968; The Godfather|1972; Cabaret|1972; The Exorcist|1973; Chinatown|1974; Jaws|1975;
One Flew Over the Cuckoo's Nest|1975; Monty Python and the Holy Grail|1975; Taxi Driver|1976; Rocky|1976; Star Wars|1977;
Annie Hall|1977; Grease|1978; Alien|1979; Apocalypse Now|1979; Life of Brian|1979; The Shining|1980; Raiders of the Lost Ark|1981;
Das Boot|1981; E.T. the Extra-Terrestrial|1982; Blade Runner|1982; Ghostbusters|1984; The Terminator|1984; Back to the Future|1985;
Ran|1985; The Breakfast Club|1985; Top Gun|1986; Stand by Me|1986; Wings of Desire|1987; Dirty Dancing|1987; My Neighbor Totoro|1988;
Die Hard|1988; Cinema Paradiso|1988; Rain Man|1988; When Harry Met Sally...|1989; Dead Poets Society|1989; Goodfellas|1990;
Home Alone|1990; Pretty Woman|1990; The Silence of the Lambs|1991; Terminator 2: Judgment Day|1991; Jurassic Park|1993;
Schindler's List|1993; Groundhog Day|1993; Pulp Fiction|1994; Forrest Gump|1994; The Shawshank Redemption|1994; The Lion King|1994;
Léon: The Professional|1994; Toy Story|1995; Se7en|1995; Clueless|1995; Fargo|1996; Trainspotting|1996; Titanic|1997;
Princess Mononoke|1997; Life Is Beautiful|1997; Knockin' on Heaven's Door|1997; Run Lola Run|1998; The Big Lebowski|1998;
The Truman Show|1998; Saving Private Ryan|1998; The Matrix|1999; Fight Club|1999; American Beauty|1999; The Sixth Sense|1999;
Notting Hill|1999; Gladiator|2000; Memento|2000; In the Mood for Love|2000; Crouching Tiger, Hidden Dragon|2000; Amores perros|2000;
Amélie|2001; Spirited Away|2001; The Lord of the Rings: The Fellowship of the Ring|2001; Shrek|2001; Ocean's Eleven|2001;
Harry Potter and the Philosopher's Stone|2001; Legally Blonde|2001; Der Schuh des Manitu|2001; Lagaan|2001; City of God|2002;
Hero|2002; Good Bye, Lenin!|2003; Oldboy|2003; Memories of Murder|2003; Finding Nemo|2003; Lost in Translation|2003;
Kill Bill: Vol. 1|2003; Love Actually|2003; Pirates of the Caribbean: The Curse of the Black Pearl|2003;
Eternal Sunshine of the Spotless Mind|2004; Downfall|2004; Shaun of the Dead|2004; Mean Girls|2004; The Notebook|2004;
Pan's Labyrinth|2006; The Lives of Others|2006; Little Miss Sunshine|2006; The Departed|2006; The Prestige|2006;
The Devil Wears Prada|2006; Ratatouille|2007; No Country for Old Men|2007; There Will Be Blood|2007; Hot Fuzz|2007; Superbad|2007;
Zodiac|2007; The Dark Knight|2008; WALL·E|2008; Slumdog Millionaire|2008; Let the Right One In|2008; Mamma Mia!|2008; Up|2009;
Inglourious Basterds|2009; Avatar|2009; The White Ribbon|2009; 3 Idiots|2009; The Secret in Their Eyes|2009; The Hangover|2009;
Inception|2010; The Social Network|2010; Black Swan|2010; Incendies|2010; The Intouchables|2011; A Separation|2011; Drive|2011;
Bridesmaids|2011; The Hunt|2012; Django Unchained|2012; Moonrise Kingdom|2012; Frozen|2013; Her|2013; Prisoners|2013;
The Wolf of Wall Street|2013; Fack ju Göhte|2013; The Grand Budapest Hotel|2014; Whiplash|2014; Interstellar|2014; Boyhood|2014;
Wild Tales|2014; Gone Girl|2014; John Wick|2014; Edge of Tomorrow|2014; It Follows|2014; Victoria|2015; Mad Max: Fury Road|2015;
Inside Out|2015; Ex Machina|2015; Spotlight|2015; The Martian|2015; Sicario|2015; Mustang|2015; The Witch|2015; Toni Erdmann|2016;
Your Name.|2016; La La Land|2016; Moonlight|2016; Arrival|2016; Dangal|2016; Train to Busan|2016; Get Out|2017; Coco|2017;
Lady Bird|2017; Call Me by Your Name|2017; Three Billboards Outside Ebbing, Missouri|2017; Paddington 2|2017; Shoplifters|2018;
Roma|2018; Spider-Man: Into the Spider-Verse|2018; Hereditary|2018; A Quiet Place|2018; Crazy Rich Asians|2018;
Mission: Impossible - Fallout|2018; Parasite|2019; Knives Out|2019; Portrait of a Lady on Fire|2019; Joker|2019; Jojo Rabbit|2019;
1917|2019; System Crasher|2019; Midsommar|2019; Uncut Gems|2019; Another Round|2020; Soul|2020; Nomadland|2020; Dune|2021;
Everything Everywhere All at Once|2022; All Quiet on the Western Front|2022; Top Gun: Maverick|2022; The Banshees of Inisherin|2022;
Aftersun|2022; RRR|2022; Past Lives|2023; Oppenheimer|2023; Barbie|2023; Anatomy of a Fall|2023; The Zone of Interest|2023;
Perfect Days|2023; Poor Things|2023; The Boy and the Heron|2023; The Teachers' Lounge|2023; Godzilla Minus One|2023;
Dune: Part Two|2024; Inside Out 2|2024; Anora|2024; Conclave|2024; The Substance|2024; Flow|2024; Wicked|2024
`.split(';').map((s) => s.trim()).filter(Boolean).map((s) => { const [t, y] = s.split('|'); return { t, y: +y }; });

const ACTORS = `Tom Hanks; Meryl Streep; Leonardo DiCaprio; Cate Blanchett; Denzel Washington; Scarlett Johansson; Brad Pitt;
Julia Roberts; Tom Cruise; Natalie Portman; Keanu Reeves; Viola Davis; Joaquin Phoenix; Frances McDormand; Ryan Gosling;
Emma Stone; Christian Bale; Margot Robbie; Morgan Freeman; Sandra Bullock; Robin Williams; Jim Carrey; Will Smith; Tilda Swinton;
Timothée Chalamet; Florence Pugh; Zendaya; Cillian Murphy; Pedro Pascal; Song Kang-ho; Tony Leung Chiu-wai; Michelle Yeoh;
Penélope Cruz; Javier Bardem; Mads Mikkelsen; Isabelle Huppert; Marion Cotillard; Daniel Brühl; Sandra Hüller; Moritz Bleibtreu;
Christoph Waltz; Til Schweiger; Shah Rukh Khan; Aamir Khan; Toshirō Mifune; Audrey Hepburn; Cary Grant; Marilyn Monroe`
  .split(';').map((s) => s.trim()).filter(Boolean);

const DIRECTORS = `Christopher Nolan; Steven Spielberg; Quentin Tarantino; Martin Scorsese; Stanley Kubrick; Alfred Hitchcock;
Hayao Miyazaki; Akira Kurosawa; Bong Joon-ho; Park Chan-wook; Denis Villeneuve; Greta Gerwig; Wes Anderson; David Fincher;
Guillermo del Toro; Alfonso Cuarón; Pedro Almodóvar; Céline Sciamma; Michael Haneke; Fatih Akin; Tom Tykwer; Wim Wenders;
Thomas Vinterberg; Hirokazu Kore-eda; Wong Kar-wai; Ridley Scott; James Cameron; Jordan Peele; Sofia Coppola; Edgar Wright;
Taika Waititi; Ari Aster; Billy Wilder; Federico Fellini; Ingmar Bergman; Jane Campion; Chloé Zhao; Yorgos Lanthimos; Maren Ade;
Justine Triet`.split(';').map((s) => s.trim()).filter(Boolean);

// Studios: feste Nummern aus dem Prüfskript, die übrigen per Suche. i = klein & unabhängig
const STUDIOS = [
  { id: 41077, i: 1 }, { id: 90733, i: 1 }, { id: 3172, i: 1 }, { id: 10342, i: 1 }, { id: 10146, i: 1 },
  { id: 43, also: [127929], i: 1 }, { id: 13184, i: 1 }, { id: 81, i: 1 }, { id: 694 }, { id: 96, i: 1 }, { id: 882 },
  { id: 7036 }, { id: 3 }, { id: 174 }, { id: 33 }, { id: 297, i: 1 }, { id: 11537, i: 1 }, { id: 47 },
  { q: 'Walt Disney Pictures' }, { q: 'Paramount Pictures' }, { q: 'Columbia Pictures' }, { q: 'Lionsgate' },
  { q: 'Marvel Studios' }, { q: 'DreamWorks Animation' }, { q: 'Amblin Entertainment' }, { q: 'Working Title Films' },
  { q: 'Illumination' }, { id: 1 }, { q: 'Legendary Pictures' }, { id: 14, i: 1 },
  { q: 'Sony Pictures Classics', i: 1 }, { q: 'IFC Films', i: 1 }, { q: 'Magnolia Pictures', i: 1 }, { q: 'Film4 Productions', i: 1 },
  { q: 'Warp Films', i: 1 }, { q: 'Wild Bunch', i: 1 }, { q: 'Gaumont' }, { q: 'Zentropa', i: 1 },
];

const year = (d) => (d ? +d.slice(0, 4) : null);
const warn = [];

// ---------- Filme ----------
const movies = [];
for (const f of FILMS) {
  let hits = (await api('search/movie', { query: f.t, year: f.y, language: 'en-US' })).results || [];
  if (!hits.length) hits = (await api('search/movie', { query: f.t, language: 'en-US' })).results || [];
  const m = hits.find((h) => Math.abs(year(h.release_date) - f.y) <= 1) || hits[0];
  if (!m) { warn.push(`Film nicht gefunden: ${f.t} (${f.y})`); continue; }
  if (movies.some((x) => x.id === m.id)) continue;
  const de = await api(`movie/${m.id}`, { language: 'de-DE' });
  if (m.title.toLowerCase() !== f.t.toLowerCase() || year(m.release_date) !== f.y) warn.push(`Prüfen: „${f.t}“ ${f.y} → „${m.title}“ ${year(m.release_date)} (${m.id})`);
  movies.push({
    id: m.id, y: year(m.release_date), g: m.genre_ids, l: m.original_language, n: m.vote_count,
    t: { de: de.title, en: m.title }, p: { de: de.poster_path || m.poster_path, en: m.poster_path || de.poster_path },
  });
}

// Reihenfolge: reihum aus den Jahrzehnten, bekannte Filme zuerst – so ist gleich vorne viel Abwechslung
const buckets = {};
for (const m of movies) (buckets[Math.min(Math.floor(m.y / 10) * 10, 2020)] ||= []).push(m);
Object.values(buckets).forEach((b) => b.sort((a, b2) => b2.n - a.n));
const order = [2010, 1990, 2000, 2020, 1980, 1970, 2010, 2000, 1960, 1950, 1990, 2020];
const ordered = [];
while (ordered.length < movies.length) for (const d of order) if (buckets[d]?.length) ordered.push(buckets[d].shift());
ordered.forEach((m) => delete m.n);

// ---------- Personen ----------
const people = [];
for (const [names, role, dept] of [[ACTORS, 'actor', 'Acting'], [DIRECTORS, 'director', 'Directing']]) {
  for (const name of names) {
    const en = (await api('search/person', { query: name, language: 'en-US' })).results || [];
    const p = en.filter((h) => h.known_for_department === dept).sort((a, b) => b.popularity - a.popularity)[0] || en[0];
    if (!p) { warn.push(`Person nicht gefunden: ${name}`); continue; }
    if (p.name !== name) warn.push(`Prüfen: ${name} → ${p.name} (${p.id})`);
    const de = ((await api('search/person', { query: name, language: 'de-DE' })).results || []).find((h) => h.id === p.id) || p;
    const kf = (x) => (x.known_for || []).filter((k) => k.media_type === 'movie').slice(0, 2).map((k) => k.title);
    people.push({ id: p.id, n: p.name, r: role, p: p.profile_path, k: { de: kf(de), en: kf(p) } });
  }
}

// ---------- Studios ----------
const studios = [];
for (const s of STUDIOS) {
  let c;
  if (s.id) c = await api(`company/${s.id}`);
  else {
    const hits = (await api('search/company', { query: s.q })).results || [];
    c = hits.find((h) => h.name.toLowerCase() === s.q.toLowerCase()) || hits[0];
    if (!c) { warn.push(`Studio nicht gefunden: ${s.q}`); continue; }
    if (c.name !== s.q) warn.push(`Prüfen: ${s.q} → ${c.name} (${c.id})`);
  }
  studios.push({ id: c.id, n: c.name, logo: c.logo_path, c: c.origin_country || '', ...(s.i ? { i: 1 } : {}), ...(s.also ? { also: s.also } : {}) });
}

const out = `// Startauswahl für „Geschmack“ – erzeugt mit: node scripts/make-seeds.js
// t = Titel, p = Poster (je Sprache), y = Jahr, g = Genres, l = Originalsprache
// Personen: r = actor/director, k = bekannt aus. Studios: i = klein & unabhängig
export const SEED_MOVIES = ${JSON.stringify(ordered)};
export const SEED_PEOPLE = ${JSON.stringify(people)};
export const SEED_STUDIOS = ${JSON.stringify(studios)};
`;
writeFileSync('docs/js/seeds.js', out);
console.log(`Fertig: ${ordered.length} Filme, ${people.length} Personen, ${studios.length} Studios.`);
if (warn.length) console.log('\n' + warn.join('\n'));
