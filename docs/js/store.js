// Profile im Browser dieses Geräts speichern (localStorage).
// Alle Markierungen hängen an der TMDB-Nummer eines Films, nie am Titel.

const KEY = 'filmapp.v1';

const empty = () => ({
  version: 1,
  lastProfileId: null,
  profiles: [],
  device: { homeHintShown: 0, homeHintLast: 0, installTipShown: false },
});

let state = load();
const listeners = new Set();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return empty();
    const data = JSON.parse(raw);
    if (!data || !Array.isArray(data.profiles)) return empty();
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
  settings: { groupHorror: false, groupWar: false, groupAge: null, kidsAge: 6 },
});

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
  state.profiles.push(p);
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
export function setMovie(profileId, movieId, status, meta = {}) {
  const p = getProfile(profileId);
  if (!p) return null;
  const old = p.movies[movieId] || null;
  if (status) {
    p.movies[movieId] = { s: status, t: Date.now(), g: meta.g ?? old?.g ?? [], l: meta.l ?? old?.l ?? '', y: meta.y ?? old?.y ?? null, n: meta.n ?? old?.n ?? '' }; // n = Titel (für Begründungen)
    p.marksSinceBackup = (p.marksSinceBackup || 0) + 1;
  } else {
    delete p.movies[movieId];
  }
  save();
  return old;
}

export function restoreMovie(profileId, movieId, old) {
  const p = getProfile(profileId);
  if (!p) return;
  if (old) p.movies[movieId] = old; else delete p.movies[movieId];
  save();
}

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

// Übersprungene Filme merken, damit sie beim nächsten Öffnen nicht wieder oben stehen
export function addPassed(profileId, ids) {
  const p = getProfile(profileId);
  if (!p || !ids.length) return;
  p.passed = [...new Set([...(p.passed || []), ...ids])].slice(-3000);
  save();
}
export function clearPassed(profileId) { updateProfile(profileId, { passed: [] }); }

export const markCount = (p) => Object.keys(p.movies).length + p.people.length + p.companies.length + (p.themes || []).length;

// ---------- Geräte-Einstellungen (Hinweise) ----------
export const device = () => state.device;
export function updateDevice(changes) { Object.assign(state.device, changes); save(); }
