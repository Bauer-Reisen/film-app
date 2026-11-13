// Profile im Browser dieses Geräts speichern (localStorage).
// Alle Markierungen hängen an der TMDB-Nummer eines Films, nie am Titel.

const KEY = 'filmapp.v1';

const empty = () => ({
  version: 1,
  lastProfileId: null,
  profiles: [],
  device: { homeHintShown: 0, homeHintLast: 0, installTipShown: false },
});

let state; // wird unten geladen, wenn newProfile bekannt ist
const listeners = new Set();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return empty();
    const data = JSON.parse(raw);
    if (!data || !Array.isArray(data.profiles)) return empty();
    data.profiles.forEach(migrate);
    return { ...empty(), ...data, device: { ...empty().device, ...(data.device || {}) } };
  } catch {
    return empty();
  }
}

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch (err) {
    console.error('Speichern fehlgeschlagen', err);
  }
  listeners.forEach((fn) => fn());
}

export function onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }

// Den Browser bitten, die Daten dauerhaft zu behalten (keine Garantie am iPhone)
export async function askPersist() {
  try {
    if (navigator.storage?.persist && !(await navigator.storage.persisted())) await navigator.storage.persist();
  } catch { /* egal */ }
}

const newId = () => 'p_' + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-3);

export const newProfile = (name, language = 'de-DE') => ({
  id: newId(),
  name: name.trim(),
  language,
  createdAt: Date.now(),
  lastBackup: null,
  marksSinceBackup: 0,
  backupReminderLast: 0,
  movies: {},
  people: [],
  companies: [],
  surpriseShown: [],
  surpriseLastGenre: {},
  themes: [], // Lieblingsthemen [{ id: 'zeit', w, t }]
  passed: [], // in „Geschmack“ übersprungene Filme (nicht markiert, aber schon durchgesehen)
  // Serien (seit 1.5.0): eigene Markierungen und Listen, Personen/Themen/Studios gelten für beides
  shows: {},
  networks: [], // Lieblingssender [{ id, n, logo, w, t }]
  passedTv: [],
  surpriseShownTv: [],
  surpriseLastGenreTv: {},
  rewatchShownTv: {},
  // Bücher (seit 1.12.0): Markierungen an der Open-Library-Werk-Nummer, Autor·innen und Buch-Genres in Stufen
  books: {},
  authors: [], // [{ id: 'OL2162284A', n, w, t }]
  bookGenres: [], // [{ id: 'fantasy', w, t }]
  passedBook: [],
  surpriseShownBook: [],
  surpriseLastGenreBook: {},
  rewatchShownBook: {},
  scanMissing: [], // gescannte ISBN, die Open Library nicht kannte [{ isbn, t }]
  pendingBooks: [], // gescannt oder aus einer geteilten Liste, aber noch nicht bewertet [{ id, n, a, ak, c, y, pg, g, t }] (seit 1.18.0)
  // tourDone: kurzer Rundgang schon gesehen; hintDone: Hinweis „bei Vorschlägen weitermachen“ weggetippt (je movie/tv)
  settings: { groupHorror: false, groupWar: false, groupAge: null, kidsAge: 6, media: 'movie', tourDone: false, hintDone: {}, bookLang: 'en' },
});

// Ältere Profile (vor den Serien) um die neuen Felder ergänzen – nichts wird umgebaut
export function migrate(p) {
  const base = newProfile(p.name || 'Profil', p.language);
  for (const k of ['movies', 'people', 'companies', 'themes', 'passed', 'surpriseShown', 'surpriseLastGenre',
    'shows', 'networks', 'passedTv', 'surpriseShownTv', 'surpriseLastGenreTv', 'rewatchShownTv',
    'books', 'authors', 'bookGenres', 'passedBook', 'surpriseShownBook', 'surpriseLastGenreBook', 'rewatchShownBook', 'scanMissing', 'pendingBooks']) {
    if (p[k] == null) p[k] = base[k];
  }
  const known = p.settings && 'tourDone' in p.settings;
  p.settings = { ...base.settings, ...(p.settings || {}) };
  if (!known) p.settings.tourDone = true; // bestehende Profile bekommen den Rundgang nicht
  return p;
}

state = load();

// ---------- Profile ----------
export const profiles = () => state.profiles;
export const getProfile = (id) => state.profiles.find((p) => p.id === id) || null;
export const nameTaken = (name, exceptId) =>
  state.profiles.some((p) => p.id !== exceptId && p.name.toLowerCase() === name.trim().toLowerCase());

export function createProfile(name, language) {
  const p = newProfile(name, language);
  state.profiles.push(p);
  state.lastProfileId = p.id;
  save();
  return p;
}

export function addProfile(p) {
  state.profiles.push(migrate(p));
  save();
  return p;
}

export function updateProfile(id, changes) {
  const p = getProfile(id);
  if (!p) return;
  Object.assign(p, changes);
  save();
}

export function deleteProfile(id) {
  state.profiles = state.profiles.filter((p) => p.id !== id);
  if (state.lastProfileId === id) state.lastProfileId = null;
  save();
}

