# State Machine

## Session States
- `LOBBY`
- `INTRO`
- `PUZZLE_ACTIVE`
- `TRANSITION`
- `FINALE`
- `WON`
- `LOST`
- `PAUSED`

## Puzzle States
- `WAITING_FOR_SOLVER`
- `SOLVER_OFFERED`
- `SOLVER_ACCEPTED`
- `ACTIVE`
- `SOLVED`
- `SKIPPED`

## Solver Selection Rules
1. Nur verbundene Spieler berücksichtigen.
2. Bevorzugt Spieler mit `solver_count == 0`.
3. Ablehnende Person für das aktuelle Puzzle nicht erneut ziehen.
4. Zufällige Auswahl serverseitig.
5. Host kann neu ziehen.
6. Autorisierung serverseitig prüfen; UI-Sperre allein reicht nicht.

## Timer Authority
Der Server ist autoritativ. Clients rendern aus `endsAt`/Serverzeit, nicht aus einem eigenen unabhängigen Countdown.
