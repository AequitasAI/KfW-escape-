# Die Brücke zur Zwei-Programme-Welt

Internes browserbasiertes Multiplayer-Fantasy-Escape-Adventure für ein KBS-BA-Team.
8–30+ Personen joinen per QR-Code ohne Login und lösen gemeinsam in **10 Minuten** fünf Prüfungen.
Pro Prüfung steuert genau **ein zufällig bestimmter Gefährte**, alle anderen sehen denselben Live-Zustand und beraten.

Die verbindliche Produkt-, Design- und Technik-Spezifikation liegt in diesem Repository
(`00_START_HERE/` … `11_claude/`, Einstieg: [`CLAUDE_START_HERE.md`](./CLAUDE_START_HERE.md)).

---

## Schnellstart (lokal)

```bash
npm install
cp .env.example .env
npm run dev
```

- Spielleitung: <http://localhost:5173/host>
- Spieler: Join-Link/QR aus der Host-Ansicht
- Großbild/Teams: `/display/<CODE>`

Der Vite-Dev-Server (Port 5173) proxyt `/api` und `/socket.io` auf den Node-Server (Port 3001).

## Schnellstart (Docker)

```bash
cp .env.example .env          # PUBLIC_BASE_URL auf die real erreichbare URL setzen
docker compose up --build -d
docker compose ps             # healthcheck muss "healthy" zeigen
```

Danach läuft alles auf einem Port (Default 3001): der Node-Server liefert die gebaute SPA
und die WebSocket-Verbindung aus.

---

## Architektur

```
packages/shared   reine, framework-freie Spiel- und Rätsellogik + Typen (Vitest)
packages/server   Node 22 + Express + Socket.IO + SQLite, autoritativer Spielzustand
packages/web      React 18 + TypeScript + Vite, Views: host / join / game / display
e2e               Playwright End-to-End-Tests
```

**Der Server ist autoritativ.** Jede Rätselaktion wird serverseitig gegen fünf Bedingungen geprüft
(Session aktiv → richtiges Puzzle → Absender ist der akzeptierte Solver → Aktion formal gültig →
Reducer akzeptiert sie). Erst danach wird an alle Clients gebroadcastet. Deaktivierte Buttons im
Client sind ausschließlich Komfort, nie Autorisierung.

Der 10-Minuten-Timer läuft serverseitig aus `startedAt` / `totalPausedMs`. Clients rendern gegen
`endsAt` mit Server-Offset-Korrektur, dadurch verändern Reload oder Browser-Backgrounding die
verbleibende Zeit nicht.

## Routen

| Route | Zweck |
|---|---|
| `/` | Landing: Session erstellen oder Code eingeben |
| `/host` | Session erstellen |
| `/host/:code` | Kontrollzentrum der Spielleitung inkl. Failsafes |
| `/join/:code` | Anzeigename eingeben, beitreten (kein Login, keine Mail) |
| `/game/:code` | Spieleransicht (mobile-first) |
| `/display/:code` | Großbild-/Beamer-/Teams-Ansicht, ohne jede Adminsteuerung |

## Die fünf Prüfungen

| # | Station | Mechanik | Beweis |
|---|---|---|---|
| 1 | Archiv der alten Bestände | Runenreihenfolge | 120 Permutationen → genau eine Lösung |
| 2 | Die verlorene Verbindung | 4×4 Sliding-Kabelpuzzle | BFS beweist Lösbarkeit des eingefrorenen Startzustands |
| 3 | Halle der Prüfmeister | 4 Unterschiede in zwei SVG-Plänen | genau vier Hotspots, jeder einmal zählbar |
| 4 | Minen des Betriebs | 5 asymmetrische Zahnräder | alle 8⁴ = 4096 Zustände → genau eine Lösung `[0,3,3,6,7]` |
| 5 | Das Schwarze Tor | Deduktions-Code | alle 1000 Codes → genau einer (`042`) |

## Befehle

```bash
npm run dev         # Server + Web im Watch-Modus
npm run build       # shared -> server -> web bauen
npm run typecheck   # TypeScript strict über alle Pakete
npm test            # Vitest (Rätsellogik, Spielablauf, Autorisierung)
npm run test:e2e    # Playwright (baut und startet die App selbst)
npm run verify      # typecheck + test
```

## Branding

Verbindliche UI-Basis sind die openKfW Design Tokens. Details, aktueller Integrationsstand und
die Anleitung zum Einspielen des maintained Token-Builds:
[`docs/BRANDING_INTEGRATION.md`](./docs/BRANDING_INTEGRATION.md).

## Deployment

Debian + Docker Compose + optional Cloudflare Tunnel: [`docs/DEPLOYMENT.md`](./docs/DEPLOYMENT.md).

## Datensparsamkeit

Gespeichert werden ausschließlich Anzeigename, eine servergenerierte opake Player-ID und
Spielfortschritt. Keine Mailadresse, kein Passwort, kein Mitarbeiterkennzeichen, keine
dauerhafte IP-Speicherung. Alle Daten einer Session sind mit dem Löschen der SQLite-Datei weg.
