// Filme oder Serien: alles, was sich zwischen beiden unterscheidet, steht hier.
// Die Seiten fragen hier nach (Adressen, Wörter, Profilfelder), statt alles doppelt zu bauen.
import { dialog, esc } from './ui.js?v=1.5.0';

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

// Status „Angefangen“ bei Serien – zwei Arten
export const STARTED = new Set(['paused', 'dropped']);
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
