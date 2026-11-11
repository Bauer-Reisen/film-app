# PLAN – Film-App „Was schaue ich als Nächstes?"

Stand: 11.11.2026, Fassung 2 (Website auf GitHub Pages). Grundlage: [ANFORDERUNGEN.md](ANFORDERUNGEN.md). Alle Vorschläge, Kritiken und Antworten liegen im Ordner `planung/` (a–d: erste Runde, e–i: GitHub-Variante).

**So ist der Plan entstanden:**
- Drei Fach-Agenten (Architektur, Empfehlungslogik, Bedienung) haben unabhängig je einen Vorschlag gemacht.
- Ein Kritiker hat sie geprüft, die drei haben darauf geantwortet.
- Dein Wunsch „kein Laptop, der ständig laufen muss, sondern eine Website über GitHub Pages" lief noch einmal durch dieselbe Runde.
- Der Kritiker urteilt: Diese Variante ist für dich die bessere.

---

## 1. Gewählte Lösung auf einen Blick

| Thema | Entscheidung |
|---|---|
| **Wo die App läuft** | Als **Website auf GitHub Pages**. Jede Person öffnet sie per Link **auf dem eigenen Handy** (iPhone, Android oder anderes), rund um die Uhr, im Clubraum und zu Hause. Kein Laptop muss laufen; der PC dient nur zum Bauen. |
| **TMDB-Schlüssel** | Er liegt geheim bei einem **kostenlosen Cloudflare Worker**. Das ist ein kleiner Zwischenhändler im Internet: Er reicht nur Filmabfragen an TMDB weiter. Im Code und im Repository steht der Schlüssel nie. |
| **Profile** | Sie liegen **im Browser des jeweiligen Geräts**. Mit „Profil sichern" und „Profil laden" nimmt man sein Profil als Datei mit. Zwischen Geräten gibt es **keinen automatischen Abgleich**. |
| **Technik** | Reines HTML, CSS und JavaScript, ohne Build-Schritt. Die einzige Zusatzsoftware ist `wrangler`, das Cloudflare-Werkzeug zum Hochladen des Workers. |
| **Repository** | **Öffentlich**, denn GitHub Pages ist nur bei öffentlichen Repositories kostenlos. Darin steht nichts Geheimes. |
| **Testen am Laptop** | `npm start` öffnet die App lokal unter `http://localhost:5500`. |
| **Vorschläge** | Ein einfaches, erklärbares Punktesystem, ohne künstliche Intelligenz. |
| **Bedienung** | Dunkles Kino-Design. Am Handy steht eine Zeile pro Film: Poster links, vier beschriftete Buttons rechts. Unten ist eine Tab-Leiste. |

---

## 2. Technik und Daten

### Dateien
```
Film-App/
  docs/                      ← das ist die Website (GitHub Pages)
    index.html  style.css  manifest.webmanifest  icons/  tmdb-logo.svg
    js/app.js        Oberfläche
    js/config.js     ALLE Zahlen und Grenzwerte, Adresse des Workers
    js/tmdb.js       Abfragen über den Worker, Zwischenspeicher
    js/store.js      Profile im Browser speichern
    js/backup.js     Profil sichern / laden
    js/recommend.js  Vorschläge berechnen
    js/surprise.js   „Überrasch mich"
    js/seeds.js      Startauswahl: ca. 150 Filme, 70 Personen, 30 Studios
  worker/
    index.js         der Zwischenhändler (ca. 60 Zeilen)
    wrangler.toml    seine Einstellungen (nichts Geheimes)
  scripts/
    dev.js           lokaler Teststart (npm start)
    check-tmdb.js    prüft unsere Annahmen über TMDB (npm run check)
    check-secrets.js sucht vor jedem Hochladen nach versehentlich enthaltenen Schlüsseln
  package.json  .gitignore  README.md
```

### Der Zwischenhändler (Cloudflare Worker)
- Der TMDB-Schlüssel liegt dort als **Secret**. **Du trägst ihn selbst im Cloudflare-Dashboard ein**, ganz ohne Terminal. Claude sieht ihn nie.
- Er beantwortet **nur Leseanfragen** an eine feste Liste von TMDB-Adressen: Filme entdecken, Filmdetails, Empfehlungen, Filme einer Person, Suche, Studios, Genres. Alles andere lehnt er ab.
- Er antwortet nur der eigenen Website (`https://<name>.github.io`) und `localhost`. Pro Gerät sind höchstens 60 Anfragen pro Minute erlaubt, als Schutz vor Missbrauch.
- Er sagt dem Browser, wie lange er Antworten aufheben darf:

