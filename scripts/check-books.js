// Vergleicht zwei freie Buch-Quellen: Open Library (ohne Schlüssel) und Google Books (ohne Schlüssel, mit Tageslimit).
// Aufruf: node scripts/check-books.js
// Prüft: englische und deutsche Bücher finden, Cover, Beschreibung, Seiten, Schlagwörter, Bewertungen,
// ISBN-Suche und ob verschiedene Ausgaben (auch in anderer Sprache) als dasselbe Werk erkannt werden.

const OL = 'https://openlibrary.org';
const GB = 'https://www.googleapis.com/books/v1/volumes';
const UA = { 'User-Agent': 'film-app-check/1.0 (Buchquellen-Pruefung)' };

const get = async (url) => {
  const res = await fetch(url, { headers: UA, redirect: 'follow' });
  if (!res.ok) return { _status: res.status };
  return res.json();
};
const mark = (ok) => (ok ? 'ja ' : 'NEIN');
const score = { ol: 0, gb: 0, max: 0 };
const count = (ol, gb) => { score.max++; if (ol) score.ol++; if (gb) score.gb++; };

const BOOKS = [
  // [Titel, Autor, Sprache, Hinweis]
  ['The Hitchhiker\'s Guide to the Galaxy', 'Douglas Adams', 'en'],
  ['Pride and Prejudice', 'Jane Austen', 'en'],
  ['The Hundred-Year-Old Man Who Climbed Out of the Window and Disappeared', 'Jonas Jonasson', 'en', 'Übersetzung aus dem Schwedischen'],
  ['The Shadow of the Wind', 'Carlos Ruiz Zafón', 'en', 'Übersetzung aus dem Spanischen'],
  ['Forrest Gump', 'Winston Groom', 'en', 'Romanvorlage'],
  ['Project Hail Mary', 'Andy Weir', 'en', 'neu (2021)'],
  ['Der Vorleser', 'Bernhard Schlink', 'de'],
  ['Tschick', 'Wolfgang Herrndorf', 'de'],
  ['Die Vermessung der Welt', 'Daniel Kehlmann', 'de'],
];

console.log('\n=== Suche nach Titel + Autor ===\n');
for (const [title, author, lang, note] of BOOKS) {
  const ol = await get(`${OL}/search.json?${new URLSearchParams({ title, author, lang, limit: 1, fields: 'key,title,cover_i,first_publish_year,number_of_pages_median,subject,ratings_average,ratings_count,readinglog_count,edition_count,language,editions,editions.key,editions.title,editions.language,editions.cover_i' })}`);
  const w = ol.docs?.[0];
  const gb = await get(`${GB}?${new URLSearchParams({ q: `intitle:${title} inauthor:${author}`, langRestrict: lang, maxResults: 1 })}`);
  const v = gb.items?.[0]?.volumeInfo;
  console.log(`${title} – ${author}${note ? ` (${note})` : ''}`);
  if (w) {
    const ed = w.editions?.docs?.[0];
    console.log(`  Open Library: gefunden ${mark(true)} · Werk ${w.key} · ${w.edition_count} Ausgaben · Cover ${mark(w.cover_i)} · Seiten ${w.number_of_pages_median || '–'} · Schlagwörter ${(w.subject || []).length} · Note ${w.ratings_average ? w.ratings_average.toFixed(1) + ` (${w.ratings_count})` : '–'} · Leser ${w.readinglog_count || 0}`);
    console.log(`               passende Ausgabe (${lang}): „${ed?.title || '–'}“ ${ed?.language?.join(',') || ''} · Cover ${mark(ed?.cover_i)}`);
  } else console.log('  Open Library: NICHT gefunden');
  if (v) console.log(`  Google Books: gefunden ${mark(true)} · „${v.title}“ · Cover ${mark(v.imageLinks)} · Seiten ${v.pageCount || '–'} · Kategorien ${(v.categories || []).join(', ') || '–'} · Note ${v.averageRating || '–'} (${v.ratingsCount || 0}) · Beschreibung ${mark(v.description)}`);
  else console.log(`  Google Books: NICHT gefunden${gb._status ? ` (Status ${gb._status})` : ''}`);
  count(w && w.cover_i && w.number_of_pages_median && (w.subject || []).length > 5, v && v.imageLinks && v.pageCount && (v.categories || []).length);
  // Beschreibung bei Open Library steht im Werk
  if (w) {
    const work = await get(`${OL}${w.key}.json`);
    const desc = typeof work.description === 'string' ? work.description : work.description?.value;
    console.log(`  Open Library Beschreibung: ${desc ? `ja (${desc.length} Zeichen, Sprache meist Englisch)` : 'NEIN'}`);
  }
  console.log('');
}

