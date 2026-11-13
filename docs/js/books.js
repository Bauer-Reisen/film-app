// Buchdaten von Open Library (frei, ohne Schlüssel).
// Erst über unseren Worker (/ol/…). Kennt der Worker die Adressen noch nicht, direkt bei Open Library
// (die Seite erlaubt das ausdrücklich). Merkt sich Antworten für die Sitzung, höchstens 4 Anfragen gleichzeitig.
import { WORKER_URL } from './config.js?v=1.26.0';
import { SEED_BOOKS } from './seeds-books.js?v=1.26.0';
import { genresOf } from './book-genres.js?v=1.26.0';

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
export const BUNDLE = /( \/ |\b(complete|collected|omnibus|box(ed)? set|boxset|collection|trilogy set|(sales|gift|books?|special|series) set|novels of|works of|study guide|sparknotes|cliffs ?notes)\b|\b\d+ ?[-–] ?\d+\s*$)/i; // auch „Harry Potter 1-7“

// Eintrag für die Warteliste (noch nicht bewertet)
export const pendingEntry = (b) => ({ id: b.id, n: b.title || '', a: b.a || '', ak: b.ak || null, c: b.cover || null, y: b.y || null, pg: b.pg || null, g: b.g || [] });

// ---------- Gleiches Buch, andere Werk-Nummer? ----------
// Open Library legt dasselbe Buch oft mehrfach an („The Forty Rules of Love“, „Forty Rules of Love“,
// „The forty rules of love“ …). Gleich ist ein Buch, wenn die Autor·in gleich ist und
// – der Titel ohne Artikel/Zusätze gleich oder fast gleich ist (Tippfehler, Honour/Honor), oder
// – der kürzere Titel fast ganz im längeren steckt („My Last 10 Minutes …“), oder
// – das Erscheinungsjahr gleich ist und mindestens ein besonderes Wort übereinstimmt.
// Unterschiedliche Zahlen (Band 1 / Band 2) sind nie dasselbe Buch.
const STOP = new Set(('the a an of and in on to for with by my at from this that is '
  + 'der die das ein eine einer und von vom im am zu zum zur mit auf fur des den dem '
  + 'le la les l un une de du des et el los las y il lo gli i e di da het een van').split(' '));
const fold = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ß/g, 'ss').replace(/ı/g, 'i');
const lastOf = (a) => fold(a).replace(/[^a-z\s-]/g, '').trim().split(/\s+/).pop() || '';
function lev(a, b) {
  if (Math.abs(a.length - b.length) > 2) return 3;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[b.length];
}
// Vorbereiten: { last, ak, core, words, digits, y }
export function bookKey(b) {
  const last = lastOf(b.a);
  let t = fold(b.title ?? b.n).replace(/\(.*?\)|\[.*?\]/g, ' ');
  // „The Flea Palace by Elif Shafak“, „Flea Palace; trans. by …“
  t = t.split(/;|\s\/\s|\btrans(lated)?\b/)[0];
  const by = t.lastIndexOf(' by ');
  if (by > 0 && last && lev(lastOf(t.slice(by + 4)), last) <= 2) t = t.slice(0, by);
  const words = t.split(/[^a-z0-9]+/).filter((w) => w && !STOP.has(w));
  return { last, ak: b.ak ? String(b.ak).replace('/authors/', '') : null, core: words.join(' '), words: new Set(words.filter((w) => w.length >= 3 || /\d/.test(w))), digits: (t.match(/\d+/g) || []).join(','), y: b.y || null };
}
const sameAuthor = (x, y) => (x.ak && y.ak && x.ak === y.ak) || (x.last && y.last && (x.last === y.last || (Math.min(x.last.length, y.last.length) >= 5 && lev(x.last, y.last) <= 1)));
export function sameKey(x, y) {
  if (!x.core || !y.core || !sameAuthor(x, y)) return false;
  if (x.digits && y.digits && x.digits !== y.digits) return false; // Band 1 / Band 2
  const [s, l] = x.words.size <= y.words.size ? [x.words, y.words] : [y.words, x.words];
  const shared = [...s].filter((w) => l.has(w)).length;
  // lange Titel, anders geschrieben („Hundredyearold Man …“ / „The 100-Year-Old Man …“)
  if (shared >= 4 && shared / s.size >= 0.75) return true;
  if (x.digits !== y.digits) return false; // „Panem“ / „Panem 2“
  if (x.core === y.core) return true;
  if (Math.min(x.core.length, y.core.length) >= 5 && lev(x.core, y.core) <= 2) return true;
  if (s.size >= 2 && shared === s.size && s.size / l.size >= 0.6) return true;
  return !!(x.y && x.y === y.y && shared >= 1);
}
export const sameBook = (a, b) => sameKey(bookKey(a), bookKey(b));
// Prüfer gegen eine Liste bekannter Bücher (Markierungen { id: { n, a, ak, y } } oder Listen [{ id, n, a, ak, y }])
export function matcher(entries) {
  const keys = entries.filter((e) => e && (e.n || e.title)).map((e) => ({ id: e.id, k: bookKey(e) }));
  return (b) => { const k = bookKey(b); return keys.find((x) => x.id !== b.id && sameKey(x.k, k))?.id || null; };
}
// Alles, was das Profil schon kennt: markiert oder wartend
export const knownMatcher = (p) => matcher([...Object.entries(p.books || {}).map(([id, m]) => ({ id, ...m })), ...(p.pendingBooks || [])]);
// Doppelte aus einer Liste entfernen (das erste bleibt – Listen sind nach Beliebtheit sortiert)
export function dedupe(list) {
  const kept = [];
  for (const b of list) {
    const k = bookKey(b);
    if (!kept.some((x) => sameKey(x.k, k))) kept.push({ b, k });
  }
  return kept.map((x) => x.b);
}

export const pagesText = (pg) => (pg ? `${pg} Seiten` : '');

// Kurz-Info zur Autor·in: Lebensdaten und Beschreibung von Open Library, dazu – falls bekannt –
// die Kurzbeschreibung von Wikidata in der Lesesprache (z. B. „schwedischer Schriftsteller“)
const infoMemo = new Map();
export function authorInfo(id, lang = 'en') {
  const key = `${lang}:${id}`;
  if (!infoMemo.has(key)) {
    const p = get(`/authors/${String(id).replace('/authors/', '')}.json`).then(async (a) => {
      if (!a) return null;
      const bio = typeof a.bio === 'string' ? a.bio : a.bio?.value || '';
      let short = '';
      const wd = a.remote_ids?.wikidata;
      if (wd && /^Q\d+$/.test(wd)) {
        try {
          const res = await fetch(`https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&origin=*&props=descriptions&languages=de|en&ids=${wd}`);
          const d = (await res.json()).entities?.[wd]?.descriptions || {};
          short = (lang === 'de' ? (d.de || d.en) : (d.en || d.de))?.value || '';
        } catch { /* ohne Kurzbeschreibung */ }
      }
      return {
        name: a.name || '',
        born: a.birth_date || '', died: a.death_date || '',
        short,
        // Quellenangaben und Links am Ende weglassen
        bio: bio.split(/\n\s*(-{3,}|\*{3,}|\(\[source\]|\[source\]|Source:)/i)[0].replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').trim(),
      };
    });
    infoMemo.set(key, p);
    p.catch(() => infoMemo.delete(key));
  }
  return infoMemo.get(key);
}
