import type { SceneId } from './Scene.js';

/**
 * Drop-in point for final artwork.
 *
 * Every scene renders a generated SVG by default. As soon as a matching file
 * exists under `packages/web/public/art/scenes/`, that image is layered on top
 * and becomes the background - no component change, no puzzle change.
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

export const CHARACTER_BASENAME = {
  dwarf: 'character_operations_dwarf',
  guard: 'character_black_guard',
} as const;

function candidates(dir: string, basename: string): string[] {
  return ART_EXTENSIONS.map((extension) => `/art/${dir}/${basename}.${extension}`);
}

export function sceneCandidates(id: SceneId): string[] {
  return candidates('scenes', SCENE_BASENAME[id]);
}

/**
 * A missing file must never show a broken image, so each scene is probed once
 * and the result cached. Until an image resolves, the generated SVG stands on
 * its own - which is also the state the MVP ships in.
 */
const probes = new Map<SceneId, Promise<string | null>>();
const resolved = new Map<SceneId, string | null>();

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

/** Synchronous read of an already probed scene, for the first render. */
export function knownSceneArt(id: SceneId): string | null {
  return resolved.get(id) ?? null;
}

export function probeSceneArt(id: SceneId): Promise<string | null> {
  const cached = probes.get(id);
  if (cached) return cached;

  const probe = (async () => {
    for (const src of sceneCandidates(id)) {
      // sequential on purpose: the common case is the first extension hitting,
      // and a miss costs nothing but a cached 404
      if (await loads(src)) return src;
    }
    return null;
  })().then((src) => {
    resolved.set(id, src);
    return src;
  });

  probes.set(id, probe);
  return probe;
}
