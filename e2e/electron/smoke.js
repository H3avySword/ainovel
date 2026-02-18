import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { spawn } from 'child_process';

import electronPath from 'electron';

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const spawnElectronForSmoke = async (env, label) => {
  const child = spawn(String(electronPath), ['.'], {
    cwd: process.cwd(),
    env,
    stdio: ['ignore', 'pipe', 'pipe']
  });
  let stderr = '';
  child.stderr.on('data', (chunk) => {
    stderr += chunk.toString();
  });

  await wait(2500);

  if (child.exitCode !== null) {
    throw new Error(`Electron exited too early during ${label} with code ${child.exitCode}. ${stderr}`);
  }

  child.kill('SIGTERM');
  await wait(600);
};

const main = async () => {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'localapp-electron-e2e-'));
  const appData = path.join(tempRoot, 'appdata');
  const projectPath = path.join(tempRoot, 'project');
  await fs.mkdir(projectPath, { recursive: true });

  const projectJsonPath = path.join(projectPath, 'project.json');
  await fs.writeFile(
    projectJsonPath,
    JSON.stringify(
      {
        projectMode: 'SHORT',
        lastOpenedId: 'chap-1',
        nodes: {
          'story-root': {
            id: 'story-root',
            type: 'ROOT',
            title: 'Story Root',
            content: '',
            summary: '',
            parentId: null,
            children: ['chap-1']
          },
          'chap-1': {
            id: 'chap-1',
            type: 'CHAPTER',
            title: 'Chapter 1',
            content: 'Initial content',
            summary: '',
            parentId: 'story-root',
            children: []
          }
        }
      },
      null,
      2
    ),
    'utf-8'
  );

  const env = {
    ...process.env,
    APPDATA: appData,
    LOCALAPPDATA: appData,
    LOCALAPP_E2E: '1',
    LOCALAPP_BACKEND_PORT: '8000',
    LOCALAPP_BACKEND_TOKEN: 'localapp-e2e-token'
  };
  delete env.ELECTRON_RUN_AS_NODE;

  await spawnElectronForSmoke(env, 'first launch');

  const projectData = JSON.parse(await fs.readFile(projectJsonPath, 'utf-8'));
  projectData.nodes['chap-1'].content = 'Edited and saved content';
  projectData.updatedAt = Date.now();
  await fs.writeFile(projectJsonPath, JSON.stringify(projectData, null, 2), 'utf-8');

  await spawnElectronForSmoke(env, 'second launch');

  const after = JSON.parse(await fs.readFile(projectJsonPath, 'utf-8'));
  if (after.nodes['chap-1'].content !== 'Edited and saved content') {
    throw new Error('Project content was not preserved across restart smoke run.');
  }

  console.log('Electron smoke e2e passed.');
};

main().catch((error) => {
  console.error('Electron smoke e2e failed:', error);
  process.exit(1);
});
