// Spiele: feste Tabellen (Plattformen, Genres) und die kurze Form, in der die App ein Spiel speichert.
// Ohne Importe, damit auch das Startlisten-Skript (Node) diese Datei nutzen kann.
// Nummern nachgeschlagen mit `node scripts/check-igdb.js` (14.11.2026).

// Plattformen zum Auswählen. also = läuft dort auch (abwärtskompatibel)
export const PLATFORMS = [
  { id: 'pc', n: 'PC / Steam Deck', ids: [6] },
  { id: 'ps5', n: 'PlayStation 5', ids: [167], also: [48] },
  { id: 'ps4', n: 'PlayStation 4', ids: [48] },
  { id: 'xs', n: 'Xbox Series', ids: [169], also: [49] },
  { id: 'xone', n: 'Xbox One', ids: [49] },
  { id: 'sw2', n: 'Nintendo Switch 2', ids: [508], also: [130] },
  { id: 'sw', n: 'Nintendo Switch', ids: [130] },
];
// Kurznamen für die Karten (auch ältere Plattformen, damit man Gespieltes erkennt)
export const PLATFORM_SHORT = {
  6: 'PC', 167: 'PS5', 48: 'PS4', 169: 'Xbox Series', 49: 'Xbox One', 508: 'Switch 2', 130: 'Switch',
  9: 'PS3', 12: 'Xbox 360', 41: 'Wii U', 5: 'Wii', 8: 'PS2', 7: 'PS1', 11: 'Xbox', 3: 'Linux', 14: 'Mac',
};
// Welche IGDB-Plattformen passen zur Auswahl? (inkl. abwärtskompatibel) – leer = egal (alle modernen)
export function platformIds(keys) {
  const chosen = PLATFORMS.filter((p) => (keys?.length ? keys.includes(p.id) : true));
  return [...new Set(chosen.flatMap((p) => [...p.ids, ...(p.also || [])]))];
}

export const GENRES = {
  2: 'Point & Click', 4: 'Kampfspiel', 5: 'Shooter', 7: 'Musik', 8: 'Jump & Run', 9: 'Rätsel', 10: 'Rennen',
  11: 'Echtzeit-Strategie', 12: 'Rollenspiel', 13: 'Simulation', 14: 'Sport', 15: 'Strategie', 16: 'Rundenstrategie',
  24: 'Taktik', 25: 'Hack & Slash', 26: 'Quiz', 30: 'Flipper', 31: 'Abenteuer', 32: 'Indie', 33: 'Arcade',
  34: 'Visual Novel', 35: 'Karten & Brett', 36: 'MOBA',
};
export const INDIE = 32;

// Spielweise – Filter bei den Vorschlägen („Heute: …“, gilt nur für den Moment) und wie man es an einem Spiel erkennt
export const MODES = [
  { id: 'solo', n: 'allein' },
  { id: 'couch', n: 'zu zweit auf der Couch' },
  { id: 'online', n: 'online mit Freunden' },
  { id: 'versus', n: 'gegeneinander' },
];
export function fitsMode(g, mode) {
  const m = g.m || [];
  if (mode === 'solo') return m.includes(1);
  if (mode === 'online') return !!g.on || m.includes(5);
  if (mode === 'couch') return !!g.cm;
  if (mode === 'versus') return m.includes(2) || m.includes(6) || m.includes(4);
  return true;
}

// Länge (Startfrage): wie lange man braucht, bis man durch ist – Kurz < 10 Std., Mittel 10–30, Lang > 30
export const TIMES = [
  { id: 'short', n: 'Kurz', d: 'an ein paar Abenden durch, unter 10 Std.' },
  { id: 'mid', n: 'Mittel', d: 'ein paar Wochen, 10–30 Std.' },
  { id: 'epic', n: 'Lang', d: 'darf mich monatelang begleiten, 30 Std. und mehr' },
];
export const timeLevel = (hours) => (hours == null ? null : hours < 10 ? 0 : hours <= 30 ? 1 : 2);
export const timeIndex = (id) => TIMES.findIndex((t) => t.id === id);

// IGDB-Antwort → kurze Form
// n Titel, c Cover-Nummer, y Jahr, d Erscheinungstag (Sek.), g Genres, p Plattformen, r Bewertung, rc Stimmen,
// m Spielweisen, cm Couch-Koop (Anzahl, 1 = ja ohne Angabe), on Online-Koop, f Reihen/Welten, s ähnliche Spiele
export function compact(x) {
  const mm = x.multiplayer_modes || [];
  const couch = mm.filter((k) => k.offlinecoop || k.splitscreen);
  const cm = couch.length ? Math.max(1, ...couch.map((k) => k.offlinecoopmax || 0)) : 0;
  const g = {
    id: x.id, n: x.name, c: x.cover?.image_id || null,
    y: x.first_release_date ? new Date(x.first_release_date * 1000).getUTCFullYear() : null,
    d: x.first_release_date || null,
    g: x.genres || [], p: x.platforms || [],
    r: x.total_rating ? Math.round(x.total_rating) : null, rc: x.total_rating_count || 0,
    m: x.game_modes || [], cm, on: mm.some((k) => k.onlinecoop) || undefined,
  };
  if (x.similar_games?.length) g.s = x.similar_games;
  if (!g.on) delete g.on;
  return g;
}
