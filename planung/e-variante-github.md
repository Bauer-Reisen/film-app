# e) Neue Variante: Website auf GitHub Pages (Wunsch der Nutzerin)

Die Nutzerin möchte NICHT, dass ihr Laptop laufen muss, damit andere die App nutzen. Sie hat schon eine andere App als reine Website über ein GitHub-Repository (GitHub Pages) gebaut, die alle über einen Link nutzen, und möchte es genauso.

## Vorschlag (von Claude, zur Prüfung)
- **Oberfläche:** statische Website (HTML/CSS/JS, kein Build-Schritt) auf GitHub Pages. Alle nutzen sie per Link, rund um die Uhr, auch von zu Hause.
- **TMDB-Key:** darf nicht im Code/Repo stehen. Lösung: ein kostenloser **Cloudflare Worker** als Zwischenhändler. Key liegt dort als Secret; der Worker reicht nur freigegebene TMDB-Pfade weiter (kein offener Proxy), CORS nur für die eigene Pages-Adresse. Die Nutzerin legt das Cloudflare-Konto selbst an.
- **Profile:** liegen im Browser jedes Geräts (localStorage oder IndexedDB). Eigenes Handy = eigene Profile; gemeinsames Clubraum-Gerät = Profile dort. Kein Abgleich zwischen Geräten. Dagegen: „Profil sichern" / „Profil laden" als Datei.
- **Empfehlungslogik, Bedienung, Sprache, Überrasch mich:** bleiben inhaltlich wie in PLAN.md, laufen aber im Browser statt auf dem Server.
- **„Startet mit einem Befehl":** ein Befehl zum lokalen Testen am Laptop (z. B. kleiner Testserver). Die echte App ist der Link.

## Offene Punkte, die bewertet werden sollen
- Ist der Cloudflare Worker die beste Lösung für den Key? Alternativen: Supabase Edge Function (die Nutzerin hat Supabase schon für ein anderes Projekt), Netlify/Vercel Functions, Key pro Gerät selbst eintragen, Key öffentlich lassen (TMDB-Key ist nur lesend).
- Reicht Speichern im Browser, oder sollte es doch einen gemeinsamen Speicher geben (z. B. Supabase-Tabelle, Cloudflare KV/D1), damit Profile geräteübergreifend gelten? Dann aber: ohne Login wären die Profile für jeden mit dem Link änderbar → Club-Code?
- Gefahr: iOS Safari löscht Website-Daten nach 7 Tagen ohne Besuch, wenn die Seite nicht als App auf den Home-Bildschirm gelegt wird (Intelligent Tracking Prevention). Prüfen und Lösung vorschlagen.
- Zwischenspeicher für TMDB-Antworten: im Browser und/oder im Worker (Cache API)?
- Wie wird veröffentlicht (git push → GitHub Pages; wrangler deploy für den Worker)? Wie viel muss die Nutzerin selbst tun?
- Was bedeutet das für Bauschritte und Abnahme?
