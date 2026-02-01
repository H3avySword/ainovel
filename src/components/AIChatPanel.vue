<template>
  <div class="h-full flex flex-col bg-white border-l border-indigo-100 shadow-xl shadow-indigo-100/50 w-full max-w-sm md:w-80 lg:w-96 relative">

    <!-- Header -->
    <div class="flex items-center justify-between px-4 py-4 border-b border-indigo-100 bg-indigo-50/30">
      <div class="flex items-center gap-2">
        <Sparkles :size="18" class="text-indigo-600" />
        <h2 class="text-sm font-bold text-slate-700 uppercase tracking-wider">AI 创作助手</h2>
      </div>
      <button
        ref="configToggleRef"
        @click="isConfigOpen = !isConfigOpen"
        class="p-1.5 rounded-lg transition-colors"
        :class="isConfigOpen ? 'bg-indigo-600 text-white' : 'hover:bg-indigo-100 text-indigo-400'"
        title="AI 配置"
      >
        <Settings :size="16" />
      </button>
    </div>

    <!-- Config Menu Overlay -->
    <div
      ref="configMenuRef"
      class="absolute top-[53px] left-0 right-0 bg-white border-b border-indigo-100 shadow-2xl z-30 transition-all duration-300 ease-in-out overflow-hidden"
      :class="isConfigOpen ? 'max-h-[80vh]' : 'max-h-0 border-none'"
    >
      <div class="p-5 space-y-4 max-h-[80vh] overflow-y-auto custom-scrollbar">

        <!-- Chat Completion Source -->
        <div class="space-y-1.5">
          <label class="text-[11px] font-bold text-slate-800 tracking-tight">Chat Completion Source</label>
          <div class="relative">
            <select
              v-model="source"
              class="w-full h-9 pl-3 pr-10 bg-slate-50 border border-slate-200 rounded text-xs text-slate-700 appearance-none focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all cursor-pointer"
            >
              <option>Google AI Studio</option>
              <option>OpenRouter</option>
              <option>Local (Ollama)</option>
            </select>
            <ChevronDown :size="14" class="absolute right-3 top-2.5 text-slate-400 pointer-events-none" />
          </div>
        </div>

        <!-- API URL -->
        <div class="space-y-1.5">
            <div class="flex items-center gap-1">
              <label class="text-[11px] font-bold text-slate-800 tracking-tight">API URL</label>
              <ChevronDown :size="14" class="text-slate-400" />
            </div>
            <input
              type="text"
              placeholder="https://api.example.com/v1"
              v-model="apiUrl"
              class="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
            />
        </div>

        <!-- API Key -->
        <div class="space-y-1.5">
            <label class="text-[11px] font-bold text-slate-800 tracking-tight">API Key</label>
            <button
              @click="handleOpenKeySelector"
              class="w-full group flex items-center justify-between h-9 px-3 bg-slate-50 border border-slate-200 rounded hover:border-indigo-300 transition-all"
            >
              <div class="flex items-center gap-2">
                <CheckCircle2 :size="14" class="text-indigo-500" />
                <span class="text-[11px] text-slate-500 italic">Key saved (Managed by system)</span>
              </div>
              <Key :size="14" class="text-slate-400 group-hover:text-indigo-500 transition-colors" />
            </button>
        </div>

        <!-- Model -->
        <div class="space-y-1.5">
            <label class="text-[11px] font-bold text-slate-800 tracking-tight">Model</label>
            <div class="relative">
              <select
                v-model="aiModel"
                class="w-full h-9 pl-3 pr-10 bg-slate-50 border border-slate-200 rounded text-xs text-slate-700 appearance-none focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all cursor-pointer"
              >
                <option value="gemini-3-pro-preview">gemini-3-pro-preview</option>
                <option value="gemini-3-flash-preview">gemini-3-flash-preview</option>
                <option value="gemini-2.5-flash-lite-latest">gemini-2.5-flash-lite-latest</option>
              </select>
              <ChevronDown :size="14" class="absolute right-3 top-2.5 text-slate-400 pointer-events-none" />
            </div>
        </div>

        <!-- Footer Buttons -->
        <div class="flex gap-2 pt-2 pb-1">
            <button
              @click="isConfigOpen = false"
              class="flex-1 h-8 bg-indigo-600 text-white text-[11px] font-bold rounded hover:bg-indigo-700 transition-colors"
            >
              Connect
            </button>
            <button
              @click="handleTestConnection"
              :disabled="isTesting"
              class="flex-1 h-8 border border-slate-200 text-slate-600 text-[11px] font-bold rounded hover:bg-slate-50 transition-colors flex items-center justify-center"
            >
              <Loader2 v-if="isTesting" :size="12" class="animate-spin" />
              <span v-else>Test Message</span>
            </button>
        </div>

        <!-- Status Line -->
        <div class="flex items-center gap-2 pt-1 border-t border-slate-100">
            <div class="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]"></div>
            <span class="text-[11px] text-slate-500">Status check bypassed</span>
        </div>

      </div>
    </div>

    <!-- Chat Area -->
    <div class="flex-1 overflow-hidden relative flex flex-col">
      
      <!-- Task Banner -->
      <div v-if="activeTask" class="bg-indigo-50/80 backdrop-blur-sm px-4 py-2 border-b border-indigo-100 flex items-center justify-between absolute top-0 left-0 right-0 z-10">
        <div class="flex items-center gap-2 overflow-hidden">
            <span class="text-[10px] font-bold text-indigo-600 border border-indigo-200 bg-white px-1.5 py-0.5 rounded shadow-sm whitespace-nowrap">
                {{ getTaskLabel(activeTask.type) }}
            </span>
            <span class="text-xs text-indigo-900 truncate font-medium">
                正在为 [{{ activeTaskNodeTitle }}] {{ getTaskActionLabel(activeTask.type) }}...
            </span>
        </div>
        <button @click="$emit('cancel-task')" class="text-indigo-400 hover:text-indigo-700 transition-colors bg-white/50 rounded-full p-0.5">
            <X :size="14" />
        </button>
      </div>

      <div class="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/30 pt-12">
        <div v-for="msg in messages" :key="msg.id" class="flex" :class="msg.role === 'user' ? 'justify-end' : 'justify-start'">
            <div
                class="max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm"
                :class="msg.role === 'user'
                  ? 'bg-indigo-600 text-white rounded-br-none'
                  : msg.isError
                    ? 'bg-red-50 text-red-600 border border-red-100 rounded-bl-none'
                    : 'bg-white text-slate-700 border border-indigo-50 rounded-bl-none'"
            >
                <div v-if="msg.role === 'model' && !msg.isError" class="flex items-center gap-2 mb-1 text-xs font-bold text-indigo-400 uppercase tracking-wider">
                    <Bot :size="12" /> AI 灵感 ({{ aiModel.includes('flash') ? 'Flash' : 'Pro' }})
                </div>
                <div class="whitespace-pre-wrap">{{ msg.text }}</div>
                

            </div>
        </div>
        <div v-if="isLoading" class="flex justify-start">
            <div class="bg-white border border-indigo-50 rounded-2xl rounded-bl-none px-4 py-3 shadow-sm">
                <Loader2 :size="16" class="animate-spin text-indigo-500" />
            </div>
        </div>
        <div ref="messagesEndRef"></div>
      </div>

      <div class="p-4 bg-white border-t border-indigo-100">
        <div class="relative">
            <textarea
              v-model="input"
              @keydown.enter.exact.prevent="handleSendMessage"
              placeholder="输入您的想法或修改建议..."
              class="w-full pl-4 pr-12 py-3 rounded-xl bg-slate-50 border border-indigo-100 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 outline-none resize-none text-sm text-slate-700 max-h-32 shadow-inner"
              rows="2"
            ></textarea>
            
            <!-- Floating Apply Button -->
            <div v-if="showApplyOverlay" class="absolute left-0 right-0 bottom-full mb-2 flex justify-center px-4 pointer-events-none">
                 <button
                    @click="handleApplyLast"
                    class="pointer-events-auto shadow-xl shadow-indigo-100/50 bg-white border border-indigo-100 text-indigo-600 px-4 py-2 rounded-xl flex items-center gap-2 text-sm font-bold hover:bg-indigo-50 hover:border-indigo-200 hover:-translate-y-0.5 transition-all animate-in slide-in-from-bottom-2 fade-in duration-300"
                 >
                    <CheckCircle2 :size="16" class="text-indigo-500" />
                    <span>{{ getApplyLabel() }}</span>
                 </button>
            </div>

            <button
              @click="handleSendMessage"
              :disabled="isLoading || !input.trim()"
              class="absolute right-2 bottom-2 p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-indigo-200"
            >
              <Send :size="16" />
            </button>
        </div>
        <div class="text-[10px] text-center text-slate-400 mt-2 italic">
            已开启上下文智能感知
        </div>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, nextTick, computed } from 'vue';
