<template>
  <div data-testid="ai-chat-panel" class="h-full flex flex-col bg-white border-l border-indigo-100 shadow-xl shadow-indigo-100/50 w-full min-w-0 max-w-none relative">

    <!-- Header -->
    <div class="flex items-center justify-between px-4 py-4 border-b border-indigo-100 bg-indigo-50/30">
      <div class="flex items-center gap-2">
        <Sparkles :size="18" class="text-indigo-600" />
        <h2 class="text-sm font-bold text-slate-700 uppercase tracking-wider">AI 创作助手</h2>
      </div>
      <button
        ref="configToggleRef"
        @click="isConfigOpen = !isConfigOpen"
        class="p-1.5 rounded-lg transition-colors"
        :class="isConfigOpen ? 'bg-indigo-600 text-white' : 'hover:bg-indigo-100 text-indigo-400'"
        title="AI 配置"
        aria-label="Toggle AI settings"
      >
        <Settings :size="16" />
      </button>
    </div>

    <NoticeStack
      :items="notices"
      :dismiss="dismissNotice"
    />

    <!-- Config Menu Overlay -->
    <div
      ref="configMenuRef"
      @mousedown.stop
      @click.stop
      class="absolute top-[53px] left-0 right-0 bg-white border-b border-indigo-100 shadow-2xl z-30 transition-all duration-300 ease-in-out overflow-hidden"
      :class="isConfigOpen ? 'max-h-[80vh]' : 'max-h-0 border-none'"
    >
      <div class="p-5 space-y-4 max-h-[80vh] overflow-y-auto custom-scrollbar">

        <!-- Chat Completion Source -->
        <div class="space-y-1.5">
          <label class="text-[11px] font-bold text-slate-800 tracking-tight">Chat Completion Source</label>
          <CustomSelect
            :model-value="source"
            @update:model-value="val => source = val"
            :options="providerOptions.map(o => o.label)"
          />
        </div>

        <!-- API URL -->
        <div v-if="showApiUrlField" class="space-y-1.5">
            <div class="flex items-center gap-1">
              <label for="chat-api-url-input" class="text-[11px] font-bold text-slate-800 tracking-tight">API URL</label>
            </div>
            <input
              id="chat-api-url-input"
              type="text"
              placeholder="https://api.example.com/v1"
              v-model="apiUrl"
              class="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded text-xs text-slate-700 focus:outline-none focus:border-indigo-400 transition-all"
            />
        </div>

        <!-- API Key -->
        <div class="space-y-1.5">
            <label for="chat-api-key-input" class="text-[11px] font-bold text-slate-800 tracking-tight">API Key</label>
            <div class="relative w-full">
                <input
                  id="chat-api-key-input"
                  v-model="apiKeyInput"
                  type="password"
                  :placeholder="apiKeyConfigured ? `Current: ${apiKeyMasked}` : apiKeyPlaceholder"
                  class="w-full h-9 pl-3 pr-9 bg-slate-50 border border-slate-200 rounded text-xs text-slate-700 focus:outline-none focus:border-indigo-400 transition-all"
                />
                <button
                  @mousedown.stop
                  @click.stop="handleSaveApiKey"
                  :disabled="isSavingApiKey || !apiKeyInput.trim() || !isProviderSupported"
                  class="absolute right-1 top-1 bottom-1 w-7 rounded-md flex items-center justify-center transition-all disabled:opacity-50 disabled:cursor-not-allowed group hover:bg-slate-100 text-slate-400 hover:text-indigo-600"
                  :title="isSavingApiKey ? 'Saving...' : 'Save API Key'"
                  aria-label="Save API Key"
                >
                  <Loader2 v-if="isSavingApiKey" :size="14" class="text-indigo-500 animate-spin" />
                  <Save v-else :size="14" class="transition-colors" />
                </button>
            </div>
        </div>

        <!-- Models -->
        <div class="space-y-1.5">
            <label class="text-[11px] font-bold text-slate-800 tracking-tight">Models</label>
            <CustomSelect
                :model-value="aiModel"
                @update:model-value="val => aiModel = val"
                :options="modelOptions"
                :disabled="isLoadingModels || !isProviderSupported"
                :placeholder="isLoadingModels ? 'Loading models...' : (modelOptions.length === 0 ? 'No models available' : 'Select a model')"
            />
        </div>

        <!-- Footer Buttons -->
        <div class="flex gap-2 pt-2 pb-1">
            <button
              @click="handleConnect"
              :disabled="isConnecting || !isProviderSupported"
              class="group flex-1 h-8 rounded-lg bg-indigo-600 text-white text-[11px] font-bold tracking-wide shadow-sm shadow-indigo-200/60 hover:bg-indigo-700 hover:shadow-indigo-300/60 transition-all disabled:bg-slate-100 disabled:text-slate-400 disabled:shadow-none"
            >
              <Loader2 v-if="isConnecting" :size="12" class="animate-spin mx-auto" />
              <span v-else>Connect</span>
            </button>
            <button
              @click="handleTestConnection"
              :disabled="isTesting || !isProviderSupported"
              class="flex-1 h-8 rounded-lg border border-slate-200 bg-white text-slate-600 text-[11px] font-bold hover:bg-slate-50 hover:border-slate-300 transition-all flex items-center justify-center disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-200"
            >
              <Loader2 v-if="isTesting" :size="12" class="animate-spin" />
              <span v-else>Test Message</span>
            </button>
        </div>

        <!-- Status Line -->
        <div class="flex items-center gap-2 pt-1 border-t border-slate-100">
            <div
              class="w-2 h-2 rounded-full transition-all"
              :class="connectionStatusDotClass"
            ></div>
            <span class="text-[11px]" :class="connectionStatusTextClass">
              {{ connectionStatusText }}
            </span>
        </div>

      </div>
    </div>

    <!-- Chat Area -->
    <div class="flex-1 overflow-hidden relative flex flex-col">
      <!-- Task Banner -->
      <div v-if="activeTask" class="bg-indigo-50/80 backdrop-blur-sm px-4 py-2 border-b border-indigo-100 flex items-center justify-between absolute top-0 left-0 right-0 z-10">
        <div class="flex items-center gap-2 overflow-hidden">
            <span class="text-[10px] font-bold text-indigo-600 border border-indigo-200 bg-white px-1.5 py-0.5 rounded shadow-sm whitespace-nowrap">
                {{ getTaskLabel(activeTask.type) }}
            </span>
            <span class="text-xs text-indigo-900 truncate font-medium">
                正在对 [{{ activeTaskNodeTitle }}] {{ getTaskActionLabel(activeTask.type) }}...
            </span>
        </div>
        <button @click="$emit('cancel-task')" class="text-indigo-400 hover:text-indigo-700 transition-colors bg-white/50 rounded-full p-0.5">
            <X :size="14" />
        </button>
      </div>

      <div class="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/30 pt-12">
        <div
          v-for="msg in messages"
          :key="msg.id"
          class="flex"
          :class="msg.role === 'user' ? 'justify-end' : 'justify-start'"
        >
          <div
            :data-chat-message-id="msg.id"
            class="max-w-[85%] flex flex-col focus:outline-none"
            @mouseenter="handleMessageMouseEnter(msg.id)"
            @mouseleave="handleMessageMouseLeave(msg.id)"
            @pointerdown="handleMessagePointerDown(msg.id, $event)"
            @pointerup="handleMessagePointerUp($event)"
            @pointercancel="handleMessagePointerCancel($event)"
          >
            <div
            class="rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm"
            :class="msg.role === 'user'
              ? 'bg-indigo-600 text-white rounded-br-none'
              : msg.isError
                ? 'bg-red-50 text-red-600 border border-red-100 rounded-bl-none'
                : 'bg-white text-slate-700 border border-indigo-50 rounded-bl-none'"
          >
            <div v-if="msg.role === 'model' && !msg.isError" class="flex items-center gap-2 mb-1 text-xs font-bold text-indigo-400 uppercase tracking-wider">
              <Bot :size="12" /> AI 灵感 ({{ aiModel.includes('flash') ? 'Flash' : 'Pro' }})
            </div>

            <template v-if="isEditingMessage(msg.id)">
              <textarea
                v-model="editingDraft"
                rows="4"
                class="w-full rounded-xl border border-indigo-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-100 resize-y min-h-[88px]"
                @keydown.esc.prevent="cancelEditMessage"
                @keydown.ctrl.enter.prevent="saveEditedMessage"
              ></textarea>
              <div class="mt-2 flex items-center gap-1.5" :class="msg.role === 'user' ? 'justify-end' : 'justify-start'">
                <button
                  @click="saveEditedMessage"
                  :disabled="isLoading"
                  class="h-7 px-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  title="保存修改"
                  aria-label="保存修改"
                >
                  <Check :size="14" />
                </button>
                <button
                  @click="cancelEditMessage"
                  :disabled="isLoading"
                  class="h-7 px-2 rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  title="取消修改"
                  aria-label="取消修改"
                >
                  <X :size="14" />
                </button>
              </div>
            </template>

            <div v-else class="whitespace-pre-wrap">{{ msg.text }}</div>
            <div
              v-if="msg.role === 'user' && isQueuedMessage(msg.id)"
              class="mt-2 text-[10px] font-semibold text-white/75"
            >
              待发送
            </div>
          </div>

            <div
              v-if="shouldRenderToolbar(msg.id)"
              class="mt-0.5 inline-flex items-center gap-px bg-slate-50/30"
              :class="msg.role === 'user' ? 'self-end' : 'self-start'"
            >
            <button
              @click="handleDeleteMessage(msg.id)"
              :disabled="isLoading"
              class="h-7 w-7 shrink-0 rounded-md text-slate-500 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/70 focus-visible:ring-offset-1 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-rose-50 hover:text-rose-600 active:bg-rose-100 flex items-center justify-center"
              title="删除消息"
              aria-label="删除消息"
            >
              <Trash2 :size="14" />
            </button>
            <button
              @click="startEditMessage(msg.id)"
              :disabled="isLoading"
              class="h-7 w-7 shrink-0 rounded-md text-slate-500 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/70 focus-visible:ring-offset-1 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 hover:text-indigo-600 active:bg-indigo-50 flex items-center justify-center"
              title="修改消息"
              aria-label="修改消息"
            >
              <SquarePen :size="14" />
            </button>
            <button
              v-if="msg.role === 'user'"
              @click="regenerateFromMessage(msg.id)"
              :disabled="isLoading || hasQueuedMessages || isQueuedMessage(msg.id)"
              class="h-7 w-7 shrink-0 rounded-md bg-indigo-50 text-indigo-600 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/70 focus-visible:ring-offset-1 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-indigo-100 hover:text-indigo-700 active:bg-indigo-200 flex items-center justify-center"
              title="从此消息重新生成"
              aria-label="从此消息重新生成"
            >
              <Loader2
                v-if="isLoading && activeRegenerateMessageId === msg.id"
                :size="14"
                class="animate-spin"
              />
              <RotateCw v-else :size="14" />
            </button>
            </div>
          </div>
        </div>
        <div v-if="isLoading" class="flex justify-start">
            <div class="bg-white border border-indigo-50 rounded-2xl rounded-bl-none px-4 py-3 shadow-sm">
                <Loader2 :size="16" class="animate-spin text-indigo-500" />
            </div>
        </div>
        <div ref="messagesEndRef"></div>
      </div>

      <div class="p-4 bg-white border-t border-indigo-100">
        <div class="relative">
            <textarea
              ref="inputTextareaRef"
              data-testid="aichat-input-textarea"
              v-model="input"
              @keydown.enter.exact.prevent="handleSendMessage"
              @contextmenu="handleInputTextareaContextMenu"
              placeholder="输入您的想法或修改建议..."
              class="w-full pl-4 pr-20 py-3 rounded-xl bg-slate-50 border border-indigo-100 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 outline-none resize-none text-sm text-slate-700 max-h-32 shadow-inner"
              rows="2"
            ></textarea>
            
            <!-- Floating Apply Button -->
            <div v-if="showApplyOverlay" class="absolute left-0 right-0 bottom-full mb-2 flex justify-center px-4 pointer-events-none">
                 <button
                    @click="handleApplyLast"
                    class="pointer-events-auto shadow-xl shadow-indigo-100/50 bg-white border border-indigo-100 text-indigo-600 px-4 py-2 rounded-xl flex items-center gap-2 text-sm font-bold hover:bg-indigo-50 hover:border-indigo-200 hover:-translate-y-0.5 transition-all animate-in slide-in-from-bottom-2 fade-in duration-300"
                 >
                    <CheckCircle2 :size="16" class="text-indigo-500" />
                    <span>{{ getApplyLabel() }}</span>
                 </button>
            </div>

            <!-- Combined send/batch sliding toggle -->
            <div class="absolute right-1 bottom-1.5 inline-flex h-8 p-[3px] rounded-[10px] bg-slate-200/80 shadow-[inset_0_1px_3px_rgba(0,0,0,0.08)]">
              <div
                class="absolute top-[3px] bottom-[3px] w-[calc(50%-3px)] rounded-[7px] bg-indigo-600 shadow-md shadow-indigo-400/30 transition-[left] duration-300"
                :style="{ left: isBatchComposeMode ? '50%' : '3px', transitionTimingFunction: 'cubic-bezier(0.76,0.05,0.24,0.95)' }"
              ></div>
              <button
                @click="isBatchComposeMode ? toggleBatchComposeMode() : handleSendMessage()"
                :disabled="isBatchComposeMode ? isLoading : (isLoading || !input.trim())"
                class="relative z-10 w-8 h-full flex items-center justify-center rounded-[7px] transition-colors duration-300 disabled:opacity-40 disabled:cursor-not-allowed"
                :class="!isBatchComposeMode ? 'text-white' : 'text-slate-400 hover:text-slate-600'"
                :title="isBatchComposeMode ? '发送模式' : '发送消息'"
                :aria-label="isBatchComposeMode ? '发送模式' : '发送消息'"
              >
                <Send :size="14" />
              </button>
              <button
                @click="!isBatchComposeMode ? toggleBatchComposeMode() : handleSendMessage()"
                :disabled="!isBatchComposeMode ? isLoading : (isLoading || !input.trim())"
                class="relative z-10 w-8 h-full flex items-center justify-center rounded-[7px] transition-colors duration-300 disabled:opacity-40 disabled:cursor-not-allowed"
                :class="isBatchComposeMode ? 'text-white' : 'text-slate-400 hover:text-slate-600'"
                :title="!isBatchComposeMode ? '暂存模式' : '暂存消息'"
                :aria-label="!isBatchComposeMode ? '暂存模式' : '暂存消息'"
              >
                <Archive :size="14" />
                <span
                  v-if="queuedMessageIds.length > 0"
                  class="absolute -top-1 -right-1 min-w-[14px] h-[14px] px-0.5 rounded-full bg-amber-500 text-white text-[9px] leading-[14px] font-bold text-center shadow-sm"
                >
                  {{ queuedMessageIds.length }}
                </span>
              </button>
            </div>
        </div>
        <div class="text-[10px] text-center text-slate-400 mt-2 italic">
            已开启上下文智能感知
        </div>
      </div>
    </div>

    <TextareaContextMenu
      :isOpen="textareaMenuState.isOpen"
      :x="textareaMenuState.x"
      :y="textareaMenuState.y"
      :items="textareaMenuItems"
      @close="closeTextareaMenu"
      @select="handleTextareaMenuSelect"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, nextTick, computed } from 'vue';
