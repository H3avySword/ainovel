export enum NodeType {
  ROOT = "ROOT",
  VOLUME = "VOLUME",
  SECTION = "SECTION",
  CHAPTER = "CHAPTER",
  SETTING_ROOT = "SETTING_ROOT",
  SETTING_FOLDER = "SETTING_FOLDER",
  SETTING_ITEM = "SETTING_ITEM"
}

export type ProjectMode = 'LONG' | 'SHORT';

export interface NodeData {
  id: string;
  type: NodeType;
  title: string;
  content: string;
  summary: string;
  parentId: string | null;
  children: string[];
  expanded?: boolean;
  wordCount?: number;
}

export interface NodeMap {
  [key: string]: NodeData;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  isError?: boolean;
}

export interface AppConfig {
  port: number;
  token: string;
  isReady: boolean;
}

// AI Task Definitions
export type TaskType = 'SYNOPSIS' | 'CONTENT' | 'POLISH_SELECTION' | 'POLISH_CHAPTER' | 'SPLIT_CHAPTERS' | 'SPLIT_CHILDREN';

export interface SplitNodeItem {
  title: string;
  summary: string;
}

export interface WritingTask {
  id: string;
  type: TaskType;
  nodeId: string;
  field: 'summary' | 'content';
  contextData?: string; // For selection or additional context
  status: 'IDLE' | 'PENDING' | 'COMPLETED';
}
