# Prompt: Bücher in die Film-App einbauen

> Diesen Text in eine neue Code-Session im Ordner `Documents\Film-App` kopieren.
> **Erst nach den Serien** starten, wenn diese fertig und hochgeladen sind.

---

Ich habe eine fertige Web-App „Was schaue ich als Nächstes?“ für Filme und Serien (dieser Ordner, live unter https://bauer-reisen.github.io/film-app/). Ich möchte jetzt **Bücher in dieselbe App** einbauen, damit alles mit einem Profil zusammenhängt.

**Lies zuerst:** `STAND.md`, `PLAN.md`, `README.md`, dann `docs/js/config.js`, `store.js`, `recommend.js`, `themes.js`, `taste.js`, `suggest.js`, `app.js`.

## Was ich will
- Der Umschalter oben bekommt einen dritten Teil: **Filme · Serien · Bücher**. Die Reiter unten bleiben gleich, bei Büchern heißt „Merkliste“ sinngemäß Leseliste.
- Markieren: Gelesen · Mag ich · Mag ich nicht · Merken, ★ per Tipp aufs Cover. Zusätzlich **„Abgebrochen“**.
- Geschmack für Bücher: Lieblingsautorinnen und -autoren (mit ★ Liebe / ♥ Gern wie bei Personen), dieselben **Themen** wie bei Filmen, Genres, eine Startliste mit ca. 150 bekannten Büchern quer durch Länder und Jahrzehnte, als englische Ausgaben (Originale und bekannte Übersetzungen ins Englische).
- Vorschläge mit Begründung, „Heute Lust auf …“, „Aus welcher Zeit“, Lieblingsbuch, Überrasch mich. Statt Laufzeit: Seitenzahl.
- **Ich lese Bücher auf Englisch.** Deshalb bei Büchern eine eigene Sprach-Einstellung pro Profil („Bücher lese ich auf: Englisch | Deutsch“), unabhängig von der Film-Sprache, Standard Englisch. Titel, Cover, Beschreibung und Vorschläge kommen dann in englischen Ausgaben. Beim Scannen zählt das Buch, egal in welcher Sprache die gescannte Ausgabe ist: alle Ausgaben eines Werks gelten als dasselbe Buch.

## Bücher schnell erfassen: Scannen (sehr wichtig)
Bei Büchern ist es schwer, aus einer Liste zu erkennen, was man gelesen hat: Cover sind je nach Verlag anders, Titel verschwimmen. Deshalb:
- **ISBN-Strichcode mit der Handykamera scannen** (der Strichcode hinten auf dem Buch). Ein Knopf „📷 Bücher scannen“ im Reiter Geschmack bei Büchern.
- **Am Stück scannen:** Kamera bleibt offen, ich halte ein Buch nach dem anderen davor – zack, zack, zack. Jedes erkannte Buch erscheint sofort mit Cover und Titel in einer Liste darunter, mit kurzem Ton oder Vibration als Bestätigung. Doppelt gescannte werden ignoriert.
- Vor dem Start wählen, als was die Bücher gelten: **„Gelesen“** (Standard), „Mag ich“ oder „Steht im Regal, noch nicht gelesen“ (= Leseliste). In der Liste kann ich einzelne danach noch umstellen oder entfernen. „Fertig“ speichert alle.
- Wird eine ISBN nicht gefunden: kurz melden und weiterscannen; die Nummer zum späteren Nachschauen in der Liste behalten.
- **Ohne Kamera:** ISBN von Hand eintippen.
- **Achtung iPhone:** Safari kann Strichcodes nicht von sich aus erkennen. Eine kleine, frei nutzbare Bibliothek dafür (z. B. ZXing) als Datei in `docs/` mitliefern, nicht von fremden Servern laden. Die Kamera geht nur über https (bei GitHub Pages gegeben). Datenschutz: Bilder bleiben auf dem Handy, gesendet wird nur die ISBN.
- Auf dem echten iPhone testen lassen, das kann der Browser am Rechner nicht ersetzen. Zum Ausprobieren am Rechner: Testbilder mit Strichcodes.
- Optional, nur als Idee prüfen: ein Foto vom ganzen Regal (Buchrücken) – ehrlich sagen, ob das ohne KI zuverlässig machbar ist. Vermutlich nicht.

## Die Brücke zu Filmen und Serien (das Wichtigste)
Ich möchte, dass sich die Bereiche gegenseitig helfen. Beispiel: Wer „Forrest Gump“ liebt, bekommt „Der Hundertjährige, der aus dem Fenster stieg und verschwand“ vorgeschlagen.
1. **Gemeinsame Themen:** Jedes Thema in `themes.js` bekommt zusätzlich passende Buch-Schlagwörter (z. B. Zeitreise, Kochen, Underdog, schwarzer Humor, Lebensreise). Was im Film-Geschmack zählt, zählt auch bei Büchern und umgekehrt.
2. **Verfilmungen:** Bei Filmen und Serien, die auf einem Buch beruhen (bei TMDB als Stichwort und in den Mitwirkenden als „Novel“/„Author“ erkennbar), einen Hinweis „Das Buch dazu“ zeigen – und bei Büchern „Verfilmt als …“. Mag man einen Film, ist die Romanvorlage ein guter Vorschlag (Begründung: „Die Vorlage zu ‚…‘, den du liebst“).
3. **Autorinnen und Autoren:** Liebt man Filme nach Büchern derselben Person (z. B. Stephen King), wird sie als Lieblingsautor vorgeschlagen.
4. Ehrlich bewerten, was ohne KI geht: Feine „fühlt sich ähnlich an“-Verbindungen wie Forrest Gump → Hundertjähriger entstehen hier über gemeinsame Themen. Falls das nicht reicht, mir Möglichkeiten nennen (z. B. eine kleine, von Hand gepflegte Liste solcher Paare) – **keine** KI-Dienste mit laufenden Kosten ohne meine Zustimmung.

## Technik und Regeln (wichtig)
- **Datenquelle prüfen, bevor gebaut wird:** Mit einem kleinen Prüfskript (wie `scripts/check-tmdb.js`) vergleichen, wie gut **Open Library** (frei, ohne Schlüssel) und **Google Books** englische Bücher (Schwerpunkt) und deutsche Bücher, Cover, Beschreibungen, Seitenzahlen, Schlagwörter und Bewertungen liefern. Mir das Ergebnis kurz erklären und eine Quelle empfehlen. Falls ein Schlüssel nötig ist: nur im Cloudflare Worker als Secret (trage ich selbst ein), nie im Code. Frag mich nie nach dem Schlüssel.
- Abfragen laufen über den vorhandenen Worker (neue Adressen in die Erlaubnis-Liste), damit alles an einer Stelle geschützt ist.
- Quelle der Buchdaten auf der Über-Seite nennen, so wie TMDB.
- Bestehende Profile und Sicherungsdateien müssen weiter funktionieren.
- Vor jedem Hochladen `node scripts/set-version.js X.Y.Z` (alle Importe gleiche Version, der Hook prüft das).
- Am iPhone ohne Zoomen bedienbar (375 px), kein Login, keine Kauf-Links.

## Wie wir vorgehen
1. Prüfskript laufen lassen (auch: wie gut findet die Quelle Bücher per ISBN, und erkennt sie verschiedene Ausgaben eines Werks als dasselbe Buch?), Ergebnis erklären. Dann `PLAN.md` um einen Abschnitt „Bücher“ erweitern (Datenquelle, Datenmodell, Brücke, Punkte, Seiten, Bauschritte) und mir eine kurze Zusammenfassung zeigen. **Auf mein OK warten.**
2. Danach alle Bauschritte am Stück durchbauen, ohne zwischendurch zu fragen. Nach jedem Schritt selbst im Browser prüfen (375 px und Laptop), Testprofile danach löschen, `STAND.md` aktualisieren, hochladen und live prüfen.
3. Am Ende: was ich am echten Handy testen soll.

Antworte auf Deutsch, kurz und ohne Fachchinesisch.
