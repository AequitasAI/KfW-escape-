/**
 * Browser-local identity.
 *
 * The server is the source of truth: joining sets an HttpOnly cookie and returns
 * an opaque player id plus token. We mirror those into localStorage so a
 * reconnect still works when the cookie is unavailable (some in-app browsers,
 * a different port during development). Nothing here is a credential the player
 * ever typed - there is no login in this game.
 */

export interface PlayerIdentity {
  playerId: string;
  playerToken: string;
  displayName: string;
}

const prefix = 'kfw-escape';

function key(code: string): string {
  return `${prefix}:player:${code.toUpperCase()}`;
}

function hostKey(code: string): string {
  return `${prefix}:host:${code.toUpperCase()}`;
}

function read<T>(storageKey: string): T | null {
  try {
    const raw = window.localStorage.getItem(storageKey);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(storageKey: string, value: unknown): void {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(value));
  } catch {
    // private mode or blocked storage - the cookie still carries the identity
  }
}

export function loadIdentity(code: string): PlayerIdentity | null {
  const stored = read<PlayerIdentity>(key(code));
  if (!stored?.playerId || !stored.playerToken) return null;
  return stored;
}

export function saveIdentity(code: string, identity: PlayerIdentity): void {
  write(key(code), identity);
}

export function clearIdentity(code: string): void {
  try {
    window.localStorage.removeItem(key(code));
  } catch {
    /* ignore */
  }
}

export function loadHostSecret(code: string): string | null {
  return read<string>(hostKey(code));
}

export function saveHostSecret(code: string, secret: string): void {
  write(hostKey(code), secret);
}

/** Codes the host created in this browser, newest first. */
export function rememberHostedCode(code: string): void {
  const list = read<string[]>(`${prefix}:hosted`) ?? [];
  const next = [code.toUpperCase(), ...list.filter((entry) => entry !== code.toUpperCase())].slice(0, 8);
  write(`${prefix}:hosted`, next);
}

export function listHostedCodes(): string[] {
  return read<string[]>(`${prefix}:hosted`) ?? [];
}

/* --- sound preference (mute is always available) -------------------- */

export function loadMuted(): boolean {
  return read<boolean>(`${prefix}:muted`) ?? false;
}

export function saveMuted(muted: boolean): void {
  write(`${prefix}:muted`, muted);
}
