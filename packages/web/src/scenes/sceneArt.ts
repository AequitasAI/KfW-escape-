import type { SceneId } from './Scene.js';

/**
 * Drop-in point for final artwork.
 *
 * Every scene renders a generated SVG by default. As soon as a file with the
 * matching name exists under `packages/web/public/art/scenes/`, that image is
 * layered on top and becomes the background - no component change, no rebuild
 * of any puzzle, no architecture work.
 *
 * See 08_assets/IMAGE_PROMPTS.md for ready-to-use generation prompts and
 * docs/ARTWORK.md for the drop-in procedure.
 */

/** Public paths, relative to the served root. */
export const SCENE_ART: Record<SceneId, string> = {
  lobby: '/art/scenes/scene_lobby.webp',
  archive: '/art/scenes/scene_archive.webp',
  connection: '/art/scenes/scene_connection.webp',
  testmasters: '/art/scenes/scene_testmasters.webp',
  mine: '/art/scenes/scene_operations_mine.webp',
  gate: '/art/scenes/scene_black_gate.webp',
  bridge: '/art/scenes/scene_final_bridge.webp',
  defeat: '/art/scenes/scene_defeat.webp',
};

export const CHARACTER_ART = {
  dwarf: '/art/characters/character_operations_dwarf.webp',
  guard: '/art/characters/character_black_guard.webp',
} as const;

/**
 * A missing file must never show a broken image, so availability is probed once
 * per asset and cached. Until an image resolves, the generated SVG stands on its
 * own - which is also the state the MVP ships in.
 */
const probes = new Map<string, Promise<boolean>>();
const resolved = new Map<string, boolean>();

export function artIsKnownAvailable(src: string): boolean {
  return resolved.get(src) === true;
}

export function probeArt(src: string): Promise<boolean> {
  const cached = probes.get(src);
  if (cached) return cached;

  const probe = new Promise<boolean>((resolve) => {
    if (typeof window === 'undefined') {
      resolve(false);
      return;
    }
    const image = new Image();
    image.onload = () => resolve(image.naturalWidth > 0);
    image.onerror = () => resolve(false);
    image.src = src;
  }).then((available) => {
    resolved.set(src, available);
    return available;
  });

  probes.set(src, probe);
  return probe;
}
