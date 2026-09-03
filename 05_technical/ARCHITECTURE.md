# Technische Architektur

## Empfehlung

Monorepo mit:
- Frontend: React + TypeScript + Vite
- Backend: Node.js + TypeScript + Fastify oder Express
- Realtime: Socket.IO
- Persistenz: SQLite
- Tests: Vitest + Playwright
- Deployment: Docker Compose

Andere vergleichbare Stacks sind zulässig, aber nicht ohne Grund wechseln.

## Komponenten

`web`
- host
- join
- game
- display
- puzzle components
- design tokens

`server`
- session manager
- player manager
- authoritative timer
- solver selection
- puzzle state reducers
- websocket authorization
- SQLite repository

## Security-Grundsätze

Auch wenn internes Spiel:
- keine Client-Autorität für Solverrechte
- serverseitige Validierung jeder Puzzle-Aktion
- Sessioncodes ausreichend zufällig
- Host-PIN/Host-Secret nicht im Client hardcoden
- Rate-Limit Join und WebSocket-Aktionen
- Anzeigenamen escapen/sanitizen
- keine HTML-Injection
- secure/sameSite Cookies bei HTTPS
- keine vertraulichen Daten loggen

## Sessioncode

6 Zeichen, gut lesbar, z. B. ohne `0/O/I/1`.
QR verlinkt direkt auf `/join/:code`.

## Player Identity

- servergenerierte UUID
- Cookie enthält opaque Player-ID/Session binding
- kein Name als Identitätsschlüssel
- Reconnect unterstützt

## Timer

Server speichert `startedAt`, `pausedAt`, `totalPausedMs`.
Clients erhalten periodisch Server-Snapshot bzw. `endsAt`.
Bei Browser-Backgrounding darf Timer nicht driften.

## Persistenz

SQLite reicht.
Session-State regelmäßig speichern, insbesondere nach:
- join/leave
- solver assignment
- accept/decline
- puzzle action
- puzzle solved
- pause/resume
- transition

## Deployment

Docker Compose:
- app
- persistentes Volume für SQLite
- healthcheck

Cloudflare Tunnel optional davor.
Keine eingehenden Router-Ports erforderlich, wenn Tunnel genutzt wird.

## Logging

Strukturiert, aber datensparsam:
- session lifecycle
- technische Fehler
- puzzle transitions
- websocket connect/disconnect
Keine IP-Adresse langfristig speichern, sofern nicht technisch zwingend.
