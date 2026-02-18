<template>
  <div v-if="!appConfig" class="flex flex-col h-screen w-screen items-center justify-center bg-slate-50 space-y-4 animate-in fade-in">
    <Loader2 :size="48" class="animate-spin text-indigo-600" />
    <div class="text-slate-600 font-medium text-lg">正在启动 AI 创作引擎...</div>
    <div class="text-sm text-slate-400">正在寻找可用端口并建立安全连接</div>
  </div>

  <div v-else class="flex flex-col h-screen w-screen bg-slate-50 text-slate-900 font-sans overflow-hidden">
    <!-- TitleBar -->
    <TitleBar
      :showSaveSuccess="showSaveSuccess"
      :filePath="currentFilePath"
      @new="handleNewNovel"
      @save="handleSaveNovel"
      @import="handleImportClick"
    />
    <input
        type="file"
        ref="fileInputRef"
        @change="handleFileImport"
        accept=".json"
        class="hidden"
    />

    <div class="flex-1 flex overflow-hidden">
        <!-- LEFT SIDEBAR -->
        <div
          class="transition-all duration-300 ease-in-out overflow-hidden flex-shrink-0 relative shadow-xl shadow-indigo-100/20 z-10"
          :class="isLeftSidebarOpen ? 'w-64' : 'w-0'"
        >
          <TreeSidebar
            :nodes="nodes"
            :selectedId="selectedId"
            :projectMode="projectMode"
            @select="handleSelect"
            @toggle="handleToggle"
            @add="handleAdd"
            @delete="handleDelete"
            @rename="handleRename"
          />
        </div>

        <!-- MAIN CONTENT AREA -->
        <div class="flex-1 flex flex-col min-w-0 h-full relative z-0 bg-white border-l border-slate-100">

           <!-- Toolbar / Header -->
           <div class="h-14 bg-white/80 backdrop-blur grid grid-cols-3 items-center px-6 sticky top-0 z-20 border-b border-slate-100">
             <!-- Left: Sidebar Toggle -->
             <div class="flex items-center gap-4">
               <button
                 @click="isLeftSidebarOpen = !isLeftSidebarOpen"
                 class="p-2 hover:bg-slate-50 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
                 title="显示/隐藏侧边栏"
               >
                 <SidebarClose v-if="isLeftSidebarOpen" :size="18" />
                 <SidebarOpen v-else :size="18" />
               </button>
             </div>

             <!-- Center: Novel Mode Label -->
             <div class="flex items-center justify-center">
               <div
                 class="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all duration-300"
                 :class="projectMode === 'LONG' ? 'bg-indigo-50 text-indigo-600' : 'bg-emerald-50 text-emerald-600'"
               >
                 <BookText v-if="projectMode === 'LONG'" :size="14" />
                 <ScrollText v-else :size="14" />
                 <span>{{ projectMode === 'LONG' ? '长篇小说' : '短篇小说' }}</span>
               </div>
             </div>

             <!-- Right: AI Toggle -->
             <div class="flex items-center justify-end gap-2">
               <button
                 @click="isRightSidebarOpen = !isRightSidebarOpen"
                 class="flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all"
                 :class="isRightSidebarOpen ? 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100' : 'bg-indigo-600 text-white shadow-md shadow-indigo-200'"
               >
                 {{ isRightSidebarOpen ? "关闭 AI" : "开启 AI" }}
                 <SidebarOpen v-if="isRightSidebarOpen" :size="16" class="rotate-180" />
                 <SidebarClose v-else :size="16" class="rotate-180" />
               </button>
             </div>
           </div>

           <div class="flex-1 overflow-hidden relative">
              <Editor
                v-if="selectedNode"
                :node="selectedNode"
                :activeTask="activeTask"
                :projectMode="projectMode"
                :isSplitModalOpen="isSplitModalOpen"
                :isSplitGenerating="isSplitGenerating"
                :splitChapterCount="splitChapterCount"
                :splitPreviewChapters="splitPreviewChapters"
                :splitError="splitError"
                :canSplitNode="canSplitCurrentNode"
                :splitTargetLabel="splitTargetLabel"
                :splitCounterSuffix="splitCounterSuffix"
                @change="handleChange"
                @save="handleEditorSave"
                @start-ai-task="handleStartAiTask"
                @cancel-polish-selection="handleCancelPolishSelection"
                @open-split-modal="handleOpenSplitModal"
                @close-split-modal="handleCloseSplitModal"
                @update-split-chapter-count="handleUpdateSplitChapterCount"
                @generate-split-preview="handleGenerateSplitPreview"
                @update-split-title="handleUpdateSplitTitle"
                @update-split-summary="handleUpdateSplitSummary"
                @apply-split-chapters="handleApplySplitChapters"
              />
             <div v-else class="h-full flex flex-col items-center justify-center text-slate-300 space-y-4">
                <div class="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center">
                  <div class="w-8 h-8 rounded bg-slate-200"></div>
                </div>
                <p>请在侧边栏选择章节或设置开始创作</p>
             </div>
           </div>
        </div>

        <!-- RIGHT SIDEBAR -->
        <div
          data-testid="right-sidebar"
          class="transition-all duration-300 ease-in-out overflow-hidden flex-shrink-0 min-w-0 bg-white z-10 shadow-[-5px_0_30px_-5px_rgba(0,0,0,0.03)]"
          :class="isRightSidebarOpen ? 'w-72 lg:w-80' : 'w-0'"
        >
          <AIChatPanel
            :nodes="nodes"
            :selectedId="selectedId"
            :projectMode="projectMode"
            :filePath="currentFilePath"
            :appConfig="appConfig"
            :activeTask="activeTask"
            @apply-task="handleApplyAiTask"
            @cancel-task="handleCancelAiTask"
            @config-change="handleAiConfigChange"
          />
        </div>
    </div>

    <NoticeStack
      :items="notices"
      :dismiss="dismissNotice"
      container-class="fixed top-4 left-0 right-0 z-[260] pointer-events-none px-3 flex flex-col items-center gap-2"
    />

    <!-- NEW NOVEL MODAL -->
    <div v-if="showNewModal" class="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
        <div
          ref="newModalRef"
          class="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-white/20 animate-in zoom-in-95 duration-200"
          role="dialog"
          aria-modal="true"
          aria-labelledby="new-project-title"
          tabindex="-1"
          @keydown="handleNewModalKeydown"
        >
            <div class="px-8 pt-8 pb-6 flex justify-between items-start">
              <div>
                <h3 id="new-project-title" class="text-2xl font-bold text-slate-800">新建创作</h3>
                <p class="text-sm text-slate-400 mt-1">请选择作品的结构模式，创建后无法更改模式。</p>
              </div>
              <button
                ref="newModalCloseBtnRef"
                @click="showNewModal = false"
                class="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors"
                title="关闭"
              >
                <CloseIcon :size="20" />
              </button>
            </div>

            <div class="px-8 pb-10 grid grid-cols-2 gap-4">
              <button
                @click="createNewProject('LONG')"
                class="group flex flex-col items-center text-center p-6 rounded-2xl border-2 border-slate-100 hover:border-indigo-500 hover:bg-indigo-50/30 transition-all"
              >
                <div class="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center mb-4 group-hover:bg-indigo-100 transition-colors">
                  <BookText :size="32" class="text-indigo-600" />
                </div>
                <div class="font-bold text-slate-700">长篇小说</div>
                <div class="text-[10px] text-slate-400 mt-2 leading-relaxed">
                  总纲 &gt; 卷 &gt; 篇 &gt; 章<br />适合架构复杂的宏大叙事
                </div>
              </button>

              <button
                @click="createNewProject('SHORT')"
                class="group flex flex-col items-center text-center p-6 rounded-2xl border-2 border-slate-100 hover:border-emerald-500 hover:bg-emerald-50/30 transition-all"
              >
                <div class="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center mb-4 group-hover:bg-emerald-100 transition-colors">
                  <ScrollText :size="32" class="text-emerald-600" />
                </div>
                <div class="font-bold text-slate-700">短篇小说</div>
                <div class="text-[10px] text-slate-400 mt-2 leading-relaxed">
                  总纲 &gt; 章<br />适合结构精简的轻量创作
                </div>
              </button>
            </div>
        </div>
    </div>
    <!-- CONFIRMATION MODAL -->
    <div v-if="confirmModalState.isOpen" class="fixed inset-0 z-[300] flex items-center justify-center bg-slate-900/20 backdrop-blur-[2px] animate-in fade-in duration-200">
        <div
          ref="confirmModalRef"
          class="bg-white rounded-2xl shadow-2xl w-full max-w-[400px] p-6 animate-in zoom-in-95 slide-in-from-bottom-2 duration-200 relative border border-white/40"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-modal-title"
          tabindex="-1"
          @keydown="handleConfirmModalKeydown"
        >
            <div class="flex flex-col items-center text-center">
                <!-- Icon -->
                <div 
                    class="w-12 h-12 rounded-2xl flex items-center justify-center mb-4 transition-colors"
                    :class="confirmModalState.isDestructive ? 'bg-red-50 text-red-500' : 'bg-indigo-50 text-indigo-500'"
                >
                    <AlertTriangle v-if="confirmModalState.isDestructive" :size="24" stroke-width="2" />
                    <Info v-else :size="24" stroke-width="2" />
                </div>

                <!-- Content -->
                <h3 id="confirm-modal-title" class="text-lg font-bold text-slate-800 tracking-tight mb-2">{{ confirmModalState.title }}</h3>
                <p class="text-sm text-slate-500 leading-relaxed mb-8 px-2">
                    {{ confirmModalState.message }}
                </p>

                <!-- Actions -->
                <div class="w-full grid grid-cols-2 gap-3">
                    <button
                        @click="closeConfirmModal"
                        class="h-10 rounded-xl text-xs font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-100 transition-all"
                    >
                        取消
                    </button>
                    <button
                        @click="handleConfirmAction"
                        class="h-10 rounded-xl text-xs font-bold text-white shadow-lg shadow-indigo-100 hover:shadow-indigo-200 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2"
                        :class="confirmModalState.isDestructive ? 'bg-red-500 hover:bg-red-600 shadow-red-200' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200'"
                    >
                        <Trash2 v-if="confirmModalState.isDestructive" :size="14" />
                        <CheckCircle2 v-else :size="14" />
                        <span>{{ confirmModalState.confirmLabel }}</span>
                    </button>
                </div>
            </div>
        </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue';
