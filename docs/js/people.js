// Wer spielt mit? Kleine Zeile auf Film- und Serienkarten (Vorschläge, Merkliste).
// Jeder Name ist antippbar und öffnet die Personen-Seite unter „Geschmack“ (app.js → taste.openPerson).
import * as tmdb from './tmdb.js?v=1.25.0';
import { esc } from './ui.js?v=1.25.0';
import { MEDIA } from './media.js?v=1.25.0';

// Link auf die Personen-Seite; x = { id, n, r: 'actor' | 'director', p: Bildpfad }
export const personLink = (x, cls = 'author-link', inner = esc(x.n), extra = '') =>
  `<a href="#/geschmack" class="${cls}" data-personopen="${x.id}" data-personname="${esc(x.n)}" data-personrole="${x.r || 'actor'}" data-personpic="${esc(x.p || '')}"${extra}>${inner}</a>`;

// Platzhalter auf der Karte; gefüllt wird erst, wenn die Karte ins Bild kommt
export const peopleSlot = (id, md) => `<p class="people-slot muted small" data-people-for="${md}:${id}"></p>`;

async function crew(md, id) {
  if (md === 'tv') {
    const d = await tmdb.get(`tv/${id}`, { append_to_response: 'aggregate_credits' });
    return { dirs: d.created_by || [], cast: d.aggregate_credits?.cast || [] };
  }
  const d = await tmdb.get(`movie/${id}/credits`);
  return { dirs: (d.crew || []).filter((x) => x.job === 'Director'), cast: d.cast || [] };
}

async function fill(slot) {
  if (slot.dataset.loaded) return;
  slot.dataset.loaded = '1';
  const [md, id] = slot.dataset.peopleFor.split(':');
  let c;
  try { c = await crew(md, id); } catch { slot.dataset.loaded = ''; return; }
  const as = (r) => (x) => personLink({ id: x.id, n: x.name, r, p: x.profile_path });
  const dirs = c.dirs.slice(0, 2).map(as('director'));
  const cast = [...c.cast].sort((a, b) => (a.order ?? 99) - (b.order ?? 99)).slice(0, 3).map(as('actor'));
  slot.innerHTML = [
    dirs.length ? `${MEDIA[md].w.director}: ${dirs.join(', ')}` : '',
    cast.length ? `Mit ${cast.join(', ')}` : '',
  ].filter(Boolean).join(' · ');
}

let observer = null;
// Alle noch leeren Zeilen in root füllen – sparsam: erst kurz bevor sie sichtbar werden
export function fillPeopleSlots(root) {
  if (!root) return;
  const slots = [...root.querySelectorAll('[data-people-for]:not([data-loaded="1"])')];
  if (!('IntersectionObserver' in window)) { slots.forEach(fill); return; }
  // Beobachtet wird die Karte – die leere Zeile selbst ist unsichtbar
  observer ||= new IntersectionObserver((entries) => entries.forEach((en) => {
    if (!en.isIntersecting) return;
    observer.unobserve(en.target);
    en.target.querySelectorAll('[data-people-for]').forEach(fill);
  }), { rootMargin: '300px 0px' });
  slots.forEach((s) => observer.observe(s.closest('article') || s.parentElement));
}
