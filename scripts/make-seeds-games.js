// Baut die Startliste der Spiele (ca. 100) und die Brücke „gleiche Welt“ – nur über den Worker.
// Aufruf: node scripts/make-seeds-games.js   → schreibt docs/js/seeds-games.js
import { writeFileSync } from 'node:fs';
import { compact, INDIE } from '../docs/js/game-data.js';

const WORKER = process.env.WORKER_URL || 'https://film-app-tmdb.film-app.workers.dev';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function api(path) {
  for (let i = 0; i < 6; i++) {
    const res = await fetch(`${WORKER}${path}`, { headers: { Origin: 'http://localhost:5500' } });
    if (res.status === 429) { await wait(3000); continue; }
    await wait(300); // IGDB: höchstens 4 Anfragen pro Sekunde
    if (!res.ok) throw new Error(`${path}: ${res.status} ${await res.text()}`);
    return res.json();
  }
  throw new Error(`${path}: zu viele Anfragen`);
}
const q = encodeURIComponent;
const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[^a-z0-9]/g, '');
async function findGame(name) {
  const list = await api(`/igdb/search?q=${q(name)}`);
  const same = list.filter((g) => norm(g.name) === norm(name));
  return (same.length ? same : list).sort((a, b) => (b.total_rating_count || 0) - (a.total_rating_count || 0))[0] || null;
}

// Pflicht-Titel (bekannt, aber nicht unbedingt oben in den Listen)
const MUST = [
  'Elden Ring', "Baldur's Gate 3", 'Minecraft', 'Stardew Valley', 'It Takes Two', 'Split Fiction', 'Animal Crossing: New Horizons',
  'Mario Kart 8', 'The Legend of Zelda: Tears of the Kingdom', 'Hollow Knight: Silksong', 'Balatro', 'Astro Bot',
  'Clair Obscur: Expedition 33', 'Hades II', 'Overcooked! 2', 'Red Dead Redemption 2', 'Grand Theft Auto V', 'Fortnite',
  'Rocket League', 'Super Smash Bros. Ultimate', 'God of War Ragnarök', 'Black Myth: Wukong', 'Mario Kart World', 'Celeste',
];
// Plattform-Familien: die bekanntesten je Familie (nach Anzahl Bewertungen)
const FAMILIES = [
  ['PC', '6', 50], ['PlayStation', '167,48', 50], ['Nintendo', '508,130', 50], ['Xbox', '169,49', 50], ['ältere Konsolen', '9,12,41,5', 50],
];
const TARGET = 100;

const picked = new Map();
const add = (x, tag) => { if (x && !picked.has(x.id) && picked.size < TARGET) picked.set(x.id, { ...compact(x), why: tag }); };

console.log('Pflicht-Titel …');
for (const name of MUST) {
  const g = await findGame(name);
  if (!g) console.log(`  nicht gefunden: ${name}`);
  add(g, 'must');
}
console.log('Indies …');
const indies = await api(`/igdb/discover?platforms=6,167,48,169,49,508,130&genres=${INDIE}&min=15&rating=75`);
let nIndie = [...picked.values()].filter((g) => g.g.includes(INDIE)).length;
for (const g of indies) { if (nIndie >= 30) break; if (!picked.has(g.id)) { add(g, 'indie'); nIndie++; } }
console.log('Plattform-Familien …');
const lists = [];
for (const [name, plats, n] of FAMILIES) lists.push((await api(`/igdb/discover?platforms=${plats}&min=50`)).slice(0, n));
for (let i = 0; picked.size < TARGET && i < 50; i++) for (const l of lists) if (l[i]) add(l[i], 'top');

const seeds = [...picked.values()].map(({ why, s, ...g }) => g); // ähnliche Spiele nicht in die Startliste
console.log(`${seeds.length} Spiele, davon ${seeds.filter((g) => g.g.includes(INDIE)).length} Indies`);