import { NodeMap, NodeType, ProjectMode, NodeData, AppConfig, WritingTask, SplitNodeItem, NoticeType } from './types';
import type { ProviderId } from './services/providerConnectionService';
import TitleBar from './components/TitleBar.vue';
import TreeSidebar from './components/TreeSidebar.vue';
import Editor from './components/Editor.vue';
import AIChatPanel from './components/AIChatPanel.vue';
import NoticeStack from './components/NoticeStack.vue';
import { useNoticeQueue } from './composables/noticeQueue';
import {
  SidebarClose, SidebarOpen, BookText, ScrollText, X as CloseIcon, Loader2,
  AlertTriangle, Trash2, Info, CheckCircle2
} from 'lucide-vue-next';

// --- Logic Helpers ---
const getInitialNodes = (mode: ProjectMode): NodeMap => {
  const nodes: NodeMap = {
    'story-root': {
      id: 'story-root',
      type: NodeType.ROOT,
      title: '未命名作品',
      content: '',
      summary: '在这里写下你的小说总纲...',
      parentId: null,
      children: mode === 'LONG' ? ['vol-1'] : ['chap-1'],
      expanded: true
    },
    'setting-root': {
      id: 'setting-root',
      type: NodeType.SETTING_ROOT,
      title: '世界设定',
      content: '',
      summary: '管理角色、地理 and 世界观。',
      parentId: null,
      children: [],
      expanded: true
    }
  };

  if (mode === 'LONG') {
    nodes['vol-1'] = {
      id: 'vol-1',
      type: NodeType.VOLUME,
      title: '第一卷：初入尘世',
      content: '',
      summary: '本卷讲述主角初次离开家乡的故事。',
      parentId: 'story-root',
      children: ['sec-1'],
      expanded: true
    };
    nodes['sec-1'] = {
      id: 'sec-1',
      type: NodeType.SECTION,
      title: '第一篇：少年游',
      content: '',
      summary: '描述少年在路上的见闻。',
      parentId: 'vol-1',
      children: ['chap-1'],
      expanded: true
    };
    nodes['chap-1'] = {
      id: 'chap-1',
      type: NodeType.CHAPTER,
      title: '第一章：启程',
      content: '清晨的阳光透过窗帘...',
      summary: '主角醒来，准备开始旅程。',
      parentId: 'sec-1',
      children: []
    };
  } else {
    nodes['chap-1'] = {
      id: 'chap-1',
      type: NodeType.CHAPTER,
      title: '第一章：启程',
      content: '清晨的阳光透过窗帘...',
      summary: '主角醒来，准备开始旅程。',
      parentId: 'story-root',
      children: []
    };
  }
  return nodes;
};

