// Deutsche Nationalbibliothek (frei, ohne Schlüssel): Abfrage und Lesen der Datensätze.
// Genutzt für „Demnächst“ (book-upcoming.js) und wenn Open Library eine ISBN nicht kennt (books.byIsbn, seit 1.38.3) –
// Open Library fehlen viele deutsche Ausgaben, die Nationalbibliothek hat (fast) jedes in Deutschland erschienene Buch.
// Gesendet werden nur ISBNs, Namen von Autor·innen und Buchtitel – keine Markierungen.
const SRU = 'https://services.dnb.de/sru/dnb';
const memo = new Map();

export const clean = (s) => String(s || '').replace(/[\u0098\u009c]/g, '').replace(/\s+/g, ' ').trim();

export function sru(query, schema = 'MARC21-xml', max = 30) {
  const url = `${SRU}?version=1.1&operation=searchRetrieve&recordSchema=${schema}&maximumRecords=${max}&query=${encodeURIComponent(query)}`;
  if (!memo.has(url)) {
    const p = fetch(url).then((r) => { if (!r.ok) throw new Error('DNB'); return r.text(); })
      .then((t) => new DOMParser().parseFromString(t, 'text/xml'));
    memo.set(url, p);
    p.catch(() => memo.delete(url));
  }
  return memo.get(url);
}

export const records = (doc) => [...doc.getElementsByTagName('record')].filter((r) => r.getAttribute('type') === 'Bibliographic');

// Ein Datensatz → { id, title, sub, orig, author, ym, year, pg, isbn, series, … } (Rohdaten, noch ungefiltert)
export function parse(rec) {
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
    orig: clean(df('240')[0]?.a || '').replace(/[\s:;/.]+$/, ''), // Originaltitel bei Übersetzungen
    author: df('100')[0]?.a || '',
    pg: Number((df('300')[0]?.a || '').match(/(\d+)\s*(S\.|Seiten)/)?.[1]) || null,
    edition: df('250').map((e) => e.a).join(' '),
    content: df('336').map((e) => e.b),
    media: df('337').map((e) => e.b),
    isbn: df('020').map((e) => (e.a || '').replace(/[^\dX]/gi, '')).find((x) => x.length === 13) || '',
    series,
  };
}

// „Wenzel, Olivia“ → „Olivia Wenzel“
export const fullName = (n) => { const [last, first = ''] = String(n || '').split(',').map((x) => x.trim()); return [first, last].filter(Boolean).join(' '); };

// ISBN → Datensatz (oder null)
export async function byIsbn(isbn) {
  const doc = await sru(`num=${isbn}`, 'MARC21-xml', 3);
  const rec = records(doc).map(parse).find((r) => r.id && r.title);
  return rec || null;
}
