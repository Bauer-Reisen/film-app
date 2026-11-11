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
- [ ] Schritt 4 – Geschmack
- [ ] Schritt 5 – Vorschläge
- [ ] Schritt 6 – Merkliste
- [ ] Schritt 7 – Überrasch mich · 7b Gruppenabend · 7c Kinderfilme
- [ ] Schritt 8 – Über-Seite, README, Abnahme

## Hinweise

- Die Browser-Vorschau nutzt den Eintrag `film-app` (Port 5500).
- **Virenschutz:** AVG prüft verschlüsselte Verbindungen mit. Deshalb muss vor `wrangler`-Befehlen `NODE_USE_SYSTEM_CA=1` gesetzt werden. In PowerShell `npx.cmd` statt `npx` verwenden, weil die Ausführung von Skripten gesperrt ist.
- **Worker aktualisieren:** `NODE_USE_SYSTEM_CA=1 npx wrangler deploy --config worker/wrangler.toml`. Das Secret bleibt dabei erhalten.
- **Missbrauchsschutz:** höchstens 60 Anfragen pro Minute und Gerät. `check-tmdb.js` wartet automatisch, wenn das Limit erreicht ist.
- **Neue Version:**
  - Vor jedem Hochladen `node scripts/set-version.js X.Y.Z` ausführen. Das setzt die Nummer in `config.js`, `version.json`, `index.html`, allen Importen und `package.json`.
  - Die App vergleicht beim Öffnen `version.json` mit ihrer eigenen Nummer und lädt bei Abweichung selbst neu. Ohne neue Nummer bekommen Handys das Update erst nach etwa 10 Minuten oder noch später.
- **Hochladen:** `git push`. Die Anmeldung bei GitHub ist gespeichert, und der Hook prüft vorher auf Schlüssel.

