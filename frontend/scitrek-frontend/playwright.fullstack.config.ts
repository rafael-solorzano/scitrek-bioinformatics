import { defineConfig, devices } from '@playwright/test';

const browserChannel = process.env.PW_BROWSER_CHANNEL || undefined;

export default defineConfig({
  testDir: './e2e-fullstack',
  timeout: 45_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list'], ['html', { outputFolder: 'playwright-report/fullstack', open: 'never' }]],
  use: {
    baseURL: process.env.E2E_FRONTEND_URL || 'http://127.0.0.1:3101',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  webServer: process.env.E2E_EXTERNAL_FRONTEND
    ? undefined
    : {
        command:
          'VITE_API_PROXY_TARGET=http://127.0.0.1:8011 npm run dev -- --host 127.0.0.1 --port 3101',
        url: 'http://127.0.0.1:3101',
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
  projects: [
    {
      name: 'fullstack-chromium',
      use: { ...devices['Desktop Chrome'], channel: browserChannel },
    },
  ],
});