// --- State ---
const projectMode = ref<ProjectMode>('LONG');
const nodes = ref<NodeMap>(getInitialNodes('LONG'));
const selectedId = ref('story-root');
const isLeftSidebarOpen = ref(true);
const isRightSidebarOpen = ref(true);
const showSaveSuccess = ref(false);
const showNewModal = ref(false);
const currentFilePath = ref("Documents/NebulaWrite/untitled.json");
const appConfig = ref<AppConfig | null>(null);
const activeTask = ref<WritingTask | null>(null);
const currentAiProvider = ref<ProviderId>('google');
const currentAiModel = ref('gemini-3-flash-preview');
const isSplitModalOpen = ref(false);
const isSplitGenerating = ref(false);
const splitChapterCount = ref(8);
const splitPreviewChapters = ref<SplitNodeItem[]>([]);
const splitError = ref('');
const projectRevision = ref(1);
let removeProjectStateChangedListener: (() => void) | null = null;
let removeBackendReadyListener: (() => void) | null = null;
let syncSelectedNodeTimer: ReturnType<typeof setTimeout> | null = null;
let bootstrapGuardTimer: ReturnType<typeof setTimeout> | null = null;
let nodeFieldLoadSeq = 0;
const isProjectStateReady = ref(false);
const { notices, openNotice, dismissNotice } = useNoticeQueue();
const fallbackAppConfig: AppConfig = { port: 0, token: '', isReady: false };

const confirmModalState = ref({
    isOpen: false,
    title: '',
    message: '',
    confirmLabel: '确定',
    isDestructive: false,
    confirmAction: async () => {}
});

const fileInputRef = ref<HTMLInputElement | null>(null);
const newModalRef = ref<HTMLDivElement | null>(null);
const newModalCloseBtnRef = ref<HTMLButtonElement | null>(null);
const confirmModalRef = ref<HTMLDivElement | null>(null);
const lastFocusedElementBeforeModal = ref<HTMLElement | null>(null);

