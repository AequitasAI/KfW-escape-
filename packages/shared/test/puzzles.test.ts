import { describe, expect, it } from 'vitest';
import {
  ARCHIVE_SOLUTION,
  ARCHIVE_START_ORDER,
  RUNES,
  satisfiesArchiveClues,
  createArchiveRunesState,
  reduceArchiveRunes,
  isArchiveSolved,
} from '../src/puzzles/archiveRunes.js';
import {
  CABLE_SOLVED_BOARD,
  CABLE_SCRAMBLE_MOVES,
  applyMove,
  buildStartBoard,
  computeEnergized,
  createCableLabyrinthState,
  isCableSolved,
  isLegalMove,
  legalMoves,
  reduceCableLabyrinth,
  solveCable,
  idx,
  CABLE_SOURCE_ROW,
  CABLE_TARGET_ROW,
  CABLE_COLS,
} from '../src/puzzles/cableLabyrinth.js';
import {
  DIFF_HOTSPOT_IDS,
  createTestmastersDiffState,
  reduceTestmastersDiff,
  DIFF_ANTI_SPAM_COOLDOWN_MS,
} from '../src/puzzles/testmastersDiff.js';
import {
  GEAR_COUNT,
  GEAR_PROFILES,
  GEAR_SOLUTION,
  GEAR_START_ORIENTATIONS,
  HOLE,
  PEG,
  computeContacts,
  createOperationsGearsState,
  enumerateGearSolutions,
  isGearsSolved,
  reduceOperationsGears,
  poweredUpTo,
} from '../src/puzzles/operationsGears.js';
import {
  GATE_SOLUTION,
  GATE_CLUES,
  createBlackGateState,
  enumerateGateSolutions,
  reduceBlackGate,
  scoreGuess,
} from '../src/puzzles/blackGate.js';

/* ------------------------------------------------------------------ */
/* A06 - Puzzle 1: unique rune solution                                */
/* ------------------------------------------------------------------ */

function permutations<T>(items: readonly T[]): T[][] {
  if (items.length <= 1) return [[...items]];
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += 1) {
    const rest = [...items.slice(0, i), ...items.slice(i + 1)];
    for (const tail of permutations(rest)) out.push([items[i] as T, ...tail]);
  }
  return out;
}

describe('P1 Archiv der alten Bestände', () => {
  it('has exactly one of the 120 permutations satisfying all three clues', () => {
    const ids = RUNES.map((r) => r.id);
    const all = permutations(ids);
    expect(all).toHaveLength(120);
    const matching = all.filter(satisfiesArchiveClues);
    expect(matching).toHaveLength(1);
    expect(matching[0]).toEqual([...ARCHIVE_SOLUTION]);
  });

  it('does not start on the solution', () => {
    expect(isArchiveSolved(ARCHIVE_START_ORDER)).toBe(false);
    expect([...ARCHIVE_START_ORDER].sort()).toEqual([...ARCHIVE_SOLUTION].sort());
  });

  it('only the exact order solves', () => {
    let state = createArchiveRunesState();
    // ARCHIVE_START_ORDER = moon, river, flame, hammer, mountain
    const moves: [number, number][] = [
      [0, 2], // flame, river, moon, hammer, mountain
      [1, 4], // flame, mountain, moon, hammer, river
      [2, 3], // flame, mountain, hammer, moon, river
    ];
    for (const [a, b] of moves) {
      const next = reduceArchiveRunes(state, { type: 'swap', a, b });
      expect(next).not.toBeNull();
      state = next!;
    }
    expect(state.order).toEqual([...ARCHIVE_SOLUTION]);
    expect(state.solved).toBe(true);
  });

  it('rejects out of range and no-op swaps', () => {
    const state = createArchiveRunesState();
    expect(reduceArchiveRunes(state, { type: 'swap', a: 0, b: 0 })).toBeNull();
    expect(reduceArchiveRunes(state, { type: 'swap', a: -1, b: 2 })).toBeNull();
    expect(reduceArchiveRunes(state, { type: 'swap', a: 0, b: 5 })).toBeNull();
    expect(reduceArchiveRunes(state, { type: 'shift', index: 0, dir: -1 })).toBeNull();
    expect(reduceArchiveRunes(state, { type: 'shift', index: 4, dir: 1 })).toBeNull();
  });
});

