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
- Rätsel testen ohne Session, Anmeldung und Mitspieler: <http://localhost:5173/demo>

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
| `/demo`, `/demo/:nr` | Übungsraum: alle fünf Prüfungen allein durchspielen – ohne Session, ohne Anmeldung, ohne Gefährten |

## Die Prüfungen

Die Gruppe kennt fünf Stationen. Es sind sechs – die letzte taucht erst auf, wenn sie dran ist
(siehe „Der falsche Sieg" weiter unten). Der Fortschrittspfad zeigt sie bis dahin nicht.

| # | Station | Mechanik | Beweis |
|---|---|---|---|
| 1 | Archiv der alten Bestände | Runenreihenfolge | 120 Permutationen → genau eine Lösung |
| 2 | Die verlorene Verbindung | 4×4 Sliding-Kabelpuzzle | BFS beweist Lösbarkeit des eingefrorenen Startzustands |
| 3 | Halle der Prüfmeister | fünf subtile Abweichungen in zwei gezeichneten Prüfplänen | genau fünf Befunde in zwölf überlappungsfreien Prüffeldern |
| 4 | Minen des Betriebs | Kette aus 5 Rädern zwischen festem Motor und Tor, Steckverbindungen in vier Formen | alle 8⁵ = 32768 Zustände → genau eine Lösung `[2,1,4,4,3]` |
| 5 | Das Schwarze Tor | Deduktions-Code | alle 1000 Codes → genau einer (`042`) |
| 6 | Prüfung des Runenmeisters | drei Tore, genau eine wahre Inschrift; Weg **und** wahre Inschrift benennen – **ein einziger Versuch** | alle 9 Kombinationen → genau eine widerspruchsfreie |

### Der falsche Sieg

Nach dem Schwarzen Tor sieht alles nach Sieg aus: fünf Siegel, das Tor offen, die Brücke baut sich
auf, „Die Brücke erwacht". Drei Sekunden später grollt es, die Energie bleibt stehen und mitten auf
der Brücke steigt ein Tor aus dem Stein – „Eine letzte Prüfung bleibt". Erst danach öffnet Prüfung 6.

Die Sequenz ist eine eigene Phase (`FALSE_VICTORY`, 6,5 s), getaktet vom Server, damit Spieler-,
Grossbild- und Spielleitungsansicht im selben Moment umschlagen. Die Spielleitung kann sie
überspringen; bei `prefers-reduced-motion` bleiben beide Bilder ohne Bewegung stehen.

## Anspielungen im Hintergrund

Die Fantasywelt ist die Förderwelt als Landkarte: Akademien von Studoria, die Wohnlande, die
Gewölbe der Altschulden, HuHi als dunkles Gebirge am Horizont – dazu kleine Runensteine mit
Programmnummern und ein wiederkehrendes BnD-Siegel. Ein bis drei erkennbare Anspielungen pro Bild,
sonst Fantasy; erklärt wird nichts.

Alle Marken stehen zentral in `packages/shared/src/lore.ts` (Ort in Prozent, Text, Sichtbarkeit)
und werden von `SceneLore` als eigene Ebene über dem Szenenbild gezeichnet. Eine neue Anspielung ist
ein Eintrag in dieser Datei, keine Codeänderung.

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
