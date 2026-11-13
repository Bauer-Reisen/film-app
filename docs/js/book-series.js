// Buchreihen (z. B. Harry Potter 1–7) von Wikidata – frei, ohne Schlüssel.
// Wikidata kennt zu vielen Büchern die Open-Library-Werk-Nummer (P648), die Reihe (P179) und den Band (P1545).
// Gesendet werden nur Werk-Nummern bzw. die Nummer der Reihe – keine Namen, keine Markierungen.
import * as books from './books.js?v=1.25.0';

const SPARQL = 'https://query.wikidata.org/sparql';
const MAX_MEMBERS = 40; // mehr Bände = eher eine Verlagsreihe („Penguin Classics“) als eine Lesereihe
const seriesMemo = new Map(); // Werk-Nummer → { id, n, ord } | null
const membersMemo = new Map(); // Reihe → Promise<[{ ord, ids, label }] | null>

async function sparql(query) {
  for (let attempt = 0; ; attempt++) {
    try {
      const res = await fetch(`${SPARQL}?format=json&query=${encodeURIComponent(query)}`);
      if (res.ok) return (await res.json()).results.bindings;
    } catch { /* gleich nochmal */ }
    if (attempt >= 1) throw new Error('Die Reihen-Daten sind gerade nicht erreichbar.');
    await new Promise((r) => setTimeout(r, 1500));
  }
}
const labelLang = (lang) => (lang === 'de' ? 'de,en,mul' : 'en,mul,de');
// Namen der Reihen (der Namensdienst in der Abfrage liefert manchmal nur die Nummer)
const labelMemo = new Map();
async function labels(ids, lang) {
  const todo = ids.filter((q) => !labelMemo.has(`${lang}:${q}`));
  for (let i = 0; i < todo.length; i += 50) {
    const chunk = todo.slice(i, i + 50);
    try {
      const res = await fetch(`https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&origin=*&props=labels&languages=de|en|mul&ids=${chunk.join('|')}`);
      const d = await res.json();
      for (const q of chunk) {
        const l = d.entities?.[q]?.labels || {};
        labelMemo.set(`${lang}:${q}`, (lang === 'de' ? (l.de || l.en || l.mul) : (l.en || l.mul || l.de))?.value || '');
      }
    } catch { /* ohne Namen */ }
  }
  return (q) => labelMemo.get(`${lang}:${q}`) || '';
}
const qid = (uri) => uri.split('/').pop();
const ordNum = (o) => { const n = parseFloat(String(o || '').replace(',', '.')); return Number.isFinite(n) ? n : null; };

// Zu welchen Reihen gehören diese Bücher? Ergebnis: Map Werk-Nummer → { id, n, ord }
export async function seriesOf(ids, lang = 'en') {
  const todo = [...new Set(ids)].filter((id) => /^OL\d+W$/.test(id) && !seriesMemo.has(id));
  for (let i = 0; i < todo.length; i += 40) {
    const chunk = todo.slice(i, i + 40);
    try {
      const rows = await sparql(`SELECT ?ol ?series ?ord WHERE {
        VALUES ?ol { ${chunk.map((id) => `"${id}"`).join(' ')} }
        ?item wdt:P648 ?ol; p:P179 ?st. ?st ps:P179 ?series. OPTIONAL { ?st pq:P1545 ?ord } }`);
      chunk.forEach((id) => seriesMemo.set(id, null));
      for (const r of rows) {
        const id = r.ol.value;
        const had = seriesMemo.get(id);
        if (had && (had.ord || !r.ord)) continue; // erste Reihe genügt – lieber eine mit Bandnummer
        seriesMemo.set(id, { id: qid(r.series.value), n: '', ord: r.ord?.value || null });
      }
      const found = chunk.map((id) => seriesMemo.get(id)).filter(Boolean);
      const name = await labels([...new Set(found.map((x) => x.id))], lang);
      found.forEach((x) => { x.n = name(x.id) || 'Reihe'; });
    } catch { /* ohne Reihen weiter – nächstes Mal neu versuchen */ }
  }
  return new Map(ids.map((id) => [id, seriesMemo.get(id) || null]));
}