import {
  Send, Sparkles, Loader2, Bot, Settings, Archive,
  X, ChevronDown, CheckCircle2, KeyRound, Save, Trash2, SquarePen, RotateCw, Check
} from 'lucide-vue-next';
import CustomSelect from './CustomSelect.vue';
import NoticeStack from './NoticeStack.vue';
import TextareaContextMenu from './TextareaContextMenu.vue';
import { ChatMessage, NodeMap, ProjectMode, AppConfig, WritingTask, TaskType } from '../types';
import { useNoticeQueue } from '../composables/noticeQueue';
import { useTextareaContextMenu } from '../composables/useTextareaContextMenu';
import { generateWritingAssistantResponse } from '../services/geminiService';
import {
    connectProvider,
    getAllProviderStatuses,
    getProviderModels,
    getProviderStatus,
    ProviderId,
    testProvider,
    updateProviderConfig,
} from '../services/providerConnectionService';

const props = defineProps<{
    nodes: NodeMap;
    selectedId: string;
    projectMode: ProjectMode;
    filePath: string;
    appConfig: AppConfig | null;
    activeTask: WritingTask | null;
}>();

const emit = defineEmits<{
    (e: 'apply-task', content: string): void;
    (e: 'cancel-task'): void;
    (e: 'config-change', payload: { provider: ProviderId; model: string }): void;
}>();

