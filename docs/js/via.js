// Trefferquote: Hat jemand einen Vorschlag wirklich wegen des Vorschlags geschaut, gelesen oder gespielt?
// Nach „Schon gesehen“ & Co. auf einer Vorschlagsseite bietet die Meldung einen Knopf dafür an.
import * as store from './store.js?v=1.32.0';
import { toast } from './ui.js?v=1.32.0';

const WORD = { movie: 'geschaut', tv: 'geschaut', book: 'gelesen', game: 'gespielt' };

// Meldung nach einer Markierung auf einer Vorschlagsseite (undo = Rückgängig-Knopf oder null)
export function seenToast(text, undo, profileId, media, id, status) {
  const m = store.getMark(profileId, media, id);
  if (!store.isDone(status) || !m || m.v) { toast(text, undo); return; }
  toast(text, [{
    label: `👍 Wegen Vorschlag ${WORD[media] || 'geschaut'}`,
    run: () => { store.setVia(profileId, media, id); toast('Danke! Zählt für deine Trefferquote (unter „Profil“).'); },
  }, undo]);
}

// Zahlen für die Trefferquote: { movie: { good, ok, bad, loved, liked }, … }
export function hitStats(p) {
  const out = {};
  for (const [media, key] of [['movie', 'movies'], ['tv', 'shows'], ['book', 'books'], ['game', 'games']]) {
    const r = { good: 0, ok: 0, bad: 0, loved: 0, liked: 0 };
    for (const m of Object.values(p[key] || {})) {
      if (!m.v) continue;
      if (m.s === 'loved') { r.good++; r.loved++; } else if (m.s === 'liked') { r.good++; r.liked++; } else if (m.s === 'seen') r.ok++; else if (m.s === 'disliked' || m.s === 'dropped') r.bad++;
    }
    if (r.good + r.ok + r.bad) out[media] = r;
  }
  return out;
}
