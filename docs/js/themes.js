// Themen für „Geschmack“ – jeweils TMDB-Stichwörter (keywords), geprüft mit scripts/check-themes.js.
// k = Stichwort-Nummern (ODER-verknüpft), ex = Beispielfilme zur Orientierung (deutsch; exEn = englisch, falls anders),
// kTv / noTv = eigene Stichwörter bzw. ausgeschlossene Genres für Serien (wenn die Film-Stichwörter dort Unpassendes bringen),
// tv = Beispielserien (deutsch; tvEn = englisch, falls anders; leer = bei Serien kaum eingetragen)
// b = Open-Library-Schlagwörter für Bücher (ODER), bEx = Beispielbücher (englische Titel) – seit 1.12.0
export const THEMES = [
  { id: 'underdog', b: ['determination_(personality_trait)','perseverance_(ethics)','success','self-confidence'], bEx: 'Wonder, The Hunger Games', n: 'Vom Underdog zum Helden', k: [240, 5626], ex: 'Rocky, Die Glücksritter', exEn: 'Rocky, Trading Places', tv: 'Ted Lasso, Cobra Kai' },
  { id: 'sport', b: ['sports_stories','sports','baseball_stories','football_stories','soccer_stories'], bEx: 'Friday Night Lights, The Art of Fielding', n: 'Sport', k: [209476, 13042, 6496, 333328], ex: 'Rocky, Space Jam', tv: 'Ted Lasso, Haikyu!!' },
  { id: 'zeit', b: ['time_travel'], bEx: 'The Time Machine, Life After Life', n: 'Zeitreise & Zeitschleife', k: [4379, 10854], ex: 'Interstellar, Und täglich grüßt das Murmeltier', exEn: 'Interstellar, Groundhog Day', tv: 'Dark, Loki' },
  { id: 'heist', b: ['robbery','thieves','bank_robberies','swindlers_and_swindling'], bEx: 'Six of Crows, The Lies of Locke Lamora', n: 'Coup & Raubzug', k: [10051], ex: 'Heat, Inception', tv: 'Haus des Geldes, Lupin', tvEn: 'Money Heist, Lupin' },
  { id: 'twist', b: ['unreliable_narrators','psychological_thrillers','psychological_fiction'], bEx: 'Gone Girl, The Secret History', n: 'Verschachtelt & mit Wendung', k: [326438, 275311, 157171, 346773, 1453], ex: 'Memento, The Sixth Sense', tv: 'True Detective, Westworld' },
  { id: 'whodunit', b: ['detective_and_mystery_stories','murder_investigation','private_investigators'], bEx: 'Murder on the Orient Express, The Thursday Murder Club', n: 'Krimirätsel – wer war’s?', k: [12570], ex: 'Knives Out, Gone Girl', tv: 'Sherlock, Only Murders in the Building' },
  { id: 'witzig', b: ['humorous_fiction','humorous_stories','wit_and_humor'], bEx: 'The Hitchhiker’s Guide to the Galaxy, Good Omens', n: 'Witzig & schlagfertig', k: [319397, 320420, 155457], ex: 'Ziemlich beste Freunde, Manche mögen’s heiß', exEn: 'The Intouchables, Some Like It Hot', tv: 'Brooklyn Nine-Nine, The Good Place' },
  { id: 'schwarz', b: ['black_humor','black_humor_(literature)','satire'], bEx: 'Catch-22, Slaughterhouse-Five', n: 'Schwarzer Humor', k: [10123], ex: 'Pulp Fiction, Fargo', tv: 'Breaking Bad, Fargo' },
  { id: 'satire', b: ['satire','political_satire','parodies'], bEx: 'Animal Farm, Catch-22', n: 'Satire & Parodie', k: [8201, 9755, 11800], ex: 'Die unglaubliche Reise in einem verrückten Flugzeug, Borat', exEn: 'Airplane!, Borat', tv: 'The Boys, Die Simpsons', tvEn: 'The Boys, The Simpsons' },
  { id: 'absurd', b: ['magic_realism','surrealism','absurd_(philosophy)'], bEx: 'The Master and Margarita, Kafka on the Shore', n: 'Absurd & schräg', k: [309974, 214655, 9887], ex: 'Poor Things', tv: 'Rick and Morty, Twin Peaks' },
  { id: 'dialog', b: ['epistolary_fiction','dialogues'], bEx: 'Frankenstein, The Perks of Being a Wallflower', n: 'Gespräche & Dialoge', k: [4433, 814], ex: 'Before Sunrise, Coffee and Cigarettes', tv: '' },
  { id: 'philo', b: ['existentialism','philosophy','meaning_(philosophy)'], bEx: 'The Stranger, Siddhartha', n: 'Philosophisch & existenziell', k: [212737, 490, 181324], ex: 'Matrix, Der Club der toten Dichter', exEn: 'The Matrix, Dead Poets Society', tv: 'The Good Place, The Leftovers' },
  { id: 'spannend', b: ['suspense','thrillers','suspense_fiction'], bEx: 'The Girl with the Dragon Tattoo, Gone Girl', n: 'Hochspannung', k: [314730, 321464], ex: 'Sieben, Der unsichtbare Dritte', exEn: 'Se7en, North by Northwest', tv: 'Breaking Bad, Squid Game' },
  { id: 'wahr', b: ['true_crime','biography','autobiography','memoirs'], bEx: 'Into the Wild, Educated', n: 'Wahre Geschichte', k: [9672, 5565], ex: 'Oppenheimer, The Imitation Game', tv: 'Chernobyl, Narcos' },
  { id: 'erwachsen', b: ['coming_of_age','bildungsromans'], bEx: 'The Catcher in the Rye, Normal People', n: 'Erwachsenwerden', k: [10683, 6270], ex: 'Lady Bird, Stand by Me', tv: 'Stranger Things, Sex Education' },
  { id: 'freunde', b: ['friendship'], bEx: 'The Kite Runner, My Brilliant Friend', n: 'Freundschaft', k: [6054, 167982], ex: 'Ziemlich beste Freunde, Ratatouille', exEn: 'The Intouchables, Ratatouille', tv: 'Friends, Stranger Things' },
  { id: 'familie', b: ['family_life','dysfunctional_families','families'], bEx: 'Little Women, One Hundred Years of Solitude', n: 'Familienchaos', k: [10041, 10235], ex: 'Little Miss Sunshine', tv: 'Modern Family, Die Simpsons', tvEn: 'Modern Family, The Simpsons' },
  { id: 'roadtrip', b: ['automobile_travel','voyages_and_travels','road_fiction'], bEx: 'On the Road, Why We Took the Car', n: 'Roadtrip', k: [7312, 167043], ex: 'Little Miss Sunshine, Logan', tv: 'The End of the F***ing World, The Last of Us' },
  { id: 'rache', b: ['revenge'], bEx: 'The Count of Monte Cristo, Wuthering Heights', n: 'Rache', k: [9748], ex: 'Kill Bill, Oldboy', tv: 'The Glory, Attack on Titan' },
  { id: 'ueberleben', b: ['survival','survival_skills','wilderness_survival'], bEx: 'The Martian, Life of Pi', n: 'Überleben', k: [10349], ex: 'Der Marsianer, Die Tribute von Panem', exEn: 'The Martian, The Hunger Games', tv: 'The Walking Dead, Squid Game' },
  { id: 'gefaengnis', b: ['prisons','prisoners','escapes'], bEx: 'The Count of Monte Cristo, The Green Mile', n: 'Gefängnis & Ausbruch', k: [378, 10685], ex: 'Die Verurteilten, Die Truman Show', exEn: 'The Shawshank Redemption, The Truman Show', tv: 'Prison Break, Orange Is the New Black' },
  { id: 'gericht', b: ['trials','lawyers','trials_(murder)','legal_stories'], bEx: 'To Kill a Mockingbird, The Reader', n: 'Gerichtsfilm', k: [33519], ex: 'Die zwölf Geschworenen', exEn: '12 Angry Men', tv: 'How to Get Away with Murder, Suits' },
  { id: 'mafia', b: ['mafia','organized_crime','gangsters'], bEx: 'The Godfather', n: 'Mafia & Gangster', k: [10391, 3149], ex: 'Der Pate, GoodFellas', exEn: 'The Godfather, Goodfellas', tv: 'Die Sopranos, Peaky Blinders', tvEn: 'The Sopranos, Peaky Blinders' },
  { id: 'noir', b: ['noir_fiction','private_investigators','hard-boiled_fiction'], bEx: 'The Big Sleep, The Talented Mr. Ripley', n: 'Film noir & Neo-Noir', k: [207268, 9807], ex: 'Casablanca, Drive', tv: 'True Detective, Better Call Saul' },
  { id: 'spion', b: ['spy_stories','espionage','conspiracies','secret_service'], bEx: 'The Spy Who Came in from the Cold, The Da Vinci Code', n: 'Spionage & Verschwörung', k: [470, 10410, 2106], ex: 'Der unsichtbare Dritte, Dr. Seltsam', exEn: 'North by Northwest, Dr. Strangelove', tv: 'Homeland, Akte X', tvEn: 'Homeland, The X-Files' },
  { id: 'killer', b: ['serial_murderers','serial_killers'], bEx: 'The Silence of the Lambs', n: 'Serienkiller', k: [10714], ex: 'Sieben, Das Schweigen der Lämmer', exEn: 'Se7en, The Silence of the Lambs', tv: 'Dexter, Mindhunter' },
  { id: 'weltraum', b: ['life_on_other_planets','space_flight','extraterrestrial_beings','interplanetary_voyages'], bEx: 'Project Hail Mary, The Three-Body Problem', n: 'Weltraum & Außerirdische', k: [9882, 252634, 9951], ex: 'Interstellar, Alien', tv: 'The Expanse, Rick and Morty' },
  { id: 'ki', b: ['artificial_intelligence','robots','androids'], bEx: 'Klara and the Sun, Do Androids Dream of Electric Sheep?', n: 'Künstliche Intelligenz & Roboter', k: [310, 14544], ex: 'Ex Machina, WALL·E', tv: 'Westworld, Black Mirror' },
  { id: 'dystopie', b: ['dystopias','end_of_the_world','dystopian_fiction'], bEx: 'Nineteen Eighty-Four, The Road', n: 'Dystopie & Endzeit', k: [4565, 4458, 12190], ex: 'Blade Runner, Mad Max', tv: 'Black Mirror, The 100' },
  { id: 'helden', b: ['superheroes'], bEx: 'Watchmen', n: 'Superhelden', k: [9715], ex: 'The Dark Knight', tv: 'The Boys, The Flash' },
  { id: 'kampf', b: ['samurai','martial_arts'], bEx: 'Shōgun', n: 'Kampfkunst & Samurai', k: [779, 1462], ex: 'Die sieben Samurai, Matrix', exEn: 'Seven Samurai, The Matrix', tv: 'Cobra Kai, Shōgun' },
  { id: 'zombie', b: ['zombies'], bEx: 'World War Z', n: 'Zombies', k: [12377], ex: 'Train to Busan', tv: 'The Walking Dead, The Last of Us' },
  { id: 'spuk', b: ['haunted_houses','ghost_stories'], bEx: 'The Shining, The Haunting of Hill House', n: 'Spukhaus', k: [3358], ex: 'Conjuring', exEn: 'The Conjuring', tv: 'Spuk in Hill House', tvEn: 'The Haunting of Hill House' },
  { id: 'musik', b: ['musicians','rock_musicians','music'], bEx: 'Daisy Jones & The Six, High Fidelity', n: 'Musik & Tanz', k: [4048, 283297, 1691], ex: 'Whiplash, La La Land', tv: 'Glee' },
  { id: 'essen', b: ['cooking','cooks','restaurants','food'], bEx: 'Kitchen Confidential, Like Water for Chocolate', n: 'Kochen & Essen', k: [1918, 10637], ex: 'Ratatouille, The Menu', tv: 'The Bear' },
  { id: 'inspirierend', b: ['hope','conduct_of_life','self-realization'], bEx: 'The Alchemist, Man’s Search for Meaning', n: 'Inspirierend', k: [281585, 191446], ex: 'Rocky Balboa', tv: 'Ted Lasso' },
  { id: 'trauer', b: ['grief','loneliness','loss_(psychology)','bereavement'], bEx: 'A Man Called Ove, The Lovely Bones', n: 'Trauer & Einsamkeit', k: [9872, 9957], ex: 'Aftersun, WALL·E', tv: 'After Life, Fleabag' },
  // Das breite Stichwort „politics“ (6078) bringt Historienfilme, Palast-Dramen und Anime – deshalb genauere Stichwörter.
  // Filme: Journalismus, Polit-Drama, Polit-Thriller, Polit-Satire, Wahl, Weißes Haus, investigativer Journalismus/Journalist/Reporter
  // Serien zusätzlich: Journalist, Zeitung, Reporter, Politiker, Präsident, Premierminister, Parlament; ohne Zeichentrick
  { id: 'medien', b: ['journalists','journalism','political_fiction','elections'], bEx: 'All the President’s Men, Nineteen Eighty-Four', n: 'Journalismus & Politik', k: [917, 298528, 209817, 169086, 15134, 365774, 220362, 195240, 226594], ex: 'Spotlight, Nightcrawler',
    kTv: [917, 736, 918, 12193, 298528, 209817, 169086, 6083, 8570, 15134, 2569, 6079, 365774, 220362, 195240, 226594], noTv: [16], tv: 'The Newsroom, Designated Survivor' },
  { id: 'weihnachten', b: ['christmas_stories','christmas'], bEx: 'A Christmas Carol', n: 'Weihnachten', k: [207317], ex: 'Kevin – Allein zu Haus', exEn: 'Home Alone', tv: 'Dash & Lily' },
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
