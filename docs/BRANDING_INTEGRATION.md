# Branding-Integration – openKfW Design Tokens

## Ausgangslage (geprüft am 2026-09-03)

`07_branding/OPENKFW_DESIGN_TOKENS.md` verlangt ausdrücklich, **vor** dem Einbau einer Dependency
den aktuellen Stand der maintained Source zu prüfen und **keine als EOL/deprecated markierte
npm-Version zu pinnen**. Diese Prüfung wurde durchgeführt:

| Quelle | Ergebnis |
|---|---|
| `npm view @openkfw/design-tokens` | letzte Version `1.0.4`, `deprecated: "🚨 EOL: This package is no longer maintained here."`, `index.js` enthält `module.exports = {}` – **keine Tokens** |
| `github.com/openkfw/design-tokens` | aus dieser Build-Umgebung nicht erreichbar (Repository-Zugriff nicht freigegeben) |
| `openkfw.github.io/design-tokens/` | HTTP 404 |

Ein Pinnen des npm-Pakets wäre also gleichzeitig verboten (EOL) und wirkungslos (leer).

## Konsequenz: Token-Contract statt erfundener Werte

Die UI konsumiert ausschließlich CSS Custom Properties. Es gibt zwei Ebenen:

1. **`packages/web/src/styles/kfw-token-contract.css`**
   Deklariert die erwarteten funktionalen `--kfw-*`-Tokens. Die Werte darin sind ausdrücklich
   **markenneutrale Platzhalter**, gekennzeichnet durch `--kfw-token-source: placeholder`.
   Sie werden **nicht** als KfW-Werte ausgegeben, sind nicht aus Screenshots gesampelt und
   imitieren kein KfW-Grün/-Blau.

2. **`packages/web/src/styles/game-tokens.css`**
   Die dünne Alias-Schicht `--game-*`. Jeder Alias referenziert einen funktionalen `--kfw-*`-Token:

   ```css
   --game-ui-surface: var(--kfw-color-fn-background-secondary);
   ```

   Fantasy-spezifische Semantik ohne KfW-Entsprechung (Runenglühen, Energiefluss, Zwergenlicht)
   bleibt bewusst eigenständig unter `--game-fx-*`.

Kein Baustein der Anwendung schreibt Farb-Hexwerte direkt in Komponenten-CSS.

## Echte Tokens einspielen (ein Schritt)

Sobald der maintained Token-Build vorliegt (npm-Paket, CSS-Datei aus dem internen Design-System
oder Nachfolge-Repository):

1. Die CSS-Datei nach `packages/web/src/styles/kfw-tokens.vendor.css` legen
   (oder das Paket installieren und in Schritt 2 direkt importieren).
2. In `packages/web/src/styles/index.css` den Import **vor** `kfw-token-contract.css` einfügen:

   ```css
   @import './kfw-tokens.vendor.css';   /* echte Tokens, gewinnen durch Kaskade */
   @import './kfw-token-contract.css';  /* Platzhalter-Fallbacks */
   @import './game-tokens.css';
   ```

   Der Contract nutzt durchgängig `var(--kfw-x, <fallback>)`-Form bzw. wird durch die
   vendor-Datei überschrieben – es ist keine Änderung an Komponenten nötig.
3. `npm run build` – fertig. Prüfen: Der Wert von `--kfw-token-source` steht dann auf `vendor`,
   und die Host-Ansicht zeigt unter „Technischer Status“ die aktive Token-Quelle an.

## Was bewusst NICHT passiert ist

- kein KfW-Logo nachgezeichnet oder gebundelt
- keine Fontdateien aus dem öffentlichen Repository extrahiert
- keine Icons/Bilder/Brand-Dokumentation kopiert
- keine „ungefähr KfW“-Hexwerte erfunden und als Markenfarbe deklariert
- keine Corporate-Assets in der Fantasy-Ebene imitiert

Die Fantasy-Ebene (Szenen, Runen, Zahnräder, Tor, Brücke) ist vollständig eigenständig als
SVG/CSS erzeugt und liegt in eigenen Layern getrennt vom Corporate-UI-Layer.

## Freigegebene interne Assets ergänzen

Intern freigegebene Assets gehören nach `07_branding/approved_assets/` und werden von dort
referenziert. Szenen-Hintergründe können jederzeit ohne Architekturumbau ersetzt werden – siehe
`packages/web/src/scenes/`: jede Szene besteht aus getrennten Layern (`bg` / `mid` / `fx`), der
`bg`-Layer akzeptiert direkt ein Bild statt des generierten SVG.