| Daten | Gültig |
|---|---|
| Details, Empfehlungen | 7 Tage |
| Listen | 1 Tag |
| Suche | 1 Stunde |

- Er bleibt kostenlos bis 100.000 Anfragen pro Tag. Das ist weit mehr, als ihr braucht.
- **Notfall:** Wird der Schlüssel missbraucht, erzeugst du bei TMDB einen neuen und ersetzt ihn im Dashboard. Die README erklärt das.

### Schlüssel bleibt draußen
- `.gitignore` enthält `.env`, `.dev.vars` und `node_modules/`.
- Vor jedem `git push` läuft `check-secrets`. Es sucht nach beiden TMDB-Schlüsselarten und bricht ab, wenn es etwas findet.
- Zusätzlich wird der Push-Schutz von GitHub eingeschaltet.

### Profildaten (im Browser, `localStorage`)
```json
{
  "version": 1,
  "lastBackup": 1762870000000,
  "profiles": [{
    "id": "p_k3x9", "name": "Anna", "language": "de-DE",
    "movies":    { "27205": { "s": "liked", "t": 1762870100000, "g": [878, 28], "l": "en", "y": 2010 } },
    "people":    [ { "id": 525, "role": "director", "t": 1762870200000 } ],
    "companies": [ { "id": 41077, "t": 1762870300000 } ],
    "surpriseShown": [ { "id": 11216, "t": 1762870400000 } ],
    "surpriseLastGenre": { "18": 1762870400000 }
  }]
}
```
- **Status `s`:** `loved` (★ Lieblingsfilm, zählt auch als „Mag ich“, Wunsch vom 11.11.2026), `seen` (gesehen), `liked` (mag ich), `disliked` (mag ich nicht), `want` (Merken), `noInterest` (kein Interesse). Ein Film ohne Markierung hat keinen Eintrag.
- **Merkliste:** Das sind alle Filme mit `want`. Es gibt keine zweite Liste.
- **Zusatzangaben:** `g` (Genres), `l` (Originalsprache), `y` (Jahr) und `n` (Titel, für die Begründungen) werden beim Markieren mitgespeichert. So lässt sich „Überrasch mich" berechnen, ohne TMDB erneut zu fragen.
- **Sprachwechsel:** Die Markierungen hängen an der Filmnummer, nicht am Titel. Beim Sprachwechsel bleibt alles erhalten.
- **Dauerhaft speichern:** Die App bittet den Browser darum (`navigator.storage.persist()`). Am iPhone ist das keine Garantie. Deshalb gelten der Home-Bildschirm und die Sicherungsdatei als eigentlicher Schutz.

### Sprache
- Jede Abfrage enthält die Profilsprache (`de-DE` oder `en-US`). Titel, Poster und Inhaltsangabe kommen in dieser Sprache.
- Fehlt die deutsche Inhaltsangabe, wird die englische gezeigt. Fehlt auch die, erscheint „Keine Inhaltsangabe".
- **Suche:** Sie läuft gleichzeitig auf Deutsch und Englisch, die Treffer werden zusammengeführt. „Die Verurteilten" und „Shawshank" finden denselben Film.
- **Poster:** Sie werden direkt von `image.tmdb.org` geladen, ohne Schlüssel.

### Pflichten gegenüber TMDB
Die Seite „Über diese App" enthält:
- das TMDB-Logo
- den Satz „This product uses the TMDB API but is not endorsed or certified by TMDB."
- einen Link zu TMDB
- den Link zur App und einen QR-Code, damit andere sie schnell öffnen können

### Updates
- Alle Pfade sind relativ, weil die Seite unter `/<repo-name>/` liegt.
- Jede neue Fassung bekommt eine Versionsnummer. Die Profilseite zeigt sie an, damit man sieht, ob das Update angekommen ist.

---

