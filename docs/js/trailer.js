// Trailer: Knopf auf den Filmkarten, Fenster mit eingebettetem YouTube-Video.
// YouTube wird erst geladen, wenn man auf „Trailer“ tippt (datensparsame Variante youtube-nocookie).
import * as tmdb from './tmdb.js?v=1.7.0';
import { esc, toast } from './ui.js?v=1.7.0';

export const trailerBtn = (id, title, big = false, media = 'movie') =>
  `<button type="button" class="btn ${big ? 'btn-big' : 'btn-small'} trailer-btn" data-trailer="${id}" data-tmedia="${media}" data-title="${esc(title)}"><span aria-hidden="true">▶</span> Trailer</button>`;

// Bester Trailer: Sprache des Profils vor Englisch, offizieller Trailer vor Teaser
export function pickVideo(videos, language) {
  const lang = language.slice(0, 2);
  const yt = (videos || []).filter((v) => v.site === 'YouTube' && v.key);
  const rank = (v) => (v.iso_639_1 === lang ? 0 : v.iso_639_1 === 'en' ? 10 : 20)
    + (v.type === 'Trailer' ? 0 : v.type === 'Teaser' ? 3 : 6) + (v.official ? 0 : 1);
  return yt.filter((v) => ['Trailer', 'Teaser', 'Clip'].includes(v.type)).sort((a, b) => rank(a) - rank(b))[0] || null;
}

async function open(id, title, language, media = 'movie') {
  let video = null;
  try {
    const d = await tmdb.get(`${media}/${id}`, { language, append_to_response: 'videos', include_video_language: `${language.slice(0, 2)},en,null` });
    video = pickVideo(d.videos?.results, language);
  } catch (err) {
    toast(err.message);
    return;
  }
  if (!video) { toast(`Zu „${title}“ gibt es leider keinen Trailer.`); return; }

  const d = document.createElement('dialog');
  d.className = 'trailer-dlg';
  d.setAttribute('aria-label', `Trailer: ${title}`);
  d.innerHTML = `
    <div class="trailer-head">
      <h2>${esc(title)}</h2>
      <button type="button" class="btn btn-small trailer-close" aria-label="Trailer schließen">✕ Schließen</button>
    </div>
    <div class="trailer-frame">
      <iframe src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(video.key)}?autoplay=1&rel=0&playsinline=1"
        title="Trailer: ${esc(title)}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>
    </div>
    <p class="trailer-foot">
      <a href="https://www.youtube.com/watch?v=${encodeURIComponent(video.key)}" target="_blank" rel="noopener">Auf YouTube öffnen</a>
      ${video.iso_639_1 && video.iso_639_1 !== language.slice(0, 2) ? '<span class="muted small"> · nur auf Englisch</span>' : ''}
    </p>`;
  const close = () => { if (d.open) d.close(); d.remove(); };
  d.querySelector('.trailer-close').addEventListener('click', close);
  d.addEventListener('close', () => d.remove());
  d.addEventListener('click', (e) => { if (e.target === d) close(); }); // Tipp neben das Video
  document.body.append(d);
  d.showModal();
  d.querySelector('.trailer-close').focus();
}

// Ein Klick-Handler für alle Seiten
export function handleClick(e, language) {
  const b = e.target.closest('[data-trailer]');
  if (!b) return false;
  open(Number(b.dataset.trailer), b.dataset.title || '', language, b.dataset.tmedia || 'movie');
  return true;
}
