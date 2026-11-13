// Vorschläge berechnen – nachvollziehbar, ohne „Lernen“:
// Ausgangspunkte holen → Kandidaten sammeln → Punkte vergeben → Vielfalt → Begründung.
// Gilt für Filme und Serien (media = 'movie' | 'tv'). Alle Zahlen stehen in config.js.
import { RECOMMEND as R, RECOMMEND_TV as RT, BRIDGE as B } from './config.js?v=1.19.0';
import * as tmdb from './tmdb.js?v=1.19.0';
import { SEED_MOVIES, SEED_STUDIOS } from './seeds.js?v=1.19.0';
import { SEED_SHOWS } from './seeds-tv.js?v=1.19.0';
import { tierOf } from './store.js?v=1.19.0';
import { themeById, themeQuery } from './themes.js?v=1.19.0';
import { MEDIA, mediaOf, marksOf, other, excludedGenre, creditsOf, mapGenres } from './media.js?v=1.19.0';

const seedById = { movie: new Map(SEED_MOVIES.map((m) => [m.id, m])), tv: new Map(SEED_SHOWS.map((m) => [m.id, m])) };
const studioName = new Map(SEED_STUDIOS.map((s) => [s.id, s.n]));

const newest = (entries, n) => entries.sort((a, b) => b.t - a.t).slice(0, n);
// ★ Liebe vor ♥ Gern, dann die neuesten
const strongest = (entries, n) => entries.sort((a, b) => tierOf(b) - tierOf(a) || b.t - a.t).slice(0, n);
const LIKED = new Set(['liked', 'loved']);
const today = () => new Date().toISOString().slice(0, 10);

// Kinderserien nur, wenn man selbst welche mag (sonst landen z. B. Zeichentrick für Kleine in den Vorschlägen)
const KIDS_TV = 10762;
const likesKids = (profile) => Object.values(marksOf(profile, 'tv')).some((m) => LIKED.has(m.s) && (m.g || []).includes(KIDS_TV));
const kidsBlocked = (profile, md, m) => md === 'tv' && (m.genre_ids || []).includes(KIDS_TV) && !likesKids(profile);

// Grenzen je Medium
const limits = (md) => (md === 'tv' ? { ...R, ...RT, points: { ...R.points, ...RT.points } } : R);

// Titel eines markierten Titels in der Profilsprache (Startliste) oder wie beim Markieren gespeichert
export function markedTitle(profile, id, md = mediaOf(profile)) {
  const seed = seedById[md].get(Number(id));
  if (seed) return seed.t[profile.language.slice(0, 2)] || seed.t.en;
  return marksOf(profile, md)[id]?.n || MEDIA[md].w.ofA;
}

// Ausgangspunkte aus dem Profil
function sourcesOf(profile, md) {
  const films = Object.entries(marksOf(profile, md)).map(([id, m]) => ({ id: Number(id), ...m }));
  const otherFilms = Object.entries(marksOf(profile, other(md))).map(([id, m]) => ({ id: Number(id), ...m }));
  return {
    loved: newest(films.filter((m) => m.s === 'loved'), R.seeds.loved),
    liked: newest(films.filter((m) => m.s === 'liked'), R.seeds.liked),
    want: newest(films.filter((m) => m.s === 'want'), R.seeds.want),
    paused: newest(films.filter((m) => m.s === 'paused'), R.seeds.want),
    people: strongest([...profile.people], R.seeds.people),
    companies: strongest([...profile.companies], R.seeds.companies),
    networks: md === 'tv' ? strongest([...(profile.networks || [])], RT.seeds.networks) : [],
    themes: strongest((profile.themes || []).filter((x) => themeById.has(x.id)).map((x) => ({ ...x, n: themeById.get(x.id).n })), R.seeds.themes),
    // Brücke: ★ vor ♥ aus der jeweils anderen Seite
    bridge: [...newest(otherFilms.filter((m) => m.s === 'loved'), B.sources), ...newest(otherFilms.filter((m) => m.s === 'liked'), B.sources)].slice(0, B.sources),
  };
}

export const hasSources = (profile, md = mediaOf(profile)) => {
  const s = sourcesOf(profile, md);
  return Object.values(s).some((list) => list.length > 0);
};

