# i) Kritik der GitHub-Variante

## HOCH
1. (g+h) Home-Bildschirm-Hinweis ab 10 Markierungen zu spät – Home-App hat eigenen Speicher. → Hinweis beim ersten Öffnen in Safari VOR dem Profil-Anlegen; bei vorhandenen Markierungen geführter Umzug „Profil sichern → App öffnen → Profil laden"; in Abnahme.
2. (f/g/h) drei verschiedene Sicherungs-Erinnerungen. → eine Regel: ab 20 neuen Markierungen seit letzter Sicherung, max. 1×/Woche.
3. (f vs. h) Zwischenspeicher widersprüchlich. → h: Map + Cache-Control vom Worker; IndexedDB streichen; cf.cacheTtl höchstens Extra nach Prüfung.
4. Profile nur pro Gerät, iPhone ohne Home-Bildschirm kann löschen, persist() keine Garantie. → Nutzerin muss bestätigen; in ANFORDERUNGEN; Sicherungsdatei als eigentlicher Schutz.
5. GitHub Pages bei privatem Repo kostenpflichtig. → öffentliches Repo; check-secrets erkennt `eyJ…` und 32-stelligen Hex-Key; vor jedem Push.

## MITTEL
6. Zu viele Schritte. → Secret im Cloudflare-Dashboard eintragen (kein Terminal); `npm start` = nur Mini-Webserver, spricht echten Worker; `.dev.vars` und `wrangler dev` entfallen; bleibt `npx wrangler login`. Worker nötig.
7. Offener Worker missbrauchbar (URL lesbar). → Pfad-/Parameterprüfung + Rate-Limit pro IP (60/Min.); README: bei Missbrauch neuen Token.
8. CORS-Header auch bei 403/429/5xx; Origin `https://<name>.github.io`; keine eigenen Header (kein Preflight).
9. Pages unter `/<repo>/`: nur relative Pfade, Manifest start_url/scope; Versionsnummer `?v=7`, Version auf Profilseite.
10. iPhone Sichern/Laden: navigator.share mit Datei ab iOS 15 nur nach Tipp; `accept="application/json,.json"`, sonst ohne accept; echt am iPhone testen, auch in Home-App.
11. Zuletzt gewähltes Profil: Regel aus g übernehmen.

## GERING
12. TMDB-Bedingungen kurz nachlesen; Poster direkt von image.tmdb.org.
13. Ladehinweis „Vorhang wird vorbereitet …".
14. Abnahme ergänzen: Mobilfunk, fremde Origin/Pfad abgelehnt, Umzug Safari → Home-App.

**Urteil:** Ja, besser als Laptop-Server (Firewall/IP/Ruhezustand entfallen, bekannter Weg, auch zu Hause nutzbar) – wenn 1 und 6 umgesetzt werden und die Nutzerin den fehlenden Geräte-Abgleich bestätigt.
