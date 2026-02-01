<template>
  <div v-if="!appConfig" class="flex flex-col h-screen w-screen items-center justify-center bg-slate-50 space-y-4 animate-in fade-in">
    <Loader2 :size="48" class="animate-spin text-indigo-600" />
    <div class="text-slate-600 font-medium text-lg">正在启动 AI 创作引擎...</div>
    <div class="text-sm text-slate-400">正在寻找可用端口并建立安全连接</div>
  </div>

  <div v-else class="flex flex-col h-screen w-screen bg-slate-50 text-slate-900 font-sans overflow-hidden">
    <!-- TitleBar -->
    <TitleBar
      :showSaveSuccess="showSaveSuccess"
      :filePath="currentFilePath"
      @new="handleNewNovel"
      @save="handleSaveNovel"
      @import="handleImportClick"
    />
    <input
        type="file"
        ref="fileInputRef"
        @change="handleFileImport"
        accept=".json"
        class="hidden"
    />

    <div class="flex-1 flex overflow-hidden">
        <!-- LEFT SIDEBAR -->
        <div
          class="transition-all duration-300 ease-in-out overflow-hidden flex-shrink-0 relative shadow-xl shadow-indigo-100/20 z-10"
          :class="isLeftSidebarOpen ? 'w-64' : 'w-0'"
        >
          <TreeSidebar
            :nodes="nodes"
            :selectedId="selectedId"
            :projectMode="projectMode"
            @select="handleSelect"
            @toggle="handleToggle"
            @add="handleAdd"
            @delete="handleDelete"
            @rename="handleRename"
          />
        </div>

        <!-- MAIN CONTENT AREA -->
        <div class="flex-1 flex flex-col min-w-0 h-full relative z-0 bg-white border-l border-slate-100">

           <!-- Toolbar / Header -->
           <div class="h-14 bg-white/80 backdrop-blur grid grid-cols-3 items-center px-6 sticky top-0 z-20 border-b border-slate-100">
             <!-- Left: Sidebar Toggle -->
             <div class="flex items-center gap-4">
               <button
                 @click="isLeftSidebarOpen = !isLeftSidebarOpen"
                 class="p-2 hover:bg-slate-50 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
                 title="显示/隐藏侧边栏"
               >
                 <SidebarClose v-if="isLeftSidebarOpen" :size="18" />
                 <SidebarOpen v-else :size="18" />
               </button>
             </div>

             <!-- Center: Novel Mode Label -->
             <div class="flex items-center justify-center">
               <div
                 class="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all duration-300"
                 :class="projectMode === 'LONG' ? 'bg-indigo-50 text-indigo-600' : 'bg-emerald-50 text-emerald-600'"
               >
                 <BookText v-if="projectMode === 'LONG'" :size="14" />
                 <ScrollText v-else :size="14" />
                 <span>{{ projectMode === 'LONG' ? '长篇小说' : '短篇小说' }}</span>
               </div>
             </div>

             <!-- Right: AI Toggle -->
             <div class="flex items-center justify-end gap-2">
               <button
                 @click="isRightSidebarOpen = !isRightSidebarOpen"
                 class="flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all"
                 :class="isRightSidebarOpen ? 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100' : 'bg-indigo-600 text-white shadow-md shadow-indigo-200'"
               >
                 {{ isRightSidebarOpen ? "关闭 AI" : "开启 AI" }}
                 <SidebarOpen v-if="isRightSidebarOpen" :size="16" class="rotate-180" />
                 <SidebarClose v-else :size="16" class="rotate-180" />
               </button>
             </div>
           </div>

           <div class="flex-1 overflow-hidden relative">
             <Editor
               v-if="selectedNode"
               :node="selectedNode"
               @change="handleChange"
               @save="handleEditorSave"
               @start-ai-task="handleStartAiTask"
             />
             <div v-else class="h-full flex flex-col items-center justify-center text-slate-300 space-y-4">
                <div class="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center">
                  <div class="w-8 h-8 rounded bg-slate-200"></div>
                </div>
                <p>请在侧边栏选择章节或设置开始创作</p>
             </div>
           </div>
        </div>

        <!-- RIGHT SIDEBAR -->
        <div
          class="transition-all duration-300 ease-in-out overflow-hidden flex-shrink-0 bg-white z-10 shadow-[-5px_0_30px_-5px_rgba(0,0,0,0.03)]"
          :class="isRightSidebarOpen ? 'w-72 lg:w-80' : 'w-0'"
        >
          <AIChatPanel
            :nodes="nodes"
            :selectedId="selectedId"
            :projectMode="projectMode"
            :filePath="currentFilePath"
            :appConfig="appConfig"
            :activeTask="activeTask"
            @apply-task="handleApplyAiTask"
            @cancel-task="handleCancelAiTask"
          />
        </div>
    </div>

    <!-- NEW NOVEL MODAL -->
    <div v-if="showNewModal" class="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
        <div class="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-white/20 animate-in zoom-in-95 duration-200">
            <div class="px-8 pt-8 pb-6 flex justify-between items-start">
              <div>
                <h3 class="text-2xl font-bold text-slate-800">新建创作</h3>
                <p class="text-sm text-slate-400 mt-1">请选择作品的结构模式，创建后无法更改模式。</p>
              </div>
              <button
                @click="showNewModal = false"
                class="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors"
                title="关闭"
              >
                <CloseIcon :size="20" />
              </button>
            </div>

            <div class="px-8 pb-10 grid grid-cols-2 gap-4">
              <button
                @click="createNewProject('LONG')"
                class="group flex flex-col items-center text-center p-6 rounded-2xl border-2 border-slate-100 hover:border-indigo-500 hover:bg-indigo-50/30 transition-all"
              >
                <div class="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center mb-4 group-hover:bg-indigo-100 transition-colors">
                  <BookText :size="32" class="text-indigo-600" />
                </div>
                <div class="font-bold text-slate-700">长篇小说</div>
                <div class="text-[10px] text-slate-400 mt-2 leading-relaxed">
                  总纲 &gt; 卷 &gt; 篇 &gt; 章<br />适合架构复杂的宏大叙事
                </div>
              </button>

              <button
                @click="createNewProject('SHORT')"
                class="group flex flex-col items-center text-center p-6 rounded-2xl border-2 border-slate-100 hover:border-emerald-500 hover:bg-emerald-50/30 transition-all"
              >
                <div class="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center mb-4 group-hover:bg-emerald-100 transition-colors">
                  <ScrollText :size="32" class="text-emerald-600" />
                </div>
                <div class="font-bold text-slate-700">短篇小说</div>
                <div class="text-[10px] text-slate-400 mt-2 leading-relaxed">
                  总纲 &gt; 章<br />适合结构精简的轻量创作
                </div>
              </button>
            </div>
        </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, toRaw } from 'vue';