const selectedNode = computed(() => nodes.value[selectedId.value]);

const splitRuleMap: Record<ProjectMode, Partial<Record<NodeType, NodeType>>> = {
  SHORT: {
    [NodeType.ROOT]: NodeType.CHAPTER
  },
  LONG: {
    [NodeType.ROOT]: NodeType.VOLUME,
    [NodeType.VOLUME]: NodeType.SECTION,
    [NodeType.SECTION]: NodeType.CHAPTER
  }
};

const splitTypeLabelMap: Record<NodeType, string> = {
  [NodeType.ROOT]: '总纲',
  [NodeType.VOLUME]: '卷纲',
  [NodeType.SECTION]: '篇纲',
  [NodeType.CHAPTER]: '章纲',
  [NodeType.SETTING_ROOT]: '设定',
  [NodeType.SETTING_FOLDER]: '设定',
  [NodeType.SETTING_ITEM]: '设定'
};

const splitCounterSuffixMap: Record<NodeType, string> = {
  [NodeType.ROOT]: '',
  [NodeType.VOLUME]: '卷',
  [NodeType.SECTION]: '篇',
  [NodeType.CHAPTER]: '章',
  [NodeType.SETTING_ROOT]: '',
  [NodeType.SETTING_FOLDER]: '',
  [NodeType.SETTING_ITEM]: ''
};

const splitTargetNodeType = computed<NodeType | null>(() => {
  const current = selectedNode.value;
  if (!current) return null;
  return splitRuleMap[projectMode.value]?.[current.type] || null;
});

const canSplitCurrentNode = computed(() => !!splitTargetNodeType.value);

const splitTargetLabel = computed(() => {
  const targetType = splitTargetNodeType.value;
  if (!targetType) return '子节点';
  return splitTypeLabelMap[targetType] || '子节点';
});

const splitCounterSuffix = computed(() => {
  const targetType = splitTargetNodeType.value;
  if (!targetType) return '';
  return splitCounterSuffixMap[targetType] || '';
});

const getFocusableElements = (container: HTMLElement): HTMLElement[] => {
  const selectors = [
    'button:not([disabled])',
    '[href]',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])'
  ].join(',');

  return Array.from(container.querySelectorAll<HTMLElement>(selectors))
    .filter((element) => !element.hasAttribute('disabled') && element.getAttribute('aria-hidden') !== 'true');
};

const trapFocus = (event: KeyboardEvent, container: HTMLElement | null) => {
  if (event.key !== 'Tab' || !container) return;

  const focusables = getFocusableElements(container);
  if (focusables.length === 0) {
    event.preventDefault();
    container.focus();
    return;
  }

  const first = focusables[0];
  const last = focusables[focusables.length - 1];
  const active = document.activeElement as HTMLElement | null;

  if (event.shiftKey) {
    if (active === first || !container.contains(active)) {
      event.preventDefault();
      last.focus();
    }
    return;
  }

  if (active === last || !container.contains(active)) {
    event.preventDefault();
    first.focus();
  }
};

const captureFocusBeforeModalOpen = () => {
  if (!lastFocusedElementBeforeModal.value) {
    lastFocusedElementBeforeModal.value = document.activeElement as HTMLElement | null;
  }
};

const restoreFocusAfterModalClose = () => {
  if (showNewModal.value || confirmModalState.value.isOpen) return;
  lastFocusedElementBeforeModal.value?.focus?.();
  lastFocusedElementBeforeModal.value = null;
};

const handleNewModalKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    showNewModal.value = false;
    return;
  }
  trapFocus(event, newModalRef.value);
};

const handleConfirmModalKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    closeConfirmModal();
    return;
  }
  trapFocus(event, confirmModalRef.value);
};

const getErrorMessage = (res: any, fallback: string) => {
  if (!res) return fallback;
  if (typeof res.error === 'string') return res.error;
  if (res.error?.message) return res.error.message;
  return fallback;
};

const openAppNotice = (type: NoticeType, title: string, message?: string) => {
    openNotice(type, title, message);
};

const applyFallbackAppConfig = () => {
  if (appConfig.value) return;
  appConfig.value = { ...fallbackAppConfig };
};

const applyProjectState = (data: any) => {
  if (!data) return;
  if (data.nodes) {
    const mergedNodes: NodeMap = {};
    for (const [id, incomingNode] of Object.entries(data.nodes as NodeMap)) {
      const localNode = nodes.value[id];
      if (localNode) {
        mergedNodes[id] = {
          ...incomingNode,
          content: incomingNode.content || localNode.content || '',
          summary: incomingNode.summary || localNode.summary || ''
        } as NodeData;
      } else {
        mergedNodes[id] = incomingNode as NodeData;
      }
    }
    nodes.value = mergedNodes;
  }
  if (data.projectMode) projectMode.value = data.projectMode;
  if (data.lastOpenedId) selectedId.value = data.lastOpenedId;
  if (Number.isInteger(data.revision)) projectRevision.value = data.revision;
};