export const lastProfileId = () => state.lastProfileId;
export function setLastProfile(id) { state.lastProfileId = id; save(); }

// Reihenfolge für „Wer schaut?": zuletzt genutztes zuerst
export function profilesForPicker() {
  const list = [...state.profiles];
  list.sort((a, b) => (b.id === state.lastProfileId) - (a.id === state.lastProfileId) || a.name.localeCompare(b.name, 'de'));
  return list;
}

// ---------- Markierungen (für spätere Schritte) ----------
// status: 'loved' (Lieblingsfilm) | 'seen' | 'liked' | 'disliked' | 'want' | 'noInterest' | null (= löschen)
// media: 'movie' (Feld movies), 'tv' (Feld shows) oder 'book' (Feld books). Bei Serien zusätzlich 'paused' | 'dropped',
// bei Büchern 'dropped' (abgebrochen); 'seen' heißt bei Büchern „Gelesen“.
const MARKS = { movie: 'movies', tv: 'shows', book: 'books' };
const BOOK_META = ['a', 'ak', 'c', 'pg', 'r']; // Autor·in, Autor-Nummer, Cover, Seiten, r = in der Bewertungsrunde schon gefragt (seit 1.16.0)
export function setMark(profileId, media, movieId, status, meta = {}) {
  const p = getProfile(profileId);
  if (!p) return null;
  const list = (p[MARKS[media]] ||= {});
  const old = list[movieId] || null;
  if (status) {
    list[movieId] = { s: status, t: Date.now(), g: meta.g ?? old?.g ?? [], l: meta.l ?? old?.l ?? '', y: meta.y ?? old?.y ?? null, n: meta.n ?? old?.n ?? '' }; // n = Titel (für Begründungen)
    if (media === 'book') for (const k of BOOK_META) { const v = meta[k] ?? old?.[k]; if (v != null && v !== '') list[movieId][k] = v; }
    p.marksSinceBackup = (p.marksSinceBackup || 0) + 1;
  } else {
    delete list[movieId];
  }
  save();
  return old;
}
export const setMovie = (profileId, movieId, status, meta) => setMark(profileId, 'movie', movieId, status, meta);

export function restoreMark(profileId, media, movieId, old) {
  const p = getProfile(profileId);
  if (!p) return;
  const list = (p[MARKS[media]] ||= {});
  if (old) list[movieId] = old; else delete list[movieId];
  save();
}
export const restoreMovie = (profileId, movieId, old) => restoreMark(profileId, 'movie', movieId, old);

// Personen, Studios und Themen in Stufen: w = 2 (★ Liebe), 1 (♥ Gern), 0 = egal (Eintrag weg).
// entry enthält id und Anzeige-Angaben (Name n, Bild p/logo, bei Personen role)
export const tierOf = (x) => x?.w ?? 2; // ältere Einträge ohne Stufe galten als Favorit
export function setTier(listName, profileId, entry, w) {
  const p = getProfile(profileId);
  if (!p) return;
  p[listName] = (p[listName] || []).filter((x) => x.id !== entry.id);
  if (w) {
    p[listName].push({ ...entry, w, t: Date.now() });
    p.marksSinceBackup = (p.marksSinceBackup || 0) + 1;
  }
  save();
}

// Bücher, die noch auf ihre Bewertung warten (gescannt oder aus einer geteilten Liste)
export function addPending(profileId, entries) {
  const p = getProfile(profileId);
  if (!p) return 0;
  const have = new Set([...(p.pendingBooks || []).map((x) => x.id), ...Object.keys(p.books || {})]);
  const fresh = entries.filter((x) => x?.id && !have.has(x.id) && have.add(x.id)).map((x) => ({ ...x, t: Date.now() }));
  p.pendingBooks = [...(p.pendingBooks || []), ...fresh];
  save();
  return fresh.length;
}
export function removePending(profileId, id) {
  const p = getProfile(profileId);
  if (!p) return;
  p.pendingBooks = (p.pendingBooks || []).filter((x) => x.id !== id);
  save();
}

// Übersprungene Filme merken, damit sie beim nächsten Öffnen nicht wieder oben stehen
export function addPassed(profileId, ids, media = 'movie') {
  const p = getProfile(profileId);
  if (!p || !ids.length) return;
  const key = media === 'tv' ? 'passedTv' : media === 'book' ? 'passedBook' : 'passed';
  p[key] = [...new Set([...(p[key] || []), ...ids])].slice(-3000);
  save();
}

export const markCount = (p) => Object.keys(p.movies).length + Object.keys(p.shows || {}).length + p.people.length
  + p.companies.length + (p.themes || []).length + (p.networks || []).length
  + Object.keys(p.books || {}).length + (p.authors || []).length + (p.bookGenres || []).length;

// ---------- Geräte-Einstellungen (Hinweise) ----------
export const device = () => state.device;
export function updateDevice(changes) { Object.assign(state.device, changes); save(); }
