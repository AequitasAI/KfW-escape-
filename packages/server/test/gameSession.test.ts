import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ARCHIVE_SOLUTION,
  DIFF_HOTSPOT_IDS,
  GAME_DURATION_MS,
  GEAR_SOLUTION,
  HINT_AFTER_MS,
  HOST_BONUS_TIME_MS,
  INTRO_DURATION_MS,
  SOLVED_HOLD_MS,
  PUZZLE_COUNT,
  TRANSITION_DURATION_MS,
  solveCable,
} from '@kfw-escape/shared';
import type { ArchiveRunesState, CableLabyrinthState, PuzzleId } from '@kfw-escape/shared';
import { openDatabase, Repository } from '../src/db.js';
import { GameSession, SOLVER_ABSENCE_GRACE_MS } from '../src/gameSession.js';
import { SessionManager } from '../src/sessionManager.js';

function newSession(): { session: GameSession; repo: Repository } {
  const db = openDatabase(':memory:');
  const repo = new Repository(db);
  const session = new GameSession(repo, {
    id: 'session-1',
    code: 'TESTAB',
    hostSecret: 'host-secret',
    createdAt: Date.now(),
  });
  repo.insertSession(session.toRow());
  return { session, repo };
}

function withPlayers(count: number): { session: GameSession; ids: string[] } {
  const { session } = newSession();
  const ids: string[] = [];
  for (let i = 0; i < count; i += 1) {
    const player = session.addPlayer(`Gefaehrte ${i + 1}`);
    session.setConnected(player.id, true);
    ids.push(player.id);
  }
  return { session, ids };
}

/** Runs the session forward to the first active trial. */
function startToFirstPuzzle(session: GameSession): void {
  session.start();
  vi.advanceTimersByTime(INTRO_DURATION_MS + 10);
  session.tick();
}

function acceptCurrentCandidate(session: GameSession): string {
  const candidate = session.snapshot().solver.candidateId;
  expect(candidate).not.toBeNull();
  expect(session.acceptSolver(candidate as string)).toBe(true);
  return candidate as string;
}

/**
 * Vom gelösten Rätsel bis zur nächsten offenen Prüfung.
 *
 * Zwei Phasen, nicht eine: Die gelöste Prüfung bleibt erst kurz stehen, damit
 * die Erfolgsanimation überhaupt sichtbar wird, und erst danach läuft der
 * Übergang.
 */
function advanceToNextPuzzle(session: GameSession): void {
  vi.advanceTimersByTime(SOLVED_HOLD_MS + 10);
  session.tick();
  vi.advanceTimersByTime(TRANSITION_DURATION_MS + 10);
  session.tick();
}

