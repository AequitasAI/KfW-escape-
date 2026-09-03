import type { SessionStatus } from '@kfw-escape/shared';

export interface ApiError {
  error: string;
  message?: string;
}

export class RequestError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'RequestError';
  }
}

const FALLBACK_MESSAGES: Record<string, string> = {
  SESSION_NOT_FOUND: 'Diese Reisegruppe gibt es nicht (mehr).',
  INVALID_NAME: 'Bitte einen Anzeigenamen mit mindestens 2 Zeichen angeben.',
  RATE_LIMITED: 'Zu viele Versuche. Bitte einen Moment warten.',
  SESSION_FULL: 'Diese Reisegruppe ist bereits voll.',
  NOT_JOINED: 'Noch nicht beigetreten.',
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    credentials: 'same-origin',
    headers: init?.body ? { 'Content-Type': 'application/json' } : undefined,
    ...init,
  });

  if (!response.ok) {
    let payload: ApiError = { error: 'REQUEST_FAILED' };
    try {
      payload = (await response.json()) as ApiError;
    } catch {
      /* non JSON error body */
    }
    const message =
      payload.message ?? FALLBACK_MESSAGES[payload.error] ?? 'Da ist etwas schiefgegangen.';
    throw new RequestError(response.status, payload.error, message);
  }

  return (await response.json()) as T;
}

export interface CreatedSession {
  code: string;
  hostSecret: string;
  joinUrl: string;
}

export interface PublicSession {
  code: string;
  status: SessionStatus;
  playerCount: number;
  puzzleCount: number;
  joinUrl: string;
}

export interface JoinResponse {
  playerId: string;
  playerToken: string;
  displayName: string;
  rejoined: boolean;
}

export const api = {
  health: () => request<{ ok: boolean; sessions: number; uptimeSeconds: number }>('/api/health'),
  createSession: () => request<CreatedSession>('/api/sessions', { method: 'POST' }),
  getSession: (code: string) => request<PublicSession>(`/api/sessions/${encodeURIComponent(code)}`),
  join: (code: string, displayName: string) =>
    request<JoinResponse>(`/api/sessions/${encodeURIComponent(code)}/join`, {
      method: 'POST',
      body: JSON.stringify({ displayName }),
    }),
  me: (code: string) =>
    request<{ playerId: string; playerToken: string; displayName: string }>(
      `/api/sessions/${encodeURIComponent(code)}/me`,
    ),
  qrUrl: (code: string) => `/api/sessions/${encodeURIComponent(code)}/qr.svg`,
};
