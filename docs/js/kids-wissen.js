// „Wissen & Natur“ bei Kinderfilmen/-serien: Themen und eine Handliste bekannter Wissensformate.
// Die Kennnummern sind bei TMDB nachgeschlagen (nicht geraten). Themen: 'alle' = passt zu jedem Thema.
// a = ab welchem Alter, falls TMDB keine Freigabe kennt.

// [Schlüssel, Name, TMDB-Stichwörter (oder-verknüpft), nur Dokus?]
// Bewusst eng: „Gesundheit“, „Technik“, „Natur“ allein bringen Erwachsenen-Dokus (Super Size Me, Social Dilemma)
export const TOPICS = [
  ['koerper', '🫀 Körper & Gesundheit', '3722|183974|376521', true],
  ['tiere', '🐾 Tiere & Natur', '18165|361118|9902|221355|270|12616', true],
  ['weltall', '🚀 Weltall', '9882|252634|14626|162429|13194', true],
  ['technik', '⚙️ Technik & Erfinden', '3338|364793|14544|327615', true],
  ['geschichte', '🏰 Geschichte', '282633|157894|5049|355987|333589', true],
  ['gefuehle', '💛 Gefühle & Miteinander', '211269|207776', false],
];

export const HAND = {
  tv: [
    [13819, 'alle', 0], // Die Sendung mit der Maus
    [41174, 'alle', 0], // Die Sendung mit dem Elefanten
    [46129, 'tiere technik', 0], // Löwenzahn
    [80934, 'alle', 6], // Checker Tobi
    [95908, 'alle', 6], // Willi wills wissen
    [59893, 'technik koerper', 6], // Wissen macht Ah!
    [113276, 'alle', 6], // PUR+
    [277541, 'alle', 6], // Neuneinhalb
    [154738, 'alle', 6], // Was ist Was TV
    [131750, 'tiere technik', 0], // Woozle Goozle und die Weltentdecker
    [2632, 'koerper', 6], // Es war einmal … das Leben
    [6080, 'geschichte', 6], // Es war einmal … der Mensch
    [5402, 'technik geschichte', 6], // Es war einmal … Forscher und Erfinder
    [7248, 'technik weltall koerper tiere', 0], // Der Zauberschulbus
    [73472, 'technik weltall koerper tiere', 0], // Der Zauberschulbus ist wieder unterwegs
    [37472, 'tiere', 0], // Die Oktonauten
    [80923, 'tiere', 0], // Anna und die wilden Tiere
    [80912, 'tiere', 0], // Paula und die wilden Tiere
    [1044, 'tiere', 0], // Planet Erde
    [68595, 'tiere', 0], // Planet Erde II
    [83880, 'tiere', 0], // Unser Planet
    [13579, 'tiere', 0], // Unser blauer Planet
    [74313, 'tiere', 0], // Unser blauer Planet II
    [10732, 'gefuehle', 0], // Sesamstraße
  ],
  movie: [
    [561882, 'tiere technik', 6], // Checker Tobi und das Geheimnis unseres Planeten
    [10946, 'tiere', 0], // Unsere Erde
    [464593, 'tiere', 0], // Unsere Erde 2
    [36970, 'tiere', 0], // Unsere Ozeane
    [1667, 'tiere', 0], // Die Reise der Pinguine
    [57586, 'tiere', 0], // Im Reich der Raubkatzen (Disneynature)
    [780746, 'tiere', 0], // Bären (Disneynature)
    [72334, 'tiere', 0], // Schimpansen (Disneynature)
    [665135, 'tiere', 0], // Elefanten (Disneynature)
    [549559, 'weltall geschichte', 6], // Apollo 11
    [150540, 'gefuehle', 0], // Alles steht Kopf
    [1022789, 'gefuehle', 0], // Alles steht Kopf 2
  ],
};

export const handFor = (md, topic) => HAND[md].filter(([, t]) => !topic || t === 'alle' || t.split(' ').includes(topic));
export const topicOf = (key) => TOPICS.find((t) => t[0] === key) || null;