import { NodeMap, NodeType, ProjectMode, NodeData, AppConfig, WritingTask } from './types';
import { FileManager } from './services/FileManager';
import TitleBar from './components/TitleBar.vue';
import TreeSidebar from './components/TreeSidebar.vue';
import Editor from './components/Editor.vue';
import AIChatPanel from './components/AIChatPanel.vue';
import {
  SidebarClose, SidebarOpen, BookText, ScrollText, X as CloseIcon, Loader2
} from 'lucide-vue-next';

// --- Logic Helpers ---
const getInitialNodes = (mode: ProjectMode): NodeMap => {
  const nodes: NodeMap = {
    'story-root': {
      id: 'story-root',
      type: NodeType.ROOT,
      title: '未命名作品',
      content: '',
      summary: '在这里写下你的小说总纲...',
      parentId: null,
      children: mode === 'LONG' ? ['vol-1'] : ['chap-1'],
      expanded: true
    },
    'setting-root': {
      id: 'setting-root',
      type: NodeType.SETTING_ROOT,
      title: '世界设定',
      content: '',
      summary: '管理角色、地理 and 世界观。',
      parentId: null,
      children: [],
      expanded: true
    }
  };

  if (mode === 'LONG') {
    nodes['vol-1'] = {
      id: 'vol-1',
      type: NodeType.VOLUME,
      title: '第一卷：初入尘世',
      content: '',
      summary: '本卷讲述主角初次离开家乡的故事。',
      parentId: 'story-root',
      children: ['sec-1'],
      expanded: true
    };
    nodes['sec-1'] = {
      id: 'sec-1',
      type: NodeType.SECTION,
      title: '第一篇：少年游',
      content: '',
      summary: '描述少年在路上的见闻。',
      parentId: 'vol-1',
      children: ['chap-1'],
      expanded: true
    };
    nodes['chap-1'] = {
      id: 'chap-1',
      type: NodeType.CHAPTER,
      title: '第一章：启程',
      content: '清晨的阳光透过窗帘...',
      summary: '主角醒来，准备开始旅程。',
      parentId: 'sec-1',
      children: []
    };
  } else {
    nodes['chap-1'] = {
      id: 'chap-1',
      type: NodeType.CHAPTER,
      title: '第一章：启程',
      content: '清晨的阳光透过窗帘...',
      summary: '主角醒来，准备开始旅程。',
      parentId: 'story-root',
      children: []
    };
  }
  return nodes;
};

