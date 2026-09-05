/**
 * Shared contracts between server and web client.
 * The server is authoritative for every value in here; the client only renders.
 */

export type SessionStatus =
  | 'LOBBY'
  | 'INTRO'
  | 'PUZZLE_ACTIVE'
  | 'TRANSITION'
  | 'FINALE'
  | 'WON'
  | 'LOST'
  | 'PAUSED';

export type PuzzleStatus =
  | 'WAITING_FOR_SOLVER'
  | 'SOLVER_OFFERED'
  | 'SOLVER_ACCEPTED'
  | 'ACTIVE'
  | 'SOLVED'
  | 'SKIPPED';

export type PuzzleId =
  | 'archive_runes'
  | 'cable_labyrinth'
  | 'testmasters_diff'
  | 'operations_gears'
  | 'black_gate_code';

export type ClientRole = 'player' | 'host' | 'display';

export interface PlayerView {
  id: string;
  displayName: string;
  /** index into AVATARS; assigned by the server on join, never chosen */
  avatar: number;
  connected: boolean;
  solverCount: number;
  /** true when this player is the currently offered solver candidate */
  isCandidate: boolean;
  /** true when this player has accepted and may act */
  isSolver: boolean;
  /** true when this player declined the current puzzle */
  declinedCurrent: boolean;
  /** true when this player has read the intro and moved on */
  ready: boolean;
}

export interface TimerView {
  durationMs: number;
  /** epoch ms, null while in LOBBY */
  startedAt: number | null;
  /** epoch ms when the run ends if never paused again, null while in LOBBY */
  endsAt: number | null;
  remainingMs: number;
  /** server clock at snapshot time, used by clients to correct their own drift */
  serverNow: number;
  running: boolean;
}

export interface SolverView {
  candidateId: string | null;
  candidateName: string | null;
  solverId: string | null;
  solverName: string | null;
}

export interface PuzzleMetaView {
  index: number;
  id: PuzzleId;
  station: string;
  title: string;
  status: PuzzleStatus;
}

export interface GameResultView {
  won: boolean;
  remainingMs: number;
  playerCount: number;
  hintsUsed: number;
  solvedCount: number;
  skippedCount: number;
}

export interface SessionSnapshot {
  code: string;
  status: SessionStatus;
  /** status the session returns to on resume; only set while PAUSED */
  pausedFrom: SessionStatus | null;
  currentPuzzleIndex: number;
  puzzles: PuzzleMetaView[];
  timer: TimerView;
  players: PlayerView[];
  solver: SolverView;
  /** state of the currently active puzzle, null outside PUZZLE_ACTIVE */
  puzzleState: PuzzleStateUnion | null;
  seals: number;
  hintsUsed: number;
  hintAvailable: boolean;
  hintText: string | null;
  /** epoch ms at which the current transition/intro/finale phase auto-advances */
  phaseEndsAt: number | null;
  result: GameResultView | null;
  revision: number;
}

/* ------------------------------------------------------------------ */
/* Puzzle states                                                       */
/* ------------------------------------------------------------------ */

export interface ArchiveRunesState {
  kind: 'archive_runes';
  order: string[];
  /** rune ids currently locked in the correct final position after solving */
  solved: boolean;
}

export type CableDir = 'N' | 'E' | 'S' | 'W';

export interface CableTile {
  id: string;
  /** connector directions of this tile, fixed geometry - tiles never rotate */
  connectors: CableDir[];
}

export interface CableLabyrinthState {
  kind: 'cable_labyrinth';
  /** 16 entries, row major, null marks the single empty cell */
  board: (string | null)[];
  tiles: Record<string, CableTile>;
  sourceRow: number;
  targetRow: number;
  cols: number;
  rows: number;
  /** board indices currently carrying energy from the source port */
  energized: number[];
  moves: number;
  solved: boolean;
}

export interface TestmastersDiffState {
  kind: 'testmasters_diff';
  found: string[];
  misses: number;
  /** epoch ms of the last rejected click, drives the anti-spam cooldown */
  lastMissAt: number | null;
  solved: boolean;
}

