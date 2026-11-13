# STAND – Film-App

Für eine neue Sitzung: zuerst diese Datei lesen, dann bei Bedarf [PLAN.md](PLAN.md) (Abschnitt 6 = Bauschritte).

Die Nutzerin kann nicht programmieren. Antworte auf Deutsch, knapp und ohne Fachjargon. Claude legt keine Konten an und gibt keine Passwörter oder Schlüssel ein.

## Bauschritte

- [x] **Phase 1 – Plan** (11.11.2026): PLAN.md, Fassung 2 mit GitHub Pages, Cloudflare Worker, Profilen pro Gerät, Gruppenabend und Kinderfilmen
- [x] **Schritt 1 – Gerüst** (11.11.2026): `npm start` zeigt lokal die leere App mit Tab-Leiste. Geprüft bei 375 px, 360 px und 1280 px. `check-secrets` hält einen Test-Schlüssel auf. Git ist eingerichtet, der Hook vor jedem Push ist aktiv.
- [x] **Schritt 0 – Nutzerin (11.11.2026):** TMDB-Konto anlegen und Lesetoken erzeugen, Cloudflare-Konto anlegen. GitHub-Konto ist schon vorhanden.
- [x] **Schritt 2 – Veröffentlichen** (11.11.2026):
  - **App:** https://bauer-reisen.github.io/film-app/ (Repo `Bauer-Reisen/film-app`, öffentlich, Pages aus `main` und `/docs`)
  - **Worker:** https://film-app-tmdb.film-app.workers.dev. Das Secret `TMDB_TOKEN` ist im Dashboard gesetzt. Fremde Seiten und fremde Adressen bekommen 403.
  - **`npm run check`:** Alle Annahmen stimmen.
    - Poster und Titel kommen je nach Sprache.
    - Die Suche findet Filme unter deutschem und englischem Titel.
    - Filter für Sprache, Laufzeit und FSK (DE und US) funktionieren.
    - Genre-Filter: Komma heißt UND, `|` heißt ODER.
  - **Studio-Nummern:**

    | Studio | Nummer |
    |---|---|
    | A24 | 41077 |
    | NEON | 90733 (nur 9 Filme, weil Verleih) |
    | Blumhouse | 3172 |
    | Ghibli | 10342 |
    | Focus | 10146 |
    | Searchlight | 43 + 127929 |
    | Annapurna | 13184 |
    | Plan B | 81 |
    | StudioCanal | 694 |
    | X Filme | 96 |
    | Toho | 882 |
    | CJ | 7036 |
    | Pixar | 3 |
    | Warner | 174 |
    | Universal | 33 |
    | Aardman | 297 |
    | LAIKA | 11537 |
    | Constantin | 47 |

- [x] **Schritt 3 – Profile** (11.11.2026, Version 0.2.0):
  - `store.js` (localStorage `filmapp.v1`), `backup.js` (Sichern/Laden/Zusammenführen), `ui.js` (Dialog, Toast), `platform.js` (iOS/Android, Home-Bildschirm).
  - „Wer schaut?": 1 Profil → öffnet direkt; mehrere → Auswahl, zuletzt genutztes oben. Aktuelles Profil gilt pro Sitzung (sessionStorage).
  - Getestet: anlegen (doppelter Name abgefangen, Enter = Speichern), Neustart, wechseln, Sprache (Markierung bleibt), umbenennen, abbrechen, sichern (Dateiname), laden (Zusammenführen: neuere Markierung gewinnt; als neues Profil; kaputte Datei), löschen. 375 px + 1280 px, keine Konsolenfehler.
  - App-Icons als PNG (`scripts/make-icons.js`), Manifest für Android-Installation.
  - Nicht im Browser prüfbar: iPhone-Hinweis zum Home-Bildschirm und Teilen-Menü – am echten iPhone testen.