## 3. Empfehlungslogik
Die Berechnung läuft im Browser. Für das iPhone ist das kein Problem: Die erste Liste braucht höchstens etwa 30 Abfragen, also schätzungsweise 1–2 Sekunden. Das Rechnen selbst dauert weniger als eine Zehntelsekunde.

### Wie Vorschläge entstehen
1. **Ausgangspunkte:**
   - alle ★ Lieblingsfilme (bis zu 10) und die 10 zuletzt gemochten Filme
   - die 5 zuletzt gemerkten Filme
   - bis zu 10 Lieblingspersonen
   - bis zu 5 Lieblingsstudios
2. **Kandidaten holen:**
   - TMDB-Empfehlungen zu den Filmen
   - Hauptrollen der Lieblingsschauspieler
   - Filme der Lieblingsregisseure
   - die besten Filme der Lieblingsstudios
3. **Punkte:**

| Grund | Punkte |
|---|---|
| Lieblingsschauspieler in einer Hauptrolle | **+5** |
| Lieblingsregisseur | +4 |
| empfohlen wegen eines ★ Lieblingsfilms | **+5** je Film (höchstens +15) |
| empfohlen wegen eines gemochten Films | +3 je Film (höchstens +9) |
| empfohlen wegen eines gemerkten Films | +1,5 je Film (höchstens +3) |
| Lieblingsstudio | +2 |
| Genre-Neigung (gemochte minus nicht gemochte Genres) | höchstens ±2 |
| Bewertung | Durchschnittsnote minus 6,5 |

4. **Mindestqualität:** normal Note ab 6,5 und ab 200 Stimmen. Mit einem Lieblingsschauspieler oder Lieblingsregisseur reichen Note 5,5 und 50 Stimmen.
5. **Ausschließen:**
   - jeder markierte Film: gesehen, mag ich, mag ich nicht, kein Interesse, Merkliste
   - Filme für Erwachsene, Filme ohne Poster und Filme, die noch nicht erschienen sind

   Dieser Filter läuft **ganz am Schluss, bei jeder Ausgabe**.
6. **Vielfalt:** Pro 20 Vorschläge kommen höchstens 4 aus derselben Quelle.
7. **Begründung:** Der stärkste Grund wird zu einem Satz, zum Beispiel:
   - „Mit Florence Pugh"
   - „Regie: Céline Sciamma"
   - „Weil du *Parasite* mochtest"
   - „Von Studio A24"
8. **„Mehr Vorschläge":** zuerst Platz 21–40, danach die nächste Ergebnisseite von TMDB.

### Rückmeldungen
| Knopf | Wirkung |
|---|---|
| Gesehen | taucht nie wieder auf |
| Mag ich | wird ein neuer Ausgangspunkt, seine Genres zählen positiv |
| Mag ich nicht | wird ausgeschlossen, seine Genres zählen negativ |
| Kein Interesse | wird nur ausgeschlossen |
| Merken | kommt auf die Merkliste und wird ein schwacher Ausgangspunkt |

Nach einer Rückmeldung rechnet die App die Liste sofort neu. Dafür fragt sie TMDB höchstens einmal.

### „Überrasch mich"
1. **Kern des Geschmacks:** Genres, Jahrzehnte und Originalsprachen, die mindestens 15 % der gesehenen oder gemochten Filme ausmachen. Bei weniger als 5 solchen Filmen gilt nichts als Kern.
2. **Ziel:**
   - ein **fremdes Genre**, nämlich das, das am längsten nicht dran war
   - zufällig dazu **ein fremdes Jahrzehnt** oder **eine fremde Originalsprache**
3. **Qualität:** Note ab 7,0 und ab 300 Stimmen.
4. **Ausschließen:**
   - alles Markierte
   - alles schon einmal Gezeigte
   - alles, was gerade bei den Vorschlägen steht
   - Filme, deren Hauptgenre zum Kern gehört
5. **Gezeigte Filme merken:** Die App speichert den Film dauerhaft, **sobald er erscheint**. So kommt bei jedem Klick ein anderer, auch nachdem der Browser geschlossen wurde.
6. **Wenn nichts passt, wird stufenweise gelockert:**
   1. andere Ergebnisseiten
   2. ohne Jahrzehnt oder Sprache
   3. andere fremde Genres
   4. 150 statt 300 Stimmen
   5. nur noch die Qualität zählt
   6. die Gezeigt-Liste leeren, die letzten 20 bleiben gesperrt

   Pro Klick sind höchstens 15 Abfragen erlaubt. Danach springt die App gleich zu Stufe 5. Während der Suche steht da: „Vorhang wird vorbereitet …".