// Chat State
const messages = ref<ChatMessage[]>([
    {
        id: '1',
        role: 'model',
        text: '你好，我是你的 AI 创作助手。可以帮你构思剧情、润色文本和补全章节。',
    }
]);
const input = ref('');
const isLoading = ref(false);
const messagesEndRef = ref<HTMLDivElement | null>(null);
const inputTextareaRef = ref<HTMLTextAreaElement | null>(null);
const editingMessageId = ref<string | null>(null);
const editingDraft = ref('');
const activeRegenerateMessageId = ref<string | null>(null);
const isBatchComposeMode = ref(false);
const queuedMessageIds = ref<string[]>([]);
const activeTouchToolbarMessageId = ref<string | null>(null);
const hoveredToolbarMessageId = ref<string | null>(null);
const MESSAGE_LONG_PRESS_MS = 420;
let messageLongPressTimer: ReturnType<typeof setTimeout> | null = null;
const {
    menuState: textareaMenuState,
    menuItems: textareaMenuItems,
    openFromEvent: openTextareaMenuFromEvent,
    closeMenu: closeTextareaMenu,
    runAction: runTextareaMenuAction,
} = useTextareaContextMenu();

// Configuration State
type ProviderOption = {
    label: string;
    providerId: ProviderId;
    defaultApiUrl: string;
    apiKeyPlaceholder: string;
    fallbackModels: string[];
};

