# Artwork-Ablage

Hier landen die finalen Illustrationen. Solange eine Datei fehlt, rendert die App
die generierte SVG-Szene – es gibt nie ein kaputtes Bild.

## Szenen → `scenes/`

| Datei | Station |
|---|---|
| `scene_lobby.*` | Lobby / Intro |
| `scene_archive.*` | 1 – Archiv der alten Bestände |
| `scene_connection.*` | 2 – Die verlorene Verbindung |
| `scene_testmasters.*` | 3 – Halle der Prüfmeister |
| `scene_operations_mine.*` | 4 – Minen des Betriebs |
| `scene_black_gate.*` | 5 – Das Schwarze Tor |
| `scene_final_bridge.*` | Finale / Sieg |
| `scene_defeat.*` | Niederlage |

## Figuren → `characters/`

| Datei | Figur |
|---|---|
| `character_operations_dwarf.*` | Betriebszwerg (freigestellt, transparent) |
| `character_black_guard.*` | Schwarzer Wächter (freigestellt, transparent) |

## Vorgaben

- **Dateiendung egal:** `.webp`, `.png`, `.jpg` und `.jpeg` werden alle erkannt, in dieser
  Reihenfolge. Ein Bild direkt aus ChatGPT kann also unverändert hier abgelegt werden.
  Nur der Dateiname ohne Endung muss exakt stimmen.
- Szenen: möglichst 16:9 (2560×1440). `.webp` mit Qualität ~82 hält die Datei unter ~400 KB;
  ein PNG von ~2 MB funktioniert auch, lädt auf schwacher Hardware nur langsamer.
- Figuren: freigestellt mit Transparenz, Höhe ~1200 px.
- Die Bildmitte bleibt ruhig – dort liegt das Rätsel. Details gehören an die Ränder.
- Keine KfW-Logos, keine Markenassets, keine realen Personen.

Fertige Generierungs-Prompts: `08_assets/IMAGE_PROMPTS.md`.
Ablauf: `docs/ARTWORK.md`.
