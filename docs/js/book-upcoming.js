// Kasten „Demnächst von deinen Lieblingen“ oben bei den Buch-Vorschlägen (nur Lesesprache Deutsch).
// Quelle: Deutsche Nationalbibliothek – Verlage melden neue Bücher dort schon vor dem Erscheinen an (frei, ohne Schlüssel).
// Gesendet werden nur Namen von Autor·innen und Buchtitel – keine Markierungen.
// Streng gefiltert: nur gedruckte Bücher auf Deutsch von der Autor·in selbst – keine Hörbücher, Neuauflagen,
// Taschenbuch-Ausgaben schon erschienener Bücher, Sonderausgaben, Sammelbände oder Fanartikel.
// Neue Bände deiner ★/♥-Reihen zählen am meisten. Höchstens drei Einträge; erscheint nur, wenn es etwas gibt.
import * as store from './store.js?v=1.38.2';
import * as books from './books.js?v=1.38.2';
import { esc, toast } from './ui.js?v=1.38.2';
import { seriesOf } from './book-series.js?v=1.38.2';
import { UPCOMING as U } from './config.js?v=1.38.2';
import { pageEl } from './media.js?v=1.38.2';

const SRU = 'https://services.dnb.de/sru/dnb';
const LIKED = new Set(['liked', 'loved']);
const MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
// Alles, was kein neues Buch ist
const NOT_NEW = /neuausgabe|neuauflage|sonderausgabe|sonderedition|sonder-edition|jubiläumsausgabe|taschenbuchausgabe|limitiert|limited|graphic novel|comic|bundle|2in1|2 in 1|sammelband|doppelband|schuber|leseprobe|socken|kalender|hörbuch|hörspiel|lesung|filmausgabe|film-tie-in|geschenkausgabe|kollektion|nachleuchtlack|farbschnitt|illustrierte ausgabe|schmuckausgabe|großdruck|grossdruck|malbuch|mal- und|ausmal|sticker|coloring|colouring|offizielle|begleitbuch|companion|fanbuch|kochbuch|quiz|rätsel|kartenspiel|buch zum film|notizbuch|tagebuch zum|puzzle|postkarten|in einfacher sprache|lernkrimi|lektürehilfe|interpretation|arbeitsheft/i;

let profile = null;
let items = [];
let run = 0;
const memo = new Map();

const box = () => pageEl('upcoming', 'book');
const fold = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ß/g, 'ss');
const clean = (s) => String(s || '').replace(/[\u0098\u009c]/g, '').replace(/\s+/g, ' ').trim();
const ymNow = () => { const d = new Date(); return d.getFullYear() * 100 + d.getMonth() + 1; };
const addMonths = (ym, n) => { const m = Math.floor(ym / 100) * 12 + (ym % 100) - 1 + n; return Math.floor(m / 12) * 100 + (m % 12) + 1; };

// „Erscheint voraussichtlich April 2027“ – rd ist '202704' oder '2027'
export function releaseText(rd) {
  const s = String(rd || '');
  if (/^\d{6}$/.test(s)) return `${MONTHS[Number(s.slice(4)) - 1]} ${s.slice(0, 4)}`;
  return /^\d{4}$/.test(s) ? s : '';
}
// Noch nicht erschienen? (für die Leseliste)
export function isComing(rd) {
  const s = String(rd || '');
  if (/^\d{6}$/.test(s)) return Number(s) >= ymNow();
  return /^\d{4}$/.test(s) && Number(s) > new Date().getFullYear();
}

export const upcomingSlot = () => '<section id="upcoming" class="upcoming" hidden aria-label="Demnächst von deinen Lieblingen"></section>';