const providerOptions: ProviderOption[] = [
    {
        label: 'Google AI Studio',
        providerId: 'google',
        defaultApiUrl: '',
        apiKeyPlaceholder: 'Paste new Gemini API key',
        fallbackModels: [
            'gemini-3-pro-preview',
            'gemini-3-flash-preview',
            'gemini-2.5-flash-lite-latest',
        ],
    },
    {
        label: 'OpenAI Compatible',
        providerId: 'openai-compatible',
        defaultApiUrl: 'https://api.openai.com/v1',
        apiKeyPlaceholder: 'Paste API key',
        fallbackModels: ['gpt-4o-mini', 'gpt-4.1-mini'],
    },
    {
        label: 'DeepSeek',
        providerId: 'deepseek',
        defaultApiUrl: 'https://api.deepseek.com',
        apiKeyPlaceholder: 'Paste DeepSeek API key',
        fallbackModels: ['deepseek-chat', 'deepseek-reasoner'],
    },
];

const isConfigOpen = ref(false);
const source = ref(providerOptions[0].label);
const apiUrl = ref(providerOptions[0].defaultApiUrl);
const modelOptions = ref<string[]>([...providerOptions[0].fallbackModels]);
const aiModel = ref(providerOptions[0].fallbackModels[0]);
const isTesting = ref(false);
const apiKeyInput = ref('');
const apiKeyMasked = ref('');
const apiKeyConfigured = ref(false);
const isSavingApiKey = ref(false);
const isConnecting = ref(false);
const isLoadingModels = ref(false);
const connectionState = ref<'idle' | 'connecting' | 'connected' | 'error'>('idle');
const hasCheckedInitialProviderSetup = ref(false);
type ProviderCachePayload = {
    providerId: ProviderId;
    source: string;
    connectionState: 'connected' | 'idle' | 'error';
    models: string[];
    selectedModel: string;
    apiKeyMasked: string;
    apiBaseUrl: string;
    updatedAt: number;
};

type ProviderStatusLike = {
    configured: boolean;
    masked: string;
    state?: 'connected' | 'disconnected' | 'error';
    api_base_url?: string;
    models?: string[];
    selected_model?: string;
};

const {
    notices,
    openNotice,
    dismissNotice,
    clearNotices,
} = useNoticeQueue();
const providerStatusMemory = new Map<ProviderId, ProviderStatusLike>();

const configMenuRef = ref<HTMLDivElement | null>(null);
const configToggleRef = ref<HTMLButtonElement | null>(null);
const selectedProviderOption = computed(() => {
    return providerOptions.find((option) => option.label === source.value) || providerOptions[0];
});
const currentProviderId = computed<ProviderId>(() => selectedProviderOption.value.providerId);
const isProviderSupported = computed(() => !!selectedProviderOption.value);
const apiKeyPlaceholder = computed(() => selectedProviderOption.value.apiKeyPlaceholder);
const showApiUrlField = computed(() => currentProviderId.value === 'openai-compatible');

const findProviderOptionById = (providerId: ProviderId) => {
    return providerOptions.find((option) => option.providerId === providerId);
};

const emitConfigChange = () => {
    emit('config-change', {
        provider: currentProviderId.value,
        model: aiModel.value,
    });
};

const getProviderSelectionBridge = () => {
    const bridge = (window as any)?.electronAPI?.providerSelection;
    if (!bridge?.get || !bridge?.set) {
        return null;
    }
    return bridge;
};

const readPreferredProvider = async (): Promise<ProviderId | null> => {
    const bridge = getProviderSelectionBridge();
    if (!bridge) {
        return null;
    }

    try {
        const rawValue = await bridge.get();
        if (typeof rawValue !== 'string' || !rawValue.trim()) {
            return null;
        }
        const normalized = rawValue.trim().toLowerCase();
        if (normalized === 'google' || normalized === 'openai-compatible' || normalized === 'deepseek') {
            return normalized as ProviderId;
        }
        return null;
    } catch (error) {
        console.warn('Failed to read preferred provider:', error);
        return null;
    }
};

const persistPreferredProvider = async (providerId: ProviderId) => {
    const bridge = getProviderSelectionBridge();
    if (!bridge) {
        return;
    }

    try {
        await bridge.set(providerId);
    } catch (error) {
        console.warn('Failed to persist preferred provider:', error);
    }
};

const restorePreferredProvider = async () => {
    const preferredProvider = await readPreferredProvider();
    if (!preferredProvider) {
        return;
    }

    const option = findProviderOptionById(preferredProvider);
    if (!option) {
        return;
    }

    if (source.value !== option.label) {
        source.value = option.label;
    }
};

const getProviderCacheBridge = () => {
    const bridge = (window as any)?.electronAPI?.providerCache;
    if (!bridge?.get || !bridge?.set || !bridge?.clear) {
        return null;
    }
    return bridge;
};

const readProviderCache = async (providerId: ProviderId): Promise<ProviderCachePayload | null> => {
    const bridge = getProviderCacheBridge();
    if (!bridge) {
        return null;
    }

    try {
        const payload = await bridge.get(providerId);
        if (!payload || typeof payload !== 'object') {
            return null;
        }
        return payload as ProviderCachePayload;
    } catch (error) {
        console.warn('Failed to read provider cache:', error);
        return null;
    }
};

const writeProviderCache = async (providerId: ProviderId, payload: ProviderCachePayload) => {
    const bridge = getProviderCacheBridge();
    if (!bridge) {
        return;
    }

    try {
        await bridge.set(providerId, payload);
    } catch (error) {
        console.warn('Failed to write provider cache:', error);
    }
};

const clearProviderCache = async (providerId: ProviderId) => {
    const bridge = getProviderCacheBridge();
    if (!bridge) {
        return;
    }

    try {
        await bridge.clear(providerId);
    } catch (error) {
        console.warn('Failed to clear provider cache:', error);
    }
};

