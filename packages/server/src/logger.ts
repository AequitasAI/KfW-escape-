import { config } from './config.js';

const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 } as const;
type Level = keyof typeof LEVELS;

const threshold = LEVELS[config.logLevel] ?? LEVELS.info;

/**
 * Deliberately sparse structured logging: session lifecycle, puzzle transitions
 * and technical errors only. No IP addresses, no display names in payloads.
 */
function emit(level: Level, event: string, data?: Record<string, unknown>): void {
  if (LEVELS[level] < threshold) return;
  const line = { ts: new Date().toISOString(), level, event, ...data };
  const text = JSON.stringify(line);
  if (level === 'error') console.error(text);
  else if (level === 'warn') console.warn(text);
  else console.log(text);
}

export const log = {
  debug: (event: string, data?: Record<string, unknown>) => emit('debug', event, data),
  info: (event: string, data?: Record<string, unknown>) => emit('info', event, data),
  warn: (event: string, data?: Record<string, unknown>) => emit('warn', event, data),
  error: (event: string, data?: Record<string, unknown>) => emit('error', event, data),
};
