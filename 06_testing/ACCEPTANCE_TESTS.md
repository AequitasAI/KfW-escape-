# Acceptance Tests

## Kritische E2E-Fälle

### Lobby
- Host erstellt Session.
- QR/Join-Link funktioniert.
- 25 simulierte Spieler können joinen.
- identische Namen sind erlaubt, IDs bleiben eindeutig.
- Reload stellt Player wieder her.

### Solver
- genau ein Solver wird angeboten.
- Nicht-Solver kann keine Puzzle-Aktion serverseitig durchführen.
- Solver kann ablehnen.
- neuer Solver war noch nicht Solver und hat aktuelles Puzzle noch nicht abgelehnt.
- Solver kann annehmen.
- Host kann Solver neu ziehen.
- Disconnect des Solvers blockiert Spiel nicht; Host kann neu ziehen.

### Timer
- startet serverseitig bei Host-Start.
- 10:00 korrekt.
- Browserrefresh verändert verbleibende Zeit nicht.
- Pause stoppt serverseitig.
- Resume setzt korrekt fort.
- bei 00:00 `LOST`.

### Puzzle 1
- nur exakte Runenreihenfolge löst.
- Lösung eindeutig.

### Puzzle 2
- nur angrenzende Kachel darf ins Leerfeld.
- kein Rotieren.
- Energietraversal korrekt.
- fixierter Startzustand per BFS lösbar.
- Zielverbindung löst automatisch.

### Puzzle 3
- exakt vier Hotspots.
- jeder Hotspot nur einmal zählbar.
- Fehlklick löst nicht.
- alle vier → solved.

### Puzzle 4
- 4096 bewegliche Orientierungszustände enumerieren.
- genau eine globale Lösung.
- erwartete Lösung `[0,3,3,6,7]`.
- Kontaktglow entspricht Kompatibilitätsregel.
- Endanimation erst bei kompletter Kette.

### Puzzle 5
- `042` löst.
- andere Codes nicht.
- führende Null funktioniert.
- Hinweistext bleibt sichtbar.

### Finale
- Sieg nur, wenn alle fünf solved/host-skipped und Zeit > 0.
- Restzeit korrekt.
- Display und Player zeigen gleichen Ausgang.

## Browser
Mindestens:
- Chrome Android
- Chrome Desktop
- Edge Desktop
- Safari iOS, wenn verfügbar

## Performance
- 30 gleichzeitige Clients lokal testen.
- Puzzle-Aktion sichtbar auf anderen Clients typischerweise < 300 ms im normalen Netz.
