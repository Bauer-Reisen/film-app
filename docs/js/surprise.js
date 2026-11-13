// „Überrasch mich“: ein guter Film abseits des eigenen Geschmacks.
// Kern des Geschmacks bestimmen → fremdes Ziel wählen → bei TMDB suchen → stufenweise lockern.
import { SURPRISE, SURPRISE_TV } from './config.js?v=1.21.0';
import { MEDIA, mediaOf, marksOf } from './media.js?v=1.21.0';
import * as tmdb from './tmdb.js?v=1.21.0';
import * as store from './store.js?v=1.21.0';

// TMDB-Genres (ohne „TV-Film“) mit deutschem und englischem Namen
export const GENRES = {
  28: ['Action', 'Action'], 12: ['Abenteuer', 'Adventure'], 16: ['Animation', 'Animation'], 35: ['Komödie', 'Comedy'],
  80: ['Krimi', 'Crime'], 99: ['Dokumentarfilm', 'Documentary'], 18: ['Drama', 'Drama'], 10751: ['Familie', 'Family'],
  14: ['Fantasy', 'Fantasy'], 36: ['Historie', 'History'], 27: ['Horror', 'Horror'], 10402: ['Musik', 'Music'],
  9648: ['Mystery', 'Mystery'], 10749: ['Liebesfilm', 'Romance'], 878: ['Science-Fiction', 'Science Fiction'],
  53: ['Thriller', 'Thriller'], 10752: ['Kriegsfilm', 'War'], 37: ['Western', 'Western'],
};
// Serien-Genres bei TMDB (ohne Kinder, Nachrichten, Reality, Seifenoper, Talkshow)
export const GENRES_TV = {
  10759: ['Action & Abenteuer', 'Action & Adventure'], 16: ['Animation', 'Animation'], 35: ['Komödie', 'Comedy'], 80: ['Krimi', 'Crime'],
  99: ['Dokumentation', 'Documentary'], 18: ['Drama', 'Drama'], 10751: ['Familie', 'Family'], 9648: ['Mystery', 'Mystery'],
  10765: ['Sci-Fi & Fantasy', 'Sci-Fi & Fantasy'], 10768: ['Krieg & Politik', 'War & Politics'], 37: ['Western', 'Western'],
};
const ALL = { movie: Object.keys(GENRES).map(Number), tv: Object.keys(GENRES_TV).map(Number) };
const DECADES = { movie: [1950, 1960, 1970, 1980, 1990, 2000, 2010, 2020], tv: [1960, 1970, 1980, 1990, 2000, 2010, 2020] };
const field = (base, md) => (md === 'tv' ? `${base}Tv` : base);
const LANGS = ['fr', 'it', 'ja', 'ko', 'es', 'de', 'sv', 'da', 'hi', 'zh', 'pt', 'fa', 'tr', 'en'];

export const genreName = (id, language, md = 'movie') => (md === 'tv' ? GENRES_TV : GENRES)[id]?.[language === 'en-US' ? 1 : 0] || '';

// Kern: was mindestens 15 % der gesehenen/gemochten Filme ausmacht
export function core(profile, md = mediaOf(profile)) {
  const S = SURPRISE;
  const films = Object.values(marksOf(profile, md)).filter((m) => ['seen', 'liked', 'loved', 'paused'].includes(m.s));
  const result = { genres: new Set(), decades: new Set(), langs: new Set() };
  if (films.length < S.minProfileFilms) return result;
  const count = (key) => {
    const c = {};
    films.forEach((m) => key(m).forEach((k) => { c[k] = (c[k] || 0) + 1; }));
    return Object.entries(c).filter(([, n]) => n / films.length >= S.coreShare).map(([k]) => (isNaN(k) ? k : Number(k)));
  };
  count((m) => m.g || []).forEach((g) => result.genres.add(g));
  count((m) => (m.y ? [Math.floor(m.y / 10) * 10] : [])).forEach((d) => result.decades.add(d));
  count((m) => (m.l ? [m.l] : [])).forEach((l) => result.langs.add(l));
  return result;
}

const pickRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];

// Fremde Genres, das am längsten nicht gezeigte zuerst (Gleichstand: zufällig)
function foreignGenres(profile, k, md) {
  const list = ALL[md].filter((g) => !k.genres.has(g));
  const pool = list.length ? list : ALL[md];
  const last = profile[field('surpriseLastGenre', md)] || {};
  return pool.map((g) => ({ g, t: last[g] || 0, r: Math.random() })).sort((a, b) => a.t - b.t || a.r - b.r).map((x) => x.g);
}

/**
 * Sucht einen Überraschungsfilm.
 * exclude: zusätzliche Nummern, die nicht kommen dürfen (z. B. aktuelle Vorschläge)
 * Gibt { movie (Details), genre, stage } zurück oder null.
 */
