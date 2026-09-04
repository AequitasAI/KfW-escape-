import path from 'node:path';

function bool(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  return value === '1' || value.toLowerCase() === 'true';
}

const rawOrigins = (process.env['CORS_ORIGINS'] ?? '')
  .split(',')
  .map((entry) => entry.trim())
  .filter(Boolean);

export const config = {
  port: Number(process.env['PORT'] ?? 3001),
  nodeEnv: process.env['NODE_ENV'] ?? 'development',
  isProduction: (process.env['NODE_ENV'] ?? 'development') === 'production',
  databaseFile: path.resolve(process.env['DATABASE_FILE'] ?? './data/kfw-escape.sqlite'),
  publicBaseUrl: (process.env['PUBLIC_BASE_URL'] ?? '').replace(/\/+$/, ''),
  cookieSecure: bool(process.env['COOKIE_SECURE'], false),
  /**
   * Password for the game master login. Empty means no login: the host secret
   * then stays bound to the browser that created the session.
   */
  hostPassword: process.env['HOST_PASSWORD'] ?? '',
  corsOrigins: rawOrigins,
  logLevel: (process.env['LOG_LEVEL'] ?? 'info') as 'debug' | 'info' | 'warn' | 'error',
  /** absolute path of the built SPA, served in production */
  webDist: path.resolve(process.env['WEB_DIST'] ?? './packages/web/dist'),
} as const;
