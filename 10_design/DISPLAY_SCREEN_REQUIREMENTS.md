# Display Screen Requirements

Diese Datei beschreibt nur die Großbild-/Screenshare-Ansicht.

## Ziel
Der Display-Screen muss so gut aussehen, dass die Gruppe sofort denkt:
> "Okay, das ist ein richtiges Spiel."

## Muss enthalten
- Spieltitel oder Stationskontext
- Fortschritt 1/5 bis 5/5
- globalen Timer groß sichtbar
- Story-/Raumtitel
- zentrales Rätsel groß und gut lesbar
- Solvername
- kurze Hilfs-/Statusinfo
- Erfolgstransitionen
- Sieg-/Niederlagen-Endscreen

## Darf NICHT enthalten
- technische Debugdetails
- Host-Failsafes
- rohe JSON-Zustände
- enge mobile Panels
- Formulare aus der Join-Sicht

## Bildkomposition
- Hintergründe groß, atmosphärisch
- Rätsel im visuellen Fokus
- UI-Panels klar davon abgesetzt
- Text immer kontrastreich lesbar
- nicht zu viele kleine Details

## Station 4 / Minen des Betriebs – Idealbild
- große Maschine links/rechts
- fünf Zahnräder zentral
- Energiefluss sichtbar
- Tor am Ende
- Betriebszwerg als Character unten/rechts oder seitlich
- Fortschritt und Timer oben
- Solver-Panel unten

## Responsive Logik
Display ist primär Desktop / 16:9.
Nicht mobile-first denken.
Eigene Route `/display/:code`.

## Technische Empfehlung
- Scene als mehrlagiges Layout
- Puzzle-Layer getrennt von Deko-Layern
- UI-Layer separat
- Animationen über CSS/Framer Motion/JS sparsam und performant
