import path from 'path';
import { afterEach, vi } from 'vitest';

const tempRoot = path.join(process.cwd(), '.tmp-vitest-electron');

vi.mock('electron/main', () => ({
  default: {
    app: {
      getPath: (name: string) => path.join(tempRoot, name)
    }
  },
  app: {
    getPath: (name: string) => path.join(tempRoot, name)
  }
}));

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
