import { generateWritingAssistantResponse, type NovelState } from '@/services/geminiService';
import { NodeType, type AppConfig } from '@/types';
import { describe, expect, it, vi } from 'vitest';

const appConfig: AppConfig = {
  isReady: true,
  port: 9001,
  token: 'backend-token'
};

const asJson = (payload: unknown, status = 200) => {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
};

const baseState: NovelState = {
  projectMode: 'SHORT',
  novelPath: 'D:/novel',
  selectedId: 'chap-1',
  nodeMap: {
    'story-root': {
      id: 'story-root',
      type: NodeType.ROOT,
      title: 'Root',
      content: 'outline content',
      summary: 'outline summary',
      parentId: null,
      children: ['chap-1']
    },
    'chap-1': {
      id: 'chap-1',
      type: NodeType.CHAPTER,
      title: 'Chapter 1',
      content: 'chapter content',
      summary: 'chapter summary',
      parentId: 'story-root',
      children: []
    }
  }
};

describe('geminiService.generateWritingAssistantResponse', () => {
  it('uses short endpoint and injects active task', async () => {
    const fetchMock = vi.fn().mockResolvedValue(asJson({ text: 'ok' }));
    vi.stubGlobal('fetch', fetchMock);

    const response = await generateWritingAssistantResponse(
      [{ role: 'user', parts: [{ text: 'hello' }] }],
      'next',
      {
        ...baseState,
        activeTask: {
          id: 'task-1',
          type: 'SYNOPSIS',
          nodeId: 'chap-1',
          field: 'summary',
          status: 'PENDING',
          contextData: 'ctx'
        }
      },
      {
        provider: 'google',
        model: 'gemini-3-flash-preview',
        temperature: 0.8,
        appConfig
      }
    );

    expect(response).toBe('ok');
    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('http://127.0.0.1:9001/api/chat/short');
    expect((options.headers as Record<string, string>).Authorization).toBe('backend-token');

    const body = JSON.parse(String(options.body));
    expect(body.state.active_task).toEqual({
      type: 'SYNOPSIS',
      node_id: 'chap-1',
      field: 'summary',
      context_data: 'ctx'
    });
  });

  it('uses long endpoint for long mode', async () => {
    const fetchMock = vi.fn().mockResolvedValue(asJson({ text: 'long-ok' }));
    vi.stubGlobal('fetch', fetchMock);

    await generateWritingAssistantResponse(
      [],
      'next',
      {
        ...baseState,
        projectMode: 'LONG',
        activeTask: null
      },
      {
        provider: 'deepseek',
        model: 'deepseek-chat',
        temperature: 0.4,
        appConfig
      }
    );

    const [url] = fetchMock.mock.calls[0] as [string];
    expect(url).toBe('http://127.0.0.1:9001/api/chat/long');
  });

  it('surfaces backend errors from payload text', async () => {
    const fetchMock = vi.fn().mockResolvedValue(asJson({ text: 'backend exploded' }, 500));
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      generateWritingAssistantResponse([], 'next', baseState, {
        provider: 'google',
        model: 'gemini-3-flash-preview',
        temperature: 0.5,
        appConfig
      })
    ).rejects.toThrow('backend exploded');
  });
});
