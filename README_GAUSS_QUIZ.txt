Gaußverfahren – Quizlogik
========================

Umsetzung
---------
- 3 Gleichungen / 3 Unbekannte, alle 12 Werte frei eingebbar.
- Eingabe als ganze Zahl, Dezimalzahl oder Bruch (z.B. 1/2).
- Umschalter Gleichungssystem / Matrixform in jeder Ansicht.
- Interne Rechnung mit exakten rationalen Zahlen.
- Pro Rechenschritt genau drei Auswahlmöglichkeiten.
- Genau eine Auswahl entspricht der festgelegten didaktischen Strategie.
- Bei einer ungünstigen Auswahl bleibt der Zustand unverändert; Pivot und relevante
  Einträge werden hervorgehoben und der günstigere Schritt erläutert. Danach muss
  der Hinweis mit "Weiter" bestätigt werden.

Festgelegte Strategie für den "besten" Schritt
----------------------------------------------
1. Spalten von links nach rechts bearbeiten.
2. Für die nächste Pivotposition eine vorhandene ±1 in der aktuellen Zeile beibehalten.
3. Ist dort keine ±1 vorhanden, eine +1 bzw. -1 aus einer tieferen Zeile bevorzugen.
4. Ist der aktuelle Eintrag bereits ungleich 0 und keine einfachere ±1 verfügbar,
   keinen unnötigen Zeilentausch durchführen.
5. Einen Pivot ungleich 1 durch Skalierung der gesamten Zeile auf 1 normieren.
6. Mit einem Pivot 1 alle von 0 verschiedenen Einträge darunter in einem Schritt
   eliminieren.
7. Nach abgeschlossener Vorwärtselimination:
   - Widerspruchszeile 0 = c mit c != 0 -> keine Lösung.
   - weniger als drei Pivotpositionen ohne Widerspruch -> unendlich viele Lösungen.
   - drei Pivotpositionen -> eindeutige Lösung.
8. Bei eindeutiger Lösung von rechts nach links alle Einträge oberhalb der Pivots
   eliminieren, bis links die Einheitsmatrix steht.

Dateien
-------
modules/gaussverfahren/index.html   Oberfläche
modules/gaussverfahren/app.js      Gauß-Engine, Quizlogik und Rendering
styles.css                         zusätzliche Styles am Dateiende

Hinweis
-------
"Bester Schritt" ist hier bewusst als feste didaktische Strategie definiert. Es gibt
bei Gauß häufig mehrere mathematisch zulässige Wege. Die beiden Distraktoren sind
zulässige bzw. plausible Umformungen, erfüllen aber das aktuelle Teilziel nicht so
unmittelbar wie die festgelegte optimale Aktion.