const applyProviderStatus = (status: {
    configured: boolean;
    masked: string;
    state?: 'connected' | 'disconnected' | 'error';
    models?: string[];
    selected_model?: string;
}) => {
    apiKeyConfigured.value = !!status.configured;
    apiKeyMasked.value = status.masked || '';
    if (status.state === 'connected') {
        connectionState.value = 'connected';
    } else if (status.state === 'error') {
        connectionState.value = 'error';
    } else {
        connectionState.value = 'idle';
    }

    if (Array.isArray(status.models) && status.models.length > 0) {
        applyModelOptions(status.models);
        if (status.selected_model && status.models.includes(status.selected_model)) {
            aiModel.value = status.selected_model;
        }
    }
};

const applyModelOptions = (models: string[]) => {
    const normalized = Array.from(new Set(
        (models || [])
            .map((item) => item.trim())
            .filter(Boolean)
    ));

    if (normalized.length === 0) {
        return;
    }

    modelOptions.value = normalized;
    if (!normalized.includes(aiModel.value)) {
        aiModel.value = normalized[0];
    }
};

const resetModelOptionsToFallback = () => {
    const fallback = selectedProviderOption.value.fallbackModels;
    modelOptions.value = [...fallback];
    aiModel.value = fallback[0] || '';
};

const persistConnectedProviderCache = async () => {
    if (!isProviderSupported.value || connectionState.value !== 'connected') {
        return;
    }

    const models = Array.from(new Set(
        modelOptions.value
            .map((item) => item.trim())
            .filter(Boolean)
    ));

    if (models.length === 0) {
        return;
    }

    await writeProviderCache(currentProviderId.value, {
        providerId: currentProviderId.value,
        source: source.value,
        connectionState: 'connected',
        models,
        selectedModel: aiModel.value,
        apiKeyMasked: apiKeyMasked.value || '',
        apiBaseUrl: apiUrl.value.trim(),
        updatedAt: Date.now(),
    });
};

const restoreProviderCache = async (): Promise<boolean> => {
    if (!isProviderSupported.value || !apiKeyConfigured.value) {
        return false;
    }

    const cache = await readProviderCache(currentProviderId.value);
    if (!cache) {
        return false;
    }

    if (
        cache.providerId !== currentProviderId.value ||
        cache.source !== source.value ||
        cache.connectionState !== 'connected' ||
        !Array.isArray(cache.models) ||
        cache.models.length === 0
    ) {
        return false;
    }

    if ((cache.apiKeyMasked || '') !== (apiKeyMasked.value || '')) {
        return false;
    }

    applyModelOptions(cache.models);
    if (cache.selectedModel && cache.models.includes(cache.selectedModel)) {
        aiModel.value = cache.selectedModel;
    }
    if (cache.apiBaseUrl) {
        apiUrl.value = cache.apiBaseUrl;
    }
    connectionState.value = 'connected';
    return true;
};

const applyProviderSnapshotFast = async (providerId: ProviderId): Promise<boolean> => {
    const memorized = providerStatusMemory.get(providerId);
    if (memorized) {
        applyProviderStatus(memorized);
        if (memorized.api_base_url) {
            apiUrl.value = memorized.api_base_url;
        } else {
            apiUrl.value = selectedProviderOption.value.defaultApiUrl;
        }
        return true;
    }

    const cache = await readProviderCache(providerId);
    if (!cache) {
        return false;
    }

    if (
        cache.providerId !== providerId ||
        cache.source !== source.value ||
        !Array.isArray(cache.models) ||
        cache.models.length === 0
    ) {
        return false;
    }

    applyModelOptions(cache.models);
    if (cache.selectedModel && cache.models.includes(cache.selectedModel)) {
        aiModel.value = cache.selectedModel;
    }

    if (cache.apiBaseUrl) {
        apiUrl.value = cache.apiBaseUrl;
    } else {
        apiUrl.value = selectedProviderOption.value.defaultApiUrl;
    }

    apiKeyMasked.value = cache.apiKeyMasked || '';
    apiKeyConfigured.value = !!cache.apiKeyMasked;
    connectionState.value = cache.connectionState === 'connected' ? 'connected' : 'idle';
    return true;
};

const refreshProviderModels = async (openErrorNotice = false) => {
    if (!isProviderSupported.value || isLoadingModels.value) {
        return;
    }

    try {
        isLoadingModels.value = true;
        const modelResult = await getProviderModels(props.appConfig, currentProviderId.value);
        applyModelOptions(modelResult.models || []);
    } catch (error) {
        console.error('Failed to refresh model list:', error);
        if (openErrorNotice) {
            const message = error instanceof Error ? error.message : 'Failed to fetch models';
            openNotice('error', 'Models failed', message);
        }
    } finally {
        isLoadingModels.value = false;
    }
};

const persistSelectedModel = async () => {
    if (!isProviderSupported.value || !aiModel.value.trim()) {
        return;
    }

    const models = modelOptions.value
        .map((item) => item.trim())
        .filter(Boolean);
    if (models.length === 0) {
        return;
    }

    try {
        await updateProviderConfig(props.appConfig, {
            provider: currentProviderId.value,
            models,
            selected_model: aiModel.value.trim(),
        });
    } catch (error) {
        console.warn('Failed to persist selected model:', error);
    }
};

const connectionStatusText = computed(() => {
    if (!isProviderSupported.value) {
        return 'Provider not supported yet';
    }
    switch (connectionState.value) {
        case 'connecting':
            return 'Connecting...';
        case 'connected':
            return 'Connected';
        case 'error':
            return 'Connect failed';
        default:
            return 'Disconnected';
    }
});

const connectionStatusDotClass = computed(() => {
    if (!isProviderSupported.value) {
        return 'bg-slate-300';
    }
    switch (connectionState.value) {
        case 'connecting':
            return 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)] animate-pulse';
        case 'connected':
            return 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.45)]';
        case 'error':
            return 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.35)]';
        default:
            return 'bg-slate-300';
    }
});

