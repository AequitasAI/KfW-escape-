import type { Db } from './db.js';
import { Repository } from './db.js';
import { GameSession } from './gameSession.js';
import { log } from './logger.js';
import { generateCode, secret, uuid } from './util.js';

const TICK_INTERVAL_MS = 250;
/** Sessions older than this are dropped from memory and storage on sweep. */
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

export class SessionManager {
  readonly repo: Repository;
  private readonly sessions = new Map<string, GameSession>();
  private timer: NodeJS.Timeout | null = null;

  constructor(db: Db) {
    this.repo = new Repository(db);
    this.restore();
  }

  /** Reload unfinished sessions after a server restart so a reconnect works. */
  private restore(): void {
    let restored = 0;
    for (const row of this.repo.listSessions()) {
      if (row.status === 'WON' || row.status === 'LOST') continue;
      if (Date.now() - row.created_at > SESSION_TTL_MS) continue;
      const session = GameSession.fromRows(this.repo, row, this.repo.listPlayers(row.id));
      // a restart is an involuntary interruption - hold the clock until the host resumes
      if (session.status !== 'LOBBY' && session.pausedAt === null) {
        session.pausedFrom = session.status;
        session.status = 'PAUSED';
        session.pausedAt = Date.now();
        session.persist();
      }
      this.sessions.set(session.code, session);
      restored += 1;
    }
    if (restored > 0) log.info('sessions.restored', { count: restored });
  }

  create(): GameSession {
    let code = generateCode();
    let guard = 0;
    while (this.sessions.has(code) || this.repo.findSessionByCode(code)) {
      code = generateCode();
      guard += 1;
      if (guard > 50) throw new Error('Could not allocate a free session code');
    }
    const session = new GameSession(this.repo, {
      id: uuid(),
      code,
      hostSecret: secret(32),
      createdAt: Date.now(),
    });
    this.repo.insertSession(session.toRow());
    this.sessions.set(code, session);
    log.info('session.created', { code });
    return session;
  }

  get(code: string): GameSession | undefined {
    if (typeof code !== 'string') return undefined;
    return this.sessions.get(code.toUpperCase());
  }

  get count(): number {
    return this.sessions.size;
  }

  list(): GameSession[] {
    return [...this.sessions.values()];
  }

  start(): void {
    if (this.timer) return;
    this.timer = setInterval(() => this.tick(), TICK_INTERVAL_MS);
    // never hold the process open just for the game loop
    this.timer.unref?.();
  }

  stop(): void {
    if (!this.timer) return;
    clearInterval(this.timer);
    this.timer = null;
  }

  tick(now = Date.now()): void {
    for (const session of this.sessions.values()) {
      try {
        session.tick(now);
      } catch (error) {
        log.error('session.tick.failed', { code: session.code, message: String(error) });
      }
    }
  }

  /** Drops long finished or stale sessions from memory and storage. */
  sweep(now = Date.now()): number {
    let removed = 0;
    for (const [code, session] of this.sessions) {
      const finishedLongAgo = session.finishedAt !== null && now - session.finishedAt > 60 * 60 * 1000;
      const stale = now - session.createdAt > SESSION_TTL_MS;
      if (finishedLongAgo || stale) {
        this.sessions.delete(code);
        removed += 1;
      }
    }
    this.repo.purgeOlderThan(now - SESSION_TTL_MS);
    if (removed > 0) log.info('sessions.swept', { count: removed });
    return removed;
  }
}
