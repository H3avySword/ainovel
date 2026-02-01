<template>
  <div v-if="node">
    <div
      class="group flex items-center py-1.5 pr-3 cursor-pointer text-sm select-none transition-all"
      :class="isSelected ? 'bg-indigo-50 text-indigo-900 font-medium' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'"
      :style="{ paddingLeft: paddingLeft }"
      @click.stop="emit('select', node.id)"
    >
      <!-- Toggle Arrow -->
      <div
        class="p-0.5 mr-1.5 rounded-md hover:bg-black/5 text-slate-400 transition-colors"
        :class="{ 'invisible': !hasChildren && !nextType }"
        @click.stop="emit('toggle', node.id)"
      >
        <ChevronDown v-if="isExpanded" :size="12" />
        <ChevronRight v-else :size="12" />
      </div>

      <!-- Icon -->
      <component
        :is="iconComponent"
        :size="14"
        class="mr-2.5 flex-shrink-0"
        :class="isSelected ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-500'"
      />

      <!-- Title or Input -->
      <input
        v-if="isEditing"
        ref="inputRef"
        v-model="internalEditValue"
        @blur="saveRename"
        @keydown.enter="saveRename"
        @keydown.esc="cancelRename"
        @click.stop
        class="flex-1 min-w-0 bg-white border border-indigo-300 rounded px-1.5 py-0.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-100 shadow-sm"
      />
      <span v-else class="flex-1 truncate text-xs tracking-wide">
        {{ node.title || "未命名" }}
      </span>

      <!-- Hover Actions -->
      <div v-if="!isEditing" class="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          @click.stop="startRename"
          title="重命名"
          class="p-1 hover:bg-white rounded text-slate-400 hover:text-indigo-600 transition-colors hover:shadow-sm"
        >
          <Edit2 :size="11" />
        </button>

        <button
          v-if="nextType"
          @click.stop="emit('add', node.id, nextType)"
          :title="'添加' + nextTypeLabel"
          class="p-1 hover:bg-white rounded text-slate-400 hover:text-indigo-600 transition-colors hover:shadow-sm"
        >
          <Plus :size="13" />
        </button>

        <button
           v-if="node.type !== NodeType.ROOT && node.type !== NodeType.SETTING_ROOT"
           @click.stop="emit('delete', node.id)"
           title="删除"
           class="p-1 hover:bg-white rounded text-slate-400 hover:text-red-500 transition-colors hover:shadow-sm"
        >
          <Trash2 :size="13" />
        </button>
      </div>
    </div>

    <!-- Recursive Children -->
    <div v-if="isExpanded && hasChildren" class="relative">
      <TreeItem
        v-for="childId in node.children"
        :key="childId"
        :nodeId="childId"
        :level="level + 1"
        :nodes="nodes"
        :selectedId="selectedId"
        :editingId="editingId"
        :projectMode="projectMode"
        @select="(id) => emit('select', id)"
        @toggle="(id) => emit('toggle', id)"
        @add="(pid, type) => emit('add', pid, type)"
        @delete="(id) => emit('delete', id)"
        @rename-start="(id, title) => emit('rename-start', id, title)"
        @rename-save="(id, title) => emit('rename-save', id, title)"
        @rename-cancel="emit('rename-cancel')"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, nextTick } from 'vue';
import { NodeMap, NodeType, ProjectMode } from '../types';
import {
    Folder, FileText, ChevronRight, ChevronDown, Plus,
    BookOpen, Trash2, Globe, Library, File, Edit2
} from 'lucide-vue-next';

// Recursive Self Reference
defineOptions({
  name: 'TreeItem'
});

const props = defineProps<{
    nodeId: string;
    level: number;
    nodes: NodeMap;
    selectedId: string;
    editingId: string | null;
    projectMode: ProjectMode;
}>();

const emit = defineEmits<{
    (e: 'select', id: string): void;
    (e: 'toggle', id: string): void;
    (e: 'add', parentId: string, type: NodeType): void;
    (e: 'delete', id: string): void;
    (e: 'rename-start', id: string, title: string): void;
    (e: 'rename-save', id: string, title: string): void;
    (e: 'rename-cancel'): void;
}>();

const node = computed(() => props.nodes[props.nodeId]);
const hasChildren = computed(() => node.value.children && node.value.children.length > 0);
const isExpanded = computed(() => node.value.expanded);
const isSelected = computed(() => props.selectedId === props.nodeId);
const isEditing = computed(() => props.editingId === props.nodeId);
const paddingLeft = computed(() => `${props.level * 12 + 16}px`);

// Helper logic duplicated from React
const getNextNodeType = (type: NodeType): NodeType | null => {
    if (props.projectMode === 'SHORT') {
        switch (type) {
            case NodeType.ROOT: return NodeType.CHAPTER;
            case NodeType.SETTING_ROOT: return NodeType.SETTING_FOLDER;
            case NodeType.SETTING_FOLDER: return NodeType.SETTING_ITEM;
            default: return null;
        }
    } else {
        switch (type) {
            case NodeType.ROOT: return NodeType.VOLUME;
            case NodeType.VOLUME: return NodeType.SECTION;
            case NodeType.SECTION: return NodeType.CHAPTER;
            case NodeType.SETTING_ROOT: return NodeType.SETTING_FOLDER;
            case NodeType.SETTING_FOLDER: return NodeType.SETTING_ITEM;
            default: return null;
        }
    }
};

const nextType = computed(() => getNextNodeType(node.value.type));

const getTypeLabel = (type: NodeType) => {
    switch (type) {
        case NodeType.VOLUME: return "卷";
        case NodeType.SECTION: return "篇";
        case NodeType.CHAPTER: return "章";
        case NodeType.SETTING_FOLDER: return "文件夹";
        case NodeType.SETTING_ITEM: return "条目";
        default: return "";
    }
};

const nextTypeLabel = computed(() => nextType.value ? getTypeLabel(nextType.value) : '');

const iconComponent = computed(() => {
    const type = node.value.type;
    switch (type) {
        case NodeType.ROOT: return BookOpen;
        case NodeType.VOLUME: return Library;
        case NodeType.SECTION: return Folder;
        case NodeType.CHAPTER: return FileText;
        case NodeType.SETTING_ROOT: return Globe;
        case NodeType.SETTING_FOLDER: return Folder;
        case NodeType.SETTING_ITEM: return File;
        default: return FileText;
    }
});

// Editing Logic
const inputRef = ref<HTMLInputElement | null>(null);
const internalEditValue = ref('');

const startRename = () => {
    internalEditValue.value = node.value.title;
    emit('rename-start', node.value.id, node.value.title);
};

const saveRename = () => {
    if (internalEditValue.value.trim()) {
        emit('rename-save', node.value.id, internalEditValue.value.trim());
    } else {
        cancelRename();
    }
};

const cancelRename = () => {
    emit('rename-cancel');
};

watch(isEditing, async (newVal) => {
    if (newVal) {
        internalEditValue.value = node.value.title;
        await nextTick();
        inputRef.value?.focus();
        inputRef.value?.select();
    }
});

</script>