- [x] **Schritt 4 – Geschmack** (11.11.2026, Version 0.3.0):
  - `taste.js` (Seite), `tmdb.js` (Abfragen über den Worker, höchstens 6 gleichzeitig, Zwischenspeicher), `seeds.js` (233 Filme, 88 Personen, 38 Studios mit Titel/Poster DE+EN).
  - Startliste neu bauen: `node scripts/make-seeds.js` (ca. 10 Min., Zwischenstand in `.seed-cache.json`).
  - Getestet: markieren, zweiter Tipp nimmt zurück, Markierung bleibt beim Sprachwechsel. „Weitere laden“ geht nach der Startliste mit TMDB weiter, ohne doppelte Filme. „Markierte ausblenden“ funktioniert. Die Suche findet „Die Verurteilten“ und „Shawshank“ (beides Nr. 278), außerdem Personen und Studios. Favoriten für Personen und Studios, Filter Schauspiel/Regie und Indie, „Aus Filmen, die du magst“. Geprüft bei 375 px, 360 px und 1280 px, ohne Konsolenfehler.
  - **★ Lieblingsfilm** (Wunsch, Version 0.3.1): Ein Tipp aufs Poster setzt den Status `loved`, das Poster leuchtet. Er zählt auch als „Mag ich“, bei den Vorschlägen mit +5 je Film statt +3. Ein zweiter Tipp aufs Poster macht wieder „Mag ich“ daraus, ein Tipp auf „Mag ich“ nimmt die Markierung ganz weg.
  - **Nur neue Filme** (Wunsch, Version 0.4.1): Beim Öffnen sind markierte und übersprungene Filme ausgeblendet. Übersprungen heißt: Man hat bei „Weitere laden“ an ihnen vorbeigeblättert. Sie werden in `passed` gemerkt und gehören zur Sicherung. Mit „Alle zeigen“ und „Nur neue zeigen“ schaltet man um. Getestet: Nach dem Neuöffnen steht kein Film der ersten Runde mehr oben.
  - Gefundener Fehler: Ein Modul ohne `?v=` wird doppelt geladen und hat dann getrennte Daten. Deshalb prüft der Hook vor jedem Push jetzt auch die Versionsnummern der Importe.
- [x] **Schritt 5 – Vorschläge** (11.11.2026, Version 0.4.0):
  - `recommend.js` (Ausgangspunkte → Kandidaten → Punkte → höchstens 4 pro Quelle je 20 → Begründungssatz), `suggest.js` (Seite).
  - Beim Markieren wird jetzt auch der Titel gespeichert (`n`). So kann die App sagen: „Weil du „X“ mochtest“.
  - Der Worker erlaubt jetzt 300 statt 60 Anfragen pro Minute und Gerät, weil sich beim Gruppenabend mehrere Handys ein WLAN teilen.
  - Getestet mit zwei Profilen:
    - Science-Fiction mit Nolan als Lieblingsregie bekommt Terminator, Blade Runner 2049 und Inception („Regie: Christopher Nolan“).
    - Komödie mit Ghibli als Lieblingsstudio bekommt Pitch Perfect, Pretty Woman und Ghibli-Filme.
    - Kein markierter Film erscheint.
    - Mag ich klappt die Karte ein. Rückgängig stellt sie wieder her und nimmt die Markierung zurück.
    - Der Stern aufs Poster funktioniert.
    - „Mehr Vorschläge“ bringt keine doppelten Filme.
    - Ein leeres Profil zeigt einen Hinweis auf „Geschmack“.
    - Geprüft bei 375 px und 1280 px, ohne Konsolenfehler.
  - Noch offen für Schritt 7: Die drei Knöpfe Überrasch mich, Gruppenabend und Kinderfilme kommen oben auf diese Seite.
- [x] **Schritt 6 – Merkliste** (11.11.2026, Version 0.5.0):
  - `watchlist.js`: alle Filme mit `want`, neueste zuerst, mit Jahr, Laufzeit und Inhalt in der Profilsprache.
  - Knöpfe: Gesehen, Mag ich, Mag ich nicht und Entfernen. Ein Tipp aufs Poster macht den Film zum ★ Lieblingsfilm. Zu jedem Knopf gibt es Rückgängig.
  - Getestet: englisches Profil zeigt englische Titel, obwohl beim Merken deutsche gespeichert wurden. „Mag ich“ nimmt den Film heraus und setzt ihn auf liked, Rückgängig setzt ihn zurück auf want. Entfernen und Stern funktionieren, die leere Liste zeigt einen Hinweis. Keine Konsolenfehler.
