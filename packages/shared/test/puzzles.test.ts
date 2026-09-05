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
  CONTACT_COUNT,
  GATE_CONNECTOR,
  GEAR_COUNT,
  GEAR_SOLUTION,
  GEAR_START_ORIENTATIONS,
  GEAR_STEPS,
  MOTOR_CONNECTOR,
  chainBranching,
  computeContacts,
  connectorsFit,
  createOperationsGearsState,
  enumerateGearSolutions,
  isGearsSolved,
  leftConnector,
  reduceOperationsGears,
  poweredUpTo,
  rightConnector,
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
  it('hat über alle 8^5 Stellungen genau eine globale Lösung', () => {
    const solutions = enumerateGearSolutions();
    expect(solutions).toHaveLength(1);
    expect(solutions[0]).toEqual([...GEAR_SOLUTION]);
  });

  it('zählt den vollständigen Zustandsraum auf', () => {
    let count = 0;
    const orientations = [0, 0, 0, 0, 0];
    const walk = (gear: number): void => {
      if (gear === GEAR_COUNT) {
        count += 1;
        expect(isGearsSolved(orientations)).toBe(
          orientations.every((o, i) => o === GEAR_SOLUTION[i]),
        );
        return;
      }
      for (let o = 0; o < GEAR_STEPS; o += 1) {
        orientations[gear] = o;
        walk(gear + 1);
      }
    };
    walk(0);
    expect(count).toBe(GEAR_STEPS ** GEAR_COUNT);
  });

  it('greift nur bei gleicher Form und entgegengesetzter Ausprägung', () => {
    const peg = { shape: 'triangle', polarity: 'peg' } as const;
    const socket = { shape: 'triangle', polarity: 'socket' } as const;
    expect(connectorsFit(peg, socket)).toBe(true);
    expect(connectorsFit(socket, peg)).toBe(true);
    // gleiche Form, gleiche Ausprägung
    expect(connectorsFit(peg, peg)).toBe(false);
    // andere Form, passende Ausprägung
    expect(connectorsFit(peg, { shape: 'circle', polarity: 'socket' })).toBe(false);
    // blosse Verzahnung greift nie
    expect(connectorsFit(peg, null)).toBe(false);
    expect(connectorsFit(null, null)).toBe(false);
  });

  it('ist lokal mehrdeutig - genau das macht es zum Kettenrätsel', () => {
    /*
     * Wäre je Rad nur eine Stellung lokal passend, könnte man die Kette von
     * links nach rechts stur abhaken. Der Reiz entsteht erst dadurch, dass
     * mehrere Stellungen lokal passen und sich erst weiter rechts als falsch
     * erweisen.
     */
    const branching = chainBranching();
    expect(branching).toHaveLength(GEAR_COUNT + 1);
    expect(branching[0]).toBeGreaterThanOrEqual(3);
    expect(Math.max(...branching)).toBeGreaterThanOrEqual(5);
    expect(branching[branching.length - 1]).toBe(1);
  });

  it('verankert die Kette an Motor und Tor', () => {
    // ohne feste Enden wäre jede Kette beliebig verschiebbar
    expect(MOTOR_CONNECTOR.polarity).toBe('peg');
    expect(GATE_CONNECTOR.polarity).toBe('socket');

    const solved = [...GEAR_SOLUTION];
    expect(connectorsFit(MOTOR_CONNECTOR, leftConnector(0, solved[0] as number))).toBe(true);
    expect(
      connectorsFit(rightConnector(GEAR_COUNT - 1, solved[GEAR_COUNT - 1] as number), GATE_CONNECTOR),
    ).toBe(true);
  });

  it('lässt einzelne Kontakte greifen, ohne dass die Kette steht', () => {
    // Rad I nimmt den Motor in mehreren Stellungen auf - nur eine davon trägt weiter
    const accepting = [];
    for (let o = 0; o < GEAR_STEPS; o += 1) {
      if (connectorsFit(MOTOR_CONNECTOR, leftConnector(0, o))) accepting.push(o);
    }
    expect(accepting.length).toBeGreaterThanOrEqual(3);
    for (const o of accepting) {
      const contacts = computeContacts([o, 0, 0, 0, 0]);
      expect(contacts[0]).toBe(true);
      expect(contacts.every(Boolean)).toBe(false);
    }
  });

  it('startet ungelöst und ohne greifenden Kontakt', () => {
    expect(isGearsSolved(GEAR_START_ORIENTATIONS)).toBe(false);
    expect(computeContacts([...GEAR_START_ORIENTATIONS]).some(Boolean)).toBe(false);
  });

  it('dreht jedes Rad und sperrt die Eingabe, sobald die Maschine läuft', () => {
    const state = createOperationsGearsState();
    expect(reduceOperationsGears(state, { type: 'rotate', gear: -1, dir: 1 })).toBeNull();
    expect(reduceOperationsGears(state, { type: 'rotate', gear: GEAR_COUNT, dir: 1 })).toBeNull();

    let current = state;
    GEAR_SOLUTION.forEach((target, gear) => {
      for (let i = 0; i < target; i += 1) {
        const next = reduceOperationsGears(current, { type: 'rotate', gear, dir: 1 });
        expect(next).not.toBeNull();
        current = next as typeof current;
      }
    });
    expect(current.orientations).toEqual([...GEAR_SOLUTION]);
    expect(current.solved).toBe(true);
    expect(current.contacts).toEqual([true, true, true, true, true, true]);
    expect(poweredUpTo(current.contacts)).toBe(CONTACT_COUNT);
    expect(reduceOperationsGears(current, { type: 'rotate', gear: 0, dir: 1 })).toBeNull();
  });

  it('wraps orientations in both directions', () => {
    const state = createOperationsGearsState();
    const back = reduceOperationsGears(state, { type: 'rotate', gear: 4, dir: -1 });
    expect(back?.orientations[4]).toBe(7);
  });
});

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
