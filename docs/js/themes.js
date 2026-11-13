// Themen für „Geschmack“ – jeweils TMDB-Stichwörter (keywords), geprüft mit scripts/check-themes.js.
// k = Stichwort-Nummern (ODER-verknüpft), ex = Beispielfilme zur Orientierung (deutsch; exEn = englisch, falls anders),
// kTv / noTv = eigene Stichwörter bzw. ausgeschlossene Genres für Serien (wenn die Film-Stichwörter dort Unpassendes bringen),
// tv = Beispielserien (deutsch; tvEn = englisch, falls anders; leer = bei Serien kaum eingetragen)
export const THEMES = [
  { id: 'underdog', n: 'Vom Underdog zum Helden', k: [240, 5626], ex: 'Rocky, Die Glücksritter', exEn: 'Rocky, Trading Places', tv: 'Ted Lasso, Cobra Kai' },
  { id: 'sport', n: 'Sport', k: [209476, 13042, 6496, 333328], ex: 'Rocky, Space Jam', tv: 'Ted Lasso, Haikyu!!' },
  { id: 'zeit', n: 'Zeitreise & Zeitschleife', k: [4379, 10854], ex: 'Interstellar, Und täglich grüßt das Murmeltier', exEn: 'Interstellar, Groundhog Day', tv: 'Dark, Loki' },
  { id: 'heist', n: 'Coup & Raubzug', k: [10051], ex: 'Heat, Inception', tv: 'Haus des Geldes, Lupin', tvEn: 'Money Heist, Lupin' },
  { id: 'twist', n: 'Verschachtelt & mit Wendung', k: [326438, 275311, 157171, 346773, 1453], ex: 'Memento, The Sixth Sense', tv: 'True Detective, Westworld' },
  { id: 'whodunit', n: 'Krimirätsel – wer war’s?', k: [12570], ex: 'Knives Out, Gone Girl', tv: 'Sherlock, Only Murders in the Building' },
  { id: 'witzig', n: 'Witzig & schlagfertig', k: [319397, 320420, 155457], ex: 'Ziemlich beste Freunde, Manche mögen’s heiß', exEn: 'The Intouchables, Some Like It Hot', tv: 'Brooklyn Nine-Nine, The Good Place' },
  { id: 'schwarz', n: 'Schwarzer Humor', k: [10123], ex: 'Pulp Fiction, Fargo', tv: 'Breaking Bad, Fargo' },
  { id: 'satire', n: 'Satire & Parodie', k: [8201, 9755, 11800], ex: 'Die unglaubliche Reise in einem verrückten Flugzeug, Borat', exEn: 'Airplane!, Borat', tv: 'The Boys, Die Simpsons', tvEn: 'The Boys, The Simpsons' },
  { id: 'absurd', n: 'Absurd & schräg', k: [309974, 214655, 9887], ex: 'Poor Things', tv: 'Rick and Morty, Twin Peaks' },
  { id: 'dialog', n: 'Gespräche & Dialoge', k: [4433, 814], ex: 'Before Sunrise, Coffee and Cigarettes', tv: '' },
  { id: 'philo', n: 'Philosophisch & existenziell', k: [212737, 490, 181324], ex: 'Matrix, Der Club der toten Dichter', exEn: 'The Matrix, Dead Poets Society', tv: 'The Good Place, The Leftovers' },
  { id: 'spannend', n: 'Hochspannung', k: [314730, 321464], ex: 'Sieben, Der unsichtbare Dritte', exEn: 'Se7en, North by Northwest', tv: 'Breaking Bad, Squid Game' },
  { id: 'wahr', n: 'Wahre Geschichte', k: [9672, 5565], ex: 'Oppenheimer, The Imitation Game', tv: 'Chernobyl, Narcos' },
  { id: 'erwachsen', n: 'Erwachsenwerden', k: [10683, 6270], ex: 'Lady Bird, Stand by Me', tv: 'Stranger Things, Sex Education' },
  { id: 'freunde', n: 'Freundschaft', k: [6054, 167982], ex: 'Ziemlich beste Freunde, Ratatouille', exEn: 'The Intouchables, Ratatouille', tv: 'Friends, Stranger Things' },
  { id: 'familie', n: 'Familienchaos', k: [10041, 10235], ex: 'Little Miss Sunshine', tv: 'Modern Family, Die Simpsons', tvEn: 'Modern Family, The Simpsons' },
  { id: 'roadtrip', n: 'Roadtrip', k: [7312, 167043], ex: 'Little Miss Sunshine, Logan', tv: 'The End of the F***ing World, The Last of Us' },
  { id: 'rache', n: 'Rache', k: [9748], ex: 'Kill Bill, Oldboy', tv: 'The Glory, Attack on Titan' },
  { id: 'ueberleben', n: 'Überleben', k: [10349], ex: 'Der Marsianer, Die Tribute von Panem', exEn: 'The Martian, The Hunger Games', tv: 'The Walking Dead, Squid Game' },
  { id: 'gefaengnis', n: 'Gefängnis & Ausbruch', k: [378, 10685], ex: 'Die Verurteilten, Die Truman Show', exEn: 'The Shawshank Redemption, The Truman Show', tv: 'Prison Break, Orange Is the New Black' },
  { id: 'gericht', n: 'Gerichtsfilm', k: [33519], ex: 'Die zwölf Geschworenen', exEn: '12 Angry Men', tv: 'How to Get Away with Murder, Suits' },
  { id: 'mafia', n: 'Mafia & Gangster', k: [10391, 3149], ex: 'Der Pate, GoodFellas', exEn: 'The Godfather, Goodfellas', tv: 'Die Sopranos, Peaky Blinders', tvEn: 'The Sopranos, Peaky Blinders' },
  { id: 'noir', n: 'Film noir & Neo-Noir', k: [207268, 9807], ex: 'Casablanca, Drive', tv: 'True Detective, Better Call Saul' },
  { id: 'spion', n: 'Spionage & Verschwörung', k: [470, 10410, 2106], ex: 'Der unsichtbare Dritte, Dr. Seltsam', exEn: 'North by Northwest, Dr. Strangelove', tv: 'Homeland, Akte X', tvEn: 'Homeland, The X-Files' },
  { id: 'killer', n: 'Serienkiller', k: [10714], ex: 'Sieben, Das Schweigen der Lämmer', exEn: 'Se7en, The Silence of the Lambs', tv: 'Dexter, Mindhunter' },
  { id: 'weltraum', n: 'Weltraum & Außerirdische', k: [9882, 252634, 9951], ex: 'Interstellar, Alien', tv: 'The Expanse, Rick and Morty' },
  { id: 'ki', n: 'Künstliche Intelligenz & Roboter', k: [310, 14544], ex: 'Ex Machina, WALL·E', tv: 'Westworld, Black Mirror' },
  { id: 'dystopie', n: 'Dystopie & Endzeit', k: [4565, 4458, 12190], ex: 'Blade Runner, Mad Max', tv: 'Black Mirror, The 100' },
  { id: 'helden', n: 'Superhelden', k: [9715], ex: 'The Dark Knight', tv: 'The Boys, The Flash' },
  { id: 'kampf', n: 'Kampfkunst & Samurai', k: [779, 1462], ex: 'Die sieben Samurai, Matrix', exEn: 'Seven Samurai, The Matrix', tv: 'Cobra Kai, Shōgun' },
  { id: 'zombie', n: 'Zombies', k: [12377], ex: 'Train to Busan', tv: 'The Walking Dead, The Last of Us' },
  { id: 'spuk', n: 'Spukhaus', k: [3358], ex: 'Conjuring', exEn: 'The Conjuring', tv: 'Spuk in Hill House', tvEn: 'The Haunting of Hill House' },
  { id: 'musik', n: 'Musik & Tanz', k: [4048, 283297, 1691], ex: 'Whiplash, La La Land', tv: 'Glee' },
  { id: 'essen', n: 'Kochen & Essen', k: [1918, 10637], ex: 'Ratatouille, The Menu', tv: 'The Bear' },
  { id: 'inspirierend', n: 'Inspirierend', k: [281585, 191446], ex: 'Rocky Balboa', tv: 'Ted Lasso' },
  { id: 'trauer', n: 'Trauer & Einsamkeit', k: [9872, 9957], ex: 'Aftersun, WALL·E', tv: 'After Life, Fleabag' },
  // Das breite Stichwort „politics“ (6078) bringt Historienfilme, Palast-Dramen und Anime – deshalb genauere Stichwörter.
  // Filme: Journalismus, Polit-Drama, Polit-Thriller, Polit-Satire, Wahl, Weißes Haus, investigativer Journalismus/Journalist/Reporter
  // Serien zusätzlich: Journalist, Zeitung, Reporter, Politiker, Präsident, Premierminister, Parlament; ohne Zeichentrick
  { id: 'medien', n: 'Journalismus & Politik', k: [917, 298528, 209817, 169086, 15134, 365774, 220362, 195240, 226594], ex: 'Spotlight, Nightcrawler',
    kTv: [917, 736, 918, 12193, 298528, 209817, 169086, 6083, 8570, 15134, 2569, 6079, 365774, 220362, 195240, 226594], noTv: [16], tv: 'The Newsroom, Designated Survivor' },
  { id: 'weihnachten', n: 'Weihnachten', k: [207317], ex: 'Kevin – Allein zu Haus', exEn: 'Home Alone', tv: 'Dash & Lily' },
];
export const themeById = new Map(THEMES.map((t) => [t.id, t]));

// Abfrage-Teil für TMDB-Discover: Stichwörter des Themas, bei Serien ggf. eigene (kTv) und ausgeschlossene Genres (noTv).
// without = die sonst ausgeschlossenen Genres, damit sie erhalten bleiben
export function themeQuery(t, md, without) {
  const tv = md === 'tv';
  return {
    with_keywords: ((tv && t.kTv) || t.k).join('|'),
    ...(tv && t.noTv ? { without_genres: [without, ...t.noTv].filter(Boolean).join(',') } : {}),
  };
}
