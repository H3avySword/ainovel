<template>
  <Teleport to="body">
    <div
      v-if="isOpen"
      ref="menuRef"
      role="toolbar"
      tabindex="-1"
      data-testid="textarea-context-menu"
      class="fixed z-[280] rounded-xl border border-indigo-100 bg-white p-0.5 shadow-2xl shadow-indigo-100/60 animate-in fade-in zoom-in-95 duration-100 outline-none inline-flex items-center gap-px"
      :style="{ left: `${position.x}px`, top: `${position.y}px` }"
      @keydown="handleKeydown"
      @mousedown.stop
      @click.stop
      @contextmenu.prevent
    >
      <template v-for="(item, index) in items" :key="item.id">
        <div
          v-if="item.id === 'polish'"
          class="mx-px h-4 w-px bg-gradient-to-b from-transparent via-indigo-100 to-transparent"
        ></div>
        <button
          type="button"
          role="button"
          :disabled="item.disabled"
          :aria-disabled="item.disabled ? 'true' : 'false'"
          :data-testid="`menu-item-${item.id}`"
          class="relative h-7 w-7 shrink-0 rounded-md transition-all flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/70 focus-visible:ring-offset-1"
          :class="getItemClass(item, index)"
          @mouseenter="handleItemMouseEnter(index)"
          @mouseleave="handleItemMouseLeave"
          @click="handleSelect(item.id)"
        >
          <component :is="getIcon(item.icon)" :size="14" class="shrink-0" />
          <div
            v-if="hoveredIndex === index && !item.disabled"
            class="pointer-events-none absolute left-1/2 top-full z-10 mt-1.5 -translate-x-1/2 whitespace-nowrap rounded-md border border-slate-200/90 bg-white/95 px-2 py-1 text-[11px] font-medium text-slate-700 shadow-lg shadow-slate-200/70"
          >
            {{ item.label }}
          </div>
        </button>
      </template>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, nextTick, onUnmounted, reactive, ref, watch } from 'vue';
import { ClipboardPaste, Copy, Gem, Scissors, TextSelect } from 'lucide-vue-next';
import type { TextareaMenuIcon, TextareaMenuItem } from '../composables/useTextareaContextMenu';

const props = defineProps<{
  isOpen: boolean;
  x: number;
  y: number;
  items: TextareaMenuItem[];
}>();

const emit = defineEmits<{
  (e: 'select', id: string): void;
  (e: 'close'): void;
}>();

const menuRef = ref<HTMLDivElement | null>(null);
const activeIndex = ref(0);
const hoveredIndex = ref<number | null>(null);
const position = reactive({
  x: 0,
  y: 0,
});

const enabledIndexes = computed(() => {
  return props.items.reduce<number[]>((acc, item, index) => {
    if (!item.disabled) {
      acc.push(index);
    }
    return acc;
  }, []);
});

const getIcon = (icon: TextareaMenuIcon) => {
  switch (icon) {
    case 'cut':
      return Scissors;
    case 'copy':
      return Copy;
    case 'paste':
      return ClipboardPaste;
    case 'select-all':
      return TextSelect;
    case 'polish':
      return Gem;
    default:
      return Gem;
  }
};

const setInitialActiveIndex = () => {
  const [firstEnabled] = enabledIndexes.value;
  activeIndex.value = typeof firstEnabled === 'number' ? firstEnabled : 0;
};

const adjustPosition = () => {
  const menu = menuRef.value;
  if (!menu) {
    return;
  }

  const viewportPadding = 8;
  const rect = menu.getBoundingClientRect();
  const maxX = window.innerWidth - rect.width - viewportPadding;
  const maxY = window.innerHeight - rect.height - viewportPadding;

  position.x = Math.max(viewportPadding, Math.min(position.x, maxX));
  position.y = Math.max(viewportPadding, Math.min(position.y, maxY));
};

