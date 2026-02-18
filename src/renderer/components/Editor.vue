<template>
  <div class="h-full flex flex-col bg-white overflow-hidden relative group">

    <!-- Floating Toolbar -->
    <div
      ref="toolbarRef"
      class="absolute top-0 left-0 right-0 z-50 flex justify-center px-2 transition-all duration-200 ease-out"
      :class="activeField === 'summary' ? 'translate-y-2 opacity-100 pointer-events-auto' : '-translate-y-full opacity-0 pointer-events-none'"
    >
      <div class="w-fit max-w-full rounded-2xl border border-slate-200 bg-white/90 px-2 py-1 shadow-xl shadow-slate-200/50 backdrop-blur-md">
        <div class="inline-flex items-center gap-0.5 whitespace-nowrap">
        <div class="flex items-center gap-0.5 px-1.5 mr-1.5 border-r border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wide select-none">
          Synopsis
        </div>

          <button @mousedown.prevent @click="insertMarkdown('**', '**')" class="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all" title="Bold"><Bold :size="17" :stroke-width="2.5" /></button>
          <button @mousedown.prevent @click="insertMarkdown('*', '*')" class="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all" title="Italic"><Italic :size="17" :stroke-width="2.5" /></button>
          <div class="w-[1px] h-5 bg-slate-200 mx-0.5"></div>
          <button @mousedown.prevent @click="insertMarkdown('# ')" class="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all" title="Heading 1"><Heading1 :size="17" :stroke-width="2.5" /></button>
          <button @mousedown.prevent @click="insertMarkdown('## ')" class="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all" title="Heading 2"><Heading2 :size="17" :stroke-width="2.5" /></button>
          <div class="w-[1px] h-5 bg-slate-200 mx-0.5"></div>
          <button @mousedown.prevent @click="insertMarkdown('> ')" class="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all" title="Quote"><Quote :size="17" :stroke-width="2.5" /></button>
          <button @mousedown.prevent @click="insertMarkdown('`', '`')" class="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all" title="Code"><Code :size="17" :stroke-width="2.5" /></button>
          <div class="w-[1px] h-5 bg-slate-200 mx-0.5"></div>
          <button @mousedown.prevent @click="insertMarkdown('- ')" class="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all" title="List"><List :size="17" :stroke-width="2.5" /></button>
          <button @mousedown.prevent @click="insertMarkdown('1. ')" class="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all" title="Numbered List"><ListOrdered :size="17" :stroke-width="2.5" /></button>
          <button @mousedown.prevent @click="insertMarkdown('---\n')" class="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all" title="Divider"><Minus :size="17" :stroke-width="2.5" /></button>
          <div class="w-[1px] h-5 bg-slate-200 mx-0.5"></div>
          <button @mousedown.prevent @click="startPolishSelection" class="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white shadow-sm transition-all" title="AI Polish Selection"><Gem :size="17" :stroke-width="2.5" /></button>
          <div class="w-[1px] h-5 bg-slate-200 mx-0.5"></div>

        <div class="ml-0.5 rounded-xl bg-slate-100/90 p-1 grid grid-cols-2 gap-0.5 relative isolate">
          <div
            class="absolute top-1 bottom-1 left-1 rounded-lg bg-white shadow-sm transition-transform duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)]"
            :style="{
              width: 'calc(50% - 4px)',
              transform: isPreviewingCurrent ? 'translateX(calc(100%))' : 'translateX(0)'
            }"
          />
          <button
            @mousedown.prevent
            @click="setPreviewMode('edit')"
            class="relative z-10 flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors"
            :class="!isPreviewingCurrent ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-700'"
            title="Edit"
          >
            <Pencil :size="13" />
            <span class="hidden lg:inline">Edit</span>
          </button>
          <button
            @mousedown.prevent
            @click="setPreviewMode('preview')"
            class="relative z-10 flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors"
            :class="isPreviewingCurrent ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-700'"
            title="Preview"
          >
            <Eye :size="13" />
            <span class="hidden lg:inline">Preview</span>
          </button>
        </div>
        </div>
      </div>
    </div>

    <!-- Scrollable Content Area -->
    <div ref="editorScrollRef" class="flex-1 overflow-y-auto px-8 pb-12 custom-scrollbar">
      <div class="max-w-3xl mx-auto space-y-8 mt-6">

        <!-- Metadata & Title -->
        <div>
          <div class="flex items-center gap-2 mb-6 opacity-40 hover:opacity-100 transition-opacity select-none">
            <span class="text-[10px] font-bold uppercase tracking-widest text-slate-500 border border-slate-200 px-2 py-0.5 rounded">
              {{ getTypeLabel(node.type) }}
            </span>
            <span class="text-[10px] text-slate-400 font-mono">
              #{{ node.id.split('-').pop() }}
            </span>
          </div>
          <input
            type="text"
            :value="node.title"
            @input="(e) => emitChange('title', (e.target as HTMLInputElement).value)"
            @blur="(e) => emitSave('title', (e.target as HTMLInputElement).value)"
            @keydown.enter="(e) => emitSave('title', (e.target as HTMLInputElement).value)"
            :placeholder="node.type === NodeType.ROOT ? 'Novel Title' : 'Untitled'"
            class="w-full text-4xl font-bold text-slate-800 placeholder-slate-200 border-none outline-none focus-visible:ring-2 focus-visible:ring-indigo-200 rounded-lg bg-transparent leading-tight font-serif"
          />
        </div>

        <!-- Summary Section -->
        <div class="group">
          <div class="flex items-center justify-between mb-3 relative">
            <button
              @click="showSummary = !showSummary"
              class="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wide transition-colors"
            >
              <ChevronDown v-if="showSummary" :size="14" />
              <ChevronRight v-else :size="14" />
              {{ isContentNode ? "Synopsis / Notes" : "Outline / Description" }}
            </button>

            <div class="flex items-center gap-1">
              <button
                v-if="canSplitNode"
                @click.stop="emit('open-split-modal')"
                class="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white shadow-sm transition-all"
                :title="`一键拆分${splitTargetLabel}：按目标数量自动生成${splitTargetLabel}列表`"
              >
                <ListTree :size="16" />
              </button>
              <button
                @click.stop="startSynopsisGen"
                class="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white shadow-sm transition-all"
                title="Generate with AI"
              >
                <Wand2 :size="16" />
              </button>
            </div>
          </div>

          <div v-if="showSummary" class="relative">
            <div
              v-if="inlineNotice.visible && inlineNotice.field === 'summary'"
              class="absolute inset-x-0 -top-3 z-20 flex justify-center pointer-events-none"
            >
              <div class="pointer-events-auto flex items-center gap-2 px-4 py-2 rounded-full shadow-lg bg-indigo-500/85 text-white">
                <Info :size="16" class="shrink-0" />
                <span class="text-sm font-medium">{{ inlineNotice.title }}</span>
                <button
                  class="ml-1 p-0.5 rounded hover:bg-white/20 transition-colors"
                  @click="dismissInlineNotice"
                  aria-label="Dismiss notice"
                >
                  <X :size="14" />
                </button>
              </div>
            </div>
            <div
              v-if="summaryPreview"
              ref="summaryPreviewRef"
              class="h-64 overflow-y-auto custom-scrollbar p-6 prose prose-sm prose-slate max-w-none text-slate-600 font-sans cursor-pointer bg-slate-50 rounded-xl border-2 border-transparent"
              :class="getPreviewContainerClass('summary')"
              @scroll="handlePreviewScroll('summary')"
              @click="openEditorField('summary')"
              v-html="getPreviewHtml('summary', node.summary || '')"
            ></div>
            <textarea
              v-else
              ref="summaryRef"
              data-testid="summary-textarea"
              :value="node.summary || ''"
              @focus="handleEditorFocus('summary')"
              @contextmenu="(e) => handleTextareaContextMenu(e as MouseEvent, 'summary')"
              @scroll="handleEditorScroll('summary')"
              @input="(e) => handleEditorInput('summary', (e.target as HTMLTextAreaElement).value)"
              @blur="(e) => handleEditorBlur('summary', (e.target as HTMLTextAreaElement).value)"
              :placeholder="isContentNode ? 'Briefly describe this entry...' : 'Write your outline here...'"
              class="w-full h-64 custom-scrollbar p-4 rounded-xl bg-slate-50 border-2 border-transparent focus:bg-white focus:border-indigo-100 focus:ring-4 focus:ring-indigo-50/30 outline-none transition-all resize-none text-slate-600 text-sm leading-relaxed"
            ></textarea>
          </div>
        </div>


        <!-- Main Content -->
        <div v-if="isContentNode" class="group animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div class="flex justify-between items-center mb-3 relative">
            <button
              @click="showContent = !showContent"
              class="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wide transition-colors"
            >
              <ChevronDown v-if="showContent" :size="14" />
              <ChevronRight v-else :size="14" />
              {{ node.type === NodeType.SETTING_ITEM ? "Detailed Description" : "Story Content" }}
            </button>
            
            <div class="flex items-center gap-1">
              <button
                 @click.stop="startContentGen"
                 class="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white shadow-sm transition-all"
                 title="AI Continue Writing"
              >
                 <Wand2 :size="16" />
              </button>
            </div>
          </div>

          <div v-if="showContent" class="relative group/editor">
            <div
              v-if="inlineNotice.visible && inlineNotice.field === 'content'"
              class="absolute inset-x-0 -top-3 z-20 flex justify-center pointer-events-none"
            >
              <div class="pointer-events-auto flex items-center gap-2 px-4 py-2 rounded-full shadow-lg bg-indigo-500/85 text-white">
                <Info :size="16" class="shrink-0" />
                <span class="text-sm font-medium">{{ inlineNotice.title }}</span>
                <button
                  class="ml-1 p-0.5 rounded hover:bg-white/20 transition-colors"
                  @click="dismissInlineNotice"
                  aria-label="Dismiss notice"
                >
                  <X :size="14" />
                </button>
              </div>
            </div>
            <!-- Floating Word Count -->
            <div class="absolute top-2 right-2 z-10 text-[10px] text-slate-400 font-mono bg-slate-100/50 backdrop-blur-sm px-2 py-0.5 rounded-full select-none pointer-events-none transition-opacity opacity-50 group-hover/editor:opacity-100">
               {{ (node.content || '').length }} Words
            </div>
            <textarea
              ref="contentRef"
              data-testid="content-textarea"
              :value="node.content || ''"
              @focus="handleEditorFocus('content')"
              @contextmenu="(e) => handleTextareaContextMenu(e as MouseEvent, 'content')"
              @scroll="handleEditorScroll('content')"
              @input="(e) => handleEditorInput('content', (e.target as HTMLTextAreaElement).value)"
              @blur="(e) => handleEditorBlur('content', (e.target as HTMLTextAreaElement).value)"
              :placeholder="node.type === NodeType.SETTING_ITEM ? 'Enter full setting details...' : 'Start writing your story...'"
              class="w-full min-h-[600px] p-4 rounded-xl bg-slate-50 border-2 border-transparent focus:bg-white focus:border-indigo-100 focus:ring-4 focus:ring-indigo-50/30 outline-none transition-all resize-none text-slate-800 text-lg leading-loose font-serif placeholder-slate-300"
            ></textarea>
          </div>
        </div>

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

  <SplitNodeDialog
    :isOpen="isSplitModalOpen"
    :isGenerating="isSplitGenerating"
    :chapterCount="splitChapterCount"
    :previewChapters="splitPreviewChapters"
    :error="splitError"
    :targetLabel="splitTargetLabel"
    @close="emit('close-split-modal')"
    @update-chapter-count="(count: number) => emit('update-split-chapter-count', count)"
    @generate-preview="emit('generate-split-preview')"
    @update-title="(index: number, title: string) => emit('update-split-title', index, title)"
    @update-summary="(index: number, summary: string) => emit('update-split-summary', index, summary)"
    @apply-chapters="emit('apply-split-chapters')"
  />
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue';
import { NodeData, NodeType, WritingTask, SplitNodeItem, ProjectMode, NoticeType } from '../types';
import { marked } from 'marked';
import SplitNodeDialog from './SplitNodeDialog.vue';
import TextareaContextMenu from './TextareaContextMenu.vue';
import { useTextareaContextMenu } from '../composables/useTextareaContextMenu';
import {
  Bold, Italic, Heading1, Heading2, Quote, List, ListOrdered,
  Eye, Pencil, Code, Minus, Type, ChevronDown, ChevronRight,
  ListTree,
  Wand2, Gem, Info, X
} from 'lucide-vue-next';

