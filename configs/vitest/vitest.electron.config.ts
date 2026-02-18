import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vitest/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../..');

export default defineConfig({
  root: repoRoot,
  test: {
    globals: true,
    include: ['tests/electron/**/*.electron.test.ts'],
    environment: 'node',
    setupFiles: ['tests/electron/setup.ts'],
    fileParallelism: false
  }
});
