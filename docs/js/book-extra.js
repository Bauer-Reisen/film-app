// Zusatzangaben auf Buchkarten, erst bei Bedarf geladen:
// - „Worum geht's?“: Beschreibung des Werks, wenn man es aufklappt
// - „🎬 Verfilmt als …“: Suche bei TMDB, nur Treffer, deren Vorlage dieselbe Person geschrieben hat (wenn die Karte sichtbar wird)
// - „📖 Das Buch dazu“ auf Film- und Serienkarten (Platzhalter bookSlot)
import * as tmdb from './tmdb.js?v=1.13.0';
import * as books from './books.js?v=1.13.0';
import { esc } from './ui.js?v=1.13.0';
import { writersOf, novelOf } from './bridge-books.js?v=1.13.0';

const norm = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');
const lastName = (n) => norm(String(n || '').split(' ').pop());

// Platzhalter auf Buchkarten
export const movieHint = (id, title, author) => (author
  ? `<p class="adapt muted small" data-adapt="${esc(id)}" data-atitle="${esc(title)}" data-aauthor="${esc(author)}"></p>` : '');
// Platzhalter auf Film-/Serienkarten
export const bookSlot = (id, md, title) => `<p class="adapt muted small" data-novel="${id}" data-nmedia="${md}" data-ntitle="${esc(title)}"></p>`;

const adaptMemo = new Map();
// Verfilmungen eines Buchs: Titel suchen (Film und Serie), Vorlage-Autor·in muss passen
async function adaptationsOf(title, author, language) {
  const key = `${title}|${author}|${language}`;
  if (!adaptMemo.has(key)) {
    adaptMemo.set(key, (async () => {
      const short = title.split(/[:(]/)[0].trim();
      const [mv, tv] = await Promise.all([
        tmdb.get('search/movie', { query: short, language }).catch(() => ({ results: [] })),
        tmdb.get('search/tv', { query: short, language }).catch(() => ({ results: [] })),
      ]);
      const cands = [...(mv.results || []).map((x) => ({ ...x, md: 'movie' })), ...(tv.results || []).map((x) => ({ ...x, md: 'tv' }))]
        .filter((x) => (x.vote_count || 0) >= 20).sort((a, b) => (b.vote_count || 0) - (a.vote_count || 0)).slice(0, 5);
      const out = [];
      for (const c of cands) {
        const writers = await writersOf(c.md, c.id).catch(() => []);
        if (writers.some((w) => lastName(w.name) === lastName(author))) out.push(c);
        if (out.length === 2) break;
      }
      return out;
    })().catch(() => []));
  }
  return adaptMemo.get(key);
}

async function fillAdapt(el, language) {
  el.dataset.done = '1';
  const list = await adaptationsOf(el.dataset.atitle, el.dataset.aauthor, language);
  if (!list.length || !el.isConnected) return;
  el.innerHTML = `🎬 Verfilmt als ${list.map((x) => `${x.md === 'tv' ? 'Serie' : 'Film'} „${esc(x.title)}“${x.release_date ? ` (${x.release_date.slice(0, 4)})` : ''}`).join(' und ')}`;
}

async function fillNovel(el, lang) {
  el.dataset.done = '1';
  const b = await novelOf(el.dataset.nmedia, Number(el.dataset.novel), el.dataset.ntitle, lang);
  if (!b || !el.isConnected) return;
  el.innerHTML = `📖 Das Buch dazu: „${esc(b.title)}“ von ${esc(b.writer || b.a)}`;
}

async function fillDesc(det) {
  if (det.dataset.done) return;
  det.dataset.done = '1';
  const p = det.querySelector('p');
  try {
    const d = await books.description(det.dataset.bdesc);
    p.textContent = d || 'Keine Beschreibung vorhanden.';
    p.classList.toggle('muted', !d);
    if (d) p.lang = 'en';
  } catch { p.textContent = 'Beschreibung gerade nicht erreichbar.'; delete det.dataset.done; }
}

// Einmal beim Start: beobachtet die Seite
export function initBookExtras(root, getProfile) {
  root.addEventListener('toggle', (e) => { const d = e.target; if (d.matches?.('details[data-bdesc]') && d.open) fillDesc(d); }, true);
  const seen = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      seen.unobserve(e.target);
      const p = getProfile();
      if (!p) continue;
      e.target.querySelectorAll('[data-adapt]:not([data-done])').forEach((el) => fillAdapt(el, p.language));
      e.target.querySelectorAll('[data-novel]:not([data-done])').forEach((el) => fillNovel(el, books.readLang(p)));
    }
  }, { rootMargin: '200px 0px' });
  const scan = () => root.querySelectorAll('[data-adapt]:not([data-watched]), [data-novel]:not([data-watched])').forEach((el) => {
    el.dataset.watched = '1';
    seen.observe(el.closest('article') || el);
  });
  new MutationObserver(scan).observe(root, { childList: true, subtree: true });
  scan();
}