// ---------- Nationalbibliothek ----------
function sru(query, schema = 'MARC21-xml', max = 30) {
  const url = `${SRU}?version=1.1&operation=searchRetrieve&recordSchema=${schema}&maximumRecords=${max}&query=${encodeURIComponent(query)}`;
  if (!memo.has(url)) {
    const p = fetch(url).then((r) => { if (!r.ok) throw new Error('DNB'); return r.text(); })
      .then((t) => new DOMParser().parseFromString(t, 'text/xml'));
    memo.set(url, p);
    p.catch(() => memo.delete(url));
  }
  return memo.get(url);
}
// Suchwörter für den Titel (Füllwörter findet die Suche nicht)
const STOPW = new Set('der die das und ein eine einer eines von vom mit dem den des für fur zum zur auf aus the and'.split(' '));
const titleQuery = (t) => clean(t).toLowerCase().split(/[^\p{L}\p{N}]+/u).filter((w) => w.length >= 3 && !STOPW.has(w)).slice(0, 4).map((w) => `tit=${w}`).join(' and ');
const count = (doc) => Number(doc.getElementsByTagName('numberOfRecords')[0]?.textContent || 0);

// Ein Datensatz → { id, title, sub, author, ym, year, isbn, series, vol } (Rohdaten, noch ungefiltert)
function parse(rec) {
  const cf = (tag) => [...rec.getElementsByTagName('controlfield')].find((x) => x.getAttribute('tag') === tag)?.textContent || '';
  const df = (tag) => [...rec.getElementsByTagName('datafield')].filter((x) => x.getAttribute('tag') === tag).map((f) => {
    const o = {};
    for (const s of f.getElementsByTagName('subfield')) { const c = s.getAttribute('code'); if (!(c in o)) o[c] = clean(s.textContent); }
    return o;
  });
  const f008 = cf('008');
  const t = df('245')[0] || {};
  const series = [...df('490'), ...df('800'), ...df('830')].map((s) => ({ n: s.t || s.a || '', v: s.v || '' })).filter((s) => s.n);
  return {
    id: cf('001'),
    lang: f008.slice(35, 38),
    year: Number(f008.slice(7, 11)) || null,
    ym: Number((df('263')[0]?.a || '').slice(0, 6)) || null,
    title: clean(t.a).replace(/[\s:;/.]+$/, '').replace(/[.\s]+(deutsche|dt\.) ausgabe$/i, ''),
    sub: [t.b, t.n, t.p].filter(Boolean).join(' '),
    author: df('100')[0]?.a || '',
    edition: df('250').map((e) => e.a).join(' '),
    content: df('336').map((e) => e.b),
    media: df('337').map((e) => e.b),
    isbn: df('020').map((e) => (e.a || '').replace(/[^\dX]/gi, '')).find((x) => x.length === 13) || '',
    series,
  };
}

// „Sebastian Fitzek“ → { q: 'Fitzek, Sebastian', last: 'fitzek', first: 's' }
function nameParts(n) {
  const parts = clean(n).split(' ');
  const last = parts.pop() || '';
  return { q: parts.length ? `${last}, ${parts.join(' ')}` : last, last: fold(last), first: fold(parts[0] || '').charAt(0) };
}
const isAuthor = (rec, who) => {
  const [last, first = ''] = rec.author.split(',').map((x) => fold(x).trim());
  return last === who.last && (!who.first || !first || first.charAt(0) === who.first);
};

// Kommende, wirklich neue Bücher einer Autor·in
async function comingFrom(name) {
  const who = nameParts(name);
  const now = ymNow();
  const until = addMonths(now, U.bookMonths);
  const doc = await sru(`per="${who.q}" and jhr>=${Math.floor(now / 100)} and mat=books and spr=ger`);
  const out = [];
  for (const rec of [...doc.getElementsByTagName('record')].filter((r) => r.getAttribute('type') === 'Bibliographic')) {
    const r = parse(rec);
    if (!r.id || !r.title || r.lang !== 'ger' || !isAuthor(r, who)) continue;
    if (!r.content.includes('txt') || !r.media.includes('n')) continue; // nur gedruckter Text
    if (NOT_NEW.test(`${r.title} ${r.sub} ${r.edition}`) || books.BUNDLE.test(r.title)) continue;
    // Termin: Monat, wenn bekannt – sonst nur ein Jahr nach diesem
    if (r.ym ? (r.ym < now || r.ym > until) : !(r.year > Math.floor(now / 100) && r.year <= Math.floor(until / 100))) continue;
    out.push({ ...r, a: clean(name), rd: String(r.ym || r.year) });
  }
  // Dieselbe Neuerscheinung mehrfach (Hardcover, E-Book-Ankündigung …): die früheste bleibt
  out.sort((x, y) => Number(x.rd.padEnd(6, '0')) - Number(y.rd.padEnd(6, '0')));
  const kept = [];
  for (const r of out) if (!kept.some((k) => strictSame(k, r))) kept.push(r);
  return kept;
}

