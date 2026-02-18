import fs from 'fs/promises';
import os from 'os';
import path from 'path';

import { describe, expect, it } from 'vitest';

import FileManager from './FileManager.js';

describe('FileManager', () => {
  it('serializes concurrent atomic writes for the same file', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'localapp-filemanager-'));
    const target = path.join(root, 'state.json');

    await Promise.all([
      FileManager.writeTextAtomic(target, 'A'),
      FileManager.writeTextAtomic(target, 'B'),
      FileManager.writeTextAtomic(target, 'C')
    ]);

    const content = await fs.readFile(target, 'utf-8');
    expect(['A', 'B', 'C']).toContain(content);
  });

  it('resolves stable paths for short and long chapter content', () => {
    const shortNodes = {
      'story-root': { id: 'story-root', type: 'ROOT', parentId: null },
      'chap-1': { id: 'chap-1', type: 'CHAPTER', parentId: 'story-root' }
    } as any;

    const longNodes = {
      'story-root': { id: 'story-root', type: 'ROOT', parentId: null },
      'vol-1': { id: 'vol-1', type: 'VOLUME', parentId: 'story-root' },
      'sec-1': { id: 'sec-1', type: 'SECTION', parentId: 'vol-1' },
      'chap-1': { id: 'chap-1', type: 'CHAPTER', parentId: 'sec-1' }
    } as any;

    const shortPath = FileManager.getPath('D:/project', shortNodes, 'SHORT', 'chap-1', 'content');
    const longPath = FileManager.getPath('D:/project', longNodes, 'LONG', 'chap-1', 'content');

    expect(shortPath).toContain(path.join('contents', 'chap-1.md'));
    expect(longPath).toContain(path.join('contents', 'vol-1', 'sec-1', 'chap-1.md'));
  });
});