- [x] **Schritt 7 – Überrasch mich** (11.11.2026, Version 0.6.0):
  - `surprise.js` (Kern des Geschmacks, fremdes Ziel, 6 Lockerungsstufen, höchstens 15 Abfragen) und `sneak.js` (Seite mit rotem Vorhang, Aufdecken, fünf Rückmeldungen, Stern, Anderen Film).
  - Getestet mit einem Science-Fiction-Profil:
    - 30 Klicks ergaben 30 verschiedene Filme, keiner war markiert. Darunter Western, Dokus, Komödien der 50er, Filme aus Iran, Italien und Japan, alle mit Note ab 7,0.
    - Nach dem Neuladen kam keiner der 30 wieder.
    - Eine Rückmeldung wechselt den Film nicht, ein zweiter Tipp nimmt sie zurück.
    - Fremde Schrift im Titel (z. B. Persisch) wird durch den englischen Titel ersetzt.
- [x] **Geschmack verfeinert** (11.11.2026, Version 0.7.0):
  - Personen, Studios und Themen in Stufen: ★ Liebe, ♥ Gern, nochmal tippen = egal.
  - Neuer Reiter „Themen“ mit 39 Themen (z. B. Underdog, Zeitreise, Witzig & schlagfertig, Gespräche & Dialoge). Kameraführung gibt es bei TMDB nicht als Stichwort.
  - „Aus deinen Filmen“ zählt jetzt Regie und Hauptrollen aller gemochten Filme (★ doppelt).
  - Neue Studios: Amazon MGM, Netflix, Sony, Apple, MGM, New Line, 20th Century, Bad Robot, Skydance, Toei, Pathé, UFA, Babelsberg u. a. (54 insgesamt).
  - Filmliste zeigt zuerst Filme der bewerteten Personen, Studios und Themen, dann den Rest.
  - Vorschläge: Punkte nach Stufe, ★-Quellen dürfen bis zu 6 von 20 Plätzen belegen. Worker kennt jetzt Stichwort-Adressen.
- [x] **Schritt 7b – Gruppenabend** (11.11.2026, Version 0.8.0):
  - Eigene Seite `#/gruppe`, erreichbar über die Knöpfe oben auf „Vorschläge“ (🎭 Überrasch mich · 🍿 Gruppenabend).
  - Regeln: lockeres Genre, höchstens 130 Min., Note ab 6,8 und 1000 Stimmen, Thriller/Krimi nur mit Komödie, Horror und Krieg nur per Schalter. Alter: egal · ab 12 · ab 16 (FSK, sonst US-Freigabe, neu in `age.js`).
  - Kandidaten: eigene Vorschläge, beliebte Filme mit lockeren Genres, danach schon gemochte Filme mit „Kennst du schon – hat dir gefallen“. Quellen werden abgewechselt.
  - Knöpfe: Den schauen wir (→ Gesehen, danach Mag ich / Mag ich nicht / Später), Schon gesehen (Mag ich bleibt erhalten), Anderer Vorschlag.
  - Geprüft: Regeln eingehalten, zwei Profile bekommen verschiedene Filme, „ab 12“ zeigt nur FSK 0/6/12, 375 px ohne Querscrollen.
- [x] **Schritt 7c – Kinderfilme** (11.11.2026, Version 0.9.0):
  - Seite `#/kinder`, dritter Knopf 🧸 oben auf „Vorschläge“. Altersstufe ab 0 · ab 6 · ab 12, jedes Profil merkt sich die Wahl.
  - Familie/Animation/Abenteuer, Note ab 6,5, ab 300 Stimmen. Jeder Film wird einzeln geprüft: strengste deutsche FSK, sonst US-Freigabe.
  - Rangfolge nach Note und Beliebtheit, kleiner Vorrang für Lieblingsstudios. Gesehene stehen hinten mit „Schon gesehen“. „Mag ich nicht“ und „Kein Interesse“ fallen raus.
  - Geprüft: je 20 Filme bei ab 0, 6, 12 – alle mit passender Freigabe. „Mehr laden“ bringt 20 weitere.
