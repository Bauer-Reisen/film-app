// ALLE Einstellungen und Grenzwerte an einer Stelle.
// Wer etwas nachjustieren will (z. B. Mindestbewertung), ändert es nur hier.

export const VERSION = '1.5.0';

// Adresse des Cloudflare Workers (nicht geheim – der Schlüssel liegt nur dort).
export const WORKER_URL = 'https://film-app-tmdb.film-app.workers.dev';

// Öffentlicher Link zur App
export const APP_URL = 'https://bauer-reisen.github.io/film-app/';

export const IMAGE_BASE = 'https://image.tmdb.org/t/p/';

export const LANGUAGES = {
  'de-DE': 'Deutsch',
  'en-US': 'Englisch',
};

export const TMDB = {
  maxParallel: 6,
};

export const RECOMMEND = {
  minVote: 6.5, minVotes: 200,
  favMinVote: 5.5, favMinVotes: 100,
  seeds: { loved: 10, liked: 10, want: 5, people: 12, companies: 6, themes: 8 },
  // Personen, Studios, Themen je Stufe: 2 = ★ Liebe, 1 = ♥ Gern
  points: {
    actor: { 2: 9, 1: 5 }, director: { 2: 9, 1: 5 }, company: { 2: 4, 1: 2 }, theme: { 2: 5, 1: 3 },
    loved: 4, lovedMax: 10, liked: 2.5, likedMax: 7.5, want: 1.5, wantMax: 3, themeMax: 8, genreMax: 2,
  },
  themeMinVotes: 150, themeMinVote: 6.0, // „Heute Lust auf …“
  filterMinVotes: 150, filterMinVote: 6.3, // „Aus welcher Zeit?“
  recentMinVotes: 30, recentMinVote: 6.0, // ganz neue Filme haben noch wenige Stimmen
  perSourceInBlock: 4, perStrongSourceInBlock: 6, // ★ Liebe darf öfter vorkommen
  blockSize: 20,
};

export const SURPRISE = {
  minVote: 7.0, minVotes: 300, relaxedMinVotes: 150,
  coreShare: 0.15, minProfileFilms: 5,
  pagesPerStage: 5, maxRequestsPerClick: 15, keepLastOnReset: 20,
};

export const GROUP = {
  easyGenres: [35, 16, 12, 10751, 14, 28, 10402, 878], // Komödie, Animation, Abenteuer, Familie, Fantasy, Action, Musik, Sci-Fi
  optionalGenres: { horror: 27, krieg: 10752 },
  onlyWithComedy: [53, 80], // Thriller, Krimi
  maxRuntime: 130, minVote: 6.8, minVotes: 1000,
  bonus: { 35: 2, 16: 1, 10751: 1 },
};

export const KIDS = {
  ages: [0, 6, 12],
  genres: [10751, 16, 12],
  minVote: 6.5, minVotes: 300,
  studioBonus: 0.4, // kleiner Vorrang für eigene Lieblingsstudios
  usFallback: { 0: ['G'], 6: ['G', 'PG'], 12: ['G', 'PG', 'PG-13'] },
};

export const BACKUP = {
  remindAfterMarks: 20, remindEveryDays: 7,
};
