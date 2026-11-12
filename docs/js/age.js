// Altersfreigabe: deutsche FSK, als Rückfall die US-Freigabe.
// Gemeinsam genutzt von Gruppenabend und Kinderfilmen.
const US = { G: 0, PG: 6, 'PG-13': 12, R: 16, 'NC-17': 18, 'TV-Y': 0, 'TV-G': 0, 'TV-Y7': 6, 'TV-PG': 6, 'TV-14': 12, 'TV-MA': 16 };

// Freigabe aus der Antwort von movie/{id}?append_to_response=release_dates
// bzw. tv/{id}?append_to_response=content_ratings – oder null, wenn unbekannt
export function ageOf(details) {
  const tv = details?.content_ratings?.results;
  const list = details?.release_dates?.results || [];
  const certs = tv
    ? (country) => tv.filter((r) => r.iso_3166_1 === country).map((r) => r.rating).filter(Boolean)
    : (country) => (list.find((r) => r.iso_3166_1 === country)?.release_dates || []).map((d) => d.certification).filter(Boolean);
  const de = certs('DE').map(Number).filter((n) => !isNaN(n));
  if (de.length) return Math.max(...de); // mehrere Fassungen: die strengste zählt
  const us = certs('US').map((c) => US[c]).filter((n) => n != null);
  return us.length ? Math.max(...us) : null;
}

// Passt der Film zur Grenze? (null = egal; ohne bekannte Freigabe = nein)
export function ageOk(details, maxAge) {
  if (maxAge == null) return true;
  const a = ageOf(details);
  return a != null && a <= maxAge;
}

// Zusatz für TMDB-Discover, damit schon die Liste vorsortiert ist
export const discoverAge = (maxAge) => (maxAge ? { certification_country: 'DE', 'certification.lte': maxAge } : {});
