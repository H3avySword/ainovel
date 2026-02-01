<template>
    <div class="h-8 bg-white border-b border-indigo-50 flex items-center px-3 select-none drag-region relative z-50">
      <!-- Left Section: App Info + File Controls -->
      <div class="flex items-center gap-3 shrink-0">
        <!-- App Branding -->
        <div class="flex items-center gap-2">
          <WandSparkles :size="15" class="text-indigo-600 fill-indigo-50/50" />
          <div class="flex items-baseline gap-0.5 tracking-[0.1em]">
            <span class="text-[10px] font-black text-slate-800">NEBULA</span>
            <span class="text-[10px] font-bold text-slate-400">WRITE</span>
          </div>
        </div>

        <div class="h-3 w-[1px] bg-slate-200"></div>

        <!-- File Action Buttons -->
        <div class="flex items-center -ml-1 gap-0.5">
          <button
            @click="emit('new')"
            class="p-1.5 hover:bg-slate-100 rounded text-slate-500 hover:text-indigo-600 transition-colors flex items-center gap-1.5 no-drag"
            title="新建小说"
          >
            <FilePlus :size="13" :stroke-width="2.5" />
            <span class="text-[9px] font-medium uppercase tracking-[0.08em] hidden sm:inline">New</span>
          </button>

          <button
            @click="emit('import')"
            class="p-1.5 hover:bg-slate-100 rounded text-slate-500 hover:text-indigo-600 transition-colors flex items-center gap-1.5 no-drag"
            title="导入 (.json)"
          >
            <FolderOpen :size="13" :stroke-width="2.5" />
            <span class="text-[9px] font-medium uppercase tracking-[0.08em] hidden sm:inline">Open</span>
          </button>

          <button
            @click="emit('save')"
            class="p-1.5 hover:bg-slate-100 rounded transition-colors flex items-center gap-1.5 no-drag"
            :class="showSaveSuccess ? 'text-green-600' : 'text-slate-500 hover:text-indigo-600'"
            title="另存为"
          >
            <CheckCircle2 v-if="showSaveSuccess" :size="13" :stroke-width="2.5" class="animate-in zoom-in" />
            <Save v-else :size="13" :stroke-width="2.5" />
            <span class="text-[9px] font-medium uppercase tracking-[0.08em] hidden sm:inline">{{ showSaveSuccess ? 'Saved' : 'Save' }}</span>
          </button>
        </div>
      </div>

      <!-- Center Section: Path Bar (Using Flexbox for safe centering/shrinking) -->
      <div class="flex-1 flex justify-center px-4 min-w-0">
        <div class="h-6 bg-slate-50 border border-slate-200 rounded-md px-3 flex items-center gap-2 cursor-default hover:bg-slate-100 transition-colors group w-full max-w-lg min-w-[200px]">
          <Search :size="12" class="text-slate-300 group-hover:text-indigo-400 transition-colors shrink-0" />
          <span class="text-[10px] text-slate-400 truncate tracking-wide font-normal flex-1 text-center">
            {{ filePath }}
          </span>
        </div>
      </div>

      <!-- Right Section: Window Controls -->
      <div class="flex h-full items-center no-drag shrink-0">
        <button
          @click="minimize"
          class="h-full px-3 flex items-center justify-center hover:bg-slate-100 text-slate-400 transition-colors"
        >
          <Minus :size="14" />
        </button>
        <button
          @click="maximize"
          class="h-full px-3 flex items-center justify-center hover:bg-slate-100 text-slate-400 transition-colors"
        >
          <Square :size="10" />
        </button>
        <button
          @click="close"
          class="h-full px-3 flex items-center justify-center hover:bg-red-500 hover:text-white text-slate-400 transition-colors"
        >
          <X :size="14" />
        </button>
      </div>
    </div>
</template>

<script setup lang="ts">
import { defineProps, defineEmits } from 'vue';
import {
  WandSparkles, Minus, Square, X,
  FilePlus, Save, FolderOpen, CheckCircle2, Search
} from 'lucide-vue-next';

defineProps<{
    showSaveSuccess: boolean;
    filePath: string;
}>();

const emit = defineEmits(['new', 'save', 'import']);

const minimize = () => (window as any).electronAPI?.minimize?.();
const maximize = () => (window as any).electronAPI?.maximize?.();
const close = () => (window as any).electronAPI?.close?.();
</script>
