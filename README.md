# Was schaue ich? – Film-App

Die App erfasst einmal deinen Filmgeschmack und schlägt dir dann Filme vor, die du noch nicht kennst. Außerdem gibt es „Überrasch mich“, „Gruppenabend“ und „Kinderfilme“.

## Benutzen

Öffne den Link auf deinem Handy (iPhone, Android oder ein anderes Gerät):

**→ https://bauer-reisen.github.io/film-app/**

Tipp: Leg die App gleich beim ersten Öffnen auf deinen Home-Bildschirm. Wie das geht, zeigt die App selbst.

## Am Laptop testen (für Bastler)

Voraussetzung: [Node.js](https://nodejs.org) ab Version 20.

```
npm start
```

Danach im Browser **http://localhost:5500** öffnen. Beenden mit `Strg + C`.

## Wie es aufgebaut ist

| Teil | Wo | Wofür |
|---|---|---|
| Website | `docs/` | wird über GitHub Pages veröffentlicht |
| Zwischenhändler | `worker/` | Cloudflare Worker, der den TMDB-Schlüssel geheim hält |
| Hilfsskripte | `scripts/` | lokaler Start, TMDB-Prüfung, Schlüssel-Suche |

Die Profile liegen nur im Browser des jeweiligen Geräts. Mit „Profil sichern“ und „Profil laden“ nimmt man sein Profil auf ein anderes Gerät mit.

## Der TMDB-Schlüssel

- Er steht **nirgends** in diesem Projekt.
- Er liegt nur im Cloudflare-Dashboard als Secret `TMDB_TOKEN`.
- Vor jedem Hochladen sucht `npm run check-secrets` automatisch nach versehentlich enthaltenen Schlüsseln.
- **Bei Missbrauch:**
  1. Bei TMDB einen neuen Token erzeugen.
  2. Im Cloudflare-Dashboard unter Worker → Einstellungen → Variablen das Secret ersetzen.

## Quelle der Filmdaten

This product uses the TMDB API but is not endorsed or certified by TMDB.