const props = defineProps<{
  node: NodeData;
  activeTask: WritingTask | null;
  projectMode: ProjectMode;
  isSplitModalOpen: boolean;
  isSplitGenerating: boolean;
  splitChapterCount: number;
  splitPreviewChapters: SplitNodeItem[];
  splitError: string;
  canSplitNode: boolean;
  splitTargetLabel: string;
  splitCounterSuffix: string;
}>();

const emit = defineEmits<{
  (e: 'change', id: string, field: keyof NodeData, value: string): void;
  (e: 'save', id: string, field: keyof NodeData, value: string): void;
  (e: 'start-ai-task', task: WritingTask): void;
  (e: 'notice', payload: {
    type: NoticeType;
    title: string;
    message?: string;
    anchor?: 'textarea';
    anchorPoint?: { left: number; top: number };
  }): void;
  (e: 'open-split-modal'): void;
  (e: 'close-split-modal'): void;
  (e: 'update-split-chapter-count', count: number): void;
  (e: 'generate-split-preview'): void;
  (e: 'update-split-title', index: number, title: string): void;
  (e: 'update-split-summary', index: number, summary: string): void;
  (e: 'apply-split-chapters'): void;
  (e: 'cancel-polish-selection', payload: { nodeId: string; field: 'summary' | 'content' }): void;
}>();

