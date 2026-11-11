// Vorschläge berechnen – nachvollziehbar, ohne „Lernen“:
// Ausgangspunkte holen → Kandidaten sammeln → Punkte vergeben → Vielfalt → Begründung.
// Alle Zahlen stehen in config.js (RECOMMEND).
import { RECOMMEND as R } from './config.js?v=1.0.0';
import * as tmdb from './tmdb.js?v=1.0.0';
import { SEED_MOVIES, SEED_STUDIOS } from './seeds.js?v=1.0.0';
import { tierOf } from './store.js?v=1.0.0';
import { themeById } from './themes.js?v=1.0.0';

const seedById = new Map(SEED_MOVIES.map((m) => [m.id, m]));
const studioName = new Map(SEED_STUDIOS.map((s) => [s.id, s.n]));

const newest = (entries, n) => entries.sort((a, b) => b.t - a.t).slice(0, n);
// ★ Liebe vor ♥ Gern, dann die neuesten
const strongest = (entries, n) => entries.sort((a, b) => tierOf(b) - tierOf(a) || b.t - a.t).slice(0, n);
const LIKED = new Set(['liked', 'loved']);

// Titel eines markierten Films in der Profilsprache (Startliste) oder wie beim Markieren gespeichert
export function markedTitle(profile, id) {
  const seed = seedById.get(Number(id));
  if (seed) return seed.t[profile.language.slice(0, 2)] || seed.t.en;
  return profile.movies[id]?.n || 'einem Film';
}

// Ausgangspunkte aus dem Profil
function sourcesOf(profile) {
  const films = Object.entries(profile.movies).map(([id, m]) => ({ id: Number(id), ...m }));
  return {
    loved: newest(films.filter((m) => m.s === 'loved'), R.seeds.loved),
    liked: newest(films.filter((m) => m.s === 'liked'), R.seeds.liked),
    want: newest(films.filter((m) => m.s === 'want'), R.seeds.want),
    people: strongest([...profile.people], R.seeds.people),
    companies: strongest([...profile.companies], R.seeds.companies),
    themes: strongest((profile.themes || []).filter((x) => themeById.has(x.id)).map((x) => ({ ...x, n: themeById.get(x.id).n })), R.seeds.themes),
  };
}

export const hasSources = (profile) => {
  const s = sourcesOf(profile);
  return s.loved.length + s.liked.length + s.want.length + s.people.length + s.companies.length + s.themes.length > 0;
};

// Genre-Neigung: Anteil in gemochten minus Anteil in nicht gemochten Filmen
export function genreTilt(profile) {
  const pos = {}; const neg = {};
  let nPos = 0; let nNeg = 0;
  for (const m of Object.values(profile.movies)) {
    if (LIKED.has(m.s)) { nPos++; (m.g || []).forEach((g) => { pos[g] = (pos[g] || 0) + 1; }); }
    if (m.s === 'disliked') { nNeg++; (m.g || []).forEach((g) => { neg[g] = (neg[g] || 0) + 1; }); }
  }
  return (genres) => {
    if (!genres?.length || (!nPos && !nNeg)) return 0;
    const v = genres.reduce((sum, g) => sum + (nPos ? (pos[g] || 0) / nPos : 0) - (nNeg ? (neg[g] || 0) / nNeg : 0), 0) / genres.length;
    return Math.max(-R.points.genreMax, Math.min(R.points.genreMax, v * 5));
  };
}

// Holt alle Kandidaten. page > 1 holt bei den Film-Quellen weitere Empfehlungsseiten dazu.
async function collect(profile, page) {
  const lang = profile.language;
  const src = sourcesOf(profile);
  const jobs = [];
  const add = (kind, ref, promise, pick) => jobs.push(promise.then((data) => ({ kind, ref, movies: pick(data) })));

  for (const kind of ['loved', 'liked', 'want']) {
    for (const f of src[kind]) {
      for (let p = 1; p <= page; p++) {
        add(kind, f, tmdb.get(`movie/${f.id}/recommendations`, { language: lang, page: p }), (d) => d.results || []);
      }
    }
  }
  for (const person of src.people) {
    add(person.role === 'director' ? 'director' : 'actor', person, tmdb.get(`person/${person.id}/movie_credits`, { language: lang }), (d) =>
      person.role === 'director'
        ? (d.crew || []).filter((m) => m.job === 'Director')
        : (d.cast || []).filter((m) => m.order != null && m.order <= 4));
  }
  for (const th of src.themes) {
    add('theme', th, tmdb.get('discover/movie', { language: lang, with_keywords: themeById.get(th.id).k.join('|'), sort_by: 'vote_average.desc', 'vote_count.gte': 300, page }), (d) => d.results || []);
  }
  for (const c of src.companies) {
    const ids = [c.id, ...(c.also || [])].join('|');
    add('company', c, tmdb.get('discover/movie', { language: lang, with_companies: ids, sort_by: 'vote_average.desc', 'vote_count.gte': 150, page }), (d) => d.results || []);
  }

  const settled = await Promise.allSettled(jobs);
  const ok = settled.filter((r) => r.status === 'fulfilled').map((r) => r.value);
  if (jobs.length && !ok.length) throw settled.find((r) => r.status === 'rejected').reason;
  return ok;
}

// Punkte für einen Grund – bei Personen, Studios und Themen je nach Stufe
const pts = (r) => { const p = R.points[r.kind]; return typeof p === 'object' ? p[tierOf(r.ref)] || 0 : p; };
const CAP = { loved: R.points.lovedMax, liked: R.points.likedMax, want: R.points.wantMax, theme: R.points.themeMax };
const PRIORITY = ['actor', 'director', 'loved', 'liked', 'theme', 'want', 'company'];

