// „Weiß nicht mehr, wo ich war“: die zuletzt gesehene Folge einer Serie wiederfinden – ohne zu spoilern.
// 1. Stichworte (was man noch weiß) → werden in Titeln und Inhaltsangaben der Folgen gesucht, gezeigt wird kein Text.
// 2. Standbilder: „Kennst du das?“ – Ja = gesehen, weiter hinten suchen; Nein = weiter vorne (Halbieren, ~7 Fragen bei 100 Folgen).
// 3. Ergebnis: Zur Kontrolle darf man die Inhaltsangabe der zuletzt gesehenen Folge lesen – die kennt man ja schon.
import * as tmdb from './tmdb.js?v=1.38.1';
import { dialog, esc, toast } from './ui.js?v=1.38.1';
import { seasonsOf, se } from './episodes.js?v=1.38.1';

const STOP = new Set('und oder aber der die das den dem des ein eine einen einem einer eines mit von vom zum zur bei auf aus nach vor für über unter ist war sind waren hat hatte haben wird wurde werden sich sie er es ich wir ihr ihm ihn ihre sein seine noch auch dann als wie wo was wer the and with from that this'.split(' '));
const norm = (s) => String(s || '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
// Grobe Wortwurzel: „Hochzeiten“ findet „Hochzeit“, „Unfall“ findet „Unfalls“
const stem = (w) => (w.length > 5 ? w.replace(/(en|er|es|e|n|s)$/u, '') : w);

// Alle schon erschienenen Folgen der Reihe nach
async function episodesOf(d) {
  const last = d.last_episode_to_air;
  const ss = seasonsOf(d).filter((s) => !last || s.season_number <= last.season_number);
  const res = await Promise.allSettled(ss.map((s) => tmdb.get(`tv/${d.id}/season/${s.season_number}`, { language: 'de-DE' })));
  const out = [];
  res.forEach((r, i) => {
    if (r.status !== 'fulfilled') return;
    for (const e of r.value.episodes || []) {
      const ep = [ss[i].season_number, e.episode_number];
      if (last && (ep[0] > last.season_number || (ep[0] === last.season_number && ep[1] > last.episode_number))) continue;
      out.push({ ep, still: e.still_path, name: e.name || '', overview: e.overview || '', text: norm(`${e.name} ${e.overview}`) });
    }
  });
  return out;
}

// Welche Folge passt am besten zu den Stichworten? (Index oder -1, wenn nichts eindeutig ist)
function bestMatch(list, query) {
  const words = [...new Set(norm(query).split(' ').filter((w) => w.length >= 3 && !STOP.has(w)).map(stem))];
  if (!words.length) return -1;
  const has = list.map((x) => { const ws = x.text.split(' '); return words.map((w) => ws.some((t) => t.startsWith(w))); });
  // Seltene Wörter zählen mehr („Tuco“ in 3 Folgen schlägt „Büro“ in 20)
  const df = words.map((_, j) => has.filter((h) => h[j]).length);
  const scores = has.map((h) => h.reduce((sum, hit, j) => sum + (hit ? 1 / df[j] : 0), 0));
  const top = Math.max(...scores);
  if (!top) return -1;
  const best = scores.map((s, i) => (s >= top - 1e-9 ? i : -1)).filter((i) => i >= 0);
  return best.length <= 3 ? best[best.length - 1] : -1; // passt es auf zu viele Folgen, hilft es nicht
}

const stillHtml = (x) => (x.still
  ? `<img class="ep-still" src="${tmdb.img(x.still, 'w500')}" alt="Standbild aus einer Folge">`
  : `<p class="ep-still noimg">Kein Bild – Titel der Folge: <strong>${esc(x.name)}</strong></p>`);

// Liefert [Staffel, Folge] oder null
export async function findEp(d, title) {
  const loading = episodesOf(d);
  const first = await dialog({
    title: 'Wo war ich?',
    body: `<p>Woran erinnerst du dich bei <strong>${esc(title)}</strong>? Ein paar Stichworte reichen – Namen, Orte, was zuletzt passiert ist.</p>
      <label class="field">Stichworte <textarea name="q" rows="2" placeholder="z. B. Hochzeit, Unfall, Mike"></textarea></label>
      <p class="muted small">Am Handy kannst du auch das Mikrofon auf der Tastatur nehmen. Leer lassen geht auch – dann nur mit Bildern.</p>`,
    buttons: [{ label: 'Abbrechen', value: null }, { label: 'Weiter', value: 'ok', primary: true }],
  });
  if (!first || first.value !== 'ok') return null;
  let list;
  try { list = await loading; } catch { list = []; }
  if (!list.length) { toast('Zu dieser Serie gibt es leider keine Folgen-Daten.'); return null; }

  // Halbieren: ans = zuletzt sicher gesehene Folge
  let lo = 0; let hi = list.length - 1; let ans = -1;
  const asked = new Set();
  let hit = bestMatch(list, first.fields.q);
  let n = 0;
  const total = Math.ceil(Math.log2(list.length + 1)) + (hit >= 0 ? 1 : 0);
  while (lo <= hi) {
    let mid = hit >= 0 && hit >= lo && hit <= hi ? hit : Math.floor((lo + hi) / 2);
    hit = -1;
    // schon gefragt („Weiß nicht“)? Dann ein Nachbar
    if (asked.has(mid)) {
      const free = [];
      for (let i = lo; i <= hi; i++) if (!asked.has(i)) free.push(i);
      if (!free.length) break;
      const m0 = mid;
      mid = free.sort((a, b) => Math.abs(a - m0) - Math.abs(b - m0))[0];
    }
    asked.add(mid);
    n++;
    const x = list[mid];
    const r = await dialog({
      title: 'Kennst du das?',
      body: `${stillHtml(x)}<p class="muted small">Staffel ${x.ep[0]}, Folge ${x.ep[1]} · Frage ${n} von etwa ${Math.max(total, n)}</p>`,
      buttons: [{ label: 'Ja, kenne ich', value: 'yes', primary: true }, { label: 'Nein', value: 'no' }, { label: 'Weiß nicht', value: 'skip' }, { label: 'Abbrechen', value: null }],
    });
    if (!r || !r.value) return null;
    if (r.value === 'yes') { ans = mid; lo = mid + 1; } else if (r.value === 'no') hi = mid - 1;
  }

  if (ans < 0) {
    toast('Sieht so aus, als hättest du noch keine Folge gesehen – dann fängst du einfach bei Folge 1 an.');
    return null;
  }
  const x = list[ans];
  const next = list[ans + 1];
  const done = await dialog({
    title: 'Gefunden',
    body: `<p>Du warst vermutlich bis <strong>${se(x.ep)}</strong>${next ? ` – weiter geht's mit <strong>${se(next.ep)}</strong>` : ' – das ist die neueste Folge'}.</p>
      ${x.overview ? `<details class="ep-check"><summary>Zur Kontrolle: Worum ging es in ${se(x.ep)}?</summary><p class="small"><strong>${esc(x.name)}</strong> – ${esc(x.overview)}</p><p class="muted small">Die Folge kennst du schon – hier wird nichts Neues verraten.</p></details>` : ''}`,
    buttons: [{ label: 'Nochmal', value: 'again' }, { label: 'Passt – speichern', value: 'ok', primary: true }],
  });
  if (done?.value === 'again') return findEp(d, title);
  return done?.value === 'ok' ? x.ep : null;
}
