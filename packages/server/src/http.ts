import fs from 'node:fs';
import path from 'node:path';
import express, { type Express, type Request, type Response } from 'express';
import QRCode from 'qrcode';
import { GAME_TITLE, PUZZLE_COUNT } from '@kfw-escape/shared';
import { config } from './config.js';
import type { GameSession } from './gameSession.js';
import { HostAuth } from './hostAuth.js';
import { log } from './logger.js';
import type { SessionManager } from './sessionManager.js';
import { RateLimiter, sanitizeDisplayName } from './util.js';

/*
 * A whole team joins from one office network, so the join limit is per source
 * IP but sized for a full room arriving at once - 20/min would have locked out
 * everyone after the twentieth person behind the same NAT. It is still low
 * enough to stop a script from filling a session.
 */
const JOIN_LIMIT = new RateLimiter(Number(process.env['JOIN_RATE_LIMIT'] ?? 120), 60_000);
/*
 * Creating sessions is cheap but not free, and with a login configured it is
 * already gated by authentication. Configurable because a rehearsal that opens
 * a handful of throwaway sessions should not run into it.
 */
const CREATE_LIMIT = new RateLimiter(Number(process.env['SESSION_RATE_LIMIT'] ?? 10), 60_000);
/*
 * Only FAILED logins count against this. Guessing produces nothing but
 * failures, so the budget still turns an attack into a matter of years - while
 * someone signing in on a second device is never locked out by their own
 * successful logins.
 */
const LOGIN_LIMIT = new RateLimiter(Number(process.env['HOST_LOGIN_RATE_LIMIT'] ?? 10), 5 * 60_000);

const HOST_COOKIE = 'kfwesc_host';

function readCookie(req: Request, name: string): string | null {
  const header = req.headers.cookie;
  if (!header) return null;
  for (const part of header.split(';')) {
    const [rawName, ...rest] = part.trim().split('=');
    if (rawName === name) return decodeURIComponent(rest.join('='));
  }
  return null;
}

function cookieName(code: string): string {
  return `kfwesc_${code}`;
}

function clientKey(req: Request): string {
  // used only in-memory for rate limiting, never stored or logged
  return req.ip ?? 'unknown';
}

function setCookie(res: Response, name: string, value: string, maxAgeSeconds: number): void {
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    'Path=/',
    `Max-Age=${maxAgeSeconds}`,
    'SameSite=Lax',
    'HttpOnly',
  ];
  if (config.cookieSecure) parts.push('Secure');
  res.append('Set-Cookie', parts.join('; '));
}

function setIdentityCookie(res: Response, code: string, playerId: string, token: string): void {
  setCookie(res, cookieName(code), JSON.stringify({ playerId, token }), 43200);
}

function readIdentityCookie(req: Request, code: string): { playerId: string; token: string } | null {
  const raw = readCookie(req, cookieName(code));
  if (raw === null) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (
      parsed &&
      typeof parsed === 'object' &&
      typeof (parsed as { playerId?: unknown }).playerId === 'string' &&
      typeof (parsed as { token?: unknown }).token === 'string'
    ) {
      return parsed as { playerId: string; token: string };
    }
  } catch {
    return null;
  }
  return null;
}

function joinUrl(req: Request, code: string): string {
  const base = config.publicBaseUrl || `${req.protocol}://${req.get('host') ?? `localhost:${config.port}`}`;
  return `${base}/join/${code}`;
}

function publicSession(session: GameSession) {
  return {
    code: session.code,
    status: session.status,
    playerCount: session.players.size,
    puzzleCount: PUZZLE_COUNT,
  };
}