const syncProjectStateFromMain = async (projectPath: string) => {
  isProjectStateReady.value = false;
  const res = await (window as any).electronAPI.project.getState({ projectPath });
  if (!res?.success || !res?.data) {
    throw new Error(getErrorMessage(res, '同步项目状态失败。'));
  }
  applyProjectState(res.data);
  isProjectStateReady.value = true;
};

// --- Init Sidecar & Auto Load ---
onMounted(async () => {
    const electronAPI = (window as any).electronAPI;
    if (!electronAPI) {
        console.error('[Bootstrap] window.electronAPI is undefined. Preload bridge may have failed.');
        applyFallbackAppConfig();
        openAppNotice('error', '桌面桥接初始化失败', '请完全退出应用后重启。若仍失败，请检查 Electron preload 配置。');
        return;
    }

    bootstrapGuardTimer = setTimeout(() => {
        if (!appConfig.value) {
            console.error('[Bootstrap] appConfig loading timeout.');
            applyFallbackAppConfig();
            openAppNotice('error', '启动超时', '后端已启动但配置同步失败，已进入离线模式。');
        }
    }, 5000);

    if (electronAPI) {
        if (electronAPI.onProjectStateChanged) {
            removeProjectStateChangedListener = electronAPI.onProjectStateChanged((payload: any) => {
                if (!payload || payload.projectPath !== currentFilePath.value) return;
                applyProjectState(payload.data);
            });
        }

        // 1. Backend 配置与项目加载并行进行，减少首屏等待。
        (async () => {
            const syncAppConfig = async () => {
                const config = await electronAPI.getAppConfig();
                if (!config) return;

                appConfig.value = config;
                if (!config.isReady) return;

                if (removeBackendReadyListener) {
                    removeBackendReadyListener();
                    removeBackendReadyListener = null;
                }
            };

            // 先订阅后读取，避免错过一次性的 backend-ready 事件。
            removeBackendReadyListener = electronAPI.onBackendReady(() => {
                syncAppConfig().catch((error: any) => {
                    console.warn('监听 backend-ready 后同步配置失败:', error);
                });
            });

            await syncAppConfig();
            if (bootstrapGuardTimer) {
                clearTimeout(bootstrapGuardTimer);
                bootstrapGuardTimer = null;
            }
        })().catch((error: any) => {
            console.warn('加载后端配置失败:', error);
            applyFallbackAppConfig();
            openAppNotice('error', '加载后端配置失败', '已进入离线模式。');
        });

        // 2. Last Project 直接优先加载，避免被其他初始化阻塞。
        (async () => {
            if (!electronAPI?.getLastProject) return;
            const lastPath = await electronAPI.getLastProject();
            if (!lastPath) return;
            currentFilePath.value = lastPath;
            await syncProjectStateFromMain(lastPath);
        })().catch((error: any) => {
            console.error('Failed to auto-load last project:', error);
        });
    }
});

onUnmounted(() => {
    if (bootstrapGuardTimer) {
        clearTimeout(bootstrapGuardTimer);
        bootstrapGuardTimer = null;
    }
    if (removeBackendReadyListener) {
        removeBackendReadyListener();
        removeBackendReadyListener = null;
    }
    if (removeProjectStateChangedListener) {
        removeProjectStateChangedListener();
        removeProjectStateChangedListener = null;
    }
    if (syncSelectedNodeTimer) {
        clearTimeout(syncSelectedNodeTimer);
        syncSelectedNodeTimer = null;
    }
});

watch(showNewModal, async (open) => {
  if (open) {
    captureFocusBeforeModalOpen();
    await nextTick();
    newModalCloseBtnRef.value?.focus();
    return;
  }
  restoreFocusAfterModalClose();
});

watch(() => confirmModalState.value.isOpen, async (open) => {
  if (open) {
    captureFocusBeforeModalOpen();
    await nextTick();
    const focusables = confirmModalRef.value ? getFocusableElements(confirmModalRef.value) : [];
    if (focusables.length > 0) {
      focusables[0].focus();
    } else {
      confirmModalRef.value?.focus();
    }
    return;
  }
  restoreFocusAfterModalClose();
});

