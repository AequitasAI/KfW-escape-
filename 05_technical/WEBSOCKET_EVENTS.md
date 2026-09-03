# WebSocket Events

## Client → Server

- `player:join`
- `player:rename`
- `solver:accept`
- `solver:decline`
- `puzzle:action`
- `host:start`
- `host:pause`
- `host:resume`
- `host:rerollSolver`
- `host:skipPuzzle`
- `host:reset`

## Server → Clients

- `session:snapshot`
- `player:list`
- `solver:offered`
- `solver:accepted`
- `solver:changed`
- `puzzle:state`
- `puzzle:solved`
- `game:transition`
- `game:won`
- `game:lost`
- `timer:sync`
- `error:public`

## Regel

Jede `puzzle:action` enthält:
- sessionId/code
- puzzleId
- actionType
- payload
- clientActionId

Server prüft:
1. Session aktiv
2. korrektes Puzzle
3. Player ist aktuell akzeptierter Solver
4. Aktion formal gültig
5. State-Reducer akzeptiert sie

Danach erst Broadcast.