// State
const showSummary = ref(true);
const showContent = ref(true);
const activeField = ref<'summary' | 'content' | null>(null);
const summaryPreview = ref(true);
const contentPreview = ref(false);

const summaryRef = ref<HTMLTextAreaElement | null>(null);
const contentRef = ref<HTMLTextAreaElement | null>(null);
const summaryPreviewRef = ref<HTMLDivElement | null>(null);
const contentPreviewRef = ref<HTMLDivElement | null>(null);
const toolbarRef = ref<HTMLDivElement | null>(null);
const editorScrollRef = ref<HTMLDivElement | null>(null);
const {
    menuState: textareaMenuState,
    menuItems: textareaMenuItems,
    openFromEvent: openTextareaMenuFromEvent,
    closeMenu: closeTextareaMenu,
    runAction: runTextareaMenuAction,
} = useTextareaContextMenu();

type ActiveField = 'summary' | 'content';
type ScrollMode = 'edit' | 'preview';
const scrollRatios = ref<Record<ActiveField, number>>({
  summary: 0,
  content: 0,
});
const isRestoringScroll = ref<Record<ActiveField, boolean>>({
  summary: false,
  content: false,
});
const inlineNotice = ref<{ visible: boolean; title: string; field: ActiveField | null }>({
    visible: false,
    title: '',
    field: null,
});
let inlineNoticeTimer: ReturnType<typeof setTimeout> | null = null;