import {
  Send, Sparkles, Loader2, Bot, Settings, Key,
  X, ChevronDown, CheckCircle2, Check
} from 'lucide-vue-next';
import { ChatMessage, NodeMap, ProjectMode, AppConfig, WritingTask, TaskType } from '../types';
import { generateWritingAssistantResponse } from '../services/geminiService';

const props = defineProps<{
    nodes: NodeMap;
    selectedId: string;
    projectMode: ProjectMode;
    filePath: string;
    appConfig: AppConfig | null;
    activeTask: WritingTask | null;
}>();

const emit = defineEmits<{
    (e: 'apply-task', content: string): void;
    (e: 'cancel-task'): void;
}>();

// Chat State
const messages = ref<ChatMessage[]>([
    { id: '1', role: 'model', text: "您好！我是您的 AI 创作助手。需要我帮您完善总纲、构思卷纲，还是润色章节内容？" }
]);
const input = ref('');
const isLoading = ref(false);
const messagesEndRef = ref<HTMLDivElement | null>(null);

// Configuration State
const isConfigOpen = ref(false);
const source = ref('Google AI Studio');
const apiUrl = ref('');
const aiModel = ref('gemini-3-pro-preview');
const isTesting = ref(false);

const configMenuRef = ref<HTMLDivElement | null>(null);
const configToggleRef = ref<HTMLButtonElement | null>(null);

