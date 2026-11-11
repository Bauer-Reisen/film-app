# f) Empfehlungslogik zur GitHub-Variante

1. **Abrufe/Tempo – bleibt.** Erste Liste ≤ 30 Abrufe (6 parallel), geschätzt 1–2 s am iPhone über Worker (ungemessen). Rechnen < 50 ms. Nach Rückmeldung 0–1 Abruf. NEU: Überrasch mich max. 15 Abrufe pro Klick über alle Lockerungsstufen, danach direkt Stufe 5.
2. **Zwischenspeicher – ändert sich.** Browser: IndexedDB (nicht localStorage, ~5 MB zu knapp), 7 Tage Listen/Details, 1 Std. Suche. Worker: zusätzlich Cloudflare-Cache per `cf: {cacheTtl: 86400}`, für alle Geräte gemeinsam. Keine Profildaten im Worker.
3. **Punkteformel/Quellen – bleibt.** Felder `{s,t,g,l,y}` erlauben Kern-Profil ohne Abrufe, auch nach Laden einer Sicherung.
4. **surpriseShown – bleibt**, gilt pro Profil/Gerät; Abnahme erfüllt. Sicherungsdatei enthält surpriseShown + surpriseLastGenre; Laden führt zusammen (neuere Markierung nach `t` gewinnt, surpriseShown vereinigt).
5. **Datenverlust – braucht Vorsorge.** Cache unkritisch, Profil kritisch. `navigator.storage.persist()` beim ersten Markieren; iPhone: Home-Bildschirm empfehlen; Hinweis „Profil sichern" alle 25 neuen Markierungen; Profilseite zeigt Datum der letzten Sicherung.
