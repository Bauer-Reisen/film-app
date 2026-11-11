# d) Kritik (nach Schwere)

## HOCH
1. (a+c) 4×44 px Buttons passen nicht in 2 Spalten auf 375 px (~165 px pro Kachel). → iPhone: 2×2-Block mit Kurztext unter dem Poster, oder 1 Spalte Poster links/Buttons rechts.
2. (a+b+c) „Will ich sehen“ und Merkliste doppelt (`want` + `watchlist`). → Merkliste = alle Filme mit Status `want`; `watchlist` streichen; ein Begriff.
3. (a vs. b) Datenmodell trägt Logik nicht: keine Zeitstempel („neueste 10 gemocht“), `ueberraschung_gezeigt` pro Profil vs. pro Sitzung, Quelle je Rückmeldung fehlt, Favoriten ohne Rolle. → `movies: {id: {s, t}}`, `surpriseShown: [ids]`, `people: [{id, role}]`; `feedbackLog` und „gleiche Quelle −1“ streichen.
4. (a vs. b) Widersprüchliche Zahlen (Cache 7 vs. 30 Tage, Überrasch 7,0 vs. 7,2, Stimmen, 8 vs. 6 parallel). → eine `lib/config.js`; Vorschlag 7,0 / 300 Stimmen / 6 parallel / 7 Tage / Suche 1 Std.
5. (a) „jedes Mal anderer Film“ nicht gesichert, wenn nur pro Sitzung gemerkt. → dauerhaft im Profil; beim Zurücksetzen letzte 20 gesperrt; Abnahmetest 30 Klicks.
6. (b) Überrasch-Ergebnis droht leer: `without_genres`=Kern-Genres (z. B. Drama) schließt fast alles aus; Kern-Länder brauchen Detailaufrufe. → nur Ziel-Genre `with_genres`, Land zunächst weglassen bzw. nur aus geladenen Details.
7. (a+b) TMDB-Annahmen ungeprüft (with_origin_country, without_genres-Semantik, poster_path mit language=de-DE schon deutsch?, with_companies bei Verleihern). → Prüfskript `scripts/check-tmdb.js` in Bauschritt 2.
8. (a) Sprachlücken: deutsche Inhaltsangabe/Poster fehlen oft. → Rückfall Sprache → Englisch → Original; Abnahmetest gleiche ID in DE/EN auf allen 4 Seiten.

## MITTEL
9. (c) Symbole ohne Text missverständlich, Tooltips gibt es am iPhone nicht. → Kurztexte „Gesehen“, „Mag ich“, „Mag ich nicht“, „Merken“.
10. (c) Merkliste: nur „Gesehen“ zu wenig. → „Gesehen“, „Gemocht“, „Nicht gemocht“.
11. (c) Rückgängig nur für Vorschläge; muss alten Status wiederherstellen. → alter Status mitsenden.
12. (b) „Mehr Vorschläge“ undefiniert, Liste wird leer. → Plätze 21–40, dann Seite 2 der Quellen.
13. (a+c) iOS-Fallen: safe-area-inset, viewport-fit=cover, Toast über Leiste, hover nur in @media (hover:hover), 100dvh.
14. (a) Firewall: falsch beantworteter Dialog / WLAN „Öffentlich“. → README „Handy kommt nicht rein“, Hinweis in Startausgabe, QR-Code auf Über-Seite.
15. (c) Profil löschen fehlt; letztes Profil pro Gerät merken (localStorage).

## GERING (Überbau)
16. (a) Plattencache/LRU, Schreib-Warteschlange, Backup, Anfragen-Zusammenlegung streichen; Speicher-Cache + writeFileSync .tmp + rename genügt.
17. (c) Tastaturnavigation streichen.
18. (b) Vielfaltsregel, −2 aus nicht gemochten Recommendations, „kein Favorit im Überraschungsfilm“ streichen.
19. (a) prestart macht jedes Mal npm install → nur wenn node_modules fehlt.
20. (c) Filter „Klein & Independent“ braucht `indie: true` in Seeds.
21. (b) Studio-IDs (Searchlight, Neon, Plan B, X Filme, CJ) mehrdeutig → im Prüfskript testen.
