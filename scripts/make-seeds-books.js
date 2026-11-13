// Baut die Startauswahl für Bücher (docs/js/seeds-books.js): ca. 160 bekannte Bücher quer durch Länder und Jahrzehnte,
// Autor·innen und eine kleine Paar-Liste „Film/Serie → Buch, das sich ähnlich anfühlt“.
// Daten von Open Library (frei, ohne Schlüssel). Englische Ausgabe = Titel/Cover auf Englisch, dazu die deutsche Ausgabe.
// Aufruf: node scripts/make-seeds-books.js   (dauert einige Minuten, Open Library bittet um höchstens ~3 Anfragen pro Sekunde)
// Zwischenergebnisse liegen in .seed-cache-books.json, damit ein Abbruch nicht alles neu startet.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { BOOK_GENRES, genresOf } from '../docs/js/book-genres.js';

const OL = 'https://openlibrary.org';
const WORKER = 'https://film-app-tmdb.film-app.workers.dev';
const CACHE = '.seed-cache-books.json';
const cache = existsSync(CACHE) ? JSON.parse(readFileSync(CACHE, 'utf8')) : {};
const saveCache = () => writeFileSync(CACHE, JSON.stringify(cache));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function ol(path, params = {}) {
  const key = `${path}?${new URLSearchParams(params)}`;
  if (cache[key]) return cache[key];
  for (let i = 0; i < 6; i++) {
    await wait(400);
    const res = await fetch(`${OL}${key}`, { headers: { 'User-Agent': 'film-app-seeds/1.0' } });
    if (res.status === 429 || res.status >= 500) { await wait(5000 * (i + 1)); continue; }
    const body = res.ok ? await res.json() : { _status: res.status };
    cache[key] = body;
    saveCache();
    return body;
  }
  return { _status: 'failed' };
}
async function tmdb(path, params = {}) {
  const key = `tmdb:${path}?${new URLSearchParams(params)}`;
  if (cache[key]) return cache[key];
  const res = await fetch(`${WORKER}/3/${path}?${new URLSearchParams(params)}`, { headers: { Origin: 'http://localhost:5500' } });
  const body = await res.json();
  cache[key] = body;
  saveCache();
  return body;
}

