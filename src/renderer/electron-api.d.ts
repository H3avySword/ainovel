import type { AppConfig, NodeMap, ProjectMode } from './types';

export interface ElectronProjectApi {
  getState: (payload: unknown) => Promise<unknown>;
  selectNode: (payload: unknown) => Promise<unknown>;
  loadNodeField: (payload: unknown) => Promise<unknown>;
  updateNode: (payload: unknown) => Promise<unknown>;
  save: (payload: unknown) => Promise<unknown>;
  addNode: (payload: unknown) => Promise<unknown>;
  renameNode: (payload: unknown) => Promise<unknown>;
  deleteNode: (payload: unknown) => Promise<unknown>;
  splitShortPreview: (payload: unknown) => Promise<unknown>;
  applyShortSplit: (payload: unknown) => Promise<unknown>;
}

export interface ElectronAPI {
  minimize: () => void;
  maximize: () => void;
  close: () => void;
  clipboard: {
    readText: () => Promise<string>;
    writeText: (text: string) => Promise<{ ok: true }>;
  };
  selectDirectory: () => Promise<string | null>;
  getLastProject: () => Promise<string | null>;
  createProject: (dirPath: string, nodes: NodeMap, mode: ProjectMode) => Promise<{ success: boolean; error?: string }>;
  project: ElectronProjectApi;
  getAppConfig: () => Promise<AppConfig>;
  providerCache: {
    get: (providerKey: string) => Promise<unknown>;
    set: (providerKey: string, payload: unknown) => Promise<{ ok: true }>;
    clear: (providerKey: string) => Promise<{ ok: true }>;
  };
  providerSelection: {
    get: () => Promise<string | null>;
    set: (providerKey: string) => Promise<{ ok: true }>;
  };
  onBackendReady: (callback: (...args: unknown[]) => void) => () => void;
  onProjectStateChanged: (callback: (payload: unknown) => void) => () => void;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export {};
