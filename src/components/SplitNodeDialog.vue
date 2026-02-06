<template>
  <Teleport to="body">
    <div
      v-if="isOpen"
      class="fixed inset-0 z-[220] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm px-4 animate-in fade-in duration-200"
      @click.self="emit('close')"
    >
      <div class="w-full max-w-2xl rounded-2xl border border-white/20 bg-white shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 relative">
        <div class="px-6 pt-8 pb-4 flex flex-col items-center justify-center text-center relative pointer-events-none">
          <button
            @click="emit('close')"
            class="pointer-events-auto absolute right-4 top-4 p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors"
            title="关闭"
          >
            <X :size="20" stroke-width="2" />
          </button>

          <div class="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4 shadow-sm">
            <ListTree :size="24" stroke-width="2" />
          </div>

          <h3 class="text-xl font-bold text-slate-800 tracking-tight">AI 智能拆分</h3>
          <p class="text-xs text-slate-400 mt-1 font-medium">自动规划与生成{{ targetLabelText }}结构</p>
        </div>

        <div class="px-8 pb-8 space-y-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
          <div class="flex flex-col items-center gap-4">
            <div class="flex items-center gap-2 bg-slate-50 p-1 rounded-xl border border-slate-100">
              <button
                class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white hover:shadow-sm text-slate-400 hover:text-indigo-600 transition-all font-bold"
                @click="adjustChapterCount(-1)"
              >
                <Minus :size="14" />
              </button>
              <div class="flex flex-col items-center w-24">
                <span class="text-[10px] text-slate-400 uppercase font-bold tracking-wider">预计{{ targetNodeName }}数量</span>
                <div class="flex items-baseline gap-0.5">
                  <span class="text-lg font-bold text-slate-700">{{ chapterCount }}</span>
                  <span class="text-xs text-slate-400">{{ targetNodeName }}</span>
                </div>
              </div>
              <button
                class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white hover:shadow-sm text-slate-400 hover:text-indigo-600 transition-all font-bold"
                @click="adjustChapterCount(1)"
              >
                <span class="text-lg leading-none transform -translate-y-0.5">+</span>
              </button>
            </div>

            <button
              v-if="previewChapters.length > 0"
              @click="emit('generate-preview')"
              :disabled="isGenerating"
              class="text-xs font-bold text-indigo-600 hover:text-indigo-700 hover:underline disabled:opacity-50 disabled:no-underline transition-colors flex items-center gap-1.5"
            >
              <Loader2 v-if="isGenerating" :size="12" class="animate-spin" />
              <RotateCw v-else :size="12" />
              <span>{{ isGenerating ? '正在思考结构...' : `重新生成${targetLabelText}预览` }}</span>
            </button>
          </div>

          <div v-if="error" class="text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3 flex items-center gap-2 justify-center">
            <AlertTriangle :size="14" />
            {{ error }}
          </div>

          <div v-if="previewChapters.length > 0" class="space-y-3">
            <div class="flex items-center justify-between text-[10px] px-1 text-slate-400 font-bold uppercase tracking-wider">
              <span>{{ targetLabelText }}预览结果</span>
              <span>{{ previewChapters.length }} ITEMS</span>
            </div>

            <div class="space-y-2">
              <div
                v-for="(item, index) in previewChapters"
                :key="`split-${index}`"
                class="group relative rounded-xl border border-slate-100 bg-slate-50/30 p-1 hover:bg-white hover:shadow-md hover:border-indigo-100 transition-all duration-300"
              >
                <div class="flex items-center gap-3 p-2">
                  <div class="flex-shrink-0 w-6 h-6 rounded bg-white border border-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-400 group-hover:text-indigo-500 group-hover:border-indigo-100 transition-colors">
                    {{ index + 1 }}
                  </div>
                  <input
                    type="text"
                    :value="item.title"
                    @input="(e) => emit('update-title', index, (e.target as HTMLInputElement).value)"
                    class="flex-1 h-8 px-2 rounded-lg bg-transparent hover:bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-200 border border-transparent outline-none text-sm font-bold text-slate-700 transition-all placeholder-slate-300"
                    :placeholder="`${targetNodeName}标题`"
                  />
                </div>
                <div v-if="item.summary" class="px-3 pb-3 pt-0">
                  <div class="text-xs leading-relaxed text-slate-500 pl-9">
                    {{ item.summary }}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div v-else-if="!isGenerating" class="py-8 flex flex-col items-center justify-center space-y-6 text-center">
            <div class="w-16 h-16 rounded-full bg-indigo-50 flex items-center justify-center mb-2">
              <Sparkles :size="32" class="text-indigo-500" stroke-width="1.5" />
            </div>
            <div class="max-w-xs space-y-1">
              <h4 class="text-sm font-bold text-slate-800">准备就绪</h4>
              <p class="text-xs text-slate-400 leading-relaxed">
                请在上方设置栏中调整预计{{ targetNodeName }}数量，完成后点击下方按钮开始生成。
              </p>
            </div>
            <button
              @click="emit('generate-preview')"
              class="px-8 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-lg shadow-indigo-200 hover:shadow-indigo-300 hover:-translate-y-0.5 transition-all flex items-center gap-2"
            >
              <Wand2 :size="16" />
              <span>开始生成{{ targetLabelText }}</span>
            </button>
          </div>

          <div v-else class="py-12 flex flex-col items-center justify-center space-y-4 text-slate-400">
            <Loader2 :size="32" class="animate-spin text-indigo-500" />
            <div class="text-xs font-medium animate-pulse">正在构建{{ targetLabelText }}结构...</div>
          </div>
        </div>

        <div class="px-8 pb-8 pt-2 flex flex-col gap-3">
          <button
            @click="emit('apply-chapters')"
            :disabled="previewChapters.length === 0 || isGenerating"
            class="w-full h-11 rounded-xl text-sm font-bold bg-indigo-600 text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700 hover:shadow-indigo-300 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none transition-all flex items-center justify-center gap-2"
          >
            <span>确认拆分</span>
            <CheckCircle2 :size="16" />
          </button>
          <button
            @click="emit('close')"
            class="w-full h-9 rounded-xl text-xs font-bold text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors"
          >
            取消
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import {
  X, ListTree, Minus, Loader2, RotateCw, AlertTriangle, CheckCircle2, Wand2, Sparkles
} from 'lucide-vue-next';
import { SplitNodeItem } from '../types';

const props = defineProps<{
  isOpen: boolean;
  isGenerating: boolean;
  chapterCount: number;
  previewChapters: SplitNodeItem[];
  error: string;
  targetLabel: string;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'update-chapter-count', count: number): void;
  (e: 'generate-preview'): void;
  (e: 'update-title', index: number, title: string): void;
  (e: 'apply-chapters'): void;
}>();

const targetLabelText = computed(() => {
  const label = (props.targetLabel || '').trim();
  return label || '子节点';
});

const targetNodeName = computed(() => {
  const label = targetLabelText.value;
  if (!label) return '章节';
  return label.endsWith('纲') ? label.slice(0, -1) : label;
});

const adjustChapterCount = (delta: number) => {
  const nextValue = Math.max(2, Math.min(50, props.chapterCount + delta));
  emit('update-chapter-count', nextValue);
};
</script>
