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
Wonder|R. J. Palacio|Wunder; Hyperion|Dan Simmons; Solaris|Stanisław Lem; Roadside Picnic|Arkady Strugatsky|Picknick am Wegesrand; The Long Way to a Small, Angry Planet|Becky Chambers|Der lange Weg zu einem kleinen zornigen Planeten;
Harry Potter and the Chamber of Secrets|J. K. Rowling|Harry Potter und die Kammer des Schreckens; Harry Potter and the Prisoner of Azkaban|J. K. Rowling|Harry Potter und der Gefangene von Askaban;
Harry Potter and the Goblet of Fire|J. K. Rowling|Harry Potter und der Feuerkelch; Harry Potter and the Order of the Phoenix|J. K. Rowling|Harry Potter und der Orden des Phönix;
Harry Potter and the Half-Blood Prince|J. K. Rowling|Harry Potter und der Halbblutprinz; Harry Potter and the Deathly Hallows|J. K. Rowling|Harry Potter und die Heiligtümer des Todes;
Catching Fire|Suzanne Collins|Gefährliche Liebe; Mockingjay|Suzanne Collins|Flammender Zorn; The Two Towers|J. R. R. Tolkien|Die zwei Türme; The Return of the King|J. R. R. Tolkien|Die Rückkehr des Königs;
The Physician|Noah Gordon|Der Medicus; Me Before You|Jojo Moyes|Ein ganzes halbes Jahr; The Seven Sisters|Lucinda Riley|Die sieben Schwestern; Fifty Shades of Grey|E. L. James|Shades of Grey;
Twilight|Stephenie Meyer|Bis(s) zum Morgengrauen; The Thorn Birds|Colleen McCullough|Die Dornenvögel; Angels & Demons|Dan Brown|Illuminati; Inferno|Dan Brown;
Fall of Giants|Ken Follett|Sturz der Titanen; The Keeper of Lost Causes|Jussi Adler-Olsen|Erbarmen; Faceless Killers|Henning Mankell|Mörder ohne Gesicht;
The Chemistry of Death|Simon Beckett|Die Chemie des Todes; The Boy in the Striped Pyjamas|John Boyne|Der Junge im gestreiften Pyjama; Sophie's World|Jostein Gaarder|Sofies Welt;
The Wave|Morton Rhue|Die Welle; The Why Café|John Strelecky|Das Café am Rande der Welt; Hector and the Search for Happiness|François Lelord|Hectors Reise;
The Shell Seekers|Rosamunde Pilcher|Die Muschelsucher; Diary of a Wimpy Kid|Jeff Kinney|Gregs Tagebuch; Ronia, the Robber's Daughter|Astrid Lindgren|Ronja Räubertochter;
The Brothers Lionheart|Astrid Lindgren|Die Brüder Löwenherz; Eat, Pray, Love|Elizabeth Gilbert; It Ends with Us|Colleen Hoover|Nur noch ein einziges Mal; Verity|Colleen Hoover;
The Silent Patient|Alex Michaelides|Die stumme Patientin; The Snowman|Jo Nesbø|Schneemann;
Inkheart|Cornelia Funke|Tintenherz; The Thief Lord|Cornelia Funke|Herr der Diebe; Ruby Red|Kerstin Gier|Rubinrot; The Swarm|Frank Schätzing|Der Schwarm;
Look Who's Back|Timur Vermes|Er ist wieder da; Die Känguru-Chroniken|Marc-Uwe Kling; QualityLand|Marc-Uwe Kling; Therapy|Sebastian Fitzek|Die Therapie;
The Eye Collector|Sebastian Fitzek|Der Augensammler; Passenger 23|Sebastian Fitzek|Passagier 23; Das Paket|Sebastian Fitzek; Snow White Must Die|Nele Neuhaus|Schneewittchen muss sterben;
Altes Land|Dörte Hansen; What You Can See from Here|Mariana Leky|Was man von hier aus sehen kann; Unterleuten|Juli Zeh; Über Menschen|Juli Zeh;
Tyll|Daniel Kehlmann; The End of Loneliness|Benedict Wells|Vom Ende der Einsamkeit; Herr Lehmann|Sven Regener; Crime|Ferdinand von Schirach|Verbrechen;
Blackout|Marc Elsberg; Das Jesus-Video|Andreas Eschbach; The 13½ Lives of Captain Bluebear|Walter Moers|Die 13½ Leben des Käpt'n Blaubär;
The City of Dreaming Books|Walter Moers|Die Stadt der träumenden Bücher; Mieses Karma|David Safier; Vollidiot|Tommy Jaud; Dampfnudelblues|Rita Falk; Milchgeld|Volker Klüpfel;
Das Boot|Lothar-Günther Buchheim; The Wall|Marlen Haushofer|Die Wand; The Tobacconist|Robert Seethaler|Der Trafikant; A Whole Life|Robert Seethaler|Ein ganzes Leben;
The Wandering Whore|Iny Lorentz|Die Wanderhure; Gut|Giulia Enders|Darm mit Charme; Erebos|Ursula Poznanski;
Krabat|Otfried Preußler; The Robber Hotzenplotz|Otfried Preußler|Der Räuber Hotzenplotz;
Jim Button and Luke the Engine Driver|Michael Ende|Jim Knopf und Lukas der Lokomotivführer; Emil and the Detectives|Erich Kästner|Emil und die Detektive;
Lisa and Lottie|Erich Kästner|Das doppelte Lottchen; The Flying Classroom|Erich Kästner|Das fliegende Klassenzimmer;
The Sorrows of Young Werther|Johann Wolfgang von Goethe|Die Leiden des jungen Werthers; Faust|Johann Wolfgang von Goethe; Effi Briest|Theodor Fontane;
Chess Story|Stefan Zweig|Schachnovelle; Homo Faber|Max Frisch; Andorra|Max Frisch; The Fire Raisers|Max Frisch|Biedermann und die Brandstifter;
The Visit|Friedrich Dürrenmatt|Der Besuch der alten Dame; The Physicists|Friedrich Dürrenmatt|Die Physiker; The Judge and His Hangman|Friedrich Dürrenmatt|Der Richter und sein Henker;
The Pledge|Friedrich Dürrenmatt|Das Versprechen; Intrigue and Love|Friedrich Schiller|Kabale und Liebe; The Robbers|Friedrich Schiller|Die Räuber; William Tell|Friedrich Schiller|Wilhelm Tell;
Nathan the Wise|Gotthold Ephraim Lessing|Nathan der Weise; Emilia Galotti|Gotthold Ephraim Lessing; Woyzeck|Georg Büchner; The Rider on the White Horse|Theodor Storm|Der Schimmelreiter;
The Sandman|E. T. A. Hoffmann|Der Sandmann; The Jew's Beech|Annette von Droste-Hülshoff|Die Judenbuche; The Broken Jug|Heinrich von Kleist|Der zerbrochne Krug;
Michael Kohlhaas|Heinrich von Kleist; The Captain of Köpenick|Carl Zuckmayer|Der Hauptmann von Köpenick; The Man Outside|Wolfgang Borchert|Draußen vor der Tür;
Mother Courage and Her Children|Bertolt Brecht|Mutter Courage und ihre Kinder; The Good Person of Szechwan|Bertolt Brecht|Der gute Mensch von Sezuan;
The Threepenny Opera|Bertolt Brecht|Die Dreigroschenoper; Beneath the Wheel|Hermann Hesse|Unterm Rad; The Lost Honour of Katharina Blum|Heinrich Böll|Die verlorene Ehre der Katharina Blum;
The Clown|Heinrich Böll|Ansichten eines Clowns; Flight to Afar|Alfred Andersch|Sansibar oder der letzte Grund; Clothes Make the Man|Gottfried Keller|Kleider machen Leute;
The Loyal Subject|Heinrich Mann|Der Untertan; Berlin Alexanderplatz|Alfred Döblin; Youth Without God|Ödön von Horváth|Jugend ohne Gott; Agnes|Peter Stamm;
Corpus Delicti|Juli Zeh; Fall-Out|Gudrun Pausewang|Die Wolke; Friedrich|Hans Peter Richter|Damals war es Friedrich;
Ben Loves Anna|Peter Härtling|Ben liebt Anna; The Center of the World|Andreas Steinhöfel|Die Mitte der Welt; Rico, Oscar and the Deepest Shadows|Andreas Steinhöfel|Rico, Oskar und die Tieferschatten;
Romeo and Juliet|William Shakespeare|Romeo und Julia; Hamlet|William Shakespeare; Macbeth|William Shakespeare
`.split(';').map((s) => s.trim()).filter(Boolean).map((s) => { const [t, a, de] = s.split('|').map((x) => x.trim()); return { t, a, de }; });

// In Deutschland bekannt (englische Titel aus der Liste oben) – stehen unter „Geschmack“ weiter oben.
// Alles ab „Harry Potter and the Chamber of Secrets“ ist ohnehin für Deutschland ausgesucht.
const split = (x) => new Set(x.split(';').map((y) => y.trim()).filter(Boolean));
const DE_KNOWN = split(`Pride and Prejudice; Dracula; The Metamorphosis; The Trial; The Magic Mountain; Steppenwolf; Siddhartha; All Quiet on the Western Front;
The Great Gatsby; Brave New World; Nineteen Eighty-Four; Animal Farm; The Little Prince; The Hobbit; The Fellowship of the Ring; The Lord of the Rings;
Lord of the Flies; The Name of the Rose; Perfume; The Neverending Story; Momo; The Reader; The Tin Drum; Measuring the World; Why We Took the Car;
The Hitchhiker's Guide to the Galaxy; The Shadow of the Wind; The Alchemist; The Kite Runner; The Book Thief; Harry Potter and the Philosopher's Stone;
The Da Vinci Code; The Girl with the Dragon Tattoo; The Hunger Games; The Fault in Our Stars; A Game of Thrones; It; The Shining; The Godfather;
Bridget Jones's Diary; Pippi Longstocking; Charlie and the Chocolate Factory; The Lion, the Witch and the Wardrobe; The Diary of a Young Girl;
The Pillars of the Earth; Where the Crawdads Sing; The Midnight Library; The Little Paris Bookshop; The Circle; A Man Called Ove; Alice's Adventures in Wonderland;
Treasure Island; Around the World in Eighty Days; Twenty Thousand Leagues Under the Sea; The Adventures of Sherlock Holmes; Murder on the Orient Express;
Sapiens; Gone Girl; Wonder; The Martian; Life of Pi; The Hundred-Year-Old Man Who Climbed Out of the Window and Disappeared; Man's Search for Meaning;
The Curious Incident of the Dog in the Night-Time; Matilda; Outlander; The Girl on the Train; Eleanor Oliphant Is Completely Fine`);
// Ursprünglich auf Deutsch geschrieben – wer auf Englisch liest, bekommt sie nicht nach oben
const GERMAN_AUTHORS = split(`Franz Kafka; Thomas Mann; Hermann Hesse; Erich Maria Remarque; Patrick Süskind; Michael Ende; Bernhard Schlink; Günter Grass; Daniel Kehlmann;
Wolfgang Herrndorf; Nina George; Viktor Frankl; Cornelia Funke; Kerstin Gier; Frank Schätzing; Timur Vermes; Marc-Uwe Kling; Sebastian Fitzek; Nele Neuhaus; Dörte Hansen;
Mariana Leky; Juli Zeh; Benedict Wells; Sven Regener; Ferdinand von Schirach; Marc Elsberg; Andreas Eschbach; Walter Moers; David Safier; Tommy Jaud; Rita Falk;
Volker Klüpfel; Stefan Zweig; Max Frisch; Friedrich Dürrenmatt; Theodor Fontane; Johann Wolfgang von Goethe; Erich Kästner; Otfried Preußler; Lothar-Günther Buchheim;
Marlen Haushofer; Robert Seethaler; Iny Lorentz; Giulia Enders; Ursula Poznanski; Andreas Steinhöfel; Gudrun Pausewang; Hans Peter Richter; Friedrich Schiller;
Gotthold Ephraim Lessing; Georg Büchner; Theodor Storm; E. T. A. Hoffmann; Annette von Droste-Hülshoff; Heinrich von Kleist; Carl Zuckmayer; Wolfgang Borchert;
Bertolt Brecht; Heinrich Böll; Alfred Andersch; Gottfried Keller; Heinrich Mann; Alfred Döblin; Ödön von Horváth; Peter Stamm; Peter Härtling`);
// Typische Schullektüre (Deutschland) – eigene Ansicht „Schullektüre abhaken“
const SCHOOL = split(`The Sorrows of Young Werther; Faust; Effi Briest; Chess Story; Homo Faber; Andorra; The Fire Raisers; The Visit; The Physicists; The Judge and His Hangman;
The Pledge; Intrigue and Love; The Robbers; William Tell; Nathan the Wise; Emilia Galotti; Woyzeck; The Rider on the White Horse; The Sandman; The Jew's Beech; The Broken Jug;
Michael Kohlhaas; The Captain of Köpenick; The Man Outside; Mother Courage and Her Children; The Good Person of Szechwan; The Threepenny Opera; Beneath the Wheel;
The Lost Honour of Katharina Blum; The Clown; Flight to Afar; Clothes Make the Man; The Loyal Subject; Berlin Alexanderplatz; Youth Without God; Agnes; Corpus Delicti;
Fall-Out; Friedrich; Ben Loves Anna; The Wave; Krabat; Emil and the Detectives; The Metamorphosis; The Trial; Siddhartha; Steppenwolf; All Quiet on the Western Front;
Perfume; The Reader; Why We Took the Car; The Tin Drum; Measuring the World; The Diary of a Young Girl; The Boy in the Striped Pyjamas; Sophie's World;
Romeo and Juliet; Hamlet; Macbeth; Nineteen Eighty-Four; Animal Farm; Brave New World; Lord of the Flies; Fahrenheit 451; The Catcher in the Rye; Of Mice and Men;
To Kill a Mockingbird; The Great Gatsby; The Old Man and the Sea; The Curious Incident of the Dog in the Night-Time; The Little Prince; Momo; The Neverending Story`);
const DE_FROM = BOOKS.findIndex((b) => b.t === 'Harry Potter and the Chamber of Secrets');

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
  if (DE_KNOWN.has(b.t) || i >= DE_FROM) x.d = 1; // in Deutschland bekannt
  if (GERMAN_AUTHORS.has(b.a)) x.o = 'de'; // ursprünglich deutsch
  if (SCHOOL.has(b.t)) x.k = 1; // Schullektüre
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
// g = Genres (book-genres.js), s = Schlagwörter, r = Leser·innen bei Open Library (Beliebtheit),
// d = in Deutschland bekannt, o = 'de' ursprünglich auf Deutsch, k = Schullektüre.
export const SEED_BOOKS = ${JSON.stringify(books)};
export const SEED_AUTHORS = ${JSON.stringify(authors)};
// Film/Serie → Buch, das sich ähnlich anfühlt: [m = Film | t = Serie, TMDB-Nummer, Werk-Nummer]
export const PAIRS = ${JSON.stringify(pairs)};
`;
writeFileSync('docs/js/seeds-books.js', out);
console.log(`\n${books.length} Bücher, ${authors.length} Autor·innen, ${pairs.length} Paare → docs/js/seeds-books.js (${Math.round(out.length / 1024)} KB)`);
console.log('Genres:', BOOK_GENRES.map((g) => `${g.id} ${books.filter((b) => b.g.includes(g.id)).length}`).join(' · '));
