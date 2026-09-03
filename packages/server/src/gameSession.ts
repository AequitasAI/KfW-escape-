import {
  FINALE_DURATION_MS,
  GAME_DURATION_MS,
  HINT_AFTER_MS,
  HOST_BONUS_TIME_MS,
  INTRO_DURATION_MS,
  PUZZLES,
  PUZZLE_COUNT,
  TRANSITION_DURATION_MS,
  createPuzzleState,
  getPuzzle,
  reducePuzzle,
} from '@kfw-escape/shared';
import type {
  GameResultView,
  PlayerView,
  PuzzleAction,
  PuzzleId,
  PuzzleMetaView,
  PuzzleStateUnion,
  PuzzleStatus,
  SessionSnapshot,
  SessionStatus,
  SolverView,
  TimerView,
} from '@kfw-escape/shared';
import type { PlayerRow, Repository, SessionRow } from './db.js';
import { pickRandom, sanitizeDisplayName, secret, uuid } from './util.js';

export interface Player {
  id: string;
  token: string;
  displayName: string;
  connected: boolean;
  solverCount: number;
  declinedCurrentPuzzle: boolean;
  createdAt: number;
  lastSeenAt: number;
}

export type ActionRejection =
  | 'SESSION_NOT_ACTIVE'
  | 'WRONG_PUZZLE'
  | 'NOT_SOLVER'
  | 'INVALID_ACTION'
  | 'REJECTED_BY_RULES';

export type ActionResult =
  | { ok: true; state: PuzzleStateUnion; solved: boolean }
  | { ok: false; reason: ActionRejection };

export const REJECTION_MESSAGES: Record<ActionRejection, string> = {
  SESSION_NOT_ACTIVE: 'Die Prüfung ist gerade nicht aktiv.',
  WRONG_PUZZLE: 'Diese Aktion gehört nicht zur aktuellen Prüfung.',
  NOT_SOLVER: 'Nur der aktuelle Gefährte darf diese Prüfung bedienen.',
  INVALID_ACTION: 'Diese Aktion ist ungültig.',
  REJECTED_BY_RULES: 'Dieser Zug ist hier nicht möglich.',
};

/** Everything the socket layer needs to broadcast after a state change. */
export type SessionEvent =
  | { type: 'snapshot' }
  | { type: 'players' }
  | { type: 'solverOffered'; candidateId: string; candidateName: string }
  | { type: 'solverAccepted'; solverId: string; solverName: string }
  | { type: 'solverChanged' }
  | { type: 'puzzleState'; clientActionId?: string }
  | { type: 'puzzleSolved'; puzzleIndex: number; puzzleId: PuzzleId; seals: number }
  | { type: 'transition'; from: number; to: number; phaseEndsAt: number }
  | { type: 'won'; result: GameResultView }
  | { type: 'lost'; result: GameResultView };

const ACTIVE_STATUSES: readonly SessionStatus[] = ['INTRO', 'PUZZLE_ACTIVE', 'TRANSITION', 'FINALE'];

/** How long a disconnected companion keeps the trial before the server rerolls. */
export const SOLVER_ABSENCE_GRACE_MS = 15_000;

/**
 * Authoritative game state for exactly one session.
 *
 * Every mutation goes through this class; the socket layer only translates
 * between events and method calls. Clients never carry authority - not for the
 * timer, not for solver rights, not for puzzle progress.
 */
export class GameSession {
  readonly id: string;
  readonly code: string;
  readonly hostSecret: string;
  readonly createdAt: number;

  status: SessionStatus = 'LOBBY';
  pausedFrom: SessionStatus | null = null;
  currentPuzzleIndex = 0;

  startedAt: number | null = null;
  pausedAt: number | null = null;
  totalPausedMs = 0;
  bonusMs = 0;
  phaseEndsAt: number | null = null;

  puzzleStates: Record<number, PuzzleStateUnion> = {};
  puzzleStatuses: Record<number, PuzzleStatus> = {};
  puzzleEnteredAt: number | null = null;
  /** totalPausedMs at the moment the current trial opened, so pauses never eat hint time */
  puzzleEnteredPausedMs = 0;

  hintsUsed = 0;
  hintRevealed = false;

  solverId: string | null = null;
  candidateId: string | null = null;

