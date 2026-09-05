import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env['E2E_PORT'] ?? 3111);
const BASE_URL = `http://127.0.0.1:${PORT}`;

/**
 * The e2e suite runs against the real production build: the Node server serves
 * the built SPA on one port, exactly like the Docker image does.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 120_000,
  expect: { timeout: 15_000 },
  reporter: process.env['CI'] ? [['list'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    ...(process.env['PLAYWRIGHT_CHROMIUM_PATH']
      ? { launchOptions: { executablePath: process.env['PLAYWRIGHT_CHROMIUM_PATH'] } }
      : {}),
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'npm run build && node packages/server/dist/index.js',
    url: `${BASE_URL}/api/health`,
    reuseExistingServer: !process.env['CI'],
    // sonst verwirft Playwright die Serverausgabe und man debuggt blind
    stdout: 'pipe',
    stderr: 'pipe',
    timeout: 180_000,
    env: {
      PORT: String(PORT),
      NODE_ENV: 'production',
      DATABASE_FILE: './data/e2e.sqlite',
      PUBLIC_BASE_URL: BASE_URL,
      // the suite runs the login-protected configuration, because that is what
      // an installation reachable from outside the building will actually run
      HOST_PASSWORD: 'e2e-spielleitung',
      // the suite opens one session per test, far faster than a human ever would
      SESSION_RATE_LIMIT: '120',
      LOG_LEVEL: 'warn',
    },
  },
});
