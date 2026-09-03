import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import type {
  ClientToServerEvents,
  GameResultView,
  PublicError,
  PuzzleAction,
  ServerToClientEvents,
  SessionSnapshot,
  SocketAuth,
} from '@kfw-escape/shared';

export type GameSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

export type ConnectionState = 'connecting' | 'connected' | 'reconnecting' | 'failed';

export interface SolverReveal {
  candidateId: string;
  candidateName: string;
  at: number;
}

export interface SolvedFlash {
  puzzleIndex: number;
  seals: number;
  at: number;
}

export interface SessionChannel {
  socket: GameSocket | null;
  snapshot: SessionSnapshot | null;
  connection: ConnectionState;
  error: string | null;
  /** last rejected action, shown briefly to the solver */
  lastRejection: PublicError | null;
  solverReveal: SolverReveal | null;
  solvedFlash: SolvedFlash | null;
  result: GameResultView | null;
  sendAction: (action: PuzzleAction) => void;
  emit: <E extends keyof ClientToServerEvents>(
    event: E,
    ...args: Parameters<ClientToServerEvents[E]>
  ) => void;
}

const SERVER_URL = (import.meta.env['VITE_SERVER_URL'] as string | undefined) ?? '';

let actionCounter = 0;

/**
 * One live connection to a session. Every view (host, player, display) uses this
 * same hook and renders from the same server snapshot, which is what keeps the
 * three surfaces in sync.
 */
export function useSession(auth: SocketAuth | null): SessionChannel {
  const [snapshot, setSnapshot] = useState<SessionSnapshot | null>(null);
  const [connection, setConnection] = useState<ConnectionState>('connecting');
  const [error, setError] = useState<string | null>(null);
  const [lastRejection, setLastRejection] = useState<PublicError | null>(null);
  const [solverReveal, setSolverReveal] = useState<SolverReveal | null>(null);
  const [solvedFlash, setSolvedFlash] = useState<SolvedFlash | null>(null);
  const [result, setResult] = useState<GameResultView | null>(null);
  const socketRef = useRef<GameSocket | null>(null);
  const [, forceRender] = useState(0);

  // stable key so a re-render with an equal auth object does not reconnect
  const authKey = auth
    ? [auth.code, auth.role, auth.playerId ?? '', auth.playerToken ?? '', auth.hostSecret ?? ''].join('|')
    : '';

  useEffect(() => {
    if (!auth || !auth.code) return undefined;

    const socket: GameSocket = io(SERVER_URL, {
      auth: auth as unknown as Record<string, unknown>,
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 20,
      reconnectionDelay: 700,
      reconnectionDelayMax: 4_000,
      timeout: 12_000,
    });
    socketRef.current = socket;
    forceRender((n) => n + 1);

    socket.on('connect', () => {
      setConnection('connected');
      setError(null);
    });

    socket.on('disconnect', (reason) => {
      // an explicit client disconnect is not an error worth showing
      setConnection(reason === 'io client disconnect' ? 'connecting' : 'reconnecting');
    });

    socket.on('connect_error', (err) => {
      const message = err.message;
      if (message === 'SESSION_NOT_FOUND') {
        setError('Diese Reisegruppe gibt es nicht (mehr).');
        setConnection('failed');
        socket.disconnect();
      } else if (message === 'PLAYER_FORBIDDEN') {
        setError('Deine Kennung ist abgelaufen. Bitte erneut beitreten.');
        setConnection('failed');
        socket.disconnect();
      } else if (message === 'HOST_FORBIDDEN') {
        setError('Diese Spielleitungs-Kennung passt nicht zur Session.');
        setConnection('failed');
        socket.disconnect();
      } else {
        setConnection('reconnecting');
      }
    });

    socket.on('session:snapshot', (next) => {
      setSnapshot(next);
      if (next.result) setResult(next.result);
    });

    socket.on('player:list', (players) => {
      setSnapshot((current) => (current ? { ...current, players } : current));
    });

    socket.on('solver:changed', (solver) => {
      setSnapshot((current) => (current ? { ...current, solver } : current));
    });

    socket.on('timer:sync', (timer) => {
      setSnapshot((current) => (current ? { ...current, timer } : current));
    });

    socket.on('puzzle:state', ({ state }) => {
      setSnapshot((current) => (current ? { ...current, puzzleState: state } : current));
    });

    socket.on('solver:offered', ({ candidateId, candidateName }) => {
      setSolverReveal({ candidateId, candidateName, at: Date.now() });
    });

    socket.on('puzzle:solved', ({ puzzleIndex, seals }) => {
      setSolvedFlash({ puzzleIndex, seals, at: Date.now() });
    });

    socket.on('game:won', (payload) => setResult(payload));
    socket.on('game:lost', (payload) => setResult(payload));

    socket.on('error:public', (payload) => {
      setLastRejection({ ...payload });
    });

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authKey]);

  // rejections are transient feedback, not persistent state
  useEffect(() => {
    if (!lastRejection) return undefined;
    const timeout = window.setTimeout(() => setLastRejection(null), 3_200);
    return () => window.clearTimeout(timeout);
  }, [lastRejection]);

  const sendAction = useCallback(
    (action: PuzzleAction) => {
      const socket = socketRef.current;
      if (!socket || !auth) return;
      const puzzleId = snapshotPuzzleId(socket);
      if (!puzzleId) return;
      actionCounter += 1;
      socket.emit('puzzle:action', {
        code: auth.code,
        puzzleId,
        action,
        clientActionId: `a${actionCounter}`,
      });
    },
    [auth],
  );

  // reading the puzzle id from the latest snapshot without re-creating sendAction
  const snapshotRef = useRef<SessionSnapshot | null>(null);
  snapshotRef.current = snapshot;
  function snapshotPuzzleId(_socket: GameSocket): SessionSnapshot['puzzles'][number]['id'] | null {
    const current = snapshotRef.current;
    if (!current) return null;
    return current.puzzles[current.currentPuzzleIndex]?.id ?? null;
  }

  const emit = useCallback(
    <E extends keyof ClientToServerEvents>(event: E, ...args: Parameters<ClientToServerEvents[E]>) => {
      socketRef.current?.emit(event, ...(args as never));
    },
    [],
  );

  return useMemo(
    () => ({
      socket: socketRef.current,
      snapshot,
      connection,
      error,
      lastRejection,
      solverReveal,
      solvedFlash,
      result,
      sendAction,
      emit,
    }),
    [snapshot, connection, error, lastRejection, solverReveal, solvedFlash, result, sendAction, emit],
  );
}
