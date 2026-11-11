# c) Bedienungs-Vorschlag

Dunkles Kino-Design, mobile first.

## 1. Poster-Raster
Feste Leiste mit 4 Symbol-Buttons (44×44 px) unter jedem Poster: ✓ Gesehen, ♥ Gesehen und gemocht, ✕ Nicht gemocht, + Will ich sehen. Ein Tipp setzt, zweiter Tipp auf denselben löscht. Unbekannt = nichts tun. Legende oben, Tooltip am Laptop. Markiert: farbiger Rahmen + Abzeichen; „nicht gemocht“ abgedunkelt. iPhone 2 Spalten, Laptop 5–6. Tastatur: Pfeile wählen, 1–4 setzen, 0 löscht, springt automatisch weiter.
Verworfen: Durchschalten per Tipp (bis 4 Tipps), Wischgesten (kollidieren mit Scrollen), Menü (zwei Tipps).

## 2. Personen, Studios, Suche, Nachladen
Unterreiter „Filme | Personen | Studios“. Personen: rundes Foto, Name, „Schauspiel“/„Regie“, Tipp auf Kachel = Favorit an/aus (☆/★); Filter Alle/Schauspiel/Regie. Studios: Logo oder Name; Filter Alle/„Klein & Independent“. Suchfeld oben (16 px, „Film, Person oder Studio suchen“), Treffer gruppiert, gleiche Buttons, Filme mit beiden Titeln („Das Leben der Anderen · The Lives of Others (2006)“). Nachladen per Button „Weitere laden“ + Schalter „Markierte ausblenden“. Verworfen: eigene Suchseite; endloses Scrollen (Fußbereich unerreichbar).

## 3. Navigation
Start „Wer schaut?“ mit Namen-Buttons + „+ Profil anlegen“ (Name, „Filme schauen auf: Deutsch | Englisch“). Leeres Profil → Geschmack, gefülltes → Vorschläge. iPhone untere Tab-Leiste [Vorschläge][Überrasch][Geschmack][Merkliste][Profil], Laptop obere Leiste. Profilname oben rechts → „Profil wechseln“. Seite Profil: Sprache, Wechseln, Umbenennen, „Über diese App“ (TMDB-Logo + Hinweis, auch im Fuß verlinkt). Verworfen: Hamburger-Menü.

## 4. Vorschlagskarte
Poster 80 px, Titel (Jahr), Begründung; Buttons mit Text: Gemocht, Nicht gemocht, Gesehen, Kein Interesse, Merkliste. Nach Rückmeldung klappt Karte ein (200 ms), Toast 6 s „Gemocht: Titel · [Rückgängig]“. „Mehr Vorschläge“ am Ende. Oben hervorgehobener Button „Überrasch mich“. Verworfen: markierte Karte bleibt stehen.

## 5. Überrasch mich
Vorhang mit „Drama · 1970er · 112 Min.“ + [Aufdecken]; darunter „Anderen Film“. Nach Aufdecken: Poster, Titel, Jahr, Inhalt (3 Zeilen + Mehr), 5 Rückmelde-Buttons + Hauptbutton „Anderen Film“. Rückmeldung ersetzt den Film nicht automatisch. Verworfen: automatisch nächster Film.

## 6. Beschriftungen
Wer schaut?, + Profil anlegen, Profil wechseln, Profil umbenennen, Speichern, Abbrechen; Vorschläge, Überrasch mich, Geschmack, Merkliste, Profil, Über diese App; Gesehen, Gesehen und gemocht, Nicht gemocht, Will ich sehen, Favorit/Kein Favorit mehr, Weitere laden, Markierte ausblenden; Filme, Personen, Studios, Alle, Schauspiel, Regie, Klein & Independent; Gemocht, Nicht gemocht, Gesehen, Kein Interesse, Merkliste, Rückgängig, Mehr Vorschläge; Aufdecken, Anderen Film; Merkliste: Gesehen, Entfernen.

## 7. Barrierefreiheit
Kontrast ≥ 4,5:1 (#F2F2F2 auf #141414), Zustand nie nur Farbe. Gelber 3-px-Fokusring, volle Tastaturbedienung. aria-label je Symbol-Button, aria-pressed, Toast aria-live, Alt-Text = Titel. Kein maximum-scale, Eingaben 16 px, prefers-reduced-motion.
