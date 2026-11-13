// Buch-Vorschläge berechnen – nachvollziehbar wie bei Filmen:
// Ausgangspunkte → Kandidaten (Open Library) → Punkte → Vielfalt → Begründung.
// Brücke: Romanvorlagen gemochter Filme und Serien, feste Paare (seeds-books.js), Autor·innen aus Filmen.
import * as books from './books.js?v=1.16.0';
import { tierOf } from './store.js?v=1.16.0';
import { themeById } from './themes.js?v=1.16.0';
import { BOOK_GENRES, bookGenreById } from './book-genres.js?v=1.16.0';
import { PAIRS } from './seeds-books.js?v=1.16.0';
import { likedTitles, novelOf, authorsFromFilms } from './bridge-books.js?v=1.16.0';
import { markedTitle } from './recommend.js?v=1.16.0';

// Punkte je Grund (Stufe 2 = ★ Liebe, 1 = ♥ Gern) und Obergrenzen
export const BOOK_POINTS = {
  author: { 2: 9, 1: 5 },       // Lieblingsautor·in
  sameAuthor: 4, sameAuthorMax: 8, // Autor·in eines ★/♥-Buchs
  subjects: { loved: 4, liked: 2.5 }, subjectsMax: 8, // gleiche Schlagwörter wie ein ★/♥-Buch
  theme: { 2: 5, 1: 3 }, themeMax: 8,
  genre: { 2: 3, 1: 1.5 }, genreMax: 4,
  novel: 8,        // Vorlage zu einem gemochten Film / einer Serie
  pair: 6,         // Paarliste
  filmAuthor: 4,   // Autor·in von Vorlagen gemochter Filme
  tiltMax: 2,
  minReaders: 30, minRating: 3.5, favMinReaders: 5,
  blockSize: 20, perSourceInBlock: 4,
};
const P = BOOK_POINTS;
const LIKED = new Set(['liked', 'loved']);
const FAV = new Set(['author', 'sameAuthor', 'novel', 'pair', 'filmAuthor']);
const norm = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');
const lastName = (n) => norm(String(n || '').split(' ').pop());
const akOf = (id) => String(id || '').replace('/authors/', '');
// Schlagwörter, die fast jedes Buch hat – zählen nicht als Gemeinsamkeit
const GENERIC = /(fiction|literature|novel|general|bestseller|reviewed|english|american|german|englisch|award|adaptation|large_type|accessible|protected|lending|in_library|reading|translation|chang_pian|xiao_shuo|literary|classic|contemporary|drama|belletrist|roman|juvenile|children|staff_picks|open_library|nyt|_\d|\d{4}|stories|books|fictitious|history_and_criticism|criticism|study|guides|manners_and_customs|social_life|man-woman)/;
// … ebenso Genre-Wörter (zählen über die Genres) und Sprachangaben
const LANGS = /(language|spanish|french|german|italian|welsh|latin|chinese|japanese|_materials|translat)/;
const specific = (subjects) => (subjects || []).filter((s) => s.length <= 40 && !GENERIC.test(s) && !LANGS.test(s) && !BOOK_GENRES.some((g) => g.re.test(s)));
// Sammelbände, Gesamtausgaben, Studienhilfen
const BUNDLE = /( \/ |\b(complete|collected|omnibus|box(ed)? set|boxset|collection|trilogy set|novels of|works of|study guide|sparknotes|cliffs ?notes)\b)/i;

// Zeiträume (Jahr der Erstausgabe)
const THIS_YEAR = new Date().getFullYear();
export const BOOK_ERAS = [
  { id: 'neu', n: 'Neu (letzte 3 Jahre)', short: 'Neu', from: THIS_YEAR - 2 },
  { id: '2010', n: '2010 bis heute', short: 'Seit 2010', from: 2010 },
  { id: '2000', n: '2000er', short: '2000er', from: 2000, to: 2009 },
  { id: '1980', n: '1980er und 1990er', short: '80er und 90er', from: 1980, to: 1999 },
  { id: '1950', n: '1950 bis 1979', short: '1950–1979', from: 1950, to: 1979 },
  { id: '1900', n: '1900 bis 1949', short: '1900–1949', from: 1900, to: 1949 },
  { id: 'alt', n: 'Klassiker vor 1900', short: 'Vor 1900', to: 1899 },
];
export const bookEraById = new Map(BOOK_ERAS.map((e) => [e.id, e]));
const inEra = (er, y) => !er || (!!y && (!er.from || y >= er.from) && (!er.to || y <= er.to));
const eraQuery = (er) => (er ? ` AND first_publish_year:[${er.from || 0} TO ${er.to || THIS_YEAR}]` : '');
const subjQ = (list) => `(${list.map((s) => `subject_key:${s}`).join(' OR ')})`;