// Genre-Neigung: Anteil in gemochten minus Anteil in nicht gemochten Titeln.
// „Weiterschauen“ zählt halb positiv, „Hat mich verloren“ halb negativ.
// Die andere Seite (Filme bzw. Serien) zählt mit halbem Gewicht, Genres übersetzt.
export function genreTilt(profile, md = mediaOf(profile)) {
  const pos = {}; const neg = {};
  let nPos = 0; let nNeg = 0;
  const add = (marks, weight, translate) => {
    for (const m of Object.values(marks)) {
      const g = translate ? mapGenres(m.g, other(md)) : m.g || [];
      const p = LIKED.has(m.s) ? 1 : m.s === 'paused' ? 0.5 : 0;
      const n = m.s === 'disliked' ? 1 : m.s === 'dropped' ? 0.5 : 0;
      if (p) { nPos += p * weight; g.forEach((x) => { pos[x] = (pos[x] || 0) + p * weight; }); }
      if (n) { nNeg += n * weight; g.forEach((x) => { neg[x] = (neg[x] || 0) + n * weight; }); }
    }
  };
  add(marksOf(profile, md), 1, false);
  add(marksOf(profile, other(md)), 0.5, true);
  return (genres) => {
    if (!genres?.length || (!nPos && !nNeg)) return 0;
    const v = genres.reduce((sum, g) => sum + (nPos ? (pos[g] || 0) / nPos : 0) - (nNeg ? (neg[g] || 0) / nNeg : 0), 0) / genres.length;
    return Math.max(-R.points.genreMax, Math.min(R.points.genreMax, v * 5));
  };
}

// ---------- Brücke Film ↔ Serie ----------
const norm = (t) => (t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9: ]/g, '').trim();
const sameTitle = (hit, title) => {
  const a = norm(title);
  if (a.length < 3) return false;
  return [hit.title, hit.original_title].map(norm).some((b) => b === a || b.startsWith(`${a}:`) || a.startsWith(`${b}:`));
};

async function bridge(profile, md) {
  const src = sourcesOf(profile, md).bridge;
  if (!src.length) return [];
  const from = other(md);
  const c = MEDIA[md];
  const lang = profile.language;
  const jobs = [];
  const refOf = (s) => ({ id: s.id, n: markedTitle(profile, s.id, from), s: s.s, w: s.s === 'loved' ? 2 : 1, g: s.g || [], from });
  const people = new Map(); // id → { person, score, from }

  for (const s of src) {
    const ref = refOf(s);
    // 1. gleicher Titel oder Stoff (z. B. Film und Serie „Fargo“)
    jobs.push(tmdb.get(c.search, { query: ref.n, language: lang })
      .then((d) => ({ kind: 'bridgeTitle', ref, movies: (d.results || []).filter((h) => sameTitle(h, ref.n) && (h.vote_count || 0) >= 20) })));
    // 2. gleiche Themen: die wichtigsten Stichwörter, nur Treffer mit passendem Genre
    jobs.push(tmdb.get(`${from}/${s.id}/keywords`).then((d) => {
      const kws = (d.keywords || d.results || []).filter((k) => !B.genericKeywords.test(k.name)).slice(0, 3);
      if (!kws.length) return { kind: 'bridgeTopic', ref, movies: [] };
      const genres = new Set(mapGenres(ref.g, from));
      return tmdb.get(c.discover, { language: lang, with_keywords: kws.map((k) => k.id).join('|'), sort_by: 'vote_count.desc', without_genres: c.without })
        .then((r) => ({ kind: 'bridgeTopic', ref, movies: (r.results || []).filter((m) => !genres.size || (m.genre_ids || []).some((g) => genres.has(g))) }));
    }));
  }
  // 3. gleiche Personen: Regie und die drei Hauptrollen aller Ausgangspunkte, die häufigsten zuerst
  const credits = await Promise.allSettled(src.map((s) => (from === 'tv'
    ? tmdb.get(`tv/${s.id}`, { append_to_response: 'aggregate_credits' }).then((d) => ({ s, dirs: d.created_by || [], cast: d.aggregate_credits?.cast || [] }))
    : tmdb.get(`movie/${s.id}/credits`).then((d) => ({ s, dirs: (d.crew || []).filter((x) => x.job === 'Director'), cast: d.cast || [] })))));
  for (const r of credits) {
    if (r.status !== 'fulfilled') continue;
    const { s, dirs, cast } = r.value;
    const w = s.s === 'loved' ? 2 : 1;
    const picks = [...dirs.map((x) => ({ ...x, role: 'director' })), ...cast.filter((x) => x.order < 3).map((x) => ({ ...x, role: 'actor' }))];
    for (const x of picks) {
      if (profile.people.some((p) => p.id === x.id)) continue; // Lieblingspersonen zählen ohnehin
      const e = people.get(x.id) || { id: x.id, n: x.name, role: x.role, score: 0, fromTitle: markedTitle(profile, s.id, from) };
      e.score += w;
      people.set(x.id, e);
    }
  }
  const top = [...people.values()].sort((a, b) => b.score - a.score).slice(0, B.people);
  for (const p of top) {
    jobs.push(tmdb.get(`person/${p.id}/${c.credits}`, { language: lang }).then((d) => ({ kind: 'bridgePerson', ref: p, movies: creditsOf(d, p.role, md).filter((m) => !(m.genre_ids || []).includes(99)) }))); // ohne Making-of-Dokus
  }
  const settled = await Promise.allSettled(jobs);
  return settled.filter((r) => r.status === 'fulfilled').map((r) => r.value);
}

