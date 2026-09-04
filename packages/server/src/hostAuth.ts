import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import type { Repository } from './db.js';
import { log } from './logger.js';

/**
 * Optional password login for the game master.
 *
 * Without it the host secret lives only in the browser that created the
 * session, which is fine for a laptop on the podium but useless when the game
 * has to be started from a locked-down office machine. With HOST_PASSWORD set,
 * any browser can authenticate and pull the host secret of a running session,
 * so the game master can take over from anywhere.
 *
 * Players are deliberately unaffected: they still join with a display name and
 * nothing else. There is exactly one account, and it controls sessions only -
 * it is not a user system and stores nothing about who logged in.
 */

const META_KEY = 'host_token_secret';
const TOKEN_TTL_MS = 12 * 60 * 60 * 1000;
/** Below this a password is guessable in an afternoon; refuse to pretend otherwise. */
const MIN_PASSWORD_LENGTH = 8;

function constantTimeEquals(a: string, b: string): boolean {
  // hashing first keeps the comparison length-independent, so the check itself
  // never leaks how long the configured password is
  const left = createHmac('sha256', 'kfw-escape-compare').update(a).digest();
  const right = createHmac('sha256', 'kfw-escape-compare').update(b).digest();
  return timingSafeEqual(left, right);
}

export class HostAuth {
  private readonly password: string;
  private readonly tokenSecret: string;

  constructor(repo: Repository, password: string) {
    this.password = password;
    /*
     * Persisted rather than generated per boot: a restart during the event
     * would otherwise log the game master out at the worst possible moment.
     */
    let stored = repo.readMeta(META_KEY);
    if (!stored) {
      stored = randomBytes(32).toString('base64url');
      repo.writeMeta(META_KEY, stored);
    }
    this.tokenSecret = stored;

    if (this.enabled && password.length < MIN_PASSWORD_LENGTH) {
      log.warn('host.password.weak', { minLength: MIN_PASSWORD_LENGTH });
    }
  }

  /** No password configured means the device-bound behaviour stays in place. */
  get enabled(): boolean {
    return this.password.length > 0;
  }

  verifyPassword(input: unknown): boolean {
    if (!this.enabled) return false;
    if (typeof input !== 'string' || input.length === 0 || input.length > 512) return false;
    return constantTimeEquals(input, this.password);
  }

  /** `expiry.nonce.signature`; carries no identity because there is none. */
  issueToken(now = Date.now()): string {
    const payload = `${now + TOKEN_TTL_MS}.${randomBytes(12).toString('base64url')}`;
    return `${payload}.${this.sign(payload)}`;
  }

  verifyToken(raw: unknown, now = Date.now()): boolean {
    if (!this.enabled) return false;
    if (typeof raw !== 'string') return false;
    const parts = raw.split('.');
    if (parts.length !== 3) return false;
    const [expiry, nonce, signature] = parts as [string, string, string];
    const payload = `${expiry}.${nonce}`;
    if (!constantTimeEquals(signature, this.sign(payload))) return false;
    const expiresAt = Number(expiry);
    return Number.isFinite(expiresAt) && expiresAt > now;
  }

  get ttlSeconds(): number {
    return Math.floor(TOKEN_TTL_MS / 1000);
  }

  private sign(payload: string): string {
    return createHmac('sha256', this.tokenSecret).update(payload).digest('base64url');
  }
}
