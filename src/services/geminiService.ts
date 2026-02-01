
import { NodeMap, ProjectMode, NodeType, AppConfig, WritingTask } from '../types';

export interface NovelState {
  projectMode: ProjectMode;
  novelPath: string;
  nodeMap: NodeMap;
  selectedId: string;
  activeTask?: WritingTask | null;
}

export interface AssistantConfig {
  model: string;
  temperature: number;
  appConfig: AppConfig;
}

export const generateWritingAssistantResponse = async (
  history: { role: string; parts: { text: string }[] }[],
  currentMessage: string,
  state: NovelState,
  config: AssistantConfig
): Promise<string> => {
  try {
    const { port, token } = config.appConfig;
    const baseUrl = `http://127.0.0.1:${port}`;
    let endpoint = `${baseUrl}/api/chat`;

    let body: any = {
      history,
      message: currentMessage,
      config: {
        model: config.model,
        temperature: config.temperature
      }
    };

    if (state.projectMode === 'SHORT') {
      endpoint = `${baseUrl}/api/chat/short`;

      // Find Root Node (Total Outline)
      const rootNode = Object.values(state.nodeMap).find(n => n.type === NodeType.ROOT);
      const currentNode = state.nodeMap[state.selectedId];

      body.state = {
        novel_path: state.novelPath,
        current_node: {
          id: currentNode?.id || 'unknown',
          type: currentNode?.type || NodeType.CHAPTER,
          title: currentNode?.title || 'Unknown',
          summary: currentNode?.summary || '',
          content: currentNode?.content || ''
        },
        novel_outline: rootNode?.content || rootNode?.summary || ''
      };
    } else {
      endpoint = `${baseUrl}/api/chat/long`;
      // Placeholder for Long Novel State
      body.state = {
        projectMode: 'LONG',
        selectedId: state.selectedId,
        novel_path: state.novelPath
      };
    }

    // Inject Active Task if present
    if (state.activeTask) {
      if (!body.state) body.state = {};
      body.state.active_task = {
        type: state.activeTask.type,
        node_id: state.activeTask.nodeId,
        field: state.activeTask.field,
        context_data: state.activeTask.contextData
      };
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.text || `Backend request failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data.text;
  } catch (error) {
    console.error("API Call Error:", error);
    throw error;
  }
};
