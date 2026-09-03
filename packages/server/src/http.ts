import fs from 'node:fs';
import path from 'node:path';
import express, { type Express, type Request, type Response } from 'express';
import QRCode from 'qrcode';
import { GAME_TITLE, PUZZLE_COUNT } from '@kfw-escape/shared';
import { config } from './config.js';
import type { GameSession } from './gameSession.js';
import { log } from './logger.js';
import type { SessionManager } from './sessionManager.js';
import { RateLimiter, sanitizeDisplayName } from './util.js';

const JOIN_LIMIT = new RateLimiter(20, 60_000);
const CREATE_LIMIT = new RateLimiter(10, 60_000);

function cookieName(code: string): string {
  return `kfwesc_${code}`;
}

function clientKey(req: Request): string {
  // used only in-memory for rate limiting, never stored or logged
  return req.ip ?? 'unknown';
}

function setIdentityCookie(res: Response, code: string, playerId: string, token: string): void {
  const value = encodeURIComponent(JSON.stringify({ playerId, token }));
  const parts = [
    `${cookieName(code)}=${value}`,
    'Path=/',
    'Max-Age=43200',
    'SameSite=Lax',
    'HttpOnly',
  ];
  if (config.cookieSecure) parts.push('Secure');
  res.append('Set-Cookie', parts.join('; '));
}

function readIdentityCookie(req: Request, code: string): { playerId: string; token: string } | null {
  const header = req.headers.cookie;
  if (!header) return null;
  for (const part of header.split(';')) {
    const [rawName, ...rest] = part.trim().split('=');
    if (rawName !== cookieName(code)) continue;
    try {
      const parsed = JSON.parse(decodeURIComponent(rest.join('='))) as unknown;
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

export function createHttpApp(manager: SessionManager): Express {
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
      sessions: manager.count,
      time: new Date().toISOString(),
    });
  });

  /* ---------------- host ---------------- */

  app.post('/api/sessions', (req, res) => {
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
