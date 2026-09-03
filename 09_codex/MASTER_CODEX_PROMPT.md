# MASTER CODEX PROMPT

Du übernimmst dieses Repository als Lead Full-Stack Engineer für ein kleines internes Multiplayer-Browsergame.

## Zuerst lesen
Lies vollständig:
1. `00_START_HERE/README.md`
2. `01_product/GAME_SPEC.md`
3. `01_product/STATE_MACHINE.md`
4. `02_story/STORY_AND_COPY.md`
5. `03_puzzles/PUZZLE_SPEC.md`
6. alle JSON-/MD-Dateien in `03_puzzles/`
7. `04_ux_ui/UX_UI_SPEC.md`
8. `05_technical/*`
9. `06_testing/*`
10. `07_branding/BRANDING_README.md`
11. `08_assets/ASSET_BRIEF.md`

## Ziel
Baue einen produktionsnahen V1-MVP von **"Die Brücke zur Zwei-Programme-Welt"**.

Technik bevorzugt:
- React + TypeScript + Vite
- Node.js + TypeScript
- Socket.IO
- SQLite
- Vitest
- Playwright
- Docker Compose

Falls das bestehende Repo bereits einen guten äquivalenten Stack hat, nicht unnötig migrieren.

## Unverhandelbare Produktregeln
- kein Login/Account
- Join via Sessioncode/QR + Anzeigename
- Cookie/opaque Player-ID für Reconnect
- globaler serverautoritärer 10-Minuten-Timer
- 5 lineare Rätsel
- pro Rätsel genau ein Solver
- Solver muss aktiv "Prüfung annehmen"
- Solver kann an noch nicht eingesetzten Gefährten weitergeben
- alle sehen denselben Live-State
- nur Solver kann serverseitig autorisierte Puzzle-Aktionen ausführen
- Host-Failsafes
- zwei Enden: WON / LOST
- keine Storybranches

## Branding
Verbindliche Designbasis ist die öffentliche openKfW Design-Token-Source:
- https://github.com/openkfw/design-tokens
- https://openkfw.github.io/design-tokens/

Lies `07_branding/OPENKFW_DESIGN_TOKENS.md` vollständig.

Vor Einbau einer npm-Dependency oder eines Build-Artefakts:
- aktuellen maintained Stand der Source prüfen
- keine deprecated/EOL-Paketversion blind verwenden
- funktionale/semantische KfW-Tokens bevorzugen
- keine KfW-Werte als Raw-Hex duplizieren, wenn ein Token existiert
- keine Logos, Fontdateien, Icons oder Bilder ungeprüft aus öffentlicher Source übernehmen
- Fantasy-spezifische Farben über `--game-*` Aliase sauber von Corporate-Tokens trennen

Falls zusätzlich ein intern freigegebener Brand-Guide/Assets in `07_branding/approved_assets/` liegt, dessen Regeln ergänzend beachten.

## UI-Ziel
Logik simpel, Präsentation polished.
Es soll wie ein kleines Browsergame wirken, nicht wie ein Admin-Dashboard.
Animationen sind erwünscht, dürfen aber Game-State/Accessibility nicht beschädigen.

## Implementierungsreihenfolge
### Phase 1 – Foundation
- Repo/monorepo
- DB
- Session API
- Socket connection
- Host/Join/Game/Display-Routen
- Docker
- healthcheck

### Phase 2 – Multiplayer Engine
- Lobby
- QR
- Player reconnect
- solver selection
- accept/decline/reroll
- authoritative timer
- host controls
- snapshots/recovery

### Phase 3 – Puzzles
Implementiere exakt nach Spec:
1. Runen
2. Kabel-Labyrinth
3. Prüfmeister
4. Zahnräder
5. Schwarzes Tor

Für P2 einen BFS-Testhelper bauen und finalen Fixture-State einfrieren.
Für P4 alle 4096 Zustände enumerieren und exakt eine Lösung beweisen.

### Phase 4 – Game Feel
- transitions
- feedback animation
- seal collection
- gear payoff
- gate
- finale
- mute/sound architecture
- reduced-motion

### Phase 5 – Hardening
- E2E
- 30-client smoke/load simulation
- reconnect
- mobile layout
- error handling
- rate limits
- host recovery

## Qualitätsregeln
- TypeScript strict
- keine TODO-Platzhalter in kritischem Flow
- keine Client-only Autorisierung
- State Reducer / serverseitig deterministisch
- keine "magic numbers" ohne Namen
- Puzzlelogik separat testbar
- responsive
- Tastatur-/Tap-Alternativen
- Logs datensparsam

## Checkpoint-Regel
Nach JEDER Phase:
1. Tests ausführen.
2. `HANDOFF_STATUS.md` aktualisieren:
   - erledigt
   - offene Punkte
   - bekannte Bugs
   - genaue nächste Schritte
   - relevante Commands
3. sauberen Git-Commit erzeugen.
4. Nie eine große Änderung halb fertig in uncommittetem Zustand liegen lassen.

Wenn Arbeits-/Kontextlimit naht:
- keine neue Phase beginnen
- aktuellen konsistenten Stand sichern
- Tests ausführen
- `HANDOFF_STATUS.md` vollständig schreiben
- committen
- dort eine präzise Resume-Anweisung hinterlassen

## Definition of Done
V1 ist fertig, wenn:
- alle P0-Tests in `06_testing/TEST_MATRIX.csv` bestehen
- zwei Browser können denselben Puzzle-State live sehen
- 20+ simulierte/echte Spieler joinen können
- Solverwechsel funktioniert
- alle 5 Rätsel testbar und eindeutig/solvable sind
- Refresh keinen Game-State zerstört
- Timer korrekt ist
- Docker Compose auf einem lokalen Linuxserver startet
- Host das komplette Spiel ohne DevTools durchführen kann

Beginne mit einer kurzen Repo-Analyse. Danach implementiere Phase 1. Frage nicht nach Dingen, die aus den Spezifikationen eindeutig hervorgehen.
