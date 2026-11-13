// Gemeinsame Bausteine für Film-, Serien- und Buchkarten (Vorschläge, Merk- und Leseliste).
// Wenige große Knöpfe; „Kenn ich schon“ klappt die Bewertung direkt auf der Karte auf.
import { esc } from './ui.js?v=1.27.0';

// main: [[key, icon, text], …] – key 'known' ist der Aufklapp-Knopf; known: die Bewertungen dahinter.
// attr: das data-Attribut, auf das die Seite schon hört (z. B. 'data-fb').
// Seiten, die den Zustand zeigen (Überrasch mich, Kinder): s = aktuelle Markierung, pressed(s, key) wie in media.js
export function markButtons(attr, title, main, known, { s = null, pressed = null } = {}) {
  const on = (key) => (pressed ? pressed(s, key) : false);
  const btn = ([key, icon, text]) => `<button type="button" class="mark mark-${key}" ${attr}="${key}"${pressed ? ` aria-pressed="${on(key)}"` : ''}><span aria-hidden="true">${icon}</span> ${text}</button>`;
  const open = known.some(([key]) => on(key)); // schon bewertet → Bewertung gleich zeigen
  return `
    <div class="marks marks-${main.length}" role="group" aria-label="${esc(title)}">
      ${main.map((m) => (m[0] === 'known'
    ? `<button type="button" class="mark mark-known${open ? ' is-open' : ''}" data-known aria-expanded="${open}"><span aria-hidden="true">${m[1]}</span> ${m[2]}</button>`
    : btn(m))).join('')}
    </div>
    <div class="marks known-row marks-${known.length}" role="group" aria-label="Wie fandst du ${esc(title)}?"${open ? '' : ' hidden'}>
      ${known.map(btn).join('')}
    </div>`;
}

// Von app.js für alle Seiten: „Kenn ich schon“ auf- und zuklappen
export function handleKnown(e) {
  const k = e.target.closest('[data-known]');
  if (!k) return false;
  const row = k.closest('.marks')?.nextElementSibling;
  if (!row?.classList.contains('known-row')) return false;
  const open = row.hidden;
  row.hidden = !open;
  k.setAttribute('aria-expanded', String(open));
  k.classList.toggle('is-open', open);
  if (open) row.querySelector('button')?.focus({ preventScroll: true });
  return true;
}

// Vorschläge oben: Themen, Zeit und Sonder-Seiten hinter einem Knopf; active = was gerade eingestellt ist
export const filterBox = (active, inner) => `
  <details class="filters">
    <summary><span class="filters-label">Filter &amp; mehr</span><span class="filters-now">${active ? esc(active) : 'alles, was zu dir passt'}</span></summary>
    <div class="filters-body">${inner}</div>
  </details>`;

// Alles Weitere zu einem Titel, zugeklappt: Inhalt, Personen bzw. Reihe, Verfilmung, Einkaufs-Link …
// first: der erste Absatz (Inhaltsangabe); bdesc: Buch-Nummer, dann lädt die Inhaltsangabe beim Aufklappen
export const moreBox = (first, rest, bdesc = '') => `
  <details class="overview more"${bdesc ? ` data-bdesc="${esc(bdesc)}"` : ''}>
    <summary>Mehr dazu</summary>
    <div class="more-body">${first}${rest}</div>
  </details>`;
