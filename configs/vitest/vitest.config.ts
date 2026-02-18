import path from 'path';
import { fileURLToPath } from 'url';
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vitest/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../..');

export default defineConfig({
  root: repoRoot,
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(repoRoot, 'src/renderer')
    }
  },
  test: {
    globals: true,
    include: ['tests/renderer/**/*.test.ts', 'tests/electron/**/*.test.ts'],
    environment: 'jsdom',
    environmentMatchGlobs: [['tests/electron/**/*.test.ts', 'node']],
    setupFiles: ['tests/renderer/setup.ts', 'tests/renderer/setup.component.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/renderer/**/*.{ts,vue}', 'src/electron/main/**/*.js'],
      exclude: ['src/renderer/main.ts', 'src/renderer/env.d.ts', '**/*.d.ts']
    }
  }
});
