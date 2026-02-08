import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(() => {
  return {
    base: './', // Important for Electron to find assets
    server: {
      port: 5173, // Standard vite port
      strictPort: true,
    },
    plugins: [vue()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      }
    }
  };
});