// Gleiches Buch? Strenger als books.sameBook: alle Titelwörter des kürzeren Titels müssen im längeren stehen –
// sonst wären „Fearless Hearts – Nova“ und „Fearless Hearts – Wilder“ (gleiche Reihe, gleiches Jahr) dasselbe
const titleWords = (t) => new Set(fold(t).replace(/\(.*?\)/g, ' ').split(/[^a-z0-9]+/).filter((w) => w.length >= 3 && !STOPW.has(w)));
function strictSame(x, y) {
  const a = { n: x.title ?? x.n, a: x.a, ak: x.ak, y: x.year ?? x.y };
  const b = { n: y.title ?? y.n, a: y.a, ak: y.ak, y: y.year ?? y.y };
  if (!books.sameBook(a, b)) return false;
  const [s, l] = [titleWords(a.n), titleWords(b.n)].sort((p, q) => p.size - q.size);
  return [...s].every((w) => l.has(w));
}

// Gab es das Buch schon früher auf Deutsch? Dann ist es eine Neuauflage (z. B. Taschenbuch nach dem Hardcover)
async function appearedBefore(r) {
  const tq = titleQuery(r.title);
  if (!tq) return false;
  try {
    const doc = await sru(`per="${nameParts(r.a).q}" and ${tq} and jhr<${r.year || Math.floor(ymNow() / 100)}`, 'oai_dc', 1);
    return count(doc) > 0;
  } catch { return true; } // im Zweifel weglassen
}

// Ein Buch nach seiner Nummer bei der Nationalbibliothek („DNB…“) – für eingefügte Bücherlisten
export async function dnbBook(id) {
  const idn = String(id).replace(/^DNB/, '');
  const doc = await sru(`idn=${idn}`, 'MARC21-xml', 1);
  const rec = [...doc.getElementsByTagName('record')].find((r) => r.getAttribute('type') === 'Bibliographic');
  if (!rec) return null;
  const r = parse(rec);
  const [last, first = ''] = r.author.split(',').map((x) => x.trim());
  return { id: `DNB${idn}`, title: r.title, a: [first, last].filter(Boolean).join(' '), ak: null, y: r.year, pg: null, g: [], cover: r.isbn ? `dnb:${r.isbn}` : null, rd: String(r.ym || r.year || '') };
}

// Wörter, an denen man eine Reihe erkennt („Bodenstein-Kirchhoff“, „Harry Potter“)
const seriesWords = (n) => fold(n).replace(/\b(ein|eine|der|die|das|reihe|serie|band|krimi|roman|thriller|series|the|und|and|von)\b/g, ' ').split(/[^a-z0-9]+/).filter((w) => w.length >= 4);
function inSeries(r, names) {
  // Nur Reihen-Angabe und Haupttitel – im Untertitel steht oft Werbung („bekannt von den Kluftinger-Krimis“)
  const text = fold(`${r.series.map((s) => s.n).join(' ')} ${r.title}`);
  return names.find((n) => { const w = seriesWords(n); return w.length && w.filter((x) => text.includes(x)).length >= Math.ceil(w.length / 2); }) || null;
}
const volOf = (r) => r.series.find((s) => /\d/.test(s.v))?.v.match(/\d+/)?.[0] || '';

