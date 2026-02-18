import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import App from '@/App.vue';

const flushAll = async () => {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
};

describe('App', () => {
  beforeEach(() => {
    let stateChangedCallback: ((payload: any) => void) | null = null;

    (window as any).electronAPI = {
      getAppConfig: vi.fn().mockResolvedValue({
        isReady: true,
        port: 8000,
        token: 'app-token'
      }),
      onBackendReady: vi.fn().mockImplementation(() => () => {}),
      onProjectStateChanged: vi.fn().mockImplementation((cb: (payload: any) => void) => {
        stateChangedCallback = cb;
        (window as any).__stateChangedCallback = cb;
        return () => {
          stateChangedCallback = null;
        };
      }),
      getLastProject: vi.fn().mockResolvedValue(null),
      selectDirectory: vi.fn().mockResolvedValue(null),
      createProject: vi.fn().mockResolvedValue({ success: true }),
      project: {
        getState: vi.fn().mockResolvedValue({ success: true, data: null }),
        selectNode: vi.fn().mockResolvedValue({ success: true, data: {} }),
        loadNodeField: vi.fn().mockResolvedValue({ success: true, data: { value: '' } }),
        updateNode: vi.fn().mockResolvedValue({ success: true, data: { node: {}, revision: 1 } }),
        save: vi.fn().mockResolvedValue({ success: true, data: { revision: 1 } }),
        addNode: vi.fn().mockResolvedValue({ success: true, data: {} }),
        renameNode: vi.fn().mockResolvedValue({ success: true, data: { revision: 1 } }),
        deleteNode: vi.fn().mockResolvedValue({ success: true, data: {} }),
        splitShortPreview: vi.fn().mockResolvedValue({ success: true, chapters: [] }),
        applyShortSplit: vi.fn().mockResolvedValue({ success: true, data: {} })
      }
    };
  });

  it('loads app config and renders main layout', async () => {
    const wrapper = mount(App, {
      global: {
        stubs: {
          TitleBar: true,
          TreeSidebar: true,
          AIChatPanel: true,
          NoticeStack: true,
          Editor: {
            props: ['node'],
            template: '<div data-testid="editor-stub">editor-node:{{ node?.id }}</div>'
          }
        }
      }
    });

    await flushAll();

    expect(wrapper.find('[data-testid="right-sidebar"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="editor-stub"]').text()).toContain('story-root');
  });

  it('applies project state pushed from main process event', async () => {
    const wrapper = mount(App, {
      global: {
        stubs: {
          TitleBar: true,
          TreeSidebar: true,
          AIChatPanel: true,
          NoticeStack: true,
          Editor: {
            props: ['node'],
            template: '<div data-testid="editor-stub">editor-node:{{ node?.id }}</div>'
          }
        }
      }
    });

    await flushAll();

    const callback = (window as any).__stateChangedCallback as (payload: any) => void;
    callback({
      projectPath: 'Documents/NebulaWrite/untitled.json',
      data: {
        lastOpenedId: 'chap-1',
        revision: 5,
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
            content: '',
            summary: 'summary',
            parentId: 'story-root',
            children: []
          }
        }
      }
    });

    await flushAll();

    expect(wrapper.find('[data-testid="editor-stub"]').text()).toContain('chap-1');
  });

  it('registers backend-ready listener before initial config fetch', async () => {
    let backendReadyCallback: (() => void) | null = null;
    const electronAPI = (window as any).electronAPI;
    electronAPI.getAppConfig = vi
      .fn()
      .mockResolvedValueOnce({ isReady: false, port: 8000, token: 'app-token' })
      .mockResolvedValue({ isReady: true, port: 8000, token: 'app-token' });
    electronAPI.onBackendReady = vi.fn().mockImplementation((cb: () => void) => {
      backendReadyCallback = cb;
      return () => {
        backendReadyCallback = null;
      };
    });

    const wrapper = mount(App, {
      global: {
        stubs: {
          TitleBar: true,
          TreeSidebar: true,
          AIChatPanel: true,
          NoticeStack: true,
          Editor: {
            props: ['node'],
            template: '<div data-testid="editor-stub">editor-node:{{ node?.id }}</div>'
          }
        }
      }
    });

    await flushAll();

    const listenerCallOrder = electronAPI.onBackendReady.mock.invocationCallOrder[0];
    const firstConfigCallOrder = electronAPI.getAppConfig.mock.invocationCallOrder[0];
    expect(listenerCallOrder).toBeLessThan(firstConfigCallOrder);
    expect(wrapper.find('[data-testid="right-sidebar"]').exists()).toBe(true);

    backendReadyCallback?.();
    await flushAll();

    expect(electronAPI.getAppConfig).toHaveBeenCalledTimes(2);
  });
});
