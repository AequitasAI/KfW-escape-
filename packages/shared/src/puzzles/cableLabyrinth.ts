import type { CableDir, CableLabyrinthAction, CableLabyrinthState, CableTile } from '../types.js';

export const CABLE_ROWS = 4;
export const CABLE_COLS = 4;
export const CABLE_SOURCE_ROW = 1;
export const CABLE_TARGET_ROW = 2;

const OPPOSITE: Record<CableDir, CableDir> = { N: 'S', S: 'N', E: 'W', W: 'E' };

/**
 * Fixed tile geometry. Tiles are only ever slid, never rotated, so each id
 * carries one immutable connector set.
 *
 * p* tiles form the intended source -> target cable run in the solved layout,
 * d* tiles are decorative conduit fragments that must be shuffled out of the way.
 */
export const CABLE_TILES: Readonly<Record<string, CableTile>> = Object.freeze({
  p1: { id: 'p1', connectors: ['W', 'E'] },
  p2: { id: 'p2', connectors: ['W', 'E'] },
  p3: { id: 'p3', connectors: ['W', 'S'] },
  p4: { id: 'p4', connectors: ['N', 'E'] },
  p5: { id: 'p5', connectors: ['W', 'E'] },
  d1: { id: 'd1', connectors: ['N', 'S'] },
  d2: { id: 'd2', connectors: ['E', 'S'] },
  d3: { id: 'd3', connectors: ['N', 'W'] },
  d4: { id: 'd4', connectors: ['N', 'E', 'S'] },
  d5: { id: 'd5', connectors: ['N', 'S'] },
  d6: { id: 'd6', connectors: ['S', 'E'] },
  d7: { id: 'd7', connectors: ['N', 'W', 'E'] },
  d8: { id: 'd8', connectors: ['N', 'W'] },
  d9: { id: 'd9', connectors: ['E', 'S'] },
  d10: { id: 'd10', connectors: ['N', 'S', 'W'] },
});

export type CableBoard = (string | null)[];

/**
 * The reference solved layout. Row major, null is the single empty cell.
 *
 *   d1  d2  d3  d4
 *   p1  p2  p3  d5      <- source port enters row 1 from the left
 *   d6  d7  p4  p5      <- target port leaves row 2 to the right
 *   d8  d9  d10 ( )
 */
export const CABLE_SOLVED_BOARD: readonly (string | null)[] = Object.freeze([
  'd1', 'd2', 'd3', 'd4',
  'p1', 'p2', 'p3', 'd5',
  'd6', 'd7', 'p4', 'p5',
  'd8', 'd9', 'd10', null,
]);

export function idx(row: number, col: number): number {
  return row * CABLE_COLS + col;
}

export function rowOf(index: number): number {
  return Math.floor(index / CABLE_COLS);
}

export function colOf(index: number): number {
  return index % CABLE_COLS;
}

function tileAt(board: CableBoard, index: number): CableTile | null {
  const id = board[index];
  if (!id) return null;
  return CABLE_TILES[id] ?? null;
}

function hasConnector(tile: CableTile | null, dir: CableDir): boolean {
  return tile !== null && tile.connectors.includes(dir);
}

/**
 * Flood fill from the left source port. A cell is energized only when a real
 * cable path leads to it, so unconnected segments stay dark.
 */
export function computeEnergized(board: CableBoard): { energized: number[]; reachesTarget: boolean } {
  const start = idx(CABLE_SOURCE_ROW, 0);
  const startTile = tileAt(board, start);
  if (!hasConnector(startTile, 'W')) return { energized: [], reachesTarget: false };

  const seen = new Set<number>([start]);
  const queue: number[] = [start];

  while (queue.length > 0) {
    const current = queue.shift() as number;
    const tile = tileAt(board, current);
    if (!tile) continue;
    const r = rowOf(current);
    const c = colOf(current);

    for (const dir of tile.connectors) {
      const nr = dir === 'N' ? r - 1 : dir === 'S' ? r + 1 : r;
      const nc = dir === 'W' ? c - 1 : dir === 'E' ? c + 1 : c;
      if (nr < 0 || nr >= CABLE_ROWS || nc < 0 || nc >= CABLE_COLS) continue;
      const next = idx(nr, nc);
      if (seen.has(next)) continue;
      const nextTile = tileAt(board, next);
      // both sides must physically meet
      if (!hasConnector(nextTile, OPPOSITE[dir])) continue;
      seen.add(next);
      queue.push(next);
    }
  }

  const targetIndex = idx(CABLE_TARGET_ROW, CABLE_COLS - 1);
  const targetTile = tileAt(board, targetIndex);
  const reachesTarget = seen.has(targetIndex) && hasConnector(targetTile, 'E');

  return { energized: [...seen].sort((a, b) => a - b), reachesTarget };
}

