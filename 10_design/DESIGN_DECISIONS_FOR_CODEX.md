# Design Decisions for Codex

Dieses Dokument ist die verdichtete, verbindliche Design- und Produktentscheidung für den MVP.

## 1. Produktvision

Wir bauen **kein Quiz**, sondern ein kleines browserbasiertes **Fantasy-Escape-Adventure** für ein internes KBS-BA-Team.

Das Spiel soll sich anfühlen wie:
- leicht episch
- humorvoll
- teamfähig
- in 10 Minuten komplett spielbar
- technisch einfach genug, um stabil gebaut und getestet zu werden

## 2. Kerngedanke

Eine Gruppe von Kolleginnen und Kollegen joint per QR-Code ohne Login.
Alle sehen das gleiche Spiel.
Pro Rätsel darf immer nur **ein Gefährte / Solver** aktiv bedienen.
Alle anderen helfen.

Das Spiel ist **linear**, nicht verzweigt.

Warum?
- einfacher testbar
- robuster im Live-Einsatz
- verständlicher für die Gruppe
- deutlich realistischer für einen ersten Codex-MVP

## 3. Welt / Narrativ

Arbeitstitel:
**Die Brücke zur Zwei-Programme-Welt**

Story-Prinzip:
- keine echten internen Details
- keine echte Person als Figur
- keine Organisationseinheit als echter "Bösewicht"
- Fantasywelt mit leichtem KfW-/BA-Flavor

Die Gruppe muss fünf Prüfungen bestehen und die Brücke zur Zwei-Programme-Welt wiederherstellen.

## 4. Visuelle Leitidee

**Corporate UI + Fantasy Art**

Das ist die wichtigste gestalterische Entscheidung.

Nicht bauen:
- generische Fantasy-Fansite
- wild ornamentierte Mittelalter-UI
- internes Fachtool mit lieblosen Illustrationen

Sondern bauen:
- saubere moderne UI mit openKfW-Design-Tokens
- darüber/ dahinter hochwertige Fantasy-Szenen
- klare Typografie
- ruhige Buttons, Panels, Timer, Statusleisten
- epische, atmosphärische Hintergründe

Die Anwendung soll wirken wie:
> eine hochwertige KfW-Anwendung, in der ein Fantasy-Abenteuer stattfindet.

## 5. Referenzbilder in diesem Paket

Die folgenden Bilder sind **Mood- und Layout-Referenzen**, nicht 1:1 umzusetzen:

- `08_assets/concept_refs/concept_overview_coverboard.png`
  - Pitch-/Coverboard-Look
  - zeigt Tonalität, Themen, Informationsarchitektur

- `08_assets/concept_refs/concept_game_screen_minen_des_betriebs.png`
  - Zielniveau für einen einzelnen Spielscreen
  - besonders relevant für:
    - UI-Overlay-Struktur
    - Timer
    - Fortschritt über 5 Prüfungen
    - Raum-Inszenierung
    - Betriebszwerg als Side Character
    - Gear-Puzzle-Präsentation

## 6. Zielplattform

- Host auf Desktop/Beamer/Teams-Screenshare
- Spieler überwiegend mobil im Browser
- Keller-Backend, Docker-basiert
- optional Cloudflare Tunnel davor

## 7. Was V1 unbedingt können muss

1. Session erstellen
2. QR-Code / Join-Link anzeigen
3. Spieler ohne Login joinen lassen
4. Anzeigename speichern
5. Reconnect über Cookie
6. Lobby anzeigen
7. Spiel starten
8. 10-Minuten-Server-Timer
9. 5 lineare Prüfungen
10. pro Prüfung Solver-Auswahl
11. Solver kann annehmen oder weitergeben
12. nur Solver darf bedienen
13. alle Clients sehen Live-Updates
14. Sieg-/Niederlagen-Endscreen
15. Host-Failsafes

## 8. Was V1 explizit NICHT braucht

- Accounts
- Mail-Login
- Rollen-/Rechtesystem außer Host + Solverlogik
- Imposter-Modus
- Branching Story
- freie Texteingaben als Spielmechanik
- Chatfunktion als Muss
- Highscore-Datenbank
- externe KI-API
- öffentliches Hosting als Produkt

## 9. Inhaltliche Dramaturgie der fünf Prüfungen

### Prüfung 1 – Archiv der alten Bestände
Typ: Logik / Anordnung
Ziel: Runen korrekt anordnen
Gefühl: Einstieg, gemeinsames Kombinieren

### Prüfung 2 – Die verlorene Verbindung
Typ: Sliding-/Kabelpuzzle
Ziel: Verbindung zwischen Quelle und Ziel wiederherstellen
Gefühl: technisch, verständlich, visuelles Live-Feedback

### Prüfung 3 – Halle der Prüfmeister
Typ: Unterschiede finden
Ziel: exakt vier Unterschiede erkennen
Gefühl: Testmanagement-Vibe, genauer Blick

### Prüfung 4 – Minen des Betriebs
Typ: Zahnradpuzzle
Ziel: asymmetrische Zahnräder in exakt eine globale korrekte Konfiguration bringen
Gefühl: visuelles Signature-Puzzle, starker Payoff

