import { defineConfig, devices } from '@playwright/test';

const BASE_URL = process.env['BASE_URL'] ?? 'https://ragstack.ch';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,       // tests share state (DB, mock server) — run sequentially
  retries: process.env['CI'] ? 2 : 0,
  timeout: 30_000,
  expect: { timeout: 10_000 },
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],

  use: {
    baseURL: BASE_URL,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
