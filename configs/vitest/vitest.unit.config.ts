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
    include: ['tests/renderer/unit/**/*.unit.test.ts'],
    environment: 'jsdom',
    setupFiles: ['tests/renderer/setup.ts']
  }
});
