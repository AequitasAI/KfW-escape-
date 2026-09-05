import { createServer, type Server as HttpServer } from 'node:http';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AVATAR_COUNT, AVATARS } from '@kfw-escape/shared';
import { openDatabase, Repository } from '../src/db.js';
import { GameSession } from '../src/gameSession.js';
import { createHttpApp } from '../src/http.js';
import { HostAuth } from '../src/hostAuth.js';
import { SessionManager } from '../src/sessionManager.js';

/**
 * The game master login and the companion sigils, exercised over the real HTTP
 * stack: both exist so a session can be steered from a machine that never
 * created it, and so thirty people are told apart at a glance.
 */

const PASSWORD = 'brueckenbau-2026';

let httpServer: HttpServer;
let manager: SessionManager;
let baseUrl: string;

beforeAll(async () => {
  const db = openDatabase(':memory:');
  manager = new SessionManager(db);
  const app = createHttpApp(manager, new HostAuth(manager.repo, PASSWORD));
  httpServer = createServer(app);
  await new Promise<void>((resolve) => httpServer.listen(0, '127.0.0.1', resolve));
  const address = httpServer.address();
  if (!address || typeof address === 'string') throw new Error('No port');
  baseUrl = `http://127.0.0.1:${address.port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve) => httpServer.close(() => resolve()));
});

/** Minimal cookie jar - enough to carry one host session across requests. */
function jar(): { headers: () => HeadersInit; absorb: (response: Response) => void } {
  const cookies = new Map<string, string>();
  return {
    headers: () =>
      cookies.size > 0
        ? { Cookie: [...cookies].map(([name, value]) => `${name}=${value}`).join('; ') }
        : {},
    absorb: (response) => {
      for (const raw of response.headers.getSetCookie?.() ?? []) {
        const [pair] = raw.split(';');
        const [name, ...rest] = (pair ?? '').split('=');
        if (name) cookies.set(name, rest.join('='));
      }
    },
  };
}

async function login(password: string, cookies = jar()): Promise<{ status: number; cookies: typeof cookies }> {
  const response = await fetch(`${baseUrl}/api/host/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...cookies.headers() },
    body: JSON.stringify({ password }),
  });
  cookies.absorb(response);
  return { status: response.status, cookies };
}

describe('Game master login', () => {
  it('announces that a login exists without revealing anything else', async () => {
    const response = await fetch(`${baseUrl}/api/host/me`);
    expect(await response.json()).toEqual({ loginEnabled: true, authenticated: false });
  });

  it('rejects a wrong password and issues no cookie', async () => {
    const attempt = await login('nicht-das-passwort');
    expect(attempt.status).toBe(401);
    const probe = await fetch(`${baseUrl}/api/host/me`, { headers: attempt.cookies.headers() });
    expect((await probe.json()).authenticated).toBe(false);
  });

  it('refuses to create a session while unauthenticated', async () => {
    const response = await fetch(`${baseUrl}/api/sessions`, { method: 'POST' });
    expect(response.status).toBe(401);
    expect((await response.json()).error).toBe('HOST_LOGIN_REQUIRED');
  });

  it('hands the host secret of a session to any authenticated browser', async () => {
    const { status, cookies } = await login(PASSWORD);
    expect(status).toBe(200);

    // device A creates the session
    const created = await fetch(`${baseUrl}/api/sessions`, {
      method: 'POST',
      headers: cookies.headers(),
    });
    expect(created.status).toBe(201);
    const session = (await created.json()) as { code: string; hostSecret: string };

    // device B logs in separately and picks the same session up
    const second = await login(PASSWORD);
    const listed = await fetch(`${baseUrl}/api/host/sessions`, { headers: second.cookies.headers() });
    const payload = (await listed.json()) as { sessions: { code: string; hostSecret: string }[] };
    const found = payload.sessions.find((entry) => entry.code === session.code);
    expect(found?.hostSecret).toBe(session.hostSecret);

    const single = await fetch(`${baseUrl}/api/host/sessions/${session.code}`, {
      headers: second.cookies.headers(),
    });
    expect(((await single.json()) as { hostSecret: string }).hostSecret).toBe(session.hostSecret);
  });

  it('keeps the host secret away from anyone without a login', async () => {
    const response = await fetch(`${baseUrl}/api/host/sessions`);
    expect(response.status).toBe(401);
    expect(await response.text()).not.toContain('hostSecret');
  });

  it('logs out again', async () => {
    const { cookies } = await login(PASSWORD);
    const out = await fetch(`${baseUrl}/api/host/logout`, {
      method: 'POST',
      headers: cookies.headers(),
    });
    cookies.absorb(out);
    const probe = await fetch(`${baseUrl}/api/host/me`, { headers: cookies.headers() });
    expect((await probe.json()).authenticated).toBe(false);
  });
});