### Prüfung 5 – Schwarzes Tor
Typ: Deduktions-/Code-Rätsel
Ziel: dreistelligen Code 042 finden
Gefühl: letzter Gatekeeper, klassisches Finale vor dem Sieg

Danach: Brücken-/Release-Finale

## 10. Design-Philosophie pro Puzzle

Jedes Rätsel soll:
- in ca. 45–100 Sekunden lösbar sein
- ohne Fachwissen funktionieren
- trotzdem thematisch passend gerahmt sein
- nicht nach Multiple Choice aussehen
- gutes Feedback geben

## 11. Signatur-Puzzle: Zahnräder

Die wichtigste Detailentscheidung:

Das Zahnradpuzzle ist **nicht** nur Dekoration.

- mehrere Zahnräder
- diskrete Drehpositionen
- nur eine globale Lösung
- Teilfortschritt sichtbar
- bei kompletter Lösung startet die Maschine sichtbar
- Zahnräder drehen sich dann synchron animiert
- Betriebszwerg kommentiert den Erfolg

Das ist der "Wow"-Moment im Spiel.

## 12. Solver-Mechanik

Diese Mechanik bleibt verbindlich:

- pro Prüfung ein zufällig ausgewählter Solver
- zunächst nur angeboten
- Buttons:
  - `Prüfung annehmen`
  - `An anderen Gefährten weitergeben`
- erst nach Annahme werden Controls aktiviert
- lehnt jemand ab, wird ein anderer Spieler zufällig gezogen, vorzugsweise jemand, der noch nicht dran war

Warum wichtig?
- vermeidet Chaos
- jeder kann mitdenken
- einzelne Personen werden punktuell eingebunden
- robust gegen "kein Bock", Technikprobleme oder fehlendes Screensharing

## 13. Display-/Host-/Player-Aufteilung

### Display View
Nur für den Großbildschirm / Teams-Screenshare.
Reduziert, groß, schön, ohne Admincontrols.

### Host View
Adminsteuerung für Spielleiter.
Mit Failsafes.

### Player View
Auf Mobilgeräten.
Kann denselben Raum sehen.
Nur Solver interaktiv.

## 14. Animationen

Codex soll Animationen nicht weglassen.

Pflichtanimationen:
- Raumwechsel
- Siegel erhalten
- aktiver Energiefluss im Kabelpuzzle
- Prüfmeister-Stempel
- Zahnrad-Maschinenstart
- Toröffnung
- Brückenfinale

Aber:
- performant
- mit `prefers-reduced-motion`
- keine Game-Logik in zu langen Animationen verstecken

## 15. Audio

Optional, aber vorgesehen.
Mindestens Architektur dafür anlegen.

Sounds:
- Klicks
- Clunk/Mechanik
- Tor
- Stempel
- Finale

Mute-Button Pflicht.

## 16. Corporate Design

Verbindliche UI-Grundlage:
**openKfW Design Tokens**

Nicht selbst Farben schätzen.
Nicht KfW-ähnliche Hexwerte erfinden.
Nicht Logos/Fonts ungeprüft kopieren.

Die UI soll tokenisiert sein, damit später Branding zentral angepasst werden kann.

## 17. Bildsprache

Die Referenzbilder zeigen die gewünschte Richtung:
- professionell
- UI-stark
- atmosphärisch
- hochwertig
- leicht cinematisch

Falls im MVP keine finalen Art Assets vorliegen:
- zunächst neutrale, stilisierte Szenen / SVG-Hintergründe möglich
- aber Layout und Layer-Struktur direkt so bauen, dass später hochwertige Assets leicht eingebunden werden können

## 18. Realismus-Einschätzung

Sehr realistisch für Codex:
- Multiplayer-Sessionlogik
- Lobby + QR + Cookie-Reconnect
- Timer
- Solver-Mechanik
- Puzzles
- State Persistence
- Dockerisierung
- Display-/Host-/Player-Views
- polished Frontend mit guten Übergängen

Weniger realistisch nur durch Codex allein:
- perfekte finale Fantasy-Illustrationen

Deshalb:
- Art möglichst separat referenzieren / später ergänzen
- App-Struktur jetzt schon darauf vorbereiten

## 19. Implementierungsreihenfolge

1. Multiplayer-/Session-Foundation
2. Host / Join / Display / Player Views
3. Timer / Solver-Flow
4. Puzzles als sauber getrennte Module
5. Transitions / Siegel / Endscreens
6. Design-Token-Anbindung
7. Polish / Responsiveness / Accessibility
8. Asset-Integration

## 20. Definition of Good

Das Spiel ist gut, wenn:
- eine Gruppe es ohne große Erklärung versteht
- alles in 10 Minuten spielbar ist
- die Rätsel nicht wie ein Schulungsquiz wirken
- der Display-Screen "wow" macht
- das Ganze intern wie ein kleines echtes Browsergame wirkt
- es technisch stabil genug für ein Live-Team-Event ist