// ---------- Bücher (englischer Titel | Autor·in | deutscher Titel, falls übersetzt und anders) ----------
const BOOKS = `
Pride and Prejudice|Jane Austen|Stolz und Vorurteil; Jane Eyre|Charlotte Brontë; Wuthering Heights|Emily Brontë|Sturmhöhe;
Frankenstein|Mary Shelley; Dracula|Bram Stoker; Great Expectations|Charles Dickens|Große Erwartungen; Moby-Dick|Herman Melville;
Crime and Punishment|Fyodor Dostoevsky|Schuld und Sühne; Anna Karenina|Leo Tolstoy; War and Peace|Leo Tolstoy|Krieg und Frieden;
Madame Bovary|Gustave Flaubert; Les Misérables|Victor Hugo|Die Elenden; The Count of Monte Cristo|Alexandre Dumas|Der Graf von Monte Christo;
Don Quixote|Miguel de Cervantes; The Picture of Dorian Gray|Oscar Wilde|Das Bildnis des Dorian Gray; The Metamorphosis|Franz Kafka|Die Verwandlung;
The Trial|Franz Kafka|Der Process; The Magic Mountain|Thomas Mann|Der Zauberberg; Steppenwolf|Hermann Hesse|Der Steppenwolf; Siddhartha|Hermann Hesse;
All Quiet on the Western Front|Erich Maria Remarque|Im Westen nichts Neues; The Great Gatsby|F. Scott Fitzgerald|Der große Gatsby;
Mrs Dalloway|Virginia Woolf; Brave New World|Aldous Huxley|Schöne neue Welt; Nineteen Eighty-Four|George Orwell|1984; Animal Farm|George Orwell|Farm der Tiere;
The Stranger|Albert Camus|Der Fremde; The Little Prince|Antoine de Saint-Exupéry|Der kleine Prinz; The Grapes of Wrath|John Steinbeck|Früchte des Zorns;
Of Mice and Men|John Steinbeck|Von Mäusen und Menschen; Rebecca|Daphne du Maurier; The Hobbit|J. R. R. Tolkien|Der Hobbit;
The Fellowship of the Ring|J. R. R. Tolkien|Die Gefährten; To Kill a Mockingbird|Harper Lee|Wer die Nachtigall stört;
The Catcher in the Rye|J. D. Salinger|Der Fänger im Roggen; Lolita|Vladimir Nabokov; One Hundred Years of Solitude|Gabriel García Márquez|Hundert Jahre Einsamkeit;
Love in the Time of Cholera|Gabriel García Márquez|Die Liebe in den Zeiten der Cholera; The Master and Margarita|Mikhail Bulgakov|Der Meister und Margarita;
Catch-22|Joseph Heller; Slaughterhouse-Five|Kurt Vonnegut|Schlachthof 5; Fahrenheit 451|Ray Bradbury; Dune|Frank Herbert|Der Wüstenplanet;
Foundation|Isaac Asimov|Foundation; The Left Hand of Darkness|Ursula K. Le Guin|Die linke Hand der Dunkelheit; A Clockwork Orange|Anthony Burgess|Uhrwerk Orange;
On the Road|Jack Kerouac|Unterwegs; Things Fall Apart|Chinua Achebe|Alles zerfällt; Beloved|Toni Morrison|Menschenkind; The Old Man and the Sea|Ernest Hemingway|Der alte Mann und das Meer;
Lord of the Flies|William Golding|Herr der Fliegen; The Name of the Rose|Umberto Eco|Der Name der Rose; Perfume|Patrick Süskind|Das Parfum;
The Neverending Story|Michael Ende|Die unendliche Geschichte; Momo|Michael Ende|Momo; The Reader|Bernhard Schlink|Der Vorleser; The Tin Drum|Günter Grass|Die Blechtrommel;
Measuring the World|Daniel Kehlmann|Die Vermessung der Welt; Why We Took the Car|Wolfgang Herrndorf|Tschick;
The Hitchhiker's Guide to the Galaxy|Douglas Adams|Per Anhalter durch die Galaxis; The Unbearable Lightness of Being|Milan Kundera|Die unerträgliche Leichtigkeit des Seins;
Norwegian Wood|Haruki Murakami|Naokos Lächeln; Kafka on the Shore|Haruki Murakami|Kafka am Strand; The Wind-Up Bird Chronicle|Haruki Murakami|Mister Aufziehvogel;
The Handmaid's Tale|Margaret Atwood|Der Report der Magd; The Remains of the Day|Kazuo Ishiguro|Was vom Tage übrig blieb; Never Let Me Go|Kazuo Ishiguro|Alles, was wir geben mussten;
Klara and the Sun|Kazuo Ishiguro|Klara und die Sonne; The Shadow of the Wind|Carlos Ruiz Zafón|Der Schatten des Windes; The Alchemist|Paulo Coelho|Der Alchimist;
Blindness|José Saramago|Die Stadt der Blinden; The God of Small Things|Arundhati Roy|Der Gott der kleinen Dinge; Midnight's Children|Salman Rushdie|Mitternachtskinder;
Life of Pi|Yann Martel|Schiffbruch mit Tiger; The Kite Runner|Khaled Hosseini|Drachenläufer; The Book Thief|Markus Zusak|Die Bücherdiebin;
The Road|Cormac McCarthy|Die Straße; No Country for Old Men|Cormac McCarthy|Kein Land für alte Männer;
The Curious Incident of the Dog in the Night-Time|Mark Haddon|Supergute Tage oder Die sonderbare Welt des Christopher Boone; Atonement|Ian McEwan|Abbitte;
Harry Potter and the Philosopher's Stone|J. K. Rowling|Harry Potter und der Stein der Weisen; The Da Vinci Code|Dan Brown|Sakrileg;
The Girl with the Dragon Tattoo|Stieg Larsson|Verblendung; Gone Girl|Gillian Flynn|Gone Girl; The Hunger Games|Suzanne Collins|Die Tribute von Panem;
The Fault in Our Stars|John Green|Das Schicksal ist ein mieser Verräter; A Game of Thrones|George R. R. Martin|Die Herren von Winterfell;
The Name of the Wind|Patrick Rothfuss|Der Name des Windes; American Gods|Neil Gaiman; Good Omens|Terry Pratchett|Ein gutes Omen; The Colour of Magic|Terry Pratchett|Die Farben der Magie;
Neuromancer|William Gibson|Neuromancer; Do Androids Dream of Electric Sheep?|Philip K. Dick|Träumen Androiden von elektrischen Schafen?; Ender's Game|Orson Scott Card|Das große Spiel;
The Martian|Andy Weir|Der Marsianer; Project Hail Mary|Andy Weir|Der Astronaut; Ready Player One|Ernest Cline; The Three-Body Problem|Liu Cixin|Die drei Sonnen;
Station Eleven|Emily St. John Mandel|Das Licht der letzten Tage; Circe|Madeline Miller|Ich bin Circe; The Song of Achilles|Madeline Miller|Das Lied des Achill;
Normal People|Sally Rooney|Normale Menschen; Where the Crawdads Sing|Delia Owens|Der Gesang der Flusskrebse; Educated|Tara Westover|Befreit;
Sapiens|Yuval Noah Harari|Eine kurze Geschichte der Menschheit; A Man Called Ove|Fredrik Backman|Ein Mann namens Ove; Anxious People|Fredrik Backman|Eine ganz dumme Idee;
The Hundred-Year-Old Man Who Climbed Out of the Window and Disappeared|Jonas Jonasson|Der Hundertjährige, der aus dem Fenster stieg und verschwand;
The Elegance of the Hedgehog|Muriel Barbery|Die Eleganz des Igels; My Brilliant Friend|Elena Ferrante|Meine geniale Freundin; The Vegetarian|Han Kang|Die Vegetarierin;
Convenience Store Woman|Sayaka Murata|Die Ladenhüterin; Before the Coffee Gets Cold|Toshikazu Kawaguchi|Bevor der Kaffee kalt wird;
The Seven Husbands of Evelyn Hugo|Taylor Jenkins Reid|Die sieben Männer der Evelyn Hugo; Daisy Jones & The Six|Taylor Jenkins Reid;
It|Stephen King|Es; The Shining|Stephen King|Shining; Misery|Stephen King|Sie; The Green Mile|Stephen King; Jurassic Park|Michael Crichton|DinoPark;
The Silence of the Lambs|Thomas Harris|Das Schweigen der Lämmer; The Godfather|Mario Puzo|Der Pate; Forrest Gump|Winston Groom; Fight Club|Chuck Palahniuk;
Trainspotting|Irvine Welsh; High Fidelity|Nick Hornby; Bridget Jones's Diary|Helen Fielding|Schokolade zum Frühstück; The Secret History|Donna Tartt|Die geheime Geschichte;
The Goldfinch|Donna Tartt|Der Distelfink; A Little Life|Hanya Yanagihara|Ein wenig Leben; Life After Life|Kate Atkinson|Die Unvollendete; Wolf Hall|Hilary Mantel|Wölfe;
The Night Circus|Erin Morgenstern|Der Nachtzirkus; The Lovely Bones|Alice Sebold|In meinem Himmel; The Help|Kathryn Stockett|Gute Geister; Little Women|Louisa May Alcott|Betty und ihre Schwestern;
Anne of Green Gables|L. M. Montgomery; Alice's Adventures in Wonderland|Lewis Carroll|Alice im Wunderland; Treasure Island|Robert Louis Stevenson|Die Schatzinsel;
Twenty Thousand Leagues Under the Sea|Jules Verne|20.000 Meilen unter dem Meer; Around the World in Eighty Days|Jules Verne|In 80 Tagen um die Welt;
The Time Machine|H. G. Wells|Die Zeitmaschine; The War of the Worlds|H. G. Wells|Krieg der Welten; The Adventures of Sherlock Holmes|Arthur Conan Doyle;
Murder on the Orient Express|Agatha Christie|Mord im Orient-Express; And Then There Were None|Agatha Christie|Und dann gabs keines mehr; The Big Sleep|Raymond Chandler|Der große Schlaf;
The Talented Mr. Ripley|Patricia Highsmith|Der talentierte Mr. Ripley; Pippi Longstocking|Astrid Lindgren|Pippi Langstrumpf; Matilda|Roald Dahl;
Charlie and the Chocolate Factory|Roald Dahl|Charlie und die Schokoladenfabrik; The Lion, the Witch and the Wardrobe|C. S. Lewis|Der König von Narnia;
Northern Lights|Philip Pullman|Der Goldene Kompass; Watchmen|Alan Moore; Maus|Art Spiegelman; Persepolis|Marjane Satrapi; Kitchen Confidential|Anthony Bourdain|Geständnisse eines Küchenchefs;
Into the Wild|Jon Krakauer|In die Wildnis; The Diary of a Young Girl|Anne Frank|Das Tagebuch der Anne Frank; Man's Search for Meaning|Viktor Frankl|… trotzdem Ja zum Leben sagen;
A Gentleman in Moscow|Amor Towles|Ein Gentleman in Moskau; The Seven Deaths of Evelyn Hardcastle|Stuart Turton|Die sieben Tode der Evelyn Hardcastle; Dark Matter|Blake Crouch|Dark Matter;
Recursion|Blake Crouch|Gestern ist für immer; Eleanor Oliphant Is Completely Fine|Gail Honeyman|Ich, Eleanor Oliphant; The Rosie Project|Graeme Simsion|Das Rosie-Projekt;
The Unlikely Pilgrimage of Harold Fry|Rachel Joyce|Die unwahrscheinliche Pilgerreise des Harold Fry; The Little Paris Bookshop|Nina George|Das Lavendelzimmer;
The Circle|Dave Eggers|Der Circle; The Power of the Dog|Don Winslow|Tage der Toten; Get Shorty|Elmore Leonard; A Confederacy of Dunces|John Kennedy Toole|Die Verschwörung der Idioten;
Big Little Lies|Liane Moriarty; The Girl on the Train|Paula Hawkins|Girl on the Train; The Pillars of the Earth|Ken Follett|Die Säulen der Erde; Outlander|Diana Gabaldon|Feuer und Stein;
The Nightingale|Kristin Hannah|Die Nachtigall; All the Light We Cannot See|Anthony Doerr|Alles Licht, das wir nicht sehen; The Midnight Library|Matt Haig|Die Mitternachtsbibliothek;
Howl's Moving Castle|Diana Wynne Jones|Sophie im Schloss des Zauberers; The Thursday Murder Club|Richard Osman|Der Donnerstagsmordclub; Lessons in Chemistry|Bonnie Garmus|Eine Frage der Chemie;
Shōgun|James Clavell; The Lord of the Rings|J. R. R. Tolkien|Der Herr der Ringe; The Body|Stephen King; Kindred|Octavia E. Butler; The Remarkable Journey of Coyote Sunrise|Dan Gemeinhart;
Wonder|R. J. Palacio|Wunder; Hyperion|Dan Simmons; Solaris|Stanisław Lem; Roadside Picnic|Arkady Strugatsky|Picknick am Wegesrand; The Long Way to a Small, Angry Planet|Becky Chambers|Der lange Weg zu einem kleinen zornigen Planeten
`.split(';').map((s) => s.trim()).filter(Boolean).map((s) => { const [t, a, de] = s.split('|').map((x) => x.trim()); return { t, a, de }; });