const byTier = (a, b) => tierOf(b) - tierOf(a) || (b.t || 0) - (a.t || 0);
const likedBooks = (profile) => Object.entries(profile.books || {}).filter(([, m]) => LIKED.has(m.s))
  .map(([id, m]) => ({ id, ...m })).sort((a, b) => (b.s === 'loved') - (a.s === 'loved') || b.t - a.t);

export const hasBookSources = (profile) => likedBooks(profile).length > 0 || (profile.authors || []).length > 0
  || (profile.bookGenres || []).length > 0 || (profile.themes || []).some((t) => themeById.get(t.id)?.b)
  || likedTitles(profile, 1).length > 0;

// Genre-Neigung aus gemochten bzw. nicht gemochten Büchern (abgebrochen zählt halb negativ)
function genreTilt(profile) {
  const pos = {}; const neg = {};
  let nPos = 0; let nNeg = 0;
  for (const m of Object.values(profile.books || {})) {
    const p = LIKED.has(m.s) ? 1 : 0;
    const n = m.s === 'disliked' ? 1 : m.s === 'dropped' ? 0.5 : 0;
    if (p) { nPos += p; (m.g || []).forEach((g) => { pos[g] = (pos[g] || 0) + p; }); }
    if (n) { nNeg += n; (m.g || []).forEach((g) => { neg[g] = (neg[g] || 0) + n; }); }
  }
  return (genres) => {
    if (!genres?.length || (!nPos && !nNeg)) return 0;
    const v = genres.reduce((sum, g) => sum + (nPos ? (pos[g] || 0) / nPos : 0) - (nNeg ? (neg[g] || 0) / nNeg : 0), 0) / genres.length;
    return Math.max(-P.tiltMax, Math.min(P.tiltMax, v * 5));
  };
}

// Ausgangspunkte
async function sourcesOf(profile, lang) {
  const liked = likedBooks(profile).slice(0, 8);
  // Schlagwörter der gemochten Bücher (eine Abfrage für alle)
  let likedFull = [];
  if (liked.length) {
    const q = liked.map((b) => `key:/works/${b.id}`).join(' OR ');
    likedFull = await books.search({ q }, lang, liked.length).catch(() => []);
  }
  const subjOf = new Map(likedFull.map((b) => [b.id, specific(b.s)]));
  return {
    liked: liked.map((b) => ({ ...b, subj: subjOf.get(b.id) || [] })),
    authors: [...(profile.authors || [])].sort(byTier).slice(0, 8).map((a) => ({ ...a, ak: akOf(a.id) })),
    themes: [...(profile.themes || [])].filter((t) => themeById.get(t.id)?.b?.length).sort(byTier).slice(0, 5).map((t) => ({ ...t, th: themeById.get(t.id) })),
    genres: [...(profile.bookGenres || [])].filter((g) => bookGenreById.has(g.id)).sort(byTier).slice(0, 5).map((g) => ({ ...g, ge: bookGenreById.get(g.id) })),
  };
}