// Kandidaten sammeln, stärkster Grund zuerst
async function collect() {
  const marks = profile.books || {};
  const liked = Object.entries(marks).filter(([, m]) => LIKED.has(m.s) && m.a).map(([id, m]) => ({ id, ...m }))
    .sort((a, b) => (b.s === 'loved') - (a.s === 'loved') || b.t - a.t);
  // Welche Autor·innen fragen wir? Lieblings-Autor·innen zuerst, dann die deiner ★/♥-Bücher
  const who = new Map(); // fold(Name) → { n, fav, books: [] }
  const key = (n) => fold(n).replace(/[^a-z]/g, '');
  for (const a of [...(profile.authors || [])].sort((x, y) => store.tierOf(y) - store.tierOf(x))) {
    if (a.n && store.tierOf(a) >= 1) who.set(key(a.n), { n: a.n, fav: store.tierOf(a), books: [] });
  }
  for (const b of liked) {
    const k = key(b.a);
    if (!who.has(k)) who.set(k, { n: b.a, fav: 0, books: [] });
    who.get(k).books.push(b);
  }
  const ask = [...who.values()].sort((x, y) => (y.books.some((b) => b.s === 'loved') + y.fav) - (x.books.some((b) => b.s === 'loved') + x.fav)).slice(0, U.bookAuthors);
  // Reihen deiner ★/♥-Bücher (Wikidata, auf Deutsch benannt)
  const ser = await seriesOf(ask.flatMap((x) => x.books.map((b) => b.id)).filter((id) => /^OL\d+W$/.test(id)), 'de').catch(() => new Map());
  const mine = [...Object.values(marks), ...(profile.pendingBooks || [])].filter((m) => m.n);
  const known = (r) => mine.some((m) => strictSame(m, r));
  const cands = [];
  await Promise.allSettled(ask.map(async (x) => {
    const list = await comingFrom(x.n);
    // Reihen: Wikidata-Name, dazu die Reihe, unter der die Nationalbibliothek dein Buch führt
    const names = new Map(); // Reihenname → das Buch, das du daraus magst
    for (const b of x.books) { const s = ser.get(b.id); if (s?.n && !names.has(s.n)) names.set(s.n, b); }
    if (list.length && x.books.length) {
      await Promise.allSettled(x.books.slice(0, 4).map(async (b) => {
        const tq = titleQuery(b.n);
        if (!tq) return;
        const doc = await sru(`per="${nameParts(x.n).q}" and ${tq}`, 'MARC21-xml', 3);
        for (const rec of doc.getElementsByTagName('record')) {
          if (rec.getAttribute('type') !== 'Bibliographic') continue;
          parse(rec).series.forEach((s) => { const n = s.n.replace(/\s*;.*$/, ''); if (n && !names.has(n)) names.set(n, b); });
        }
      }));
    }
    for (const r of list) {
      if (known(r)) continue;
      const sName = inSeries(r, [...names.keys()]);
      const fromBook = sName ? names.get(sName) : null;
      let score; let why;
      if (fromBook) {
        const loved = fromBook.s === 'loved';
        const vol = volOf(r);
        // „Die Fearless Hearts Reihe“ → „Fearless Hearts“, „Kluftinger-Krimis“ → „Kluftinger“
        const rName = (r.series[0]?.n.replace(/\s*;.*$/, '') || sName).replace(/^(die|der|das|ein|eine)\s+/i, '').replace(/[-\s]+(reihe|serie|krimis?|romane?|saga)$/i, '');
        score = loved ? 6 : 5;
        why = `${vol ? `Band ${vol} von` : 'Neu in der Reihe'} „${rName}“ – du ${loved ? 'liebst' : 'magst'} „${fromBook.n}“`;
      } else if (x.fav) {
        score = 2 + x.fav;
        why = `Neues Buch von ${x.n}`;
      } else {
        const b = x.books[0];
        score = b.s === 'loved' ? 3 : 2;
        why = `Neues Buch von ${x.n} – du ${b.s === 'loved' ? 'liebst' : 'magst'} „${b.n}“`;
      }
      cands.push({ r, score, why });
    }
  }));
  cands.sort((a, b) => b.score - a.score || a.r.rd.localeCompare(b.r.rd));
  // Neuauflagen erst jetzt prüfen – nur so viele wie nötig
  const out = [];
  for (const c of cands) {
    if (out.length >= U.max) break;
    if (out.some((o) => strictSame(o.r, c.r))) continue;
    if (await appearedBefore(c.r)) continue;
    out.push(c);
  }
  return out;
}