7. **Gemochte Überraschung:** Sie wird ein normaler gemochter Film und fließt so in die Vorschläge ein. Eine nicht gemochte wird nur ausgeschlossen, ihr Genre wird nicht bestraft.

### „Gruppenabend" (Wunsch vom 11.11.2026)
Jede Person tippt auf dem eigenen Handy auf „Gruppenabend“. Jedes Handy schlägt einen Film vor, der zum eigenen Geschmack passt **und** in eine Runde passt. Die Handys sind dabei nicht verbunden: Man zeigt sich die Vorschläge und stimmt ab, welcher gewinnt.

1. **Gruppen-Regeln** (alle Werte in `config.js`, damit man sie leicht nachstellen kann):
   - **Mindestens ein lockeres Genre:** Komödie, Animation, Abenteuer, Familie, Fantasy, Action, Musik oder Science-Fiction.
   - **Zum Dazuwählen:** Horror und Krieg. Normalerweise sind sie nicht dabei, man kann sie aber per Schalter **„+ Horror“** und **„+ Krieg“** dazunehmen, wenn die Runde Lust darauf hat. Dann zählen sie als lockeres Genre. Thriller und Krimi gibt es weiterhin nur, wenn der Film zugleich eine Komödie ist.
   - **Altersfreigabe:** standardmäßig **keine Grenze**, denn im Clubraum schauen keine Kinder. Wer will, kann trotzdem eine Grenze wählen (siehe Altersfilter unten).
   - **Länge:** höchstens 130 Minuten.
   - **Bekannt und beliebt:** Note ab 6,8 und ab 1000 Stimmen. So kommen Filme, die in einer Runde erfahrungsgemäß ankommen.
2. **Kandidaten:**
   - die normalen Vorschläge, gefiltert nach den Gruppen-Regeln
   - zusätzlich Discover-Abfragen mit den lockeren Genres
   - **dazu Filme, die du schon gesehen und gemocht hast**
3. **Rangfolge:** die normalen Punkte, plus +2 für Komödie und +1 für Animation oder Familie. Ungesehene Filme stehen immer vor den schon gemochten. Die schon gemochten tragen den Hinweis **„Kennst du schon – hat dir gefallen“**.
4. **Ausgeschlossen bleiben:** Filme mit „Mag ich nicht“, „Kein Interesse“ oder „Gesehen“ ohne „Mag ich“.
5. **„Den schauen wir“:** Ist der Film noch ungesehen, wird er als „Gesehen“ markiert. Danach kann man ihn wie gewohnt mit „Mag ich“ oder „Mag ich nicht“ bewerten.

### „Kinderfilme" (Wunsch vom 11.11.2026)
Damit sucht man privat gezielt einen Film für Kinder.
1. **Altersauswahl:** **ab 0 · ab 6 · ab 12**, nach der deutschen FSK. Hat ein Film keine deutsche Freigabe, zählt die US-Freigabe: G entspricht ab 0, PG ab 6, PG-13 ab 12. Jedes Profil merkt sich die letzte Wahl.
2. **Kandidaten:** Filme der Genres Familie, Animation und Abenteuer mit der passenden Freigabe, Note ab 6,5 und ab 300 Stimmen.
3. **Rangfolge:** Hauptsächlich zählen Bewertung und Beliebtheit, denn der Geschmack der Kinder ist ein anderer als der eigene. Kleiner Vorrang für Studios und Filme, die man selbst mag, z. B. Studio Ghibli oder Pixar.
4. **Ausgeschlossen:** „Mag ich nicht“ und „Kein Interesse“. Gesehene Filme stehen hinten mit dem Hinweis „Schon gesehen“, denn Kinder schauen Lieblingsfilme gern mehrmals.
5. **Darstellung:** eine Liste mit denselben Karten und Rückmeldungen wie bei den Vorschlägen, dazu „Mehr laden“.