export async function draw(profile, exclude = new Set(), md = mediaOf(profile)) {
  const S = md === 'tv' ? { ...SURPRISE, ...SURPRISE_TV } : SURPRISE;
  const c = MEDIA[md];
  const k = core(profile, md);
  const lang = profile.language;
  const today = new Date().toISOString().slice(0, 10);
  const marks = marksOf(profile, md);
  const shownKey = field('surpriseShown', md);
  let requests = 0;
  const shownIds = () => new Set((profile[shownKey] || []).map((x) => x.id));

  const ok = (m, { checkCore }) =>
    !m.adult && m.poster_path && m.release_date && m.release_date <= today
    && !marks[m.id] && !shownIds().has(m.id) && !exclude.has(m.id)
    && !(checkCore && k.genres.has((m.genre_ids || [])[0]));

  async function tryQuery(params, { checkCore = true, pages = 1 } = {}) {
    const tried = new Set();
    let maxPage = S.pagesPerStage;
    for (let i = 0; i < pages; i++) {
      if (requests >= S.maxRequestsPerClick) return null;
      const free = Array.from({ length: maxPage }, (_, n) => n + 1).filter((n) => !tried.has(n));
      if (!free.length) return null;
      const page = pickRandom(free);
      tried.add(page);
      requests++;
      const data = await tmdb.get(c.discover, {
        language: lang, sort_by: 'vote_average.desc', 'vote_average.gte': S.minVote, 'vote_count.gte': S.minVotes,
        without_genres: md === 'tv' ? `${c.without},10762` : c.without, page, ...params,
      });
      const fits = (data.results || []).filter((m) => ok(m, { checkCore }));
      if (fits.length) return pickRandom(fits);
      maxPage = Math.min(maxPage, data.total_pages || 1);
    }
    return null;
  }

  // Zusatzbedingung: fremdes Jahrzehnt oder fremde Originalsprache
  function extra() {
    const decades = DECADES[md].filter((d) => !k.decades.has(d));
    const langs = LANGS.filter((l) => !k.langs.has(l));
    if (Math.random() < 0.5 && decades.length) {
      const d = pickRandom(decades);
      return { [c.dateGte]: `${d}-01-01`, [c.dateLte]: `${d + 9}-12-31` };
    }
    return langs.length ? { with_original_language: pickRandom(langs) } : {};
  }

  const genres = foreignGenres(profile, k, md);
  const target = genres[0];
  let found = null; let stage = 0; let genre = target;

  const stages = [
    () => tryQuery({ with_genres: target, ...extra() }, { pages: 2 }),                        // 1 + andere Seiten
    () => tryQuery({ with_genres: target }, { pages: 2 }),                                    // 2 ohne Jahrzehnt/Sprache
    async () => {                                                                             // 3 andere fremde Genres
      for (const g of genres.slice(1, 4)) {
        const m = await tryQuery({ with_genres: g });
        if (m) { genre = g; return m; }
      }
      return null;
    },
    () => tryQuery({ with_genres: target, 'vote_count.gte': S.relaxedMinVotes }, { pages: 2 }), // 4 weniger Stimmen
  ];
  for (let i = 0; i < stages.length && !found && requests < S.maxRequestsPerClick; i++) {
    stage = i + 1;
    genre = target;
    found = await stages[i]();
  }

  // 5: nur noch die Qualität zählt (eigenes kleines Budget, damit sicher etwas kommt)
  if (!found) {
    stage = 5;
    requests = 0;
    found = await tryQuery({ 'vote_count.gte': S.relaxedMinVotes }, { checkCore: false, pages: 3 });
  }
  // 6: Gezeigt-Liste leeren, die letzten 20 bleiben gesperrt
  if (!found) {
    stage = 6;
    const keep = [...(profile[shownKey] || [])].sort((a, b) => b.t - a.t).slice(0, S.keepLastOnReset);
    store.updateProfile(profile.id, { [shownKey]: keep });
    requests = 0;
    found = await tryQuery({ 'vote_count.gte': S.relaxedMinVotes }, { checkCore: false, pages: 3 });
  }
  if (!found) return null;

  // Sofort dauerhaft merken – auch wenn danach der Browser geschlossen wird
  const now = Date.now();
  const mainGenre = (found.genre_ids || [])[0] ?? genre;
  const genreKey = field('surpriseLastGenre', md);
  store.updateProfile(profile.id, {
    [shownKey]: [...(profile[shownKey] || []), { id: found.id, t: now }],
    [genreKey]: { ...(profile[genreKey] || {}), [genre]: now },
  });

  let details = null;
  try { details = await tmdb.get(`${c.path}/${found.id}`, { language: lang }); } catch { /* Liste reicht notfalls */ }
  // Kein Titel in der Profilsprache und fremde Schrift (z. B. Persisch)? Dann den englischen nehmen
  const title = details?.title || found.title || '';
  if (lang !== 'en-US' && /[^\p{Script=Latin}\p{N}\p{P}\p{Zs}\p{S}]/u.test(title)) {
    try { const en = await tmdb.get(`${c.path}/${found.id}`, { language: 'en-US' }); if (en.title) details = { ...details, title: en.title }; } catch { /* egal */ }
  }
  return { movie: { ...found, ...(details || {}), genre_ids: found.genre_ids }, genre: mainGenre, stage };
}
