import { mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import AIChatPanel from '@/components/AIChatPanel.vue';
import { NodeType, type NodeMap } from '@/types';
import type { ProviderId } from '@/services/providerConnectionService';
import * as providerService from '@/services/providerConnectionService';

vi.mock('@/services/geminiService', () => ({
  generateWritingAssistantResponse: vi.fn().mockResolvedValue('mocked response')
}));

vi.mock('@/services/providerConnectionService', async () => {
  const actual = await vi.importActual<typeof import('@/services/providerConnectionService')>('@/services/providerConnectionService');
  return {
    ...actual,
    connectProvider: vi.fn(),
    getAllProviderStatuses: vi.fn(),
    getProviderModels: vi.fn(),
    getProviderStatus: vi.fn(),
    testProvider: vi.fn(),
    updateProviderConfig: vi.fn()
  };
});

const mockedProviderService = vi.mocked(providerService);

const nodes: NodeMap = {
  'story-root': {
    id: 'story-root',
    type: NodeType.ROOT,
    title: 'Story Root',
    content: '',
    summary: '',
    parentId: null,
    children: ['chap-1']
  },
  'chap-1': {
    id: 'chap-1',
    type: NodeType.CHAPTER,
    title: 'Chapter 1',
    content: '',
    summary: '',
    parentId: 'story-root',
    children: []
  }
};

const flushAll = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

const mountPanel = () => {
  return mount(AIChatPanel, {
    props: {
      nodes,
      selectedId: 'chap-1',
      projectMode: 'SHORT',
      filePath: 'D:/demo',
      appConfig: {
        isReady: true,
        port: 8123,
        token: 'token-123'
      },
      activeTask: null
    },
    global: {
      stubs: {
        CustomSelect: {
          props: ['modelValue', 'options'],
          emits: ['update:model-value'],
          template: `
            <select
              data-testid="custom-select"
              :value="modelValue"
              @change="$emit('update:model-value', $event.target.value)"
            >
              <option v-for="option in options" :key="option" :value="option">{{ option }}</option>
            </select>
          `
        },
        NoticeStack: {
          props: ['items'],
          template: '<div data-testid="notice-stack"><div v-for="i in items" :key="i.id">{{ i.title }}</div></div>'
        },
        TextareaContextMenu: true
      }
    }
  });
};

describe('AIChatPanel', () => {
  beforeEach(() => {
    (window as any).electronAPI = {
      providerCache: {
        get: vi.fn().mockResolvedValue(null),
        set: vi.fn().mockResolvedValue({ ok: true }),
        clear: vi.fn().mockResolvedValue({ ok: true })
      },
      providerSelection: {
        get: vi.fn().mockResolvedValue('google' satisfies ProviderId),
        set: vi.fn().mockResolvedValue({ ok: true })
      }
    };

    mockedProviderService.getAllProviderStatuses.mockResolvedValue({
      providers: {
        google: { configured: true, masked: '****', state: 'connected', models: ['gemini-3-flash-preview'], selected_model: 'gemini-3-flash-preview' }
      }
    } as any);
    mockedProviderService.getProviderStatus.mockResolvedValue({
      provider: 'google',
      ok: true,
      state: 'connected',
      message: 'Connected',
      configured: true,
      masked: '****',
      models: ['gemini-3-flash-preview'],
      selected_model: 'gemini-3-flash-preview'
    } as any);
    mockedProviderService.getProviderModels.mockResolvedValue({
      provider: 'google',
      ok: true,
      models: ['gemini-3-flash-preview']
    });
    mockedProviderService.connectProvider.mockResolvedValue({
      provider: 'google',
      ok: true,
      state: 'connected',
      message: 'Connect success.',
      configured: true,
      masked: '****',
      models: ['gemini-3-flash-preview'],
      selected_model: 'gemini-3-flash-preview'
    } as any);
    mockedProviderService.testProvider.mockResolvedValue({
      provider: 'google',
      ok: true,
      message: 'Test success.'
    });
  });

  afterEach(() => {
    delete (window as any).electronAPI;
  });

  it('emits config-change on init', async () => {
    const wrapper = mountPanel();
    await flushAll();

    const events = wrapper.emitted('config-change');
    expect(events).toBeTruthy();
    expect(events?.[0]?.[0]).toMatchObject({ provider: 'google' });
  });

  it('calls connectProvider when clicking Connect', async () => {
    const wrapper = mountPanel();
    await flushAll();

    const connectButton = wrapper.findAll('button').find((button) => button.text().includes('Connect'));
    expect(connectButton).toBeTruthy();
    await connectButton!.trigger('click');
    await flushAll();

    expect(mockedProviderService.connectProvider).toHaveBeenCalled();
    const args = mockedProviderService.connectProvider.mock.calls.at(-1);
    expect(args?.[1]).toBe('google');
    expect(args?.[2]).toMatchObject({ verify: true });
  });

  it('calls testProvider when clicking Test Message', async () => {
    const wrapper = mountPanel();
    await flushAll();

    const testButton = wrapper.findAll('button').find((button) => button.text().includes('Test Message'));
    expect(testButton).toBeTruthy();
    await testButton!.trigger('click');
    await flushAll();

    expect(mockedProviderService.testProvider).toHaveBeenCalled();
    const args = mockedProviderService.testProvider.mock.calls.at(-1);
    expect(args?.[1]).toBe('google');
  });
});