/* ------------------------------------------------------------------ */
/* A07 - Puzzle 2: solvable sliding board + live energy                */
/* ------------------------------------------------------------------ */

describe('P2 Die verlorene Verbindung', () => {
  it('the reference layout connects source port to target port', () => {
    const board = [...CABLE_SOLVED_BOARD];
    expect(isCableSolved(board)).toBe(true);
    const { energized } = computeEnergized(board);
    expect(energized).toContain(idx(CABLE_SOURCE_ROW, 0));
    expect(energized).toContain(idx(CABLE_TARGET_ROW, CABLE_COLS - 1));
  });

  it('the frozen start state is produced by legal slides only', () => {
    let board = [...CABLE_SOLVED_BOARD];
    expect(CABLE_SCRAMBLE_MOVES.length).toBeGreaterThanOrEqual(8);
    for (const move of CABLE_SCRAMBLE_MOVES) {
      expect(isLegalMove(board, move)).toBe(true);
      const next = applyMove(board, move);
      expect(next).not.toBeNull();
      board = next!;
    }
    expect(board).toEqual(buildStartBoard());
    // same multiset of tiles, nothing teleported or duplicated
    expect([...board].sort()).toEqual([...CABLE_SOLVED_BOARD].sort());
  });

  it('the frozen start state is not already solved but shows partial energy', () => {
    const board = buildStartBoard();
    expect(isCableSolved(board)).toBe(false);
    const { energized, reachesTarget } = computeEnergized(board);
    expect(reachesTarget).toBe(false);
    // players immediately see that the source port is live
    expect(energized.length).toBeGreaterThan(0);
    expect(energized).toContain(idx(CABLE_SOURCE_ROW, 0));
  });

  it('BFS proves the frozen start state is solvable within the intended difficulty', () => {
    const solution = solveCable(buildStartBoard(), { maxDepth: 16 });
    expect(solution).not.toBeNull();
    expect(solution!.length).toBeGreaterThanOrEqual(8);
    expect(solution!.length).toBeLessThanOrEqual(16);

    let board = buildStartBoard();
    for (const move of solution!) {
      expect(isLegalMove(board, move)).toBe(true);
      board = applyMove(board, move)!;
    }
    expect(isCableSolved(board)).toBe(true);
  });

  it('only tiles adjacent to the gap may move, and tiles never rotate', () => {
    const state = createCableLabyrinthState();
    const allowed = legalMoves(state.board);
    expect(allowed.length).toBeGreaterThan(0);

    for (let i = 0; i < state.board.length; i += 1) {
      const result = reduceCableLabyrinth(state, { type: 'slide', index: i });
      if (allowed.includes(i)) expect(result).not.toBeNull();
      else expect(result).toBeNull();
    }

    const moved = reduceCableLabyrinth(state, { type: 'slide', index: allowed[0]! })!;
    // connector geometry per tile id is immutable
    expect(moved.tiles).toEqual(state.tiles);
  });

  it('energy traversal marks only genuinely connected segments', () => {
    // an isolated tile that touches nothing must stay dark
    const board = [...CABLE_SOLVED_BOARD];
    const { energized } = computeEnergized(board);
    // d4 sits top right and is not reachable from the source run
    expect(energized).not.toContain(3);
    // breaking the run at p2 kills everything downstream
    const broken = [...board];
    broken[5] = null;
    broken[15] = 'p2';
    const after = computeEnergized(broken);
    expect(after.reachesTarget).toBe(false);
    expect(after.energized).toEqual([idx(CABLE_SOURCE_ROW, 0)]);
  });

  it('auto solves as soon as the target port is reached', () => {
    let state = createCableLabyrinthState();
    const solution = solveCable(state.board, { maxDepth: 16 })!;
    for (const move of solution) {
      state = reduceCableLabyrinth(state, { type: 'slide', index: move })!;
    }
    expect(state.solved).toBe(true);
    expect(reduceCableLabyrinth(state, { type: 'slide', index: legalMoves(state.board)[0]! })).toBeNull();
  });
});

/* ------------------------------------------------------------------ */
/* A08 - Puzzle 3: exactly four differences                            */
/* ------------------------------------------------------------------ */

