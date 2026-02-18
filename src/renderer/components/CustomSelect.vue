<template>
  <div class="relative w-full custom-select-root" ref="containerRef">
    <!-- Trigger Button -->
    <button
      type="button"
      @click="toggle"
      :disabled="disabled"
      class="w-full h-9 pl-3 pr-9 text-left bg-slate-50 border rounded text-xs transition-all focus:outline-none flex items-center"
      :class="[
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-indigo-300',
        isOpen ? 'border-indigo-400 text-slate-700' : 'border-slate-200 text-slate-700'
      ]"
    >
      <span class="block truncate">{{ modelValue || placeholder }}</span>
      <span
        class="absolute right-1 top-1 bottom-1 w-7 rounded-md flex items-center justify-center text-slate-400 pointer-events-none transition-colors"
        :class="isOpen ? 'bg-slate-100 text-indigo-600' : ''"
      >
        <ChevronDown :size="14" class="shrink-0 transition-transform duration-200" :class="{ 'rotate-180': isOpen }" />
      </span>
    </button>

    <!-- Dropdown Portal -->
    <Teleport to="body">
      <div
        v-if="isOpen"
        ref="dropdownRef"
        class="fixed z-[9999] custom-select-dropdown bg-white border border-indigo-100 rounded-lg shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100 flex flex-col"
        :style="dropdownStyle"
      >
        <div class="overflow-y-auto max-h-60 py-1 custom-scrollbar flex-1">
            <div
                v-for="option in options"
                :key="option"
                @click="select(option)"
                @mouseenter="(e) => handleOptionTooltipEnter(e, option)"
                @mouseleave="hideOptionTooltip"
                class="relative px-3 py-2 text-xs cursor-pointer transition-colors flex items-center justify-between hover:bg-indigo-50 group"
                :class="option === modelValue ? 'bg-indigo-50/50 text-indigo-700 font-medium' : 'text-slate-700'"
            >
                <span class="truncate pr-2">{{ option }}</span>
                <Check v-if="option === modelValue" :size="12" class="text-indigo-600 shrink-0" />
            </div>
            <div v-if="options.length === 0" class="px-3 py-2 text-xs text-slate-400 italic text-center">
                No options available
            </div>
        </div>
      </div>
      <div
        v-if="optionTooltip.visible"
        class="pointer-events-none fixed z-[10000] whitespace-nowrap rounded-md border border-slate-200/90 bg-white/95 px-2 py-1 text-[11px] font-medium text-slate-700 shadow-lg shadow-slate-200/70"
        :style="{ left: `${optionTooltip.x}px`, top: `${optionTooltip.y}px`, transform: 'translate(-50%, 0)' }"
      >
        {{ optionTooltip.text }}
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue';
import { ChevronDown, Check } from 'lucide-vue-next';

const props = defineProps<{
  modelValue: string;
  options: string[];
  placeholder?: string;
  disabled?: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
}>();

const isOpen = ref(false);
const containerRef = ref<HTMLDivElement | null>(null);
const dropdownRef = ref<HTMLDivElement | null>(null);
const optionTooltip = ref({
  visible: false,
  x: 0,
  y: 0,
  text: '',
});
const position = ref({ top: 0, left: 0, width: 0 });

const dropdownStyle = computed(() => ({
  top: `${position.value.top}px`,
  left: `${position.value.left}px`,
  width: `${position.value.width}px`
}));

const updatePosition = () => {
    if (containerRef.value) {
        const rect = containerRef.value.getBoundingClientRect();
        // Check if menu goes off screen bottom
        const spaceBelow = window.innerHeight - rect.bottom;
        const estimatedHeight = Math.min(props.options.length * 32 + 10, 240); // crude estimate
        
        // Simple positioning: align bottom of trigger + gap
        position.value = {
            top: rect.bottom + 4, 
            left: rect.left,
            width: rect.width
        };
    }
};

const toggle = async () => {
    if (props.disabled) return;
    
    if (isOpen.value) {
        isOpen.value = false;
    } else {
        updatePosition();
        isOpen.value = true;
        // Wait for render to maybe adjust? Not needed for basic top/left
    }
};

const select = (option: string) => {
    emit('update:modelValue', option);
    optionTooltip.value.visible = false;
    isOpen.value = false;
};

const handleOptionTooltipEnter = (event: MouseEvent, text: string) => {
    optionTooltip.value = {
        visible: true,
        x: event.clientX,
        y: event.clientY + 20,
        text,
    };
};

const hideOptionTooltip = () => {
    optionTooltip.value.visible = false;
};

const close = (e: Event) => {
  if (!isOpen.value) return;
  const target = e.target as Node;
    
    if (containerRef.value && containerRef.value.contains(target)) return;
  if (dropdownRef.value && dropdownRef.value.contains(target)) return;

  optionTooltip.value.visible = false;
  isOpen.value = false;
};

const handleScroll = (e: Event) => {
  if (!isOpen.value) return;
    // Close if scrolling happens outside the dropdown
    // This is simple but effective to prevent detached menus
    if (dropdownRef.value && dropdownRef.value.contains(e.target as Node)) {
        return; 
    }
    optionTooltip.value.visible = false;
    isOpen.value = false;
};

const handleResize = () => {
    if (isOpen.value) {
        optionTooltip.value.visible = false;
        isOpen.value = false;
    }
};

onMounted(() => {
    window.addEventListener('mousedown', close);
    // Capture scroll on window to detect scroll in parents
    window.addEventListener('scroll', handleScroll, { capture: true });
    window.addEventListener('resize', handleResize);
});

onUnmounted(() => {
    window.removeEventListener('mousedown', close);
    window.removeEventListener('scroll', handleScroll, { capture: true });
    window.removeEventListener('resize', handleResize);
});
</script>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: #cbd5e1;
  border-radius: 4px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background-color: #94a3b8;
}
</style>
