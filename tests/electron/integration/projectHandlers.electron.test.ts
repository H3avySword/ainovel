import fs from 'fs/promises';
import os from 'os';
import path from 'path';

import { describe, expect, it } from 'vitest';

import FileManager from '../../../src/electron/main/FileManager.js';
import { registerProjectHandlers } from '../../../src/electron/main/ipc/projectHandlers.js';

type Handler = (event: unknown, payload: any) => Promise<any>;

const makeInitialNodes = () => ({
  'story-root': {
    id: 'story-root',
    type: 'ROOT',
    title: 'Story Root',
    content: '',
    summary: '',
    parentId: null,
    children: ['chap-1'],
    expanded: true
  },
  'chap-1': {
    id: 'chap-1',
    type: 'CHAPTER',
    title: 'Chapter 1',
    content: '',
    summary: '',
    parentId: 'story-root',
    children: []
  }
});

const setupHandlers = () => {
  const handlers = new Map<string, Handler>();
  const ipcMain = {
    handle: (channel: string, handler: Handler) => {
      handlers.set(channel, handler);
    }
  };

  registerProjectHandlers(ipcMain as any, {
    getBackendPort: () => 9000,
    getBackendToken: () => 'test-token',
    emitProjectState: () => {}
  });

  return handlers;
};

describe('project IPC handlers', () => {
  it('returns VALIDATION_ERROR for missing payload fields', async () => {
    const handlers = setupHandlers();
    const handler = handlers.get('project:get-state');
    const result = await handler?.({}, {});

    expect(result.success).toBe(false);
    expect(result.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns success/data on valid get-state request', async () => {
    const handlers = setupHandlers();
    const projectPath = await fs.mkdtemp(path.join(os.tmpdir(), 'localapp-ipc-'));
    await FileManager.createProject(projectPath, makeInitialNodes() as any, 'SHORT');

    const handler = handlers.get('project:get-state');
    const result = await handler?.({}, { projectPath });

    expect(result.success).toBe(true);
    expect(result.data).toBeTruthy();
    expect(result.data.revision).toBe(1);
  });

  it('keeps error envelope shape for split validation failures', async () => {
    const handlers = setupHandlers();
    const handler = handlers.get('project:split-short-preview');
    const result = await handler?.({}, { projectPath: 'x', sourceNodeId: 'n1', chapterCount: 1, targetNodeType: 'CHAPTER' });

    expect(result.success).toBe(false);
    expect(result.error.code).toBe('VALIDATION_ERROR');
    expect(typeof result.error.message).toBe('string');
  });
});
