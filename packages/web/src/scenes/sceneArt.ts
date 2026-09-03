import { useEffect, useState } from 'react';
import type { SceneId } from './Scene.js';

/**
 * Drop-in point for final artwork.
 *
 * Scenes and characters render generated SVG by default. As soon as a matching
 * file exists under `packages/web/public/art/`, that image takes over - no
 * component change, no puzzle change.
 *
 * Any of the extensions below works, so an image straight out of a generator
 * can be dropped in without converting it first.
 *
 * See 08_assets/IMAGE_PROMPTS.md for ready-to-use generation prompts and
 * docs/ARTWORK.md for the procedure.
 */

/** Tried in order; the first one that actually loads wins. */
export const ART_EXTENSIONS = ['webp', 'png', 'jpg', 'jpeg'] as const;

export const SCENE_BASENAME: Record<SceneId, string> = {
  lobby: 'scene_lobby',
  archive: 'scene_archive',
  connection: 'scene_connection',
  testmasters: 'scene_testmasters',
  mine: 'scene_operations_mine',
  gate: 'scene_black_gate',
  bridge: 'scene_final_bridge',
  defeat: 'scene_defeat',
};

export const DWARF_BASENAME = 'character_operations_dwarf';
export const GUARD_BASENAME = 'character_black_guard';

/* ------------------------------------------------------------------ */
/* Resolver                                                            */
/* ------------------------------------------------------------------ */

const probes = new Map<string, Promise<string | null>>();
const resolved = new Map<string, string | null>();

function loads(src: string): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve(false);
      return;
    }
    const image = new Image();
    image.onload = () => resolve(image.naturalWidth > 0);
    image.onerror = () => resolve(false);
    image.src = src;
  });
}

/**
 * Resolves the first existing file across a priority list of basenames and the
 * supported extensions. A miss costs one cached 404 and is never retried.
 */
export function resolveArt(key: string, dir: string, basenames: string[]): Promise<string | null> {
  const cached = probes.get(key);
  if (cached) return cached;

  const probe = (async () => {
    for (const basename of basenames) {
      for (const extension of ART_EXTENSIONS) {
        const src = `/art/${dir}/${basename}.${extension}`;
        if (await loads(src)) return src;
      }
    }
    return null;
  })().then((src) => {
    resolved.set(key, src);
    return src;
  });

  probes.set(key, probe);
  return probe;
}

/** Synchronous read of an already resolved asset, for the first render. */
export function knownArt(key: string): string | null {
  return resolved.get(key) ?? null;
}

/** React binding: returns the resolved image path, or null while none exists. */
export function useArt(key: string, dir: string, basenames: string[]): string | null {
  const [src, setSrc] = useState<string | null>(() => knownArt(key));

  useEffect(() => {
    let active = true;
    void resolveArt(key, dir, basenames).then((found) => {
      if (active) setSrc(found);
    });
    return () => {
      active = false;
    };
    // basenames is derived from key by every caller
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, dir]);

  return src;
}

/* ------------------------------------------------------------------ */
/* Per-asset helpers                                                   */
/* ------------------------------------------------------------------ */

export function sceneArtKey(id: SceneId): string {
  return `scene:${id}`;
}

export function useSceneArt(id: SceneId): string | null {
  return useArt(sceneArtKey(id), 'scenes', [SCENE_BASENAME[id]]);
}

export const DWARF_MOOD_ORDER = ['neutral', 'skeptical', 'happy'] as const;

/**
 * A mood-specific dwarf wins over the generic one, so a single file is enough
 * to get started and three files give the full performance.
 *
 * Every other dwarf file is listed after that on purpose: mixing a rendered
 * illustration for one mood with the drawn SVG for the next one inside the same
 * scene looks broken. As soon as any dwarf image exists, all three moods use an
 * image - the expression just stops changing.
 */
export function dwarfBasenames(mood: string): string[] {
  const names = [`${DWARF_BASENAME}_${mood}`, DWARF_BASENAME];
  for (const other of DWARF_MOOD_ORDER) {
    if (other !== mood) names.push(`${DWARF_BASENAME}_${other}`);
  }
  return names;
}

export function useDwarfArt(mood: string): string | null {
  return useArt(`dwarf:${mood}`, 'characters', dwarfBasenames(mood));
}

/**
 * `_open` is optional. Without it the same figure is shown in both states and
 * the lowered sword simply does not happen - the copy still changes. Both names
 * are listed in either direction so a single file of either kind is enough.
 */
export function guardBasenames(open: boolean): string[] {
  return open
    ? [`${GUARD_BASENAME}_open`, GUARD_BASENAME]
    : [GUARD_BASENAME, `${GUARD_BASENAME}_open`];
}

export function useGuardArt(open: boolean): string | null {
  return useArt(`guard:${open ? 'open' : 'closed'}`, 'characters', guardBasenames(open));
}

/**
 * Warms the other dwarf moods so the swap at the payoff moment is instant
 * rather than a visible pop while the browser fetches.
 */
export function preloadDwarfMoods(moods: readonly string[]): void {
  for (const mood of moods) void resolveArt(`dwarf:${mood}`, 'characters', dwarfBasenames(mood));
}
