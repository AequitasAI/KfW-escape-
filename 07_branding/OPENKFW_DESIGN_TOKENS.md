# openKfW Design Tokens – verbindliche Designbasis

## Quelle

Öffentliche Source-of-Truth:
- Repository: https://github.com/openkfw/design-tokens
- Demo/Referenz: https://openkfw.github.io/design-tokens/
- openCode-Eintrag: https://opencode.de/en/software/design-tokens-6848

Das Repository bezeichnet KfW Design Tokens als **"the source of truth for designing KfW-branded digital products"**.

## Wichtiger Nutzungshinweis

Das Repository ist öffentlich einsehbar, enthält aber einen ausdrücklichen Usage Notice:
- Design Tokens, Dokumentation, Komponenten und Brand Assets sind für internen Gebrauch vorgesehen.
- KfW behält die Markenrechte.
- Logos, Icons, Bilder, Fonts und Design-Dokumentation sind nicht automatisch durch die MPL-2.0-Freigabe des Sourcecodes zur freien Markennutzung freigegeben.
- Keine Logo-/Font-/Bilddateien aus dem Repository in dieses Übergabepaket kopieren oder weiterverteilen.

Dieses Projekt ist als **internes KfW-Teamspiel** spezifiziert. Trotzdem sind die intern geltenden Brand-/Asset-Regeln einzuhalten.

## Codex-Regel: Tokens verwenden, keine Werte nachbauen

Codex soll die openKfW Design Tokens als visuelle Source-of-Truth verwenden.

Bevor eine konkrete Dependency eingebaut wird:
1. Aktuellen Repository-README prüfen.
2. Prüfen, welches Paket/Repository aktuell maintained ist.
3. Nicht blind eine veraltete oder als EOL/deprecated markierte npm-Version festpinnen.
4. Wenn ein maintained CSS-Build vorhanden ist, dessen funktionale/semantische Tokens bevorzugen.
5. Base-/Primitive-Tokens nur verwenden, wenn kein passender funktionaler Token existiert.

Historische/README-Beispiele zeigen u. a. CSS Custom Properties mit `--kfw-*` und funktionale Tokens wie `--kfw-color-fn`.
Die konkrete aktuelle Token-Liste ist aus der maintained Source zu übernehmen, nicht aus diesem Dokument zu erfinden.

## Was aus dem öffentlichen Demo eindeutig als Design-System-Bereiche hervorgeht

- Functional colors
  - interaction state
  - text
  - background
  - opaque
  - state
  - status
  - line
  - product
  - icon
- Base colors
  - white
  - blue
  - green
  - gray
  - yellow
  - red
  - violet
  - opaque
- Typography / fluid typography
- Buttons
- Spacing
- Form elements
- Tables

## Spacing – öffentlich im Demo sichtbar

Die Demo dokumentiert u. a.:
- tiny: 0.5rem
- xsmall: 1rem
- midSmall: 1.5rem
- small: 2rem
- medium: 3rem
- large: fluid/clamp
- xlarge: fluid/clamp
- big: fluid/clamp

Codex soll dennoch die aktuellen Tokens verwenden, statt diese Werte separat zu duplizieren.

## Anwendung im Fantasy-Spiel

**Corporate Layer**
- Navigation
- Buttons
- Typografie
- Timer
- Formulare
- Statusmeldungen
- Spacing
- Karten/Overlays
- Fokus-/Hover-/Disabled-Zustände
- Kontraste

=> openKfW Tokens konsequent verwenden.

**Fantasy Layer**
- Szenenhintergründe
- Zwerg
- schwarzer Wächter
- Runen
- Zahnräder
- Tore
- Brücke
- Partikel/Licht

=> darf künstlerischer sein, muss aber mit Corporate Layer harmonieren.

## Keine Branding-Fakes

Nicht:
- "ungefähr KfW-Grün" hardcoden
- zufällige ähnliche Fonts verwenden und als KfW-Font bezeichnen
- KfW-Logo nachzeichnen
- KfW-Farben aus Screenshots sampeln, wenn ein Token existiert

Stattdessen:
- Design-Tokens direkt konsumieren
- für nicht abgedeckte Fantasy-Semantik eigene `--game-*` Tokens definieren, die auf geeignete KfW-Tokens referenzieren oder bewusst neutral bleiben
