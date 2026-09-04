# CLAUDE START HERE

Du bist Lead Full-Stack Engineer für dieses Projekt.

## Ziel-Repository

https://github.com/AequitasAI/KfW-escape-

Arbeite in diesem Repository und richte das Projekt vollständig ein.

## Git-Regeln

1. Klone das Repository, falls noch nicht lokal vorhanden.
2. Arbeite NICHT direkt auf `main`.
3. Erzeuge den Branch:

`claude/mvp-build`

4. Committe nach jeder stabilen Phase.
5. Push den Branch regelmäßig auf GitHub.
6. Überschreibe keine fremden Änderungen.
7. Wenn du auf ein Kontext-/Arbeitslimit zuläufst:
   - keine neue große Aufgabe beginnen
   - aktuellen stabilen Stand sichern
   - Tests laufen lassen
   - `HANDOFF_STATUS.md` aktualisieren
   - committen und pushen
   - eine präzise Resume-Anweisung hinterlassen

## Handoff-Paket

Das gesamte Handoff-Paket in diesem Repository ist die verbindliche Source of Truth.

Lies zuerst vollständig:

1. `00_START_HERE/README.md`
2. `10_design/CODEX_EXEC_SUMMARY.md`
3. `10_design/DESIGN_DECISIONS_FOR_CODEX.md`
4. `10_design/DISPLAY_SCREEN_REQUIREMENTS.md`
5. `01_product/GAME_SPEC.md`
6. `01_product/STATE_MACHINE.md`
7. `02_story/STORY_AND_COPY.md`
8. `03_puzzles/PUZZLE_SPEC.md`
9. alle Dateien in `03_puzzles/`
10. `04_ux_ui/UX_UI_SPEC.md`
11. `04_ux_ui/SCENE_ART_DIRECTION.md`
12. alle Dateien in `05_technical/`
13. alle Dateien in `06_testing/`
14. `07_branding/OPENKFW_DESIGN_TOKENS.md`
15. `07_branding/BRANDING_README.md`
16. `08_assets/ASSET_BRIEF.md`

Nutze außerdem ausdrücklich diese visuellen Referenzen:

- `08_assets/concept_refs/concept_overview_coverboard.png`
- `08_assets/concept_refs/concept_game_screen_minen_des_betriebs.png`

Diese Bilder sind Mood-/Qualitätsreferenzen, keine 1:1-Pixelvorgabe.

## Produkt

Baue ein internes Multiplayer-Browsergame:

**Die Brücke zur Zwei-Programme-Welt**

Es ist ein ca. 10-minütiges Fantasy-Escape-Adventure für ein KBS-BA-Team.

### Kernmechanik

- 8–30+ Teilnehmer
- Join per QR-Code oder Sessioncode
- kein Login
- nur Anzeigename
- Cookie/opaque Player-ID für Reconnect
- Host erstellt Session
- zentrale Lobby
- globaler serverautoritärer 10-Minuten-Timer
- 5 lineare Prüfungen
- pro Prüfung ein zufällig ausgewählter Solver/Gefährte
- Solver sieht die Aufgabe zunächst nur
- Solver kann:
  - `Prüfung annehmen`
  - `An anderen Gefährten weitergeben`
- nach Annahme darf nur dieser Solver interagieren
- alle anderen sehen denselben Live-State und dürfen verbal helfen
- Solver-Weitergabe bevorzugt Spieler, die noch nicht dran waren
- alle Browser werden live synchronisiert
- Host hat Failsafes
- genau zwei Spielenden: WON / LOST
- keine Storybranches

## Fünf Prüfungen

### 1. Archiv der alten Bestände
Runen-/Reihenfolgelogik nach Spezifikation.

### 2. Die verlorene Verbindung
4×4 Sliding-Kabelpuzzle.
- Kacheln werden verschoben, nicht gedreht
- kontinuierliches Energiefluss-Feedback
- BFS-Testhelper
- fester, getesteter lösbarer Startzustand

### 3. Halle der Prüfmeister
Vier Unterschiede in zwei SVG-/HTML-Fantasy-Systemplänen finden.

