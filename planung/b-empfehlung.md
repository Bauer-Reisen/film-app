# b) Empfehlungslogik-Vorschlag

## 1. Kandidaten & Punkte
Quellen: gemochte Filme (neueste 10) + Merkliste (5) → `/movie/{id}/recommendations` (Seite 1); Lieblingsschauspieler → `/person/{id}/movie_credits` cast mit order ≤ 4; Lieblingsregisseure → crew job=Director; Lieblingsstudios → `/discover/movie?with_companies={id}&sort_by=vote_average.desc&vote_count.gte=150`. Verworfen: `/similar` (nur Keywords/Genres, schlechtere Treffer).

Punkte (additiv): Lieblingsschauspieler Hauptrolle +5; Lieblingsregisseur +4; Empfehlung aus gemochtem Film +3 je Film (max. +9); aus Merkliste-Film +1,5; Lieblingsstudio +2; Genre-Neigung 0,5×(Anteil gemocht − Anteil nicht gemocht)×10, gedeckelt ±2; Qualität +(vote_average − 6,5). Sortierung absteigend, Gleichstand vote_count. Vielfalt: max. 4 der Top 20 aus derselben stärksten Quelle. Verworfen: gelernte Gewichte/Vektoren (nicht erklärbar, Kaltstart wertlos).

## 2. Lieblingsschauspieler stark
Untergrenzen normal vote_average ≥ 6,5, vote_count ≥ 200; mit Favorit (Schauspieler/Regie) ≥ 5,5 / ≥ 50. +5 gleicht schwächere Bewertung aus. Verworfen: keine Untergrenze (Frühwerke mit 12 Stimmen).

## 3. Begründung
Beiträge pro Kandidat als Liste; Satz aus dem stärksten Beitrag, bei Gleichstand Schauspieler > Regie > gemochter Film > Studio. „Mit Florence Pugh“, „Regie: Céline Sciamma“, „Weil du *Parasite* mochtest“, „Von Studio A24“. Zweiter Beitrag ≥ 3 → „… und Regie: Y“. Titel in Profilsprache.

## 4. Rückmeldungen
- Schon gesehen: Ausschluss, kein Geschmackssignal.
- Gemocht: neue Quelle (+1 Aufruf), Genres in Neigung.
- Nicht gemocht: Ausschluss, Genres negativ; recommendations der letzten 3 nicht gemochten → −2 je Treffer.
- Kein Interesse: Ausschluss; −1 für Kandidaten mit derselben stärksten Quelle; Genre nicht abwerten.
- Merkliste: aus Vorschlägen raus, schwache Quelle +1,5.

## 5. Harte Ausschlüsse
Alle markierten IDs (gesehen, gemocht, nicht gemocht, kein Interesse, Merkliste) – am Ende bei jeder Ausgabe gefiltert. Zusätzlich adult, Zukunft/ohne Datum, ohne Poster.

## 6. Überrasch mich
Profil-fremd: Kern-Genres (≥ 15 % Anteil gemocht+gesehen), Kern-Jahrzehnte, Kern-Länder, Favoriten. Abfrage `/discover/movie` mit without_genres=Kern, zufälliges Nicht-Kern-Genre, zufällig fremdes Jahrzehnt ODER fremdes Land, vote_average ≥ 7,2, vote_count ≥ 500 (vor 1980: 200), zufällige Seite 1–5. Nachkontrolle: nicht ausgeschlossen, nicht in Vorschlagsliste, kein Favorit beteiligt (`/movie/{id}?append_to_response=credits`, liefert auch Laufzeit). Pro Profil `ueberraschung_gezeigt` speichern. Lockerung: andere Seite → Zusatzbedingung weg → vote_count halbieren → Gezeigt-Liste zurücksetzen (nur Filme ohne Rückmeldung). Fast leeres Profil (< 5 gemocht): alle Genres fremd, reihum Genre/Jahrzehnt. Gemochte Überraschung = normaler gemochter Film (neue Quelle), Genre nicht mehr fremd; nicht gemochte Überraschung: nur Ausschluss, keine Genre-Abwertung. Verworfen: Zufall aus Top-Rated (nicht profil-fremd).

## 7. Kaltstart
Filme: kuratierte JSON mit ~150 IDs (1950–2020er, Genres, Länder USA/Europa inkl. DE/Japan/Korea/Indien/Lateinamerika); „Mehr laden“ → discover sort_by=vote_count.desc mit wechselndem Jahrzehnt-/Genre-Filter. Verworfen: nur popular (aktuelles Hollywood).
Personen: kuratiert ~40 Schauspiel + 30 Regie international, plus Personen aus credits gemochter Filme. Verworfen: /person/popular.
Studios: kuratiert ~30 (Warner, Universal, Pixar, A24 41077, Neon, Blumhouse 3172, Ghibli 10342, Focus 10146, Searchlight, Annapurna, Plan B, StudioCanal, X Filme, Toho, CJ); IDs beim Bauen prüfen; Suche `/search/company`.

## 8. Aufwand
Erste Liste ~33 Aufrufe (max. 6 parallel). Bewertung nur mit Listenfeldern. Cache serverseitig, Schlüssel Endpunkt+Parameter+Sprache; TTL 7 Tage recommendations/credits, 1 Tag discover, 30 Tage Details. Nach Rückmeldung lokal neu rechnen, 0–1 neue Aufrufe.
