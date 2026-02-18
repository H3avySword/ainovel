import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from '@playwright/test';

const isCI = !!process.env.CI;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../..');

export default defineConfig({
  testDir: path.join(repoRoot, 'tests/e2e'),
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
      testDir: path.join(repoRoot, 'tests/e2e/ui'),
      use: {
        baseURL: 'http://127.0.0.1:4173'
      }
    },
    {
      name: 'electron-e2e',
      testDir: path.join(repoRoot, 'tests/e2e/system')
    }
  ]
});