const getTypeLabel = (type: NodeType) => {
    switch (type) {
      case NodeType.ROOT: return "Novel Outline (Total)";
      case NodeType.VOLUME: return "Volume Outline (Juan)";
      case NodeType.SECTION: return "Section Outline (Pian)";
      case NodeType.CHAPTER: return "Chapter Content";
      case NodeType.SETTING_ROOT: return "World Settings Database";
      case NodeType.SETTING_FOLDER: return "Settings Group";
      case NodeType.SETTING_ITEM: return "Setting Detail";
      default: return "Content";
    }
};

const isContentNode = computed(() => props.node.type === NodeType.CHAPTER || props.node.type === NodeType.SETTING_ITEM);
const isPreviewingCurrent = computed(() => activeField.value === 'summary' ? summaryPreview.value : contentPreview.value);
const activePolishTask = computed(() => {
    if (!props.activeTask || props.activeTask.type !== 'POLISH_SELECTION') {
        return null;
    }
    if (props.activeTask.nodeId !== props.node.id) {
        return null;
    }
    return props.activeTask;
});

const getTextareaByField = (field: ActiveField) => {
    return field === 'summary' ? summaryRef.value : contentRef.value;
};

const getPreviewScrollElementByField = (field: ActiveField) => {
    return field === 'summary' ? summaryPreviewRef.value : contentPreviewRef.value;
};

