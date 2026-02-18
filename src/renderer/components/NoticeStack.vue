<template>
  <div
    :class="containerClass"
    :style="containerStyle"
    aria-live="polite"
    aria-atomic="true"
  >
    <transition-group
      enter-active-class="transition duration-300 ease-out"
      enter-from-class="opacity-0 -translate-y-2 scale-95"
      enter-to-class="opacity-100 translate-y-0 scale-100"
      leave-active-class="transition duration-200 ease-in"
      leave-from-class="opacity-100 translate-y-0 scale-100"
      leave-to-class="opacity-0 -translate-y-2 scale-95"
      move-class="transition duration-300 ease-out"
    >
      <div
        v-for="notice in items"
        :key="notice.id"
        class="pointer-events-auto flex items-center gap-2 px-4 py-2 rounded-full shadow-lg backdrop-blur-sm shadow-black/5 w-fit max-w-full justify-center"
        :class="notice.type === 'success'
          ? 'bg-emerald-500/85 text-white'
          : notice.type === 'error'
            ? 'bg-rose-500/85 text-white'
            : 'bg-indigo-500/85 text-white'"
      >
        <CheckCircle2 v-if="notice.type === 'success'" :size="16" class="text-white shrink-0" />
        <CircleAlert v-else-if="notice.type === 'error'" :size="16" class="text-white shrink-0" />
        <Info v-else :size="16" class="text-white shrink-0" />

        <span class="text-xs font-medium truncate">{{ notice.title }}</span>
        <span
          v-if="notice.message && notice.message !== notice.title"
          class="text-xs opacity-90 truncate max-w-[150px] border-l border-white/20 pl-2 ml-1"
        >
          {{ notice.message }}
        </span>

        <button
          class="ml-1 p-0.5 rounded hover:bg-white/20 transition-colors shrink-0"
          @click="dismiss(notice.id)"
          aria-label="Dismiss notice"
        >
          <X :size="14" class="text-white" />
        </button>
      </div>
    </transition-group>
  </div>
</template>

<script setup lang="ts">
import { CheckCircle2, CircleAlert, Info, X } from 'lucide-vue-next';
import type { NoticeItem } from '../types';

withDefaults(defineProps<{
  items: NoticeItem[];
  dismiss: (id: number) => void;
  containerClass?: string;
  containerStyle?: Record<string, string>;
}>(), {
  containerClass: 'absolute top-[44px] left-0 right-0 z-40 pointer-events-none px-3 flex flex-col items-center gap-2',
  containerStyle: () => ({})
});
</script>