/** Solves whichever trial is currently open, as the accepted solver. */
function solveCurrentPuzzle(session: GameSession, solverId: string): void {
  const id = session.currentPuzzle.id as PuzzleId;
  const act = (action: Parameters<GameSession['applyPuzzleAction']>[2]): void => {
    const result = session.applyPuzzleAction(solverId, id, action);
    expect(result.ok).toBe(true);
    if (result.ok && result.solved) session.markSolved();
  };

  if (id === 'archive_runes') {
    // start order: moon, river, flame, hammer, mountain
    for (const [a, b] of [
      [0, 2],
      [1, 4],
      [2, 3],
    ] as const) {
      act({ type: 'swap', a, b });
    }
    return;
  }
  if (id === 'cable_labyrinth') {
    const state = session.currentPuzzleState() as CableLabyrinthState;
    const moves = solveCable(state.board, { maxDepth: 16 });
    expect(moves).not.toBeNull();
    for (const move of moves as number[]) act({ type: 'slide', index: move });
    return;
  }
  if (id === 'testmasters_diff') {
    // aus der Rätseldefinition, nicht abgeschrieben
    for (const hotspotId of DIFF_HOTSPOT_IDS) act({ type: 'hit', hotspotId });
    return;
  }
  if (id === 'operations_gears') {
    // alle fünf Räder drehen; Motor und Tor sind die festen Enden
    for (let gear = 0; gear < GEAR_SOLUTION.length; gear += 1) {
      for (let i = 0; i < (GEAR_SOLUTION[gear] as number); i += 1) act({ type: 'rotate', gear, dir: 1 });
    }
    return;
  }
  if (id === 'black_gate_code') {
    for (const digit of [0, 4, 2]) act({ type: 'digit', digit });
    act({ type: 'submit' });
    return;
  }
  throw new Error(`Unhandled puzzle ${id}`);
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

/* ------------------------------------------------------------------ */
/* A03 - server side solver authorization                              */
/* ------------------------------------------------------------------ */

describe('Solver authorization', () => {
  it('rejects a puzzle action from a player who is not the accepted solver', () => {
    const { session, ids } = withPlayers(4);
    startToFirstPuzzle(session);
    const solverId = acceptCurrentCandidate(session);
    const other = ids.find((id) => id !== solverId) as string;

    const rejected = session.applyPuzzleAction(other, 'archive_runes', { type: 'swap', a: 0, b: 1 });
    expect(rejected).toEqual({ ok: false, reason: 'NOT_SOLVER' });
    // state untouched
    expect((session.currentPuzzleState() as ArchiveRunesState).order[0]).toBe('moon');

    const accepted = session.applyPuzzleAction(solverId, 'archive_runes', { type: 'swap', a: 0, b: 1 });
    expect(accepted.ok).toBe(true);
  });

  it('rejects actions while only offered, before acceptance', () => {
    const { session } = withPlayers(3);
    startToFirstPuzzle(session);
    const candidate = session.snapshot().solver.candidateId as string;
    expect(session.applyPuzzleAction(candidate, 'archive_runes', { type: 'swap', a: 0, b: 1 })).toEqual({
      ok: false,
      reason: 'NOT_SOLVER',
    });
  });

  it('rejects actions addressed to the wrong puzzle', () => {
    const { session } = withPlayers(3);
    startToFirstPuzzle(session);
    const solverId = acceptCurrentCandidate(session);
    expect(session.applyPuzzleAction(solverId, 'black_gate_code', { type: 'digit', digit: 1 })).toEqual({
      ok: false,
      reason: 'WRONG_PUZZLE',
    });
  });

  it('rejects actions while the session is not in an active trial', () => {
    const { session, ids } = withPlayers(3);
    expect(session.applyPuzzleAction(ids[0] as string, 'archive_runes', { type: 'swap', a: 0, b: 1 })).toEqual({
      ok: false,
      reason: 'SESSION_NOT_ACTIVE',
    });
    startToFirstPuzzle(session);
    const solverId = acceptCurrentCandidate(session);
    session.pause();
    expect(session.applyPuzzleAction(solverId, 'archive_runes', { type: 'swap', a: 0, b: 1 })).toEqual({
      ok: false,
      reason: 'SESSION_NOT_ACTIVE',
    });
  });

  it('rejects structurally invalid and rule breaking actions', () => {
    const { session } = withPlayers(3);
    startToFirstPuzzle(session);
    const solverId = acceptCurrentCandidate(session);
    expect(
      session.applyPuzzleAction(solverId, 'archive_runes', { type: 'nonsense' } as never),
    ).toEqual({ ok: false, reason: 'REJECTED_BY_RULES' });
    expect(session.applyPuzzleAction(solverId, 'archive_runes', null as never)).toEqual({
      ok: false,
      reason: 'INVALID_ACTION',
    });
    expect(session.applyPuzzleAction(solverId, 'archive_runes', { type: 'swap', a: 9, b: 0 })).toEqual({
      ok: false,
      reason: 'REJECTED_BY_RULES',
    });
  });
});

/* ------------------------------------------------------------------ */
/* A04 - solver selection and decline                                  */
/* ------------------------------------------------------------------ */

describe('Solver selection', () => {
  it('offers exactly one candidate and never one who already declined', () => {
    const { session } = withPlayers(5);
    startToFirstPuzzle(session);

    const first = session.snapshot().solver.candidateId as string;
    expect(first).toBeTruthy();
    expect(session.snapshot().players.filter((p) => p.isCandidate)).toHaveLength(1);

    expect(session.declineSolver(first)).toBe('PASSED');
    const second = session.snapshot().solver.candidateId as string;
    expect(second).not.toBe(first);
    expect(session.snapshot().players.find((p) => p.id === first)?.declinedCurrent).toBe(true);

    expect(session.declineSolver(second)).toBe('PASSED');
    const third = session.snapshot().solver.candidateId as string;
    expect([first, second]).not.toContain(third);
  });

  it('prefers players who have not been a companion yet', () => {
    const { session, ids } = withPlayers(3);
    startToFirstPuzzle(session);
    const firstSolver = acceptCurrentCandidate(session);
    solveCurrentPuzzle(session, firstSolver);

    advanceToNextPuzzle(session);

    const secondCandidate = session.snapshot().solver.candidateId as string;
    expect(secondCandidate).not.toBe(firstSolver);
    expect(ids).toContain(secondCandidate);
  });

  it('reuses already deployed players once everyone has had a turn', () => {
    const { session, ids } = withPlayers(2);
    startToFirstPuzzle(session);

    let previous: string | null = null;
    for (let puzzle = 0; puzzle < 3; puzzle += 1) {
      const candidate = session.snapshot().solver.candidateId as string;
      expect(ids).toContain(candidate);
      if (puzzle === 2) expect(previous).not.toBeNull();
      previous = candidate;
      const solver = acceptCurrentCandidate(session);
      solveCurrentPuzzle(session, solver);
      advanceToNextPuzzle(session);
    }
    // with only two players the third trial has to fall back to a used player
    expect(session.snapshot().solver.candidateId).toBeTruthy();
  });

  it('clears declines when a new trial opens', () => {
    const { session } = withPlayers(3);
    startToFirstPuzzle(session);
    const first = session.snapshot().solver.candidateId as string;
    session.declineSolver(first);
    const solver = acceptCurrentCandidate(session);
    solveCurrentPuzzle(session, solver);
    advanceToNextPuzzle(session);
    expect(session.snapshot().players.every((p) => !p.declinedCurrent)).toBe(true);
  });

  it('draws a new companion when the current one stays disconnected', () => {
    const { session } = withPlayers(4);
    startToFirstPuzzle(session);
    const solverId = acceptCurrentCandidate(session);

    session.setConnected(solverId, false);
    session.tick();
    // still theirs during the grace period
    expect(session.snapshot().solver.solverId).toBe(solverId);

    vi.advanceTimersByTime(SOLVER_ABSENCE_GRACE_MS + 100);
    session.tick();
    const snapshot = session.snapshot();
    expect(snapshot.solver.solverId).toBeNull();
    expect(snapshot.solver.candidateId).not.toBe(solverId);
    expect(snapshot.solver.candidateId).toBeTruthy();
  });

  it('lets the host reroll an already accepted companion', () => {
    const { session } = withPlayers(4);
    startToFirstPuzzle(session);
    const solverId = acceptCurrentCandidate(session);
    expect(session.rerollSolver()).toBe(true);
    expect(session.snapshot().solver.solverId).toBeNull();
    expect(session.snapshot().solver.candidateId).not.toBe(solverId);
    // the removed player may no longer act
    expect(session.applyPuzzleAction(solverId, 'archive_runes', { type: 'swap', a: 0, b: 1 })).toEqual({
      ok: false,
      reason: 'NOT_SOLVER',
    });
  });
});

/* ------------------------------------------------------------------ */
/* A05 - authoritative timer                                           */
/* ------------------------------------------------------------------ */

describe('Timer', () => {
  it('starts at ten minutes only when the host starts', () => {
    const { session } = withPlayers(3);
    expect(session.timerView().running).toBe(false);
    expect(session.remainingMs()).toBe(GAME_DURATION_MS);

    session.start();
    expect(session.status).toBe('INTRO');
    /*
     * Der Vorspann wird vorgelesen und von der Spielleitung weitergeklickt.
     * Solange darf die Uhr nicht laufen, sonst beginnt jede Runde mit einem
     * Rückstand, den die Gruppe nicht beeinflussen kann.
     */
    expect(session.timerView().running).toBe(false);
    vi.advanceTimersByTime(45_000);
    expect(session.remainingMs()).toBe(GAME_DURATION_MS);

    session.advancePhase();
    expect(session.status).toBe('PUZZLE_ACTIVE');
    expect(session.timerView().running).toBe(true);
    expect(session.remainingMs()).toBe(GAME_DURATION_MS);

    vi.advanceTimersByTime(60_000);
    expect(session.remainingMs()).toBe(GAME_DURATION_MS - 60_000);
  });

  it('lässt den Vorspann auch ohne Klick nicht ewig stehen', () => {
    const { session } = withPlayers(2);
    session.start();
    expect(session.status).toBe('INTRO');
    // Notausgang für eine vergessene Session
    vi.advanceTimersByTime(INTRO_DURATION_MS + 1_000);
    session.tick();
    expect(session.status).toBe('PUZZLE_ACTIVE');
  });

  it('is unaffected by client reloads because it derives from server time', () => {
    const { session, ids } = withPlayers(3);
    startToFirstPuzzle(session);
    vi.advanceTimersByTime(120_000);
    const before = session.remainingMs();

    // simulate a browser refresh: disconnect and reconnect the same player
    session.setConnected(ids[0] as string, false);
    session.setConnected(ids[0] as string, true);

    expect(session.remainingMs()).toBe(before);
    expect(session.snapshot().timer.endsAt).toBe(session.endsAt());
  });

  it('stops on pause and continues correctly on resume', () => {
    const { session } = withPlayers(3);
    startToFirstPuzzle(session);
    vi.advanceTimersByTime(60_000);

    session.pause();
    expect(session.status).toBe('PAUSED');
    expect(session.timerView().running).toBe(false);
    const paused = session.remainingMs();

    vi.advanceTimersByTime(30_000);
    expect(session.remainingMs()).toBe(paused);

    session.resume();
    // pausiert wird jetzt aus der laufenden Prüfung heraus, nicht mehr aus dem Vorspann
    expect(session.status).toBe('PUZZLE_ACTIVE');
    expect(session.remainingMs()).toBe(paused);

    vi.advanceTimersByTime(10_000);
    expect(session.remainingMs()).toBe(paused - 10_000);
  });

  it('ends the run as LOST at 00:00', () => {
    const { session } = withPlayers(3);
    startToFirstPuzzle(session);
    vi.advanceTimersByTime(GAME_DURATION_MS);
    session.tick();
    expect(session.status).toBe('LOST');
    expect(session.result?.won).toBe(false);
    expect(session.remainingMs()).toBe(0);
  });

  it('adds the host bonus time as an explicit intervention', () => {
    const { session } = withPlayers(3);
    startToFirstPuzzle(session);
    vi.advanceTimersByTime(60_000);
    const before = session.remainingMs();
    expect(session.addBonusTime()).toBe(true);
    expect(session.remainingMs()).toBe(before + HOST_BONUS_TIME_MS);
  });
});

/* ------------------------------------------------------------------ */
/* A11/A12 - flow, finale and host failsafes                           */
/* ------------------------------------------------------------------ */

describe('Game flow', () => {
  it('plays through all five trials and wins with time left', () => {
    const { session } = withPlayers(6);
    startToFirstPuzzle(session);

    for (let i = 0; i < PUZZLE_COUNT; i += 1) {
      expect(session.status).toBe('PUZZLE_ACTIVE');
      expect(session.currentPuzzleIndex).toBe(i);
      const solver = acceptCurrentCandidate(session);
      solveCurrentPuzzle(session, solver);
      expect(session.seals).toBe(i + 1);
      advanceToNextPuzzle(session);
    }

    expect(session.status).toBe('FINALE');
    vi.advanceTimersByTime(6_500 + 10);
    session.tick();

    expect(session.status).toBe('WON');
    expect(session.result).toMatchObject({ won: true, playerCount: 6, solvedCount: 5, skippedCount: 0 });
    expect(session.result?.remainingMs).toBeGreaterThan(0);
    expect(session.snapshot().seals).toBe(5);
  });

  it('the first trial only solves on the exact rune order', () => {
    const { session } = withPlayers(3);
    startToFirstPuzzle(session);
    const solver = acceptCurrentCandidate(session);
    // a wrong but legal move must not solve
    session.applyPuzzleAction(solver, 'archive_runes', { type: 'swap', a: 0, b: 1 });
    expect(session.status).toBe('PUZZLE_ACTIVE');
    expect(session.seals).toBe(0);

    session.reset();
    startToFirstPuzzle(session);
    const solver2 = acceptCurrentCandidate(session);
    solveCurrentPuzzle(session, solver2);
    expect((session.puzzleStates[0] as ArchiveRunesState).order).toEqual([...ARCHIVE_SOLUTION]);
    expect(session.seals).toBe(1);
  });

  it('lets the host skip a trial and counts it towards the finale', () => {
    const { session } = withPlayers(3);
    startToFirstPuzzle(session);
    expect(session.skipPuzzle()).toBe(true);
    expect(session.puzzleMetaViews()[0]?.status).toBe('SKIPPED');
    expect(session.seals).toBe(1);
    advanceToNextPuzzle(session);
    expect(session.currentPuzzleIndex).toBe(1);
  });

  it('host end forces a loss, reset returns to the lobby', () => {
    const { session } = withPlayers(3);
    startToFirstPuzzle(session);
    expect(session.endSession()).toBe(true);
    expect(session.status).toBe('LOST');

    session.reset();
    const snapshot = session.snapshot();
    expect(snapshot.status).toBe('LOBBY');
    expect(snapshot.seals).toBe(0);
    expect(snapshot.timer.startedAt).toBeNull();
    expect(snapshot.players.every((p) => p.solverCount === 0)).toBe(true);
    expect(snapshot.result).toBeNull();
  });

  it('refuses to start without players', () => {
    const { session } = newSession();
    expect(session.start()).toBe(false);
    expect(session.status).toBe('LOBBY');
  });

  it('offers a hint only after the configured time in the same trial', () => {
    const { session } = withPlayers(3);
    startToFirstPuzzle(session);
    const solver = acceptCurrentCandidate(session);

    expect(session.snapshot().hintAvailable).toBe(false);
    expect(session.revealHint(solver)).toBe(false);

    vi.advanceTimersByTime(HINT_AFTER_MS + 100);
    session.tick();
    expect(session.snapshot().hintAvailable).toBe(true);
    expect(session.revealHint(solver)).toBe(true);
    expect(session.snapshot().hintText).toContain('Fluss');
    expect(session.hintsUsed).toBe(1);
    // only once per trial
    expect(session.revealHint(solver)).toBe(false);
  });
});

/* ------------------------------------------------------------------ */
/* A01/A02 - identity, names, reconnect                                */
/* ------------------------------------------------------------------ */

describe('Players and identity', () => {
  it('keeps identical names apart by opaque id', () => {
    const { session } = newSession();
    const a = session.addPlayer('Alex');
    const b = session.addPlayer('Alex');
    expect(a.id).not.toBe(b.id);
    expect(a.token).not.toBe(b.token);
    expect(session.playerViews()).toHaveLength(2);
  });

  it('authenticates only with the matching token', () => {
    const { session } = newSession();
    const player = session.addPlayer('Alex');
    expect(session.authenticate(player.id, player.token)?.id).toBe(player.id);
    expect(session.authenticate(player.id, 'wrong')).toBeNull();
    expect(session.authenticate('unknown', player.token)).toBeNull();
    expect(session.authenticate(undefined, undefined)).toBeNull();
  });

  it('allows renaming in the lobby but not after the start', () => {
    const { session } = withPlayers(2);
    const id = session.playerViews()[0]?.id as string;
    expect(session.renamePlayer(id, 'Neuer Name')).toBe(true);
    expect(session.getPlayer(id)?.displayName).toBe('Neuer Name');
    session.start();
    expect(session.renamePlayer(id, 'Zu spaet')).toBe(false);
  });

  it('sanitizes markup out of display names', () => {
    const { session } = newSession();
    const player = session.addPlayer('ok');
    expect(session.renamePlayer(player.id, '<b>Mara</b>')).toBe(true);
    const name = session.getPlayer(player.id)?.displayName ?? '';
    expect(name).not.toContain('<');
    expect(name).not.toContain('>');
    expect(name).toContain('Mara');
  });

  it('survives a server restart with the clock held until the host resumes', () => {
    const db = openDatabase(':memory:');
    const manager = new SessionManager(db);
    const session = manager.create();
    const player = session.addPlayer('Mara');
    session.setConnected(player.id, true);
    startToFirstPuzzle(session);
    const solver = acceptCurrentCandidate(session);
    session.applyPuzzleAction(solver, 'archive_runes', { type: 'swap', a: 0, b: 1 });
    const remainingBefore = session.remainingMs();

    // fresh process against the same database
    const restarted = new SessionManager(db);
    const restored = restarted.get(session.code);
    expect(restored).toBeDefined();
    expect(restored?.status).toBe('PAUSED');
    expect(restored?.pausedFrom).toBe('PUZZLE_ACTIVE');
    expect(restored?.players.get(player.id)?.displayName).toBe('Mara');
    expect(restored?.players.get(player.id)?.token).toBe(player.token);
    expect(restored?.players.get(player.id)?.connected).toBe(false);
    expect((restored?.puzzleStates[0] as ArchiveRunesState).order).toEqual(
      (session.puzzleStates[0] as ArchiveRunesState).order,
    );
    expect(restored?.remainingMs()).toBeCloseTo(remainingBefore, -2);

    restored?.resume();
    expect(restored?.status).toBe('PUZZLE_ACTIVE');
  });
});