### 4. Minen des Betriebs
Signature-Puzzle:
- fünf asymmetrische Zahnräder
- diskrete Drehpositionen
- genau eine globale Lösung
- Kontaktfeedback sichtbar
- bei kompletter Lösung:
  - Maschine startet
  - Zahnräder drehen synchron
  - Energiefluss
  - Zwerg reagiert
  - Tor öffnet
- die 4096 Zustände müssen automatisiert geprüft werden
- eindeutige Lösung gemäß Spec: `[0,3,3,6,7]`

### 5. Schwarzes Tor
Deduktions-Code-Rätsel.
Eindeutige Lösung: `042`.

Danach:
- fünf Siegel aktivieren sich
- Brücken-/Release-Finale
- Sieg, wenn Zeit > 0
- Niederlage bei 00:00

## Technischer Zielstack

Bevorzugt:

- React
- TypeScript
- Vite
- Node.js + TypeScript
- Socket.IO
- SQLite
- Vitest
- Playwright
- Docker Compose

Wenn das Repo bereits einen gleichwertigen, sauberen Stack enthält, nicht unnötig migrieren.

## Routen / Views

Mindestens:

### `/host`
- Session erstellen
- QR/Join-Link
- Lobby
- Start
- Pause/Resume
- Solver neu ziehen
- Rätsel überspringen
- Reset
- technischer Status

### `/join/:code`
- Anzeigename
- Join
- keine Mail/Passwortfelder

### `/game/:code`
- Player View
- aktueller Raum
- Timer
- Solverstatus
- Rätsel
- Solver-Controls nur bei Berechtigung

### `/display/:code`
- große Teams-/Beamer-Ansicht
- KEINE Admincontrols
- visuell hochwertig
- große Typografie
- Rätsel im Fokus
- Timer und 5er-Fortschritt
- Solvername
- atmosphärische Fantasy-Szene

## Realtime / Autorisierung

Der Server ist autoritativ.

Jede Puzzle-Aktion muss serverseitig prüfen:
1. Session aktiv
2. richtiges Puzzle
3. Player ist aktuell akzeptierter Solver
4. Aktion formal gültig
5. State-Reducer akzeptiert die Aktion

Danach Broadcast an alle Clients.

Clientseitige Disabled-Controls sind NICHT ausreichend.

## Timer

Serverautoritär.
Reload oder Browser-Backgrounding darf ihn nicht verfälschen.

## Persistenz

SQLite genügt.
Speichere kritische State-Übergänge so, dass ein Server-/Client-Reconnect das Spiel nicht zerstört.

## Branding / UI

Verbindliche UI-Basis ist openKfW Design Tokens:

- https://github.com/openkfw/design-tokens
- https://openkfw.github.io/design-tokens/

Lies die lokalen Branding-Dokumente vor der Implementierung.

Wichtig:
- funktionale/semantische KfW-Tokens bevorzugen
- keine Raw-Hex-Werte als angebliche KfW-Werte erfinden
- keine KfW-Logos, Fontdateien oder Bilder ungeprüft aus dem Web übernehmen
- Corporate UI und Fantasy-Art als getrennte Layer behandeln
- Game-spezifische Alias-Tokens `--game-*` sind erlaubt

## Visuelles Ziel

Das Spiel darf NICHT aussehen wie:
- ein Quiz
- ein Admin-Dashboard
- eine generische CRUD-App
- eine billige Fantasy-Fansite

Es soll aussehen wie:
> eine hochwertige Corporate-Webanwendung, in der ein kleines Fantasy-Browsergame stattfindet.

UI:
- modern
- clean
- openKfW-orientiert
- responsive
- accessible

Fantasy-Layer:
- atmosphärisch
- leicht episch
- humorvoll
- professionell statt kindlich

## Animationen

NICHT auf "später" verschieben.

Mindestens im MVP:
- Raumtransition
- Solver-Reveal
- Siegel erhalten
- Kabel-Energiefluss
- Prüfmeister-Stempel
- Zahnrad-Feedback
- Maschinenstart
- Toröffnung
- Brückenfinale
- Sieg/Niederlage

