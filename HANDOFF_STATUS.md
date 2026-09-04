# HANDOFF STATUS

## Letzter stabiler Commit
Siehe `git log -1` auf `claude/mvp-build`.

## Aktueller Stand
- [x] Phase 0 Repo Setup
- [x] Phase 1 Multiplayer Foundation
- [x] Phase 2 Puzzle Engine
- [x] Phase 3 Game Flow
- [x] Phase 4 UI / Game Feel
- [x] Phase 5 Hardening
- [x] Branding-Entscheidung dokumentiert und umgesetzt (`docs/BRANDING_INTEGRATION.md`)
- [x] Fantasy-Ebene als SVG (Szenen, Betriebszwerg, Schwarzer Wächter)
- [x] Acht gerenderte Szenen-Illustrationen eingebunden
- [x] Gemalte Figuren-Illustrationen (Zwerg 3 Stimmungen, Wächter 2 Zustände)
- [x] Art Direction auf warme Märchenfantasy umgestellt (kein Cyan, Cinzel/EB Garamond, KfW-Flavour)
- [x] Login der Spielleitung (`HOST_PASSWORD`), Steuerung von jedem Gerät aus
- [x] Dreissig Sigel der Gefährten, serverseitig und dopplungsfrei vergeben

## Funktioniert

**Multiplayer**
- Session erstellen, QR-Code (SVG), Join-Link, Beitritt ohne Login (nur Anzeigename).
- Identität über servergenerierte UUID + Token, HttpOnly-Cookie plus localStorage-Spiegel.
- Reload/Reconnect stellt Spieler und Spielzustand wieder her.
- Serverneustart: laufende Sessions werden aus SQLite geladen und pausiert, damit keine
  Zeit verloren geht; ein Klick auf „Fortsetzen“ läuft weiter.
- 30 gleichzeitige Clients getestet (`packages/server/test/load.test.ts`).

**Spielleitung**
- Optionaler Login über `HOST_PASSWORD`. Ist er gesetzt, kann die Spielleitung sich von jedem
  Gerät anmelden, laufende Sessions auflisten und übernehmen – der Host-Schlüssel ist dann nicht
  mehr an den erstellenden Browser gebunden. Ohne Passwort bleibt das alte Verhalten.
- Mit Login setzt auch das Anlegen einer Session die Anmeldung voraus.
- Signaturschlüssel liegt in SQLite, ein Neustart meldet die Spielleitung also nicht ab.
- Zehn **Fehlversuche** pro fünf Minuten und Quell-IP sperren den Login; erfolgreiche Anmeldungen
  zählen nicht mit, sonst sperrt sich ein Büro hinter einem NAT selbst aus. Passwortvergleich in
  konstanter Zeit, Token HMAC-signiert und nach 12 Stunden abgelaufen.
- Teilnehmende sind davon unberührt: weiterhin nur Anzeigename, kein Konto.

**Sigel**
- Dreissig Sigel, vom Server zufällig und ohne Dopplung vergeben, in Lobby, Hostliste,
  Grossbildansicht und Gefährten-Einblendung identisch.
- Als SVG gezeichnet; gemalte Wappen lassen sich einzeln darüberlegen.

**Autorisierung**
- Jede `puzzle:action` durchläuft serverseitig die fünf Prüfungen aus WEBSOCKET_EVENTS.md.
- Nicht-Solver werden serverseitig abgewiesen, auch wenn sie das Event direkt senden.
- Host-Aktionen erfordern das Host-Secret aus der Socket-Auth.
- Rate-Limits auf Join, Session-Anlage, Socket-Controls und Puzzle-Aktionen.

**Timer**
- Serverautoritär aus `startedAt` / `totalPausedMs` / `bonusMs`.
- Reload, Tab-Wechsel und Backgrounding verändern die verbleibende Zeit nicht (E2E-geprüft).
- Pause/Resume, +30 s als markierter Host-Eingriff, harter Verlust bei 00:00.

**Rätsel** – alle fünf vollständig, alle Lösungen automatisiert bewiesen:
| # | Beweis | Ergebnis |
|---|---|---|
| 1 | 120 Permutationen gegen die drei Hinweise | genau eine Lösung |
| 2 | Startzustand aus 15 legalen Slides erzeugt, BFS-Solver | lösbar in 13 optimalen Zügen (Ziel 8–16) |
| 3 | Hotspot-Registry | genau vier, jeder einmal zählbar |
| 4 | alle 8⁴ = 4096 Konfigurationen enumeriert | genau eine Lösung `[0,3,6,2,5]`, 10 Drehungen |
| 5 | alle 1000 Codes gegen die fünf Aussagen | genau einer (`042`) |

