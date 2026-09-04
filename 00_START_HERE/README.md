# KfW Fantasy Escape – Codex Handoff

Arbeitsname: **Die Brücke zur Zwei-Programme-Welt**

Dieses Paket ist die verbindliche Übergabe für den ersten MVP eines internen, browserbasierten Multiplayer-Escape-Games.

## Ziel in einem Satz

20+ Kolleginnen und Kollegen joinen per QR-Code ohne Account, lösen innerhalb von 10 Minuten gemeinsam fünf Fantasy-Rätsel mit leichtem KfW-/BA-Flavor; pro Rätsel steuert genau ein zufällig ausgewählter "Gefährte", kann die Prüfung aber an einen noch nicht eingesetzten Spieler weitergeben.

## Was V1 bewusst NICHT enthält

- keine Accounts / E-Mail-Verifikation
- keine KI-API
- kein Imposter-Modus
- keine verzweigte Story
- kein Punktesystem
- keine öffentliche KfW-Kommunikation
- keine echten internen Fach-/Produktionsdaten
- keine externen Analytics-SDKs
- kein zwingender Third-Party-Service außer optional Cloudflare Tunnel vor dem eigenen Backend

## Reihenfolge für Codex

1. `01_product/GAME_SPEC.md`
2. `02_story/STORY_AND_COPY.md`
3. `03_puzzles/PUZZLE_SPEC.md`
4. `04_ux_ui/UX_UI_SPEC.md`
5. `05_technical/ARCHITECTURE.md`
6. `06_testing/ACCEPTANCE_TESTS.md`
7. `07_branding/BRANDING_README.md`
8. `09_codex/MASTER_CODEX_PROMPT.md`

## Wichtig: Branding

Die öffentliche openKfW Design-Token-Source ist jetzt die verbindliche UI-Basis:
- https://github.com/openkfw/design-tokens
- https://openkfw.github.io/design-tokens/

Siehe `07_branding/OPENKFW_DESIGN_TOKENS.md`.

Für Logo, Fonts, Icons, Bilder und weitere Brand Assets gelten gesonderte KfW-Nutzungsregeln. Solche Dateien sind nicht Bestandteil dieses Pakets und dürfen nicht ungeprüft aus der öffentlichen Source übernommen/weiterverteilt werden.

## Zielplattform

- Backend: Keller-Server des Hosts
- Deployment: Docker Compose
- öffentlicher Zugriff: optional Cloudflare Tunnel
- Clients: aktuelle mobile Browser + Desktop
- Host/Display: Desktop-Browser, geeignet für Teams-Screenshare/Beamer

## Neu in v0.3

- `10_design/DESIGN_DECISIONS_FOR_CODEX.md` – verdichtete Designentscheidung
- `10_design/CODEX_EXEC_SUMMARY.md` – ultrakurze Executive Summary für Codex
- `10_design/DISPLAY_SCREEN_REQUIREMENTS.md` – Vorgaben für die große Anzeige/Screenshare-Ansicht
- `08_assets/concept_refs/` – zwei visuelle Referenzbilder zur Tonalität und UI


## Claude Code

Für Claude Code liegt zusätzlich `CLAUDE_START_HERE.md` im Root.
Ziel-Repository:

`https://github.com/AequitasAI/KfW-escape-`

Empfohlener Arbeitsbranch:
`claude/mvp-build`