// Alle Bände einer Reihe in Reihenfolge: [{ ord, ids: [Werk-Nummern], label }] oder null (keine Lesereihe)
function members(series, lang) {
  if (!membersMemo.has(series)) {
    const p = sparql(`SELECT ?member ?memberLabel ?ord ?mol WHERE {
        ?member p:P179 ?st. ?st ps:P179 wd:${series}. OPTIONAL { ?st pq:P1545 ?ord } OPTIONAL { ?member wdt:P648 ?mol }
        SERVICE wikibase:label { bd:serviceParam wikibase:language "${labelLang(lang)}". } } LIMIT 500`).then((rows) => {
      const by = new Map();
      for (const r of rows) {
        const m = qid(r.member.value);
        const e = by.get(m) || { ord: null, ids: [], label: r.memberLabel?.value || '' };
        if (e.ord == null) e.ord = ordNum(r.ord?.value);
        const ol = r.mol?.value;
        if (ol && /^OL\d+W$/.test(ol) && !e.ids.includes(ol)) e.ids.push(ol);
        by.set(m, e);
      }
      const list = [...by.values()];
      if (list.length > MAX_MEMBERS) return null;
      // Zwischenstücke wie „Band 0.5“ (Kurzgeschichten) weglassen
      return list.filter((m) => m.ord == null || Number.isInteger(m.ord)).sort((a, b) => (a.ord ?? 999) - (b.ord ?? 999));
    });
    membersMemo.set(series, p);
    p.catch(() => membersMemo.delete(series));
  }
  return membersMemo.get(series);
}

// Bände als Bücher (Open Library), mit „Band 3“ in b.why. Bände ohne Werk-Nummer fehlen.
export async function seriesBooks(series, lang = 'en') {
  const list = await members(series, lang);
  if (!list) return null;
  const all = list.flatMap((m) => m.ids);
  const found = all.length ? await books.byIds(all.map(books.canonical), lang) : new Map();
  const out = [];
  for (const m of list) {
    // Mehrere Werk-Nummern für einen Band: die meistgelesene
    const cands = m.ids.map((id) => found.get(books.canonical(id))).filter(Boolean).sort((a, b) => (b.r || 0) - (a.r || 0));
    const b = cands[0];
    if (!b || out.some((x) => x.id === b.id)) continue;
    out.push({ ...b, why: m.ord != null && Number.isInteger(m.ord) ? `Band ${m.ord}` : '' });
  }
  return out;
}

// ---------- Reihen-Zeile auf Buchkarten (Geschmack, Vorschläge, Leseliste) ----------
// Platzhalter im Kartentext: <p class="series-slot small" data-bseries-for="OL…W"></p>
// back: wohin „← Zurück“ in der Reihen-Ansicht führt (leer = Geschmack selbst)
// earlier: bei Band 2+ sagen, ob man die Bände davor schon kennt (für Vorschläge und Leseliste)
const READ = new Set(['seen', 'liked', 'loved', 'disliked', 'dropped', 'paused']);
const escHtml = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export async function fillSeriesSlots(root, profile, { back = '', earlier = false } = {}) {
  const slots = [...(root || document).querySelectorAll('[data-bseries-for]:not([data-done])')];
  if (!slots.length || !profile) return;
  slots.forEach((x) => { x.dataset.done = '1'; });
  const lang = books.readLang(profile);
  const map = await seriesOf(slots.map((x) => x.dataset.bseriesFor), lang);
  for (const slot of slots) {
    const id = slot.dataset.bseriesFor;
    const ser = map.get(id);
    if (!ser || !slot.isConnected) continue;
    const ord = ser.ord && /^\d+$/.test(ser.ord) ? Number(ser.ord) : null;
    const link = `<a href="#/geschmack" data-seriesopen="${escHtml(ser.id)}" data-seriesname="${escHtml(ser.n)}" data-seriesback="${escHtml(back)}">📚 Reihe „${escHtml(ser.n)}“: alle Bände</a>`;
    slot.innerHTML = `${ord ? `Band ${ord} · ` : ''}${link}`;
    if (!earlier || !ord || ord < 2) continue;
    // Welche Bände davor kennst du noch nicht?
    members(ser.id, lang).then((list) => {
      if (!list || !slot.isConnected) return;
      const marks = profile.books || {};
      const isRead = (m) => m.ids.some((x) => READ.has(marks[books.canonical(x)]?.s));
      const before = list.filter((m) => m.ord != null && m.ord < ord && m.ids.length);
      const open = before.filter((m) => !isRead(m)).map((m) => m.ord);
      if (!open.length) return;
      const text = open.length === before.length
        ? `Die Bände davor hast du noch nicht markiert – vielleicht erst mit Band ${open[0]} anfangen?`
        : `Davor fehlt dir noch: Band ${open.join(', ')}.`;
      slot.insertAdjacentHTML('beforeend', `<br><span class="muted">${escHtml(text)}</span>`);
    }).catch(() => {});
  }
}
