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
- [ ] Schritt 7b Gruppenabend · 7c Kinderfilme (dazu oben auf „Vorschläge“ die drei Knöpfe)
- [ ] Schritt 8 – Über-Seite, README, Abnahme

## Hinweise

- Die Browser-Vorschau nutzt den Eintrag `film-app` (Port 5500).
- **Virenschutz:** AVG prüft verschlüsselte Verbindungen mit. Deshalb muss vor `wrangler`-Befehlen `NODE_USE_SYSTEM_CA=1` gesetzt werden. In PowerShell `npx.cmd` statt `npx` verwenden, weil die Ausführung von Skripten gesperrt ist.
- **Worker aktualisieren:** `NODE_USE_SYSTEM_CA=1 npx wrangler deploy --config worker/wrangler.toml`. Das Secret bleibt dabei erhalten.
- **Missbrauchsschutz:** höchstens 300 Anfragen pro Minute und Gerät (bzw. WLAN). `check-tmdb.js` wartet automatisch, wenn das Limit erreicht ist.
- **Neue Version:**
  - Vor jedem Hochladen `node scripts/set-version.js X.Y.Z` ausführen. Das setzt die Nummer in `config.js`, `version.json`, `index.html`, allen Importen und `package.json`.
  - Die App vergleicht beim Öffnen `version.json` mit ihrer eigenen Nummer und lädt bei Abweichung selbst neu. Ohne neue Nummer bekommen Handys das Update erst nach etwa 10 Minuten oder noch später.
- **Hochladen:** `git push`. Die Anmeldung bei GitHub ist gespeichert, und der Hook prüft vorher auf Schlüssel.

