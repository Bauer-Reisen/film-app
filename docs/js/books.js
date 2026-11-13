// Buchdaten von Open Library (frei, ohne Schlüssel).
// Erst über unseren Worker (/ol/…). Kennt der Worker die Adressen noch nicht, direkt bei Open Library
// (die Seite erlaubt das ausdrücklich). Merkt sich Antworten für die Sitzung, höchstens 4 Anfragen gleichzeitig.
import { WORKER_URL } from './config.js?v=1.19.1';
import { SEED_BOOKS } from './seeds-books.js?v=1.19.1';
import { genresOf } from './book-genres.js?v=1.19.1';

const OL = 'https://openlibrary.org';
const COVERS = 'https://covers.openlibrary.org';
let direct = false;
try { direct = sessionStorage.getItem('filmapp.olDirect') === '1'; } catch { /* egal */ }

const memo = new Map();
let running = 0;
const queue = [];
const slot = () => new Promise((resolve) => { if (running < 4) { running++; resolve(); } else queue.push(resolve); });
const release = () => { const next = queue.shift(); if (next) next(); else running--; };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

export class BookError extends Error {}

async function load(path) {
  await slot();
  try {
    for (let attempt = 0; ; attempt++) {
      let res;
      try {
        res = await fetch(direct ? `${OL}${path}` : `${WORKER_URL}/ol${path}`);
      } catch {
        if (!direct) { direct = true; continue; } // Worker nicht erreichbar → direkt versuchen
        throw new BookError('Keine Verbindung. Bist du online?');
      }
      if (res.status === 403 && !direct) {
        direct = true; // Worker kennt Open Library noch nicht
        try { sessionStorage.setItem('filmapp.olDirect', '1'); } catch { /* egal */ }
        continue;
      }
      if (res.status === 404) return null;
      if ((res.status === 429 || res.status >= 500) && attempt < 2) { await wait(3000 * (attempt + 1)); continue; }
      if (!res.ok) throw new BookError('Die Buchdaten sind gerade nicht erreichbar.');
      return await res.json();
    }
  } finally {
    release();
  }
}

export function get(path, params = {}) {
  const clean = Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''));
  const qs = new URLSearchParams(clean).toString();
  const key = `${path}${qs ? `?${qs}` : ''}`;
  if (!memo.has(key)) {
    const p = load(key);
    memo.set(key, p);
    p.catch(() => memo.delete(key));
  }
  return memo.get(key);
}

// ---------- Sprache ----------
// Bücher haben eine eigene Lesesprache pro Profil (Standard Englisch), unabhängig von Filmen und Serien
export const readLang = (profile) => (profile?.settings?.bookLang === 'de' ? 'de' : 'en');
const OL_LANG = { en: 'eng', de: 'ger' };

// ---------- Bilder ----------
export const cover = (id, size = 'M') => (id ? `${COVERS}/b/id/${id}-${size}.jpg` : null);
export const authorPhoto = (olid, size = 'M') => `${COVERS}/a/olid/${olid}-${size}.jpg?default=false`;

// ---------- Werk-Nummern: doppelt angelegte Werke auf eins abbilden ----------
const ALIAS = new Map();
SEED_BOOKS.forEach((b) => (b.alt || []).forEach((a) => ALIAS.set(a, b.id)));
export const canonical = (id) => ALIAS.get(id) || id;
export const seedBook = new Map(SEED_BOOKS.map((b) => [b.id, b]));

// Felder, die wir bei der Suche brauchen (editions.* = passende Ausgabe in der Lesesprache)
export const FIELDS = 'key,title,author_name,author_key,first_publish_year,number_of_pages_median,subject_key,readinglog_count,ratings_average,ratings_count,cover_i,editions,editions.key,editions.title,editions.language,editions.cover_i';

// Autor·in: lieber in lateinischer Schrift (Open Library nennt manchmal zuerst den Originalnamen, z. B. 川口俊和)
const latinName = (names = []) => names.find((n) => /^[\p{Script=Latin}\p{P}\p{Zs}\d]+$/u.test(n)) || names[0];

// Einheitliches Buch aus einem Suchtreffer
export function fromDoc(d, lang = 'en') {
  const ed = d.editions?.docs?.[0];
  const edOk = ed && (ed.language || []).includes(OL_LANG[lang]);
  const id = canonical(String(d.key || '').replace('/works/', ''));
  const seed = seedBook.get(id);
  return {
    id,
    title: (seed && (seed.t[lang] || seed.t.en)) || (edOk && ed.title) || d.title,
    cover: (seed && (seed.c[lang] || seed.c.en)) || (edOk && ed.cover_i) || d.cover_i || ed?.cover_i || null,
    a: seed?.a || latinName(d.author_name) || '',
    ak: (d.author_key || [])[0] || seed?.ak || null,
    y: d.first_publish_year || seed?.y || null,
    pg: d.number_of_pages_median || seed?.pg || null,
    g: seed?.g || genresOf(d.subject_key || []),
    s: d.subject_key?.length ? d.subject_key : seed?.s || [], // alle Schlagwörter (für Vorschläge)
    r: d.readinglog_count || seed?.r || 0,
    rating: d.ratings_count >= 5 ? d.ratings_average : null,
    edLang: seed ? true : edOk ? true : (d.editions ? false : null), // gibt es eine Ausgabe in der Lesesprache?
  };
}