// --- State ---
const projectMode = ref<ProjectMode>('LONG');
const nodes = ref<NodeMap>(getInitialNodes('LONG'));
const selectedId = ref('story-root');
const isLeftSidebarOpen = ref(true);
const isRightSidebarOpen = ref(true);
const showSaveSuccess = ref(false);
const showNewModal = ref(false);
const currentFilePath = ref("Documents/NebulaWrite/untitled.json");
const appConfig = ref<AppConfig | null>(null);
const activeTask = ref<WritingTask | null>(null);

const fileInputRef = ref<HTMLInputElement | null>(null);

const selectedNode = computed(() => nodes.value[selectedId.value]);

// --- Init Sidecar & Auto Load ---
onMounted(async () => {
    if ((window as any).electronAPI) {
        // 1. Get Config
        const config = await (window as any).electronAPI.getAppConfig();
        if (config && config.isReady) {
            appConfig.value = config;
        } else {
            (window as any).electronAPI.onBackendReady(async () => {
                const newConfig = await (window as any).electronAPI.getAppConfig();
                appConfig.value = newConfig;
            });
        }

        // 2. Load Last Project
        try {
            if ((window as any).electronAPI?.getLastProject) {
                const lastPath = await (window as any).electronAPI.getLastProject();
                if (lastPath) {
                    const data = await (window as any).electronAPI.loadProject(lastPath);
                    if (data) {
                        if (data.nodes) {
                            nodes.value = data.nodes;
                            projectMode.value = data.projectMode || 'LONG';
                            selectedId.value = data.lastOpenedId && data.nodes[data.lastOpenedId] ? data.lastOpenedId : 'story-root';
                            currentFilePath.value = lastPath;
                        }
                    }
                }
            }
        } catch (error) {
            console.error("Failed to auto-load last project:", error);
        }
    }
});