// Kandidaten sammeln: [{ book, src? }] – src nur bei Brücken-Gründen, die man dem Buch nicht ansieht
async function collect(profile, src, lang, page, { theme, era } = {}) {
  const jobs = [];
  const er = era ? bookEraById.get(era) : null;
  const yq = eraQuery(er);
  const add = (promise, src2) => jobs.push(promise.then((list) => list.map((book) => ({ book, src: src2 }))));
  const q = (query, limit = 30, extra = {}) => books.search({ q: query + yq, sort: 'readinglog', ...extra }, lang, limit);
  // Seiten 1 … page (schon geladene Seiten kommen aus dem Speicher)
  const paged = (query, limit) => { for (let p = 1; p <= page; p++) add(q(query, limit, { page: p })); };

  // Autor·innen: Lieblinge und die der ★/♥-Bücher
  const aks = [...new Set([...src.authors.map((a) => a.ak), ...src.liked.map((b) => akOf(b.ak)).filter(Boolean)])].slice(0, 10);
  aks.forEach((ak) => add(q(`author_key:${ak}`, 20)));
  // Gleiche Schlagwörter wie die gemochten Bücher: die häufigsten zuerst
  const count = {};
  src.liked.forEach((b) => b.subj.forEach((s) => { count[s] = (count[s] || 0) + (b.s === 'loved' ? 2 : 1); }));
  const top = Object.entries(count).sort((a, b) => b[1] - a[1] || a[0].length - b[0].length).map(([s]) => s);
  for (let i = 0; i < 2 && top.length > i * 8; i++) paged(subjQ(top.slice(i * 8, i * 8 + 8)), 40);
  // Themen und Genres
  src.themes.forEach((t) => paged(subjQ(t.th.b), 30));
  src.genres.forEach((g) => paged(subjQ(g.ge.q), 30));
  // Mit Filter „Heute Lust auf …“: das Thema selbst, sonst die Lieblingsgenres
  if (theme) paged(subjQ(themeById.get(theme).b), 40);
  else if (er) {
    const gs = src.genres.length ? src.genres.flatMap((g) => g.ge.q) : ['fiction'];
    paged(subjQ(gs), 40);
  }

  // Brücke
  {
    const titles = likedTitles(profile, 8);
    titles.forEach((t) => {
      const ref = { md: t.md, id: t.id, n: markedTitle(profile, t.id, t.md), s: t.s };
      jobs.push(novelOf(t.md, t.id, ref.n, lang).then((b) => (b ? [{ book: b, src: { kind: 'novel', ref } }] : [])).catch(() => []));
    });
    // Feste Paare: Film/Serie → Buch
    const pairs = PAIRS.filter(([m, id]) => LIKED.has((m === 't' ? profile.shows : profile.movies)?.[id]?.s));
    if (pairs.length) {
      const ids = [...new Set(pairs.map((p) => p[2]))];
      jobs.push(books.search({ q: ids.map((id) => `key:/works/${id}`).join(' OR ') }, lang, ids.length).then((list) => pairs.flatMap(([m, id, w]) => {
        const book = list.find((b) => b.id === books.canonical(w));
        const md = m === 't' ? 'tv' : 'movie';
        return book ? [{ book, src: { kind: 'pair', ref: { md, id, n: markedTitle(profile, id, md), s: (md === 'tv' ? profile.shows : profile.movies)[id].s } } }] : [];
      })).catch(() => []));
    }
    // Autor·innen der Vorlagen gemochter Filme und Serien
    jobs.push(authorsFromFilms(profile).then(async (list) => {
      const pick = list.filter((a) => !aks.includes(akOf(a.id))).slice(0, 4);
      const res = await Promise.allSettled(pick.map((a) => q(`author_key:${akOf(a.id)}`, 15).then((bs) => bs.map((book) => ({ book, src: { kind: 'filmAuthor', ref: a } })))));
      return res.flatMap((r) => (r.status === 'fulfilled' ? r.value : []));
    }).catch(() => []));
  }

  const settled = await Promise.allSettled(jobs);
  const ok = settled.filter((r) => r.status === 'fulfilled').flatMap((r) => r.value);
  const failed = settled.find((r) => r.status === 'rejected');
  if (!ok.length && failed) throw failed.reason;
  return ok;
}

const pts = (r) => r.p;
const CAP = { sameAuthor: P.sameAuthorMax, subjects: P.subjectsMax, theme: P.themeMax, genre: P.genreMax };
const PRIORITY = ['novel', 'author', 'pair', 'sameAuthor', 'subjects', 'filmAuthor', 'theme', 'genre'];

