<template>
    <div class="h-full flex flex-col bg-slate-50/50 border-r border-slate-200/60 backdrop-blur-xl">
        <!-- Tab Switcher -->
        <div class="p-3 pb-2">
            <div class="bg-slate-200/50 p-1 rounded-lg grid grid-cols-2 gap-1 relative isolate">
                <!-- Sliding Background Pill -->
                <div
                    class="absolute top-1 bottom-1 left-1 bg-white rounded-md shadow-sm transition-transform duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)]"
                    :style="{
                        width: 'calc(50% - 6px)',
                        transform: activeTab === 'WORLD' ? 'translateX(calc(100% + 4px))' : 'translateX(0)'
                    }"
                />

                <button
                    @click="switchTab('STORY')"
                    class="relative z-10 flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-md flex items-center justify-center gap-1.5 transition-colors"
                    :class="activeTab === 'STORY' ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-700'"
                >
                    <BookOpen :size="12" /> Story
                </button>
                <button
                    @click="switchTab('WORLD')"
                    class="relative z-10 flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-md flex items-center justify-center gap-1.5 transition-colors"
                    :class="activeTab === 'WORLD' ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-700'"
                >
                    <Globe :size="12" /> World
                </button>
            </div>
        </div>

        <div class="flex-1 overflow-y-auto custom-scrollbar pt-2 flex flex-col">
            <template v-if="activeTab === 'STORY'">
                <TreeItem
                    v-if="nodes['story-root']"
                    nodeId="story-root"
                    :level="0"
                    :nodes="nodes"
                    :selectedId="selectedId"
                    :editingId="editingId"
                    :projectMode="projectMode"
                    @select="handleSelect"
                    @toggle="handleToggle"
                    @add="handleAdd"
                    @delete="handleDelete"
                    @rename-start="handleRenameStart"
                    @rename-save="handleRenameSave"
                    @rename-cancel="handleRenameCancel"
                />
            </template>
            <template v-else>
                <TreeItem
                    v-if="nodes['setting-root']"
                    nodeId="setting-root"
                    :level="0"
                    :nodes="nodes"
                    :selectedId="selectedId"
                    :editingId="editingId"
                    :projectMode="projectMode"
                    @select="handleSelect"
                    @toggle="handleToggle"
                    @add="handleAdd"
                    @delete="handleDelete"
                    @rename-start="handleRenameStart"
                    @rename-save="handleRenameSave"
                    @rename-cancel="handleRenameCancel"
                />
            </template>

            <!-- Interaction Hint -->
            <div class="sticky bottom-0 mt-auto px-8 pb-4 opacity-80 hover:opacity-100 transition-opacity select-none">
                <div class="flex items-center justify-center gap-2 text-[10px] text-slate-400 border-t border-dashed border-slate-100 pt-3">
                    <MousePointer2 :size="12" />
                    <span>悬停节点可显示编辑选项</span>
                </div>
            </div>
        </div>

        <!-- Footer Info -->
        <div class="p-4 border-t border-slate-100 bg-slate-50">
            <div class="flex items-center justify-between text-[10px] text-slate-400 font-medium">
                <div class="flex items-center gap-1.5">
                    <Layers :size="10" class="text-slate-400" />
                    <span>层级：{{ projectMode === 'LONG' ? '总纲 > 卷 > 篇 > 章' : '总纲 > 章' }}</span>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NodeMap, NodeType, ProjectMode } from '../types';
import { BookOpen, Globe, MousePointer2, Layers } from 'lucide-vue-next';
import TreeItem from './TreeItem.vue';

const props = defineProps<{
    nodes: NodeMap;
    selectedId: string;
    projectMode: ProjectMode;
}>();

const emit = defineEmits<{
    (e: 'select', id: string): void;
    (e: 'toggle', id: string): void;
    (e: 'add', parentId: string, type: NodeType): void;
    (e: 'delete', id: string): void;
    (e: 'rename', id: string, newTitle: string): void;
}>();

type Tab = 'STORY' | 'WORLD';
const activeTab = ref<Tab>('STORY');
const editingId = ref<string | null>(null);

const switchTab = (tab: Tab) => {
    if (activeTab.value !== tab) {
        activeTab.value = tab;
        emit('select', '');
    }
};

// Event Wrappers
const handleSelect = (id: string) => emit('select', id);
const handleToggle = (id: string) => emit('toggle', id);
const handleAdd = (parentId: string, type: NodeType) => emit('add', parentId, type);
const handleDelete = (id: string) => emit('delete', id);
const handleRenameStart = (id: string) => editingId.value = id;
const handleRenameSave = (id: string, title: string) => {
    emit('rename', id, title);
    editingId.value = null;
};
const handleRenameCancel = () => editingId.value = null;
</script>