// --- Content Loading Logic ---
watch([selectedId, currentFilePath, isProjectStateReady], async () => {
    if (!isProjectStateReady.value) return;
    if (!selectedId.value || !nodes.value[selectedId.value]) return;
    if (!currentFilePath.value || currentFilePath.value.includes('untitled.json')) return;

    const requestId = ++nodeFieldLoadSeq;
    const targetNodeId = selectedId.value;
    const targetProjectPath = currentFilePath.value;
    const node = nodes.value[targetNodeId];
    let contentLoaded = false;
    let summaryLoaded = false;
    let newContent = node.content;
    let newSummary = node.summary;

    // 并行加载正文与摘要，减少切换节点时的等待时间。
    const needContent = node.type === NodeType.CHAPTER || node.type === NodeType.SETTING_ITEM;
    const contentPromise = needContent
        ? (window as any).electronAPI.project.loadNodeField({
            projectPath: targetProjectPath,
            nodeId: targetNodeId,
            field: 'content'
        })
        : Promise.resolve(null);
    const summaryPromise = (window as any).electronAPI.project.loadNodeField({
        projectPath: targetProjectPath,
        nodeId: targetNodeId,
        field: 'summary'
    });

    const [contentResult, summaryResult] = await Promise.allSettled([contentPromise, summaryPromise]);

    if (contentResult.status === 'fulfilled' && contentResult.value?.success) {
        newContent = contentResult.value.data?.value || '';
        contentLoaded = needContent;
    } else if (contentResult.status === 'rejected') {
        console.warn('Content load failed, keeping existing content (if any)', contentResult.reason);
    }

    if (summaryResult.status === 'fulfilled' && summaryResult.value?.success) {
        newSummary = summaryResult.value.data?.value || '';
        summaryLoaded = true;
    } else if (summaryResult.status === 'rejected') {
        console.warn('Summary load failed, keeping existing', summaryResult.reason);
    }

    if (!contentLoaded && !summaryLoaded) return;

    // 异步请求返回前，若节点或项目已切换，直接丢弃过期结果。
    if (requestId !== nodeFieldLoadSeq) return;
    if (selectedId.value !== targetNodeId) return;
    if (currentFilePath.value !== targetProjectPath) return;

    const currentNode = nodes.value[targetNodeId];
    if (!currentNode) return;

    nodes.value[targetNodeId] = {
        ...currentNode,
        content: contentLoaded ? (newContent || '') : (currentNode.content || ''),
        summary: summaryLoaded ? (newSummary || '') : (currentNode.summary || '')
    };
}, { immediate: true });

const handleEditorSave = async (id: string, field: keyof NodeData, value: string) => {
    // 1. Prepare Update
    const node = nodes.value[id];
    if (!node) return;

    const updates: Partial<NodeData> = { [field]: value };
    if (field === 'content') {
        updates.wordCount = value.length;
    }

    // 2. Update State
    const updatedNode = { ...node, ...updates };
    nodes.value[id] = updatedNode;

    if (!currentFilePath.value || currentFilePath.value.includes('untitled.json')) return;

    const res = await (window as any).electronAPI.project.updateNode({
        projectPath: currentFilePath.value,
        nodeId: id,
        field,
        value,
        expectedRevision: projectRevision.value
    });

    if (!res?.success || !res?.data) {
        console.error('保存失败', getErrorMessage(res, '更新节点失败'));
        return;
    }

    nodes.value[id] = {
        ...nodes.value[id],
        ...res.data.node
    };
    if (Number.isInteger(res.data.revision)) {
        projectRevision.value = res.data.revision;
    }
};

// --- Actions ---
const handleNewNovel = () => showNewModal.value = true;

const createNewProject = async (mode: ProjectMode) => {
    if ((window as any).electronAPI?.selectDirectory) {
        try {
            const dirPath = await (window as any).electronAPI.selectDirectory();
            if (!dirPath) return;

            const initialNodes = getInitialNodes(mode);
            const createRes = await (window as any).electronAPI.createProject(dirPath, initialNodes, mode);
            const success = !!createRes?.success;

            if (success) {
                currentFilePath.value = dirPath;
                await syncProjectStateFromMain(dirPath);
                showNewModal.value = false;
            } else {
                openAppNotice('error', '创建项目失败');
            }
        } catch (error) {
            console.error("Failed to create new project:", error);
            openAppNotice('error', '创建项目异常');
        }
    }
};

const handleSaveNovel = async () => {
    if (!currentFilePath.value || currentFilePath.value.includes('untitled.json')) return;
    const res = await (window as any).electronAPI.project.save({
        projectPath: currentFilePath.value,
        expectedRevision: projectRevision.value
    });
    if (!res?.success || !res?.data) {
        openAppNotice('error', '保存失败');
        return;
    }
    applyProjectState(res.data);
    showSaveSuccess.value = true;
    setTimeout(() => showSaveSuccess.value = false, 2000);
};

const handleImportClick = async () => {
    if ((window as any).electronAPI?.selectDirectory) {
        try {
            const dirPath = await (window as any).electronAPI.selectDirectory();
            if (!dirPath) return;

            currentFilePath.value = dirPath;
            await syncProjectStateFromMain(dirPath);
        } catch (err) {
            console.error("Import failed:", err);
            openAppNotice('error', '导入失败');
        }
    }
};

const handleFileImport = (_event: Event) => {
    openAppNotice('info', '请使用“打开文件夹”');
};

// --- Confirm Modal Actions ---
const closeConfirmModal = () => {
    confirmModalState.value.isOpen = false;
};

const handleConfirmAction = async () => {
    if (confirmModalState.value.confirmAction) {
        await confirmModalState.value.confirmAction();
    }
    closeConfirmModal();
};