// Gründe, die man dem Buch selbst ansieht (Autor·in, Schlagwörter, Genres)
function reasonsOf(b, src) {
  const out = [];
  const ak = akOf(b.ak);
  const s = new Set(b.s || []);
  for (const a of src.authors) if (a.ak === ak) out.push({ kind: 'author', ref: a, p: P.author[tierOf(a)] || 0 });
  for (const l of src.liked) {
    if (l.id === b.id) continue;
    if (ak && akOf(l.ak) === ak) out.push({ kind: 'sameAuthor', ref: l, p: P.sameAuthor });
    const common = l.subj.filter((x) => s.has(x)).length;
    if (common >= 2) out.push({ kind: 'subjects', ref: l, p: P.subjects[l.s] * Math.min(1, common / 4) });
  }
  for (const t of src.themes) if (t.th.b.some((x) => s.has(x))) out.push({ kind: 'theme', ref: t, p: P.theme[tierOf(t)] || 0 });
  for (const g of src.genres) if ((b.g || []).includes(g.id)) out.push({ kind: 'genre', ref: g, p: P.genre[tierOf(g)] || 0 });
  return out;
}

const ofWhat = (ref) => `${ref.md === 'tv' ? 'der Serie' : 'dem Film'} „${ref.n}“`;
const verb = (ref) => (ref.s === 'loved' ? 'liebst' : 'mochtest');
function reasonText(reasons) {
  const by = (kind) => reasons.filter((r) => r.kind === kind).sort((a, b) => b.p - a.p);
  const texts = {
    novel: () => { const r = by('novel')[0]; return `Die Vorlage zu ${ofWhat(r.ref)}, ${r.ref.md === 'tv' ? 'die' : 'den'} du ${verb(r.ref)}`; },
    pair: () => { const r = by('pair')[0]; return `Weil du ${r.ref.md === 'tv' ? 'die Serie' : 'den Film'} „${r.ref.n}“ ${verb(r.ref)}`; },
    author: () => `Von ${by('author')[0].ref.n || 'deiner Lieblingsautor·in'}`,
    sameAuthor: () => `Von der Autor·in von „${by('sameAuthor')[0].ref.n}“`,
    subjects: () => { const same = new Set(by('sameAuthor').map((r) => r.ref.id)); const l = by('subjects').filter((r) => !same.has(r.ref.id)); if (!l.length) return null; return `Ähnlich wie ${l.slice(0, 2).map((r) => `„${r.ref.n}“`).join(' und ')}`; },
    filmAuthor: () => { const r = by('filmAuthor')[0]; return `Von ${r.ref.n}${r.ref.from ? ` (Vorlage zu „${r.ref.from}“)` : ''}`; },
    theme: () => `Thema: ${by('theme').slice(0, 2).map((r) => r.ref.th.n).join(' und ')}`,
    genre: () => `Genre: ${by('genre').slice(0, 2).map((r) => r.ref.ge.n).join(' und ')}`,
  };
  const weight = (kind) => Math.min(by(kind).reduce((sum, r) => sum + r.p, 0), CAP[kind] ?? Infinity);
  const kinds = PRIORITY.filter((k) => by(k).length).sort((a, b) => weight(b) - weight(a) || PRIORITY.indexOf(a) - PRIORITY.indexOf(b));
  const parts = [];
  for (const k of kinds) {
    if (parts.length === 2) break;
    if (parts.length === 1 && weight(k) < 3) break;
    const t = texts[k]();
    if (t && !parts.includes(t)) parts.push(t);
  }
  return parts.join(' · ');
}

/**
 * Hauptfunktion: sortierte Liste [{ book, score, text, reasons, source }]
 * filter: { theme, era } für „Heute Lust auf …“ und „Aus welcher Zeit“
 */
