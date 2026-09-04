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
