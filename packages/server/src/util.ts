import { randomBytes, randomUUID } from 'node:crypto';
import {
  CODE_ALPHABET,
  CODE_LENGTH,
  MAX_DISPLAY_NAME_LENGTH,
  MIN_DISPLAY_NAME_LENGTH,
} from '@kfw-escape/shared';

export function uuid(): string {
  return randomUUID();
}

/** Opaque secret for host control and player identity. Never derived from a name. */
export function secret(bytes = 24): string {
  return randomBytes(bytes).toString('base64url');
}

/** Session code from a reduced alphabet without 0/O/I/1 look-alikes. */
export function generateCode(): string {
  const buffer = randomBytes(CODE_LENGTH);
  let out = '';
  for (let i = 0; i < CODE_LENGTH; i += 1) {
    out += CODE_ALPHABET[(buffer[i] as number) % CODE_ALPHABET.length];
  }
  return out;
}

/** Control characters, plus the characters that could start markup or an escape. */
const UNSAFE_NAME_CHARS = /[\u0000-\u001f\u007f<>&"'`\\]/g;

/**
 * Display names are the only user supplied text in the whole app. Strip control
 * characters and anything HTML-ish, collapse whitespace, clamp the length.
 * React escapes on render as well; this is the server side belt.
 */
export function sanitizeDisplayName(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const cleaned = raw
    .replace(UNSAFE_NAME_CHARS, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_DISPLAY_NAME_LENGTH);
  if (cleaned.length < MIN_DISPLAY_NAME_LENGTH) return null;
  return cleaned;
}

export function pickRandom<T>(items: readonly T[]): T | null {
  if (items.length === 0) return null;
  const index = randomBytes(4).readUInt32BE(0) % items.length;
  return items[index] as T;
}

/** Fixed-window rate limiter, small enough to keep in memory for one process. */
export class RateLimiter {
  private readonly hits = new Map<string, { count: number; resetAt: number }>();

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
  ) {}

  /** Is this key currently exhausted? Does not consume anything. */
  blocked(key: string, now = Date.now()): boolean {
    const entry = this.hits.get(key);
    if (!entry || now >= entry.resetAt) return false;
    return entry.count >= this.limit;
  }

  take(key: string, now = Date.now()): boolean {
    const entry = this.hits.get(key);
    if (!entry || now >= entry.resetAt) {
      this.hits.set(key, { count: 1, resetAt: now + this.windowMs });
      return true;
    }
    if (entry.count >= this.limit) return false;
    entry.count += 1;
    return true;
  }

  sweep(now = Date.now()): void {
    for (const [key, entry] of this.hits) {
      if (now >= entry.resetAt) this.hits.delete(key);
    }
  }
}
