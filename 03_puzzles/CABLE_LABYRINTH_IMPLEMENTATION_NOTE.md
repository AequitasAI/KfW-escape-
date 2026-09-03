# Kabel-Labyrinth – Implementierungsnotiz

Dieses Rätsel benötigt vor dem finalen Merge noch einen tatsächlich getesteten Board-State.

Codex soll NICHT irgendein hübsches 4×4-Raster hardcoden.

Vorgehen:
1. Einen gelösten 4×4-Zustand mit exakt einem leeren Feld definieren.
2. Sicherstellen, dass ein kontinuierlicher Kabelpfad von linkem Source-Port zum rechten Target-Port existiert.
3. Startzustand ausschließlich durch 8–16 legale Sliding-Moves aus dem Sollzustand erzeugen.
4. Einen kleinen BFS-Solver als Testhelper implementieren.
5. Test muss bestätigen:
   - Start ist lösbar.
   - Kein illegaler Tile-Sprung.
   - Zielzustand wird korrekt erkannt.
   - Energie-Traversal markiert nur wirklich verbundene Segmente.
6. Falls mehrere Zielanordnungen denselben Source→Target-Pfad erlauben, ist das okay, solange das Spiel dadurch nicht trivial wird.
7. Den final gewählten Startzustand als Fixture einfrieren.

Interaktion:
- Primär: Tap auf eine an das Leerfeld angrenzende Kachel.
- Desktop optional zusätzlich Drag.
- Keine Drehung der Kacheln.