// ---------- Autor·innen (für „Geschmack → Autor·innen“) ----------
const AUTHORS = `Stephen King; J. K. Rowling; Jane Austen; Agatha Christie; Haruki Murakami; Terry Pratchett; Neil Gaiman; Margaret Atwood;
Kazuo Ishiguro; Fredrik Backman; Jonas Jonasson; Andy Weir; Liu Cixin; Ursula K. Le Guin; Isaac Asimov; Philip K. Dick; Douglas Adams;
J. R. R. Tolkien; George R. R. Martin; Brandon Sanderson; Leo Tolstoy; Fyodor Dostoevsky; Franz Kafka; Hermann Hesse; Thomas Mann;
Michael Ende; Daniel Kehlmann; Juli Zeh; Erich Kästner; Astrid Lindgren; Roald Dahl; Gabriel García Márquez; Isabel Allende; Paulo Coelho;
Carlos Ruiz Zafón; Umberto Eco; Elena Ferrante; Sally Rooney; Donna Tartt; Taylor Jenkins Reid; Colleen Hoover; John Green; Suzanne Collins;
Dan Brown; Ken Follett; Michael Crichton; Cormac McCarthy; Ernest Hemingway; John Steinbeck; George Orwell; Virginia Woolf; Toni Morrison;
Chimamanda Ngozi Adichie; Ian McEwan; Nick Hornby; Matt Haig; Blake Crouch; Richard Osman; Patricia Highsmith; Arthur Conan Doyle; Jules Verne;
Stanisław Lem; Octavia E. Butler; Madeline Miller; Khaled Hosseini; Yuval Noah Harari; Charles Dickens; Mark Twain; Sebastian Fitzek; Cornelia Funke`
  .split(';').map((s) => s.trim()).filter(Boolean);