export async function computeBooks(profile, page = 1, filter = {}) {
  const lang = books.readLang(profile);
  const src = await sourcesOf(profile, lang);
  const results = await collect(profile, src, lang, page, filter);
  const tilt = genreTilt(profile);
  const marks = profile.books || {};
  const th = filter.theme ? themeById.get(filter.theme) : null;
  const er = filter.era ? bookEraById.get(filter.era) : null;
  const filtered = !!(th || er);
  // Titel, die man schon kennt (andere Werk-Nummer, gleicher Titel)
  const kids = Object.values(marks).some((m) => LIKED.has(m.s) && (m.g || []).includes('kinder')) || (profile.bookGenres || []).some((g) => g.id === 'kinder');
  const knownTitles = new Set(Object.values(marks).map((m) => norm(m.n)).filter((t) => t.length > 3));

  const cands = new Map();
  for (const { book, src: s2 } of results) {
    if (!book?.id) continue;
    const id = books.canonical(book.id);
    if (!cands.has(id)) cands.set(id, { book: { ...book, id }, extra: [] });
    const c = cands.get(id);
    if (s2 && !c.extra.some((r) => r.kind === s2.kind && r.ref.id === s2.ref.id)) c.extra.push({ ...s2, p: P[s2.kind] });
    if ((book.s || []).length > (c.book.s || []).length) c.book = { ...c.book, s: book.s, g: book.g };
  }

  const list = [];
  const sameWork = new Map(); // gleicher Titel + Autor·in → nur einmal
  for (const c of cands.values()) {
    const b = c.book;
    if (marks[b.id] || !b.cover || knownTitles.has(norm(b.title)) || BUNDLE.test(b.title)) continue;
    if (lang === 'en' && b.edLang === false) continue; // keine englische Ausgabe bekannt
    if ((b.g || []).includes('kinder') && !kids) continue; // Kinderbücher nur, wenn man selbst welche mag
    if (th && !th.b.some((x) => (b.s || []).includes(x))) continue;
    if (!inEra(er, b.y)) continue;
    const reasons = [...reasonsOf(b, src), ...c.extra].filter((r, _, all) => !(r.kind === 'filmAuthor' && all.some((x) => x.kind === 'novel')));
    if (!reasons.length && !filtered) continue;
    const fav = reasons.some((r) => FAV.has(r.kind));
    if (!(b.r >= (fav ? P.favMinReaders : P.minReaders) || (b.rating || 0) >= P.minRating)) continue;
    let score = 0;
    for (const kind of PRIORITY) {
      const sum = reasons.filter((r) => r.kind === kind).reduce((acc, r) => acc + r.p, 0);
      if (sum) score += Math.min(sum, CAP[kind] ?? Infinity);
    }
    const t = tilt(b.g);
    score += t + Math.log10(Math.max(b.r || 1, 1)) * 0.6 + (b.rating ? (b.rating - 3.5) : 0);
    const main = [...reasons].sort((x, y) => y.p - x.p)[0];
    const why = reasonText(reasons) || (t > 0.5 ? 'Passt zu deinen Lieblingsgenres' : 'Viel gelesen');
    const head = [th && !why.includes(th.n) ? th.n : '', er?.short].filter(Boolean).join(' · ');
    const item = { book: b, score, reasons, source: main ? `${main.kind}:${main.kind === 'author' || main.kind === 'sameAuthor' ? akOf(b.ak) : main.ref.id}` : `a:${akOf(b.ak)}`, text: head ? `${head} · ${why}` : why };
    const key = `${norm(b.title)}|${lastName(b.a)}`;
    const prev = sameWork.get(key);
    if (prev && prev.book.r >= b.r) continue;
    if (prev) list.splice(list.indexOf(prev), 1);
    sameWork.set(key, item);
    list.push(item);
  }
  list.sort((a, b) => b.score - a.score || (b.book.r || 0) - (a.book.r || 0));
  return diversify(list);
}

// Pro 20er-Block höchstens 4 Bücher aus derselben Hauptquelle (z. B. derselben Autor·in)
function diversify(list) {
  const out = [];
  let rest = list;
  while (rest.length) {
    const block = []; const count = {}; const later = [];
    for (const item of rest) {
      if (block.length < P.blockSize && (count[item.source] || 0) < P.perSourceInBlock) {
        block.push(item);
        count[item.source] = (count[item.source] || 0) + 1;
      } else later.push(item);
    }
    if (!block.length) { out.push(...later); break; }
    out.push(...block);
    rest = later;
  }
  return out;
}

export const visibleBooks = (profile, list) => list.filter((x) => !(profile.books || {})[x.book.id]);
