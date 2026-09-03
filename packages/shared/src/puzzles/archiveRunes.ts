import type { ArchiveRunesAction, ArchiveRunesState } from '../types.js';

export interface RuneDef {
  id: string;
  label: string;
  symbol: string;
}

/** Source: 03_puzzles/archive_runes.json */
export const RUNES: readonly RuneDef[] = [
  { id: 'flame', label: 'Flamme', symbol: '\u{1F525}' },
  { id: 'mountain', label: 'Berg', symbol: '▲' },
  { id: 'hammer', label: 'Hammer', symbol: '⚒' },
  { id: 'moon', label: 'Mond', symbol: '☾' },
  { id: 'river', label: 'Fluss', symbol: '≈' },
] as const;

export const ARCHIVE_SOLUTION: readonly string[] = ['flame', 'mountain', 'hammer', 'moon', 'river'];

export const ARCHIVE_CLUES: readonly string[] = [
  'Der Fluss liegt am äußersten rechten Ende.',
  'Der Hammer steht unmittelbar links vom Mond.',
  'Flamme, Berg und Hammer bilden – in genau dieser Reihenfolge – eine zusammenhängende Dreiergruppe.',
];

/** Fixed, non-random start order. Deliberately not a near-miss of the solution. */
export const ARCHIVE_START_ORDER: readonly string[] = ['moon', 'river', 'flame', 'hammer', 'mountain'];

/**
 * Evaluates the three clues from the puzzle spec against a candidate order.
 * Used by the uniqueness test to prove exactly one of the 120 permutations fits.
 */
export function satisfiesArchiveClues(order: readonly string[]): boolean {
  if (order.length !== 5) return false;
  // 1. river is at the far right end
  if (order[4] !== 'river') return false;
  // 2. hammer sits immediately left of moon
  const hammer = order.indexOf('hammer');
  const moon = order.indexOf('moon');
  if (hammer < 0 || moon < 0 || moon !== hammer + 1) return false;
  // 3. flame, mountain, hammer form a contiguous triple in exactly that order
  const flame = order.indexOf('flame');
  const mountain = order.indexOf('mountain');
  if (flame < 0 || mountain < 0) return false;
  if (mountain !== flame + 1 || hammer !== mountain + 1) return false;
  return true;
}

export function createArchiveRunesState(): ArchiveRunesState {
  return { kind: 'archive_runes', order: [...ARCHIVE_START_ORDER], solved: false };
}

export function isArchiveSolved(order: readonly string[]): boolean {
  return order.length === ARCHIVE_SOLUTION.length && order.every((id, i) => id === ARCHIVE_SOLUTION[i]);
}

export function reduceArchiveRunes(
  state: ArchiveRunesState,
  action: ArchiveRunesAction,
): ArchiveRunesState | null {
  if (state.solved) return null;
  const order = [...state.order];
  const last = order.length - 1;

  if (action.type === 'swap') {
    const { a, b } = action;
    if (!Number.isInteger(a) || !Number.isInteger(b)) return null;
    if (a < 0 || b < 0 || a > last || b > last || a === b) return null;
    const tmp = order[a] as string;
    order[a] = order[b] as string;
    order[b] = tmp;
  } else if (action.type === 'shift') {
    const { index, dir } = action;
    if (!Number.isInteger(index) || (dir !== -1 && dir !== 1)) return null;
    const target = index + dir;
    if (index < 0 || index > last || target < 0 || target > last) return null;
    const tmp = order[index] as string;
    order[index] = order[target] as string;
    order[target] = tmp;
  } else {
    return null;
  }

  return { ...state, order, solved: isArchiveSolved(order) };
}
