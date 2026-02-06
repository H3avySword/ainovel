<template>
  <div class="h-full flex flex-col bg-white overflow-hidden relative group">

    <!-- Floating Toolbar -->
    <div
      ref="toolbarRef"
      class="absolute top-0 left-0 right-0 z-50 flex justify-center px-2 transition-all duration-200 ease-out"
      :class="activeField ? 'translate-y-2 opacity-100 pointer-events-auto' : '-translate-y-full opacity-0 pointer-events-none'"
    >
      <div class="w-fit max-w-full rounded-2xl border border-slate-200 bg-white/90 px-2 py-1 shadow-xl shadow-slate-200/50 backdrop-blur-md">
        <div class="inline-flex items-center gap-0.5 whitespace-nowrap">
        <div class="flex items-center gap-0.5 px-1.5 mr-1.5 border-r border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wide select-none">
          {{ activeField === 'summary' ? 'Synopsis' : 'Content' }}
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
          <button @mousedown.prevent @click="startPolishSelection" class="p-1.5 text-purple-500 hover:text-purple-700 hover:bg-purple-50 rounded-lg transition-all" title="AI Polish Selection"><Sparkles :size="17" :stroke-width="2.5" /></button>
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
    <div class="flex-1 overflow-y-auto px-8 pb-12 custom-scrollbar">
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
            class="w-full text-4xl font-bold text-slate-800 placeholder-slate-200 border-none outline-none bg-transparent leading-tight font-serif"
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

          <div v-if="showSummary">
            <div
              v-if="summaryPreview"
              class="h-64 overflow-y-auto custom-scrollbar p-6 prose prose-sm prose-slate max-w-none text-slate-600 font-sans cursor-pointer bg-slate-50 rounded-xl border-2 border-transparent"
              @click="summaryPreview = false; activeField = 'summary'"
              v-html="getPreviewHtml(node.summary || '')"
            ></div>
            <textarea
              v-else
              ref="summaryRef"
              :value="node.summary || ''"
              @focus="activeField = 'summary'"
              @input="(e) => emitChange('summary', (e.target as HTMLTextAreaElement).value)"
              @blur="(e) => emitSave('summary', (e.target as HTMLTextAreaElement).value)"
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
            <!-- Floating Word Count -->
            <div class="absolute top-2 right-2 z-10 text-[10px] text-slate-400 font-mono bg-slate-100/50 backdrop-blur-sm px-2 py-0.5 rounded-full select-none pointer-events-none transition-opacity opacity-50 group-hover/editor:opacity-100">
               {{ (node.content || '').length }} Words
            </div>
            <div
              v-if="contentPreview"
              class="prose prose-slate prose-lg max-w-none font-serif prose-headings:font-sans prose-headings:font-bold prose-p:leading-loose prose-blockquote:border-indigo-300 prose-blockquote:bg-indigo-50/30 prose-blockquote:py-1 prose-blockquote:px-4 prose-blockquote:not-italic min-h-[600px] cursor-pointer p-4 rounded-xl bg-slate-50/50"
              @click="contentPreview = false; activeField = 'content'"
              v-html="getPreviewHtml(node.content || '')"
            ></div>
            <textarea
              v-else
              ref="contentRef"
              :value="node.content || ''"
              @focus="activeField = 'content'"
              @input="(e) => emitChange('content', (e.target as HTMLTextAreaElement).value)"
              @blur="(e) => emitSave('content', (e.target as HTMLTextAreaElement).value)"
              :placeholder="node.type === NodeType.SETTING_ITEM ? 'Enter full setting details...' : 'Start writing your story...'"
              class="w-full min-h-[600px] p-4 rounded-xl bg-slate-50 border-2 border-transparent focus:bg-white focus:border-indigo-100 focus:ring-4 focus:ring-indigo-50/30 outline-none transition-all resize-none text-slate-800 text-lg leading-loose font-serif placeholder-slate-300"
            ></textarea>
          </div>
        </div>

      </div>
    </div>
  </div>

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
    @apply-chapters="emit('apply-split-chapters')"
  />
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { NodeData, NodeType } from '../types';
import { marked } from 'marked';
import SplitNodeDialog from './SplitNodeDialog.vue';
import {
  Bold, Italic, Heading1, Heading2, Quote, List, ListOrdered,
  Eye, Pencil, Code, Minus, Type, ChevronDown, ChevronRight,
  ListTree,
  Wand2, Sparkles
} from 'lucide-vue-next';
import { WritingTask, SplitNodeItem, ProjectMode } from '../types';

const props = defineProps<{
  node: NodeData;
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
  (e: 'open-split-modal'): void;
  (e: 'close-split-modal'): void;
  (e: 'update-split-chapter-count', count: number): void;
  (e: 'generate-split-preview'): void;
  (e: 'update-split-title', index: number, title: string): void;
  (e: 'apply-split-chapters'): void;
}>();

// State
const showSummary = ref(true);
const showContent = ref(true);
const activeField = ref<'summary' | 'content' | null>(null);
const summaryPreview = ref(false);
const contentPreview = ref(false);

const summaryRef = ref<HTMLTextAreaElement | null>(null);
const contentRef = ref<HTMLTextAreaElement | null>(null);
const toolbarRef = ref<HTMLDivElement | null>(null);

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

const emitChange = (field: keyof NodeData, value: string) => {
    emit('change', props.node.id, field, value);
};

const emitSave = (field: keyof NodeData, value: string) => {
    emit('save', props.node.id, field, value);
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
    const preview = mode === 'preview';
    if (activeField.value === 'summary') {
        summaryPreview.value = preview;
    } else if (activeField.value === 'content') {
        contentPreview.value = preview;
    }
};

const getPreviewHtml = (markdown: string) => {
    try {
        if (!markdown) return '<p class="text-slate-300 italic">Empty...</p>';
        return marked.parse(markdown);
    } catch (e) {
        return 'Error rendering markdown';
    }
};

// Click Outside Logic
const handleClickOutside = (event: MouseEvent) => {
    const target = event.target as Node;
    if (toolbarRef.value && toolbarRef.value.contains(target)) return;
    if (summaryRef.value && summaryRef.value.contains(target)) return;
    if (contentRef.value && contentRef.value.contains(target)) return;

    // 澶卞幓鐒︾偣鏃惰嚜鍔ㄥ垏鎹㈠埌棰勮妯″紡
    if (activeField.value === 'summary') {
        summaryPreview.value = true;
    } else if (activeField.value === 'content') {
        contentPreview.value = true;
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

const startPolishSelection = () => {
    const textarea = activeField.value === 'summary' ? summaryRef.value : contentRef.value;
    if(!textarea) return;
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value.substring(start, end);
    
    if(!text || text.trim().length === 0) {
        alert("Please select some text to polish.");
        return;
    }
    
    emit('start-ai-task', {
        id: Date.now().toString(),
        type: 'POLISH_SELECTION',
        nodeId: props.node.id,
        field: activeField.value || 'content',
        contextData: text,
        status: 'IDLE'
    });
};

onMounted(() => {
    document.addEventListener('mousedown', handleClickOutside);
});

onUnmounted(() => {
    document.removeEventListener('mousedown', handleClickOutside);
});
</script>