describe('P3 Halle der Prüfmeister', () => {
  it('defines exactly four hotspots', () => {
    expect(DIFF_HOTSPOT_IDS).toHaveLength(4);
    expect(new Set(DIFF_HOTSPOT_IDS).size).toBe(4);
  });

  it('counts each hotspot once and only solves on all four', () => {
    let state = createTestmastersDiffState();
    let now = 1_000;
    for (const id of DIFF_HOTSPOT_IDS) {
      const next = reduceTestmastersDiff(state, { type: 'hit', hotspotId: id }, now);
      expect(next).not.toBeNull();
      state = next!;
      // a repeated click on the same hotspot changes nothing
      expect(reduceTestmastersDiff(state, { type: 'hit', hotspotId: id }, now)).toBeNull();
      now += 1_000;
    }
    expect(state.found).toHaveLength(4);
    expect(state.solved).toBe(true);
  });

  it('an unknown hotspot never solves and a miss never solves', () => {
    const state = createTestmastersDiffState();
    expect(reduceTestmastersDiff(state, { type: 'hit', hotspotId: 'nope' }, 0)).toBeNull();
    const missed = reduceTestmastersDiff(state, { type: 'miss' }, 1_000);
    expect(missed).not.toBeNull();
    expect(missed!.solved).toBe(false);
    expect(missed!.misses).toBe(1);
  });

  it('enforces the anti spam cooldown after a miss', () => {
    const state = createTestmastersDiffState();
    const missed = reduceTestmastersDiff(state, { type: 'miss' }, 10_000)!;
    expect(
      reduceTestmastersDiff(missed, { type: 'hit', hotspotId: DIFF_HOTSPOT_IDS[0]! }, 10_000 + DIFF_ANTI_SPAM_COOLDOWN_MS - 1),
    ).toBeNull();
    expect(
      reduceTestmastersDiff(missed, { type: 'hit', hotspotId: DIFF_HOTSPOT_IDS[0]! }, 10_000 + DIFF_ANTI_SPAM_COOLDOWN_MS),
    ).not.toBeNull();
  });
});

/* ------------------------------------------------------------------ */
/* A09 - Puzzle 4: exactly one of 4096 gear configurations             */
/* ------------------------------------------------------------------ */