- [x] **Schritt 8 – Über-Seite, README, Abnahme** (11.11.2026, Version 1.0.0):
  - Über-Seite: TMDB-Hinweis mit Link, QR-Code (`node scripts/make-qr.js`), „Link teilen“, Abschnitt „Deine Daten“.
  - **Erledigt (13.11.2026, 1.8.1):** Das offizielle TMDB-Logo liegt jetzt als `docs/img/tmdb.svg` im Projekt.
  - README fertig: Bedienung, Aufbau, neue Version veröffentlichen, Worker, Schlüssel.
  - Abnahme am Rechner geprüft: Link und lokal, zwei Profile → verschiedene Vorschläge, Deutsch/Englisch, 30× Überrasch mich, keine gesehenen Filme in Vorschlägen, Gruppenabend-Regeln, Kinder-Freigaben, Speichern nach Neuladen, Sichern/Laden, 375 px ohne Querscrollen, check-secrets, Worker lehnt fremde Herkunft und fremde Adressen ab (403).
- [x] **Trailer und „Heute Lust auf …“** (12.11.2026, Version 1.1.0):
  - Knopf „▶ Trailer“ auf allen Filmkarten (Vorschläge, Merkliste, Überrasch mich, Gruppenabend, Kinderfilme). Öffnet ein Fenster mit eingebettetem YouTube-Trailer (youtube-nocookie, erst beim Tippen geladen), Profilsprache vor Englisch. Ohne Trailer kommt eine kurze Meldung. Neu: `trailer.js`. Über-Seite nennt YouTube.
  - Vorschläge: Auswahl „Heute Lust auf …“ mit allen 39 Themen (Lieblingsthemen oben). Liefert Filme zum Thema, sortiert nach Geschmack; Filme aus den eigenen Vorschlägen zuerst. Gilt, solange die App offen ist.
- [x] **„Aus welcher Zeit?“** (12.11.2026, Version 1.2.0):
  - Zweite Auswahl bei Vorschlägen: Ganz neu (12 Monate), Letzte 3 Jahre, 2020er … 1970er, Klassiker vor 1970. Kombinierbar mit dem Thema.
  - Eigene TMDB-Abfragen im Zeitraum (`computeFiltered` in recommend.js, ersetzt `computeTheme`): Lieblingsgenres bzw. Thema, Filmlisten der Lieblingspersonen (nur echte Regie / Hauptrolle), Lieblingsstudios, eigene Vorschläge aus dem Zeitraum. Bei „neu“ reichen 30 Stimmen, sortiert nach Beliebtheit.
- [x] **Lieblingsfilm** (12.11.2026, Version 1.3.0):
  - Vierter Knopf „★ Lieblingsfilm“ oben auf „Vorschläge“, Seite `#/liebling` (`rewatch.js`). Zeigt einen deiner ★-Filme groß mit Trailer; „Anderer Lieblingsfilm“ und „Den schaue ich“.
  - Filme, die dort am längsten nicht kamen, zuerst (Feld `rewatchShown` im Profil, wird beim Laden einer Sicherung zusammengeführt). Ohne ★-Filme nimmt sie ♥-Filme.
- [x] **Wischen zwischen Tabs** (12.11.2026, Version 1.3.1):
  - Vorher sprang das Wischen durch den Browser-Verlauf (Zurück/Vor), nicht durch die Tabs. Jetzt: nach links wischen = nächster Tab, nach rechts = vorheriger (Vorschläge → Überrasch mich → Geschmack → Merkliste → Profil). Die 28 px am Rand bleiben dem Browser.
  - Tab-Wechsel ersetzen den Verlaufseintrag, statt neue anzulegen.
