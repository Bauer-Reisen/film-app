// Buch-Genres – Open Library hat keine festen Genres, nur Schlagwörter (subject_key).
// q = Schlagwörter für die Suche (ODER), re = woran man das Genre in den Schlagwörtern eines Buchs erkennt.
// Diese Datei importiert nichts, damit auch scripts/make-seeds-books.js sie nutzen kann.
export const BOOK_GENRES = [
  { id: 'literatur', n: 'Romane & Literatur', ex: 'z. B. A Little Life, Normal People', en: 'Literary fiction', q: ['literary_fiction', 'psychological_fiction', 'domestic_fiction'], re: /^(literary_fiction|psychological_fiction|domestic_fiction|fiction_literary)/ },
  { id: 'klassiker', n: 'Klassiker', ex: 'z. B. Pride and Prejudice, Moby-Dick', en: 'Classics', q: ['classic_literature'], re: /^(classic_literature|classics|fiction_classics)/ },
  { id: 'krimi', n: 'Krimi', ex: 'z. B. Murder on the Orient Express, The Big Sleep', en: 'Crime & mystery', q: ['detective_and_mystery_stories', 'mystery', 'crime'], re: /^(detective_and_mystery_stories|mystery|mystery_fiction|crime|crime_fiction|fiction_mystery|private_investigators|police_procedural|murder|fiction_crime)/ },
  { id: 'thriller', n: 'Thriller', ex: 'z. B. Gone Girl, The Girl with the Dragon Tattoo', en: 'Thriller', q: ['thrillers', 'suspense', 'fiction_thrillers_general'], re: /^(thrillers?|suspense|fiction_thrillers|fiction_suspense|psychological_thrillers?)/ },
  { id: 'fantasy', n: 'Fantasy', ex: 'z. B. The Hobbit, A Game of Thrones', en: 'Fantasy', q: ['fantasy', 'fantasy_fiction'], re: /^(fantasy|fantasy_fiction|fiction_fantasy|magic|wizards)/ },
  { id: 'scifi', n: 'Science-Fiction', ex: 'z. B. Dune, Project Hail Mary', en: 'Science fiction', q: ['science_fiction'], re: /^(science_fiction|fiction_science_fiction|space_opera|life_on_other_planets|interplanetary_voyages)/ },
  { id: 'liebe', n: 'Liebesroman', ex: 'z. B. Pride and Prejudice, Normal People', en: 'Romance', q: ['love_stories', 'romance'], re: /^(love_stories|romance|romance_fiction|fiction_romance|man-woman_relationships)/ },
  { id: 'historisch', n: 'Historischer Roman', ex: 'z. B. Wolf Hall, The Pillars of the Earth', en: 'Historical fiction', q: ['historical_fiction'], re: /^(historical_fiction|fiction_historical)/ },
  { id: 'horror', n: 'Horror', ex: 'z. B. It, Dracula', en: 'Horror', q: ['horror', 'horror_tales', 'horror_stories'], re: /^(horror|horror_tales|horror_stories|horror_fiction|fiction_horror|ghost_stories|vampires|supernatural)/ },
  { id: 'humor', n: 'Humor', ex: 'z. B. Good Omens, A Man Called Ove', en: 'Humour', q: ['humorous_stories', 'humorous_fiction', 'humor'], re: /^(humorous_stories|humorous_fiction|humor|humour|satire|fiction_humorous|wit_and_humor)/ },
  { id: 'abenteuer', n: 'Abenteuer', ex: 'z. B. Treasure Island, Life of Pi', en: 'Adventure', q: ['adventure_stories', 'adventure_and_adventurers'], re: /^(adventure_stories|adventure_and_adventurers|adventure_fiction|fiction_action_&_adventure|sea_stories)/ },
  { id: 'jugend', n: 'Jugendbuch', ex: 'z. B. The Hunger Games, The Fault in Our Stars', en: 'Young adult', q: ['young_adult_fiction'], re: /^(young_adult_fiction|young_adult|teenagers|ya_fiction|fiction_young_adult)/ },
  { id: 'kinder', n: 'Kinderbuch', ex: 'z. B. Matilda, Pippi Longstocking', en: 'Children’s books', q: ['juvenile_fiction'], re: /^(juvenile_fiction|children's_fiction|children's_stories|children's_literature|picture_books)/ },
  { id: 'comic', n: 'Comic & Graphic Novel', ex: 'z. B. Watchmen, Persepolis', en: 'Graphic novels', q: ['graphic_novels', 'comic_books_strips_etc'], re: /^(graphic_novels|comic_books_strips_etc|comics_&_graphic_novels|comics)/ },
  { id: 'bio', n: 'Biografie & Erinnerungen', ex: 'z. B. Educated, The Diary of a Young Girl', en: 'Biography & memoir', q: ['biography', 'autobiography', 'memoirs'], re: /^(biography|autobiography|memoirs?|biography_&_autobiography)/ },
  { id: 'sach', n: 'Sachbuch', ex: 'z. B. Sapiens, Kitchen Confidential', en: 'Non-fiction', q: ['popular_science', 'nonfiction', 'history', 'psychology'], re: /^(popular_science|nonfiction|non-fiction|psychology|philosophy|economics|social_history|world_history|self-help|science_popular_works)$/ },
];
export const bookGenreById = new Map(BOOK_GENRES.map((g) => [g.id, g]));

// Genres eines Buchs aus seinen Schlagwörtern (höchstens 3, in Reihenfolge der Liste oben)
export function genresOf(subjectKeys = []) {
  const keys = subjectKeys.map((s) => String(s).toLowerCase());
  return BOOK_GENRES.filter((g) => keys.some((k) => g.re.test(k))).map((g) => g.id).slice(0, 3);
}
