# Artwork-Ablage

Hier landen die finalen Illustrationen. Solange eine Datei fehlt, rendert die App
die generierte SVG-Szene – es gibt nie ein kaputtes Bild.

## Szenen → `scenes/`

| Datei | Station |
|---|---|
| `scene_lobby.webp` | Lobby / Intro |
| `scene_archive.webp` | 1 – Archiv der alten Bestände |
| `scene_connection.webp` | 2 – Die verlorene Verbindung |
| `scene_testmasters.webp` | 3 – Halle der Prüfmeister |
| `scene_operations_mine.webp` | 4 – Minen des Betriebs |
| `scene_black_gate.webp` | 5 – Das Schwarze Tor |
| `scene_final_bridge.webp` | Finale / Sieg |
| `scene_defeat.webp` | Niederlage |

## Figuren → `characters/`

| Datei | Figur |
|---|---|
| `character_operations_dwarf.webp` | Betriebszwerg (freigestellt, transparent) |
| `character_black_guard.webp` | Schwarzer Wächter (freigestellt, transparent) |

## Vorgaben

- Szenen: 2560×1440 (16:9), `.webp`, Qualität ~82, Ziel < 400 KB pro Datei.
- Figuren: freigestellt mit Transparenz, Höhe ~1200 px, `.webp` oder `.png`.
- Die Bildmitte bleibt ruhig – dort liegt das Rätsel. Details gehören an die Ränder.
- Keine KfW-Logos, keine Markenassets, keine realen Personen.

Fertige Generierungs-Prompts: `08_assets/IMAGE_PROMPTS.md`.
Ablauf: `docs/ARTWORK.md`.