// Holt alle Kandidaten. page > 1 holt bei den Titel-Quellen weitere Empfehlungsseiten dazu.
async function collect(profile, page, md) {
  const lang = profile.language;
  const c = MEDIA[md];
  const src = sourcesOf(profile, md);
  const jobs = [];
  const add = (kind, ref, promise, pick) => jobs.push(promise.then((data) => ({ kind, ref, movies: pick(data) })));
  const disc = (params) => tmdb.get(c.discover, { language: lang, without_genres: c.without, ...params });

  for (const kind of ['loved', 'liked', 'want', 'paused']) {
    for (const f of src[kind]) {
      for (let p = 1; p <= page; p++) {
        add(kind, f, tmdb.get(`${c.path}/${f.id}/recommendations`, { language: lang, page: p }), (d) => d.results || []);
      }
    }
  }
  for (const person of src.people) {
    add(person.role === 'director' ? 'director' : 'actor', person, tmdb.get(`person/${person.id}/${c.credits}`, { language: lang }), (d) => creditsOf(d, person.role, md));
  }
  const minVotes = md === 'tv' ? 100 : 300;
  for (const th of src.themes) {
    add('theme', th, disc({ ...themeQuery(themeById.get(th.id), md, c.without), sort_by: 'vote_average.desc', 'vote_count.gte': minVotes, page }), (d) => d.results || []);
  }
  for (const co of src.companies) {
    const ids = [co.id, ...(co.also || [])].join('|');
    add(md === 'tv' ? 'studio' : 'company', co, disc({ with_companies: ids, sort_by: 'vote_average.desc', 'vote_count.gte': md === 'tv' ? 50 : 150, page }), (d) => d.results || []);
  }
  for (const n of src.networks) {
    add('network', n, disc({ with_networks: n.id, sort_by: 'vote_average.desc', 'vote_count.gte': 100, page }), (d) => d.results || []);
  }
  if (page === 1) jobs.push(bridge(profile, md).then((list) => ({ many: list })).catch(() => ({ many: [] })));

  const settled = await Promise.allSettled(jobs);
  const ok = settled.filter((r) => r.status === 'fulfilled').flatMap((r) => r.value.many || [r.value]);
  const failed = settled.find((r) => r.status === 'rejected');
  if (!ok.length && failed) throw failed.reason;
  return ok;
}

// Punkte für einen Grund – bei Personen, Studios, Sendern und Themen je nach Stufe
const POINTS = { ...R.points, ...RT.points, ...B.points };
const pts = (r) => { const p = POINTS[r.kind]; return typeof p === 'object' ? p[tierOf(r.ref)] || 0 : p || 0; };
const CAP = {
  loved: R.points.lovedMax, liked: R.points.likedMax, want: R.points.wantMax, paused: RT.points.pausedMax, theme: R.points.themeMax,
  bridgeTopic: B.points.bridgeTopicMax, bridgePerson: B.points.bridgePersonMax,
};
const PRIORITY = ['actor', 'director', 'bridgeTitle', 'loved', 'liked', 'bridgeTopic', 'bridgePerson', 'theme', 'network', 'want', 'paused', 'company', 'studio'];
const FAV = new Set(['actor', 'director', 'bridgeTitle', 'bridgePerson']);