// Begründungssatz aus den stärksten Gründen
function reasonText(profile, reasons) {
  const by = (kind) => reasons.filter((r) => r.kind === kind).sort((a, b) => pts(b) - pts(a));
  const parts = [];
  const film = (kind, verb) => {
    const list = by(kind);
    if (!list.length) return null;
    const titles = list.slice(0, 2).map((r) => `„${markedTitle(profile, r.ref.id)}“`);
    return `${verb.before}${titles.join(' und ')}${verb.after}`;
  };
  const texts = {
    actor: () => by('actor').length && `Mit ${by('actor').slice(0, 2).map((r) => r.ref.n).join(' und ')}`,
    director: () => by('director').length && `Regie: ${by('director')[0].ref.n}`,
    loved: () => film('loved', { before: 'Weil du ', after: ' liebst' }),
    liked: () => film('liked', { before: 'Weil du ', after: ' mochtest' }),
    want: () => film('want', { before: 'Ähnlich wie ', after: ' auf deiner Merkliste' }),
    theme: () => by('theme').length && `Thema: ${by('theme').slice(0, 2).map((r) => r.ref.n).join(' und ')}`,
    company: () => by('company').length && `Von ${by('company')[0].ref.n || studioName.get(by('company')[0].ref.id) || 'deinem Lieblingsstudio'}`,
  };
  // Gründe nach Gewicht sortieren, bei Gleichstand nach fester Reihenfolge
  const weight = (kind) => Math.min(by(kind).reduce((sum, r) => sum + pts(r), 0), CAP[kind] ?? Infinity);
  const kinds = PRIORITY.filter((k) => by(k).length).sort((a, b) => weight(b) - weight(a) || PRIORITY.indexOf(a) - PRIORITY.indexOf(b));
  // Geliebt und gemocht zusammen: ein Satz statt zwei
  if (kinds[0] === 'loved' && kinds[1] === 'liked') {
    return `Weil du „${markedTitle(profile, by('loved')[0].ref.id)}“ liebst und „${markedTitle(profile, by('liked')[0].ref.id)}“ mochtest`;
  }
  for (const k of kinds) {
    if (parts.length === 2) break;
    if (parts.length === 1 && weight(k) < 3) break; // zweiter Grund nur, wenn er zählt
    const t = texts[k]();
    if (t) parts.push(t);
  }
  return parts.join(' · ') || 'Passt zu deinem Geschmack';
}

// Hauptfunktion: sortierte Liste mit Begründung
export async function compute(profile, page = 1) {
  const results = await collect(profile, page);
  const tilt = genreTilt(profile);
  const today = new Date().toISOString().slice(0, 10);
  const cands = new Map();

  for (const { kind, ref, movies } of results) {
    for (const m of movies) {
      if (!cands.has(m.id)) cands.set(m.id, { movie: m, reasons: [] });
      const c = cands.get(m.id);
      if (!c.reasons.some((r) => r.kind === kind && r.ref.id === ref.id)) c.reasons.push({ kind, ref });
      if (!c.movie.overview && m.overview) c.movie = { ...c.movie, overview: m.overview };
    }
  }

  const list = [];
  for (const c of cands.values()) {
    const m = c.movie;
    // Harte Ausschlüsse – laufen bei jeder Ausgabe erneut (siehe visible())
    if (m.adult || !m.poster_path || !m.release_date || m.release_date > today || profile.movies[m.id]) continue;
    const fav = c.reasons.some((r) => r.kind === 'actor' || r.kind === 'director');
    const minVote = fav ? R.favMinVote : R.minVote;
    const minVotes = fav ? R.favMinVotes : R.minVotes;
    if ((m.vote_average || 0) < minVote || (m.vote_count || 0) < minVotes) continue;

    let score = 0;
    for (const kind of PRIORITY) {
      const sum = c.reasons.filter((r) => r.kind === kind).reduce((acc, r) => acc + pts(r), 0);
      if (sum) score += Math.min(sum, CAP[kind] ?? Infinity);
    }
    score += tilt(m.genre_ids) + (m.vote_average - 6.5);
    // Hauptquelle = der Grund mit den meisten Punkten (für die Vielfalt)
    const main = [...c.reasons].sort((a, b) => pts(b) - pts(a) || PRIORITY.indexOf(a.kind) - PRIORITY.indexOf(b.kind))[0];
    const strong = ['actor', 'director', 'theme', 'company'].includes(main.kind) && tierOf(main.ref) === 2;
    list.push({ movie: m, score, reasons: c.reasons, source: `${main.kind}:${main.ref.id}`, strong, text: reasonText(profile, c.reasons) });
  }
  list.sort((a, b) => b.score - a.score || (b.movie.vote_count || 0) - (a.movie.vote_count || 0));
  return diversify(list);
}

// Pro 20er-Block höchstens 4 Filme aus derselben Hauptquelle
function diversify(list) {
  const out = [];
  let rest = list;
  while (rest.length) {
    const block = []; const count = {}; const later = [];
    for (const item of rest) {
      if (block.length < R.blockSize && (count[item.source] || 0) < (item.strong ? R.perStrongSourceInBlock : R.perSourceInBlock)) {
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

// Endfilter bei jeder Ausgabe: nichts, was schon markiert ist
export const visible = (profile, list) => list.filter((x) => !profile.movies[x.movie.id]);