**Views**
- `/`, `/host`, `/host/:code`, `/join/:code`, `/game/:code`, `/display/:code`.
- Display-Ansicht ohne jede Adminsteuerung, ohne Debugdetails, ohne rohe Zustände (E2E-geprüft).
- Host-Ansicht mit allen Failsafes plus technischem Status inkl. aktiver Token-Quelle.

**Game Feel**
- Alle Pflichtanimationen umgesetzt, sämtlich über Motion-Tokens, die
  `prefers-reduced-motion` respektieren.
- Soundarchitektur ohne Audio-Assets (kurze WebAudio-Cues), Mute jederzeit erreichbar,
  kein Autoplay vor einer Nutzerinteraktion.
- Mobile-first ab 320 px, keine horizontale Seiten-Scrollbar; das Zahnradpuzzle scrollt
  auf schmalen Geräten in seinem eigenen Container.
- Accessibility: Tastaturbedienung, sichtbare Fokuszustände, 44-px-Touchziele,
  Tap-/Keyboard-Alternative zu jeder Drag-Interaktion, Status nie nur über Farbe.

## Bewusste Abweichung von der Spec: Rätsel 4

`03_puzzles/PUZZLE_SPEC.md` gibt fünf Räder mit Profilwerten 1/2/3 und der Regel „Summe 4" vor,
Lösung `[0,3,3,6,7]`. Diese Regel bildet sich **nicht zeichnen**: `2+2` ergibt laut Regel einen
Treffer, gezeichnet stossen dort aber zwei gleich lange Zähne zusammen. Man konnte also optisch
nichts erkennen und hat nur auf die Kontaktlampen geschaut – womit das Rätsel darauf hinauslief,
jedes Rad einmal blind durchzudrehen.

Auf ausdrückliche Ansage des Auftraggebers ist die Mechanik jetzt eine echte:

- drei Sorten Rand statt Zahlenwerten – **Zapfen**, **Loch**, **glatter Rand**
- ein Rad treibt seinen rechten Nachbarn, wenn es ihm einen Zapfen zuwendet und dort ein Loch steht
- alle Räder sind gleich gross; unterschiedlich ist nur, wo die Merkmale sitzen

Die Eindeutigkeit hängt an einer nachweisbaren Eigenschaft: Jedes treibende Rad hat **genau einen
Zapfen**, wodurch „Zapfen zeigt nach rechts" seine Stellung festlegt; das Torrad hat genau ein Loch.
Mit der alten Summenregel war Eindeutigkeit bei mehr als einem Loch je Rad nachweislich unmöglich –
eine Zufallssuche über 400 000 Radsätze fand keinen einzigen passenden. Neue Lösung `[0,3,6,2,5]`,
zehn Drehungen ab Start, weiterhin durch vollständige Aufzählung aller 4096 Zustände bewiesen.

## Offen / bewusst nicht gemacht
- **Figuren-Illustrationen.** Die acht Szenen sind als gerenderte WebP eingebunden. Betriebszwerg
  und Schwarzer Wächter laufen noch als SVG und fallen gegen die gemalten Hintergründe sichtbar ab.
  Der Austausch ist vollständig vorbereitet: `character_operations_dwarf[_neutral|_skeptical|_happy]`
  und `character_black_guard[_open]` nach `packages/web/public/art/characters/` legen, freigestellt
  mit Transparenz – mehr nicht. Existiert nur eine Zwergendatei, nutzen alle drei Stimmungen sie,
  damit nie eine Zeichnung neben einer Illustration steht.
- **Hintergrund zum Artwork.** Das Handoff-Paket enthielt kein produktives Artwork – nur
  zwei als Mood-Referenz deklarierte PNGs; `ASSET_BRIEF.md` untersagt in Zeile 1 sogar ausdrücklich,
  vor abgestimmter Art Direction finale Illustrationen zu erzeugen. Die Fantasy-Ebene ist deshalb
  vollständig als handgezeichnetes SVG umgesetzt (acht Szenen, Betriebszwerg mit drei Stimmungen,
  Schwarzer Wächter). Für gerenderte Bilder liegt eine Drop-in-Pipeline bereit: Datei unter dem
  vorgegebenen Namen nach `packages/web/public/art/` legen, fertig – eine fehlende Datei zeigt nie
  ein kaputtes Bild. Fertige Generierungs-Prompts: `08_assets/IMAGE_PROMPTS.md`,
  Ablauf: `docs/ARTWORK.md`.