const connectionStatusTextClass = computed(() => {
    if (!isProviderSupported.value) {
        return 'text-slate-500';
    }
    switch (connectionState.value) {
        case 'connected':
            return 'text-emerald-700';
        case 'error':
            return 'text-rose-600';
        default:
            return 'text-slate-500';
    }
});

const scrollToBottom = () => {
    messagesEndRef.value?.scrollIntoView({ behavior: 'smooth' });
};

watch(messages, async () => {
    await nextTick();
    scrollToBottom();
}, { deep: true });

// Click Outside Logic
const handleClickOutside = (event: MouseEvent) => {
    const target = event.target as HTMLElement | null;
    if (target?.closest('.custom-select-dropdown')) {
        return;
    }

    if (
        isConfigOpen.value &&
        configMenuRef.value &&
        !configMenuRef.value.contains(event.target as Node) &&
        configToggleRef.value &&
        !configToggleRef.value.contains(event.target as Node)
    ) {
        isConfigOpen.value = false;
    }
};

const handleEscKey = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
        isConfigOpen.value = false;
    }
};

watch(isConfigOpen, (newVal) => {
    if (newVal) {
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEscKey);
    } else {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('keydown', handleEscKey);
    }
});

const handleInputTextareaContextMenu = (event: MouseEvent) => {
    const textarea = inputTextareaRef.value;
    if (!textarea) {
        return;
    }

    openTextareaMenuFromEvent(event, textarea, {
        showPolish: false,
        supportsPolish: false,
    });
};

const handleTextareaMenuSelect = async (actionId: string) => {
    await runTextareaMenuAction(actionId as 'cut' | 'copy' | 'paste' | 'select-all' | 'polish');
};