const handleTextareaContextMenu = (event: MouseEvent, field: ActiveField) => {
    const target = getTextareaByField(field);
    if (!target) {
        return;
    }

    activeField.value = field;
    openTextareaMenuFromEvent(event, target, {
        showPolish: true,
        supportsPolish: true,
        onPolish: (textarea) => {
            startPolishSelectionByField(field, textarea);
        },
    });
};

const handleTextareaMenuSelect = async (actionId: string) => {
    await runTextareaMenuAction(actionId as 'cut' | 'copy' | 'paste' | 'select-all' | 'polish');
};

const clamp = (value: number, min: number, max: number) => {
    return Math.max(min, Math.min(max, value));
};

const getScrollElement = (field: ActiveField, mode: ScrollMode): HTMLElement | null => {
    if (mode === 'edit') {
        return getTextareaByField(field);
    }
    return getPreviewScrollElementByField(field);
};

const readScrollRatio = (element: HTMLElement | null): number | null => {
    if (!element || !element.isConnected) {
        return null;
    }
    if (element.clientHeight <= 0 || element.scrollHeight <= 0) {
        return null;
    }
    const maxScroll = element.scrollHeight - element.clientHeight;
    if (maxScroll <= 0) {
        return 0;
    }
    return clamp(element.scrollTop / maxScroll, 0, 1);
};

const applyScrollRatio = (element: HTMLElement | null, ratio: number) => {
    if (!element) {
        return;
    }
    const maxScroll = element.scrollHeight - element.clientHeight;
    if (maxScroll <= 0) {
        element.scrollTop = 0;
        return;
    }
    element.scrollTop = clamp(ratio, 0, 1) * maxScroll;
};

const captureRatio = (field: ActiveField, mode: ScrollMode, options: { force?: boolean } = {}) => {
    if (!options.force && isRestoringScroll.value[field]) {
        return;
    }
    const element = getScrollElement(field, mode);
    const ratio = readScrollRatio(element);
    if (ratio === null) {
        return;
    }
    scrollRatios.value[field] = ratio;
};

const restoreRatio = async (field: ActiveField, mode: ScrollMode, shouldFocus = false) => {
    isRestoringScroll.value[field] = true;
    await nextTick();
    const ratio = scrollRatios.value[field];
    const applyRatio = () => {
        applyScrollRatio(getScrollElement(field, mode), ratio);
    };
    const finalizeRestore = () => {
        isRestoringScroll.value[field] = false;
        captureRatio(field, mode, { force: true });
    };

    if (shouldFocus && mode === 'edit') {
        const textarea = getTextareaByField(field);
        if (textarea) {
            try {
                textarea.focus({ preventScroll: true });
            } catch {
                textarea.focus();
            }
        }
    }

    applyRatio();
    // Multiple passes avoid focus/layout side effects forcing scrollTop back to 0.
    requestAnimationFrame(() => {
        applyRatio();
        requestAnimationFrame(() => {
            applyRatio();
            setTimeout(finalizeRestore, 0);
        });
    });
};

const cancelPolishSelectionIfNeeded = (field: ActiveField) => {
    const task = activePolishTask.value;
    if (!task) {
        return;
    }
    emit('cancel-polish-selection', {
        nodeId: props.node.id,
        field
    });
};

const switchFieldToPreview = (field: ActiveField) => {
    captureRatio(field, 'edit');
    if (field === 'summary') {
        summaryPreview.value = true;
        void restoreRatio(field, 'preview');
    } else {
        contentPreview.value = false;
    }
    activeField.value = null;
};

const getPreviewContainerClass = (field: ActiveField) => {
    const task = activePolishTask.value;
    const isActive = !!task && task.field === field;
    const selectionLength = typeof task?.selectionSnapshot === 'string'
        ? task.selectionSnapshot.length
        : typeof task?.contextData === 'string'
            ? task.contextData.length
            : 0;
    return {
        'ai-polish-preview-active': isActive,
        'ai-polish-static': isActive && selectionLength > POLISH_ANIMATION_MAX_CHARS,
    };
};