// ---------- Paare von Hand: Film/Serie (TMDB) → Buch, das sich ähnlich anfühlt (keine Verfilmungen, die erkennt die App selbst) ----------
// [movie|tv, TMDB-Nummer, erwarteter Titel (zur Kontrolle), englischer Buchtitel aus der Liste oben]
const PAIRS = [
  ['movie', 13, 'Forrest Gump', 'The Hundred-Year-Old Man Who Climbed Out of the Window and Disappeared'],
  ['movie', 13, 'Forrest Gump', 'A Man Called Ove'],
  ['movie', 194, 'Amélie', 'The Elegance of the Hedgehog'],
  ['movie', 194, 'Amélie', 'The Little Paris Bookshop'],
  ['movie', 120467, 'The Grand Budapest Hotel', 'A Gentleman in Moscow'],
  ['movie', 27205, 'Inception', 'Dark Matter'],
  ['movie', 157336, 'Interstellar', 'Project Hail Mary'],
  ['movie', 603, 'The Matrix', 'Neuromancer'],
  ['movie', 335984, 'Blade Runner 2049', 'Never Let Me Go'],
  ['movie', 137, 'Groundhog Day', 'Life After Life'],
  ['movie', 546554, 'Knives Out', 'The Seven Deaths of Evelyn Hardcastle'],
  ['movie', 546554, 'Knives Out', 'The Thursday Murder Club'],
  ['movie', 77338, 'The Intouchables', 'The Unlikely Pilgrimage of Harold Fry'],
  ['movie', 773, 'Little Miss Sunshine', 'A Man Called Ove'],
  ['movie', 14160, 'Up', 'A Man Called Ove'],
  ['movie', 680, 'Pulp Fiction', 'Get Shorty'],
  ['movie', 275, 'Fargo', 'No Country for Old Men'],
  ['movie', 329865, 'Arrival', 'The Three-Body Problem'],
  ['movie', 129, 'Spirited Away', 'Howl\'s Moving Castle'],
  ['movie', 313369, 'La La Land', 'Daisy Jones & The Six'],
  ['movie', 76, 'Before Sunrise', 'Normal People'],
  ['movie', 391713, 'Lady Bird', 'Eleanor Oliphant Is Completely Fine'],
  ['movie', 37165, 'The Truman Show', 'The Circle'],
  ['movie', 264660, 'Ex Machina', 'Klara and the Sun'],
  ['movie', 2062, 'Ratatouille', 'Kitchen Confidential'],
  ['movie', 76341, 'Mad Max: Fury Road', 'The Road'],
  ['movie', 489, 'Good Will Hunting', 'A Little Life'],
  ['movie', 207, 'Dead Poets Society', 'The Secret History'],
  ['movie', 115, 'The Big Lebowski', 'A Confederacy of Dunces'],
  ['movie', 762, 'Monty Python and the Holy Grail', 'Good Omens'],
  ['movie', 1422, 'The Departed', 'The Power of the Dog'],
  ['tv', 1396, 'Breaking Bad', 'The Power of the Dog'],
  ['tv', 70523, 'Dark', 'Recursion'],
  ['tv', 66732, 'Stranger Things', 'It'],
  ['tv', 97546, 'Ted Lasso', 'The Rosie Project'],
  ['tv', 97546, 'Ted Lasso', 'Anxious People'],
  ['tv', 42009, 'Black Mirror', 'The Circle'],
  ['tv', 136315, 'The Bear', 'Kitchen Confidential'],
  ['tv', 19885, 'Sherlock', 'The Name of the Rose'],
  ['tv', 87108, 'Chernobyl', 'Station Eleven'],
  ['tv', 93405, 'Squid Game', 'The Hunger Games'],
];