const createMessageId = () => `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;

const buildHistoryPayload = (historyMessages: ChatMessage[]) => {
    return historyMessages.map((item) => ({
        role: item.role,
        parts: [{ text: item.text }]
    }));
};

const hasQueuedMessages = computed(() => queuedMessageIds.value.length > 0);
const queuedMessageIdSet = computed(() => new Set(queuedMessageIds.value));

const isEditingMessage = (messageId: string) => editingMessageId.value === messageId;
const isQueuedMessage = (messageId: string) => queuedMessageIdSet.value.has(messageId);

const toggleBatchComposeMode = () => {
    if (isLoading.value) return;
    isBatchComposeMode.value = !isBatchComposeMode.value;
};

const clearQueuedMessages = () => {
    queuedMessageIds.value = [];
};

const enqueueUserMessage = (text: string) => {
    const queuedMessage: ChatMessage = {
        id: createMessageId(),
        role: 'user',
        text
    };
    messages.value.push(queuedMessage);
    queuedMessageIds.value.push(queuedMessage.id);
};

const collapseQueuedMessagesWithCurrentInput = (currentInputText: string): ChatMessage | null => {
    const queuedIdSet = new Set(queuedMessageIds.value);
    if (queuedIdSet.size === 0) {
        return null;
    }

    const queuedMessages = messages.value.filter((item) => queuedIdSet.has(item.id) && item.role === 'user');
    if (queuedMessages.length === 0) {
        clearQueuedMessages();
        return null;
    }

    const mergedParts = queuedMessages
        .map((item) => item.text.trim())
        .filter((item) => !!item);

    const currentText = currentInputText.trim();
    if (currentText) {
        mergedParts.push(currentText);
    }
    if (mergedParts.length === 0) {
        clearQueuedMessages();
        return null;
    }

    const mergedMessage: ChatMessage = {
        id: createMessageId(),
        role: 'user',
        text: mergedParts.join('\n')
    };

    const firstQueuedIndex = messages.value.findIndex((item) => queuedIdSet.has(item.id));
    const nextMessages = messages.value.filter((item) => !queuedIdSet.has(item.id));
    if (firstQueuedIndex >= 0) {
        nextMessages.splice(firstQueuedIndex, 0, mergedMessage);
    } else {
        nextMessages.push(mergedMessage);
    }
    messages.value = nextMessages;
    clearQueuedMessages();

    return mergedMessage;
};

const clearToolbarVisibilityState = () => {
    hoveredToolbarMessageId.value = null;
    activeTouchToolbarMessageId.value = null;
};

const cancelEditMessage = () => {
    editingMessageId.value = null;
    editingDraft.value = '';
    clearToolbarVisibilityState();
};

const clearMessageLongPressTimer = () => {
    if (messageLongPressTimer) {
        clearTimeout(messageLongPressTimer);
        messageLongPressTimer = null;
    }
};

const isTouchToolbarVisible = (messageId: string) => {
    return activeTouchToolbarMessageId.value === messageId;
};

const shouldRenderToolbar = (messageId: string) => {
    if (isEditingMessage(messageId)) {
        return false;
    }
    return (
        hoveredToolbarMessageId.value === messageId ||
        isTouchToolbarVisible(messageId)
    );
};

const handleMessageMouseEnter = (messageId: string) => {
    hoveredToolbarMessageId.value = messageId;
};

const handleMessageMouseLeave = (messageId: string) => {
    if (hoveredToolbarMessageId.value === messageId) {
        hoveredToolbarMessageId.value = null;
    }
};

const isTouchLikePointer = (event: PointerEvent) => {
    return event.pointerType === 'touch' || event.pointerType === 'pen';
};

const handleMessagePointerDown = (messageId: string, event: PointerEvent) => {
    if (!isTouchLikePointer(event) || isEditingMessage(messageId)) {
        return;
    }

    clearMessageLongPressTimer();
    messageLongPressTimer = setTimeout(() => {
        hoveredToolbarMessageId.value = null;
        activeTouchToolbarMessageId.value = messageId;
    }, MESSAGE_LONG_PRESS_MS);
};

const handleMessagePointerUp = (event: PointerEvent) => {
    if (!isTouchLikePointer(event)) {
        return;
    }

    clearMessageLongPressTimer();
};

const handleMessagePointerCancel = (event: PointerEvent) => {
    if (!isTouchLikePointer(event)) {
        return;
    }

    clearMessageLongPressTimer();
};

const handlePointerDownOutsideMessage = (event: PointerEvent) => {
    if (!activeTouchToolbarMessageId.value) {
        return;
    }

    const target = event.target as HTMLElement | null;
    const ownerMessageId = target?.closest<HTMLElement>('[data-chat-message-id]')?.dataset?.chatMessageId;
    if (ownerMessageId === activeTouchToolbarMessageId.value) {
        return;
    }

    clearToolbarVisibilityState();
};

const requestAssistantReply = async (currentUserText: string, historyMessages: ChatMessage[]) => {
    isLoading.value = true;

    try {
        const responseText = await generateWritingAssistantResponse(
            buildHistoryPayload(historyMessages),
            currentUserText,
            {
                projectMode: props.projectMode,
                novelPath: props.filePath,
                nodeMap: props.nodes,
                selectedId: props.selectedId,
                activeTask: props.activeTask
            },
            {
                provider: currentProviderId.value,
                model: aiModel.value,
                temperature: 0.8,
                appConfig: props.appConfig
            }
        );

        messages.value.push({
            id: createMessageId(),
            role: 'model',
            text: responseText
        });
    } catch (error) {
        messages.value.push({
            id: createMessageId(),
            role: 'model',
            text: '连接创作服务失败，请检查 API 配置后重试。',
            isError: true
        });
    } finally {
        isLoading.value = false;
    }
};

const handleSendMessage = async () => {
    if (!input.value.trim() || isLoading.value) return;
    void persistPreferredProvider(currentProviderId.value);
    clearToolbarVisibilityState();

    const currentText = input.value.trim();

    if (isBatchComposeMode.value) {
        enqueueUserMessage(currentText);
        input.value = '';
        return;
    }

    if (hasQueuedMessages.value) {
        const mergedUserMsg = collapseQueuedMessagesWithCurrentInput(currentText);
        input.value = '';
        if (!mergedUserMsg) {
            return;
        }
        await requestAssistantReply(mergedUserMsg.text, [...messages.value]);
        return;
    }

    const userMsg: ChatMessage = {
        id: createMessageId(),
        role: 'user',
        text: currentText
    };
    messages.value.push(userMsg);
    input.value = '';
    await requestAssistantReply(userMsg.text, [...messages.value]);
};

const handleDeleteMessage = (messageId: string) => {
    if (isLoading.value) return;
    clearToolbarVisibilityState();
    messages.value = messages.value.filter((item) => item.id !== messageId);
    queuedMessageIds.value = queuedMessageIds.value.filter((item) => item !== messageId);
    if (editingMessageId.value === messageId) {
        cancelEditMessage();
    }
    if (activeRegenerateMessageId.value === messageId) {
        activeRegenerateMessageId.value = null;
    }
};

const startEditMessage = (messageId: string) => {
    if (isLoading.value) return;
    clearToolbarVisibilityState();
    const target = messages.value.find((item) => item.id === messageId);
    if (!target) return;
    editingMessageId.value = messageId;
    editingDraft.value = target.text;
};

const regenerateFromMessage = async (messageId: string) => {
    if (isLoading.value) return;
    if (hasQueuedMessages.value || isQueuedMessage(messageId)) {
        openNotice('info', '待发送消息未提交', '请先关闭连续发送模式并发送一条新消息提交队列。');
        return;
    }
    clearToolbarVisibilityState();
    const index = messages.value.findIndex((item) => item.id === messageId);
    if (index < 0) return;

    const target = messages.value[index];
    if (target.role !== 'user') return;

    cancelEditMessage();
    messages.value = messages.value.slice(0, index + 1);
    activeRegenerateMessageId.value = target.id;

    try {
        await requestAssistantReply(target.text, [...messages.value]);
    } finally {
        activeRegenerateMessageId.value = null;
    }
};

const saveEditedMessage = async () => {
    if (!editingMessageId.value || isLoading.value) return;
    const index = messages.value.findIndex((item) => item.id === editingMessageId.value);
    if (index < 0) {
        cancelEditMessage();
        return;
    }

    const nextText = editingDraft.value.trim();
    if (!nextText) {
        openNotice('error', 'Edit failed', 'Message cannot be empty');
        return;
    }

    const target = messages.value[index];
    messages.value[index] = {
        ...target,
        text: nextText
    };
    cancelEditMessage();
};

const refreshApiKeyStatus = async () => {
    try {
        if (!isProviderSupported.value) {
            apiKeyConfigured.value = false;
            apiKeyMasked.value = '';
            return null;
        }

        const status = await getProviderStatus(props.appConfig, currentProviderId.value);
        providerStatusMemory.set(currentProviderId.value, status);
        applyProviderStatus(status);
        if (status.api_base_url) {
            apiUrl.value = status.api_base_url;
        } else if (!apiUrl.value.trim()) {
            apiUrl.value = selectedProviderOption.value.defaultApiUrl;
        }

        return status;
    } catch (error) {
        console.error('Failed to refresh API key status:', error);
        return null;
    }
};

const handleSaveApiKey = async (): Promise<boolean> => {
    if (!apiKeyInput.value.trim() || isSavingApiKey.value) return false;

    try {
        if (!isProviderSupported.value) {
            return false;
        }
        isSavingApiKey.value = true;
        const status = await connectProvider(props.appConfig, currentProviderId.value, {
            apiKey: apiKeyInput.value.trim(),
            apiBaseUrl: apiUrl.value.trim() || undefined,
            verify: false,
        });

        applyProviderStatus(status);
        await clearProviderCache(currentProviderId.value);
        connectionState.value = 'idle';
        resetModelOptionsToFallback();
        apiKeyInput.value = '';
        isConfigOpen.value = true;
        return true;
    } catch (error) {
        console.error('Failed to save API key:', error);
        const message = error instanceof Error ? error.message : 'Failed to save API key';
        openNotice('error', 'Save failed', message);
        isConfigOpen.value = true;
        return false;
    } finally {
        isSavingApiKey.value = false;
    }
};

const handleConnect = async () => {
    if (isConnecting.value) return;

    try {
        if (!isProviderSupported.value) {
            return;
        }
        isConnecting.value = true;
        connectionState.value = 'connecting';

        const status = await connectProvider(props.appConfig, currentProviderId.value, {
            apiKey: apiKeyInput.value.trim() || undefined,
            apiBaseUrl: apiUrl.value.trim() || undefined,
            verify: true,
        });

        applyProviderStatus(status);
        connectionState.value = status.ok ? 'connected' : 'error';
        if (!status.ok) {
            throw new Error(status.message || 'Connection failed');
        }

        apiKeyInput.value = '';
        if (!status.models || status.models.length === 0) {
            await refreshProviderModels(true);
        }
        await persistConnectedProviderCache();
        openNotice('success', 'Connect success', '');
    } catch (error) {
        connectionState.value = 'error';
        await clearProviderCache(currentProviderId.value);
        const message = error instanceof Error ? error.message : 'Connection failed';
        openNotice('error', 'Connect failed', message);
    } finally {
        isConnecting.value = false;
    }
};

const handleTestConnection = async () => {
    if (isTesting.value) return;

    try {
        if (!isProviderSupported.value) {
            return;
        }
        isTesting.value = true;
        const result = await testProvider(props.appConfig, currentProviderId.value, {
            model: aiModel.value,
            message: 'Hi',
        });
        openNotice('success', 'Test success', '');
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Connection test failed';
        openNotice('error', 'Test failed', message);
    } finally {
        isTesting.value = false;
    }
};

const checkInitialProviderSetup = async () => {
    if (hasCheckedInitialProviderSetup.value || !props.appConfig?.isReady) {
        return;
    }

    try {
        const snapshot = await getAllProviderStatuses(props.appConfig);
        const hasConfiguredProvider = providerOptions.some((option) => {
            return !!snapshot.providers[option.providerId]?.configured;
        });
        hasCheckedInitialProviderSetup.value = true;

        if (!hasConfiguredProvider) {
            isConfigOpen.value = true;
            openNotice('info', 'Setup required', 'Save API key to start');
        }
    } catch (error) {
        console.error('Failed to check initial provider setup:', error);
    }
};

watch(() => props.appConfig?.isReady, async (ready) => {
    if (ready) {
        await checkInitialProviderSetup();
        const status = await refreshApiKeyStatus();
        const hasBackendPersistedModels = !!(
            status &&
            status.state === 'connected' &&
            Array.isArray(status.models) &&
            status.models.length > 0
        );

        const restored = hasBackendPersistedModels ? false : await restoreProviderCache();
        if (!hasBackendPersistedModels && !restored && !apiKeyConfigured.value) {
            resetModelOptionsToFallback();
        }
    }
}, { immediate: true });

watch(source, async () => {
    void persistPreferredProvider(currentProviderId.value);
    apiKeyInput.value = '';
    const fastApplied = await applyProviderSnapshotFast(currentProviderId.value);
    if (!fastApplied) {
        connectionState.value = 'idle';
        apiKeyConfigured.value = false;
        apiKeyMasked.value = '';
        apiUrl.value = selectedProviderOption.value.defaultApiUrl;
        resetModelOptionsToFallback();
    }

    const status = await refreshApiKeyStatus();
    if (
        !status ||
        (!status.configured && (!status.models || status.models.length === 0))
    ) {
        resetModelOptionsToFallback();
    }
    emitConfigChange();
});

watch(aiModel, () => {
    const memorized = providerStatusMemory.get(currentProviderId.value);
    if (memorized) {
        memorized.selected_model = aiModel.value;
        providerStatusMemory.set(currentProviderId.value, memorized);
    }
    void persistSelectedModel();
    void persistConnectedProviderCache();
    emitConfigChange();
});

watch(currentProviderId, () => {
    emitConfigChange();
}, { immediate: true });

void restorePreferredProvider();

onMounted(() => {
    document.addEventListener('pointerdown', handlePointerDownOutsideMessage);
});

onUnmounted(() => {
    clearToolbarVisibilityState();
    clearMessageLongPressTimer();
    document.removeEventListener('pointerdown', handlePointerDownOutsideMessage);
    document.removeEventListener('mousedown', handleClickOutside);
    document.removeEventListener('keydown', handleEscKey);
    clearNotices();
});


// Task Logic
const activeTaskNodeTitle = computed(() => {
    if (!props.activeTask) return '';
    const node = props.nodes[props.activeTask.nodeId];
    return node ? node.title : '未知章节';
});

const getTaskLabel = (type: TaskType) => {
    switch(type) {
        case 'SYNOPSIS': return '章纲';
        case 'CONTENT': return '正文';
        case 'POLISH_SELECTION': return '润色';
        default: return '任务';
    }
};

const getTaskActionLabel = (type: TaskType) => {
    switch(type) {
        case 'SYNOPSIS': return '生成章纲';
        case 'CONTENT': return '撰写内容';
        case 'POLISH_SELECTION': return '优化选中内容';
        default: return '处理中';
    }
};

const getApplyLabel = () => {
    if (!props.activeTask) return '应用';
    switch (props.activeTask.type) {
        case 'SYNOPSIS': return '应用此章纲';
        case 'CONTENT': return '插入正文';
        case 'POLISH_SELECTION': return '替换选中内容';
        default: return '应用';
    }
};

const handleApply = (content: string) => {
    emit('apply-task', content);
};

const showApplyOverlay = computed(() => {
    if (!props.activeTask) return false;
    if (messages.value.length === 0) return false;
    
    const lastMsg = messages.value[messages.value.length - 1];
    
    // Check if last message is from model and not error
    if (lastMsg.role !== 'model' || lastMsg.isError) return false;
    
    // Check if it's the initial greeting (ID '1')
    if (lastMsg.id === '1') return false;
    
    return true;
});

const handleApplyLast = () => {
    const lastMsg = messages.value[messages.value.length - 1];
    if (lastMsg && lastMsg.role === 'model') {
        handleApply(lastMsg.text);
    }
};
</script>