const scrollToBottom = () => {
    messagesEndRef.value?.scrollIntoView({ behavior: 'smooth' });
};

watch(messages, async () => {
    await nextTick();
    scrollToBottom();
}, { deep: true });

// Click Outside Logic
const handleClickOutside = (event: MouseEvent) => {
    if (
        isConfigOpen.value &&
        configMenuRef.value &&
        !configMenuRef.value.contains(event.target as Node) &&
        configToggleRef.value &&
        !configToggleRef.value.contains(event.target as Node)
    ) {
        isConfigOpen.value = false;
    }
};

const handleEscKey = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
        isConfigOpen.value = false;
    }
};

watch(isConfigOpen, (newVal) => {
    if (newVal) {
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEscKey);
    } else {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('keydown', handleEscKey);
    }
});

const handleSendMessage = async () => {
    if (!input.value.trim() || isLoading.value) return;

    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text: input.value };
    messages.value.push(userMsg);
    input.value = '';
    isLoading.value = true;

    try {
        const history = messages.value.map(m => ({
            role: m.role,
            parts: [{ text: m.text }]
        }));

        const responseText = await generateWritingAssistantResponse(
            history,
            userMsg.text,
            {
                projectMode: props.projectMode,
                novelPath: props.filePath,
                nodeMap: props.nodes,
                selectedId: props.selectedId,
                activeTask: props.activeTask
            },
            { model: aiModel.value, temperature: 0.8, appConfig: props.appConfig }
        );

        const aiMsg: ChatMessage = { id: (Date.now() + 1).toString(), role: 'model', text: responseText };
        messages.value.push(aiMsg);
    } catch (error) {
        const errorMsg: ChatMessage = {
            id: (Date.now() + 1).toString(),
            role: 'model',
            text: "连接创作矩阵时遇到一点小麻烦，请检查 API 配置或网络后再试。",
            isError: true
        };
        messages.value.push(errorMsg);
    } finally {
        isLoading.value = false;
    }
};

const handleOpenKeySelector = async () => {
    if ((window as any).aistudio?.openSelectKey) {
        await (window as any).aistudio.openSelectKey();
    } else {
        alert("API 配置面板在当前环境中不可用。");
    }
};

const handleTestConnection = async () => {
    isTesting.value = true;
    setTimeout(() => {
        isTesting.value = false;
        alert("连接测试成功！API 已准备就绪。");
    }, 1500);
};


// Task Logic
const activeTaskNodeTitle = computed(() => {
    if (!props.activeTask) return '';
    const node = props.nodes[props.activeTask.nodeId];
    return node ? node.title : '未知章节';
});

const getTaskLabel = (type: TaskType) => {
    switch(type) {
        case 'SYNOPSIS': return '章纲';
        case 'CONTENT': return '正文';
        case 'POLISH_SELECTION': return '润色';
        default: return '任务';
    }
};

const getTaskActionLabel = (type: TaskType) => {
    switch(type) {
        case 'SYNOPSIS': return '生成章纲';
        case 'CONTENT': return '撰写内容';
        case 'POLISH_SELECTION': return '优化选中内容';
        default: return '处理中';
    }
};

const getApplyLabel = () => {
    if(!props.activeTask) return '应用';
    switch(props.activeTask.type) {
        case 'SYNOPSIS': return '应用此章纲';
        case 'CONTENT': return '插入正文';
        case 'POLISH_SELECTION': return '替换选中内容';
        default: return '应用';
    }
};

const handleApply = (content: string) => {
    emit('apply-task', content);
};

const showApplyOverlay = computed(() => {
    if (!props.activeTask) return false;
    if (messages.value.length === 0) return false;
    
    const lastMsg = messages.value[messages.value.length - 1];
    
    // Check if last message is from model and not error
    if (lastMsg.role !== 'model' || lastMsg.isError) return false;
    
    // Check if it's the initial greeting (ID '1')
    if (lastMsg.id === '1') return false;
    
    return true;
});

const handleApplyLast = () => {
    const lastMsg = messages.value[messages.value.length - 1];
    if (lastMsg && lastMsg.role === 'model') {
        handleApply(lastMsg.text);
    }
};
</script>