const FIELDS = 'key,title,author_name,author_key,first_publish_year,number_of_pages_median,subject_key,readinglog_count,edition_count,ratings_average,ratings_count,cover_i,editions,editions.key,editions.title,editions.language,editions.cover_i';
const norm = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');
const sameAuthor = (doc, a) => (doc.author_name || []).some((n) => norm(n).includes(norm(a.split(' ').pop())));
// Schlagwörter, die nichts über den Inhalt sagen
const BORING = /^(fiction|accessible_book|protected_daisy|in_library|large_type_books|lending_library|overdrive|open_library_staff_picks|nyt|new_york_times|reading_level|english_language|translations|literature|novela|roman|romans|ficcion|fiction_general|general|classic|classics|literary|long_now|award|history_and_criticism|criticism_and_interpretation|textbooks|study_guides|juvenile_literature|spanish_language|german_language|french_language|reader|readers|open_syllabus|blind|braille|audiobooks|ebooks|.*_fiction_general|.*_\(fictitious_character\).*|.*language_materials.*)$/;
const pickSubjects = (subs) => (subs || []).filter((s) => !BORING.test(s) && s.length < 40 && !/[^a-z0-9_(),'-]/.test(s)).slice(0, 25);

async function findBook(b) {
  // Suche mit Titel und Autor-Feld: Open Library kennt auch andere Schreibweisen (z. B. kyrillisch)
  const r1 = await ol('/search.json', { q: `${b.t} ${b.a}`, lang: 'en', limit: 5, fields: FIELDS });
  const r2 = await ol('/search.json', { title: b.t, author: b.a, lang: 'en', limit: 8, fields: FIELDS });
  const r = { docs: [...(r1.docs || []), ...(r2.docs || []).filter((d) => !(r1.docs || []).some((x) => x.key === d.key))] };
  // Titel muss passen (englische Ausgabe, Werk-Titel oder deutscher Titel) – sonst gewinnt das berühmteste Buch der Person
  const head = (s) => norm(s).replace(/^(the|a|an)(?=[a-z])/, '').slice(0, 10);
  const want = [b.t, b.de].filter(Boolean).map(head);
  const fits = (d) => [d.editions?.docs?.[0]?.title, d.title].some((x) => head(x).length >= 2 && want.some((w) => head(x).startsWith(w) || w.startsWith(head(x))));
  // Autor·in muss passen – außer der Name steht nur in fremder Schrift (z. B. Лев Толстой)
  const authorOk = (d) => sameAuthor(d, b.a) || (d.author_name || []).every((n) => !/[a-z]/i.test(n));
  const guide = (d) => /(notes|study guide|critical|commentary|summary|analysis|cliffs|sparknotes)|'s /i.test(d.title) && !/'s /.test(b.t);
  const docs = (r.docs || []).filter((d) => fits(d) && authorOk(d) && !guide(d));
  if (!docs.length) return null;
  // Das Werk mit den meisten Ausgaben (Doppelte mit wenigen Ausgaben fallen weg)
  docs.sort((x, y) => (y.edition_count || 0) + (y.readinglog_count || 0) - (x.edition_count || 0) - (x.readinglog_count || 0));
  const main = docs[0];
  // Doppelt angelegte Werke: gleicher Titel (englisch oder deutsch, ohne Artikel am Anfang)
  const full = (x) => norm(x).replace(/^(the|a|an|der|die|das)(?=[a-z])/, '');
  const same = (d) => [d.editions?.docs?.[0]?.title, d.title].some((x) => x && [b.t, b.de].filter(Boolean).some((y) => full(x) === full(y)));
  const alt = new Set(docs.slice(1).filter(same).map((d) => d.key));
  const ed0 = main.editions?.docs?.[0];
  const en = ed0 && (ed0.language || []).includes('eng') && fits({ title: ed0.title }) ? ed0 : null;
  // Deutsche Ausgabe desselben Werks
  const deR = await ol('/search.json', { q: `key:${main.key}`, lang: 'de', fields: FIELDS });
  let de = deR.docs?.[0]?.editions?.docs?.[0];
  if (!de?.language?.includes('ger')) de = null;
  if (b.de) {
    // Ist die deutsche Ausgabe als eigenes Werk angelegt (Doppelter)? Dann als zweite Nummer merken.
    const r2 = await ol('/search.json', { q: `${b.de} ${b.a}`, lang: 'de', limit: 3, fields: FIELDS });
    const hit = (r2.docs || []).find((d) => sameAuthor(d, b.a) && norm(d.editions?.docs?.[0]?.title || d.title).startsWith(norm(b.de).slice(0, 12)));
    (r2.docs || []).filter((d) => d.key !== main.key && authorOk(d) && same(d)).forEach((d) => alt.add(d.key));
    if (hit && !de && (hit.editions?.docs?.[0]?.language || []).includes('ger')) de = hit.editions.docs[0];
    if (hit && hit.key !== main.key) { alt.add(hit.key); }
  }
  const id = main.key.replace('/works/', '');
  const subjects = pickSubjects(main.subject_key);
  return {
    id,
    ...(alt.size ? { alt: [...alt].map((k) => k.replace('/works/', '')) } : {}),
    // Titel: von Hand gepflegt (Ausgaben heißen bei Open Library oft seltsam, z. B. „… (Monarch Notes)“)
    t: { en: b.t, ...(b.de || de?.title ? { de: b.de || de.title } : {}) },
    c: { en: en?.cover_i || main.cover_i || null, ...(de?.cover_i ? { de: de.cover_i } : {}) },
    a: (main.author_name || [b.a])[0], ak: (main.author_key || [])[0] || null,
    y: main.first_publish_year || null, pg: main.number_of_pages_median || null,
    g: genresOf(main.subject_key || []), s: subjects.slice(0, 12), r: main.readinglog_count || 0,
  };
}

const books = [];
for (const [i, b] of BOOKS.entries()) {
  const x = await findBook(b);
  if (!x) { console.log(`FEHLT  ${b.t} – ${b.a}`); continue; }
  if (books.some((y) => y.id === x.id)) { console.log(`DOPPELT ${b.t}`); continue; }
  books.push(x);
  if (i % 10 === 0) console.log(`${i + 1}/${BOOKS.length} ${x.t.en}${x.t.de ? ` / ${x.t.de}` : ''} · ${x.g.join(',')} ${x.alt ? `(+${x.alt.join(',')})` : ''}`);
}

const authors = [];
for (const name of AUTHORS) {
  const r = await ol('/search/authors.json', { q: name, limit: 3 });
  const a = (r.docs || []).sort((x, y) => (y.work_count || 0) - (x.work_count || 0)).find((d) => norm(d.name).includes(norm(name.split(' ').pop())));
  if (!a) { console.log(`AUTOR FEHLT ${name}`); continue; }
  authors.push({ id: a.key, n: name, k: a.top_work || '' });
}

const pairs = [];
for (const [md, id, expect, bookTitle] of PAIRS) {
  const d = await tmdb(`${md}/${id}`, { language: 'en-US' });
  const name = d.title || d.name;
  const book = books.find((b) => b.t.en === bookTitle) || books.find((b) => norm(b.t.en).startsWith(norm(bookTitle).slice(0, 15)));
  if (norm(name) !== norm(expect)) console.log(`PAAR: TMDB ${md}/${id} ist „${name}“, erwartet „${expect}“`);
  if (!book) { console.log(`PAAR: Buch fehlt „${bookTitle}“`); continue; }
  pairs.push([md === 'tv' ? 't' : 'm', id, book.id]);
}

const out = `// Automatisch erzeugt von scripts/make-seeds-books.js – nicht von Hand ändern (außer PAIRS im Skript).
// Daten: Open Library (openlibrary.org). id = Werk-Nummer (alle Ausgaben eines Buchs), alt = doppelt angelegte Werk-Nummern,
// t/c = Titel und Cover-Nummer der englischen bzw. deutschen Ausgabe, a/ak = Autor·in, y = Erstausgabe, pg = Seiten,
// g = Genres (book-genres.js), s = Schlagwörter, r = Leser·innen bei Open Library (Beliebtheit).
export const SEED_BOOKS = ${JSON.stringify(books)};
export const SEED_AUTHORS = ${JSON.stringify(authors)};
// Film/Serie → Buch, das sich ähnlich anfühlt: [m = Film | t = Serie, TMDB-Nummer, Werk-Nummer]
export const PAIRS = ${JSON.stringify(pairs)};
`;
writeFileSync('docs/js/seeds-books.js', out);
console.log(`\n${books.length} Bücher, ${authors.length} Autor·innen, ${pairs.length} Paare → docs/js/seeds-books.js (${Math.round(out.length / 1024)} KB)`);
console.log('Genres:', BOOK_GENRES.map((g) => `${g.id} ${books.filter((b) => b.g.includes(g.id)).length}`).join(' · '));