describe('Host token', () => {
  const auth = new HostAuth(new Repository(openDatabase(':memory:')), PASSWORD);

  it('accepts only its own signature', () => {
    const token = auth.issueToken();
    expect(auth.verifyToken(token)).toBe(true);
    expect(auth.verifyToken(`${token}x`)).toBe(false);
    expect(auth.verifyToken(token.replace(/\.[^.]+$/, '.forged'))).toBe(false);
    expect(auth.verifyToken('')).toBe(false);
    expect(auth.verifyToken(null)).toBe(false);
  });

  it('expires', () => {
    const token = auth.issueToken(Date.now() - 13 * 60 * 60 * 1000);
    expect(auth.verifyToken(token)).toBe(false);
  });

  it('is inert when no password is configured', () => {
    const disabled = new HostAuth(new Repository(openDatabase(':memory:')), '');
    expect(disabled.enabled).toBe(false);
    expect(disabled.verifyPassword('')).toBe(false);
    expect(disabled.verifyToken(disabled.issueToken())).toBe(false);
  });

  it('survives a restart, because the signing secret is stored', () => {
    const repo = new Repository(openDatabase(':memory:'));
    const before = new HostAuth(repo, PASSWORD);
    const token = before.issueToken();
    const afterRestart = new HostAuth(repo, PASSWORD);
    expect(afterRestart.verifyToken(token)).toBe(true);
  });
});

describe('Companion sigils', () => {
  function session(): GameSession {
    const repo = new Repository(openDatabase(':memory:'));
    const game = new GameSession(repo, {
      id: 'sigils',
      code: 'SIGILS',
      hostSecret: 'secret',
      createdAt: Date.now(),
    });
    repo.insertSession(game.toRow());
    return game;
  }

  it('offers thirty distinct sigils', () => {
    expect(AVATAR_COUNT).toBe(30);
    expect(new Set(AVATARS.map((entry) => entry.glyph)).size).toBe(30);
    expect(new Set(AVATARS.map((entry) => entry.name)).size).toBe(30);
  });

  it('never repeats a sigil while free ones are left', () => {
    const game = session();
    const assigned = Array.from({ length: AVATAR_COUNT }, (_, i) => game.addPlayer(`Gefährte ${i}`).avatar);
    expect(new Set(assigned).size).toBe(AVATAR_COUNT);
  });

  it('keeps handing out sigils past the thirtieth player', () => {
    const game = session();
    for (let i = 0; i < AVATAR_COUNT + 5; i += 1) game.addPlayer(`Gefährte ${i}`);
    for (const view of game.playerViews()) {
      expect(view.avatar).toBeGreaterThanOrEqual(0);
      expect(view.avatar).toBeLessThan(AVATAR_COUNT);
    }
  });

  it('survives a restart with the same sigil per player', () => {
    const repo = new Repository(openDatabase(':memory:'));
    const game = new GameSession(repo, {
      id: 'persist',
      code: 'PERSST',
      hostSecret: 'secret',
      createdAt: Date.now(),
    });
    repo.insertSession(game.toRow());
    const player = game.addPlayer('Mara');

    const restored = GameSession.fromRows(repo, game.toRow(), repo.listPlayers(game.id));
    expect(restored.getPlayer(player.id)?.avatar).toBe(player.avatar);
  });
});

describe('Login rate limit', () => {
  it('locks out after repeated failures but never because of successes', async () => {
    // ten good logins in a row must not use up the budget
    for (let i = 0; i < 12; i += 1) {
      expect((await login(PASSWORD)).status).toBe(200);
    }

    // a burst of wrong guesses does
    let sawLockout = false;
    for (let i = 0; i < 15; i += 1) {
      const attempt = await login('falsch');
      if (attempt.status === 429) {
        sawLockout = true;
        break;
      }
      expect(attempt.status).toBe(401);
    }
    expect(sawLockout).toBe(true);

    // and the lockout is not bypassed by suddenly knowing the password
    expect((await login(PASSWORD)).status).toBe(429);
  });
});

