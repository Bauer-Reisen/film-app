# Prompt: Serien in die Film-App einbauen

> Diesen Text in eine neue Code-Session im Ordner `Documents\Film-App` kopieren.
> Erst starten, wenn keine andere Session gerade an der App baut.

---

Ich habe eine fertige Web-App „Was schaue ich als Nächstes?“ für Filme (dieser Ordner, live unter https://bauer-reisen.github.io/film-app/). Ich möchte jetzt **Serien in dieselbe App** einbauen – nicht als zweite App.

**Lies zuerst:** `STAND.md` (was es gibt und wie man veröffentlicht), `PLAN.md` (Aufbau, Datenmodell, Empfehlungslogik), `README.md`, dann `docs/js/config.js`, `store.js`, `recommend.js`, `taste.js`, `suggest.js`, `app.js`.

## Was ich will
- Oben in der App ein Umschalter **Filme · Serien**. Die Reiter unten bleiben gleich (Vorschläge, Überrasch mich, Geschmack, Merkliste, Profil) und zeigen dann Filme oder Serien. Jedes Profil merkt sich die letzte Wahl.
- **Dasselbe Profil** für beides: Lieblingspersonen, Themen und Studios gelten auch für Serien. Studios heißen bei Serien Sender/Streamingdienste (z. B. HBO, Netflix, AMC, BBC) – als eigene Liste im Reiter Geschmack.
- Markieren wie bei Filmen: Gesehen · Mag ich · Mag ich nicht · Merken, ★ per Tipp aufs Poster. Zusätzlich bei Serien: **„Abgebrochen“** (angefangen, nicht zu Ende geschaut) – zählt leicht negativ.
- Vorschläge mit Begründung, „Heute Lust auf …“ (Themen), „Aus welcher Zeit“, Trailer, Laufzeit (bei Serien: Staffeln und Folgenlänge, z. B. „3 Staffeln · ca. 50 Min.“), Lieblingsserie, Überrasch mich, Gruppenabend und Kinderserien – alles, was es bei Filmen gibt, sinnvoll übertragen.
- **Brücke zwischen Filmen und Serien:** Wer Filme mag, bekommt passende Serien vorgeschlagen und umgekehrt (gleiche Personen, gleiche Themen, ähnliche Genres). Begründung z. B. „Weil du den Film ‚Fargo‘ liebst“.
- Startliste für Geschmack: ca. 150 bekannte Serien quer durch Länder und Jahrzehnte (wie `scripts/make-seeds.js` für Filme).

## Technik und Regeln (wichtig)
- Datenquelle bleibt **TMDB** über den vorhandenen Cloudflare Worker. Für Serien neue Adressen in die Erlaubnis-Liste in `worker/index.js` aufnehmen (z. B. `discover/tv`, `tv/{id}`, `tv/{id}/recommendations`, `tv/{id}/keywords`, `tv/{id}/aggregate_credits`, `person/{id}/tv_credits`, `search/tv`), danach Worker neu hochladen (`NODE_USE_SYSTEM_CA=1 npx wrangler deploy --config worker/wrangler.toml`).
- Der TMDB-Schlüssel steht **nie** im Code oder im Repository. Frag mich nie danach.
- Bestehende Profile und Sicherungsdateien müssen weiter funktionieren (Datenmodell erweitern, nicht umbauen; Laden alter Sicherungen testen).
- Vor jedem Hochladen `node scripts/set-version.js X.Y.Z` – alle Importe brauchen dieselbe Version, sonst gehen Markierungen verloren. Der Hook vor `git push` prüft das.
- Am iPhone ohne Zoomen bedienbar (375 px), keine Streaming-Anbieter-Anzeige, kein Login.

## Wie wir vorgehen
1. Zuerst `PLAN.md` um einen Abschnitt „Serien“ erweitern (Datenmodell, Punkte, Seiten, Bauschritte) und mir eine kurze Zusammenfassung zeigen. **Auf mein OK warten.**
2. Danach alle Bauschritte am Stück durchbauen, ohne zwischendurch zu fragen. Nach jedem Schritt selbst im Browser prüfen (Handy-Format 375 px und Laptop), mit Testprofilen, die danach wieder gelöscht werden. Nach jedem Schritt `STAND.md` aktualisieren, hochladen und live prüfen.
3. Am Ende: was ich am echten Handy testen soll.

Antworte auf Deutsch, kurz und ohne Fachchinesisch.