// Begründungssatz aus den stärksten Gründen
function reasonText(profile, reasons, md) {
  const by = (kind) => reasons.filter((r) => r.kind === kind).sort((a, b) => pts(b) - pts(a));
  const parts = [];
  const title = (r) => `„${markedTitle(profile, r.ref.id, md)}“`;
  const film = (kind, verb) => {
    const list = by(kind);
    if (!list.length) return null;
    return `${verb.before}${list.slice(0, 2).map(title).join(' und ')}${verb.after}`;
  };
  const crossTitle = (r) => `${r.ref.from === 'tv' ? 'die Serie' : 'den Film'} „${r.ref.n}“`;
  const crossVerb = (r) => (r.ref.s === 'loved' ? 'liebst' : 'mochtest');
  const texts = {
    actor: () => by('actor').length && `Mit ${by('actor').slice(0, 2).map((r) => r.ref.n).join(' und ')}`,
    director: () => by('director').length && `${MEDIA[md].w.director}: ${by('director')[0].ref.n}`,
    loved: () => film('loved', { before: 'Weil du ', after: ' liebst' }),
    liked: () => film('liked', { before: 'Weil du ', after: ' mochtest' }),
    want: () => film('want', { before: 'Ähnlich wie ', after: ' auf deiner Merkliste' }),
    paused: () => film('paused', { before: 'Ähnlich wie ', after: ', die du weiterschauen willst' }),
    theme: () => by('theme').length && `Thema: ${by('theme').slice(0, 2).map((r) => r.ref.n).join(' und ')}`,
    company: () => by('company').length && `Von ${by('company')[0].ref.n || studioName.get(by('company')[0].ref.id) || 'deinem Lieblingsstudio'}`,
    studio: () => by('studio').length && `Von ${by('studio')[0].ref.n || studioName.get(by('studio')[0].ref.id) || 'deinem Lieblingsstudio'}`,
    network: () => by('network').length && `Von ${by('network')[0].ref.n}`,
    bridgeTitle: () => { const r = by('bridgeTitle')[0]; return r && `Weil du ${crossTitle(r)} ${crossVerb(r)}`; },
    bridgeTopic: () => { const r = by('bridgeTopic')[0]; return r && `Weil du ${crossTitle(r)} ${crossVerb(r)}`; },
    bridgePerson: () => {
      const r = by('bridgePerson')[0];
      return r && (r.ref.role === 'director' ? `Von ${r.ref.n} („${r.ref.fromTitle}“)` : `Mit ${r.ref.n} aus „${r.ref.fromTitle}“`);
    },
  };
  // Gründe nach Gewicht sortieren, bei Gleichstand nach fester Reihenfolge
  const weight = (kind) => Math.min(by(kind).reduce((sum, r) => sum + pts(r), 0), CAP[kind] ?? Infinity);
  const kinds = PRIORITY.filter((k) => by(k).length).sort((a, b) => weight(b) - weight(a) || PRIORITY.indexOf(a) - PRIORITY.indexOf(b));
  // Geliebt und gemocht zusammen: ein Satz statt zwei
  if (kinds[0] === 'loved' && kinds[1] === 'liked') {
    return `Weil du ${title(by('loved')[0])} liebst und ${title(by('liked')[0])} mochtest`;
  }
  for (const k of kinds) {
    if (parts.length === 2) break;
    if (parts.length === 1 && weight(k) < 3) break; // zweiter Grund nur, wenn er zählt
    const t = texts[k]();
    if (t && !parts.includes(t)) parts.push(t);
  }
  return parts.join(' · ') || 'Passt zu deinem Geschmack';
}

// Hauptfunktion: sortierte Liste mit Begründung
export async function compute(profile, page = 1, md = mediaOf(profile)) {
  const L = limits(md);
  const results = await collect(profile, page, md);
  const tilt = genreTilt(profile, md);
  const now = today();
  const marks = marksOf(profile, md);
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
    if (m.adult || !m.poster_path || !m.release_date || m.release_date > now || marks[m.id]) continue;
    if ((md === 'tv' && excludedGenre(m)) || kidsBlocked(profile, md, m)) continue;
    const fav = c.reasons.some((r) => FAV.has(r.kind));
    const minVote = fav ? L.favMinVote : L.minVote;
    const minVotes = fav ? L.favMinVotes : L.minVotes;
    if ((m.vote_average || 0) < minVote || (m.vote_count || 0) < minVotes) continue;

    let score = 0;
    for (const kind of PRIORITY) {
      const sum = c.reasons.filter((r) => r.kind === kind).reduce((acc, r) => acc + pts(r), 0);
      if (sum) score += Math.min(sum, CAP[kind] ?? Infinity);
    }
    score += tilt(m.genre_ids) + (m.vote_average - L.minVote);
    // Hauptquelle = der Grund mit den meisten Punkten (für die Vielfalt)
    const main = [...c.reasons].sort((a, b) => pts(b) - pts(a) || PRIORITY.indexOf(a.kind) - PRIORITY.indexOf(b.kind))[0];
    const strong = ['actor', 'director', 'theme', 'company', 'network', 'studio'].includes(main.kind) && tierOf(main.ref) === 2;
    list.push({ movie: m, score, reasons: c.reasons, source: `${main.kind}:${main.ref.id}`, strong, text: reasonText(profile, c.reasons, md) });
  }
  list.sort((a, b) => b.score - a.score || (b.movie.vote_count || 0) - (a.movie.vote_count || 0));
  return diversify(list);
}