// --- Tree Actions ---
const handleSelect = (id: string) => {
    if (!id) {
        selectedId.value = '';
        return;
    }
    if (!nodes.value[id]) return;
    if (id === selectedId.value) return;

    selectedId.value = id;
    if (!currentFilePath.value || currentFilePath.value.includes('untitled.json')) return;

    if (syncSelectedNodeTimer) {
        clearTimeout(syncSelectedNodeTimer);
        syncSelectedNodeTimer = null;
    }

    syncSelectedNodeTimer = setTimeout(() => {
        const projectPath = currentFilePath.value;
        if (!projectPath || projectPath.includes('untitled.json')) return;
        (window as any).electronAPI.project.selectNode({
            projectPath,
            nodeId: id
        }).then((res: any) => {
            if (res?.success && res?.data && Number.isInteger(res.data.revision)) {
                projectRevision.value = res.data.revision;
            }
        }).catch((error: any) => {
            console.warn('selectNode failed', error);
        });
    }, 180);
};

const handleToggle = (id: string) => {
    const node = nodes.value[id];
    if (node) {
        // Vue 3 reactivity handles object mutation if node is reactive
        // nodes.value[id] = { ...node, expanded: !node.expanded };
        // Or deeper mutation
        node.expanded = !node.expanded;
    }
};

const handleAdd = async (parentId: string, type: NodeType) => {
    if (!currentFilePath.value || currentFilePath.value.includes('untitled.json')) return;
    const res = await (window as any).electronAPI.project.addNode({
        projectPath: currentFilePath.value,
        parentId,
        type,
        expectedRevision: projectRevision.value
    });
    if (!res?.success || !res?.data) {
        openAppNotice('error', '新增节点失败');
        return;
    }
    applyProjectState(res.data);
};

const handleDelete = async (id: string) => {
    const nodeToDelete = nodes.value[id];
    if (!nodeToDelete || !nodeToDelete.parentId) {
        openAppNotice('info', '根节点不能删除');
        return;
    }

    confirmModalState.value = {
        isOpen: true,
        title: '删除章节确认',
        message: `确定要删除“${nodeToDelete.title}”及其所有内容吗？此操作无法撤销。`,
        confirmLabel: '确认删除',
        isDestructive: true,
        confirmAction: async () => {
             if (!currentFilePath.value || currentFilePath.value.includes('untitled.json')) return;
             const res = await (window as any).electronAPI.project.deleteNode({
                 projectPath: currentFilePath.value,
                 nodeId: id,
                 expectedRevision: projectRevision.value
             });
             if (!res?.success || !res?.data) {
                 openAppNotice('error', '删除节点失败');
                 return;
             }
             applyProjectState(res.data);
        }
    };
};

const handleRename = async (id: string, newTitle: string) => {
    if (!nodes.value[id]) return;
    nodes.value[id].title = newTitle;
    if (!currentFilePath.value || currentFilePath.value.includes('untitled.json')) return;
    const res = await (window as any).electronAPI.project.renameNode({
        projectPath: currentFilePath.value,
        nodeId: id,
        title: newTitle,
        expectedRevision: projectRevision.value
    });
    if (!res?.success || !res?.data) {
        console.warn(getErrorMessage(res, '重命名失败。'));
        return;
    }
    if (Number.isInteger(res.data.revision)) {
        projectRevision.value = res.data.revision;
    }
};

const handleChange = (id: string, field: keyof NodeData, value: string) => {
     if (nodes.value[id]) {
        // @ts-ignore
        nodes.value[id][field] = value;
     }
};

const handleOpenSplitModal = () => {
    if (!canSplitCurrentNode.value) return;
    isSplitModalOpen.value = true;
    splitError.value = '';
    splitPreviewChapters.value = [];
    
    // Auto generate preview - REMOVED per user request
    // handleGenerateSplitPreview();
};

const handleCloseSplitModal = () => {
    isSplitModalOpen.value = false;
    isSplitGenerating.value = false;
    splitError.value = '';
};

const handleUpdateSplitChapterCount = (count: number) => {
    const normalized = Math.max(2, Math.min(50, Math.floor(count || 0)));
    splitChapterCount.value = normalized;
};

const handleUpdateSplitTitle = (index: number, title: string) => {
    if (!splitPreviewChapters.value[index]) return;
    splitPreviewChapters.value[index] = {
        ...splitPreviewChapters.value[index],
        title
    };
};

const handleUpdateSplitSummary = (index: number, summary: string) => {
    if (!splitPreviewChapters.value[index]) return;
    splitPreviewChapters.value[index] = {
        ...splitPreviewChapters.value[index],
        summary
    };
};

