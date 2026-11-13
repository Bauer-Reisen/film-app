// Brücke Filme/Serien ↔ Bücher.
// Romanvorlagen erkennt man bei TMDB an Mitwirkenden mit der Aufgabe „Novel“, „Author“ oder „Book“
// (dazu oft das Stichwort „based on novel or book“). Die Person suchen wir bei Open Library.
import * as tmdb from './tmdb.js?v=1.21.0';
import * as books from './books.js?v=1.21.0';
import { marksOf } from './media.js?v=1.21.0';

const NOVEL_JOBS = new Set(['Novel', 'Author', 'Book', 'Original Story', 'Characters', 'Comic Book', 'Graphic Novel']);
const STRONG_JOBS = new Set(['Novel', 'Author', 'Book']);
const LIKED = new Set(['liked', 'loved']);
const norm = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');

// Wer hat die Vorlage geschrieben? → [{ name, job }]
export async function writersOf(md, id) {
  if (md === 'tv') {
    const d = await tmdb.get(`tv/${id}/aggregate_credits`);
    return (d.crew || []).filter((c) => (c.jobs || []).some((j) => STRONG_JOBS.has(j.job))).map((c) => ({ name: c.name, job: c.jobs.find((j) => STRONG_JOBS.has(j.job)).job }));
  }
  const d = await tmdb.get(`movie/${id}/credits`);
  return (d.crew || []).filter((c) => NOVEL_JOBS.has(c.job)).map((c) => ({ name: c.name, job: c.job }));
}

const authorByName = new Map();
async function findAuthor(name) {
  if (!authorByName.has(name)) {
    authorByName.set(name, books.searchAuthors(name, 3).then((list) => list.find((a) => norm(a.n) === norm(name)) || list[0] || null).catch(() => null));
  }
  return authorByName.get(name);
}

// Gemochte Filme und Serien (★ zuerst, neueste zuerst)
export function likedTitles(profile, n = 12) {
  const all = [];
  for (const md of ['movie', 'tv']) {
    for (const [id, m] of Object.entries(marksOf(profile, md))) if (LIKED.has(m.s)) all.push({ md, id: Number(id), ...m });
  }
  return all.sort((a, b) => (b.s === 'loved') - (a.s === 'loved') || b.t - a.t).slice(0, n);
}

// Autor·innen der Vorlagen deiner Lieblingsfilme und -serien, häufigste zuerst
export async function authorsFromFilms(profile) {
  const titles = likedTitles(profile, 20);
  if (!titles.length) return [];
  const found = new Map();
  const res = await Promise.allSettled(titles.map(async (t) => ({ t, writers: await writersOf(t.md, t.id) })));
  for (const r of res) {
    if (r.status !== 'fulfilled') continue;
    for (const w of r.value.writers.filter((x) => STRONG_JOBS.has(x.job)).slice(0, 2)) {
      const e = found.get(w.name) || { name: w.name, count: 0, score: 0, from: r.value.t.n || '', fromMd: r.value.t.md, fromS: r.value.t.s };
      e.count++; e.score += r.value.t.s === 'loved' ? 2 : 1;
      found.set(w.name, e);
    }
  }
  const top = [...found.values()].sort((a, b) => b.score - a.score).slice(0, 10);
  const authors = await Promise.all(top.map(async (e) => { const a = await findAuthor(e.name); return a && { ...a, n: e.name, count: e.count, from: e.from, fromMd: e.fromMd, fromS: e.fromS }; }));
  const seen = new Set();
  return authors.filter((a) => a && !seen.has(a.id) && seen.add(a.id));
}

// Das Buch zu einem Film/einer Serie: Vorlage suchen (Titel + Autor·in). Ergebnis: Buch oder null.
const novelMemo = new Map();
export function novelOf(md, id, title, lang = 'en') {
  const key = `${md}:${id}:${lang}`;
  if (!novelMemo.has(key)) {
    novelMemo.set(key, (async () => {
      const writers = (await writersOf(md, id)).filter((w) => STRONG_JOBS.has(w.job));
      if (!writers.length) return null;
      const w = writers[0];
      // Zuerst Titel + Autor·in, sonst das bekannteste Buch der Person, dessen Titel im Filmtitel steckt
      const hits = await books.search({ q: `${title} ${w.name}` }, lang, 5).catch(() => []);
      const byAuthor = hits.filter((b) => norm(b.a).includes(norm(w.name.split(' ').pop())));
      const t = norm(title);
      const best = byAuthor.find((b) => t.includes(norm(b.title).slice(0, 8)) || norm(b.title).includes(t.slice(0, 8))) || byAuthor[0];
      return best ? { ...best, writer: w.name } : null;
    })().catch(() => null));
  }
  return novelMemo.get(key);
}
