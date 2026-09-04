# Artwork – Stand und Austausch

## Stand

**Alles eingebunden.** Acht gemalte Szenen, der Betriebszwerg in drei Stimmungen und der Schwarze
Wächter in zwei Zuständen liegen unter `packages/web/public/art/` als WebP, zusammen ~2,1 MB.
Die SVG-Figuren in `Characters.tsx` bleiben als Rückfallebene bestehen, falls eine Datei fehlt.

### Aufbereitung

`tools/prepare_art.py` erledigt Grössenreduktion, Freistellen und Normalisierung:

```bash
python3 tools/prepare_art.py --scenes  rohbilder/scene_*.png
python3 tools/prepare_art.py --figures rohbilder/character_operations_dwarf_*.png
python3 tools/prepare_art.py --figures rohbilder/character_black_guard*.png
```

Alle Dateien **eines** `--figures`-Aufrufs gelten als Zustände derselben Figur und werden auf eine
gemeinsame Leinwand gelegt. Das ist kein Pflichtschritt – die App frisst auch rohe PNGs – aber es
spart etwa 90 % Dateigrösse und verhindert, dass die Figur beim Stimmungswechsel springt.

Das Handoff-Paket v0.4 selbst enthielt **kein produktives Artwork**. In `08_assets/concept_refs/` liegen
genau zwei PNGs, und die sind im Paket ausdrücklich als Mood-/Qualitätsreferenz deklariert, nicht
als einzubindende Assets. `08_assets/ASSET_BRIEF.md` beginnt mit dem Satz:

> „Noch keine finalen Illustrationen erzeugen, bevor Art Direction + Brand-Guide abgestimmt sind."

Die acht dort gelisteten Assets sind als **optional** markiert. Sie fehlen also nicht versehentlich –
sie waren bewusst vertagt.

## Was die App heute rendert

Alle Fantasy-Elemente sind handgezeichnetes SVG:

| Element | Datei |
|---|---|
| Acht Szenen – Fallback, falls ein Bild fehlt | `packages/web/src/scenes/Scene.tsx` |
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

## Warum die Figuren als Bild besser sind

Die SVG-Figuren sind bewusst gezeichnet und nicht gemalt. Vektorformen mit klaren Konturen lesen
sich immer als Grafik – für eine Figur im Stil von Gimli oder Gandalf braucht es eine gemalte
Illustration. Der Austauschweg dafür ist vorbereitet (siehe oben), die Prompts stehen in
`08_assets/IMAGE_PROMPTS.md` und sind auf gemalte Filmfantasy ausgelegt.

Solange keine Bilder vorliegen, ist das SVG die bessere Lösung, weil es die drei Stimmungen des
Zwergs ohne drei separate Dateien abbildet.

## Sigel der Gefährten

Jede beitretende Person bekommt vom Server eines von **dreissig Sigeln** zugeteilt – zufällig, aber
ohne Dopplung, solange freie übrig sind. Das Sigel steht überall gleich: in der Lobby auf dem Handy,
in der Spielleitungsliste, auf dem Beamer und in der Einblendung des gewählten Gefährten.

Gezeichnet, nicht gemalt, und das mit Absicht:

- Dreissig Portraits wären dreissig Dateien, die zusammenpassen müssen. Ein Emblem bleibt bei 32 px
  neben einem Namen genauso lesbar wie bei 200 px auf der Projektion.
- Ein zweiter Illustrationsstil neben den gemalten Hintergründen würde sich beissen; ein
  Wachssiegel-Medaillon liegt als Objekt darauf, statt mit ihm zu konkurrieren.
- Die Zuteilung überlebt einen Serverneustart, weil nur eine Zahl gespeichert wird.

Wer trotzdem gemalte Wappen möchte: `packages/web/public/art/avatars/avatar_01.webp` … `avatar_30`
ablegen, fertige Prompts stehen in `08_assets/IMAGE_PROMPTS.md`. Jede Datei wirkt einzeln.

## Figuren: Zustände und Bewegung

Häufige Frage: Der Zwerg *tut* etwas – geht das mit SVG nicht besser als mit Bildern?

Nein. Was er tut, sind drei Zustände (neutral, skeptisch, begeistert) plus Wippen und ein Jubeln.
Zustandswechsel sind Sprite-Wechsel, kein Vektor-Rig – genau so haben die klassischen
Point-and-Click-Adventures das gelöst. Deshalb liegt die Bewegung am Rahmen und nicht im Bild:

- Die Leerlauf-Bewegung und der Jubel sind Transforms auf dem umschliessenden Element und
  funktionieren mit Bild genauso wie mit SVG.
- Alle vorhandenen Stimmungen werden gestapelt und per Opacity übergeblendet. Ein harter
  `src`-Wechsel flackert ausgerechnet in dem Frame, in dem die Maschine anspringt.
- Doppelte Pfade werden zusammengefasst: eine einzige gelieferte Datei kostet auch nur eine Ebene.
- Die Ebenen sind unten zentriert ausgerichtet, damit jede Figur unabhängig vom Seitenverhältnis
  der Datei auf derselben Standlinie steht.

Was SVG könnte und Bilder nicht: Blinzeln und einzeln bewegliche Körperteile. Das braucht dieses
Spiel nicht – gemalte Figuren sind hier der klare Gewinn.

### Dateinamen der Figuren

| Datei | Wirkung |
|---|---|
| `character_operations_dwarf_neutral` | Grundzustand |
| `character_operations_dwarf_skeptical` | ab zwei greifenden Kontakten |
| `character_operations_dwarf_happy` | wenn die Maschine läuft |
| `character_operations_dwarf` | Sammelname, greift für jede fehlende Stimmung |
| `character_black_guard` | Wächter, Schwert aufgestellt |
| `character_black_guard_open` | optional, Schwert gesenkt |

Fehlt eine Stimmung, wird eine **andere vorhandene Zwergendatei** benutzt und nicht das SVG.
Sonst stünde eine gemalte Illustration neben einer Zeichnung in derselben Szene.

Wichtig bei den drei Zwergen-Varianten: identische Pose, identischer Ausschnitt, identische Grösse.
Nur der Gesichtsausdruck ändert sich, sonst springt die Figur beim Überblenden.