### Altersfilter (gemeinsame Technik)
- Kinderfilme und der optionale Filter beim Gruppenabend nutzen dieselbe Technik: TMDB-Discover mit `certification_country=DE` und `certification.lte`, als Rückfall die US-Freigabe.
- Das Prüfskript in Schritt 2 klärt, wie zuverlässig das ist. Ein Film ohne jede Freigabe erscheint bei Kinderfilmen nicht.

### Startauswahl
- Eine von Hand zusammengestellte Liste mit **ca. 150 Filmen**, quer durch 1950–2020, durch Genres und durch Länder. „Weitere laden" holt danach weitere von TMDB.
- **Personen:** ca. 40 Schauspieler und 30 Regisseure aus vielen Ländern. Dazu kommen Personen aus den gemochten Filmen.
- **Studios:** ca. 30. Die kleinen und unabhängigen sind eigens markiert, zum Beispiel A24, Neon, Blumhouse, Studio Ghibli, Focus, Annapurna und X Filme. Für sie gibt es den Filter „Klein & Independent".

---

## 4. Bedienung

### Seiten
- **„Wer schaut?"**
  - Namen zum Antippen
  - „+ Profil anlegen" (Name und Sprache) und „Profil laden"
  - darunter die Zeile: „Profile werden nur auf diesem Gerät gespeichert. *Was heißt das?*"
  - Gibt es nur ein Profil auf dem Gerät, öffnet es sich direkt. Bei mehreren erscheint immer „Wer schaut?", das zuletzt genutzte steht oben und ist hervorgehoben.
- **Tab-Leiste:** am Handy unten, am Laptop oben: **Vorschläge · Überrasch mich · Geschmack · Merkliste · Profil**.
- **Profil:**
  - „Filme schauen auf: Deutsch | Englisch"
  - „Profil wechseln", „Profil umbenennen"
  - „Profil löschen", mit Rückfrage: „…auf diesem Gerät löschen? Das lässt sich nicht rückgängig machen."
  - Abschnitt **Sichern**: „Profil sichern", „Profil laden" und „Zuletzt gesichert: …"
  - „Über diese App" und die Versionsnummer

### Auf den Home-Bildschirm
**Android (Chrome):** Dort löscht der Browser die Daten nicht nach 7 Tagen. Die App zeigt deshalb nur einmal einen freundlichen Tipp „Zum Startbildschirm hinzufügen". Wo Chrome es anbietet, gibt es dazu einen Knopf **„App installieren"**.

**iPhone (Safari):** Hier ist der Hinweis wichtig.
- **Wann der Hinweis kommt:** gleich beim **ersten Öffnen in Safari, bevor ein Profil angelegt wird**. Grund: Die Home-Bildschirm-App hat einen eigenen Speicher. Wer erst in Safari markiert und dann umzieht, stünde sonst mit leerem Profil da.
- **Text:** „Leg die App auf deinen Home-Bildschirm, dann bleibt dein Profil sicher gespeichert." Dazu die Knöpfe [So geht's] und [Später].
- **„So geht's":** drei Bilder: Teilen-Symbol → „Zum Home-Bildschirm" → „Hinzufügen".
- **Gibt es in Safari schon Markierungen,** führt die App durch den Umzug: „Profil sichern → App vom Home-Bildschirm öffnen → Profil laden".
- **Nach „Später":** frühestens nach 7 Tagen wieder, höchstens zweimal. Danach steht der Hinweis nur noch auf der Profilseite. Am Laptop erscheint er nie.