const handleGenerateSplitPreview = async () => {
    if (isSplitGenerating.value) return;
    if (!currentFilePath.value || currentFilePath.value.includes('untitled.json')) {
        splitError.value = '请先创建或打开项目目录后再使用章节拆分。';
        return;
    }

    const chapterCount = splitChapterCount.value;
    if (!Number.isInteger(chapterCount) || chapterCount < 2 || chapterCount > 50) {
        splitError.value = `${splitTargetLabel.value}数需在 2-50 之间。`;
        return;
    }

    const sourceNode = selectedNode.value;
    const targetType = splitTargetNodeType.value;
    if (!sourceNode || !targetType) {
        splitError.value = '当前节点不支持拆分。';
        return;
    }

    splitError.value = '';
    isSplitGenerating.value = true;

    try {
        const res = await (window as any).electronAPI.project.splitShortPreview({
            projectPath: currentFilePath.value,
            sourceNodeId: sourceNode.id,
            targetNodeType: targetType,
            chapterCount,
            provider: currentAiProvider.value,
            modelName: currentAiModel.value,
            temperature: 0.3
        });

        if (!res?.success) {
            throw new Error(getErrorMessage(res, '生成章节预览失败，请重试。'));
        }

        splitPreviewChapters.value = (res.chapters || []) as SplitNodeItem[];
    } catch (error: any) {
        splitError.value = error?.message || '生成章节预览失败，请重试。';
        splitPreviewChapters.value = [];
    } finally {
        isSplitGenerating.value = false;
    }
};

const executeApplySplit = async () => {
     try {
        const sourceNode = selectedNode.value;
        const targetType = splitTargetNodeType.value;
        if (!sourceNode || !targetType) {
            splitError.value = '当前节点不支持拆分。';
            return;
        }

        const normalizedChapters = splitPreviewChapters.value.map((item, index) => ({
            title: (item.title || '').trim() || `第${index + 1}${splitCounterSuffix.value}：`,
            summary: item.summary || ''
        }));

        const res = await (window as any).electronAPI.project.applyShortSplit({
            projectPath: currentFilePath.value,
            sourceNodeId: sourceNode.id,
            targetNodeType: targetType,
            chapters: normalizedChapters,
            overwriteAll: true, // This should be handled by the confirm modal logic
            expectedRevision: projectRevision.value
        });

        if (!res?.success || !res?.data) {
            throw new Error(getErrorMessage(res, '应用章节拆分失败。'));
        }

        applyProjectState(res.data);
        handleCloseSplitModal();
    } catch (error: any) {
        splitError.value = error?.message || '未知错误';
    }
};

const handleApplySplitChapters = async () => {
    if (splitPreviewChapters.value.length === 0) {
        splitError.value = '请先生成章节预览。';
        return;
    }
    if (!currentFilePath.value || currentFilePath.value.includes('untitled.json')) {
        splitError.value = '请先创建或打开项目目录后再应用。';
        return;
    }

    const sourceNode = selectedNode.value;
    const existingCount = (sourceNode?.children || []).length;
    
    if (existingCount > 0) {
         confirmModalState.value = {
            isOpen: true,
            title: '确认覆盖拆分',
            message: `当前节点下已有 ${existingCount} 个子节点。此操作将删除这些节点并应用新的拆分结果，且无法撤销。是否继续？`,
            confirmLabel: '覆盖并创建',
            isDestructive: true,
            confirmAction: executeApplySplit
        };
        return;
    }

    await executeApplySplit();
};

const handleStartAiTask = (task: WritingTask) => {
    activeTask.value = task;
    isRightSidebarOpen.value = true;
};

const handleCancelPolishSelection = (payload: { nodeId: string; field: 'summary' | 'content' }) => {
    const task = activeTask.value;
    if (!task || task.type !== 'POLISH_SELECTION') return;
    if (task.nodeId !== payload.nodeId || task.field !== payload.field) return;
    activeTask.value = null;
};

const handleApplyAiTask = async (content: string) => {
    const task = activeTask.value;
    if (!task) return;

    const { nodeId, field, type } = task;
    const node = nodes.value[nodeId];
    if (!node) {
        openAppNotice('error', '应用失败');
        activeTask.value = null;
        return;
    }

    if (type !== 'POLISH_SELECTION') {
        await handleEditorSave(nodeId, field, content);
        activeTask.value = null;
        return;
    }

    const start = task.selectionStart;
    const end = task.selectionEnd;
    const selectionSnapshot = task.selectionSnapshot ?? task.contextData ?? '';
    const currentText = (node[field] || '') as string;

    if (typeof start !== 'number' || typeof end !== 'number' || start < 0 || end <= start || end > currentText.length) {
        openAppNotice('info', '选区已失效');
        activeTask.value = null;
        return;
    }

    if (typeof task.selectionFieldTextSnapshot === 'string' && task.selectionFieldTextSnapshot !== currentText) {
        openAppNotice('info', '选区已失效');
        activeTask.value = null;
        return;
    }

    const currentSlice = currentText.slice(start, end);
    if (!selectionSnapshot || currentSlice !== selectionSnapshot) {
        openAppNotice('info', '选区已失效');
        activeTask.value = null;
        return;
    }

    const replacedText = `${currentText.slice(0, start)}${content}${currentText.slice(end)}`;
    await handleEditorSave(nodeId, field, replacedText);
    activeTask.value = null;
};

const handleCancelAiTask = () => {
    activeTask.value = null;
    // Don't close sidebar automatically to allow user to continue chatting if they want
};

const handleAiConfigChange = (payload: { provider: ProviderId; model: string }) => {
    currentAiProvider.value = payload.provider;
    currentAiModel.value = payload.model || '';
};


</script>
