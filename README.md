# Was schaue ich? – Film-App

Die App erfasst einmal deinen Filmgeschmack und schlägt dir dann Filme vor, die du noch nicht kennst – jeweils mit einem Satz, warum. Außerdem gibt es „Überrasch mich“, „Gruppenabend“ und „Kinderfilme“.

## Benutzen

Öffne den Link auf deinem Handy (iPhone, Android oder ein anderes Gerät):

**→ https://bauer-reisen.github.io/film-app/**

Tipp: Leg die App gleich beim ersten Öffnen auf deinen Home-Bildschirm. Wie das geht, zeigt die App selbst.

### So geht's
1. **Profil anlegen:** Name und Sprache (Deutsch oder Englisch). Kein Passwort, keine Anmeldung.
2. **Geschmack:** Personen, Studios und Themen mit ★ Liebe oder ♥ Gern bewerten. Dann Filme markieren: Gesehen · Mag ich · Mag ich nicht · Merken. Tipp aufs Poster = ★ Lieblingsfilm.
3. **Vorschläge:** passende Filme mit Begründung. Jede Rückmeldung verbessert die Liste.
4. **Überrasch mich:** ein guter Film abseits deines Geschmacks, verdeckt wie in der Sneak Preview.
5. **Gruppenabend:** Jeder tippt auf dem eigenen Handy. Jedes Handy zeigt einen Film, der zum eigenen Geschmack und in eine Runde passt. Dann wird abgestimmt.
6. **Kinderfilme:** gute Filme ab 0, ab 6 oder ab 12 (FSK, sonst US-Freigabe).
7. **Merkliste:** alles, was du dir gemerkt hast.

### Profile mitnehmen
Profile liegen nur im Browser des jeweiligen Geräts. Unter **Profil → Profil sichern** entsteht eine kleine Datei. Mit **Profil laden** holt man sie auf einem anderen Gerät wieder rein.

## Am Laptop testen (für Bastler)

Voraussetzung: [Node.js](https://nodejs.org) ab Version 20.

```
npm install
npm start
```

Danach im Browser **http://localhost:5500** öffnen. Beenden mit `Strg + C`.

## Wie es aufgebaut ist

| Teil | Wo | Wofür |
|---|---|---|
| Website | `docs/` | wird über GitHub Pages veröffentlicht (ohne Build-Schritt) |
| Zwischenhändler | `worker/` | Cloudflare Worker, der den TMDB-Schlüssel geheim hält |
| Hilfsskripte | `scripts/` | lokaler Start, Prüfungen, Startlisten, QR-Code, Versionsnummer |

Wichtige Dateien in `docs/js/`:

| Datei | Inhalt |
|---|---|
| `config.js` | alle Stellschrauben (Punkte, Grenzen, Gruppen- und Kinderregeln) und die Versionsnummer |
| `recommend.js` | wie Vorschläge entstehen |
| `surprise.js` | „Überrasch mich“ |
| `group.js` / `kids.js` | Gruppenabend / Kinderfilme |
| `age.js` | Altersfreigaben |
| `seeds.js` | Startlisten (wird mit `node scripts/make-seeds.js` erzeugt) |
| `themes.js` | Themen und ihre TMDB-Stichwörter |

### Neue Version veröffentlichen
1. `node scripts/set-version.js 1.0.1` – setzt die Nummer überall (sonst lädt das Handy alte Dateien).
2. `git commit` und `git push`. Vor dem Push prüft ein Hook, dass kein Schlüssel im Code steht und alle Dateien dieselbe Version tragen.
3. Nach 1–2 Minuten ist die neue Version online. Offene Apps laden sie beim nächsten Öffnen selbst nach.

### Worker neu hochladen
```
npm run deploy-worker
```
Hinter einem Virenscanner, der Verbindungen prüft (z. B. AVG), vorher `NODE_USE_SYSTEM_CA=1` setzen.

## Der TMDB-Schlüssel

- Er steht **nirgends** in diesem Projekt.
- Er liegt nur im Cloudflare-Dashboard als Secret `TMDB_TOKEN`.
- Der Worker beantwortet nur Leseanfragen an eine feste Liste von TMDB-Adressen und nur von der eigenen Website. Höchstens 300 Anfragen pro Minute und Gerät.
- Vor jedem Hochladen sucht `npm run check-secrets` automatisch nach versehentlich enthaltenen Schlüsseln.
- **Bei Missbrauch:**
  1. Bei TMDB einen neuen Token erzeugen.
  2. Im Cloudflare-Dashboard unter Worker → Einstellungen → Variablen das Secret ersetzen.

## Quelle der Filmdaten

Alle Filmdaten und Poster stammen von [The Movie Database (TMDB)](https://www.themoviedb.org/).

This product uses the TMDB API but is not endorsed or certified by TMDB.