describe('Weitergeben ohne Gegenüber', () => {
  it('verweigert die Weitergabe, statt dieselbe Person still erneut zu fragen', () => {
    const repo = new Repository(openDatabase(':memory:'));
    const game = new GameSession(repo, {
      id: 'solo',
      code: 'SOLO01',
      hostSecret: 'x',
      createdAt: Date.now(),
    });
    repo.insertSession(game.toRow());
    const alone = game.addPlayer('Markus');
    game.setConnected(alone.id, true);
    game.start();
    game.advancePhase();

    expect(game.candidateId).toBe(alone.id);
    // früher: 'PASSED', identischer Kandidat, auf dem Schirm passiert nichts
    expect(game.declineSolver(alone.id)).toBe('ALONE');
    expect(game.candidateId).toBe(alone.id);
    expect(game.getPlayer(alone.id)?.declinedCurrentPuzzle).toBe(false);
  });

  it('gibt weiter, sobald jemand zweites verbunden ist', () => {
    const repo = new Repository(openDatabase(':memory:'));
    const game = new GameSession(repo, {
      id: 'pair',
      code: 'PAIR01',
      hostSecret: 'x',
      createdAt: Date.now(),
    });
    repo.insertSession(game.toRow());
    const a = game.addPlayer('Mara');
    const b = game.addPlayer('Jonas');
    game.setConnected(a.id, true);
    game.setConnected(b.id, true);
    game.start();
    game.advancePhase();

    const first = game.candidateId as string;
    expect(game.declineSolver(first)).toBe('PASSED');
    expect(game.candidateId).not.toBe(first);
  });
});

/* ------------------------------------------------------------------ */
/* Gefährtenwahl                                                       */
/* ------------------------------------------------------------------ */

function trialWith(names: string[]): { game: GameSession; ids: string[] } {
  const repo = new Repository(openDatabase(':memory:'));
  const game = new GameSession(repo, {
    id: `s-${names.join('-')}`,
    code: 'SOLVER',
    hostSecret: 'x',
    createdAt: Date.now(),
  });
  repo.insertSession(game.toRow());
  const ids = names.map((name) => {
    const player = game.addPlayer(name);
    game.setConnected(player.id, true);
    return player.id;
  });
  game.start();
  game.advancePhase();
  return { game, ids };
}

describe('Beim Start wird immer ein Gefährte gesetzt', () => {
  it('auch wenn nur eine Person verbunden ist', () => {
    const { game, ids } = trialWith(['Markus']);
    expect(game.status).toBe('PUZZLE_ACTIVE');
    expect(game.candidateId).toBe(ids[0]);
    expect(game.snapshot().solver.candidateName).toBe('Markus');
  });

  it('bei mehreren Personen genau eine', () => {
    const { game, ids } = trialWith(['Mara', 'Jonas', 'Alex']);
    expect(ids).toContain(game.candidateId);
    expect(game.snapshot().players.filter((p) => p.isCandidate)).toHaveLength(1);
  });

  it('holt ein verpasstes Angebot nach, statt ohne Gefährten stehen zu bleiben', () => {
    /*
     * Der eigentliche Fehler: Das Angebot wurde genau einmal beim Öffnen der
     * Prüfung ausgesprochen. War in diesem Moment niemand verbunden - bei einer
     * einzelnen Person genügt eine Bildschirmsperre -, blieb die Prüfung
     * dauerhaft ohne Gefährten stehen, und nur "neu ziehen" kam da wieder raus.
     */
    const repo = new Repository(openDatabase(':memory:'));
    const game = new GameSession(repo, {
      id: 'gap',
      code: 'GAP001',
      hostSecret: 'x',
      createdAt: Date.now(),
    });
    repo.insertSession(game.toRow());
    const alone = game.addPlayer('Markus');
    game.setConnected(alone.id, true);
    game.start();

    // genau im Übergang weg
    game.setConnected(alone.id, false);
    game.advancePhase();
    expect(game.status).toBe('PUZZLE_ACTIVE');
    expect(game.candidateId).toBeNull();

    // zurück - und die Prüfung wird sofort angeboten
    game.setConnected(alone.id, true);
    expect(game.candidateId).toBe(alone.id);
  });

  it('fängt es auch ohne Wiederverbinden im Tick auf', () => {
    const repo = new Repository(openDatabase(':memory:'));
    const game = new GameSession(repo, {
      id: 'tick',
      code: 'TICK01',
      hostSecret: 'x',
      createdAt: Date.now(),
    });
    repo.insertSession(game.toRow());
    const a = game.addPlayer('Mara');
    const b = game.addPlayer('Jonas');
    game.setConnected(a.id, true);
    game.start();
    game.setConnected(a.id, false);
    game.advancePhase();
    expect(game.candidateId).toBeNull();

    // jemand anderes ist da: der nächste Tick zieht ihn
    game.setConnected(b.id, true);
    game.tick();
    expect(game.candidateId).toBe(b.id);
  });

  it('bleibt ohne verbundene Person ruhig und erholt sich danach', () => {
    const repo = new Repository(openDatabase(':memory:'));
    const game = new GameSession(repo, {
      id: 'empty',
      code: 'EMPTY1',
      hostSecret: 'x',
      createdAt: Date.now(),
    });
    repo.insertSession(game.toRow());
    const solo = game.addPlayer('Markus');
    game.setConnected(solo.id, true);
    game.start();
    game.setConnected(solo.id, false);
    game.advancePhase();

    // kein Absturz, keine Endlosschleife, nur kein Angebot
    game.tick();
    game.tick();
    expect(game.candidateId).toBeNull();
    expect(game.status).toBe('PUZZLE_ACTIVE');

    game.setConnected(solo.id, true);
    expect(game.candidateId).toBe(solo.id);
  });

  it('lässt einen kurzen Verbindungsabbruch den Gefährten nicht verlieren', () => {
    const { game } = trialWith(['Mara', 'Jonas']);
    const solver = game.candidateId as string;
    game.acceptSolver(solver);
    expect(game.solverId).toBe(solver);

    // Netzwechsel: weg und gleich wieder da
    game.setConnected(solver, false);
    game.tick();
    game.setConnected(solver, true);
    game.tick();

    expect(game.solverId).toBe(solver);
    expect(game.candidateId).toBeNull();
  });

  it('zieht nach einem Ablehnen sofort den nächsten', () => {
    const { game, ids } = trialWith(['Mara', 'Jonas']);
    const first = game.candidateId as string;
    expect(game.declineSolver(first)).toBe('PASSED');
    expect(game.candidateId).not.toBe(first);
    expect(ids).toContain(game.candidateId);
  });
});

