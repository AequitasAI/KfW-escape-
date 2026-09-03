import type { TestmastersDiffAction, TestmastersDiffState } from '../types.js';

export interface DiffHotspot {
  id: string;
  label: string;
  left: string;
  right: string;
}

/** Source: 03_puzzles/testmasters_diff.json */
export const DIFF_HOTSPOTS: readonly DiffHotspot[] = [
  { id: 'rune_top_left', label: 'Rune oben links', left: 'Dreieck', right: 'Diamant' },
  { id: 'middle_arrow', label: 'Mittlere Verbindung', left: 'Pfeil nach rechts', right: 'Pfeil nach links' },
  { id: 'bottom_gear_spokes', label: 'Unteres Zahnrad', left: '6 Speichen', right: '5 Speichen' },
  { id: 'container_label', label: 'Beschriftung des Behälters', left: 'IV', right: 'VI' },
] as const;

export const DIFF_HOTSPOT_IDS: readonly string[] = DIFF_HOTSPOTS.map((h) => h.id);
export const DIFF_ANTI_SPAM_COOLDOWN_MS = 750;
export const DIFF_FALSE_CLICK_PENALTY_MS = 0;

export function createTestmastersDiffState(): TestmastersDiffState {
  return { kind: 'testmasters_diff', found: [], misses: 0, lastMissAt: null, solved: false };
}

export function reduceTestmastersDiff(
  state: TestmastersDiffState,
  action: TestmastersDiffAction,
  now: number,
): TestmastersDiffState | null {
  if (state.solved) return null;

  // Server side anti spam window; a click during cooldown is silently dropped.
  if (state.lastMissAt !== null && now - state.lastMissAt < DIFF_ANTI_SPAM_COOLDOWN_MS) return null;

  if (action.type === 'miss') {
    return { ...state, misses: state.misses + 1, lastMissAt: now };
  }

  if (action.type !== 'hit') return null;
  if (!DIFF_HOTSPOT_IDS.includes(action.hotspotId)) return null;
  // each hotspot counts exactly once
  if (state.found.includes(action.hotspotId)) return null;

  const found = [...state.found, action.hotspotId];
  return { ...state, found, lastMissAt: null, solved: found.length === DIFF_HOTSPOT_IDS.length };
}