// Buch aus der Startliste in der Lesesprache
export const fromSeed = (b, lang = 'en') => ({
  id: b.id, title: b.t[lang] || b.t.en, cover: b.c[lang] || b.c.en, a: b.a, ak: b.ak, y: b.y, pg: b.pg, g: b.g, s: b.s, r: b.r, rating: null,
});

// Suche (Titel, Autor·in, Schlagwörter). params z. B. { q: 'dune' } oder { q: 'subject_key:time_travel', sort: 'readinglog' }
export async function search(params, lang = 'en', limit = 20) {
  const d = await get('/search.json', { fields: FIELDS, lang, limit, ...params });
  const seen = new Set();
  return (d?.docs || []).map((x) => fromDoc(x, lang)).filter((b) => b.id && !seen.has(b.id) && seen.add(b.id));
}

// Ein Werk nach Nummer (für Leseliste, Lieblingsbuch …)
export async function byId(id, lang = 'en') {
  const seed = seedBook.get(id);
  const list = await search({ q: `key:/works/${id}` }, lang, 1).catch(() => []);
  if (list[0]) return list[0];
  return seed ? fromSeed(seed, lang) : null;
}

// Mehrere Werke auf einmal (je 40 pro Anfrage); fehlende aus der Startliste
export async function byIds(ids, lang = 'en') {
  const found = new Map();
  for (let i = 0; i < ids.length; i += 40) {
    const chunk = ids.slice(i, i + 40);
    const list = await search({ q: chunk.map((id) => `key:/works/${id}`).join(' OR ') }, lang, chunk.length).catch(() => []);
    list.forEach((b) => found.set(b.id, b));
    chunk.filter((id) => !found.has(id) && seedBook.has(id)).forEach((id) => found.set(id, fromSeed(seedBook.get(id), lang)));
  }
  return found;
}

// Beschreibung des Werks (meist Englisch)
export async function description(id) {
  const w = await get(`/works/${id}.json`);
  const d = typeof w?.description === 'string' ? w.description : w?.description?.value;
  // Open Library hängt oft Quellen und Links an – die schneiden wir ab
  return d ? d.split(/\n\s*(-{3,}|\*{3,}|\(\[source\]|\[source\]|Also contained in:|Contains:)/i)[0].replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').trim() : '';
}

// ISBN-10 oder ISBN-13 (Strichcode) prüfen und vereinheitlichen
export function cleanIsbn(raw) {
  const s = String(raw || '').replace(/[\s-]/g, '').toUpperCase();
  if (/^97[89]\d{10}$/.test(s)) {
    const sum = [...s.slice(0, 12)].reduce((acc, c, i) => acc + Number(c) * (i % 2 ? 3 : 1), 0);
    return (10 - (sum % 10)) % 10 === Number(s[12]) ? s : null;
  }
  if (/^\d{9}[\dX]$/.test(s)) {
    const sum = [...s].reduce((acc, c, i) => acc + (c === 'X' ? 10 : Number(c)) * (10 - i), 0);
    return sum % 11 === 0 ? s : null;
  }
  return null;
}

// ISBN → Werk. Egal in welcher Sprache die Ausgabe ist: es zählt das Werk (alle Ausgaben = dasselbe Buch).
export async function byIsbn(isbn, lang = 'en') {
  const ed = await get(`/isbn/${isbn}.json`);
  const key = ed?.works?.[0]?.key;
  if (!key) return null;
  const id = canonical(key.replace('/works/', ''));
  const book = await byId(id, lang).catch(() => null);
  if (book) return book;
  return { id, title: ed.title, cover: ed.covers?.[0] || null, a: '', ak: null, y: null, pg: ed.number_of_pages || null, g: [], s: [], r: 0, rating: null };
}

// Autor·innen suchen
export async function searchAuthors(q, limit = 8) {
  const d = await get('/search/authors.json', { q, limit });
  return (d?.docs || []).filter((a) => (a.work_count || 0) >= 3).map((a) => ({ id: a.key, n: a.name, k: a.top_work || '' }));
}

// Angaben, die beim Markieren gespeichert werden (für Begründungen und die Leseliste ohne Netz)
export const markMeta = (b) => ({ g: b.g || [], y: b.y || null, n: b.title || '', a: b.a || '', ak: b.ak || null, c: b.cover || null, pg: b.pg || null });

// Sammelbände, Gesamtausgaben, Studienhilfen – die schlagen wir nicht vor
export const BUNDLE = /( \/ |\b(complete|collected|omnibus|box(ed)? set|boxset|collection|trilogy set|novels of|works of|study guide|sparknotes|cliffs ?notes)\b)/i;

// Eintrag für die Warteliste (noch nicht bewertet)
export const pendingEntry = (b) => ({ id: b.id, n: b.title || '', a: b.a || '', ak: b.ak || null, c: b.cover || null, y: b.y || null, pg: b.pg || null, g: b.g || [] });

export const pagesText = (pg) => (pg ? `${pg} Seiten` : '');
