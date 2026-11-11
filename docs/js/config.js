// ALLE Einstellungen und Grenzwerte an einer Stelle.
// Wer etwas nachjustieren will (z. B. Mindestbewertung), ändert es nur hier.

export const VERSION = '0.1.0';

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
  favMinVote: 5.5, favMinVotes: 50,
  seeds: { liked: 10, want: 5, people: 10, companies: 5 },
  points: { actor: 5, director: 4, liked: 3, likedMax: 9, want: 1.5, wantMax: 3, company: 2, genreMax: 2 },
  perSourceInBlock: 4,
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
  usFallback: { 0: ['G'], 6: ['G', 'PG'], 12: ['G', 'PG', 'PG-13'] },
};

export const BACKUP = {
  remindAfterMarks: 20, remindEveryDays: 7,
};