// --- Content Loading Logic ---
watch([selectedId, currentFilePath, appConfig], async () => {
    if (!selectedId.value || !nodes.value[selectedId.value]) return;
    if (!appConfig.value) return;

    const node = nodes.value[selectedId.value];
    let needsUpdate = false;
    let newContent = node.content;
    let newSummary = node.summary;

    // Always attempt to load from disk to ensure freshness vs project.json cache
    // Content
    if (node.type === NodeType.CHAPTER || node.type === NodeType.SETTING_ITEM) {
        try {
            console.log(`[Debug] Loading content for ${node.id} from disk...`);
            // Use JSON parse/stringify for cleanest IPC object
            const cleanNodes = JSON.parse(JSON.stringify(nodes.value));
            const loaded = await FileManager.loadNode(currentFilePath.value, cleanNodes, projectMode.value, selectedId.value, 'content');
            console.log(`[Debug] Loaded content result size:`, loaded ? loaded.length : 0);
            
            newContent = loaded;
            needsUpdate = true;
        } catch (e) {
            console.warn("Content load failed, keeping existing content (if any)", e);
            // Do NOT overwrite newContent with empty if it failed. 
            // newContent currently holds reference to node.content (which might be empty from project.json, or exist in memory)
            // If project.json was empty, we are still empty. 
            // Ideally we retry? But for now just don't force overwrite with "".
            needsUpdate = true; // Wait, if we didn't change newContent, do we update?
            // If newContent === node.content, no change.
            // But we must ensure reactivity triggers if we switched nodes.
        }
    }

    // Summary
    try {
        console.log(`[Debug] Loading outline for ${node.id} from disk...`);
        const cleanNodes = JSON.parse(JSON.stringify(nodes.value));
        const loaded = await FileManager.loadNode(currentFilePath.value, cleanNodes, projectMode.value, selectedId.value, 'outline');
        console.log(`[Debug] Loaded outline result size:`, loaded ? loaded.length : 0);
        newSummary = loaded;
        needsUpdate = true;
    } catch (e) {
         console.warn("Summary load failed, keeping existing", e);
    }

    if (needsUpdate) {
        // Manipulate node directly in map is fine in Vue if reactivity is shallow?
        // nodes is ref so nodes.value is reactive proxy.
        // But nested objects need to be reactive.
        // Assuming types are correct, we can assign directly.
        // Alternatively, using spread to ensure reactivity update triggers.
        const updatedNode = { ...node, content: newContent || "", summary: newSummary || "" };
        nodes.value[selectedId.value] = updatedNode;
    }
}, { immediate: true });

// Helper to strip content/summary for metadata save
const prepareNodesForSave = (nodes: NodeMap): NodeMap => {
  const cleanNodes: NodeMap = {};
  for (const [id, node] of Object.entries(nodes)) {
    // Create shallow copy and override content/summary
    cleanNodes[id] = { ...node, content: '', summary: '' };
  }
  return cleanNodes;
};

// --- Persistence ---
const persistChanges = async (
    id: string,
    field: keyof NodeData,
    value: string,
    fullNodeMap: NodeMap
) => {
    if (!currentFilePath.value || currentFilePath.value.includes('untitled.json')) return;
    const node = fullNodeMap[id];
    if (!node) return;

    try {
        console.log(`[Debug] Persisting change for ${id} field ${field}`);
        if (field === 'content') {
             if (node.type === NodeType.CHAPTER || node.type === NodeType.SETTING_ITEM) {
                 console.log(`[Debug] Saving content to disk for ${id}...`);
                 // Ensure clean object for IPC
                 const cleanNodes = JSON.parse(JSON.stringify(fullNodeMap));
                 const res = await FileManager.saveNode(currentFilePath.value, cleanNodes, projectMode.value, id, value, 'content');
                 console.log(`[Debug] Save content result:`, res);
                 
                 // Strip content for metadata save
                 const metadataNodes = prepareNodesForSave(fullNodeMap);
                 const projectUpdates = { nodes: metadataNodes };
                 await (window as any).electronAPI.saveProject(currentFilePath.value, projectUpdates);
             }
        } else if (field === 'summary') {
            console.log(`[Debug] Saving summary to disk for ${id}...`);
            const cleanNodes = JSON.parse(JSON.stringify(fullNodeMap));
            const res = await FileManager.saveNode(currentFilePath.value, cleanNodes, projectMode.value, id, value, 'outline');
            console.log(`[Debug] Save summary result:`, res);
            
            // Strip content for metadata save
            const metadataNodes = prepareNodesForSave(fullNodeMap);
            const projectUpdates = { nodes: metadataNodes };
            await (window as any).electronAPI.saveProject(currentFilePath.value, projectUpdates);
        } else if (field === 'title') {
             // For title updates, we still strip content to be safe and consistent
             const metadataNodes = prepareNodesForSave(fullNodeMap);
             const projectUpdates = { nodes: metadataNodes };
             await (window as any).electronAPI.saveProject(currentFilePath.value, projectUpdates);
        }
    } catch (e) {
        console.error("Auto-save failed", e);
    }
};

