import fs from 'fs/promises';
import os from 'os';
import path from 'path';

import { describe, expect, it } from 'vitest';

import FileManager from '../FileManager.js';
import ProjectService from './ProjectService.js';

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
    summary: 'summary',
    parentId: 'story-root',
    children: []
  }
});

describe('ProjectService', () => {
  it('throws REVISION_CONFLICT when expected revision mismatches', async () => {
    const projectPath = await fs.mkdtemp(path.join(os.tmpdir(), 'localapp-projectservice-'));
    await FileManager.createProject(projectPath, makeInitialNodes() as any, 'SHORT');

    await expect(
      ProjectService.updateNode({
        projectPath,
        nodeId: 'chap-1',
        field: 'content',
        value: 'new content',
        expectedRevision: 99
      })
    ).rejects.toMatchObject({ code: 'REVISION_CONFLICT' });
  });

  it('updates chapter content and bumps revision', async () => {
    const projectPath = await fs.mkdtemp(path.join(os.tmpdir(), 'localapp-projectservice-'));
    await FileManager.createProject(projectPath, makeInitialNodes() as any, 'SHORT');

    const result = await ProjectService.updateNode({
      projectPath,
      nodeId: 'chap-1',
      field: 'content',
      value: 'hello world',
      expectedRevision: 1
    });

    expect(result.node.wordCount).toBe(11);
    expect(result.revision).toBe(2);
  });
});