const openEditorField = (field: ActiveField) => {
    cancelPolishSelectionIfNeeded(field);
    captureRatio(field, 'preview');
    if (field === 'summary') {
        summaryPreview.value = false;
    } else {
        contentPreview.value = false;
    }
    activeField.value = field;
    void restoreRatio(field, 'edit', true);
};

const handleEditorFocus = (field: ActiveField) => {
    activeField.value = field;
};

const handleEditorScroll = (field: ActiveField) => {
    captureRatio(field, 'edit');
};

const handlePreviewScroll = (field: ActiveField) => {
    captureRatio(field, 'preview');
};

const handleEditorInput = (field: ActiveField, value: string) => {
    emitChange(field, value);
    requestAnimationFrame(() => captureRatio(field, 'edit'));
};

const handleEditorBlur = (field: ActiveField, value: string) => {
    captureRatio(field, 'edit');
    const textarea = getTextareaByField(field);
    const stateValue = field === 'summary'
        ? (props.node.summary || '')
        : (props.node.content || '');
    const blurValue = textarea?.value ?? value ?? '';
    const valueToSave = blurValue === '' && stateValue !== '' ? stateValue : blurValue;
    emitSave(field, valueToSave);
    requestAnimationFrame(() => {
        const activeTextarea = getTextareaByField(field);
        if (!activeTextarea) {
            return;
        }
        if (document.activeElement === activeTextarea) {
            return;
        }
        if (activeField.value !== field) {
            return;
        }
        switchFieldToPreview(field);
    });
};

const emitChange = (field: keyof NodeData, value: string) => {
    emit('change', props.node.id, field, value);
};

const emitSave = (field: keyof NodeData, value: string) => {
    emit('save', props.node.id, field, value);
};

const dismissInlineNotice = () => {
    if (inlineNoticeTimer) {
        clearTimeout(inlineNoticeTimer);
        inlineNoticeTimer = null;
    }
    inlineNotice.value = {
        visible: false,
        title: '',
        field: null,
    };
};

const showInlineNotice = (field: ActiveField, title: string) => {
    dismissInlineNotice();
    inlineNotice.value = {
        visible: true,
        title,
        field,
    };
    inlineNoticeTimer = setTimeout(() => {
        dismissInlineNotice();
    }, 2200);
};

// Markdown Logic
const insertMarkdown = (prefix: string, suffix: string = '') => {
    if (!activeField.value) return;

    const textarea = activeField.value === 'summary' ? summaryRef.value : contentRef.value;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentText = (activeField.value === 'summary' ? props.node.summary : props.node.content) || '';

    const before = currentText.substring(0, start);
    const selection = currentText.substring(start, end);
    const after = currentText.substring(end);

    const newText = `${before}${prefix}${selection}${suffix}${after}`;

    // Update State
    emitChange(activeField.value, newText);

    // Restore Focus & Cursor
    setTimeout(() => {
        textarea.focus();
        const newCursorPos = start + prefix.length + selection.length + suffix.length;
        textarea.setSelectionRange(
            start + prefix.length,
            selection.length ? start + prefix.length + selection.length : newCursorPos
        );
    }, 0);
};

const setPreviewMode = (mode: 'edit' | 'preview') => {
    const field = activeField.value;
    if (!field) return;
    const toPreview = mode === 'preview';

    if (toPreview) {
        switchFieldToPreview(field);
        return;
    }

    cancelPolishSelectionIfNeeded(field);
    captureRatio(field, 'preview');
    if (field === 'summary') {
        summaryPreview.value = false;
    } else {
        contentPreview.value = false;
    }
    void restoreRatio(field, 'edit', true);
};

const POLISH_SELECTION_START_TOKEN = 'POLISH_SELECTION_START_TOKEN';
const POLISH_SELECTION_END_TOKEN = 'POLISH_SELECTION_END_TOKEN';
const POLISH_ANIMATION_MAX_CHARS = 240;

type HighlightRange = {
    start: number;
    end: number;
};

type HighlightMarkers = {
    start: string;
    end: string;
};

type HighlightInjectionResult = {
    markdown: string;
    markers: HighlightMarkers | null;
};

