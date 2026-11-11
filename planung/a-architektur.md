# a) Architektur-Vorschlag

## 1. Technik
- Backend: Node.js 24 + Express (einzige Laufzeit-Abhängigkeit). Eingebautes `fetch`, `process.loadEnvFile()` für `.env` – kein dotenv/axios.
- Frontend: reines HTML/CSS/JavaScript (ES-Module) aus `public/`, kein Build-Schritt. Mobile-first-CSS (16 px Schrift, ≥ 44 px Buttons, `grid auto-fill`).
- Struktur: `server.js`, `lib/tmdb.js` (Client + Cache), `lib/store.js`, `lib/recommend.js`, `public/`.
- Verworfen: React+Vite (Build-Schritt, viele Abhängigkeiten); Next.js (zu viel unsichtbare Magie).

## 2. Datenhaltung
- `data/profiles.json`: alle Profile `{id, name, language, movies: {"<tmdbId>": "seen|liked|disliked|want|noInterest"}, favorites: {people, companies}, watchlist, feedbackLog}`. Nur TMDB-IDs. Atomar schreiben (.tmp + rename), Backup `profiles.bak.json`, Schreib-Warteschlange (Promise-Kette).
- Verworfen: SQLite (better-sqlite3 evtl. Compiler nötig, node:sqlite noch experimentell).
- TMDB-Cache: Map mit TTL im Speicher + `data/cache/*.json` auf Platte; Schlüssel Pfad+Parameter+Sprache; TTL Details 7 Tage, Listen 1 Tag, Suche 1 Std.; LRU-Grenze.
- Rate-Limit: max. 8 parallele Anfragen, 429 mit Retry-After, gleiche laufende Anfragen zusammenlegen.
- Poster direkt von image.tmdb.org.

## 3. API-Key-Schutz
- Key nur in `.env`, nur in `lib/tmdb.js`. Browser spricht nur mit `/api/...`; nur freigegebene Endpunkte (kein offener Proxy). `.gitignore`: `.env`, `data/`, `node_modules/`. `.env.example` mit Platzhalter. Fehlermeldungen ohne Key.
- Verworfen: TMDB direkt aus dem Browser (Key sichtbar).

## 4. Clubraum
- Empfehlung: Laptop als Server im WLAN, jeder am eigenen Handy; gemeinsames Gerät geht trotzdem (localhost).
- Server auf `0.0.0.0`, LAN-Adresse wird beim Start und auf „Über“ angezeigt. Windows-Firewall: nur „Private Netzwerke“ erlauben, WLAN als „Privat“. Wechselnde IP: bei jedem Start anzeigen, optional feste IP im Router. Club-WLAN mit Geräte-Isolation: Windows-Mobile-Hotspot. Laptop darf nicht schlafen.
- Verworfen: Cloud-Hosting (Konto, Key auf fremdem Server, ohne Login öffentlich); mDNS `.local` (unzuverlässig Windows↔iPhone).

## 5. Start mit einem Befehl
- `npm start` → `prestart`: `npm install` + `scripts/setup.js` (Node-Version prüfen, `data/` anlegen, `.env` aus Vorlage anlegen und mit deutschem Hinweis abbrechen, Key mit `/configuration` testen) → Server startet, zeigt URLs.
- Verworfen: Docker (unter Windows 10 Home zu aufwendig).

## 6. TMDB-Pflichten & Sprache
- „Über“-Seite + Fußzeile: TMDB-Logo (SVG lokal) + „This product uses the TMDB API but is not endorsed or certified by TMDB.“ + Link.
- Profil-ID bei jeder Anfrage → Server setzt `language=de-DE`/`en-US`; Sprache im Cache-Schlüssel.
- Poster je Sprache: `/movie/{id}?append_to_response=images,credits&include_image_language=de,null` bzw. `en,null` – bevorzugt Sprachposter, dann neutral, dann `poster_path`. Im Raster zuerst `poster_path`, dann nachladen.
- Suche: `/search/movie` parallel de-DE + en-US, nach ID zusammenführen; plus `/search/person`, `/search/company`.
- Studios: kuratierte Liste mit Indie-Studios in `lib/seeds.js` (TMDB hat keinen „populäre Studios“-Endpunkt).

## 7. Bauschritte
1. Gerüst. 2. tmdb.js + /api/health. 3. store.js + Profil-API + Profilwahl. 4. Film-Raster, Personen/Studios, Suche. 5. Vorschlags-Engine. 6. Rückmeldungen + Merkliste. 7. Überrasch mich (Discover mit fehlenden Genres/Ländern/Jahrzehnten, vote_average ≥ 7, vote_count ≥ 500, pro Sitzung gezeigte merken, verdeckt). 8. Über-Seite, iPhone-Feinschliff, README, Abnahme.
