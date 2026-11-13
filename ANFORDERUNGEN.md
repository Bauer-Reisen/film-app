# Anforderungen – Film-App „Was schaue ich als Nächstes?"

(Wortgetreu aus dem Auftrag der Nutzerin übernommen.)

## Problem
Ich habe sehr viele Filme gesehen und verliere zu viel Zeit beim Stöbern. Die App soll
meinen Geschmack einmal erfassen und mir dann passende Filme vorschlagen, die ich noch
nicht kenne.

## Funktionen

1. Geschmack erfassen (Einstieg)
   - Raster mit Filmpostern zum schnellen Durchklicken: bekannte Filme quer durch
     Jahrzehnte, Genres und Länder. Pro Film mit einem Klick: "gesehen", "gesehen und
     gemocht", "nicht gemocht", "will ich sehen". Weitere Filme nachladbar.
   - Gleiches Prinzip für Schauspieler, Regisseure und Filmstudios, jeweils als
     Favoriten markierbar. Bei den Studios ausdrücklich auch kleinere und
     Independent-Studios (z. B. A24), nicht nur die großen.
   - Suchfeld, um Filme, Personen und Studios zu ergänzen, die im Raster fehlen.
     Die Suche findet Filme unter dem deutschen und dem englischen Titel.
   - Die Auswahl ist jederzeit änderbar.

2. Vorschläge
   - Liste von Filmen, die ich noch nicht gesehen habe, abgeleitet aus meiner Auswahl:
     ähnliche Filme, weitere Filme meiner Lieblingsregisseure, -schauspieler und -studios.
   - Lieblingsschauspieler zählen stark: Ein Film mit einem Favoriten darf auch dann
     erscheinen, wenn er sonst schwächer bewertet ist.
   - Jeder Vorschlag nennt in einem Satz den Grund ("weil du X mochtest",
     "Regie: Y", "von Studio Z").
   - Pro Vorschlag: "schon gesehen", "gemocht/nicht gemocht", "kein Interesse",
     "auf die Merkliste". Jede Rückmeldung verbessert die folgenden Vorschläge.

3. "Überrasch mich" (Sneak Preview)
   - Eigener Button neben den normalen Vorschlägen. Er liefert genau einen Film, den
     ich noch nicht gesehen habe und der bewusst nicht aus meiner Auswahl abgeleitet
     ist: anderes Genre, anderes Land, anderes Jahrzehnt oder Leute, die ich nicht
     markiert habe.
   - Trotzdem kein Schrott: nur Filme mit guter Bewertung und genügend Stimmen.
     Filme, die ich als "nicht gemocht" oder "kein Interesse" markiert habe, bleiben
     ausgeschlossen.
   - Wie im Kino bleibt der Film zunächst verdeckt: sichtbar sind nur Genre,
     Jahrzehnt und Laufzeit. Titel und Poster erscheinen erst per Klick auf
     "Aufdecken".
   - Danach dieselben Rückmeldungen wie bei den Vorschlägen, plus "anderen Film".
     Mag ich eine Überraschung, fließt das in die normalen Vorschläge ein.

4. Mehrere Personen
   - Die App wird auch in unserem Clubraum genutzt. Mehrere Profile anlegbar, Wechsel
     per Klick auf den Namen, ohne Passwort.
   - Jedes Profil hat eine eigene Auswahl, eigene Vorschläge und eine eigene Merkliste.

5. Sprache pro Profil
   - Jedes Profil legt fest, ob die Person Filme auf Deutsch oder auf Englisch schaut;
     jederzeit umstellbar.
   - Danach richten sich überall Filmtitel, Poster und Inhaltsangaben: im
     Auswahlraster, in den Vorschlägen, bei "Überrasch mich" und auf der Merkliste.
   - Die Auswahl selbst hängt am Film, nicht am Titel: Wer die Sprache wechselt,
     behält alle Markierungen.

## Rahmen
- Läuft im Browser, bedienbar auf Windows-Laptop und iPhone. Menüs und Buttons auf
  Deutsch.
- Filmdaten und Poster über die TMDB-API. Den API-Key trage ich selbst in eine .env
  ein; er darf nicht im Code oder im Repository landen. TMDB-Logo und den von TMDB
  geforderten Hinweistext in einem "Über"-Bereich einbauen.
- Daten der Profile müssen einen Neustart überleben.
- Kein Login, keine Bezahlfunktion. Seit 1.16.0 nur Links: Leseliste → „Bei Amazon ansehen“, Merkliste → „Wo kann ich das schauen?“ (JustWatch). Kein Partnerprogramm, es wird nichts gesendet.

## Fertig ist es, wenn
- die App mit einem einzigen Befehl startet und eine README erklärt, wie,
- ich zwei Profile anlegen, in beiden unterschiedlich auswählen kann und
  unterschiedliche Vorschläge bekomme,
- ein Profil auf Deutsch und eines auf Englisch denselben Film mit dem jeweils
  passenden Titel und Poster zeigt,
- "Überrasch mich" bei jedem Klick einen anderen, noch nicht gesehenen Film liefert,
  der verdeckt startet,
- kein als gesehen markierter Film in den Vorschlägen oder bei "Überrasch mich"
  auftaucht,
- alles am iPhone ohne Zoomen bedienbar ist.

## Umgebung
- Windows 10 Home, Node.js 24.20.0, npm 11.19.0, Git 2.55.0, VS Code vorhanden.
- Die Nutzerin hat keine Programmierkenntnisse; sie baut mit Claude.
- Kein Python vorausgesetzt.