const resolveHighlightRange = (markdown: string, task: WritingTask): HighlightRange | null => {
    const start = task.selectionStart;
    const end = task.selectionEnd;
    const snapshot = task.selectionSnapshot ?? task.contextData ?? '';

    if (typeof start !== 'number' || typeof end !== 'number') {
        return null;
    }
    if (start < 0 || end <= start || end > markdown.length) {
        return null;
    }
    if (!snapshot || markdown.slice(start, end) !== snapshot) {
        return null;
    }

    return { start, end };
};

const createHighlightMarkers = (markdown: string): HighlightMarkers => {
    let startMarker = '';
    let endMarker = '';

    do {
        const nonce = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
        startMarker = `${POLISH_SELECTION_START_TOKEN}_${nonce}`;
        endMarker = `${POLISH_SELECTION_END_TOKEN}_${nonce}`;
    } while (markdown.includes(startMarker) || markdown.includes(endMarker));

    return {
        start: startMarker,
        end: endMarker,
    };
};

const applyPolishHighlightToMarkdown = (field: ActiveField, markdown: string): HighlightInjectionResult => {
    const task = activePolishTask.value;
    if (!task || task.field !== field) {
        return {
            markdown,
            markers: null,
        };
    }

    const range = resolveHighlightRange(markdown, task);
    if (!range) {
        return {
            markdown,
            markers: null,
        };
    }

    const markers = createHighlightMarkers(markdown);
    return {
        markdown: `${markdown.slice(0, range.start)}${markers.start}${markdown.slice(range.start, range.end)}${markers.end}${markdown.slice(range.end)}`,
        markers,
    };
};

const stripHighlightMarkers = (html: string, markers: HighlightMarkers) => {
    return html
        .split(markers.start).join('')
        .split(markers.end).join('');
};

const collectTextNodes = (root: Node) => {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const textNodes: Text[] = [];
    while (walker.nextNode()) {
        const current = walker.currentNode;
        if (current instanceof Text) {
            textNodes.push(current);
        }
    }
    return textNodes;
};

const extractMarkerBoundary = (textNodes: Text[], marker: string) => {
    for (const node of textNodes) {
        const value = node.nodeValue || '';
        const index = value.indexOf(marker);
        if (index < 0) {
            continue;
        }

        node.nodeValue = `${value.slice(0, index)}${value.slice(index + marker.length)}`;
        return {
            node,
            offset: index,
        };
    }
    return null;
};

const applyPolishHighlightToHtml = (html: string, markers: HighlightMarkers | null) => {
    if (!markers) {
        return html;
    }
    if (!html.includes(markers.start) || !html.includes(markers.end)) {
        return html;
    }
    if (typeof document === 'undefined') {
        return stripHighlightMarkers(html, markers);
    }

    const container = document.createElement('div');
    container.innerHTML = html;

    const textNodes = collectTextNodes(container);
    const startBoundary = extractMarkerBoundary(textNodes, markers.start);
    const endBoundary = extractMarkerBoundary(textNodes, markers.end);

    if (!startBoundary || !endBoundary) {
        return stripHighlightMarkers(html, markers);
    }
    if (startBoundary.node === endBoundary.node && endBoundary.offset <= startBoundary.offset) {
        return stripHighlightMarkers(html, markers);
    }

    const range = document.createRange();
    range.setStart(startBoundary.node, startBoundary.offset);
    range.setEnd(endBoundary.node, endBoundary.offset);

    const segments: Array<{ node: Text; start: number; end: number }> = [];
    for (const node of textNodes) {
        const value = node.nodeValue || '';
        if (!value) {
            continue;
        }
        if (!range.intersectsNode(node)) {
            continue;
        }

        const segmentStart = node === startBoundary.node ? startBoundary.offset : 0;
        const segmentEnd = node === endBoundary.node ? endBoundary.offset : value.length;
        if (segmentEnd <= segmentStart) {
            continue;
        }

        segments.push({
            node,
            start: segmentStart,
            end: segmentEnd,
        });
    }

    for (let i = segments.length - 1; i >= 0; i -= 1) {
        const { node, start, end } = segments[i];
        const value = node.nodeValue || '';
        if (!value) {
            continue;
        }

        const before = value.slice(0, start);
        const target = value.slice(start, end);
        const after = value.slice(end);

        const fragment = document.createDocumentFragment();
        if (before) {
            fragment.appendChild(document.createTextNode(before));
        }
        if (target) {
            const mark = document.createElement('mark');
            mark.className = 'ai-polish-highlight';
            mark.dataset.aiPolish = 'active';
            mark.textContent = target;
            fragment.appendChild(mark);
        }
        if (after) {
            fragment.appendChild(document.createTextNode(after));
        }

        node.parentNode?.replaceChild(fragment, node);
    }

    return container.innerHTML;
};

