# Bildprompts für die finalen Illustrationen

Diese Prompts sind so geschrieben, dass sie 1:1 in ChatGPT / DALL·E / Midjourney eingefügt werden
können. Sie leiten sich aus `04_ux_ui/SCENE_ART_DIRECTION.md`, `08_assets/ASSET_BRIEF.md` und den
beiden Konzeptreferenzen in `concept_refs/` ab.

Nach dem Erzeugen: Dateien nach `packages/web/public/art/scenes/` bzw.
`packages/web/public/art/characters/` legen, exakt unter den unten genannten Namen. Die App zieht
sie automatisch, ohne Codeänderung. Details: `docs/ARTWORK.md`.

---

## Gemeinsamer Stilblock

Diesen Absatz **an jeden** Szenenprompt anhängen, damit alle acht Bilder wie eine Serie wirken:

> Style: cinematic digital matte painting, high-detail painted fantasy concept art in the spirit of
> a Tolkien film production, dramatic volumetric lighting, warm amber and gold firelight as the
> dominant accent against deep slate-blue shadow, painterly brushwork, no text, no letters, no
> logos, no watermark, no people's faces in the foreground, storybook fantasy rather than science
> fiction — no neon, no cyan glow, no holograms, no technology panels. 16:9 composition, the central
> third is deliberately calm and uncluttered so that UI panels can sit on top, richer detail towards
> the left and right edges, slight vignette.

**Wichtig für jedes Bild:**
- kein Text, keine Buchstaben, keine Zahlen im Bild
- keine Logos, keine Markenzeichen, keine KfW-Bezüge
- keine erkennbaren realen Personen
- die Mitte bleibt ruhig – dort liegt später das Rätsel
- **kein Neon, kein Cyan-Leuchten, keine Hologramme.** Kaltes Türkis ist das stärkste
  Science-Fiction-Signal überhaupt; das Licht in dieser Welt kommt von Feuer, Laternen und Gold.

---

## Szenen

### 1. `scene_lobby.webp` — Lobby / Intro

> A vast twilight mountain valley seen from a high stone terrace, jagged peaks fading into blue
> haze, a faint aurora of teal runic light in the sky, scattered warm lanterns on distant
> switchback paths far below, a sense of a journey about to begin. Wide empty sky in the centre.

### 2. `scene_archive.webp` — Das Archiv der alten Bestände

> The interior of a colossal fantasy archive: impossibly tall stone shelves receding into darkness
> on both sides, thousands of scrolls and leather ledgers, glowing amber runes carved into the
> shelf edges, a few parchment scrolls floating gently in mid-air, dust motes caught in shafts of
> warm light from unseen high windows. Calm, mystical, reverent. The central floor area is open
> and empty.

### 3. `scene_connection.webp` — Die verlorene Verbindung

> An ancient stone and iron conduit chamber deep underground, a monumental rune-carved power
> source glowing teal on the far left wall and a tall dormant crystalline receiver on the far
> right, thick dark cables and pipes running along the walls between them, most of them dark and
> dead, faint teal energy pooling at the left source. Cold, technical, mysterious. Centre wall
> is flat and unadorned.

### 4. `scene_testmasters.webp` — Die Halle der Prüfmeister

> A monumental symmetrical examination hall, pale stone columns and high arches, two enormous
> empty drafting easels standing side by side in the middle distance, brass measuring instruments
> and magnifying lenses on stone lecterns along the sides, banners hanging between the columns,
> cool daylight from a high clerestory. Formal, precise, slightly intimidating. Perfectly
> symmetrical, centre open.

### 5. `scene_operations_mine.webp` — Die Minen des Betriebs

> A deep dwarven machine hall carved from rock, massive rough-hewn stone walls and heavy timber
> support beams, glowing orange forge light and hanging lanterns, mine cart rails and a cart of
> glowing teal crystals in the lower left foreground, a monumental closed stone gate with a carved
> arch in the right background, thick pipes and machinery along the walls. Warm, industrious,
> the most visually rich of the set. The middle band at eye level is clear — the gear machine
> goes there.

### 6. `scene_black_gate.webp` — Das Schwarze Tor

> An immense black basalt gate set into a cliff face at night, two colossal square towers flanking
> it, cold blue moonlight from above, thin lines of pale teal light tracing the seams of the closed
> doors, a wide empty flagstone plaza in front of it, low mist across the ground. Monumental,
> imposing, epic — a solemn gatekeeper's threshold, not a horror scene. The gate's central panel
> is flat and unadorned.

### 7. `scene_final_bridge.webp` — Das Brückenfinale