- [x] **Aufgeräumt** (12.11.2026, Version 1.3.2): Wischen wieder entfernt (Wunsch: nur Reiter antippen). „Überrasch mich“ gibt es nur noch als eigenen Reiter, oben auf „Vorschläge“ stehen Gruppenabend, Kinderfilme, Lieblingsfilm.
- [x] **Laufzeit überall** (12.11.2026, Version 1.4.0): Vorschläge, Geschmack und Kinderfilme zeigen jetzt die Laufzeit („· 112 Min.“). Sie wird erst geladen, wenn die Karte fast sichtbar ist (`runtime.js`, eine Detail-Abfrage pro Film, dieselbe wie bei der Merkliste).
- [x] **Serien S1 – Grundlage, Geschmack, Merkliste** (12.11.2026, Version 1.5.0), Plan in PLAN.md Abschnitt 7:
  - Umschalter **Filme · Serien** oben, pro Profil gemerkt (`settings.media`). Seiten, die es für Serien noch nicht gibt, zeigen „in Kürze“.
  - Worker kennt jetzt die Serien-Adressen (discover/tv, tv/{id} mit Empfehlungen, Stichwörtern, Besetzung, Freigaben, person/{id}/tv_credits, search/tv, network/{id}).
  - Neu: `media.js` (Unterschiede Film/Serie), `seeds-tv.js` (212 Serien, 55 Serien-Personen, 48 Sender; neu bauen mit `node scripts/make-seeds-tv.js`, Zwischenstand in `.seed-cache-tv.json`). `tmdb.js` ergänzt bei Serien Titel und Datum, damit der vorhandene Code sie anzeigt.
  - Profil bekommt `shows`, `networks`, `passedTv`, `surpriseShownTv`, `surpriseLastGenreTv`, `rewatchShownTv`. Alte Profile werden beim Laden ergänzt, Sicherungen führen die neuen Felder mit zusammen.
  - Geschmack bei Serien: Personen · Sender · Themen · Serien. Knopf **⏸ Angefangen** mit Auswahl „Will ich weiterschauen“ (`paused`) oder „Hat mich verloren“ (`dropped`). Länge „3 Staffeln · ca. 50 Min.“, Trailer, Suche in beiden Sprachen.
  - Merkliste bei Serien: oben „Weiterschauen“, darunter „Gemerkt“.
  - Geprüft: altes Profil ohne Serien-Felder lädt und behält seine Filme; alte Sicherung laden und mit Serien zusammenführen; „Haus des Geldes“ und „Money Heist“ finden dieselbe Serie; Sender bewerten; Trailer zu „Dark“; Filmvorschläge unverändert. 360, 375, 800 und 1280 px ohne Querscrollen, keine Konsolenfehler. Testprofile gelöscht.
  - Bei 768–1099 px stehen oben nur noch Symbol, Umschalter und Tab-Namen ohne Bildchen, sonst passt die Zeile nicht.
- [x] **Serien S2 – Vorschläge mit Brücke** (12.11.2026, Version 1.6.0):
  - `recommend.js` rechnet für Filme und Serien (`compute(profile, page, media)`). Bei Serien zählen zusätzlich Lieblingssender (+4/+2), Studios (+3/+1,5) und „Weiterschauen“ (wie Merken). „Hat mich verloren“ zählt bei der Genre-Neigung halb negativ. Grenzen in `config.js` unter `RECOMMEND_TV`.
  - **Brücke** (`BRIDGE` in config.js): bis zu 6 ★/♥-Titel der anderen Seite bringen gleichen Titel/Stoff (+6), gleiche Stichwörter mit passendem Genre (+3/+2) und ihre Regie/Hauptrollen (+4). Begründung z. B. „Weil du den Film „Fargo“ liebst“, „Mit Steve Buscemi aus „Fargo““, „Von Vince Gilligan („Breaking Bad“)“.
  - „Heute Lust auf“ und „Aus welcher Zeit“ auch für Serien (Klassiker bei Serien: vor 1990). Kinderserien erscheinen in den normalen Vorschlägen nur, wenn man selbst welche mag.
  - Titel in fremder Schrift (z. B. Koreanisch) werden durch den englischen ersetzt.
  - Geprüft: Profil nur mit Filmen (Fargo, Arrival ★) bekommt die Serie „Fargo“ und Serien mit Buscemi/McDormand. Profil nur mit Serien (Breaking Bad, Dark ★) bekommt „El Camino“, Filme von Baran bo Odar, Pulp Fiction, Zodiac. Serien-Vorschläge: Better Call Saul, The Penguin, FROM … Keine markierten Titel, „Mehr“ ohne doppelte, Angefangen + Rückgängig, Filter Zeitreise + 2010er. 375 und 1280 px, keine Konsolenfehler. Testprofile gelöscht.
