import { defineConfig } from '@playwright/test';

const isCI = !!process.env.CI;

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: {
    timeout: 8_000
  },
  retries: isCI ? 1 : 0,
  reporter: [['list']],
  use: {
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure'
  },
  projects: [
    {
      name: 'web-e2e',
      testDir: './e2e/web',
      use: {
        baseURL: 'http://127.0.0.1:4173'
      }
    },
    {
      name: 'electron-e2e',
      testDir: './e2e/electron'
    }
  ]
});
