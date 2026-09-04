#!/usr/bin/env python3
"""
Bereitet generierte Artworks für die App auf.

    python3 tools/prepare_art.py --scenes  eingang/*.png
    python3 tools/prepare_art.py --figures eingang/*.png

Was passiert:

Szenen  – auf maximal 2560 px Breite herunterrechnen, als WebP q82 speichern.
          Ein 2-MB-PNG pro Raum ist über einen Cloudflare Tunnel auf einem
          Beamer bei jedem Raumwechsel spürbar; als WebP bleiben ~150 KB übrig.

Figuren – Studiohintergrund entfernen, auf die Figur zuschneiden, alle Zustände
          einer Figur auf dieselbe Leinwand normalisieren und als WebP mit
          Transparenz speichern.

Die Dateinamen bestimmt die Zuordnung; siehe packages/web/public/art/README.md.
Die App erkennt .webp, .png, .jpg und .jpeg – dieses Skript ist reine Kür für
Dateigrösse und saubere Freisteller, kein Pflichtschritt.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

try:
    import numpy as np
    from PIL import Image, ImageFilter
    from scipy.ndimage import label
except ImportError:  # pragma: no cover - developer tooling
    sys.exit('Benötigt: pip install pillow numpy scipy')

SCENE_MAX_WIDTH = 2560
FIGURE_MAX_HEIGHT = 1200


def prepare_scene(src: Path, dst: Path) -> None:
    im = Image.open(src).convert('RGB')
    w, h = im.size
    if w > SCENE_MAX_WIDTH:
        im = im.resize((SCENE_MAX_WIDTH, round(h * SCENE_MAX_WIDTH / w)), Image.LANCZOS)
    dst.parent.mkdir(parents=True, exist_ok=True)
    im.save(dst, 'WEBP', quality=82, method=6)


def cutout(src: Path) -> Image.Image:
    """
    Entfernt den einfarbig hellen Studiohintergrund.

    Zwei Schwellen: eine grosszügige beschreibt, was Hintergrund sein *könnte*,
    und nur der Teil davon, der den Bildrand berührt, ist es tatsächlich. Das
    schützt helle Stellen *in* der Figur – Messinglampe, Goldwappenrock,
    polierter Stahl –, die eine reine Helligkeitsschwelle auslöschen würde.

    Am Fuss der Figur wird zusätzlich schärfer vorgegangen: dort liegt der weiche
    Kontaktschatten des Renders, der sonst als heller Sockel stehen bleibt. Unten
    gibt es nur Schuhe (dunkel) und Schatten (neutralgrau), deshalb ist die
    aggressivere Regel dort gefahrlos.
    """
    im = Image.open(src).convert('RGB')
    a = np.asarray(im).astype(np.int16)
    lo, hi = a.min(axis=2), a.max(axis=2)
    sat = hi - lo
    lum = a.mean(axis=2)

    loose = (lo > 186) & (sat < 42)
    lab, _ = label(loose)
    border = set(lab[0, :]) | set(lab[-1, :]) | set(lab[:, 0]) | set(lab[:, -1])
    border.discard(0)
    background = np.isin(lab, list(border))

    alpha = np.where(background, 0.0, 1.0)

    # weicher Rand statt Scherenschnitt
    ramp = np.clip((234 - lum) / 42.0, 0.0, 1.0)
    soft_zone = (~background) & (lo > 172) & (sat < 46)
    alpha = np.where(soft_zone, ramp, alpha)

    # Bodenzone: neutralgraue Reste des Kontaktschattens weg
    rows = np.where(alpha.max(axis=1) > 0.03)[0]
    if rows.size:
        top, bottom = rows.min(), rows.max()
        floor = int(bottom - (bottom - top) * 0.14)
        band = np.zeros_like(alpha, dtype=bool)
        band[floor:] = True
        shadow = band & (lum > 150) & (sat < 24)
        alpha = np.where(shadow, np.clip((196 - lum) / 46.0, 0.0, 1.0), alpha)

    smooth = Image.fromarray((alpha * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.7))
    out = im.convert('RGBA')
    out.putalpha(smooth)
    box = out.getbbox()
    return out.crop(box) if box else out


def normalise(images: list[Image.Image], pad_ratio: float = 0.02) -> list[Image.Image]:
    """
    Legt alle Zustände einer Figur auf dieselbe Leinwand, unten zentriert.

    Die Renders kommen in unterschiedlichen Seitenverhältnissen aus dem
    Generator. Ohne diesen Schritt springt die Figur in Grösse und Standlinie,
    sobald ihre Stimmung wechselt – und der Stimmungswechsel ist genau der
    Moment, in dem alle hinschauen.
    """
    height = max(i.height for i in images)
    scaled = [
        i.resize((max(1, round(i.width * height / i.height)), height), Image.LANCZOS)
        for i in images
    ]
    width = max(i.width for i in scaled)
    pad = round(height * pad_ratio)
    size = (width + 2 * pad, height + pad)

    out = []
    for i in scaled:
        canvas = Image.new('RGBA', size, (0, 0, 0, 0))
        canvas.paste(i, ((size[0] - i.width) // 2, size[1] - i.height - pad // 2), i)
        out.append(canvas)
    return out


def fade_bottom(im: Image.Image, ratio: float = 0.035) -> Image.Image:
    """
    Blendet die unterste Kante aus.

    Die Generatoren malen der Figur gern einen hellen Sohlenrand an, der Teil
    des Bildes ist und nicht des Hintergrunds – freistellen würde den Stiefel
    anfressen. Die Ausblendung verdeckt ihn und wirkt zugleich wie ein
    Kontaktschatten, statt die Figur auf einer hellen Kante schweben zu lassen.
    """
    a = np.asarray(im).astype(np.float32)
    alpha = a[:, :, 3]
    rows = np.where(alpha.max(axis=1) > 8)[0]
    if not rows.size:
        return im
    top, bottom = rows.min(), rows.max()
    fade = max(8, round((bottom - top) * ratio))
    ramp = np.ones(alpha.shape[0], dtype=np.float32)
    ramp[bottom - fade + 1: bottom + 1] = np.linspace(1.0, 0.0, fade)
    ramp[bottom + 1:] = 0.0
    a[:, :, 3] = alpha * ramp[:, None]
    return Image.fromarray(a.astype(np.uint8))


def prepare_figures(sources: list[Path], out_dir: Path) -> None:
    """Alle übergebenen Dateien gelten als Zustände *einer* Figur."""
    cut = [cutout(src) for src in sources]
    out_dir.mkdir(parents=True, exist_ok=True)
    for src, im in zip(sources, normalise(cut)):
        if im.height > FIGURE_MAX_HEIGHT:
            im = im.resize(
                (round(im.width * FIGURE_MAX_HEIGHT / im.height), FIGURE_MAX_HEIGHT), Image.LANCZOS
            )
        im = fade_bottom(im)
        dst = out_dir / f'{src.stem}.webp'
        im.save(dst, 'WEBP', quality=88, method=6)
        print(f'{dst.name:44s} {im.width}x{im.height}  {dst.stat().st_size // 1024:4d} KB')


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument('--scenes', action='store_true', help='Hintergründe aufbereiten')
    mode.add_argument(
        '--figures',
        action='store_true',
        help='Figuren freistellen; alle Dateien eines Aufrufs gehören zu EINER Figur',
    )
    parser.add_argument('--out', type=Path, default=Path('packages/web/public/art'))
    parser.add_argument('files', nargs='+', type=Path)
    args = parser.parse_args()

    missing = [f for f in args.files if not f.exists()]
    if missing:
        sys.exit('Nicht gefunden: ' + ', '.join(str(f) for f in missing))

    if args.scenes:
        out_dir = args.out / 'scenes'
        out_dir.mkdir(parents=True, exist_ok=True)
        for src in args.files:
            dst = out_dir / f'{src.stem}.webp'
            prepare_scene(src, dst)
            print(f'{dst.name:44s} {dst.stat().st_size // 1024:4d} KB')
    else:
        prepare_figures(args.files, args.out / 'characters')


if __name__ == '__main__':
    main()