### Sichern
- **Datei:** `Filmprofil-Anna-2026-11-11.json`. Am iPhone öffnet sich das Teilen-Menü (AirDrop, Mail, „In Dateien sichern"), am Laptop wird sie heruntergeladen.
- **Beim Laden:** Gibt es das Profil schon, kann man wählen: [Ersetzen] [Als neues Profil] [Abbrechen]. Ersetzen führt zusammen statt zu überschreiben: Die neuere Markierung gewinnt, die Listen der gezeigten Überraschungen werden vereint.
- **Erinnerung:** ab 20 neuen Markierungen seit der letzten Sicherung, höchstens einmal pro Woche. Text: „Tipp: Sichere dein Profil, damit nichts verloren geht. [Profil sichern] [Später]"

### Geschmack (Raster)
- **Aufbau:** Unterreiter Filme · Personen · Studios, darüber das Suchfeld „Film, Person oder Studio suchen".
- **Handy (375 px):** eine Zeile pro Film. Links das Poster (100 × 150 px), rechts der Titel und 2 × 2 Buttons (je 115 × 44 px). Etwa 4 Filme passen auf einen Bildschirm.
- **Laptop:** Kachelraster mit 4–6 Spalten.
- **Buttons mit Text:** **✓ Gesehen · ♥ Mag ich · ✕ Mag ich nicht · + Merken**. Ein zweiter Tipp nimmt die Markierung zurück. Unbekannte Filme einfach überscrollen.
- **Personen und Studios:** Ein Tipp schaltet den Favoriten an oder aus (☆/★). Filter: Alle/Schauspiel/Regie bzw. Alle/Klein & Independent.
- **Unten:** „Weitere laden" und „Markierte ausblenden".

### Vorschläge
- **Oben:** groß der Button „Überrasch mich".
- **Karte:** Poster, Titel und Jahr, darunter der Begründungssatz.
- **Buttons:** Gesehen · Mag ich · Mag ich nicht · Kein Interesse · Merken.
- **Nach einem Tipp:** Die Karte klappt ein. 6 Sekunden lang steht da „Mag ich: Alien · **Rückgängig**". Rückgängig stellt den alten Zustand genau wieder her.

### Überrasch mich
- **Verdeckt:** ein Vorhang mit „Drama · 1970er · 112 Min." und **Aufdecken**.
- **Aufgedeckt:** Poster, Titel, Jahr und Inhalt, dazu dieselben fünf Buttons und **Anderen Film**. Eine Rückmeldung wechselt den Film nicht automatisch.

### Gruppenabend
- **Wo:** Auf der Seite Vorschläge stehen oben drei große Buttons: **„Überrasch mich“ · „Gruppenabend“ · „Kinderfilme“**. Am Handy liegen sie als Reihe, die man seitlich wischen kann. Die Tab-Leiste bleibt bei 5 Punkten.
- **Altersfreigabe (optional):** eine Auswahl **„Alter: egal · ab 12 · ab 16“**, standardmäßig „egal“.
- **Schalter oben:** **„+ Horror“** und **„+ Krieg“**. Sie sind normalerweise aus, und jedes Profil merkt sich die letzte Wahl. Ändert man einen Schalter, kommt sofort ein neuer Vorschlag.
- **Großansicht zum Herzeigen:** Poster über fast die ganze Breite, Titel groß, darunter Genre, Jahr und Laufzeit, ein Satz Inhalt und gegebenenfalls „Kennst du schon – hat dir gefallen“. Sie ist gut lesbar, wenn man das Handy in die Runde hält.
- **Buttons:** **„Anderer Vorschlag“**, **„Schon gesehen“** und **„Den schauen wir“**. „Schon gesehen“ markiert den Film im eigenen Profil als gesehen und zeigt sofort den nächsten Vorschlag. Er kommt dort nie wieder, es sei denn, er war ein gemochter Film (Wunsch vom 11.11.2026). Nach „Den schauen wir“ erscheint: „Viel Spaß! Wie war's? [Mag ich] [Mag ich nicht] [Später]“.

### Kinderfilme
- **Oben:** die Altersauswahl **„ab 0 · ab 6 · ab 12“** als drei große Knöpfe.
- **Darunter:** Karten wie bei den Vorschlägen. Schon gesehene Filme tragen den Hinweis „Schon gesehen“.

### Merkliste
Pro Film: Gesehen · Mag ich · Mag ich nicht · Entfernen, jeweils mit Rückgängig.

### iPhone-Regeln und Barrierefreiheit
- Eingabefelder mindestens 16 px, Tippflächen mindestens 44 px.
- Kein Inhalt unter Notch oder Home-Balken.
- Zoomen wird nicht gesperrt, Hover-Effekte gibt es nur am Laptop.
- Starker Kontrast, Zustände nie nur an der Farbe erkennbar.
- Gelber Fokusrahmen, Beschriftungen für Bildschirmleser.
- Wer „Bewegung reduzieren" eingestellt hat, sieht keine Animationen.

---

## 5. Verworfene Alternativen

| Alternative | Warum verworfen |
|---|---|
| **Laptop als Server im WLAN** (Fassung 1) | Der Laptop müsste laufen. Dazu kämen Firewall, wechselnde Adresse, Ruhezustand und gesperrte Club-WLANs. Außerdem wäre die App nicht von zu Hause erreichbar. |
| Gemeinsamer Online-Speicher für Profile mit Club-Code | Ein geteilter Code schützt nicht: Jeder könnte fremde Profile ändern. Dazu käme doppelter Aufwand. Das bleibt ein mögliches Extra für später. |
| Supabase für den Schlüssel | Kostenlose Supabase-Projekte schlafen nach einer Woche ohne Nutzung ein, dann wäre die App tot. |
| Netlify oder Vercel | Das wäre ein zweites Hosting neben GitHub Pages statt einer kleinen Zusatzfunktion. |
| Schlüssel öffentlich in die Website | Verstößt gegen deine Vorgabe, und Missbrauch fiele auf dein TMDB-Konto. |
| Jeder trägt einen eigenen Schlüssel ein | Für Clubmitglieder ohne TMDB-Konto unbenutzbar. |
| Privates Repository | Dann würde GitHub Pages Geld kosten. Im öffentlichen Repo steht nichts Geheimes. |
| Lokaler Worker zum Testen (`wrangler dev`, `.dev.vars`) | Das wäre eine zweite Kopie des Schlüssels auf dem Laptop. Stattdessen spricht auch der lokale Test den echten Worker an. |
| IndexedDB oder Zwischenspeicher im Worker | Nicht nötig. Der Browser-Zwischenspeicher reicht, gesteuert über die Angaben des Workers. |
| React/Vite, Next.js | Build-Schritt und hunderte Pakete, für eine Nicht-Programmiererin schwer zu durchschauen. |
| Getrennte Listen „Will ich sehen" und Merkliste | Zwei Speicherorte laufen garantiert auseinander. |
| TMDB-Funktion `/similar` | Liefert schlechtere Treffer als `/recommendations`. |
| Selbstlernendes Modell | Nicht erklärbar, und am Anfang fehlen die Daten. |
| Kern-Genres bei „Überrasch mich" ganz ausschließen | Fällt Drama weg, bleibt kaum ein guter Film übrig. |
| 2 Spalten mit 4 Buttons nebeneinander | Passt rechnerisch nicht aufs iPhone. |
| Nur Symbole ohne Text | Das iPhone hat keine Tooltips, und ✓/♥/✕ sind leicht zu verwechseln. |
| Tippen zum Durchschalten, Wischgesten | Mehrere Tipps pro Film bzw. Konflikt mit dem Scrollen. |
| Endloses Scrollen | Der Fußbereich wäre unerreichbar, und man verliert leicht die Stelle. |
| Home-Bildschirm-Hinweis erst nach 10 Markierungen | Die Markierungen blieben dann in Safari zurück. |

---

## 6. Bauschritte

Nach jedem Schritt prüfe ich die App selbst im Browser im Handy-Format (iPhone 375 px, kleines Android 360 px) und im Laptop-Format. Ab Schritt 2 lade ich jede Fassung hoch und teste sie auch am echten Link.

**Schritt 0 – machst du, ich erkläre jeden Klick (ca. 20 Min.):**
1. **TMDB:** Gratis-Konto bei themoviedb.org anlegen und unter *Einstellungen → API* den „API Read Access Token" erzeugen.
2. **Cloudflare:** Gratis-Konto bei cloudflare.com anlegen.
3. **GitHub:** Dein vorhandenes Konto reicht.

| # | Schritt | Fertig, wenn |
|---|---|---|
| 1 | **Gerüst:** Ordner, `package.json`, `.gitignore`, `config.js`, Grund-Layout mit iPhone-Regeln, `dev.js`, `check-secrets.js`, Worker-Code, README-Gerüst, Git eingerichtet | `npm start` zeigt lokal eine leere App mit Tab-Leiste. |
| 2 | **Früh veröffentlichen:** Du bestätigst einmal `npx wrangler login` und trägst den Schlüssel im Cloudflare-Dashboard ein. Ich lade den Worker hoch, lege nach deinem OK das öffentliche Repository an und schalte Pages ein. Dann läuft `npm run check` gegen den echten Worker. | Der Link zeigt am iPhone über Mobilfunk die leere App. Eine fremde Adresse wird abgelehnt. Das Prüfskript beantwortet unsere Annahmen über TMDB. **Halt:** Die Ergebnisse können Details der Schritte 4–7 ändern. |
| 3 | **Profile:** anlegen, wechseln, umbenennen, löschen, Sprache, Sichern und Laden, Home-Bildschirm-Hinweis mit Umzug | Zwei Profile anlegen und den Browser schließen: Alles ist noch da. Sichern und Laden funktioniert hin und zurück. |
| 4 | **Geschmack:** Film-Raster, dann Personen und Studios, dann Suche | Markieren, zurücknehmen, „Weitere laden", Suche mit deutschem und englischem Titel |
| 5 | **Vorschläge** mit Begründung, Rückmeldungen, Rückgängig, „Mehr" | Zwei Profile mit unterschiedlichem Geschmack bekommen unterschiedliche Listen. Kein markierter Film erscheint. |
| 6 | **Merkliste** | Gemerkte Filme erscheinen dort, „Mag ich" verschiebt sie richtig. |
| 7 | **Überrasch mich** | 30 Klicks hintereinander bringen 30 verschiedene, ungesehene Filme, auch nach Schließen des Browsers. Jeder startet verdeckt. |
| 7b | **Gruppenabend** | Jeder Vorschlag hält die Gruppen-Regeln ein: lockeres Genre, höchstens 130 Minuten, Horror und Krieg nur mit Schalter, keine Altersgrenze außer der gewählten. Zwei Profile mit unterschiedlichem Geschmack bekommen unterschiedliche Gruppenvorschläge. Schon gemochte Filme tragen den Hinweis. |
| 7c | **Kinderfilme** | Bei „ab 6“ hat jeder Film FSK 0 oder 6 (bzw. G oder PG). Wechselt man die Altersstufe, ändert sich die Liste. |
| 8 | **Über-Seite, README fertig, Abnahme** | Alle Punkte unten sind erfüllt, einschließlich eines echten Tests auf deinem iPhone. |

### Abnahme
- [ ] Die App läuft über den Link, auch über Mobilfunk. Lokal startet sie mit `npm start`. Die README erklärt beides.
- [ ] Zwei Profile mit unterschiedlicher Auswahl bekommen unterschiedliche Vorschläge.
- [ ] Ein Profil auf Deutsch und eines auf Englisch zeigen denselben Film mit dem passenden Titel und Poster: im Raster, in den Vorschlägen, bei „Überrasch mich" und auf der Merkliste.
- [ ] „Überrasch mich" bringt bei 30 Klicks jedes Mal einen anderen, ungesehenen Film, und jeder startet verdeckt.
- [ ] Kein als gesehen markierter Film erscheint in den Vorschlägen oder bei „Überrasch mich".
- [ ] „Gruppenabend“ zeigt nur gruppentaugliche Filme, auf jedem Handy passend zum eigenen Geschmack. Schon gemochte Filme sind erlaubt und gekennzeichnet.
- [ ] „Kinderfilme“ zeigt nur Filme mit passender Altersfreigabe für die gewählte Stufe.
- [ ] Nach Schließen und erneutem Öffnen des Browsers ist alles noch da.
- [ ] Sichern und Laden funktioniert, auch der Umzug von Safari in die Home-Bildschirm-App.
- [ ] Am iPhone und an einem Android-Handy ist alles ohne Zoomen bedienbar.
- [ ] Der Schlüssel steht in keiner Datei im Repository, und `check-secrets` meldet nichts. Der Worker lehnt fremde Adressen ab.

### Änderung gegenüber den Anforderungen (bestätigt am 11.11.2026)
- Jede Person nutzt die App auf dem eigenen Handy. Neben dem iPhone wird auch Android unterstützt. Ein gemeinsames Gerät im Clubraum ist nicht vorgesehen, würde aber trotzdem funktionieren.
- Statt „Daten überleben einen Neustart" gilt: Die Profile überleben das Schließen des Browsers und Neustarts des Geräts.
- Sie liegen **pro Gerät** und werden **nicht automatisch zwischen Geräten abgeglichen**. Umziehen geht über die Sicherungsdatei.