// Pro 20er-Block höchstens 4 Titel aus derselben Hauptquelle
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
export const visible = (profile, list, md = mediaOf(profile)) => list.filter((x) => !marksOf(profile, md)[x.movie.id]);

// ---------- „Heute Lust auf …“ und „Aus welcher Zeit?“ ----------
const isoDaysAgo = (days) => new Date(Date.now() - days * 864e5).toISOString().slice(0, 10);
const decade = (d) => ({ id: String(d), n: `${d}er`, short: `${d}er`, from: () => `${d}-01-01`, to: () => `${d + 9}-12-31` });
const RECENT = [
  { id: 'neu', n: 'Ganz neu (letzte 12 Monate)', short: 'Neu', from: () => isoDaysAgo(365), recent: true },
  { id: '3j', n: 'Letzte 3 Jahre', short: 'Aus den letzten 3 Jahren', from: () => isoDaysAgo(3 * 365), recent: true },
];
export const ERAS = [
  ...RECENT, ...[2020, 2010, 2000, 1990, 1980, 1970].map(decade),
  { id: 'alt', n: 'Klassiker vor 1970', short: 'Klassiker', to: () => '1969-12-31' },
];
// Serien: alte Jahrzehnte haben zu wenige Titel – Klassiker gehen bis 1989
export const ERAS_TV = [
  ...RECENT, ...[2020, 2010, 2000, 1990].map(decade),
  { id: 'alt', n: 'Klassiker vor 1990', short: 'Klassiker', to: () => '1989-12-31' },
];
export const erasFor = (md) => (md === 'tv' ? ERAS_TV : ERAS);
export const eraById = (md) => new Map(erasFor(md).map((e) => [e.id, e]));

// Lieblingsgenres: die häufigsten in gemochten Titeln (ohne eigene: übersetzt von der anderen Seite)
function topGenres(profile, n, md) {
  const count = (marks, translate) => {
    const c = {};
    Object.values(marks).filter((m) => LIKED.has(m.s)).forEach((m) => (translate ? mapGenres(m.g, other(md)) : m.g || []).forEach((g) => { c[g] = (c[g] || 0) + 1; }));
    return Object.entries(c).sort((a, b) => b[1] - a[1]).slice(0, n).map(([g]) => Number(g));
  };
  const own = count(marksOf(profile, md), false);
  return own.length ? own : count(marksOf(profile, other(md)), true);
}

/**
 * Vorschläge mit Filter: Thema (Stichwörter) und/oder Zeitraum.
 * Zieht dafür eigene Abfragen bei TMDB – so kommen auch neue Titel mit noch wenigen Stimmen.
 */
