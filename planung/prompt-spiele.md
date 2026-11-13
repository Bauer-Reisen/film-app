# Prompt: Videospiele in die Film-App einbauen (schlanke Testversion)

> Für eine neue Code-Session im Ordner `Documents\Film-App`.
> Erst starten, wenn keine andere Session gerade an der App baut.

---

Ich habe eine fertige Web-App „Was schaue ich als Nächstes?“ für Filme, Serien und Bücher (dieser Ordner, live unter https://bauer-reisen.github.io/film-app/). Ich möchte jetzt **Videospiele als vierten Bereich** einbauen – zuerst als **schlanke Testversion**, die meine Freunde (Gamer) ausprobieren und bewerten. Ich selbst spiele nicht.

**Lies zuerst:** `STAND.md`, `PLAN.md`, `README.md`, dann `docs/js/config.js`, `media.js`, `store.js`, `recommend.js`, `themes.js`, `app.js` und schau dir an, wie Serien und Bücher eingebaut wurden – genauso sauber soll es bei Spielen werden.

## Was in die Testversion gehört
- Umschalter oben: **Filme · Serien · Bücher · Spiele**. Im Profil kann man Bereiche ausblenden, die man nicht nutzt (wer keine Spiele will, sieht den Umschalter wie bisher). Das muss bei 375 px Breite gut aussehen.
- **Plattformen** (sehr wichtig): einmal wählen, worauf man spielt – PC, PlayStation 5/4, Xbox Series/One, Nintendo Switch, Handy. Mehrfachauswahl, pro Profil gespeichert. Vorschläge zeigen nur Spiele, die dort laufen. Ohne Auswahl fragt die App beim ersten Öffnen danach.
- **Geschmack:** Spiele markieren (Gespielt · Mag ich · Mag ich nicht · Merken, ★ per Tipp aufs Cover, dazu „Abgebrochen“ wie bei Serien), Lieblingsstudios/-entwickler mit ★ Liebe / ♥ Gern, dieselben **Themen** wie bei Filmen, Genres. Startliste mit ca. 150 bekannten Spielen quer durch Genres, Jahre und Plattformen. Suche nach Titel.
- **Vorschläge** mit Begründung, „Heute Lust auf …“ (Themen), „Aus welcher Zeit“, Trailer (falls die Datenquelle Videos liefert), **Spielzeit statt Laufzeit** (z. B. „ca. 12 Std.“), Plattform-Hinweis.
- **Merkliste.**
- **Brücke zu Filmen, Serien und Büchern:** gemeinsame Themen zählen in alle Richtungen; gleiche Welten verbinden („Das Spiel zur Serie“, „Die Serie zum Spiel“, „Das Buch dazu“ – z. B. The Witcher, The Last of Us, Dune, Resident Evil, Herr der Ringe).
- **Noch nicht** in der Testversion: Überrasch mich, Gruppenabend, Kinderspiele, Lieblingsspiel. Die kommen später, wenn das Feedback gut ist. Im Plan als „später“ notieren.

## App bleibt schnell
- Die Spiele-Dateien werden **erst geladen, wenn jemand auf „Spiele“ umschaltet** (dynamisch nachladen). Wer nur Filme nutzt, lädt nichts zusätzlich. Vorher und nachher kurz messen und mir sagen, ob sich der Start verändert hat.

## Datenquelle und Sicherheit (wichtig)
- Vorgeschlagen: **IGDB** (große Spiele-Datenbank, kostenlos, braucht ein Twitch-Entwicklerkonto). Zuerst mit einem kleinen Prüfskript klären: Wie gut sind Themen, ähnliche Spiele, Spielzeit, Plattformen, Altersfreigaben, Cover, Videos, deutsche Titel? Ergebnis kurz erklären. Gibt es eine klar bessere freie Quelle, sag es mir.
- **Das Twitch-Konto lege ich selbst an.** Erkläre mir jeden Klick einfach. Die Zugangsdaten (Client-ID und Secret) trage ich selbst im Cloudflare-Dashboard als Secrets beim vorhandenen Worker ein. **Frag mich nie nach den Werten**, sie stehen nie im Code oder Repository.
- Der Worker holt sich mit diesen Daten selbst den Zugangsschlüssel bei Twitch, merkt ihn sich bis zum Ablauf und fragt IGDB. Die App schickt nur feste, erlaubte Anfragearten (z. B. „Spiele suchen“, „Spiel-Details“, „ähnliche Spiele“, „Spiele zu Themen/Plattformen“) – **keine frei formulierten Abfragen** von außen. Alles andere lehnt der Worker ab, wie bisher.
- Worker hochladen mit `NODE_USE_SYSTEM_CA=1 npx wrangler deploy --config worker/wrangler.toml` (der Virenscanner braucht das). Falls das nicht klappt, erkläre mir, was ich tun soll.
- Datenquelle auf der Über-Seite nennen, wie TMDB.
- Bestehende Profile und Sicherungsdateien müssen weiter funktionieren.
- Vor jedem Hochladen `node scripts/set-version.js X.Y.Z` (alle Importe gleiche Version; der Hook prüft das). Am iPhone und Android ohne Zoomen bedienbar, kein Login, keine Kauf-Links.

## Wie wir vorgehen
1. Prüfskript, Ergebnis erklären, Twitch-Konto mit mir einrichten (ich klicke, du erklärst). Dann `PLAN.md` um einen Abschnitt „Spiele“ erweitern und mir kurz zusammenfassen. **Auf mein OK warten.**
2. Danach alle Bauschritte am Stück durchbauen, ohne zwischendurch zu fragen. Nach jedem Schritt selbst im Browser prüfen (375 px und Laptop), Testprofile danach löschen, `STAND.md` aktualisieren, hochladen und live prüfen.
3. Am Ende: eine kurze Nachricht, die ich meinen Freunden zum Testen schicken kann (Link, was sie ausprobieren sollen, welches Feedback mich interessiert).

Antworte auf Deutsch, kurz und ohne Fachchinesisch.
