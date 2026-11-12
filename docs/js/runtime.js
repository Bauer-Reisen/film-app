// Laufzeit nachladen: TMDB-Listen enthalten sie nicht, nur die Details.
// Filme: „· 112 Min.“, Serien: „· 3 Staffeln · ca. 50 Min.“
// Geladen wird erst, wenn eine Karte (fast) auf dem Bildschirm ist – so bleiben es wenige Abfragen.
import * as tmdb from './tmdb.js?v=1.7.0';
import { tvLength } from './media.js?v=1.7.0';

const known = new Map(); // 'movie:id' / 'tv:id' → Text ('' = unbekannt)

// Platzhalter, den die Seiten in ihre Karten schreiben
export const runtimeSlot = (id, media = 'movie') => `<span class="runtime" data-runtime="${id}" data-rtmedia="${media}"></span>`;

// Titel in fremder Schrift (z. B. Koreanisch), weil es keinen deutschen gibt? Dann den englischen nachladen.
const FOREIGN = /[^\p{Script=Latin}\p{N}\p{P}\p{Zs}\p{S}]/u;
export const titleText = (title, id, media = 'movie') => (FOREIGN.test(title || '')
  ? `<span data-titlefix="${id}" data-rtmedia="${media}">${String(title).replace(/[<>&"]/g, '')}</span>`
  : null);
async function fixTitle(el) {
  el.dataset.done = '1';
  try {
    const d = await tmdb.get(`${el.dataset.rtmedia || 'movie'}/${el.dataset.titlefix}`, { language: 'en-US' });
    if (d.title && !FOREIGN.test(d.title)) el.textContent = d.title;
  } catch { /* dann bleibt der Originaltitel */ }
}

const keyOf = (el) => `${el.dataset.rtmedia || 'movie'}:${el.dataset.runtime}`;
const show = (el, text) => { el.dataset.done = '1'; el.textContent = text ? ` · ${text}` : ''; };

async function fill(el, language) {
  const key = keyOf(el);
  if (known.has(key)) { show(el, known.get(key)); return; }
  const [media, id] = key.split(':');
  try {
    const d = await tmdb.get(`${media}/${id}`, { language }); // dieselbe Abfrage wie bei der Merkliste
    known.set(key, media === 'tv' ? tvLength(d) : d.runtime ? `${d.runtime} Min.` : '');
  } catch { return; }
  document.querySelectorAll(`[data-runtime="${id}"][data-rtmedia="${media}"]`).forEach((x) => show(x, known.get(key)));
}

// Einmal beim Start: beobachtet die Seite und füllt neue Platzhalter, sobald sie sichtbar werden
export function initRuntimes(root, language) {
  const seen = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      seen.unobserve(e.target);
      e.target.querySelectorAll('[data-runtime]:not([data-done])').forEach((el) => fill(el, language()));
      if (e.target.matches('[data-runtime]')) fill(e.target, language());
    }
  }, { rootMargin: '400px 0px' });
  const scan = () => {
    root.querySelectorAll('[data-titlefix]:not([data-done])').forEach(fixTitle);
    scanRuntimes();
  };
  const scanRuntimes = () => root.querySelectorAll('[data-runtime]:not([data-done]):not([data-watched])').forEach((el) => {
    if (known.has(keyOf(el))) { show(el, known.get(keyOf(el))); return; }
    el.dataset.watched = '1';
    seen.observe(el.closest('article') || el); // die ganze Karte beobachten (der Platzhalter selbst ist anfangs leer)
  });
  new MutationObserver(scan).observe(root, { childList: true, subtree: true });
  scan();
}