export function createHttpApp(
  manager: SessionManager,
  hostAuth: HostAuth = new HostAuth(manager.repo, config.hostPassword),
): Express {
  const app = express();
  app.set('trust proxy', 1);
  app.disable('x-powered-by');
  app.use(express.json({ limit: '16kb' }));

  if (config.corsOrigins.length > 0) {
    app.use((req, res, next) => {
      const origin = req.headers.origin;
      if (origin && config.corsOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
      }
      if (req.method === 'OPTIONS') {
        res.sendStatus(204);
        return;
      }
      next();
    });
  }

  /* ---------------- health ---------------- */

  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      service: 'kfw-escape',
      title: GAME_TITLE,
      uptimeSeconds: Math.round(process.uptime()),
      hostLogin: hostAuth.enabled,
      sessions: manager.count,
      time: new Date().toISOString(),
    });
  });

  /* ---------------- game master login ---------------- */

  const isAuthenticatedHost = (req: Request): boolean =>
    hostAuth.verifyToken(readCookie(req, HOST_COOKIE));

  /** Tells the client whether a login exists at all, and whether it holds one. */
  app.get('/api/host/me', (req, res) => {
    res.json({ loginEnabled: hostAuth.enabled, authenticated: isAuthenticatedHost(req) });
  });

  app.post('/api/host/login', (req, res) => {
    if (!hostAuth.enabled) {
      res.status(409).json({
        error: 'LOGIN_DISABLED',
        message: 'Für diese Installation ist kein Spielleitungs-Login eingerichtet.',
      });
      return;
    }
    if (LOGIN_LIMIT.blocked(clientKey(req))) {
      res.status(429).json({
        error: 'RATE_LIMITED',
        message: 'Zu viele Fehlversuche. Bitte einige Minuten warten.',
      });
      return;
    }
    const body = req.body as { password?: unknown } | undefined;
    if (!hostAuth.verifyPassword(body?.password)) {
      LOGIN_LIMIT.take(clientKey(req));
      // deliberately the same message for a wrong password and a missing one
      log.warn('host.login.failed', {});
      res.status(401).json({ error: 'INVALID_PASSWORD', message: 'Passwort stimmt nicht.' });
      return;
    }
    setCookie(res, HOST_COOKIE, hostAuth.issueToken(), hostAuth.ttlSeconds);
    log.info('host.login.ok', {});
    res.json({ ok: true });
  });

  app.post('/api/host/logout', (_req, res) => {
    setCookie(res, HOST_COOKIE, '', 0);
    res.json({ ok: true });
  });

  const requireHostLogin = (req: Request, res: Response): boolean => {
    if (isAuthenticatedHost(req)) return true;
    res.status(401).json({
      error: 'HOST_LOGIN_REQUIRED',
      message: 'Bitte zuerst als Spielleitung anmelden.',
    });
    return false;
  };

  /**
   * The point of the login: hand the host secret of a running session to any
   * authenticated browser, so the game can be steered from a different device
   * than the one that created it.
   */
  app.get('/api/host/sessions', (req, res) => {
    if (!requireHostLogin(req, res)) return;
    const sessions = manager
      .list()
      .sort((a, b) => b.createdAt - a.createdAt)
      .map((session) => ({
        ...publicSession(session),
        hostSecret: session.hostSecret,
        createdAt: session.createdAt,
        joinUrl: joinUrl(req, session.code),
      }));
    res.json({ sessions });
  });

  app.get('/api/host/sessions/:code', (req, res) => {
    if (!requireHostLogin(req, res)) return;
    const session = manager.get(req.params.code);
    if (!session) {
      res.status(404).json({ error: 'SESSION_NOT_FOUND' });
      return;
    }
    res.json({
      ...publicSession(session),
      hostSecret: session.hostSecret,
      createdAt: session.createdAt,
      joinUrl: joinUrl(req, session.code),
    });
  });

  /* ---------------- host ---------------- */

  app.post('/api/sessions', (req, res) => {
    // once a login exists, creating sessions is no longer open to everyone
    if (hostAuth.enabled && !requireHostLogin(req, res)) return;
    if (!CREATE_LIMIT.take(clientKey(req))) {
      res.status(429).json({ error: 'RATE_LIMITED' });
      return;
    }
    const session = manager.create();
    res.status(201).json({
      code: session.code,
      hostSecret: session.hostSecret,
      joinUrl: joinUrl(req, session.code),
    });
  });

  /* ---------------- public session info ---------------- */

  app.get('/api/sessions/:code', (req, res) => {
    const session = manager.get(req.params.code);
    if (!session) {
      res.status(404).json({ error: 'SESSION_NOT_FOUND' });
      return;
    }
    res.json({ ...publicSession(session), joinUrl: joinUrl(req, session.code) });
  });

  /** QR code as SVG so it stays crisp on a beamer. */
  app.get('/api/sessions/:code/qr.svg', async (req, res) => {
    const session = manager.get(req.params.code);
    if (!session) {
      res.status(404).json({ error: 'SESSION_NOT_FOUND' });
      return;
    }
    try {
      const svg = await QRCode.toString(joinUrl(req, session.code), {
        type: 'svg',
        margin: 1,
        errorCorrectionLevel: 'M',
        color: { dark: '#0b1a2b', light: '#ffffff' },
      });
      res.type('image/svg+xml').setHeader('Cache-Control', 'public, max-age=300').send(svg);
    } catch (error) {
      log.error('qr.failed', { message: String(error) });
      res.status(500).json({ error: 'QR_FAILED' });
    }
  });

  /* ---------------- join / reconnect ---------------- */

  app.post('/api/sessions/:code/join', (req, res) => {
    if (!JOIN_LIMIT.take(clientKey(req))) {
      res.status(429).json({ error: 'RATE_LIMITED', message: 'Zu viele Versuche. Bitte kurz warten.' });
      return;
    }
    const session = manager.get(req.params.code);
    if (!session) {
      res.status(404).json({ error: 'SESSION_NOT_FOUND', message: 'Diese Reisegruppe gibt es nicht.' });
      return;
    }

    const body = req.body as { displayName?: unknown } | undefined;
    const displayName = sanitizeDisplayName(body?.displayName);
    if (!displayName) {
      res.status(400).json({
        error: 'INVALID_NAME',
        message: 'Bitte einen Anzeigenamen mit mindestens 2 Zeichen angeben.',
      });
      return;
    }

    // an existing identity in this browser keeps its player instead of doubling up
    const existing = readIdentityCookie(req, session.code);
    const known = existing ? session.authenticate(existing.playerId, existing.token) : null;
    if (known) {
      session.renamePlayer(known.id, displayName);
      setIdentityCookie(res, session.code, known.id, known.token);
      res.json({ playerId: known.id, playerToken: known.token, displayName: known.displayName, rejoined: true });
      return;
    }

    if (session.status !== 'LOBBY' && session.players.size >= 60) {
      res.status(409).json({ error: 'SESSION_FULL', message: 'Diese Reisegruppe ist voll.' });
      return;
    }

    const player = session.addPlayer(displayName);
    setIdentityCookie(res, session.code, player.id, player.token);
    res.status(201).json({
      playerId: player.id,
      playerToken: player.token,
      displayName: player.displayName,
      rejoined: false,
    });
  });

  /** Reconnect probe: does this browser already belong to the session? */
  app.get('/api/sessions/:code/me', (req, res) => {
    const session = manager.get(req.params.code);
    if (!session) {
      res.status(404).json({ error: 'SESSION_NOT_FOUND' });
      return;
    }
    const identity = readIdentityCookie(req, session.code);
    const player = identity ? session.authenticate(identity.playerId, identity.token) : null;
    if (!player) {
      res.status(404).json({ error: 'NOT_JOINED' });
      return;
    }
    res.json({ playerId: player.id, playerToken: player.token, displayName: player.displayName });
  });

  /* ---------------- SPA ---------------- */

  const indexFile = path.join(config.webDist, 'index.html');
  if (fs.existsSync(indexFile)) {
    app.use(express.static(config.webDist, { index: false, maxAge: '1h' }));
    /*
     * Drop-in artwork is discovered by probing for files that usually do not
     * exist - thirty sigils alone are a hundred and twenty probes. Without this
     * the SPA fallback would answer each miss with a full index.html, so make a
     * missing asset an honest 404 instead.
     */
    app.get('/art/*', (_req, res) => {
      res.status(404).json({ error: 'ASSET_NOT_FOUND' });
    });
    app.get(/^(?!\/api\/|\/socket\.io\/).*/, (_req, res) => {
      res.sendFile(indexFile);
    });
    log.info('web.static.enabled', { dir: config.webDist });
  } else {
    app.get('/', (_req, res) => {
      res.type('text/plain').send(
        'KfW Escape API laeuft. Das Frontend wird im Dev-Modus von Vite auf Port 5173 ausgeliefert.',
      );
    });
  }

  return app;
}
