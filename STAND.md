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
  - **Offen:** Das offizielle TMDB-Logo fehlt noch, TMDB blockt das automatische Herunterladen. Bis dahin steht dort ein „TMDB“-Schild. Logo von themoviedb.org/about/logos-attribution als `docs/img/tmdb.svg` speichern, dann erscheint es von selbst.
  - README fertig: Bedienung, Aufbau, neue Version veröffentlichen, Worker, Schlüssel.
  - Abnahme am Rechner geprüft: Link und lokal, zwei Profile → verschiedene Vorschläge, Deutsch/Englisch, 30× Überrasch mich, keine gesehenen Filme in Vorschlägen, Gruppenabend-Regeln, Kinder-Freigaben, Speichern nach Neuladen, Sichern/Laden, 375 px ohne Querscrollen, check-secrets, Worker lehnt fremde Herkunft und fremde Adressen ab (403).
- [x] **Trailer und „Heute Lust auf …“** (12.11.2026, Version 1.1.0):
  - Knopf „▶ Trailer“ auf allen Filmkarten (Vorschläge, Merkliste, Überrasch mich, Gruppenabend, Kinderfilme). Öffnet ein Fenster mit eingebettetem YouTube-Trailer (youtube-nocookie, erst beim Tippen geladen), Profilsprache vor Englisch. Ohne Trailer kommt eine kurze Meldung. Neu: `trailer.js`. Über-Seite nennt YouTube.
  - Vorschläge: Auswahl „Heute Lust auf …“ mit allen 39 Themen (Lieblingsthemen oben). Liefert Filme zum Thema, sortiert nach Geschmack; Filme aus den eigenen Vorschlägen zuerst. Gilt, solange die App offen ist.
- [x] **„Aus welcher Zeit?“** (12.11.2026, Version 1.2.0):
  - Zweite Auswahl bei Vorschlägen: Ganz neu (12 Monate), Letzte 3 Jahre, 2020er … 1970er, Klassiker vor 1970. Kombinierbar mit dem Thema.
  - Eigene TMDB-Abfragen im Zeitraum (`computeFiltered` in recommend.js, ersetzt `computeTheme`): Lieblingsgenres bzw. Thema, Filmlisten der Lieblingspersonen (nur echte Regie / Hauptrolle), Lieblingsstudios, eigene Vorschläge aus dem Zeitraum. Bei „neu“ reichen 30 Stimmen, sortiert nach Beliebtheit.
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