const handleEditorSave = async (id: string, field: keyof NodeData, value: string) => {
    // 1. Prepare Update
    const node = nodes.value[id];
    if (!node) return;

    const updates: Partial<NodeData> = { [field]: value };
    if (field === 'content') {
        updates.wordCount = value.length;
    }

    // 2. Update State
    const updatedNode = { ...node, ...updates };
    nodes.value[id] = updatedNode;

    // 3. Persist
    // Create a copy of nodes map to ensure consistency during async op?
    // Actually fullNodeMap will reference the current reactive state which is updated.
    // JSON.stringify will snapshot it if needed.
    // persistChanges expects NodeMap.
    persistChanges(id, field, value, toRaw(nodes.value));
};

// --- Actions ---
const handleNewNovel = () => showNewModal.value = true;

const createNewProject = async (mode: ProjectMode) => {
    if ((window as any).electronAPI?.selectDirectory) {
        try {
            const dirPath = await (window as any).electronAPI.selectDirectory();
            if (!dirPath) return;

            const initialNodes = getInitialNodes(mode);
            const success = await FileManager.createProject(dirPath, initialNodes, mode);

            if (success) {
                projectMode.value = mode;
                nodes.value = initialNodes;
                currentFilePath.value = dirPath;
                selectedId.value = mode === 'LONG' ? 'vol-1' : 'chap-1';
                showNewModal.value = false;
            } else {
                alert("创建项目结构失败，请检查目录权限。");
            }
        } catch (error) {
            console.error("Failed to create new project:", error);
            alert("创建项目出错。");
        }
    }
};

const handleSaveNovel = async () => {
    if (currentFilePath.value && (window as any).electronAPI?.selectDirectory) {
        // Strip content/summary for manual save as well
        const metadataNodes = prepareNodesForSave(nodes.value);
        const updates = {
            projectMode: projectMode.value,
            lastOpenedId: selectedId.value,
            nodes: metadataNodes
        };
        await (window as any).electronAPI.saveProject(currentFilePath.value, updates);
        showSaveSuccess.value = true;
        setTimeout(() => showSaveSuccess.value = false, 2000);
    }
};

const handleImportClick = async () => {
    if ((window as any).electronAPI?.selectDirectory) {
        try {
            const dirPath = await (window as any).electronAPI.selectDirectory();
            if (!dirPath) return;

            const data = await (window as any).electronAPI.loadProject(dirPath);
            if (!data) {
                alert("该文件夹下未找到 project.json 项目文件。");
                return;
            }

            if (data.nodes) {
                nodes.value = data.nodes;
                projectMode.value = data.projectMode || 'LONG';
                selectedId.value = data.lastOpenedId || 'story-root';
                currentFilePath.value = dirPath;
            } else {
                alert("无效的项目文件格式。");
            }
        } catch (err) {
            console.error("Import failed:", err);
            alert("导入失败，文件可能已损坏。");
        }
    }
};

const handleFileImport = (event: Event) => {
    alert("请使用‘打开文件夹’功能加载新版项目结构。");
};

// --- Tree Actions ---
const handleSelect = (id: string) => {
    selectedId.value = id;
    if (currentFilePath.value && !currentFilePath.value.includes('untitled.json')) {
        (window as any).electronAPI.saveProject(currentFilePath.value, { lastOpenedId: id });
    }
};

const handleToggle = (id: string) => {
    const node = nodes.value[id];
    if (node) {
        // Vue 3 reactivity handles object mutation if node is reactive
        // nodes.value[id] = { ...node, expanded: !node.expanded };
        // Or deeper mutation
        node.expanded = !node.expanded;
    }
};

