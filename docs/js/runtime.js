// Laufzeit nachladen: TMDB-Listen enthalten sie nicht, nur die Filmdetails.
// Geladen wird erst, wenn eine Karte (fast) auf dem Bildschirm ist – so bleiben es wenige Abfragen.
import * as tmdb from './tmdb.js?v=1.4.0';

const known = new Map(); // id → Minuten (0 = unbekannt)

// Platzhalter, den die Seiten in ihre Karten schreiben
export const runtimeSlot = (id) => `<span class="runtime" data-runtime="${id}"></span>`;

const show = (el, min) => { el.dataset.done = '1'; el.textContent = min ? ` · ${min} Min.` : ''; };

async function fill(el, language) {
  const id = Number(el.dataset.runtime);
  if (known.has(id)) { show(el, known.get(id)); return; }
  try {
    const d = await tmdb.get(`movie/${id}`, { language }); // dieselbe Abfrage wie bei der Merkliste
    known.set(id, d.runtime || 0);
  } catch { return; }
  document.querySelectorAll(`[data-runtime="${id}"]`).forEach((x) => show(x, known.get(id)));
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
  const scan = () => root.querySelectorAll('[data-runtime]:not([data-done]):not([data-watched])').forEach((el) => {
    const id = Number(el.dataset.runtime);
    if (known.has(id)) { show(el, known.get(id)); return; }
    el.dataset.watched = '1';
    seen.observe(el.closest('article') || el); // die ganze Karte beobachten (der Platzhalter selbst ist anfangs leer)
  });
  new MutationObserver(scan).observe(root, { childList: true, subtree: true });
  scan();
}