export async function computeFiltered(profile, { theme = '', era = '' } = {}, page = 1, md = mediaOf(profile)) {
  const L = limits(md);
  const c = MEDIA[md];
  const th = theme ? themeById.get(theme) : null;
  const er = era ? eraById(md).get(era) : null;
  const lang = profile.language;
  const now = today();
  const from = er?.from?.() || '';
  const to = er?.to?.() && er.to() < now ? er.to() : now;
  const range = { ...(from ? { [c.dateGte]: from } : {}), [c.dateLte]: to };
  const recent = !!er?.recent;
  const minVotes = recent ? L.recentMinVotes : th ? L.themeMinVotes : L.filterMinVotes;
  const minVote = recent ? L.recentMinVote : th ? L.themeMinVote : L.filterMinVote;
  const sort = recent ? 'popularity.desc' : 'vote_count.desc';
  const without = md === 'tv' && !likesKids(profile) ? `${c.without},${KIDS_TV}` : c.without;
  const base = { language: lang, without_genres: without, 'vote_count.gte': minVotes, 'vote_average.gte': minVote, sort_by: sort, ...range };
  const kw = th ? themeQuery(th, md, without) : {};

  const own = new Map((await compute(profile, 1, md).catch(() => [])).map((x) => [x.movie.id, x]));
  const tilt = genreTilt(profile, md);
  const src = sourcesOf(profile, md);
  const marks = marksOf(profile, md);
  const jobs = [];
  const add = (kind, ref, params) => jobs.push(tmdb.get(c.discover, { ...base, ...kw, ...params }).then((d) => ({ kind, ref, movies: d.results || [] })));

  // breite Suche: Thema bzw. Lieblingsgenres im Zeitraum
  const genres = th ? [] : topGenres(profile, 3, md);
  for (let p = (page - 1) * 2 + 1; p <= page * 2; p++) add('wide', null, { page: p, ...(genres.length ? { with_genres: genres.join('|') } : {}) });
  // gezielt: Lieblingspersonen, -studios und -sender im Zeitraum
  // (über die Liste der Person – so zählt nur echte Regie bzw. eine Hauptrolle)
  if (page === 1 && !th) { // mit Thema zählen Lieblingspersonen über die eigenen Vorschläge
    for (const person of src.people.slice(0, 8)) {
      jobs.push(tmdb.get(`person/${person.id}/${c.credits}`, { language: lang }).then((d) => ({
        kind: person.role === 'director' ? 'director' : 'actor',
        ref: person,
        movies: creditsOf(d, person.role, md)
          .filter((m) => (m.vote_count || 0) >= Math.min(minVotes, L.favMinVotes) && (m.vote_average || 0) >= minVote),
      })));
    }
  }
  for (const co of src.companies.slice(0, 4)) add(md === 'tv' ? 'studio' : 'company', co, { with_companies: [co.id, ...(co.also || [])].join('|'), page });
  for (const n of src.networks.slice(0, 4)) add('network', n, { with_networks: n.id, page });

  const settled = await Promise.allSettled(jobs);
  const ok = settled.filter((r) => r.status === 'fulfilled').map((r) => r.value);
  if (!ok.length) throw settled[0].reason;

  const inRange = (m) => m.release_date && m.release_date <= to && (!from || m.release_date >= from);
  const cands = new Map();
  const put = (m, kind, ref) => {
    if (m.adult || !m.poster_path || !inRange(m) || marks[m.id]) return;
    if ((md === 'tv' && excludedGenre(m)) || kidsBlocked(profile, md, m)) return;
    if (!cands.has(m.id)) cands.set(m.id, { movie: m, reasons: [] });
    if (ref) cands.get(m.id).reasons.push({ kind, ref });
  };
  ok.forEach(({ kind, ref, movies }) => movies.forEach((m) => put(m, kind, ref)));
  // eigene Vorschläge aus dem Zeitraum (ohne Thema; mit Thema zählen sie nur als Bonus)
  if (!th) own.forEach((x) => { if (inRange(x.movie)) put(x.movie, null, null); });

  const label = [th?.n, er?.short].filter(Boolean).join(' · ');
  const list = [];
  for (const cand of cands.values()) {
    const m = cand.movie;
    const mine = own.get(m.id);
    const t = tilt(m.genre_ids);
    const favPts = cand.reasons.reduce((sum, r) => sum + pts(r), 0);
    const score = (mine ? mine.score + 3 : 0) + favPts + t * 1.5 + ((m.vote_average || 0) - L.minVote)
      + Math.log10(Math.max(m.vote_count || 1, 1)) * 0.3 + (recent ? Math.log10(Math.max(m.popularity || 1, 1)) * 0.5 : 0);
    const why = mine ? mine.text : cand.reasons.length ? reasonText(profile, cand.reasons, md) : t > 0.5 ? 'passt zu deinen Lieblingsgenres' : recent ? 'gerade beliebt' : 'beliebt';
    // Thema nicht doppelt nennen, wenn die Begründung es schon enthält („Thema: …“)
    const head = th && why.includes(th.n) ? er?.short : label;
    list.push({ movie: m, score, reasons: cand.reasons, source: cand.reasons[0] ? `${cand.reasons[0].kind}:${cand.reasons[0].ref.id}` : 'wide', strong: false, text: head ? `${head} · ${why}` : why });
  }
  list.sort((a, b) => b.score - a.score);
  return diversify(list);
}
