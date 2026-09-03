# Artwork – Stand und Austausch

## Stand

Das Handoff-Paket v0.4 enthielt **kein produktives Artwork**. In `08_assets/concept_refs/` liegen
genau zwei PNGs, und die sind im Paket ausdrücklich als Mood-/Qualitätsreferenz deklariert, nicht
als einzubindende Assets. `08_assets/ASSET_BRIEF.md` beginnt mit dem Satz:

> „Noch keine finalen Illustrationen erzeugen, bevor Art Direction + Brand-Guide abgestimmt sind."

Die acht dort gelisteten Assets sind als **optional** markiert. Sie fehlen also nicht versehentlich –
sie waren bewusst vertagt.

## Was die App heute rendert

Alle Fantasy-Elemente sind handgezeichnetes SVG:

| Element | Datei |
|---|---|
| Acht Szenen (Lobby, 5 Stationen, Brücke, Niederlage) | `packages/web/src/scenes/Scene.tsx` |
| Betriebszwerg mit drei Stimmungen | `packages/web/src/scenes/Characters.tsx` |
| Schwarzer Wächter | `packages/web/src/scenes/Characters.tsx` |
| Runen, Kabel, Zahnräder, Baupläne, Nummernblock | jeweils die Puzzle-Komponente |

Das ist bewusst so: SVG skaliert verlustfrei auf den Beamer, lässt sich über die Design-Tokens
umfärben, animieren und braucht keine Binärdateien im Repository. Für die Rätselelemente ist es
laut `ASSET_BRIEF.md` ohnehin die vorgesehene Lösung („Keine Assets nötig für: Kabel, Zahnräder,
Baupläne, Nummernblock, Runen").

Für die **Szenenhintergründe und die beiden Figuren** ist eine hochwertige Illustration jedoch
klar besser. Dafür gibt es den folgenden Weg.

## Eigene Illustrationen einspielen

Es ist **keine Codeänderung** nötig. Ablauf:

1. Bilder erzeugen. Fertige Prompts liegen in [`08_assets/IMAGE_PROMPTS.md`](../08_assets/IMAGE_PROMPTS.md)
   – acht Szenen plus zwei Figuren, mit gemeinsamem Stilblock, damit die Serie zusammenpasst.
2. Dateien unter den exakt vorgegebenen Namen ablegen:

   ```
   packages/web/public/art/scenes/scene_archive.png
   packages/web/public/art/scenes/scene_operations_mine.png
   ...
   packages/web/public/art/characters/character_operations_dwarf.png
   ```

   Die Endung ist egal – `.webp`, `.png`, `.jpg` und `.jpeg` werden in dieser Reihenfolge
   probiert. Nur der Name ohne Endung muss stimmen. Die vollständige Liste steht in
   `packages/web/public/art/README.md`.
3. `npm run build` bzw. `npm run dev`. Fertig.

### Wie der Austausch technisch funktioniert

`packages/web/src/scenes/sceneArt.ts` prüft beim ersten Rendern einer Szene einmalig, ob eine
zugehörige Datei tatsächlich lädt – der Reihe nach `.webp`, `.png`, `.jpg`, `.jpeg`. Erst dann setzt `Scene.tsx` die Custom Property
`--scene-image`, und der Bild-Layer blendet sich über das generierte SVG.

Das bedeutet:
- Eine fehlende Datei erzeugt **nie** ein kaputtes Bild – das SVG bleibt einfach stehen.
- Man kann die acht Szenen **einzeln** ersetzen; gemischter Betrieb ist völlig in Ordnung.
- Die Layer-Struktur (`scene__bg` / `scene__fx` / `scene__content`) bleibt unangetastet, das
  Vignette- und UI-Layering funktioniert mit Bild genauso wie mit SVG.

### Bildvorgaben

- Szenen: 2560×1440 (16:9), `.webp`, Zielgrösse unter ~400 KB.
- Figuren: freigestellt mit Transparenz, Höhe ~1200 px.
- **Die Bildmitte bleibt ruhig.** Dort liegt das Rätselpanel. Details gehören an die Ränder.
- Keine Logos, keine Markenzeichen, keine erkennbaren realen Personen – siehe
  `07_branding/BRANDING_README.md`.

## Grenzen

Die Figuren (Zwerg, Wächter) werden derzeit **nicht** automatisch durch Bilder ersetzt, weil eine
gute Figur mehr braucht als einen Hintergrundtausch: Ausdrucksvarianten, Ankerpunkte und
Animationszustände. `CHARACTER_ART` in `sceneArt.ts` hält die Pfade bereits vor; der Austausch ist
dann eine kleine, klar umrissene Änderung an `Characters.tsx` (Bild statt SVG rendern, gleiche
Props). Solange keine finalen Figuren vorliegen, ist das SVG die bessere Lösung, weil es die drei
Stimmungen des Zwergs ohne drei separate Dateien abbildet.
