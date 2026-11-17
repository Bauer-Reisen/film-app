// „Meine Abos“: Welche Streamingdienste hat das Profil – und läuft ein Titel dort (in Deutschland, im Abo)?
// Daten: TMDB „watch/providers“, die von JustWatch kommen (Quelle muss genannt werden).
// Einstellungen: settings.abos = ['netflix', …], settings.aboOnly = true/false (Schalter bei den Vorschlägen).
import * as tmdb from './tmdb.js?v=1.37.0';
import { MEDIA } from './media.js?v=1.37.0';

// [Schlüssel, Name, TMDB-Nummern] – bei TMDB nachgeschlagen (Liste für DE). Varianten zählen mit
// (z. B. „Netflix mit Werbung“, „Paramount+ über Amazon“).
export const PROVIDERS = [
  ['netflix', 'Netflix', [8, 1796, 175]],
  ['prime', 'Prime Video', [9, 2100]],
  ['disney', 'Disney+', [337]],
  ['wow', 'WOW / Sky', [30, 29]],
  ['apple', 'Apple TV+', [350, 2243]],
  ['paramount', 'Paramount+', [531, 582, 1853]],
  ['joyn', 'Joyn', [304, 421]],
  ['rtl', 'RTL+', [2750]],
  ['magenta', 'MagentaTV', [178, 2412]],
  ['mediathek', 'Mediatheken (ARD, ZDF, arte)', [219, 537, 234]],
];
const byKey = new Map(PROVIDERS.map((x) => [x[0], x]));
const REGION = 'DE';

export const abosOf = (p) => (p?.settings?.abos || []).filter((k) => byKey.has(k));
export const aboOn = (p) => !!p?.settings?.aboOnly && abosOf(p).length > 0;
export const aboIds = (p) => abosOf(p).flatMap((k) => byKey.get(k)[2]);
export const aboNames = (p) => abosOf(p).map((k) => byKey.get(k)[1]);

// Zusatz für TMDB-Discover: nur Titel aus meinen Abos
export const discoverAbo = (p) => ({ watch_region: REGION, with_watch_providers: aboIds(p).join('|'), with_watch_monetization_types: 'flatrate|free|ads' });

// Bei welchen meiner Abos läuft der Titel? → ['Netflix', …] (leer = bei keinem)
const cache = new Map();
export function whereMine(p, id, md) {
  const key = `${md}:${id}`;
  if (!cache.has(key)) {
    cache.set(key, tmdb.get(`${MEDIA[md].path}/${id}/watch/providers`).then((d) => {
      const r = d.results?.[REGION] || {};
      return new Set([...(r.flatrate || []), ...(r.free || []), ...(r.ads || [])].map((x) => x.provider_id));
    }).catch(() => new Set()));
  }
  return cache.get(key).then((ids) => abosOf(p).filter((k) => byKey.get(k)[2].some((n) => ids.has(n))).map((k) => byKey.get(k)[1]));
}

export const SOURCE = 'Wo was läuft: Daten von JustWatch (über TMDB), können ein paar Tage hinterherhinken.';