// ---------- Brücke „gleiche Welt“ (von Hand gepflegt, nur gute Spiele) ----------
const WORLDS = [
  { w: 'The Last of Us', tv: ['The Last of Us'], games: ['The Last of Us Part I', 'The Last of Us Part II'], k: 'Vorlage' },
  { w: 'The Witcher', tv: ['The Witcher'], books: ['The Last Wish'], games: ['The Witcher 3: Wild Hunt'] },
  { w: 'Arcane / League of Legends', tv: ['Arcane'], games: ['League of Legends'], k: 'Vorlage' },
  { w: 'Fallout', tv: ['Fallout'], games: ['Fallout: New Vegas', 'Fallout 4', 'Fallout 3'], k: 'Vorlage' },
  { w: 'Cyberpunk', tv: ['Cyberpunk: Edgerunners'], games: ['Cyberpunk 2077'] },
  { w: 'Halo', tv: ['Halo'], games: ['Halo 3', 'Halo Infinite'], k: 'Vorlage' },
  { w: 'Uncharted', movie: ['Uncharted'], games: ['Uncharted 4: A Thief’s End', 'Uncharted 2: Among Thieves'], k: 'Vorlage' },
  { w: 'Dune', movie: ['Dune', 'Dune: Part Two'], books: ['Dune'], games: ['Dune: Spice Wars'] },
  { w: 'Herr der Ringe', movie: ['The Lord of the Rings: The Fellowship of the Ring', 'The Lord of the Rings: The Two Towers', 'The Lord of the Rings: The Return of the King'], books: ['The Lord of the Rings', 'The Hobbit'], games: ['Middle-earth: Shadow of Mordor', 'Middle-earth: Shadow of War'] },
  { w: 'Star Wars', movie: ['Star Wars', 'The Empire Strikes Back', 'Rogue One: A Star Wars Story'], tv: ['The Mandalorian', 'Andor'], games: ['Star Wars Jedi: Fallen Order', 'Star Wars Jedi: Survivor', 'Star Wars: Knights of the Old Republic'] },
  { w: 'Resident Evil', movie: ['Resident Evil'], games: ['Resident Evil 4', 'Resident Evil 2', 'Resident Evil Village'], k: 'Vorlage' },
  { w: 'Mass Effect', books: ['Mass Effect: Revelation'], games: ['Mass Effect 2'], k: 'Vorlage' },
  { w: 'Castlevania', tv: ['Castlevania', 'Castlevania: Nocturne'], games: ['Castlevania: Symphony of the Night'], k: 'Vorlage' },
  { w: 'Sonic', movie: ['Sonic the Hedgehog', 'Sonic the Hedgehog 2', 'Sonic the Hedgehog 3'], games: ['Sonic Mania', 'Sonic Frontiers'], k: 'Vorlage' },
  { w: 'Mario', movie: ['The Super Mario Bros. Movie'], games: ['Super Mario Odyssey', 'Super Mario Bros. Wonder'], k: 'Vorlage' },
  { w: 'Pokémon', movie: ['Pokémon Detective Pikachu'], games: ['Detective Pikachu Returns', 'Pokémon Legends: Arceus'], k: 'Vorlage' },
];
const bridge = [];
for (const x of WORLDS) {
  const out = { w: x.w, k: x.k || '', movie: [], tv: [], books: [], games: [] };
  for (const md of ['movie', 'tv']) {
    for (const t of x[md] || []) {
      const r = await api(`/3/search/${md}?query=${q(t)}&language=en-US`);
      const hit = (r.results || []).sort((a, b) => (norm(b.title || b.name) === norm(t)) - (norm(a.title || a.name) === norm(t)) || b.vote_count - a.vote_count)[0];
      if (hit) out[md].push(hit.id); else console.log(`  TMDB nicht gefunden: ${t}`);
      console.log(`  ${md} ${t} → ${hit?.id} ${hit?.title || hit?.name} (${(hit?.release_date || hit?.first_air_date || '').slice(0, 4)})`);
    }
  }
  for (const t of x.books || []) {
    const r = await api(`/ol/search.json?q=${q(t)}&fields=key,title,author_name&limit=1`);
    const d = r.docs?.[0];
    if (d) out.books.push(d.key.replace('/works/', ''));
    console.log(`  Buch ${t} → ${d?.key} ${d?.title} (${d?.author_name?.[0]})`);
  }
  for (const t of x.games) {
    const g = await findGame(t);
    if (!g) { console.log(`  Spiel nicht gefunden: ${t}`); continue; }
    const ok = (g.total_rating || 0) >= 70 && (g.total_rating_count || 0) >= 15;
    console.log(`  Spiel ${t} → ${g.id} ${g.name} (${Math.round(g.total_rating || 0)}, ${g.total_rating_count})${ok ? '' : '  ✗ zu schwach, weggelassen'}`);
    if (ok) out.games.push(compact(g));
  }
  out.games = out.games.map(({ s, ...g }) => g);
  if (out.games.length) bridge.push(out);
}

writeFileSync('docs/js/seeds-games.js', `// Startliste Spiele und Brücke „gleiche Welt“ – gebaut von scripts/make-seeds-games.js (${new Date().toISOString().slice(0, 10)}).
// Nicht von Hand ändern: Liste im Skript anpassen und neu bauen. Daten: IGDB.com
export const SEED_GAMES = ${JSON.stringify(seeds)};
export const WORLDS = ${JSON.stringify(bridge)};
`);
console.log('docs/js/seeds-games.js geschrieben.');