// Gibt es das Buch schon bei Open Library? Dann dieselbe Werk-Nummer wie überall in der App
async function linkOl(c) {
  const r = c.r;
  let ol = null;
  try {
    const list = await books.search({ title: r.title, author: r.a }, 'de', 5);
    ol = list.find((b) => strictSame(r, b) &&(!b.y || b.y >= Math.floor(ymNow() / 100) - 1)) || null;
  } catch { /* ohne Open Library */ }
  // Cover der Nationalbibliothek nur, wenn es wirklich eins gibt (sonst bliebe ein kaputtes Bild)
  const dnb = !ol?.cover && r.isbn ? await new Promise((ok) => {
    const im = new Image();
    im.onload = () => ok(im.naturalWidth > 1 ? `dnb:${r.isbn}` : null);
    im.onerror = () => ok(null);
    im.src = books.cover(`dnb:${r.isbn}`, 'S');
  }) : null;
  return {
    ...c,
    book: {
      id: ol?.id || `DNB${r.id}`, title: r.title, a: r.a, ak: ol?.ak || null, y: r.year, pg: ol?.pg || null, g: ol?.g || [],
      cover: ol?.cover || dnb, rd: r.rd,
    },
  };
}

export async function fill(p) {
  profile = p;
  const mine = ++run;
  if (books.readLang(p) !== 'de') return; // die Nationalbibliothek kennt nur deutsche Ausgaben gut
  const hasSource = (p.authors || []).some((a) => store.tierOf(a) >= 1) || Object.values(p.books || {}).some((m) => LIKED.has(m.s) && m.a);
  if (!hasSource) return;
  let list;
  try { list = await Promise.all((await collect()).map(linkOl)); } catch { return; }
  if (mine !== run || !box()) return;
  items = list;
  paint();
}

function paint() {
  const el = box();
  if (!el) return;
  const marks = profile.books || {};
  const open = items.filter((x) => !marks[x.book.id] || x.done);
  el.hidden = !open.length;
  el.innerHTML = open.length ? `
    <h2 class="upcoming-head">Demnächst von deinen Lieblingen</h2>
    ${open.map(row).join('')}` : '';
}

function row(x) {
  const b = x.book;
  const st = (profile.books || {})[b.id]?.s;
  const img = books.cover(b.cover, 'S');
  return `
    <article class="upcoming-row" data-upbook="${esc(b.id)}">
      ${img ? `<img class="upcoming-poster" src="${esc(img)}" width="46" height="69" loading="lazy" alt="">` :'<div class="upcoming-poster noimg" aria-hidden="true"></div>'}
      <div class="upcoming-info">
        <p class="upcoming-title"><strong>${esc(b.title)}</strong></p>
        <p class="muted small">${esc(x.why)} · erscheint ${esc(releaseText(b.rd))}</p>
        <div class="upcoming-actions">
          ${st === 'want' ? '<span class="small">🔖 Gemerkt</span>' : '<button type="button" class="btn btn-small" data-bup="want">+ Merken</button>'}
          ${st ? '' : `<button type="button" class="btn btn-small" data-bup="noInterest" aria-label="Kein Interesse an ${esc(b.title)}">✕</button>`}
        </div>
      </div>
    </article>`;
}

export function handleClick(e) {
  const btn = e.target.closest('[data-bup]');
  if (!btn) return false;
  const id = btn.closest('[data-upbook]').dataset.upbook;
  const x = items.find((i) => i.book.id === id);
  if (!x) return true;
  const b = x.book;
  const status = btn.dataset.bup;
  const old = store.setMark(profile.id, 'book', id, status, { ...books.markMeta(b), rd: b.rd, o: 1 });
  profile = store.getProfile(profile.id);
  x.done = status === 'want'; // gemerkte bleiben mit „Gemerkt“ stehen
  paint();
  toast(status === 'want' ? `Gemerkt: ${b.title} – steht mit Termin auf der Leseliste` : `Kein Interesse: ${b.title}`, {
    label: 'Rückgängig',
    run: () => { store.restoreMark(profile.id, 'book', id, old); profile = store.getProfile(profile.id); x.done = false; paint(); },
  });
  return true;
}
