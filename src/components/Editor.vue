<template>
  <div class="h-full flex flex-col bg-white overflow-hidden relative group">

    <!-- Floating Toolbar -->
    <div
      ref="toolbarRef"
      class="absolute top-0 left-0 right-0 mx-auto w-fit z-50 transition-all duration-200 ease-out"
      :class="activeField ? 'translate-y-2 opacity-100 pointer-events-auto' : '-translate-y-full opacity-0 pointer-events-none'"
    >
      <div class="bg-white/90 backdrop-blur-md border border-slate-200 shadow-xl shadow-slate-200/50 rounded-2xl px-3 py-1.5 flex items-center gap-1">
        <div class="flex items-center gap-0.5 px-2 mr-2 border-r border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-wider select-none">
          {{ activeField === 'summary' ? 'Synopsis' : 'Content' }}
        </div>

        <template v-if="!isPreviewingCurrent">
          <button @mousedown.prevent @click="insertMarkdown('**', '**')" class="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all" title="Bold"><Bold :size="18" :stroke-width="2.5" /></button>
          <button @mousedown.prevent @click="insertMarkdown('*', '*')" class="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all" title="Italic"><Italic :size="18" :stroke-width="2.5" /></button>
          <div class="w-[1px] h-5 bg-slate-200 mx-1"></div>
          <button @mousedown.prevent @click="insertMarkdown('# ')" class="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all" title="Heading 1"><Heading1 :size="18" :stroke-width="2.5" /></button>
          <button @mousedown.prevent @click="insertMarkdown('## ')" class="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all" title="Heading 2"><Heading2 :size="18" :stroke-width="2.5" /></button>
          <div class="w-[1px] h-5 bg-slate-200 mx-1"></div>
          <button @mousedown.prevent @click="insertMarkdown('> ')" class="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all" title="Quote"><Quote :size="18" :stroke-width="2.5" /></button>
          <button @mousedown.prevent @click="insertMarkdown('`', '`')" class="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all" title="Code"><Code :size="18" :stroke-width="2.5" /></button>
          <div class="w-[1px] h-5 bg-slate-200 mx-1"></div>
          <button @mousedown.prevent @click="insertMarkdown('- ')" class="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all" title="List"><List :size="18" :stroke-width="2.5" /></button>
          <button @mousedown.prevent @click="insertMarkdown('1. ')" class="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all" title="Numbered List"><ListOrdered :size="18" :stroke-width="2.5" /></button>
          <button @mousedown.prevent @click="insertMarkdown('---\n')" class="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all" title="Divider"><Minus :size="18" :stroke-width="2.5" /></button>
          <div class="w-[1px] h-5 bg-slate-200 mx-1"></div>
          <button @mousedown.prevent @click="startPolishSelection" class="p-2 text-purple-500 hover:text-purple-700 hover:bg-purple-50 rounded-lg transition-all" title="AI Polish Selection"><Sparkles :size="18" :stroke-width="2.5" /></button>
          <div class="w-[1px] h-5 bg-slate-200 mx-1"></div>
        </template>

        <button
          @mousedown.prevent
          @click="togglePreview"
          class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ml-1"
          :class="isPreviewingCurrent ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'"
        >
          <Eye v-if="isPreviewingCurrent" :size="14" />
          <EyeOff v-else :size="14" />
          <span>{{ isPreviewingCurrent ? 'Preview' : 'Edit' }}</span>
        </button>
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
        <div class="group relative">
          <button
            @click="showSummary = !showSummary"
            class="flex items-center gap-2 text-xs font-bold text-slate-400 mb-2 uppercase tracking-wide transition-colors"
          >
            <ChevronDown v-if="showSummary" :size="14" />
            <ChevronRight v-else :size="14" />
            {{ isContentNode ? "Synopsis / Notes" : "Outline / Description" }}
          </button>
          
          <button 
            @click.stop="startSynopsisGen"
            class="absolute right-0 top-0 p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
            title="Generate with AI"
          >
            <Wand2 :size="16" />
          </button>

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
          <div class="flex justify-between items-center mb-2">
            <button
              @click="showContent = !showContent"
              class="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wide transition-colors"
            >
              <ChevronDown v-if="showContent" :size="14" />
              <ChevronRight v-else :size="14" />
              {{ node.type === NodeType.SETTING_ITEM ? "Detailed Description" : "Story Content" }}
            </button>
            <div class="text-[10px] text-slate-400 font-mono bg-slate-100 px-2 py-0.5 rounded-full select-none">
              {{ (node.content || '').length }} Words
            </div>
          </div>
          
          <!-- Empty Content AI Prompt -->
          <div v-if="!node.content && showContent && !contentPreview" class="mb-4">
             <button 
                @click="startContentGen"
                class="w-full py-3 border-2 border-dashed border-indigo-200 rounded-xl text-indigo-400 font-medium hover:bg-indigo-50 hover:border-indigo-300 transition-all flex items-center justify-center gap-2"
             >
                <Wand2 :size="18" />
                <span>Start writing with AI...</span>
             </button>
          </div>

          <div v-if="showContent">
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
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { NodeData, NodeType } from '../types';
import { marked } from 'marked';
import {
  Bold, Italic, Heading1, Heading2, Quote, List, ListOrdered,
  Eye, EyeOff, Code, Minus, Type, ChevronDown, ChevronRight,
  Wand2, Sparkles
} from 'lucide-vue-next';
import { WritingTask } from '../types';

const props = defineProps<{
  node: NodeData;
}>();

const emit = defineEmits<{
  (e: 'change', id: string, field: keyof NodeData, value: string): void;
  (e: 'save', id: string, field: keyof NodeData, value: string): void;
  (e: 'start-ai-task', task: WritingTask): void;
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

const togglePreview = () => {
    if (activeField.value === 'summary') {
        summaryPreview.value = !summaryPreview.value;
    } else if (activeField.value === 'content') {
        contentPreview.value = !contentPreview.value;
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
