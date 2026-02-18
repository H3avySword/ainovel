import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    include: ['electron/**/*.electron.test.ts'],
    environment: 'node',
    setupFiles: ['./electron/tests/setup.ts'],
    fileParallelism: false
  }
});
