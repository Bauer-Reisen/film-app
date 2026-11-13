// Bücherliste weitergeben (z. B. per WhatsApp an jemanden im Haushalt) und einfügen.
// Weitergegeben werden nur die Werk-Nummern der Bücher – keine Bewertungen, keine Namen.
// Wer die Liste einfügt, bekommt die Bücher auf die Warteliste und bewertet sie selbst.
import * as store from './store.js?v=1.26.0';
import * as books from './books.js?v=1.26.0';

const APP_URL = 'https://bauer-reisen.github.io/film-app/';

// „Hier einfügen“ unter Geschmack: Scan-Seite mit offenem Einfügefeld öffnen
let pasteWanted = false;
export const requestPaste = () => { pasteWanted = true; };
export const takePaste = () => { const w = pasteWanted; pasteWanted = false; return w; };

// Alle Bücher des Profils (markiert, wartend oder im Regal), ohne „Kein Interesse“
export function shareIds(p) {
  const marked = Object.entries(p.books || {}).filter(([, m]) => m.s !== 'noInterest').map(([id]) => id);
  return [...new Set([...marked, ...(p.pendingBooks || []).map((x) => x.id), ...(p.shelf || []).map((x) => x.id)])];
}

export function shareText(p) {
  const ids = shareIds(p);
  return `📚 ${ids.length} ${ids.length === 1 ? 'Buch' : 'Bücher'} für die App „Was schaue ich?“
So übernimmst du sie: Diese ganze Nachricht kopieren, dann die App öffnen → oben „Bücher“ → Geschmack → „Bücherliste von jemandem bekommen? Hier einfügen“. Danach fragt die App bei jedem Buch, wie es für dich war.
${APP_URL}
Liste: ${ids.join(' ')}`;
}

// Aus eingefügtem Text: Werk-Nummern (OL…W) und zur Sicherheit auch ISBN-Nummern
export function parseList(text) {
  const ids = [...new Set((String(text).match(/OL\d+W/g) || []).map(books.canonical))];
  const isbns = [...new Set((String(text).replace(/OL\d+W/g, ' ').match(/\b(97[89][\d-]{10,14}|\d{9}[\dXx])\b/g) || []).map(books.cleanIsbn).filter(Boolean))];
  return { ids, isbns };
}

// Liste übernehmen: neue Bücher auf die Warteliste. Ergebnis: { added: [ids], known, missing }
export async function importList(p, text) {
  const lang = books.readLang(p);
  const { ids, isbns } = parseList(text);
  const have = new Set([...Object.keys(p.books || {}), ...(p.pendingBooks || []).map((x) => x.id), ...(p.shelf || []).map((x) => x.id)]);
  const want = ids.filter((id) => !have.has(id));
  const found = await books.byIds(want, lang);
  for (const isbn of isbns) {
    const b = await books.byIsbn(isbn, lang).catch(() => null);
    if (b && !have.has(b.id)) found.set(b.id, b);
  }
  const entries = [...want, ...[...found.keys()].filter((id) => !want.includes(id))].filter((id) => found.has(id)).map((id) => books.pendingEntry(found.get(id)));
  store.addPending(p.id, entries);
  return { added: entries.map((x) => x.id), known: ids.length - want.length, missing: want.filter((id) => !found.has(id)).length };
}