const moveActive = (delta: 1 | -1) => {
  const items = enabledIndexes.value;
  if (items.length === 0) {
    return;
  }

  const currentIndex = items.indexOf(activeIndex.value);
  const startIndex = currentIndex >= 0 ? currentIndex : 0;
  const next = (startIndex + delta + items.length) % items.length;
  activeIndex.value = items[next];
};

const getItemClass = (item: TextareaMenuItem, index: number) => {
  if (item.disabled) {
    if (item.variant === 'polish') {
      return 'text-indigo-200 bg-indigo-50/40 cursor-not-allowed';
    }
    return 'text-slate-300 bg-slate-50/40 cursor-not-allowed';
  }

  const keyboardActive = activeIndex.value === index;
  if (item.variant === 'polish') {
    return [
      'font-semibold shadow-sm transition-all',
      keyboardActive
        ? 'bg-indigo-600 text-white'
        : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white',
    ];
  }

  return [
    'text-slate-700',
    keyboardActive ? 'bg-slate-100' : 'hover:bg-slate-50',
  ];
};

const handleSelect = (id: string) => {
  const item = props.items.find((entry) => entry.id === id);
  if (!item || item.disabled) {
    return;
  }
  emit('select', id);
};

const handleItemMouseEnter = (index: number) => {
  hoveredIndex.value = index;
  if (props.items[index]?.disabled) {
    return;
  }
  activeIndex.value = index;
};

const handleItemMouseLeave = () => {
  hoveredIndex.value = null;
};

const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    event.preventDefault();
    emit('close');
    return;
  }

  if (event.key === 'ArrowRight' || (event.key === 'Tab' && !event.shiftKey)) {
    event.preventDefault();
    moveActive(1);
    return;
  }

  if (event.key === 'ArrowLeft' || (event.key === 'Tab' && event.shiftKey)) {
    event.preventDefault();
    moveActive(-1);
    return;
  }

  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    const item = props.items[activeIndex.value];
    if (item && !item.disabled) {
      emit('select', item.id);
    }
  }
};

const handleDocumentPointerDown = (event: MouseEvent) => {
  const target = event.target as Node;
  if (menuRef.value?.contains(target)) {
    return;
  }
  emit('close');
};

const handleDocumentContextMenu = (event: MouseEvent) => {
  const target = event.target as Node;
  if (menuRef.value?.contains(target)) {
    return;
  }
  emit('close');
};

const handleDocumentKeydown = (event: KeyboardEvent) => {
  if (!props.isOpen) {
    return;
  }
  if (event.key === 'Escape' || event.key === 'ArrowRight' || event.key === 'ArrowLeft' || event.key === 'Tab' || event.key === 'Enter' || event.key === ' ') {
    handleKeydown(event);
  }
};

watch(
  () => props.isOpen,
  async (open) => {
    if (!open) {
      hoveredIndex.value = null;
      return;
    }

    position.x = props.x;
    position.y = props.y;
    setInitialActiveIndex();

    await nextTick();
    adjustPosition();
  },
  { immediate: true }
);

watch(
  () => [props.x, props.y, props.items.length],
  async () => {
    if (!props.isOpen) {
      return;
    }
    position.x = props.x;
    position.y = props.y;
    setInitialActiveIndex();
    await nextTick();
    adjustPosition();
  }
);

watch(
  () => props.isOpen,
  (open) => {
    if (open) {
      document.addEventListener('mousedown', handleDocumentPointerDown);
      document.addEventListener('contextmenu', handleDocumentContextMenu);
      document.addEventListener('keydown', handleDocumentKeydown);
      return;
    }
    document.removeEventListener('mousedown', handleDocumentPointerDown);
    document.removeEventListener('contextmenu', handleDocumentContextMenu);
    document.removeEventListener('keydown', handleDocumentKeydown);
  },
  { immediate: true }
);

onUnmounted(() => {
  document.removeEventListener('mousedown', handleDocumentPointerDown);
  document.removeEventListener('contextmenu', handleDocumentContextMenu);
  document.removeEventListener('keydown', handleDocumentKeydown);
});
</script>