const handleAdd = (parentId: string, type: NodeType) => {
    const newId = `node-${Date.now()}`;
    const parent = nodes.value[parentId];
    if (!parent) return;

    const sameTypeCount = parent.children.filter(childId => nodes.value[childId]?.type === type).length;
    const nextIndex = sameTypeCount + 1;

    let defaultTitle = "未命名";
    switch (type) {
        case NodeType.VOLUME: defaultTitle = `第${nextIndex}卷：`; break;
        case NodeType.SECTION: defaultTitle = `第${nextIndex}篇：`; break;
        case NodeType.CHAPTER: defaultTitle = `第${nextIndex}章：`; break;
        case NodeType.SETTING_FOLDER: defaultTitle = `新文件夹 ${nextIndex}`; break;
        case NodeType.SETTING_ITEM: defaultTitle = `新条目 ${nextIndex}`; break;
    }

    const newNode: NodeData = {
        id: newId,
        type,
        title: defaultTitle,
        content: '',
        summary: '',
        parentId,
        children: []
    };

    // Update parent
    parent.children.push(newId);
    parent.expanded = true;

    // Add new node
    nodes.value[newId] = newNode;

    if (currentFilePath.value && !currentFilePath.value.includes('untitled.json')) {
        (window as any).electronAPI.saveProject(currentFilePath.value, { nodes: nodes.value });
    }

    selectedId.value = newId;
};

const handleDelete = (id: string) => {
    const nodeToDelete = nodes.value[id];
    if (!nodeToDelete || !nodeToDelete.parentId) {
        alert("不能删除根节点。");
        return;
    }

    if (!confirm("确定要删除此章节/目录吗？关联的文件将被移至回收站。")) {
        return;
    }

    const deleteFilesRecursive = async (nodeId: string) => {
        const node = nodes.value[nodeId];
        if (!node) return;

        if (node.type === NodeType.CHAPTER) {
            await FileManager.deleteNodeFile(currentFilePath.value, nodes.value, projectMode.value, nodeId, 'content');
        }

        if (node.summary && (node.type === NodeType.VOLUME || node.type === NodeType.SECTION || node.type === NodeType.CHAPTER)) {
            await FileManager.deleteNodeFile(currentFilePath.value, nodes.value, projectMode.value, nodeId, 'outline');
        }

        if (node.children) {
            for (const childId of node.children) {
                await deleteFilesRecursive(childId);
            }
        }
    };

    if (currentFilePath.value && !currentFilePath.value.includes('untitled.json')) {
        deleteFilesRecursive(id).catch(e => console.error("File deletion failed", e));
    }

    const parentId = nodeToDelete.parentId;
    const parent = nodes.value[parentId];
    if (parent) {
        parent.children = parent.children.filter(childId => childId !== id);
    }

    const deleteRecursive = (nodeId: string) => {
        const node = nodes.value[nodeId];
        if (node && node.children) node.children.forEach(deleteRecursive);
        delete nodes.value[nodeId];
    };
    deleteRecursive(id);

    if (selectedId.value === id) selectedId.value = parentId;
};

const handleRename = (id: string, newTitle: string) => {
    if (nodes.value[id]) {
        nodes.value[id].title = newTitle;
    }
};

const handleChange = (id: string, field: keyof NodeData, value: string) => {
     if (nodes.value[id]) {
        // @ts-ignore
        nodes.value[id][field] = value;
     }
};

const handleStartAiTask = (task: WritingTask) => {
    activeTask.value = task;
    isRightSidebarOpen.value = true;
};

const handleApplyAiTask = (content: string) => {
    if (!activeTask.value) return;

    const { nodeId, field, type } = activeTask.value;
    
    if (nodes.value[nodeId]) {
        if (type === 'POLISH_SELECTION') {
             // Handle polish selection if needed
        } else {
             // Direct Field Update
             handleEditorSave(nodeId, field, content);
        }
    }
    activeTask.value = null;
};

const handleCancelAiTask = () => {
    activeTask.value = null;
    // Don't close sidebar automatically to allow user to continue chatting if they want
};


</script>
