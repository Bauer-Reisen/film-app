// ALLE Einstellungen und Grenzwerte an einer Stelle.
// Wer etwas nachjustieren will (z. B. Mindestbewertung), ändert es nur hier.

export const VERSION = '1.12.0';

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

// Serien: weniger Stimmen als Filme, dafür meist höhere Noten. Punkte sonst wie RECOMMEND.
export const RECOMMEND_TV = {
  minVote: 7.0, minVotes: 100,
  favMinVote: 6.3, favMinVotes: 40,
  seeds: { networks: 6 },
  points: { network: { 2: 4, 1: 2 }, studio: { 2: 3, 1: 1.5 }, paused: 1.5, pausedMax: 3 },
  themeMinVotes: 50, themeMinVote: 6.8,
  filterMinVotes: 80, filterMinVote: 7.0,
  recentMinVotes: 15, recentMinVote: 6.5,
};

// Brücke Film ↔ Serie: ★/♥-Titel der anderen Seite bringen Vorschläge
export const BRIDGE = {
  sources: 6, people: 5,
  points: { bridgeTitle: 6, bridgeTopic: { 2: 3, 1: 2 }, bridgeTopicMax: 6, bridgePerson: 4, bridgePersonMax: 6 },
  // Stichwörter, die nichts über den Inhalt sagen (Roman-Vorlage, Abspann-Szenen, Regisseurin …)
  genericKeywords: /^(based on|aftercreditsstinger|duringcreditsstinger|woman director|sequel|prequel|remake|reboot|independent film|anime|miniseries|sitcom|tv series|live action|adaptation|female protagonist|male protagonist|duringcredits|post-credits|spin off|spin-off|anthology|biography|new york city|los angeles|london|usa|19\d0s|20\d0s|\d{4}s)/i,
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

// Ab so vielen Markierungen (je Filme bzw. Serien) schlägt „Geschmack“ vor, bei den Vorschlägen weiterzumachen
export const TASTE_HINT_AFTER = 40;

export const BACKUP = {
  remindAfterMarks: 20, remindEveryDays: 7,
};

// ---------- Serien (seit 1.7.0) ----------
export const SURPRISE_TV = {
  minVote: 7.5, minVotes: 200, relaxedMinVotes: 100,
};

export const GROUP_TV = {
  easyGenres: [35, 16, 10751, 10759, 10765, 9648], // Komödie, Animation, Familie, Action & Abenteuer, Sci-Fi & Fantasy, Mystery
  optionalGenres: { krieg: 10768 }, // Krieg & Politik; Horror gibt es bei TMDB-Serien nicht als Genre
  onlyWithComedy: [80], // Krimi
  maxRuntime: 60, // Länge einer Folge
  minVote: 7.3, minVotes: 500,
  bonus: { 35: 2, 16: 1, 10751: 1 },
};

export const KIDS_TV = {
  genres: [10762, 16, 10751],
  without: '80,10768',
  minVote: 7.0, minVotes: 100,
  usFallback: { 0: ['TV-Y', 'TV-G'], 6: ['TV-Y', 'TV-Y7', 'TV-G', 'TV-PG'], 12: ['TV-Y', 'TV-Y7', 'TV-G', 'TV-PG', 'TV-14'] },
};
