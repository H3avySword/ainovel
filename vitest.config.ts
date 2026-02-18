import path from 'path';
import { fileURLToPath } from 'url';
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vitest/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  test: {
    globals: true,
    include: ['src/**/*.test.ts', 'electron/**/*.test.ts'],
    environment: 'jsdom',
    environmentMatchGlobs: [['electron/**/*.test.ts', 'node']],
    setupFiles: ['./src/test/setup.ts', './src/test/setup.component.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/**/*.{ts,vue}', 'electron/**/*.js'],
      exclude: ['src/main.ts', 'src/env.d.ts', '**/*.d.ts']
    }
  }
});
