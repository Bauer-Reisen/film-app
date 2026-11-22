// Kleiner Hinweis unter „Mehr dazu“: Gibt es eine Szene während oder nach dem Abspann?
// Quelle: TMDB-Stichwörter. Nur wenn der Film sicher so markiert ist – sonst erscheint nichts.
// Geladen wird erst, wenn man „Mehr dazu“ aufklappt.
import * as tmdb from './tmdb.js?v=1.38.2';

const AFTER = 179430; // aftercreditsstinger
const DURING = 179431; // duringcreditsstinger

// Leere Zeile in „Mehr dazu“ (nur Filme)
export const creditsSlot = (id, md = 'movie') => (md === 'movie' ? `<p class="credits-tip small" data-credits-for="${id}" hidden></p>` : '');

export async function fillCredits(el) {
  if (!el || el.dataset.loaded) return;
  el.dataset.loaded = '1';
  try {
    const d = await tmdb.get(`movie/${el.dataset.creditsFor}/keywords`);
    const ids = new Set((d.keywords || []).map((k) => k.id));
    const when = ids.has(DURING) && ids.has(AFTER) ? 'während und nach dem Abspann' : ids.has(AFTER) ? 'nach dem Abspann' : ids.has(DURING) ? 'während des Abspanns' : '';
    if (!when) return;
    el.textContent = `🍿 Sitzen bleiben lohnt sich – ${when} kommt noch eine Szene.`;
    el.hidden = false;
  } catch { /* dann eben kein Hinweis */ }
}

// Beim Aufklappen von „Mehr dazu“ nachsehen (toggle steigt nicht auf, darum „capture“)
document.addEventListener('toggle', (e) => {
  const det = e.target;
  if (det instanceof HTMLDetailsElement && det.open) det.querySelectorAll('[data-credits-for]').forEach(fillCredits);
}, true);
