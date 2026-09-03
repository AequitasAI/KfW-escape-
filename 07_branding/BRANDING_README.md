# Branding – V1

## Verbindliche Basis

Für die UI dieses internen Spiels existiert eine öffentliche openKfW Design-Token-Source-of-Truth:

- https://github.com/openkfw/design-tokens
- https://openkfw.github.io/design-tokens/

Lies zuerst `OPENKFW_DESIGN_TOKENS.md`.

## Architektur

Keine eigenen KfW-Farben duplizieren.

Statt:
```css
.button { background: #irgendein-hex; }
```

sinngemäß:
```css
.button { background: var(--kfw-...passender-funktionaler-token...); }
```

Game-spezifische Tokens dürfen eine dünne Alias-Schicht bilden:

```css
:root {
  --game-ui-primary: var(--kfw-...);
  --game-ui-surface: var(--kfw-...);
}
```

Die exakten aktuellen KfW-Token-Namen müssen aus der maintained openKfW-Source gelesen werden.

## Brand Assets

Design Tokens ≠ Freigabe sämtlicher Markenassets.

- kein Logo ungeprüft bundlen
- keine Fontdateien aus dem öffentlichen Repo extrahieren und weitergeben
- keine Icons/Bilder/Brand-Dokumentation ungeprüft kopieren
- wenn intern freigegebene Assets vorhanden sind, können sie lokal in `07_branding/approved_assets/` ergänzt werden

## Fantasy-Art

Die Fantasy-Art ist eine eigenständige Spielschicht.
Sie darf atmosphärisch und episch sein, ohne Corporate Assets zu imitieren.

Ziel:
**KfW Design-System für die Bedienung + Fantasy-Art für die Spielwelt.**