- **Echte openKfW-Tokens.** Das npm-Paket ist EOL und leer, Repository und Demo-Seite waren aus
  der Build-Umgebung nicht erreichbar. Statt eines von der Spec verbotenen Pins auf eine
  deprecated Version liegt ein austauschbarer Token-Contract vor. Einspielen: ein Import,
  siehe `docs/BRANDING_INTEGRATION.md`.
- **Docker-Image nicht gebaut.** In dieser Umgebung läuft kein Docker-Daemon
  (`/var/run/docker.sock` fehlt). Dockerfile und Compose-Datei sind vollständig, der
  Produktionsmodus wurde stattdessen direkt verifiziert: ein Node-Prozess liefert SPA,
  Deep-Links, Assets und API auf einem Port aus. Der Image-Build ist auf dem Zielhost
  einmal auszuführen (`docker compose up --build -d`).
- Safari iOS ist nicht getestet, in dieser Umgebung steht nur Chromium zur Verfügung.

## Bekannte Bugs
- keine offenen

Beim Durchspielen im echten Browser gefunden und behoben:
1. Der Solver-Reveal verschwand nie – die Elternkomponente rendert im Sekundentakt neu,
   wodurch der Dismiss-Timer bei jedem Tick neu startete.
2. Der Betriebszwerg lag über den Zahnradreglern und fing auf dem Handy die Klicks ab.
3. Das Kabelbrett lief auf der Großbildansicht unter die Falz.
4. Das Join-Rate-Limit (20/min pro IP) hätte ein echtes Event zerstört: 30 Personen hinter
   einem Büro-NAT teilen sich eine IP, ab Person 21 wäre der Beitritt blockiert gewesen.
   Jetzt 120/min, über `JOIN_RATE_LIMIT` konfigurierbar.
5. `*.tsbuildinfo` lag neben `tsconfig.json` und war nicht ignoriert. Ein veralteter Stand im
   Docker-Kontext hätte `tsc -b` das Emittieren überspringen lassen – das Image wäre ohne
   Servercode ausgeliefert worden. Der Cache liegt jetzt in `dist/` und ist ignoriert.

## Tests
- `npm run verify` (Typecheck strict + Vitest): **67/67 grün**
  - 24 Rätsel-Unit-Tests inkl. der vier Eindeutigkeits-/Lösbarkeitsbeweise
  - 27 Server-Tests: Autorisierung, Solver-Regeln, Timer, kompletter Durchlauf, Failsafes,
    Identität, Neustart-Wiederherstellung
  - 1 Lasttest mit 30 gleichzeitigen Socket-Clients
  - 15 Tests zu Spielleitungs-Login (Token, Ablauf, Neustart, Sperre) und Sigel-Vergabe
- `npm run test:e2e` (Playwright gegen den echten Produktions-Build, mit gesetztem
  `HOST_PASSWORD`): **17/17 grün**
  - Beitritt, gleiche Namen, Reload-Wiederherstellung
  - Solver-Autorisierung, Weitergabe, Host-Reroll
  - Timer inkl. Reload und Pause/Resume
  - kompletter Durchlauf über alle fünf Prüfungen bis zum Sieg, synchron auf Player,
    Host und Display
  - `042` inkl. führender Null, falsche Codes ohne Zeitstrafe
  - Host-Failsafes, Barrierefreiheit der Runen ohne Drag
  - Anmeldung der Spielleitung von einem fremden Browser, Übernahme einer laufenden Session,
    Abweisung ohne Anmeldung, Anmeldung übersteht einen Reload
  - dreissig Sigel: eigenes Zeichen benannt, drei Spieler drei verschiedene Zeichen,
    identisch auf Host- und Grossbildansicht

## Nächste Schritte
1. Auf dem Zielhost `docker compose up --build -d` ausführen und `PUBLIC_BASE_URL` setzen
   (siehe `docs/DEPLOYMENT.md`) – das ist der einzige noch nicht in dieser Umgebung
   ausführbare Schritt.
2. Sobald der maintained openKfW-Token-Build vorliegt: als
   `packages/web/src/styles/kfw-tokens.vendor.css` ablegen und in `styles/index.css`
   vor dem Contract importieren.
3. Optional finale Fantasy-Artworks nach `07_branding/approved_assets/` bzw. als
   Szenen-Hintergründe ergänzen und `--scene-image` je Szene setzen.

## Resume
Der MVP ist funktionsfähig, getestet, committet und gepusht. Für den nächsten Arbeitsschritt:

```bash
git checkout claude/mvp-build
npm install
npm run verify          # 52 Tests
npm run test:e2e        # 12 E2E-Tests, baut und startet die App selbst
npm run dev             # Host: http://localhost:5173/host
```
