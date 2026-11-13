# Prompt: Videospiele in die Film-App einbauen (schlanke Testversion)

> Für eine neue Code-Session im Ordner `Documents\Film-App`.
> Erst starten, wenn keine andere Session gerade an der App baut (`git status` muss sauber sein).
> Entstanden aus drei Recherchen (Datenquellen, was Gamer brauchen, Code-Analyse) und einer Kritik daran.

---

Ich habe eine fertige Web-App „Was schaue ich als Nächstes?“ für Filme, Serien und Bücher (dieser Ordner, live unter https://bauer-reisen.github.io/film-app/). Ich möchte **Videospiele als vierten Bereich** – zuerst als **schlanke Testversion** für meine Freunde (Gamer). Ich selbst spiele nicht; die Entscheidungen unten beruhen auf einer Recherche. Mein Token-Budget ist begrenzt: lieber wenig, aber fertig und sauber.

**Lies zuerst:** `STAND.md`, `PLAN.md`, `README.md`, dann `docs/js/config.js`, `media.js`, `store.js`, `backup.js`, `recommend.js`, `themes.js`, `bridge-books.js`, `tour.js`, `runtime.js`, `app.js`, `worker/index.js`, `worker/wrangler.toml`, `scripts/set-version.js`, `scripts/check-secrets.js`. Spiele folgen demselben Muster wie Serien und Bücher.

## Was Gamer brauchen (Recherche)
Wichtigkeit: **Plattform** (harter Filter) → **Zeitaufwand** → **Spielweise** (allein / online zusammen / Couch / gegeneinander) → Genre → Stimmung. Gamer verwerfen so ein Werkzeug, wenn es Spiele für fremde Plattformen oder schon gespielte zeigt, nur die offensichtlichen Hits bringt, Zeit ignoriert, beim Start zu viel fragt, „Mehrspieler“ als eins behandelt, Film-Wörter benutzt („gesehen“ statt „gespielt“) oder Konto-Zugänge verlangt.

## Die Testversion
- **Spiele-Bereich standardmäßig aus.** Einschalten im Profil oder per Link `…/film-app/?spiele=1` (den schicke ich meinen Freunden). Bestehende Nutzer sehen sonst nichts Halbfertiges.
- **Start mit 3 Fragen**, jeweils mit „egal“, später im Profil änderbar:
  - Plattformen (Pflicht, Mehrfachauswahl): PC/Steam Deck · PlayStation 5 · PlayStation 4 · Xbox Series · Xbox One · Nintendo Switch 2 · Nintendo Switch. **Abwärtskompatibilität als feste Tabelle:** PS5 spielt auch PS4, Xbox Series auch Xbox One, Switch 2 auch Switch. Plattform-Nummern über IGDB `/platforms` nachschlagen, nicht raten. Handy später.
  - Zeit: Kurz (unter 10 Std.) · Mittel (10–30 Std.) · Episch (30 Std.+).
  - Spielweise: Allein · Online zusammen · Couch zusammen · Gegeneinander.
- **Geschmack:** Startliste mit **ca. 100 Spielen**, per Skript gebaut: die bekanntesten je Plattform-Familie (nach `total_rating_count`), dazu ca. 30 Indies (IGDB-Genre „Indie“, Nr. 32), dazu eine kurze Handliste mit Pflicht-Titeln; auch ältere Plattformen, damit man Gespieltes markieren kann. Nur die Felder speichern, die gebraucht werden. Sortiert nach den gewählten Plattformen. Knöpfe: **Gespielt · Mag ich · Mag ich nicht · Merken**, ★ per Tipp aufs Cover. Suche nach Titel. Kein Zwang, jedes zu bewerten.
- **Vorschläge** mit einem Satz Begründung, Trailer (wie bisher über `youtube-nocookie.com`), **Spielzeit** („ca. 12 Std.“ – fehlt sie, einfach weglassen, nie deswegen ausschließen), Plattform-Hinweis, Couch-Hinweis („Koop für 2 auf einer Konsole“).
- **Merkliste.**
- **Brücke „gleiche Welt“** zu Filmen, Serien, Büchern (siehe unten).
- **Später, nicht jetzt** (im Plan unter „später“ notieren): „Heute Lust auf …“ und „Aus welcher Zeit“ für Spiele, Themen-Zuordnung zu IGDB und eigene Spiele-Themen (Offene Welt, Soulslike, Roguelike, Metroidvania, Gemütlich, Aufbau, Strategie, Rätsel, Schleichen, Rennen, Horror, Sandbox, Party), Lieblingsstudios, „Abgebrochen“, Story/Gameplay- und Schwierigkeits-Frage, Überrasch mich, Gruppenabend, Kinderspiele (USK/PEGI), Lieblingsspiel, Steam-Import (nur mit öffentlichem Profil), Handy-Spiele. **Keine** PlayStation-/Xbox-Anbindung – die bräuchte Zugangsdaten wie ein Passwort.

## Regeln für Vorschläge
- **Ausschließen:** nicht auf eigener (oder abwärtskompatibler) Plattform; gewünschte Spielweise fehlt; noch nicht erschienen; schon markiert; Spielzeit zwei Stufen daneben (nur wenn bekannt); MMO und Battle Royale (IGDB `game_modes` 5 und 6) außer bei „Online zusammen“/„Gegeneinander“.
- **Mindestqualität:** `total_rating` ab 75 und `total_rating_count` ab 50, bei Indies ab 15.
- **Punkte im Maßstab der Film-Punkte** (höchstens ~10), als `RECOMMEND_GAME` in `config.js`: gleiche Welt wie ★/♥ Film, Serie, Buch 9/5 · gleiches Genre wie ★/♥ Spiele 4/2 (höchstens 2×) · IGDB „ähnliches Spiel“ zu ★/♥ Spiel 6/3 · Spielzeit eine Stufe daneben −5 · Genre, das man nicht mochte −3.
- **Mischung:** in jedem 20er-Block mindestens 5 Indies (Genre 32).
- Begründungen z. B.: „Du liebst die Serie ‚The Last of Us‘ – das Spiel ist die Vorlage, ca. 15 Std.“ · „Ähnlich wie ‚Hades‘, das du liebst.“ · „Zusammen auf der Couch: Koop für zwei, ohne Online-Zwang.“

## Brücke „gleiche Welt“
Von Hand gepflegte Liste (wie `PAIRS` bei Büchern), z. B. The Last of Us, The Witcher, Arcane/League of Legends, Fallout, Cyberpunk (Edgerunners), Halo, Uncharted, Dune, Herr der Ringe, Star Wars, Resident Evil, Mass Effect, Castlevania, Sonic, Mario, Detective Pikachu. Nur **gute** Spiele aufnehmen (die meisten Film-Lizenzspiele sind schwach). In beide Richtungen: bei Filmen/Serien/Büchern ein Hinweis „Das Spiel dazu“, aber nur, wenn der Spiele-Bereich eingeschaltet ist.

## Datenquelle: IGDB (Recherche)
- Einzige freie Quelle mit ähnlichen Spielen, Reihen, Spielzeit, Couch-Koop, Altersfreigaben, YouTube-Trailern und Lokalisierungen. Nicht-kommerziell frei, Zwischenspeichern erlaubt. Ausweichlösung: RAWG (ohne ähnliche Spiele/Trailer im Gratis-Tarif).
- Bekannte Feinheiten: `category` → `game_type`, `status` → `game_status`, Altersfreigaben über `age_ratings.organization` / `rating_category`; Spielzeit ist ein **eigener Endpunkt** `game_time_to_beats` (`game_id`, `normally` in Sekunden). Deutsche Titel sind lückenhaft: Originaltitel zeigen, deutschen nur wenn vorhanden. Alles im Prüfskript bestätigen, Nummern über Endpunkte nachschlagen.

## Zugangsdaten – genau diese Reihenfolge
1. **Ich lege die Twitch-App an** (Zwei-Faktor-Anmeldung ist bei Twitch Pflicht). Erklär mir jeden Klick: App registrieren, Weiterleitungs-Adresse `http://localhost`, Typ „Confidential“, Secret erzeugen.
2. **Ich trage Client-ID und Secret selbst** als Secrets `TWITCH_CLIENT_ID` / `TWITCH_CLIENT_SECRET` beim vorhandenen Worker im Cloudflare-Dashboard ein. **Frag mich nie nach den Werten.**
3. **Du lädst zuerst nur die neuen `/igdb/…`-Adressen im Worker hoch.**
4. **Prüfskript und Startlisten-Skript fragen über den Worker ab** (mit `Origin: http://localhost:5500`), nie direkt bei IGDB – so braucht dein Rechner die Zugangsdaten nie.

## Worker (sicher bauen)
- App bleibt bei GET. Feste Adressen unter `/igdb/…`: Suche, Details, mehrere Spiele per ID-Liste, ähnliche, Entdecken nach Plattform/Genre/Zeitraum, Spielzeit. Jede baut **im Worker** eine feste IGDB-Abfrage mit festen Feldern und fester Obergrenze. Suchtext: nur Buchstaben, Ziffern, Leerzeichen, höchstens 60 Zeichen; `"` und `\` maskieren, `;` entfernen. IDs nur ganze Zahlen, höchstens 50 pro Liste. Nie frei formulierte Abfragen von außen.
- Twitch-Zugangsschlüssel holen und **nur im Speicher** halten (nie zwischenspeichern, nie ins Log), gültig ~60 Tage, 5 Min. Puffer, bei 401 einmal neu holen.
- IGDB erlaubt 4 Anfragen/Sek. Bremsen geht im Worker nicht zuverlässig – stattdessen: vorab gebaute Startliste, ID-Listen in einer Abfrage (`where id = (…)`), `/multiquery`, Zwischenspeicher. Ob `caches.default` auf `*.workers.dev` wirklich speichert, mit einem `put`/`match`-Test prüfen (`ctx.waitUntil`); zusätzlich `Cache-Control` für den Browser wie bei TMDB.
- Hinweis an mich: `ALLOWED_ORIGINS` lässt sich fälschen; der echte Schutz sind die festen Abfragen und die Anfragen-Grenze. Missbrauch würde mein Twitch-Konto treffen.
- `scripts/check-secrets.js` so erweitern, dass es auch Twitch-Secrets erkennt (30 Zeichen, Kleinbuchstaben und Ziffern).
- Hochladen: `NODE_USE_SYSTEM_CA=1 npx wrangler deploy --config worker/wrangler.toml`. Klappt das nicht, erklär mir genau, was ich tun soll.
- „Daten: IGDB.com“ mit Link auf der Über-Seite und auf den Spiele-Seiten.

## Technik in dieser App (Code-Analyse – unbedingt beachten)
- `scripts/set-version.js` und `check-secrets.js` müssen auch dynamische Importe `import('./x.js?v=…')` umschreiben bzw. prüfen – sonst lädt ein Modul doppelt mit getrenntem Zustand (der alte Fehler mit verschluckten Markierungen).
- **Spiele erst beim Umschalten laden:** eine Stelle `loadGames()` in `app.js`, die das Nachladen einmal macht; nirgends statisch importieren. Gemeinsame Module mit derselben `?v=`. Messen und mir sagen: wie viele KB lädt der Start bei ausgeschalteten Spielen, vorher und nachher.
- **Umschalter bei 375/360 px:** vier Teile passen nicht. Bereiche im Profil ein-/ausblendbar (`settings.areas`), schmalere Knöpfe unter 480 px; ist der gespeicherte Bereich aus, auf Filme zurückfallen.
- **Neue Profilfelder überall** eintragen: `store.js` (`newProfile`, `migrate`, `MARKS`, `addPassed`, `markCount`), `backup.js` (`mergeInto`), `media.js` (`mediaOf`, `other`, `stateLabel`, Wörter wie „gespielt“). Alte Sicherungen laden testen. Nebenbei: `rewatchShown` fehlt in `newProfile`/`migrate` – mit beheben.
- Eigene Tabelle `GAME_PAGES` wie `BOOK_PAGES`; Reiter ohne Spiele-Inhalt zeigen „kommt später“. Klick-Handler der Spiele-Seiten geben `true` zurück, sonst laufen die Film-Handler mit.
- `runtime.js` fragt TMDB für jedes `[data-runtime]` – für Spiele ein eigenes Merkmal (z. B. `data-playtime`).
- Rundgang (`tour.js`), Über-Seite und Texte nennen drei Bereiche – anpassen (Spiele nur erwähnen, wenn eingeschaltet).
- **Zeilenenden:** als eigenen ersten Commit `.gitattributes` mit `* text=auto eol=lf` und `*.png binary` (usw. für Bilder) anlegen – nur bei sauberem `git status`; danach `git add --renormalize .` prüfen, erwartet: keine Änderungen.
- `STAND.md`: neue Einträge an die richtige Stelle (neuere oben). Vor jedem Hochladen `node scripts/set-version.js X.Y.Z`. Am iPhone und Android ohne Zoomen, kein Login, keine Kauf-Links.

## Bauschritte – jeder einzeln fertig und hochladbar
1. `.gitattributes`; Versions- und Prüfskript für dynamische Importe (+ Twitch-Secret-Erkennung).
2. Twitch-Konto mit mir einrichten (siehe Reihenfolge), Worker-Adressen `/igdb/…` hochladen, Prüfskript über den Worker, Ergebnis kurz erklären. Dann `PLAN.md` um „Spiele“ erweitern, kurz zusammenfassen, **auf mein OK warten.**
3. `settings.areas`, Umschalter bei 375/360 px, Spiele standardmäßig aus, `?spiele=1`.
4. Profilfelder, `data-playtime`, alte Sicherungen laden.
5. Startliste (Skript) und Geschmack-Seite mit den 3 Startfragen.
6. Vorschläge mit den harten Filtern und Punkten, Merkliste.
7. Brücke „gleiche Welt“.
8. Kurze Nachricht für meine Freunde zum Testen: Link mit `?spiele=1`, was sie ausprobieren sollen, welches Feedback mich interessiert („Kam ein Spiel, das du nicht kanntest und spielen willst?“, „Was war falsch oder hat genervt?“).

Ab Schritt 3 am Stück, ohne Zwischenfragen. Nach jedem Schritt: selbst im Browser prüfen (375 px und Laptop), Testprofile löschen, `STAND.md` aktualisieren, hochladen, live prüfen, mir **einen Satz** Stand schreiben. Reicht das Budget nicht, **sauber nach einem fertigen Schritt aufhören** und sagen, wo es weitergeht.

Antworte auf Deutsch, kurz und ohne Fachchinesisch.