const getPreviewHtml = (field: ActiveField, markdown: string) => {
    try {
        if (!markdown) return '<p class="text-slate-300 italic">Empty...</p>';

        const injectionResult = applyPolishHighlightToMarkdown(field, markdown);
        const raw = marked.parse(injectionResult.markdown);
        const html = typeof raw === 'string' ? raw : String(raw);
        return applyPolishHighlightToHtml(html, injectionResult.markers);
    } catch (e) {
        return 'Error rendering markdown';
    }
};

// Click Outside Logic
const handleClickOutside = (event: MouseEvent) => {
    const targetElement = event.target as HTMLElement | null;
    if (targetElement?.closest('[data-testid="textarea-context-menu"]')) return;
    const target = event.target as Node;
    if (toolbarRef.value && toolbarRef.value.contains(target)) return;
    if (summaryRef.value && summaryRef.value.contains(target)) return;
    if (contentRef.value && contentRef.value.contains(target)) return;

    // When focus leaves the editor area, return fields to preview state.
    if (activeField.value === 'summary') {
        const sourceMode: ScrollMode = summaryPreview.value ? 'preview' : 'edit';
        captureRatio('summary', sourceMode);
        if (!summaryPreview.value) {
            summaryPreview.value = true;
            void restoreRatio('summary', 'preview');
        }
    } else if (activeField.value === 'content') {
        captureRatio('content', 'edit');
        contentPreview.value = false;
    }
    activeField.value = null;
};

// AI Actions
const startSynopsisGen = () => {
    emit('start-ai-task', {
        id: Date.now().toString(),
        type: 'SYNOPSIS',
        nodeId: props.node.id,
        field: 'summary',
        status: 'IDLE'
    });
};

const startContentGen = () => {
     emit('start-ai-task', {
        id: Date.now().toString(),
        type: 'CONTENT',
        nodeId: props.node.id,
        field: 'content',
        status: 'IDLE'
    });
};

const startPolishSelectionByField = (selectedField: ActiveField, textarea: HTMLTextAreaElement | null) => {
    if (!textarea) {
        return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value.substring(start, end);

    if (!text || text.trim().length === 0) {
        showInlineNotice(selectedField, '请先选择文本');
        return;
    }

    emit('start-ai-task', {
        id: Date.now().toString(),
        type: 'POLISH_SELECTION',
        nodeId: props.node.id,
        field: selectedField,
        contextData: text,
        selectionStart: start,
        selectionEnd: end,
        selectionSnapshot: text,
        selectionFieldTextSnapshot: textarea.value,
        status: 'IDLE'
    });

    textarea.blur();
    if (selectedField === 'summary') {
        switchFieldToPreview(selectedField);
    } else {
        contentPreview.value = false;
        activeField.value = null;
    }
};

const startPolishSelection = () => {
    const selectedField = activeField.value;
    if (!selectedField) {
        return;
    }

    const textarea = selectedField === 'summary' ? summaryRef.value : contentRef.value;
    startPolishSelectionByField(selectedField, textarea);
};

watch(
    () => props.node.id,
    () => {
        activeField.value = null;
        summaryPreview.value = true;
        contentPreview.value = false;
        scrollRatios.value = {
            summary: 0,
            content: 0,
        };
        dismissInlineNotice();
    }
);

onMounted(() => {
    document.addEventListener('mousedown', handleClickOutside);
});

onUnmounted(() => {
    document.removeEventListener('mousedown', handleClickOutside);
    if (inlineNoticeTimer) {
        clearTimeout(inlineNoticeTimer);
        inlineNoticeTimer = null;
    }
});
</script>

