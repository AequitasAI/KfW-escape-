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
    timeout: 180_000,
    env: {
      PORT: String(PORT),
      NODE_ENV: 'production',
      DATABASE_FILE: './data/e2e.sqlite',
      PUBLIC_BASE_URL: BASE_URL,
      LOG_LEVEL: 'warn',
    },
  },
});