- [x] **Serien S3 – Überrasch mich, Gruppenabend, Kinderserien, Lieblingsserie** (12.11.2026, Version 1.7.0):
  - Alle Seiten gibt es jetzt auch für Serien, der Hinweis „in Kürze“ ist weg. Seitentitel wechseln mit (Kinderfilme/Kinderserien, Lieblingsfilm/Lieblingsserie).
  - **Überrasch mich:** verdeckt mit Genre · Jahrzehnt · Staffelzahl, eigene Merkliste der schon gezeigten (`surpriseShownTv`), Grenzen in `SURPRISE_TV`.
  - **Gruppenabend:** eigene Regeln `GROUP_TV` (leichte Genres, Krimi nur mit Komödie, Folge höchstens 60 Min., Note ab 7,3). Statt „+ Horror/+ Krieg“ gibt es „+ Krieg & Politik“. Einstellungen getrennt von den Filmen (`settings.groupTv`). „Die schauen wir“ hakt die Serie nicht als gesehen ab. „Hat mich verloren“ kommt nicht, „Weiterschauen“ schon.
  - **Kinderserien:** `KIDS_TV`, deutsche Freigabe, sonst US-TV-Freigabe (TV-Y … TV-14); jede Serie wird einzeln geprüft. Lieblingssender bekommen kleinen Vorrang.
  - **Lieblingsserie:** zieht aus den ★-Serien (`rewatchShownTv`).
  - Geprüft (375 und 1280 px): 20× Überrasch mich = 20 verschiedene Serien; Angefangen → Weiterschauen gespeichert; Gruppenabend ab 12 nur Serien bis 12, Folgen ≤ 60 Min.; Kinderserien ab 0 und ab 6 ohne zu hohe Freigabe; Lieblingsserie wechselt zwischen den ★-Serien. Filmseiten danach unverändert. Keine Konsolenfehler. Testprofil gelöscht.
  - Bekannt: Die Folgenlänge kommt bei manchen Serien von der letzten Folge und kann abweichen (z. B. Friends „ca. 48 Min.“ wegen Doppelfolge zum Schluss).
- [x] **Bücher B1 – Grundlage, Geschmack, Leseliste** (13.11.2026, Version 1.12.0), Plan in PLAN.md Abschnitt 8:
  - **Datenquelle Open Library** (frei, ohne Schlüssel). Geprüft mit `node scripts/check-books.js`: Open Library 16 von 17 Prüfungen vollständig, Google Books ohne Schlüssel 0 (Tageslimit für alle schon aufgebraucht). ISBN: 8 von 8 gefunden; englische und deutsche Ausgabe = dasselbe Werk (1984, Harry Potter, Der Vorleser). Ausnahme: „Der Hundertjährige“ ist bei Open Library mehrfach angelegt – die Startliste merkt sich solche Doppelten (`alt`), dann zählen sie als ein Buch.
  - **Worker:** Adressen `/ol/…` → openlibrary.org sind in `worker/index.js` eingetragen, aber **noch nicht hochgeladen** (Hochladen durfte die Sitzung nicht). Bis dahin holt die App die Buchdaten direkt bei Open Library (erlaubt, ohne Schlüssel); nach dem Hochladen nimmt sie automatisch den Worker. Hochladen: `NODE_USE_SYSTEM_CA=1 npx wrangler deploy --config worker/wrangler.toml`.
  - Umschalter **Filme · Serien · Bücher**; Reiter „Merkliste“ heißt bei Büchern „Leseliste“. Profil: „Bücher lese ich auf: Englisch | Deutsch“ (`settings.bookLang`, Standard Englisch).
  - Neu: `books.js` (Abfragen, ISBN prüfen, Ausgabe in Lesesprache), `book-genres.js` (16 Genres aus Schlagwörtern), `seeds-books.js` (189 Bücher, 70 Autor·innen, 40 Film/Serie→Buch-Paare; neu bauen mit `node scripts/make-seeds-books.js`, Zwischenstand `.seed-cache-books.json`), `book-taste.js`, `book-list.js`, `book-extra.js` (Beschreibung beim Aufklappen, „🎬 Verfilmt als …“), `bridge-books.js`. Themen haben jetzt Buch-Schlagwörter (`b`, `bEx` in themes.js).
  - Profil bekommt `books`, `authors`, `bookGenres`, `passedBook`, `surpriseShownBook`, `surpriseLastGenreBook`, `rewatchShownBook`, `scanMissing`. Alte Profile/Sicherungen werden ergänzt, Zusammenführen nimmt die neuen Felder mit.
  - Geschmack bei Büchern: Autor·innen (mit „Aus deinen Büchern“ und „Aus deinen Filmen und Serien“ – z. B. Shining → Stephen King, Forrest Gump → Winston Groom), Themen (dieselben wie bei Filmen), Genres, Bücher (Gelesen · Mag ich · Mag ich nicht · Merken · Abgebrochen, ★ aufs Cover), Suche nach Titel, Autor·in oder ISBN.
  - Geprüft: altes Profil ohne Buch-Felder lädt und behält Filme; alte Sicherung als neues Profil und zusammengeführt; Sicherung mit Büchern in Profil ohne Bücher zusammengeführt. Deutsche ISBN des Hundertjährigen findet dasselbe Buch wie die englische Startliste. Leseliste mit Beschreibung und „Verfilmt als Der Unsichtbare“. Deutsch als Lesesprache zeigt „Es“, „Shining“. Filmvorschläge unverändert. 360, 375, 780, 1120 und 1280 px ohne Querscrollen. Testprofile gelöscht.
  - Bekannt: Open Library ordnet Genres manchmal grob zu (z. B. „In 80 Tagen um die Welt“ auch als Thriller); Beschreibungen fast nur Englisch.