> A magnificent stone arch bridge spanning a vast starlit chasm, the bridge glowing from within
> with teal runic energy, five large luminous seals floating in an arc above the span, streams of
> light flowing down into the abyss below, distant mountain silhouettes and a brightening horizon.
> Triumphant, awe-inspiring, the payoff shot. Sky above the bridge stays open.

### 8. `scene_defeat.webp` — Niederlage

> The same great chasm at night, but the bridge is broken and incomplete — two stone stumps
> reaching out from either side towards a dark empty gap, the runic light extinguished to a faint
> cold ember, heavy clouds, no stars. Melancholy and quiet, not frightening or gory. Wide empty
> centre where the gap is.

---

## Figuren

Ziel ist **gemalte Filmfantasy**, kein Vektor-Cartoon: Gimli und Gandalf als Referenz für
Materialität, Gewicht und Gesichtsausdruck. Freigestellt erzeugen, damit die Figur vor jeder
Szene stehen kann.

Ganz wichtig bei den drei Zwergen-Varianten: **identische Pose, identischer Ausschnitt,
identische Grösse** – nur der Gesichtsausdruck ändert sich. Sonst springt die Figur beim
Stimmungswechsel. Bei Bild 2 und 3 ausdrücklich dazusagen:
> identical pose, framing, scale and lighting as the previous image, only the facial expression changes

### `character_operations_dwarf_neutral` — Der Betriebszwerg

> A stout fantasy dwarf works-engineer, full body, standing, facing the viewer at a three-quarter
> angle, feet planted wide. Painted cinematic fantasy character art in the spirit of a Tolkien film
> production design — think Gimli, but a mine foreman rather than a warrior. A heavy braided
> red-brown beard reaching his belt with iron beard rings, a plaited moustache, bushy brows, a
> weathered lived-in face with a large nose and deep-set warm eyes. A battered leather mining helmet
> with a brass carbide lamp, a thick leather apron over a wool tunic, riveted iron shoulder plates,
> a broad tool belt with a hammer and calipers, heavy boots. Warm forge lighting from the lower
> left, cool blue rim light from behind. Rich fabric and leather texture, visible wear, painterly
> brushwork, not photorealistic and absolutely not a flat vector cartoon.
>
> Expression: calm, faintly unimpressed, arms relaxed at his sides.
>
> Isolated on a plain white background, full figure with even margins, no text, no logo, no
> weapons raised, not a real person.

### `character_operations_dwarf_skeptical`

> identical pose, framing, scale and lighting as the previous image, only the facial expression
> changes: one eyebrow raised high, eyes narrowed, mouth a flat sceptical line, head tilted a
> few degrees. Same dwarf, same clothing, same background.

### `character_operations_dwarf_happy`

> identical pose, framing, scale and lighting as the previous image, only the facial expression
> changes: a broad delighted grin showing through the beard, eyes crinkled, both eyebrows raised,
> one hand giving a thumbs up. Same dwarf, same clothing, same background.

### `character_black_guard` — Der Schwarze Wächter

> A towering armoured gatekeeper, full body, standing squarely, facing the viewer. Painted
> cinematic fantasy character art with the gravitas of a Tolkien film production. Blackened steel
> plate armour with hand-hammered texture and worn brass edging, a closed great helm with a narrow
> eye slot and a fluted breathing grille — no face visible, no glowing visor bar. A deep crimson
> cloak and a faded gold tabard. Both gauntlets rest on the pommel of a huge two-handed sword whose
> point is planted on the ground before him. Torchlight from the lower left catches the armour
> edges, cold moonlight from behind. Solemn, dutiful, monumental — a guardian doing his job, never
> a demon: no skulls, no gore, no red glow, nothing robotic.
>
> Isolated on a plain white background, full figure with even margins, no text, no logo, not a
> real person.

### `character_black_guard_open` — optional

> identical pose, framing, scale and lighting as the previous image, but the sword is lowered to
> his side and his head inclines a fraction in acknowledgement. Same knight, same armour, same
> background.

## Nach dem Erzeugen

**Nichts konvertieren nötig.** `.png`, `.webp`, `.jpg` und `.jpeg` werden alle erkannt – nur der
Dateiname ohne Endung muss exakt stimmen. Also: herunterladen, umbenennen, ablegen.

```bash
cp scene_*.png     packages/web/public/art/scenes/
cp character_*.png packages/web/public/art/characters/

npm run dev   # die Szenen ziehen die Bilder automatisch
```

Optional, wenn die Dateien gross sind (spürbar auf schwacher Beamer-Hardware):

```bash
cwebp -q 82 scene_archive.png -o scene_archive.webp && rm scene_archive.png
```

Zielgrösse pro Szene: 2560×1440, idealerweise unter ~400 KB.
