# STAND – Film-App

Für eine neue Sitzung: zuerst diese Datei lesen, dann bei Bedarf [PLAN.md](PLAN.md) (Abschnitt 6 = Bauschritte).

Die Nutzerin kann nicht programmieren. Antworte auf Deutsch, knapp und ohne Fachjargon. Claude legt keine Konten an und gibt keine Passwörter oder Schlüssel ein.

## Bauschritte

- [x] **Phase 1 – Plan** (11.11.2026): PLAN.md, Fassung 2 mit GitHub Pages, Cloudflare Worker, Profilen pro Gerät, Gruppenabend und Kinderfilmen
- [x] **Schritt 1 – Gerüst** (11.11.2026): `npm start` zeigt lokal die leere App mit Tab-Leiste. Geprüft bei 375 px, 360 px und 1280 px. `check-secrets` hält einen Test-Schlüssel auf. Git ist eingerichtet, der Hook vor jedem Push ist aktiv.
- [x] **Schritt 0 – Nutzerin (11.11.2026):** TMDB-Konto anlegen und Lesetoken erzeugen, Cloudflare-Konto anlegen. GitHub-Konto ist schon vorhanden.
- [ ] **Schritt 2 – Veröffentlichen:**
  - `npx wrangler login`, das bestätigt die Nutzerin.
  - Secret `TMDB_TOKEN` trägt die Nutzerin im Dashboard ein.
  - Claude:
    - `npm run deploy-worker`
    - öffentliches Repo anlegen (nach OK), Pages auf `main` und `/docs` einstellen
    - Pages-Adresse in `worker/wrangler.toml` (`ALLOWED_ORIGINS`) eintragen
    - Worker-Adresse in `docs/js/config.js` (`WORKER_URL`) eintragen
    - `scripts/check-tmdb.js` schreiben und ausführen
- [ ] Schritt 3 – Profile
- [ ] Schritt 4 – Geschmack
- [ ] Schritt 5 – Vorschläge
- [ ] Schritt 6 – Merkliste
- [ ] Schritt 7 – Überrasch mich · 7b Gruppenabend · 7c Kinderfilme
- [ ] Schritt 8 – Über-Seite, README, Abnahme

## Hinweise

- Die Browser-Vorschau nutzt den Eintrag `film-app` (Port 5500).