- [x] **FLIMMO erklärt** (13.11.2026, Version 1.11.1): Auf der Kinderseite aufklappbar „Was ist FLIMMO?“ (kostenloser Elternratgeber, sagt was wirklich passt – FSK nur was erlaubt ist); im Rundgang (Schritt „Noch mehr“) ein Satz dazu.
- [x] **FLIMMO-Link** (13.11.2026, Version 1.11.0): Jede Karte bei Kinderfilmen/Kinderserien hat „Bei FLIMMO nachsehen ↗“ (öffnet `flimmo.de/?q=<Titel>` in neuem Tab). Gesucht wird mit dem deutschen Haupttitel (ohne Untertitel – mit findet FLIMMO nichts); dafür lädt die Altersprüfung die Details jetzt auf Deutsch. FLIMMO hat keine offene Schnittstelle, deshalb nur ein Link.
- [x] **„Gesehen“ leuchtet mit** (13.11.2026, Version 1.10.1): Bei „Mag ich“, „Mag ich nicht“ und ★ leuchtet „Gesehen“ mit (Anzeige; gespeichert bleibt ein Status). Gemeinsame Regel `pressed()` jetzt in media.js statt dreimal. Tipp auf ein mitleuchtendes „Gesehen“ nimmt die Markierung ganz zurück.
- [x] **Nach oben, Hinweis, Rundgang** (13.11.2026, Version 1.10.0): Runder Knopf „Nach oben“ unten rechts (erscheint nach etwas Scrollen, auf allen Seiten); nochmal auf den aktiven Reiter tippen springt ebenfalls nach oben. Unter „Geschmack“ ab 40 Markierungen (je Filme/Serien, `TASTE_HINT_AFTER` in config.js) eine Karte „Mach bei den Vorschlägen weiter“, wegtippbar (`settings.hintDone`). Neue Profile bekommen nach dem Anlegen einen Rundgang mit 5 Karten (`tour.js`, `settings.tourDone`); bestehende und geladene Profile nicht. Unter „Profil“: „Rundgang ansehen“. Geprüft bei 375 px und am Laptop, keine Konsolenfehler, Testprofile gelöscht.
- [x] **Thema Journalismus & Politik genauer** (13.11.2026, Version 1.9.2): Statt des breiten Stichworts „politics“ jetzt gezielte (Journalismus, investigativ, Polit-Drama/-Thriller/-Satire, Wahl, Weißes Haus; bei Serien zusätzlich Journalist, Zeitung, Reporter, Politiker, Präsident, Parlament, ohne Zeichentrick). Neu in `themes.js`: `kTv`/`noTv` und `themeQuery()`, genutzt in recommend.js und taste.js. Serien jetzt z. B. The Wire, The Newsroom, Borgen, Homeland, Designated Survivor statt Anime und Palast-Dramen; Filme ohne Ben Hur. Außerdem: Begründung unter „Heute Lust auf“ nennt das Thema nicht mehr doppelt.
- [x] **Themen-Beispiele** (13.11.2026, Version 1.9.1): Die Beispiele auf den Themen-Kacheln passen jetzt zu Filme/Serien und zur Profilsprache (`themes.js`: `ex`/`exEn` für Filme, `tv`/`tvEn` für Serien, von Hand gewählt; automatisch von TMDB gezogene passten oft nicht). „Gespräche & Dialoge“ zeigt bei Serien „Bei Serien kaum eingetragen“. Geprüft mit englischem Profil: Kacheln, Vorschläge und Inhaltsangaben auf Englisch; 375 px ok. Aufgefallen: Das Thema „Journalismus & Politik“ bringt bei Serien teils Palast-Dramen und Anime (TMDB-Stichwort „politics“).
- [x] **Serien „Deutschland zuerst“** (13.11.2026, Version 1.9.0): Startliste von 212 auf 299 Serien erweitert, vor allem um Serien, die in Deutschland viele kennen (Scrubs, Dr. House, King of Queens, Navy CIS, Pastewka, Club der roten Bänder …). 67 eher internationale Serien (z. B. Shtisel, Panchayat, Kaamelott) tragen `x: 1` und kommen unter „Geschmack“ ganz ans Ende, ebenso TMDB-Serien ohne deutsche Inhaltsangabe. Jahrgang-Abfrage bewusst nicht gebaut. Geprüft: Profil mit allen bekannten Startserien erledigt bekommt danach bekannte TMDB-Serien, keine doppelten; 375 px ohne Querscrollen, keine Konsolenfehler.
- [x] **TMDB-Logo** (13.11.2026, Version 1.8.1): fehlendes Logo `docs/img/tmdb.svg` (offizielles „blue short“ von themoviedb.org) auf „Über diese App“ ergänzt.
- [x] **Serien S4 – Abschluss** (12.11.2026, Version 1.8.0): „Über diese App“ und README erwähnen Serien, den Umschalter und „Angefangen“. Live geprüft: Filme und Serien auf allen Seiten.
- [ ] **Noch von dir am echten Handy:** Serien ausprobieren – Umschalter oben, ein paar Serien markieren (auch ⏸ Angefangen), Vorschläge, Überrasch mich, Gruppenabend, Kinderserien, Lieblingsserie, Merkliste „Weiterschauen“.
- [ ] **Noch von dir am echten Handy:** iPhone (Home-Bildschirm-Hinweis, Umzug Safari → Home-Bildschirm-App, Teilen-Menü beim Sichern) und ein Android-Handy, alles ohne Zoomen.