export function isCableSolved(board: CableBoard): boolean {
  return computeEnergized(board).reachesTarget;
}

export function emptyIndex(board: CableBoard): number {
  return board.indexOf(null);
}

/** Board indices that may legally slide into the empty cell right now. */
export function legalMoves(board: CableBoard): number[] {
  const empty = emptyIndex(board);
  if (empty < 0) return [];
  const er = rowOf(empty);
  const ec = colOf(empty);
  const moves: number[] = [];
  if (er > 0) moves.push(idx(er - 1, ec));
  if (er < CABLE_ROWS - 1) moves.push(idx(er + 1, ec));
  if (ec > 0) moves.push(idx(er, ec - 1));
  if (ec < CABLE_COLS - 1) moves.push(idx(er, ec + 1));
  return moves.sort((a, b) => a - b);
}

export function isLegalMove(board: CableBoard, index: number): boolean {
  if (!Number.isInteger(index) || index < 0 || index >= board.length) return false;
  if (board[index] === null) return false;
  const empty = emptyIndex(board);
  if (empty < 0) return false;
  const dr = Math.abs(rowOf(index) - rowOf(empty));
  const dc = Math.abs(colOf(index) - colOf(empty));
  return dr + dc === 1;
}

/** Applies one slide. Returns null when the move is not adjacent to the gap. */
export function applyMove(board: CableBoard, index: number): CableBoard | null {
  if (!isLegalMove(board, index)) return null;
  const empty = emptyIndex(board);
  const next = [...board];
  next[empty] = next[index] as string;
  next[index] = null;
  return next;
}

export function encodeBoard(board: CableBoard): string {
  return board.map((cell) => cell ?? '_').join(',');
}

/**
 * Breadth-first search for the shortest slide sequence that lights up the
 * target port. Used as a test helper to prove the frozen start state is
 * solvable and to measure its difficulty.
 */
export function solveCable(
  board: CableBoard,
  options: { maxDepth?: number; maxNodes?: number } = {},
): number[] | null {
  const maxDepth = options.maxDepth ?? 20;
  const maxNodes = options.maxNodes ?? 3_000_000;

  if (isCableSolved(board)) return [];

  const seen = new Set<string>([encodeBoard(board)]);
  let frontier: { board: CableBoard; path: number[] }[] = [{ board, path: [] }];
  let nodes = 0;

  for (let depth = 0; depth < maxDepth; depth += 1) {
    const next: { board: CableBoard; path: number[] }[] = [];
    for (const node of frontier) {
      for (const move of legalMoves(node.board)) {
        const child = applyMove(node.board, move);
        if (!child) continue;
        const key = encodeBoard(child);
        if (seen.has(key)) continue;
        seen.add(key);
        nodes += 1;
        if (nodes > maxNodes) return null;
        const path = [...node.path, move];
        if (isCableSolved(child)) return path;
        next.push({ board: child, path });
      }
    }
    if (next.length === 0) return null;
    frontier = next;
  }
  return null;
}

/**
 * Frozen start state, produced from CABLE_SOLVED_BOARD by the legal slide
 * sequence in CABLE_SCRAMBLE_MOVES (see cableLabyrinth.test.ts, which replays
 * and re-verifies it on every run).
 */
export const CABLE_SCRAMBLE_MOVES: readonly number[] = Object.freeze([
  11, 10, 6, 2, 3, 7, 11, 15, 14, 10, 11, 7, 3, 2, 1,
]);

export function buildStartBoard(): CableBoard {
  let board: CableBoard = [...CABLE_SOLVED_BOARD];
  for (const move of CABLE_SCRAMBLE_MOVES) {
    const next = applyMove(board, move);
    if (!next) throw new Error(`Illegal scramble move ${move} in CABLE_SCRAMBLE_MOVES`);
    board = next;
  }
  return board;
}

export function createCableLabyrinthState(): CableLabyrinthState {
  const board = buildStartBoard();
  const { energized } = computeEnergized(board);
  return {
    kind: 'cable_labyrinth',
    board,
    tiles: { ...CABLE_TILES },
    sourceRow: CABLE_SOURCE_ROW,
    targetRow: CABLE_TARGET_ROW,
    rows: CABLE_ROWS,
    cols: CABLE_COLS,
    energized,
    moves: 0,
    solved: false,
  };
}

export function reduceCableLabyrinth(
  state: CableLabyrinthState,
  action: CableLabyrinthAction,
): CableLabyrinthState | null {
  if (state.solved) return null;
  if (action.type !== 'slide') return null;

  const board = applyMove(state.board, action.index);
  if (!board) return null;

  const { energized, reachesTarget } = computeEnergized(board);
  return { ...state, board, energized, moves: state.moves + 1, solved: reachesTarget };
}
