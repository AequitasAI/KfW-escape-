import type { Server as HttpServer } from 'node:http';
import { Server, type Socket } from 'socket.io';
import { TIMER_SYNC_INTERVAL_MS } from '@kfw-escape/shared';
import type {
  ClientToServerEvents,
  PuzzleActionEnvelope,
  ServerToClientEvents,
  SocketAuth,
} from '@kfw-escape/shared';
import { config } from './config.js';
import { REJECTION_MESSAGES, type GameSession, type SessionEvent } from './gameSession.js';
import { log } from './logger.js';
import type { SessionManager } from './sessionManager.js';
import { RateLimiter } from './util.js';

interface SocketData {
  code: string;
  role: 'player' | 'host' | 'display';
  playerId: string | null;
  isHost: boolean;
}

type GameServer = Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>;
type GameSocket = Socket<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>;

/** Puzzle actions per socket. Generous for real play, tight enough to stop a script. */
const ACTION_LIMIT = new RateLimiter(40, 5_000);
/** Everything else a client may send. */
const CONTROL_LIMIT = new RateLimiter(30, 10_000);

function room(code: string): string {
  return `session:${code}`;
}

export function createSocketServer(httpServer: HttpServer, manager: SessionManager): GameServer {
  const io: GameServer = new Server(httpServer, {
    cors: config.corsOrigins.length > 0 ? { origin: config.corsOrigins, credentials: true } : undefined,
    // players are on mobile networks; be patient before declaring a disconnect
    pingTimeout: 25_000,
    pingInterval: 20_000,
  });

  // one broadcaster per session, attached lazily on the first connection
  const attached = new Set<string>();

  function attach(session: GameSession): void {
    if (attached.has(session.code)) return;
    attached.add(session.code);

    session.subscribe((event: SessionEvent) => {
      const target = io.to(room(session.code));
      switch (event.type) {
        case 'snapshot':
          target.emit('session:snapshot', session.snapshot());
          break;
        case 'players':
          target.emit('player:list', session.playerViews());
          break;
        case 'solverOffered':
          target.emit('solver:offered', {
            candidateId: event.candidateId,
            candidateName: event.candidateName,
          });
          break;
        case 'solverAccepted':
          target.emit('solver:accepted', { solverId: event.solverId, solverName: event.solverName });
          break;
        case 'solverChanged':
          target.emit('solver:changed', session.solverView());
          break;
        case 'puzzleState': {
          const state = session.currentPuzzleState();
          if (state) {
            target.emit('puzzle:state', {
              puzzleIndex: session.currentPuzzleIndex,
              puzzleId: session.currentPuzzle.id,
              state,
              ...(event.clientActionId ? { clientActionId: event.clientActionId } : {}),
            });
          }
          break;
        }
        case 'puzzleSolved':
          target.emit('puzzle:solved', {
            puzzleIndex: event.puzzleIndex,
            puzzleId: event.puzzleId,
            seals: event.seals,
          });
          break;
        case 'transition':
          target.emit('game:transition', {
            from: event.from,
            to: event.to,
            phaseEndsAt: event.phaseEndsAt,
          });
          break;
        case 'won':
          target.emit('game:won', event.result);
          break;
        case 'lost':
          target.emit('game:lost', event.result);
          break;
        default:
          break;
      }
    });
  }

  io.use((socket, next) => {
    const auth = (socket.handshake.auth ?? {}) as Partial<SocketAuth>;
    const code = typeof auth.code === 'string' ? auth.code.toUpperCase() : '';
    const session = manager.get(code);
    if (!session) return next(new Error('SESSION_NOT_FOUND'));

    const role = auth.role === 'host' || auth.role === 'display' ? auth.role : 'player';

    if (role === 'host') {
      if (auth.hostSecret !== session.hostSecret) return next(new Error('HOST_FORBIDDEN'));
      socket.data = { code: session.code, role: 'host', playerId: null, isHost: true };
      return next();
    }

    if (role === 'display') {
      socket.data = { code: session.code, role: 'display', playerId: null, isHost: false };
      return next();
    }

    const player = session.authenticate(auth.playerId, auth.playerToken);
    if (!player) return next(new Error('PLAYER_FORBIDDEN'));
    socket.data = { code: session.code, role: 'player', playerId: player.id, isHost: false };
    return next();
  });

  io.on('connection', (socket: GameSocket) => {
    const session = manager.get(socket.data.code);
    if (!session) {
      socket.disconnect(true);
      return;
    }
    attach(session);
    void socket.join(room(session.code));

    if (socket.data.role === 'player' && socket.data.playerId) {
      session.setConnected(socket.data.playerId, true);
    }
    socket.emit('session:snapshot', session.snapshot());
    log.debug('socket.connected', { code: session.code, role: socket.data.role });

    const fail = (message: string, code = 'REJECTED', clientActionId?: string): void => {
      socket.emit('error:public', {
        code,
        message,
        ...(clientActionId ? { clientActionId } : {}),
      });
    };

    const allowControl = (): boolean => {
      if (CONTROL_LIMIT.take(socket.id)) return true;
      fail('Zu viele Anfragen. Bitte einen Moment warten.', 'RATE_LIMITED');
      return false;
    };

    const requireHost = (): boolean => {
      if (socket.data.isHost) return true;
      fail('Diese Aktion ist der Spielleitung vorbehalten.', 'HOST_ONLY');
      return false;
    };

    /* ---------------- player ---------------- */

    socket.on('player:rename', (payload) => {
      if (!allowControl()) return;
      const playerId = socket.data.playerId;
      if (!playerId) return;
      if (!session.renamePlayer(playerId, payload?.displayName)) {
        fail('Der Name kann jetzt nicht mehr geändert werden.', 'RENAME_REJECTED');
      }
    });

    socket.on('player:ready', () => {
      if (!allowControl()) return;
      const playerId = socket.data.playerId;
      if (!playerId) return;
      session.markReady(playerId);
    });

    socket.on('solver:accept', () => {
      if (!allowControl()) return;
      const playerId = socket.data.playerId;
      if (!playerId) return fail('Nur Spielende können eine Prüfung annehmen.', 'PLAYER_ONLY');
      if (!session.acceptSolver(playerId)) {
        fail('Die Prüfung wurde dir gerade nicht angeboten.', 'NOT_CANDIDATE');
      }
    });

    socket.on('solver:decline', () => {
      if (!allowControl()) return;
      const playerId = socket.data.playerId;
      if (!playerId) return fail('Nur Spielende können weitergeben.', 'PLAYER_ONLY');
      const outcome = session.declineSolver(playerId);
      if (outcome === 'ALONE') {
        fail(
          'Du bist gerade allein unterwegs – es gibt niemanden, an den du weitergeben könntest. Die Spielleitung kann die Prüfung überspringen.',
          'NO_ONE_ELSE',
        );
      } else if (outcome === 'REJECTED') {
        fail('Die Prüfung wurde dir gerade nicht angeboten.', 'NOT_CANDIDATE');
      }
    });

    socket.on('hint:request', () => {
      if (!allowControl()) return;
      if (!session.revealHint(socket.data.playerId)) {
        fail('Gerade ist kein Hinweis verfügbar.', 'HINT_UNAVAILABLE');
      }
    });

    socket.on('puzzle:action', (payload: PuzzleActionEnvelope) => {
      const clientActionId = typeof payload?.clientActionId === 'string' ? payload.clientActionId : undefined;

      if (!ACTION_LIMIT.take(socket.id)) {
        return fail('Zu viele Aktionen in kurzer Zeit.', 'RATE_LIMITED', clientActionId);
      }
      const playerId = socket.data.playerId;
      if (!playerId) {
        return fail(REJECTION_MESSAGES.NOT_SOLVER, 'NOT_SOLVER', clientActionId);
      }
      if (!payload || typeof payload !== 'object') {
        return fail(REJECTION_MESSAGES.INVALID_ACTION, 'INVALID_ACTION', clientActionId);
      }
      if (payload.code?.toUpperCase() !== session.code) {
        return fail(REJECTION_MESSAGES.WRONG_PUZZLE, 'WRONG_SESSION', clientActionId);
      }

      const result = session.applyPuzzleAction(playerId, payload.puzzleId, payload.action);
      if (!result.ok) {
        return fail(REJECTION_MESSAGES[result.reason], result.reason, clientActionId);
      }

      io.to(room(session.code)).emit('puzzle:state', {
        puzzleIndex: session.currentPuzzleIndex,
        puzzleId: session.currentPuzzle.id,
        state: result.state,
        ...(clientActionId ? { clientActionId } : {}),
      });
      io.to(room(session.code)).emit('session:snapshot', session.snapshot());

      if (result.solved) session.markSolved();
      return undefined;
    });

    /* ---------------- host ---------------- */

    socket.on('host:start', () => {
      if (!allowControl() || !requireHost()) return;
      if (!session.start()) fail('Das Abenteuer läuft bereits oder es fehlen Gefährten.', 'START_REJECTED');
    });

    socket.on('host:continue', () => {
      if (!allowControl() || !requireHost()) return;
      if (!session.advancePhase()) {
        fail('Gerade wartet keine Phase auf ein Weiter.', 'NOTHING_TO_ADVANCE');
      }
    });

    socket.on('host:pause', () => {
      if (!allowControl() || !requireHost()) return;
      if (!session.pause()) fail('Gerade lässt sich nichts pausieren.', 'PAUSE_REJECTED');
    });

    socket.on('host:resume', () => {
      if (!allowControl() || !requireHost()) return;
      if (!session.resume()) fail('Die Session ist nicht pausiert.', 'RESUME_REJECTED');
    });

    socket.on('host:rerollSolver', () => {
      if (!allowControl() || !requireHost()) return;
      if (!session.rerollSolver()) fail('Es kann gerade kein Gefährte gezogen werden.', 'REROLL_REJECTED');
    });

    socket.on('host:skipPuzzle', () => {
      if (!allowControl() || !requireHost()) return;
      if (!session.skipPuzzle()) fail('Gerade läuft keine Prüfung.', 'SKIP_REJECTED');
    });

    socket.on('host:addTime', () => {
      if (!allowControl() || !requireHost()) return;
      if (!session.addBonusTime()) fail('Die Zeit kann jetzt nicht verlängert werden.', 'ADDTIME_REJECTED');
    });

    socket.on('host:end', () => {
      if (!allowControl() || !requireHost()) return;
      if (!session.endSession()) fail('Die Session ist bereits beendet.', 'END_REJECTED');
    });

    socket.on('host:reset', () => {
      if (!allowControl() || !requireHost()) return;
      session.reset();
    });

    socket.on('disconnect', (reason) => {
      if (socket.data.role === 'player' && socket.data.playerId) {
        // another tab or a fresh reload may already hold a live socket
        const stillHere = [...io.sockets.sockets.values()].some(
          (other) =>
            other.id !== socket.id &&
            other.data?.playerId === socket.data.playerId &&
            other.connected,
        );
        if (!stillHere) session.setConnected(socket.data.playerId, false);
      }
      log.debug('socket.disconnected', { code: session.code, role: socket.data.role, reason });
    });
  });

  // Server authoritative clock broadcast. Clients interpolate between these and
  // correct their own drift from `serverNow`, so backgrounding cannot skew them.
  const clock = setInterval(() => {
    const now = Date.now();
    for (const session of manager.list()) {
      if (session.status === 'LOBBY') continue;
      io.to(room(session.code)).emit('timer:sync', session.timerView(now));
    }
    ACTION_LIMIT.sweep(now);
    CONTROL_LIMIT.sweep(now);
  }, TIMER_SYNC_INTERVAL_MS);
  clock.unref?.();

  io.on('close', () => clearInterval(clock));

  return io;
}