console.log('=== ISBN (Strichcode) und „dasselbe Werk“ ===\n');
// Paare: englische und deutsche Ausgabe desselben Buchs
const ISBN = [
  ['1984 (englisch, Signet)', '9780451524935'],
  ['1984 (deutsch, Ullstein)', '9783548234106'],
  ['Harry Potter 1 (englisch, Bloomsbury)', '9780747532699'],
  ['Harry Potter 1 (deutsch, Carlsen)', '9783551551672'],
  ['Der Hundertjährige (deutsch, Carl’s books)', '9783570585016'],
  ['The Hundred-Year-Old Man (englisch, Hesperus)', '9781843913726'],
  ['Der Vorleser (deutsch, Diogenes)', '9783257229530'],
  ['The Reader (englisch, Vintage)', '9780375707971'],
];
const works = {};
for (const [label, isbn] of ISBN) {
  const ed = await get(`${OL}/isbn/${isbn}.json`);
  const work = ed.works?.[0]?.key;
  const gb = await get(`${GB}?q=isbn:${isbn}`);
  const v = gb.items?.[0]?.volumeInfo;
  works[label] = work;
  console.log(`${label} ${isbn}`);
  console.log(`  Open Library: ${ed._status ? `NICHT gefunden (${ed._status})` : `„${ed.title}“ → Werk ${work}`}`);
  console.log(`  Google Books: ${v ? `„${v.title}“ · Sprache ${v.language} · Cover ${mark(v.imageLinks)}` : `NICHT gefunden${gb._status ? ` (${gb._status})` : ''}`}`);
  count(!ed._status && work, !!v);
}
const same = (a, b) => works[a] && works[a] === works[b];
console.log('\nDasselbe Werk erkannt?');
console.log(`  1984 englisch = deutsch: ${mark(same('1984 (englisch, Signet)', '1984 (deutsch, Ullstein)'))}`);
console.log(`  Harry Potter englisch = deutsch: ${mark(same('Harry Potter 1 (englisch, Bloomsbury)', 'Harry Potter 1 (deutsch, Carlsen)'))}`);
console.log(`  Hundertjähriger englisch = deutsch: ${mark(same('Der Hundertjährige (deutsch, Carl’s books)', 'The Hundred-Year-Old Man (englisch, Hesperus)'))}`);
console.log(`  Der Vorleser = The Reader: ${mark(same('Der Vorleser (deutsch, Diogenes)', 'The Reader (englisch, Vintage)'))}`);
console.log('  Google Books kennt keine Werke, jede Ausgabe ist ein eigener Eintrag → dort nie „dasselbe Buch“.');

console.log('\n=== Themen (Schlagwörter) ===\n');
for (const subject of ['time_travel', 'cooking', 'black_humor', 'heist', 'friendship']) {
  const r = await get(`${OL}/search.json?${new URLSearchParams({ q: `subject_key:${subject}`, sort: 'readinglog', limit: 5, lang: 'en', fields: 'title,author_name' })}`);
  console.log(`  ${subject}: ${r.numFound ?? 0} Bücher, z. B. ${(r.docs || []).slice(0, 4).map((d) => d.title).join(' · ')}`);
}

console.log(`\nErgebnis (vollständige Treffer): Open Library ${score.ol}/${score.max}, Google Books ${score.gb}/${score.max}\n`);
