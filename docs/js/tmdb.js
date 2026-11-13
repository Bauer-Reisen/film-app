// Abfragen an TMDB – immer über den Worker, nie direkt (dort liegt der Schlüssel).
// Merkt sich Antworten für die Dauer der Sitzung und stellt höchstens
// TMDB.maxParallel Anfragen gleichzeitig.
import { WORKER_URL, IMAGE_BASE, TMDB } from './config.js?v=1.10.0';

const memo = new Map();
let running = 0;
const queue = [];

const slot = () => new Promise((resolve) => {
  if (running < TMDB.maxParallel) { running++; resolve(); } else queue.push(resolve);
});
const release = () => { const next = queue.shift(); if (next) next(); else running--; };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

export class TmdbError extends Error {}

async function load(url) {
  await slot();
  try {
    for (let attempt = 0; ; attempt++) {
      let res;
      try {
        res = await fetch(url);
      } catch {
        throw new TmdbError('Keine Verbindung. Bist du online?');
      }
      if (res.status === 429 && attempt < 2) { await wait(5000 * (attempt + 1)); continue; }
      if (res.status === 429) throw new TmdbError('Gerade sehr viele Anfragen – bitte kurz warten und noch mal versuchen.');
      if (!res.ok) throw new TmdbError('Die Filmdaten sind gerade nicht erreichbar.');
      return await res.json();
    }
  } finally {
    release();
  }
}

// Serien sehen bei TMDB etwas anders aus als Filme (name statt title, first_air_date statt release_date).
// Wir ergänzen die Film-Felder, damit alle Seiten Serien genauso anzeigen können.
function asFilm(x) {
  if (x && typeof x === 'object' && 'first_air_date' in x && !('title' in x)) {
    x.title = x.name;
    x.original_title = x.original_name;
    x.release_date = x.first_air_date;
    x.media = 'tv';
  }
  return x;
}
function normalize(data) {
  asFilm(data);
  for (const key of ['results', 'cast', 'crew']) if (Array.isArray(data?.[key])) data[key].forEach(asFilm);
  for (const key of ['recommendations', 'similar']) if (Array.isArray(data?.[key]?.results)) data[key].results.forEach(asFilm);
  return data;
}

// get('discover/movie', { language: 'de-DE', page: 2 })
export function get(path, params = {}) {
  const clean = Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''));
  const url = `${WORKER_URL}/3/${path}?${new URLSearchParams(clean)}`;
  if (!memo.has(url)) {
    const p = load(url).then(normalize);
    memo.set(url, p);
    p.catch(() => memo.delete(url)); // Fehler nicht merken, damit „Nochmal“ klappt
  }
  return memo.get(url);
}

// Bildadresse; size z. B. 'w185', 'w342'. Ohne Bild: null
export const img = (path, size = 'w342') => (path ? `${IMAGE_BASE}${size}${path}` : null);

export const year = (date) => (date ? Number(date.slice(0, 4)) : null);