## Hinweise

- Die Browser-Vorschau nutzt den Eintrag `film-app` (Port 5500).
- **Virenschutz:** AVG prüft verschlüsselte Verbindungen mit. Deshalb muss vor `wrangler`-Befehlen `NODE_USE_SYSTEM_CA=1` gesetzt werden. In PowerShell `npx.cmd` statt `npx` verwenden, weil die Ausführung von Skripten gesperrt ist.
- **Worker aktualisieren:** `NODE_USE_SYSTEM_CA=1 npx wrangler deploy --config worker/wrangler.toml`. Das Secret bleibt dabei erhalten.
- **Missbrauchsschutz:** höchstens 300 Anfragen pro Minute und Gerät (bzw. WLAN). `check-tmdb.js` wartet automatisch, wenn das Limit erreicht ist.
- **Neue Version:**
  - Vor jedem Hochladen `node scripts/set-version.js X.Y.Z` ausführen. Das setzt die Nummer in `config.js`, `version.json`, `index.html`, allen Importen und `package.json`.
  - Die App vergleicht beim Öffnen `version.json` mit ihrer eigenen Nummer und lädt bei Abweichung selbst neu. Ohne neue Nummer bekommen Handys das Update erst nach etwa 10 Minuten oder noch später.
- **Hochladen:** `git push`. Die Anmeldung bei GitHub ist gespeichert, und der Hook prüft vorher auf Schlüssel.