  finishedAt: number | null = null;
  result: GameResultView | null = null;

  revision = 0;

  readonly players = new Map<string, Player>();

  private readonly listeners = new Set<(event: SessionEvent) => void>();

  constructor(
    private readonly repo: Repository,
    init: { id: string; code: string; hostSecret: string; createdAt: number },
  ) {
    this.id = init.id;
    this.code = init.code;
    this.hostSecret = init.hostSecret;
    this.createdAt = init.createdAt;
    for (let i = 0; i < PUZZLE_COUNT; i += 1) this.puzzleStatuses[i] = 'WAITING_FOR_SOLVER';
  }

  /* ---------------------------------------------------------------- */
  /* Events                                                            */
  /* ---------------------------------------------------------------- */

  subscribe(listener: (event: SessionEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(...events: SessionEvent[]): void {
    this.revision += 1;
    for (const event of events) {
      for (const listener of this.listeners) listener(event);
    }
  }

  /* ---------------------------------------------------------------- */
  /* Timer - server authoritative                                      */
  /* ---------------------------------------------------------------- */

  get timerRunning(): boolean {
    return this.startedAt !== null && this.pausedAt === null && ACTIVE_STATUSES.includes(this.status);
  }

  /** Milliseconds of paused time up to `now`, including an open pause. */
  private pausedMsAt(now: number): number {
    return this.totalPausedMs + (this.pausedAt === null ? 0 : now - this.pausedAt);
  }

  endsAt(now = Date.now()): number | null {
    if (this.startedAt === null) return null;
    return this.startedAt + GAME_DURATION_MS + this.bonusMs + this.pausedMsAt(now);
  }

  remainingMs(now = Date.now()): number {
    if (this.startedAt === null) return GAME_DURATION_MS;
    if (this.status === 'WON' || this.status === 'LOST') {
      return this.result?.remainingMs ?? 0;
    }
    const ends = this.endsAt(now) as number;
    return Math.max(0, ends - now);
  }

  timerView(now = Date.now()): TimerView {
    return {
      durationMs: GAME_DURATION_MS,
      startedAt: this.startedAt,
      endsAt: this.endsAt(now),
      remainingMs: this.remainingMs(now),
      serverNow: now,
      running: this.timerRunning,
    };
  }

  /* ---------------------------------------------------------------- */
  /* Players                                                           */
  /* ---------------------------------------------------------------- */

  addPlayer(displayName: string): Player {
    const now = Date.now();
    const player: Player = {
      id: uuid(),
      token: secret(),
      displayName,
      connected: false,
      solverCount: 0,
      declinedCurrentPuzzle: false,
      createdAt: now,
      lastSeenAt: now,
    };
    this.players.set(player.id, player);
    this.persistPlayer(player);
    this.repo.recordEvent(this.id, 'player.join', null, player.id, null);
    this.emit({ type: 'players' }, { type: 'snapshot' });
    return player;
  }

  getPlayer(id: string | null | undefined): Player | undefined {
    if (!id) return undefined;
    return this.players.get(id);
  }

  authenticate(playerId: string | undefined, token: string | undefined): Player | null {
    if (!playerId || !token) return null;
    const player = this.players.get(playerId);
    if (!player || player.token !== token) return null;
    return player;
  }

  setConnected(playerId: string, connected: boolean): void {
    const player = this.players.get(playerId);
    if (!player) return;
    if (player.connected === connected) return;
    player.connected = connected;
    player.lastSeenAt = Date.now();
    this.persistPlayer(player);
    this.emit({ type: 'players' }, { type: 'snapshot' });
  }

  renamePlayer(playerId: string, raw: unknown): boolean {
    // Names are only editable while the group is still gathering.
    if (this.status !== 'LOBBY') return false;
    const name = sanitizeDisplayName(raw);
    if (!name) return false;
    const player = this.players.get(playerId);
    if (!player) return false;
    player.displayName = name;
    this.persistPlayer(player);
    this.emit({ type: 'players' }, { type: 'snapshot' });
    return true;
  }

  get connectedPlayers(): Player[] {
    return [...this.players.values()].filter((p) => p.connected);
  }

  /* ---------------------------------------------------------------- */
  /* Solver selection                                                  */
  /* ---------------------------------------------------------------- */

  /**
   * Rules from 01_product/STATE_MACHINE.md:
   * only connected players, prefer players who have never solved, never re-offer
   * someone who declined this puzzle, random pick, server side.
   */
  private choose(excludeId?: string | null): Player | null {
    const eligible = this.connectedPlayers.filter(
      (p) => !p.declinedCurrentPuzzle && p.id !== excludeId,
    );
    const pool = eligible.length > 0 ? eligible : this.connectedPlayers.filter((p) => p.id !== excludeId);
    if (pool.length === 0) {
      // last resort: everyone declined and nobody else is left
      const fallback = this.connectedPlayers;
      if (fallback.length === 0) return null;
      for (const p of fallback) p.declinedCurrentPuzzle = false;
      return pickRandom(fallback);
    }
    const fresh = pool.filter((p) => p.solverCount === 0);
    return pickRandom(fresh.length > 0 ? fresh : pool);
  }

  offerSolver(excludeId?: string | null): boolean {
    const candidate = this.choose(excludeId);
    this.solverId = null;
    this.candidateId = candidate?.id ?? null;
    this.puzzleStatuses[this.currentPuzzleIndex] = candidate ? 'SOLVER_OFFERED' : 'WAITING_FOR_SOLVER';
    this.persist();

    if (!candidate) {
      this.emit({ type: 'solverChanged' }, { type: 'snapshot' });
      return false;
    }
    this.repo.recordEvent(this.id, 'solver.offered', this.currentPuzzle.id, candidate.id, null);
    this.emit(
      { type: 'solverOffered', candidateId: candidate.id, candidateName: candidate.displayName },
      { type: 'solverChanged' },
      { type: 'snapshot' },
    );
    return true;
  }

  acceptSolver(playerId: string): boolean {
    if (this.status !== 'PUZZLE_ACTIVE') return false;
    if (this.candidateId !== playerId) return false;
    const player = this.players.get(playerId);
    if (!player) return false;

    this.solverId = playerId;
    this.candidateId = null;
    player.solverCount += 1;
    this.puzzleStatuses[this.currentPuzzleIndex] = 'ACTIVE';
    this.persistPlayer(player);
    this.persist();
    this.repo.recordEvent(this.id, 'solver.accepted', this.currentPuzzle.id, playerId, null);
    this.emit(
      { type: 'solverAccepted', solverId: playerId, solverName: player.displayName },
      { type: 'solverChanged' },
      { type: 'snapshot' },
    );
    return true;
  }

  declineSolver(playerId: string): boolean {
    if (this.status !== 'PUZZLE_ACTIVE') return false;
    if (this.candidateId !== playerId) return false;
    const player = this.players.get(playerId);
    if (!player) return false;

    player.declinedCurrentPuzzle = true;
    this.persistPlayer(player);
    this.repo.recordEvent(this.id, 'solver.declined', this.currentPuzzle.id, playerId, null);
    this.offerSolver(playerId);
    return true;
  }

  /** Host failsafe: draw a new companion even if one already accepted. */
  rerollSolver(): boolean {
    if (this.status !== 'PUZZLE_ACTIVE') return false;
    const previous = this.solverId ?? this.candidateId;
    this.repo.recordEvent(this.id, 'solver.reroll', this.currentPuzzle.id, previous, null);
    return this.offerSolver(previous);
  }

  private clearDeclines(): void {
    for (const player of this.players.values()) player.declinedCurrentPuzzle = false;
  }

  /* ---------------------------------------------------------------- */
  /* Puzzles                                                           */
  /* ---------------------------------------------------------------- */

  get currentPuzzle() {
    return getPuzzle(Math.min(this.currentPuzzleIndex, PUZZLE_COUNT - 1));
  }

  currentPuzzleState(): PuzzleStateUnion | null {
    return this.puzzleStates[this.currentPuzzleIndex] ?? null;
  }

  /**
   * The five server side gates from 05_technical/WEBSOCKET_EVENTS.md. Client side
   * disabled controls are never sufficient, so every one of them is checked here.
   */
  applyPuzzleAction(playerId: string, puzzleId: PuzzleId, action: PuzzleAction): ActionResult {
    // 1. session active
    if (this.status !== 'PUZZLE_ACTIVE') return { ok: false, reason: 'SESSION_NOT_ACTIVE' };
    // 2. correct puzzle
    if (puzzleId !== this.currentPuzzle.id) return { ok: false, reason: 'WRONG_PUZZLE' };
    // 3. sender is the accepted solver
    if (this.solverId === null || this.solverId !== playerId) return { ok: false, reason: 'NOT_SOLVER' };
    // 4. action is structurally valid
    if (!action || typeof action !== 'object' || typeof (action as { type?: unknown }).type !== 'string') {
      return { ok: false, reason: 'INVALID_ACTION' };
    }
    const state = this.currentPuzzleState();
    if (!state) return { ok: false, reason: 'SESSION_NOT_ACTIVE' };

    // 5. the reducer accepts it
    const next = reducePuzzle(state, action, Date.now());
    if (!next) return { ok: false, reason: 'REJECTED_BY_RULES' };

    this.puzzleStates[this.currentPuzzleIndex] = next;
    this.persist();
    this.repo.recordEvent(this.id, 'puzzle.action', puzzleId, playerId, { type: action.type });

    return { ok: true, state: next, solved: next.solved };
  }

  markSolved(): void {
    const index = this.currentPuzzleIndex;
    this.puzzleStatuses[index] = 'SOLVED';
    this.repo.recordEvent(this.id, 'puzzle.solved', this.currentPuzzle.id, this.solverId, null);
    this.emit({
      type: 'puzzleSolved',
      puzzleIndex: index,
      puzzleId: this.currentPuzzle.id,
      seals: this.seals,
    });
    this.beginTransition();
  }

  get seals(): number {
    let count = 0;
    for (let i = 0; i < PUZZLE_COUNT; i += 1) {
      const status = this.puzzleStatuses[i];
      if (status === 'SOLVED' || status === 'SKIPPED') count += 1;
    }
    return count;
  }

  /* ---------------------------------------------------------------- */
  /* Phase flow                                                        */
  /* ---------------------------------------------------------------- */

  start(): boolean {
    if (this.status !== 'LOBBY') return false;
    if (this.players.size === 0) return false;
    const now = Date.now();
    this.status = 'INTRO';
    this.startedAt = now;
    this.pausedAt = null;
    this.totalPausedMs = 0;
    this.phaseEndsAt = now + INTRO_DURATION_MS;
    this.persist();
    this.repo.recordEvent(this.id, 'session.start', null, null, { players: this.players.size });
    this.emit({ type: 'snapshot' });
    return true;
  }

  private enterPuzzle(index: number): void {
    const now = Date.now();
    this.currentPuzzleIndex = index;
    this.status = 'PUZZLE_ACTIVE';
    this.phaseEndsAt = null;
    this.puzzleEnteredAt = now;
    this.puzzleEnteredPausedMs = this.totalPausedMs;
    this.hintRevealed = false;
    this.hintOffered = false;
    this.solverAbsentSince = null;
    this.clearDeclines();
    if (!this.puzzleStates[index]) this.puzzleStates[index] = createPuzzleState(getPuzzle(index).id);
    this.puzzleStatuses[index] = 'WAITING_FOR_SOLVER';
    this.solverId = null;
    this.candidateId = null;
    this.persist();
    this.repo.recordEvent(this.id, 'puzzle.enter', getPuzzle(index).id, null, { index });
    this.emit({ type: 'snapshot' });
    this.offerSolver();
  }

  private beginTransition(): void {
    const now = Date.now();
    const from = this.currentPuzzleIndex;
    const to = from + 1;
    this.solverId = null;
    this.candidateId = null;
    if (to >= PUZZLE_COUNT) {
      this.status = 'FINALE';
      this.phaseEndsAt = now + FINALE_DURATION_MS;
      this.persist();
      this.emit({ type: 'snapshot' });
      return;
    }
    this.status = 'TRANSITION';
    this.phaseEndsAt = now + TRANSITION_DURATION_MS;
    this.persist();
    this.emit({ type: 'transition', from, to, phaseEndsAt: this.phaseEndsAt }, { type: 'snapshot' });
  }

  private finish(won: boolean): void {
    const now = Date.now();
    let solved = 0;
    let skipped = 0;
    for (let i = 0; i < PUZZLE_COUNT; i += 1) {
      if (this.puzzleStatuses[i] === 'SOLVED') solved += 1;
      if (this.puzzleStatuses[i] === 'SKIPPED') skipped += 1;
    }
    const result: GameResultView = {
      won,
      remainingMs: won ? Math.max(0, (this.endsAt(now) as number) - now) : 0,
      playerCount: this.players.size,
      hintsUsed: this.hintsUsed,
      solvedCount: solved,
      skippedCount: skipped,
    };
    this.status = won ? 'WON' : 'LOST';
    this.pausedFrom = null;
    this.phaseEndsAt = null;
    this.finishedAt = now;
    this.result = result;
    this.solverId = null;
    this.candidateId = null;
    this.persist();
    this.repo.recordEvent(this.id, won ? 'session.won' : 'session.lost', null, null, {
      remainingMs: result.remainingMs,
      solved,
      skipped,
    });
    this.emit(won ? { type: 'won', result } : { type: 'lost', result }, { type: 'snapshot' });
  }

  /**
   * Called once per server tick. Drives timed phase changes and the hard
   * time-out, so the flow never depends on a client being awake.
   */
  tick(now = Date.now()): void {
    if (this.status === 'PAUSED' || this.status === 'LOBBY' || this.status === 'WON' || this.status === 'LOST') {
      return;
    }

    if (this.startedAt !== null && now >= (this.endsAt(now) as number)) {
      this.finish(false);
      return;
    }

    if (this.phaseEndsAt !== null && now >= this.phaseEndsAt) {
      if (this.status === 'INTRO') {
        this.enterPuzzle(0);
        return;
      }
      if (this.status === 'TRANSITION') {
        this.enterPuzzle(this.currentPuzzleIndex + 1);
        return;
      }
      if (this.status === 'FINALE') {
        this.finish(true);
        return;
      }
    }

    // A companion who vanished must never block the group: after a short grace
    // period the server draws a new one on its own.
    if (this.status === 'PUZZLE_ACTIVE') {
      const active = this.getPlayer(this.solverId ?? this.candidateId);
      if (active && !active.connected) {
        if (this.solverAbsentSince === null) this.solverAbsentSince = now;
        else if (now - this.solverAbsentSince >= SOLVER_ABSENCE_GRACE_MS) {
          this.solverAbsentSince = null;
          this.repo.recordEvent(this.id, 'solver.absent', this.currentPuzzle.id, active.id, null);
          this.offerSolver(active.id);
          return;
        }
      } else {
        this.solverAbsentSince = null;
      }
    }

    // A hint becomes available after a while in the same trial.
    if (this.status === 'PUZZLE_ACTIVE' && !this.hintRevealed && this.hintAvailableAt !== null) {
      if (now >= this.hintAvailableAt && !this.hintOffered) {
        this.hintOffered = true;
        this.emit({ type: 'snapshot' });
      }
    }
  }

  private hintOffered = false;
  private solverAbsentSince: number | null = null;

  get hintAvailableAt(): number | null {
    if (this.puzzleEnteredAt === null) return null;
    const pausedSinceEntering = this.totalPausedMs - this.puzzleEnteredPausedMs;
    return this.puzzleEnteredAt + HINT_AFTER_MS + pausedSinceEntering;
  }

  get hintAvailable(): boolean {
    if (this.status !== 'PUZZLE_ACTIVE') return false;
    if (this.hintRevealed) return false;
    const at = this.hintAvailableAt;
    return at !== null && Date.now() >= at;
  }

  revealHint(playerId: string | null): boolean {
    if (this.status !== 'PUZZLE_ACTIVE') return false;
    if (this.hintRevealed) return false;
    if (!this.hintAvailable) return false;
    this.hintRevealed = true;
    this.hintsUsed += 1;
    this.persist();
    this.repo.recordEvent(this.id, 'hint.revealed', this.currentPuzzle.id, playerId, null);
    this.emit({ type: 'snapshot' });
    return true;
  }

  /* ---------------------------------------------------------------- */
  /* Host failsafes                                                    */
  /* ---------------------------------------------------------------- */

  pause(): boolean {
    if (!ACTIVE_STATUSES.includes(this.status)) return false;
    this.pausedFrom = this.status;
    this.status = 'PAUSED';
    this.pausedAt = Date.now();
    this.persist();
    this.repo.recordEvent(this.id, 'session.pause', null, null, null);
    this.emit({ type: 'snapshot' });
    return true;
  }

  resume(): boolean {
    if (this.status !== 'PAUSED' || this.pausedAt === null) return false;
    const now = Date.now();
    const pausedFor = now - this.pausedAt;
    this.totalPausedMs += pausedFor;
    // timed phases keep the time they had left when the host hit pause
    if (this.phaseEndsAt !== null) this.phaseEndsAt += pausedFor;
    this.pausedAt = null;
    this.status = this.pausedFrom ?? 'PUZZLE_ACTIVE';
    this.pausedFrom = null;
    this.persist();
    this.repo.recordEvent(this.id, 'session.resume', null, null, { pausedForMs: pausedFor });
    this.emit({ type: 'snapshot' });
    return true;
  }

  skipPuzzle(): boolean {
    if (this.status !== 'PUZZLE_ACTIVE') return false;
    this.puzzleStatuses[this.currentPuzzleIndex] = 'SKIPPED';
    this.repo.recordEvent(this.id, 'puzzle.skipped', this.currentPuzzle.id, null, null);
    this.emit({
      type: 'puzzleSolved',
      puzzleIndex: this.currentPuzzleIndex,
      puzzleId: this.currentPuzzle.id,
      seals: this.seals,
    });
    this.beginTransition();
    return true;
  }

  addBonusTime(): boolean {
    if (this.startedAt === null) return false;
    if (this.status === 'WON' || this.status === 'LOST') return false;
    this.bonusMs += HOST_BONUS_TIME_MS;
    this.persist();
    this.repo.recordEvent(this.id, 'host.addTime', null, null, { bonusMs: this.bonusMs });
    this.emit({ type: 'snapshot' });
    return true;
  }

  endSession(): boolean {
    if (this.status === 'WON' || this.status === 'LOST') return false;
    this.finish(false);
    return true;
  }

  /** Full reset back to the lobby. Players and their names stay. */
  reset(): void {
    this.status = 'LOBBY';
    this.pausedFrom = null;
    this.currentPuzzleIndex = 0;
    this.startedAt = null;
    this.pausedAt = null;
    this.totalPausedMs = 0;
    this.bonusMs = 0;
    this.phaseEndsAt = null;
    this.puzzleStates = {};
    this.puzzleStatuses = {};
    for (let i = 0; i < PUZZLE_COUNT; i += 1) this.puzzleStatuses[i] = 'WAITING_FOR_SOLVER';
    this.puzzleEnteredAt = null;
    this.puzzleEnteredPausedMs = 0;
    this.solverAbsentSince = null;
    this.hintsUsed = 0;
    this.hintRevealed = false;
    this.hintOffered = false;
    this.solverId = null;
    this.candidateId = null;
    this.finishedAt = null;
    this.result = null;
    for (const player of this.players.values()) {
      player.solverCount = 0;
      player.declinedCurrentPuzzle = false;
      this.persistPlayer(player);
    }
    this.persist();
    this.repo.recordEvent(this.id, 'session.reset', null, null, null);
    this.emit({ type: 'players' }, { type: 'snapshot' });
  }

  /* ---------------------------------------------------------------- */
  /* Views                                                             */
  /* ---------------------------------------------------------------- */

  playerViews(): PlayerView[] {
    return [...this.players.values()].map((p) => ({
      id: p.id,
      displayName: p.displayName,
      connected: p.connected,
      solverCount: p.solverCount,
      isCandidate: this.candidateId === p.id,
      isSolver: this.solverId === p.id,
      declinedCurrent: p.declinedCurrentPuzzle,
    }));
  }

  solverView(): SolverView {
    const candidate = this.getPlayer(this.candidateId);
    const solver = this.getPlayer(this.solverId);
    return {
      candidateId: candidate?.id ?? null,
      candidateName: candidate?.displayName ?? null,
      solverId: solver?.id ?? null,
      solverName: solver?.displayName ?? null,
    };
  }

  puzzleMetaViews(): PuzzleMetaView[] {
    return PUZZLES.map((puzzle) => ({
      index: puzzle.index,
      id: puzzle.id,
      station: puzzle.station,
      title: puzzle.title,
      status: this.puzzleStatuses[puzzle.index] ?? 'WAITING_FOR_SOLVER',
    }));
  }

  snapshot(now = Date.now()): SessionSnapshot {
    const inPuzzle = this.status === 'PUZZLE_ACTIVE';
    return {
      code: this.code,
      status: this.status,
      pausedFrom: this.pausedFrom,
      currentPuzzleIndex: this.currentPuzzleIndex,
      puzzles: this.puzzleMetaViews(),
      timer: this.timerView(now),
      players: this.playerViews(),
      solver: this.solverView(),
      puzzleState: inPuzzle ? this.currentPuzzleState() : null,
      seals: this.seals,
      hintsUsed: this.hintsUsed,
      hintAvailable: this.hintAvailable,
      hintText: this.hintRevealed ? this.currentPuzzle.hint : null,
      phaseEndsAt: this.phaseEndsAt,
      result: this.result,
      revision: this.revision,
    };
  }

  /* ---------------------------------------------------------------- */
  /* Persistence                                                       */
  /* ---------------------------------------------------------------- */

  toRow(): SessionRow {
    return {
      id: this.id,
      code: this.code,
      host_secret: this.hostSecret,
      status: this.status,
      paused_from: this.pausedFrom,
      current_puzzle_index: this.currentPuzzleIndex,
      started_at: this.startedAt,
      paused_at: this.pausedAt,
      total_paused_ms: this.totalPausedMs,
      bonus_ms: this.bonusMs,
      phase_ends_at: this.phaseEndsAt,
      puzzle_state_json: JSON.stringify(this.puzzleStates),
      puzzle_status_json: JSON.stringify(this.puzzleStatuses),
      hints_used: this.hintsUsed,
      hint_revealed: this.hintRevealed ? 1 : 0,
      puzzle_entered_at: this.puzzleEnteredAt,
      solver_id: this.solverId,
      candidate_id: this.candidateId,
      created_at: this.createdAt,
      finished_at: this.finishedAt,
      result_json: this.result ? JSON.stringify(this.result) : null,
    };
  }

  persist(): void {
    this.repo.updateSession(this.toRow());
  }

  private persistPlayer(player: Player): void {
    this.repo.upsertPlayer({
      id: player.id,
      session_id: this.id,
      token: player.token,
      display_name: player.displayName,
      connected: player.connected ? 1 : 0,
      solver_count: player.solverCount,
      declined_current_puzzle: player.declinedCurrentPuzzle ? 1 : 0,
      created_at: player.createdAt,
      last_seen_at: player.lastSeenAt,
    });
  }

  static fromRows(repo: Repository, session: SessionRow, players: PlayerRow[]): GameSession {
    const game = new GameSession(repo, {
      id: session.id,
      code: session.code,
      hostSecret: session.host_secret,
      createdAt: session.created_at,
    });
    game.status = session.status as SessionStatus;
    game.pausedFrom = session.paused_from as SessionStatus | null;
    game.currentPuzzleIndex = session.current_puzzle_index;
    game.startedAt = session.started_at;
    game.pausedAt = session.paused_at;
    game.totalPausedMs = session.total_paused_ms;
    game.bonusMs = session.bonus_ms;
    game.phaseEndsAt = session.phase_ends_at;
    game.puzzleStates = JSON.parse(session.puzzle_state_json) as Record<number, PuzzleStateUnion>;
    game.puzzleStatuses = JSON.parse(session.puzzle_status_json) as Record<number, PuzzleStatus>;
    game.hintsUsed = session.hints_used;
    game.hintRevealed = session.hint_revealed === 1;
    game.puzzleEnteredAt = session.puzzle_entered_at;
    game.solverId = session.solver_id;
    game.candidateId = session.candidate_id;
    game.finishedAt = session.finished_at;
    game.result = session.result_json ? (JSON.parse(session.result_json) as GameResultView) : null;

    for (const row of players) {
      game.players.set(row.id, {
        id: row.id,
        token: row.token,
        displayName: row.display_name,
        // nobody holds a live socket right after a restart
        connected: false,
        solverCount: row.solver_count,
        declinedCurrentPuzzle: row.declined_current_puzzle === 1,
        createdAt: row.created_at,
        lastSeenAt: row.last_seen_at,
      });
    }
    return game;
  }
}