Aber:
- performant
- `prefers-reduced-motion`
- Gameplay nie unnötig blockieren

## Betriebszwerg

Der Betriebszwerg ist ein Side Character, keine reale Person.

Texte:
- Start: `Wer hat euch denn hier runtergelassen?`
- Teilfortschritt: `Hm.`
- fast geschafft: `Gar nicht völlig unfähig.`
- Erfolg: `ES LÄUFT! JETZT BLOSS NICHTS MEHR ANFASSEN!`

Wenn finale Art Assets noch fehlen:
- zunächst saubere Platzhalter/Layer verwenden
- Struktur so bauen, dass spätere hochwertige Figur-/Scene-Assets ohne Architekturumbau eingebunden werden können

## Qualität

- TypeScript strict
- keine kritischen TODO-Platzhalter
- Puzzlelogik separat testbar
- Accessibility
- Mobile + Desktop
- keine unnötigen Dependencies
- datensparsame Logs
- keine vertraulichen internen Daten
- keine echten Personen als Fantasyfiguren

## Implementierungsphasen

### Phase 0 – Repo Setup
- Repo prüfen
- Branch `claude/mvp-build`
- Projektstruktur
- README
- `.env.example`
- Docker Compose
- Healthcheck
- initialer stabiler Commit

### Phase 1 – Multiplayer Foundation
- Backend
- SQLite
- Socket.IO
- Session Manager
- Join
- Cookie-Reconnect
- Lobby
- Host View
- Display View
- Player View
- Server Timer
- Solver selection / accept / decline / reroll
- Tests

### Phase 2 – Puzzle Engine
- generisches Puzzle-State-Interface
- serverseitige Reducer
- Puzzle 1–5 vollständig
- Unit Tests
- eindeutige Lösungen nachweisen

### Phase 3 – Game Flow
- Intro
- Transitions
- Siegel
- Finale
- WON / LOST
- Host Failsafes
- Reconnect-Härtung

### Phase 4 – UI / Game Feel
- openKfW Token Integration
- hochwertige Display-Ansicht
- Animationen
- Responsive
- Accessibility
- Soundarchitektur + Mute

### Phase 5 – Hardening
- Playwright E2E
- Multi-Client-Test
- 30-Client-Smoke-Test
- Docker-Test
- Fehlerfälle
- Dokumentation
- Deployment-Anleitung für Debian + Cloudflare Tunnel

## Nach jeder Phase

1. Tests ausführen.
2. `HANDOFF_STATUS.md` aktualisieren.
3. Commit erstellen.
4. Push auf `claude/mvp-build`.
5. Erst danach nächste Phase.

## Wenn Arbeitslimit naht

NICHT weiter improvisieren.

Stattdessen:
- aktuellen stabilen Stand abschließen
- Tests laufen lassen
- `HANDOFF_STATUS.md` schreiben
- Commit
- Push
- präzise Resume-Anweisung

## Definition of Done

V1 ist fertig, wenn:
- Host eine Session vollständig ohne DevTools bedienen kann
- 20+ Spieler joinen können
- Reload/Reconnect funktioniert
- Solver-Weitergabe funktioniert
- Nicht-Solver serverseitig blockiert werden
- Timer korrekt ist
- alle 5 Rätsel funktionieren
- Zahnradlösung automatisiert eindeutig bewiesen ist
- Kabelpuzzle per Test lösbar ist
- Display-Ansicht hochwertig wirkt
- Spiel komplett von Lobby bis Sieg/Niederlage durchspielbar ist
- Docker Compose auf Linux startet
- Deployment-Anleitung vorhanden ist

## Arbeitsweise

Nicht nur analysieren oder planen.

Lies die Spezifikationen, prüfe den Repository-Zustand und **beginne dann unmittelbar mit Phase 0 und Phase 1**.

Treffe selbst vernünftige technische Detailentscheidungen, sofern die Handoff-Dokumente sie nicht bereits festlegen.

Frage den Nutzer nicht nach Dingen, die aus dem Paket ableitbar sind.

Ziel ist ein funktionierender, getesteter, commiteter und gepushter MVP.
