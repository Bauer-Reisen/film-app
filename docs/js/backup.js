// Profil sichern (als Datei) und wieder laden – so zieht man auf ein
// anderes Gerät oder in die Home-Bildschirm-App um.
import { newProfile, getProfile, updateProfile, addProfile, profiles } from './store.js?v=1.3.2';

const FORMAT = 'filmapp-profil';

const today = () => new Date().toISOString().slice(0, 10);
const safeName = (s) => s.replace(/[^\p{L}\p{N}_-]+/gu, '_').slice(0, 30) || 'Profil';

export function backupFileName(p) {
  return `Filmprofil-${safeName(p.name)}-${today()}.json`;
}

// Gibt zurück: 'shared' | 'downloaded' | 'cancelled'
export async function saveBackup(profileId) {
  const p = getProfile(profileId);
  const data = { format: FORMAT, version: 1, savedAt: new Date().toISOString(), profile: p };
  const json = JSON.stringify(data, null, 1);
  const name = backupFileName(p);
  const file = new File([json], name, { type: 'application/json' });

  let result = null;
  // Am Handy: Teilen-Menü (AirDrop, Mail, „In Dateien sichern“ …)
  if (navigator.canShare && navigator.canShare({ files: [file] }) && matchMedia('(pointer: coarse)').matches) {
    try {
      await navigator.share({ files: [file], title: name });
      result = 'shared';
    } catch (err) {
      if (err?.name === 'AbortError') return 'cancelled';
    }
  }
  if (!result) {
    const url = URL.createObjectURL(file);
    const a = Object.assign(document.createElement('a'), { href: url, download: name });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    result = 'downloaded';
  }
  updateProfile(profileId, { lastBackup: Date.now(), marksSinceBackup: 0 });
  return result;
}

// Liest eine Sicherungsdatei. Wirft einen Fehler mit deutscher Meldung.
export async function readBackup(file) {
  let data;
  try {
    data = JSON.parse(await file.text());
  } catch {
    throw new Error('Diese Datei ist keine Profil-Sicherung.');
  }
  if (data?.format !== FORMAT || !data.profile || typeof data.profile.movies !== 'object') {
    throw new Error('Diese Datei ist keine Profil-Sicherung dieser App.');
  }
  // fehlende Felder mit Standardwerten auffüllen
  const base = newProfile(data.profile.name || 'Profil', data.profile.language);
  return { ...base, ...data.profile, settings: { ...base.settings, ...(data.profile.settings || {}) } };
}

export const findSameName = (p) => profiles().find((x) => x.name.toLowerCase() === p.name.toLowerCase()) || null;

// Als neues Profil hinzufügen (neue ID, Name ggf. mit Zusatz)
export function importAsNew(p) {
  const fresh = newProfile(p.name, p.language);
  let name = p.name;
  for (let i = 2; findSameName({ name }); i++) name = `${p.name} (${i})`;
  return addProfile({ ...p, id: fresh.id, name, createdAt: Date.now() });
}

// Zusammenführen: Bei Markierungen gewinnt die neuere.
export function mergeInto(targetId, incoming) {
  const t = getProfile(targetId);
  const movies = { ...t.movies };
  for (const [id, m] of Object.entries(incoming.movies || {})) {
    if (!movies[id] || (m.t || 0) > (movies[id].t || 0)) movies[id] = m;
  }
  const byId = (a, b) => {
    const map = new Map(a.map((x) => [x.id, x]));
    for (const x of b || []) if (!map.has(x.id) || (x.t || 0) > (map.get(x.id).t || 0)) map.set(x.id, x);
    return [...map.values()];
  };
  const lastGenre = { ...t.surpriseLastGenre };
  for (const [g, ts] of Object.entries(incoming.surpriseLastGenre || {})) lastGenre[g] = Math.max(lastGenre[g] || 0, ts);
  updateProfile(targetId, {
    movies,
    people: byId(t.people, incoming.people),
    companies: byId(t.companies, incoming.companies),
    themes: byId(t.themes || [], incoming.themes),
    surpriseShown: byId(t.surpriseShown, incoming.surpriseShown),
    surpriseLastGenre: lastGenre,
    passed: [...new Set([...(t.passed || []), ...(incoming.passed || [])])],
    rewatchShown: { ...(t.rewatchShown || {}), ...(incoming.rewatchShown || {}) },
  });
}