describe('P4 Minen des Betriebs', () => {
  it('has exactly one global solution across all 8^4 movable configurations', () => {
    const solutions = enumerateGearSolutions();
    expect(solutions).toHaveLength(1);
    expect(solutions[0]).toEqual([...GEAR_SOLUTION]);
  });

  it('enumerates the full 4096 state space', () => {
    let count = 0;
    for (let a = 0; a < 8; a += 1)
      for (let b = 0; b < 8; b += 1)
        for (let c = 0; c < 8; c += 1)
          for (let d = 0; d < 8; d += 1) {
            count += 1;
            const solved = isGearsSolved([0, a, b, c, d]);
            const [, s1, s2, s3, s4] = GEAR_SOLUTION;
            expect(solved).toBe(a === s1 && b === s2 && c === s3 && d === s4);
          }
    expect(count).toBe(4096);
  });

  it('treibt nur über Zapfen in Loch, nie über glatten Rand', () => {
    const contacts = computeContacts(GEAR_SOLUTION);
    expect(contacts).toEqual([true, true, true, true]);
    expect(poweredUpTo(contacts)).toBe(4);

    // die ersten beiden Räder richtig, der Rest nicht: die Kette endet dort
    const [, s1, s2] = GEAR_SOLUTION;
    const partial = computeContacts([0, s1 as number, s2 as number, 0, 0]);
    expect(partial[0]).toBe(true);
    expect(partial[1]).toBe(true);
    expect(partial[2]).toBe(false);
    expect(poweredUpTo(partial)).toBe(2);
  });

  it('gibt jedem treibenden Rad genau einen Zapfen - daher die Eindeutigkeit', () => {
    /*
     * Der Beweis hängt daran: "Zapfen zeigt nach rechts" legt die Stellung
     * eines Rades eindeutig fest. Mit zwei Zapfen gäbe es mehrere Lösungen.
     * Das Torrad treibt nichts mehr und braucht dafür genau ein Loch.
     */
    const pegs = (gear: number): number =>
      (GEAR_PROFILES[gear] as readonly number[]).filter((v) => v === PEG).length;
    const holes = (gear: number): number =>
      (GEAR_PROFILES[gear] as readonly number[]).filter((v) => v === HOLE).length;

    for (let gear = 0; gear < GEAR_COUNT - 1; gear += 1) expect(pegs(gear)).toBe(1);
    expect(holes(GEAR_COUNT - 1)).toBe(1);
    // und jedes Rad hat überhaupt Löcher, sonst könnte es nichts aufnehmen
    for (let gear = 1; gear < GEAR_COUNT; gear += 1) expect(holes(gear)).toBeGreaterThan(0);
  });

  it('never moves the fixed motor gear and only solves on the full chain', () => {
    const state = createOperationsGearsState();
    expect(isGearsSolved(GEAR_START_ORIENTATIONS)).toBe(false);
    expect(reduceOperationsGears(state, { type: 'rotate', gear: 0, dir: 1 })).toBeNull();
    expect(reduceOperationsGears(state, { type: 'rotate', gear: 5, dir: 1 })).toBeNull();

    let current = state;
    const plan: [number, number][] = GEAR_SOLUTION.slice(1).map((target, index) => [
      index + 1,
      target,
    ]);
    for (const [gear, target] of plan) {
      for (let i = 0; i < target; i += 1) {
        const next = reduceOperationsGears(current, { type: 'rotate', gear, dir: 1 });
        expect(next).not.toBeNull();
        current = next!;
      }
    }
    expect(current.orientations).toEqual([...GEAR_SOLUTION]);
    expect(current.solved).toBe(true);
    // input is locked once the machine runs
    expect(reduceOperationsGears(current, { type: 'rotate', gear: 1, dir: 1 })).toBeNull();
  });

  it('wraps orientations in both directions', () => {
    const state = createOperationsGearsState();
    const back = reduceOperationsGears(state, { type: 'rotate', gear: 4, dir: -1 })!;
    expect(back.orientations[4]).toBe(7);
  });
});

/* ------------------------------------------------------------------ */
/* A10 - Puzzle 5: 042 including the leading zero                      */
/* ------------------------------------------------------------------ */

describe('P5 Das Schwarze Tor', () => {
  it('has exactly one code in 000..999 matching all five statements', () => {
    const solutions = enumerateGateSolutions();
    expect(solutions).toEqual([GATE_SOLUTION]);
  });

  it('the published clue texts match the scored solution', () => {
    for (const clue of GATE_CLUES) {
      expect(scoreGuess(clue.guess, GATE_SOLUTION)).toEqual({ bulls: clue.bulls, cows: clue.cows });
    }
  });

  it('accepts 042 with its leading zero and rejects everything else', () => {
    let state = createBlackGateState();
    for (const digit of [0, 4, 2]) {
      state = reduceBlackGate(state, { type: 'digit', digit })!;
    }
    expect(state.entry).toBe('042');
    const solved = reduceBlackGate(state, { type: 'submit' })!;
    expect(solved.solved).toBe(true);

    let wrong = createBlackGateState();
    for (const digit of [4, 2, 0]) wrong = reduceBlackGate(wrong, { type: 'digit', digit })!;
    const rejected = reduceBlackGate(wrong, { type: 'submit' })!;
    expect(rejected.solved).toBe(false);
    expect(rejected.entry).toBe('');
    expect(rejected.lastRejected).toBe('420');
    expect(rejected.attempts).toEqual(['420']);
  });

  it('rejects malformed input', () => {
    const state = createBlackGateState();
    expect(reduceBlackGate(state, { type: 'digit', digit: 10 })).toBeNull();
    expect(reduceBlackGate(state, { type: 'digit', digit: -1 })).toBeNull();
    expect(reduceBlackGate(state, { type: 'backspace' })).toBeNull();
    expect(reduceBlackGate(state, { type: 'submit' })).toBeNull();

    let full = state;
    for (const digit of [1, 2, 3]) full = reduceBlackGate(full, { type: 'digit', digit })!;
    expect(reduceBlackGate(full, { type: 'digit', digit: 4 })).toBeNull();
  });
});