export interface OperationsGearsState {
  kind: 'operations_gears';
  orientations: number[];
  /** contact i sits between gear i and gear i+1 */
  contacts: boolean[];
  /** how far the drive chain reaches from the fixed motor gear */
  poweredUpTo: number;
  moves: number;
  solved: boolean;
}

export interface BlackGateState {
  kind: 'black_gate_code';
  entry: string;
  attempts: string[];
  lastRejected: string | null;
  solved: boolean;
}

export type PuzzleStateUnion =
  | ArchiveRunesState
  | CableLabyrinthState
  | TestmastersDiffState
  | OperationsGearsState
  | BlackGateState;

/* ------------------------------------------------------------------ */
/* Puzzle actions (client -> server)                                   */
/* ------------------------------------------------------------------ */

export type ArchiveRunesAction =
  | { type: 'swap'; a: number; b: number }
  | { type: 'shift'; index: number; dir: -1 | 1 };

export type CableLabyrinthAction = { type: 'slide'; index: number };

export type TestmastersDiffAction =
  | { type: 'hit'; hotspotId: string }
  | { type: 'miss' };

export type OperationsGearsAction = { type: 'rotate'; gear: number; dir: -1 | 1 };

export type BlackGateAction =
  | { type: 'digit'; digit: number }
  | { type: 'backspace' }
  | { type: 'clear' }
  | { type: 'submit' };

export type PuzzleAction =
  | ArchiveRunesAction
  | CableLabyrinthAction
  | TestmastersDiffAction
  | OperationsGearsAction
  | BlackGateAction;

export interface PuzzleActionEnvelope {
  code: string;
  puzzleId: PuzzleId;
  action: PuzzleAction;
  clientActionId: string;
}

/* ------------------------------------------------------------------ */
/* Socket events                                                       */
/* ------------------------------------------------------------------ */

export interface SocketAuth {
  code: string;
  role: ClientRole;
  playerId?: string;
  playerToken?: string;
  hostSecret?: string;
}

export interface PublicError {
  code: string;
  message: string;
  clientActionId?: string;
}

export interface ServerToClientEvents {
  'session:snapshot': (snapshot: SessionSnapshot) => void;
  'player:list': (players: PlayerView[]) => void;
  'solver:offered': (payload: { candidateId: string; candidateName: string }) => void;
  'solver:accepted': (payload: { solverId: string; solverName: string }) => void;
  'solver:changed': (payload: SolverView) => void;
  'puzzle:state': (payload: {
    puzzleIndex: number;
    puzzleId: PuzzleId;
    state: PuzzleStateUnion;
    clientActionId?: string;
  }) => void;
  'puzzle:solved': (payload: { puzzleIndex: number; puzzleId: PuzzleId; seals: number }) => void;
  'game:transition': (payload: { from: number; to: number; phaseEndsAt: number }) => void;
  'game:won': (payload: GameResultView) => void;
  'game:lost': (payload: GameResultView) => void;
  'timer:sync': (payload: TimerView) => void;
  'error:public': (payload: PublicError) => void;
}

export interface ClientToServerEvents {
  'player:rename': (payload: { displayName: string }) => void;
  /** Vorspann gelesen - die Prüfung öffnet, sobald alle so weit sind. */
  'player:ready': () => void;
  'solver:accept': () => void;
  'solver:decline': () => void;
  'puzzle:action': (payload: PuzzleActionEnvelope) => void;
  'hint:request': () => void;
  'host:start': () => void;
  /** Beendet Intro, Übergang oder Finale sofort, statt die Restzeit abzuwarten. */
  'host:continue': () => void;
  'host:pause': () => void;
  'host:resume': () => void;
  'host:rerollSolver': () => void;
  'host:skipPuzzle': () => void;
  'host:addTime': () => void;
  'host:end': () => void;
  'host:reset': () => void;
}
