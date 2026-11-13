// Filme oder Serien: alles, was sich zwischen beiden unterscheidet, steht hier.
// Die Seiten fragen hier nach (Adressen, Wörter, Profilfelder), statt alles doppelt zu bauen.
import { dialog, esc } from './ui.js?v=1.10.1';

// Serien-Genres, die nie vorgeschlagen werden: Nachrichten, Reality, Seifenoper, Talkshow
export const TV_EXCLUDE = [10763, 10764, 10766, 10767];

export const MEDIA = {
  movie: {
    id: 'movie', marks: 'movies', path: 'movie', discover: 'discover/movie', search: 'search/movie', credits: 'movie_credits',
    dateGte: 'primary_release_date.gte', dateLte: 'primary_release_date.lte',
    without: '10770', // ohne TV-Filme
    suffix: '',
    w: {
      one: 'Film', many: 'Filme', fav: 'Lieblingsfilm', favs: 'Lieblingsfilme', kids: 'Kinderfilme', the: 'den Film',
      a: 'einen Film', ofA: 'einem Film', yours: 'deine Filme', ofYours: 'deiner Filme', unknown: 'Unbekannter Film',
      noPoster: 'Kein Poster', it: 'Den', director: 'Regie',
    },
  },
  tv: {
    id: 'tv', marks: 'shows', path: 'tv', discover: 'discover/tv', search: 'search/tv', credits: 'tv_credits',
    dateGte: 'first_air_date.gte', dateLte: 'first_air_date.lte',
    without: TV_EXCLUDE.join(','),
    suffix: 'Tv',
    w: {
      one: 'Serie', many: 'Serien', fav: 'Lieblingsserie', favs: 'Lieblingsserien', kids: 'Kinderserien', the: 'die Serie',
      a: 'eine Serie', ofA: 'einer Serie', yours: 'deine Serien', ofYours: 'deiner Serien', unknown: 'Unbekannte Serie',
      noPoster: 'Kein Poster', it: 'Die', director: 'Regie & Idee',
    },
  },
};

export const other = (media) => (media === 'tv' ? 'movie' : 'tv');
export const mediaOf = (profile) => (profile?.settings?.media === 'tv' ? 'tv' : 'movie');
export const M = (profile) => MEDIA[mediaOf(profile)];
// Markierungen des Profils für Filme oder Serien
export const marksOf = (profile, media = mediaOf(profile)) => profile[MEDIA[media].marks] || {};
// Profilfeld je Medium: field(p, 'passed') → passed bzw. passedTv
export const fieldName = (base, media) => base + MEDIA[media].suffix;

// Ausgeschlossene Seriengenres?
export const excludedGenre = (m) => (m.genre_ids || (m.genres || []).map((g) => g.id)).some((g) => TV_EXCLUDE.includes(g));

// Länge einer Serie aus den Details: „3 Staffeln · ca. 50 Min.“
export function tvLength(d) {
  const n = d?.number_of_seasons;
  const min = d?.episode_run_time?.[0] || d?.last_episode_to_air?.runtime || d?.next_episode_to_air?.runtime || 0;
  return [n ? `${n} ${n === 1 ? 'Staffel' : 'Staffeln'}` : null, min ? `ca. ${min} Min.` : null].filter(Boolean).join(' · ');
}
export const episodeMinutes = (d) => d?.episode_run_time?.[0] || d?.last_episode_to_air?.runtime || d?.next_episode_to_air?.runtime || 0;

// Rollen einer Person: bei Filmen Regie bzw. Hauptrolle, bei Serien Idee/Regie bzw. tragende Rolle (ab 4 Folgen)
export function creditsOf(d, role, mediaId) {
  if (mediaId === 'tv') {
    return role === 'director'
      ? (d.crew || []).filter((m) => m.job === 'Creator' || (m.job === 'Director' && (m.episode_count || 0) >= 2))
      : (d.cast || []).filter((m) => (m.episode_count || 0) >= 4);
  }
  return role === 'director' ? (d.crew || []).filter((m) => m.job === 'Director') : (d.cast || []).filter((m) => m.order != null && m.order <= 4);
}

// Genres zwischen Filmen und Serien übersetzen (TMDB hat für Serien eigene Sammel-Genres)
const MOVIE_TO_TV = { 28: [10759], 12: [10759], 14: [10765], 878: [10765], 10752: [10768], 36: [10768], 53: [9648, 80], 27: [9648], 10749: [18] };
const TV_TO_MOVIE = { 10759: [28, 12], 10765: [878, 14], 10768: [10752, 36], 10762: [10751, 16] };
const SAME = new Set([16, 35, 80, 99, 18, 10751, 9648, 37]);
export function mapGenres(ids, from) {
  const table = from === 'movie' ? MOVIE_TO_TV : TV_TO_MOVIE;
  return [...new Set((ids || []).flatMap((g) => table[g] || (SAME.has(g) ? [g] : [])))];
}

// Status „Angefangen“ bei Serien – zwei Arten
export const STARTED = new Set(['paused', 'dropped']);

// Welche Knöpfe leuchten bei einem Status? Es gibt nur einen Status pro Titel, aber:
// ★ Liebling schließt „Mag ich“ ein; „Mag ich“, „Mag ich nicht“ und ★ schließen „Gesehen“ ein.
// Ein Tipp auf einen leuchtenden Knopf nimmt die Markierung ganz zurück.
const SEEN_TOO = new Set(['liked', 'loved', 'disliked']);
export const pressed = (s, key) => s === key || (s === 'loved' && key === 'liked') || (key === 'seen' && SEEN_TOO.has(s)) || (key === 'started' && STARTED.has(s));
export async function askStarted(title) {
  const res = await dialog({
    title: 'Angefangen',
    body: `<p>Wie steht es mit „${esc(title)}“?</p>`,
    buttons: [
      { label: 'Abbrechen', value: null },
      { label: '⏹ Hat mich verloren', value: 'dropped' },
      { label: '⏸ Will ich weiterschauen', value: 'paused', primary: true },
    ],
  });
  return res?.value || null;
}

// Beschriftung eines Status
export function stateLabel(media, s) {
  const w = MEDIA[media].w;
  return {
    loved: `★ ${w.fav}`, seen: '✓ Gesehen', liked: '♥ Mag ich', disliked: '✕ Mag ich nicht', want: '+ Gemerkt',
    noInterest: 'Kein Interesse', paused: '⏸ Weiterschauen', dropped: '⏹ Abgebrochen',
  }[s] || '';
}
