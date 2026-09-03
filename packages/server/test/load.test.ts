import { createServer, type Server as HttpServer } from 'node:http';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { io as ioClient, type Socket } from 'socket.io-client';
import type { SessionSnapshot } from '@kfw-escape/shared';
import { openDatabase } from '../src/db.js';
import { createHttpApp } from '../src/http.js';
import { SessionManager } from '../src/sessionManager.js';
import { createSocketServer } from '../src/socket.js';

/**
 * A14: 30 concurrent clients on one session.
 *
 * Runs the real HTTP and Socket.IO stack against an in-memory database, so this
 * exercises join, authorisation, broadcast fan-out and the solver rules exactly
 * as the deployed server does.
 */

let httpServer: HttpServer;
let manager: SessionManager;
let baseUrl: string;
const sockets: Socket[] = [];

beforeAll(async () => {
  const db = openDatabase(':memory:');
  manager = new SessionManager(db);
  const app = createHttpApp(manager);
  httpServer = createServer(app);
  createSocketServer(httpServer, manager);
  manager.start();

  await new Promise<void>((resolve) => httpServer.listen(0, '127.0.0.1', resolve));
  const address = httpServer.address();
  if (!address || typeof address === 'string') throw new Error('No port');
  baseUrl = `http://127.0.0.1:${address.port}`;
});

afterAll(async () => {
  for (const socket of sockets) socket.disconnect();
  manager.stop();
  await new Promise<void>((resolve) => httpServer.close(() => resolve()));
});

function connect(auth: Record<string, unknown>): Promise<{ socket: Socket; snapshot: SessionSnapshot }> {
  return new Promise((resolve, reject) => {
    const socket = ioClient(baseUrl, { auth, transports: ['websocket'], reconnection: false });
    sockets.push(socket);
    const timeout = setTimeout(() => reject(new Error('connect timeout')), 10_000);
    socket.once('session:snapshot', (snapshot: SessionSnapshot) => {
      clearTimeout(timeout);
      resolve({ socket, snapshot });
    });
    socket.once('connect_error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
  });
}

async function joinPlayer(code: string, displayName: string): Promise<{ playerId: string; playerToken: string }> {
  const response = await fetch(`${baseUrl}/api/sessions/${code}/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ displayName }),
  });
  if (!response.ok) throw new Error(`join failed: ${response.status}`);
  return (await response.json()) as { playerId: string; playerToken: string };
}

describe('A14 - 30 gleichzeitige Clients', () => {
  it('nimmt 30 Spieler auf, hält sie synchron und autorisiert nur den Solver', async () => {
    const created = await (await fetch(`${baseUrl}/api/sessions`, { method: 'POST' })).json() as {
      code: string;
      hostSecret: string;
    };
    const { code, hostSecret } = created;

    // 30 players join over HTTP, then open a socket each
    const identities = await Promise.all(
      Array.from({ length: 30 }, (_, i) => joinPlayer(code, `Gefaehrte ${i + 1}`)),
    );
    expect(identities).toHaveLength(30);
    expect(new Set(identities.map((i) => i.playerId)).size).toBe(30);

    const clients = await Promise.all(
      identities.map((identity) =>
        connect({ code, role: 'player', playerId: identity.playerId, playerToken: identity.playerToken }),
      ),
    );
    expect(clients).toHaveLength(30);

    const host = await connect({ code, role: 'host', hostSecret });
    const display = await connect({ code, role: 'display' });

    // every client converges on 30 connected players
    await vi_waitFor(() => {
      const session = manager.get(code);
      return (session?.connectedPlayers.length ?? 0) === 30;
    });

    // track the snapshots the clients receive from here on
    const latest = new Map<string, SessionSnapshot>();
    for (const [index, client] of clients.entries()) {
      client.socket.on('session:snapshot', (snapshot: SessionSnapshot) => {
        latest.set(String(index), snapshot);
      });
    }

    host.socket.emit('host:start');
    await vi_waitFor(() => manager.get(code)?.status === 'INTRO');

    // fast forward the intro by advancing the session directly, then let the
    // server tick move it into the first trial
    const session = manager.get(code)!;
    session.phaseEndsAt = Date.now() - 1;
    await vi_waitFor(() => session.status === 'PUZZLE_ACTIVE');
    await vi_waitFor(() => session.snapshot().solver.candidateId !== null);

    const candidateId = session.snapshot().solver.candidateId as string;
    const candidateIndex = identities.findIndex((identity) => identity.playerId === candidateId);
    expect(candidateIndex).toBeGreaterThanOrEqual(0);

    // A non-candidate cannot claim the trial, even by emitting the event directly
    const impostorIndex = (candidateIndex + 1) % 30;
    clients[impostorIndex]!.socket.emit('solver:accept');
    await delay(300);
    expect(session.snapshot().solver.solverId).toBeNull();

    clients[candidateIndex]!.socket.emit('solver:accept');
    await vi_waitFor(() => session.snapshot().solver.solverId === candidateId);

    // A non-solver puzzle action is rejected server side and changes nothing
    const before = JSON.stringify(session.currentPuzzleState());
    clients[impostorIndex]!.socket.emit('puzzle:action', {
      code,
      puzzleId: 'archive_runes',
      action: { type: 'swap', a: 0, b: 1 },
      clientActionId: 'impostor-1',
    });
    await delay(400);
    expect(JSON.stringify(session.currentPuzzleState())).toBe(before);

    // The solver's action reaches all 30 clients
    latest.clear();
    clients[candidateIndex]!.socket.emit('puzzle:action', {
      code,
      puzzleId: 'archive_runes',
      action: { type: 'swap', a: 0, b: 2 },
      clientActionId: 'solver-1',
    });

    await vi_waitFor(() => latest.size === 30, 8_000);
    expect(latest.size).toBe(30);

    const orders = new Set(
      [...latest.values()].map((snapshot) =>
        JSON.stringify((snapshot.puzzleState as { order?: string[] } | null)?.order ?? null),
      ),
    );
    // all clients agree on exactly one board state
    expect(orders.size).toBe(1);

    host.socket.disconnect();
    display.socket.disconnect();
  }, 60_000);
});

/* ------------------------------------------------------------------ */

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function vi_waitFor(predicate: () => boolean, timeoutMs = 10_000): Promise<void> {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (predicate()) return;
    await delay(50);
  }
  throw new Error('waitFor timed out');
}