describe('Gezielte Übergabe', () => {
  it('übergibt an eine bestimmte Person und entzieht der vorherigen die Rechte', () => {
    const { game, ids } = trialWith(['Mara', 'Jonas', 'Alex']);
    const from = game.candidateId as string;
    game.acceptSolver(from);
    expect(game.solverId).toBe(from);

    const target = ids.find((id) => id !== from) as string;
    expect(game.handOverTo(target, from)).toBe('OFFERED');

    expect(game.candidateId).toBe(target);
    expect(game.solverId).toBeNull();
    // die vorherige Person darf nichts mehr bedienen
    const rejected = game.applyPuzzleAction(from, game.currentPuzzle.id, { type: 'swap', a: 0, b: 1 });
    expect(rejected).toEqual({ ok: false, reason: 'NOT_SOLVER' });
  });

  it('lässt niemanden übergeben, der die Prüfung gar nicht hat', () => {
    const { game, ids } = trialWith(['Mara', 'Jonas', 'Alex']);
    const holder = game.candidateId as string;
    const stranger = ids.find((id) => id !== holder) as string;
    const other = ids.find((id) => id !== holder && id !== stranger) as string;
    expect(game.handOverTo(other, stranger)).toBe('NOT_ALLOWED');
    expect(game.candidateId).toBe(holder);
  });

  it('weist unbekannte, getrennte und bereits aktive Ziele ab', () => {
    const { game, ids } = trialWith(['Mara', 'Jonas', 'Alex']);
    const holder = game.candidateId as string;
    const target = ids.find((id) => id !== holder) as string;

    expect(game.handOverTo('gibt-es-nicht', holder)).toBe('UNKNOWN_TARGET');
    expect(game.handOverTo(42, holder)).toBe('UNKNOWN_TARGET');
    expect(game.handOverTo(holder, holder)).toBe('ALREADY_ACTIVE');

    game.setConnected(target, false);
    expect(game.handOverTo(target, holder)).toBe('TARGET_OFFLINE');
    expect(game.candidateId).toBe(holder);
  });

  it('erlaubt der Spielleitung dasselbe ohne eigene Kennung', () => {
    const { game, ids } = trialWith(['Mara', 'Jonas']);
    const holder = game.candidateId as string;
    const target = ids.find((id) => id !== holder) as string;
    expect(game.handOverTo(target, null)).toBe('OFFERED');
    expect(game.candidateId).toBe(target);
  });

  it('hebt ein früheres Ablehnen der Zielperson auf', () => {
    const { game, ids } = trialWith(['Mara', 'Jonas', 'Alex']);
    const first = game.candidateId as string;
    game.declineSolver(first);
    const second = game.candidateId as string;

    // die erste Person hat abgelehnt - gezielt darf sie trotzdem gewählt werden
    expect(game.getPlayer(first)?.declinedCurrentPuzzle).toBe(true);
    expect(game.handOverTo(first, second)).toBe('OFFERED');
    expect(game.candidateId).toBe(first);
    expect(game.getPlayer(first)?.declinedCurrentPuzzle).toBe(false);
    expect(ids).toContain(first);
  });

  it('lässt den Zufall unangetastet', () => {
    const { game } = trialWith(['Mara', 'Jonas']);
    const first = game.candidateId as string;
    expect(game.rerollSolver()).toBe(true);
    expect(game.candidateId).not.toBe(first);
  });
});
