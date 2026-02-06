import FileManager from '../FileManager.js';
import ProjectStore from './ProjectStore.js';

const clone = (value) => JSON.parse(JSON.stringify(value));
const SELECT_PERSIST_DEBOUNCE_MS = 1200;
const selectPersistTimers = new Map();

const clearSelectPersistTimer = (projectPath) => {
    const timer = selectPersistTimers.get(projectPath);
    if (timer) {
        clearTimeout(timer);
        selectPersistTimers.delete(projectPath);
    }
};

const parseSplitJson = (text) => {
    let jsonText = String(text || '').trim();
    const fencedMatch = jsonText.match(/```json\s*([\s\S]*?)```/i) || jsonText.match(/```\s*([\s\S]*?)```/i);
    if (fencedMatch && fencedMatch[1]) {
        jsonText = fencedMatch[1].trim();
    }

    const parsed = JSON.parse(jsonText);
    if (!parsed || !Array.isArray(parsed.chapters)) {
        const error = new Error('模型返回格式异常：缺少 chapters 数组。');
        error.code = 'VALIDATION_ERROR';
        throw error;
    }

    const chapters = parsed.chapters
        .map((item) => ({
            title: String(item?.title || '').trim(),
            summary: String(item?.summary || '').trim()
        }))
        .filter((item) => item.title || item.summary);

    if (chapters.length === 0) {
        const error = new Error('模型未返回有效章节内容，请重试。');
        error.code = 'VALIDATION_ERROR';
        throw error;
    }

    return chapters;
};

const splitTargetTypeLabelMap = {
    CHAPTER: '章纲',
    VOLUME: '卷纲',
    SECTION: '篇纲'
};

const splitCounterSuffixMap = {
    CHAPTER: '章',
    VOLUME: '卷',
    SECTION: '篇'
};

const normalizeSplitTitle = (rawTitle, index, targetNodeType) => {
    const suffix = splitCounterSuffixMap[targetNodeType] || '章';
    const fallback = `第${index + 1}${suffix}：`;
    const title = String(rawTitle || '').trim();
    if (!title) return fallback;

    const numeralPrefix = title.match(/^第\s*[零一二三四五六七八九十百千万两\d]+\s*[章节卷篇](.*)$/);
    if (!numeralPrefix) return title;

    const titleSuffix = (numeralPrefix[1] || '').trim();
    if (!titleSuffix) return fallback;
    return `第${index + 1}${suffix}${titleSuffix}`;
};

const prepareNodesForSave = (nodes) => {
    const cleanNodes = {};
    for (const [id, node] of Object.entries(nodes)) {
        cleanNodes[id] = { ...node, content: '', summary: '' };
    }
    return cleanNodes;
};

const makeStatePayload = (state) => ({
    projectMode: state.projectMode,
    nodes: clone(state.nodes),
    lastOpenedId: state.lastOpenedId,
    revision: state.revision
});

const persistState = async (state) => {
    clearSelectPersistTimer(state.projectPath);
    const saveResult = await FileManager.saveProject(state.projectPath, {
        projectMode: state.projectMode,
        lastOpenedId: state.lastOpenedId,
        nodes: prepareNodesForSave(state.nodes)
    });
    if (!saveResult.success) {
        const error = new Error(saveResult.error || '保存项目失败。');
        error.code = 'FS_WRITE_FAILED';
        throw error;
    }
};

const scheduleSelectPersist = (state) => {
    clearSelectPersistTimer(state.projectPath);
    const timer = setTimeout(() => {
        persistState(state).catch((error) => {
            console.warn('延迟持久化 lastOpenedId 失败:', error?.message || error);
        });
    }, SELECT_PERSIST_DEBOUNCE_MS);
    selectPersistTimers.set(state.projectPath, timer);
};

const getNodeOrThrow = (state, nodeId) => {
    const node = state.nodes[nodeId];
    if (!node) {
        const error = new Error(`节点不存在：${nodeId}`);
        error.code = 'NODE_NOT_FOUND';
        throw error;
    }
    return node;
};

export default class ProjectService {
    static async getState({ projectPath }) {
        const state = await ProjectStore.ensure(projectPath);
        return makeStatePayload(state);
    }

    static async selectNode({ projectPath, nodeId, expectedRevision }) {
        const state = await ProjectStore.ensure(projectPath);
        ProjectStore.assertRevision(state, expectedRevision);

        getNodeOrThrow(state, nodeId);
        if (state.lastOpenedId === nodeId) {
            return {
                lastOpenedId: state.lastOpenedId,
                revision: state.revision
            };
        }

        state.lastOpenedId = nodeId;
        scheduleSelectPersist(state);

        return {
            lastOpenedId: state.lastOpenedId,
            revision: state.revision
        };
    }

    static async flushPendingPersist({ projectPath }) {
        const state = await ProjectStore.ensure(projectPath);
        clearSelectPersistTimer(projectPath);
        await persistState(state);
    }

    static async flushAllPendingPersists() {
        const projectPaths = Array.from(selectPersistTimers.keys());
        for (const projectPath of projectPaths) {
            try {
                await this.flushPendingPersist({ projectPath });
            } catch (error) {
                console.warn('退出前持久化项目状态失败:', projectPath, error?.message || error);
            }
        }
    }

    static async loadNodeField({ projectPath, nodeId, field }) {
        const state = await ProjectStore.ensure(projectPath);
        const node = getNodeOrThrow(state, nodeId);

        if (field === 'content') {
            if (!(node.type === 'CHAPTER' || node.type === 'SETTING_ITEM')) {
                return { value: '' };
            }
            const loaded = await FileManager.loadNodeContent(projectPath, state.nodes, state.projectMode, nodeId, 'content');
            if (!loaded.success) {
                const error = new Error(loaded.error || '加载正文失败。');
                error.code = 'FS_READ_FAILED';
                throw error;
            }
            return { value: loaded.content || '' };
        }

        if (field === 'summary') {
            if (node.type === 'SETTING_ROOT' || node.type === 'SETTING_FOLDER' || node.type === 'SETTING_ITEM') {
                return { value: node.summary || '' };
            }
            const loaded = await FileManager.loadNodeContent(projectPath, state.nodes, state.projectMode, nodeId, 'outline');
            if (!loaded.success) {
                const error = new Error(loaded.error || '加载摘要失败。');
                error.code = 'FS_READ_FAILED';
                throw error;
            }
            return { value: loaded.content || '' };
        }

        const error = new Error(`不支持加载字段：${field}`);
        error.code = 'VALIDATION_ERROR';
        throw error;
    }

    static async updateNode({ projectPath, nodeId, field, value, expectedRevision }) {
        const state = await ProjectStore.ensure(projectPath);
        ProjectStore.assertRevision(state, expectedRevision);

        const node = getNodeOrThrow(state, nodeId);
        const normalizedValue = String(value ?? '');

        if (field === 'title') {
            node.title = normalizedValue;
            await persistState(state);
        } else if (field === 'summary') {
            node.summary = normalizedValue;
            if (!(node.type === 'SETTING_ROOT' || node.type === 'SETTING_FOLDER' || node.type === 'SETTING_ITEM')) {
                const saveResult = await FileManager.saveNodeContent(projectPath, state.nodes, state.projectMode, nodeId, normalizedValue, 'outline');
                if (!saveResult.success) {
                    const error = new Error(saveResult.error || '保存摘要失败。');
                    error.code = 'FS_WRITE_FAILED';
                    throw error;
                }
            }
            await persistState(state);
        } else if (field === 'content') {
            if (!(node.type === 'CHAPTER' || node.type === 'SETTING_ITEM')) {
                const error = new Error('当前节点类型不支持正文内容。');
                error.code = 'VALIDATION_ERROR';
                throw error;
            }
            node.content = normalizedValue;
            node.wordCount = normalizedValue.length;
            const saveResult = await FileManager.saveNodeContent(projectPath, state.nodes, state.projectMode, nodeId, normalizedValue, 'content');
            if (!saveResult.success) {
                const error = new Error(saveResult.error || '保存正文失败。');
                error.code = 'FS_WRITE_FAILED';
                throw error;
            }
            await persistState(state);
        } else {
            const error = new Error(`不支持字段更新：${field}`);
            error.code = 'VALIDATION_ERROR';
            throw error;
        }

        ProjectStore.bumpRevision(state);
        return {
            node: clone(node),
            revision: state.revision
        };
    }

    static async saveProject({ projectPath, expectedRevision }) {
        const state = await ProjectStore.ensure(projectPath);
        ProjectStore.assertRevision(state, expectedRevision);
        await persistState(state);
        ProjectStore.bumpRevision(state);
        return makeStatePayload(state);
    }

    static async addNode({ projectPath, parentId, type, expectedRevision }) {
        const state = await ProjectStore.ensure(projectPath);
        ProjectStore.assertRevision(state, expectedRevision);

        const parent = getNodeOrThrow(state, parentId);
        const newId = `node-${Date.now()}`;

        const sameTypeCount = (parent.children || []).filter((childId) => state.nodes[childId]?.type === type).length;
        const nextIndex = sameTypeCount + 1;

        let defaultTitle = '未命名';
        if (type === 'VOLUME') defaultTitle = `第${nextIndex}卷：`;
        else if (type === 'SECTION') defaultTitle = `第${nextIndex}篇：`;
        else if (type === 'CHAPTER') defaultTitle = `第${nextIndex}章：`;
        else if (type === 'SETTING_FOLDER') defaultTitle = `新文件夹 ${nextIndex}`;
        else if (type === 'SETTING_ITEM') defaultTitle = `新条目 ${nextIndex}`;

        state.nodes[newId] = {
            id: newId,
            type,
            title: defaultTitle,
            content: '',
            summary: '',
            parentId,
            children: []
        };

        parent.children = [...(parent.children || []), newId];
        parent.expanded = true;
        state.lastOpenedId = newId;

        await persistState(state);
        ProjectStore.bumpRevision(state);
        return makeStatePayload(state);
    }

    static async renameNode({ projectPath, nodeId, title, expectedRevision }) {
        return this.updateNode({ projectPath, nodeId, field: 'title', value: title, expectedRevision });
    }

    static async deleteNode({ projectPath, nodeId, expectedRevision }) {
        const state = await ProjectStore.ensure(projectPath);
        ProjectStore.assertRevision(state, expectedRevision);

        const nodeToDelete = getNodeOrThrow(state, nodeId);
        if (!nodeToDelete.parentId) {
            const error = new Error('不能删除根节点。');
            error.code = 'VALIDATION_ERROR';
            throw error;
        }

        const deleteFilesRecursive = async (id) => {
            const node = state.nodes[id];
            if (!node) return;

            if (node.type === 'CHAPTER') {
                await FileManager.deleteNodeFile(projectPath, state.nodes, state.projectMode, id, 'content');
            }
            if (node.type === 'VOLUME' || node.type === 'SECTION' || node.type === 'CHAPTER') {
                await FileManager.deleteNodeFile(projectPath, state.nodes, state.projectMode, id, 'outline');
            }
            if (node.children) {
                for (const childId of node.children) {
                    await deleteFilesRecursive(childId);
                }
            }
        };

        await deleteFilesRecursive(nodeId);

        const parentId = nodeToDelete.parentId;
        const parent = state.nodes[parentId];
        if (parent) {
            parent.children = (parent.children || []).filter((childId) => childId !== nodeId);
        }

        const deleteRecursive = (id) => {
            const node = state.nodes[id];
            if (!node) return;
            (node.children || []).forEach(deleteRecursive);
            delete state.nodes[id];
        };
        deleteRecursive(nodeId);

        if (state.lastOpenedId === nodeId) {
            state.lastOpenedId = parentId;
        }

        await persistState(state);
        ProjectStore.bumpRevision(state);
        return makeStatePayload(state);
    }

    static async splitShortPreview({ projectPath, sourceNodeId, targetNodeType, chapterCount, modelName, temperature, backendPort, backendToken }) {
        const state = await ProjectStore.ensure(projectPath);
        if (!['CHAPTER', 'SECTION', 'VOLUME'].includes(targetNodeType || '')) {
            const error = new Error('目标子节点类型不支持拆分。');
            error.code = 'VALIDATION_ERROR';
            throw error;
        }

        const sourceNode = getNodeOrThrow(state, sourceNodeId || '');
        const root = state.nodes['story-root'];
        if (!root) {
            const error = new Error('未找到小说根节点。');
            error.code = 'NODE_NOT_FOUND';
            throw error;
        }

        const outlineResult = await FileManager.loadNodeContent(projectPath, state.nodes, state.projectMode, root.id, 'outline');
        const novelOutline = outlineResult.success ? (outlineResult.content || '') : '';
        const sourceSummaryResult = await FileManager.loadNodeContent(projectPath, state.nodes, state.projectMode, sourceNode.id, 'outline');
        const sourceSummary = sourceSummaryResult.success ? (sourceSummaryResult.content || sourceNode.summary || '') : (sourceNode.summary || '');

        const targetLabel = splitTargetTypeLabelMap[targetNodeType] || '子纲';

        const payload = {
            history: [],
            message: `请将当前节点拆分为 ${chapterCount} 个${targetLabel}。`,
            state: {
                novel_path: projectPath,
                current_node: {
                    id: sourceNode.id,
                    type: sourceNode.type,
                    title: sourceNode.title || '未命名节点',
                    summary: sourceSummary,
                    content: sourceNode.content || ''
                },
                novel_outline: novelOutline,
                novel_title: root.title || '',
                current_node_title: sourceNode.title || '',
                chapter_title: '',
                active_task: {
                    type: 'SPLIT_CHILDREN',
                    node_id: sourceNode.id,
                    field: 'summary',
                    context_data: JSON.stringify({ chapter_count: chapterCount, target_node_type: targetNodeType })
                }
            },
            config: {
                model: modelName || 'gemini-3-flash-preview',
                temperature: Number.isFinite(temperature) ? temperature : 0.3
            }
        };

        const response = await fetch(`http://127.0.0.1:${backendPort}/api/chat/short`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': backendToken || ''
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            const error = new Error(errData.text || `拆分章节请求失败：${response.statusText}`);
            error.code = 'REMOTE_CALL_FAILED';
            throw error;
        }

        const result = await response.json();
        const chapters = parseSplitJson(result.text || '').map((item, index) => ({
            title: normalizeSplitTitle(item.title, index, targetNodeType),
            summary: item.summary
        }));
        if (chapters.length !== chapterCount) {
            const error = new Error(`模型返回章节数为 ${chapters.length}，与请求的 ${chapterCount} 不一致。`);
            error.code = 'VALIDATION_ERROR';
            throw error;
        }

        return { chapters };
    }

    static async applyShortSplit({ projectPath, sourceNodeId, targetNodeType, chapters, overwriteAll, expectedRevision }) {
        const state = await ProjectStore.ensure(projectPath);
        ProjectStore.assertRevision(state, expectedRevision);

        if (!overwriteAll) {
            const error = new Error('该操作必须显式确认覆盖全部章节。');
            error.code = 'VALIDATION_ERROR';
            throw error;
        }
        if (!Array.isArray(chapters) || chapters.length === 0) {
            const error = new Error('缺少有效章节数据。');
            error.code = 'VALIDATION_ERROR';
            throw error;
        }
        if (!['CHAPTER', 'SECTION', 'VOLUME'].includes(targetNodeType || '')) {
            const error = new Error('目标子节点类型不支持拆分。');
            error.code = 'VALIDATION_ERROR';
            throw error;
        }

        const sourceNode = getNodeOrThrow(state, sourceNodeId || '');

        const oldChildIds = [...(sourceNode.children || [])];

        const deleteSplitSubtree = async (nodeId) => {
            const node = state.nodes[nodeId];
            if (!node) return;

            for (const childId of node.children || []) {
                await deleteSplitSubtree(childId);
            }

            if (node.type === 'CHAPTER') {
                await FileManager.deleteNodeFile(projectPath, state.nodes, state.projectMode, nodeId, 'content');
            }
            if (node.type === 'VOLUME' || node.type === 'SECTION' || node.type === 'CHAPTER') {
                await FileManager.deleteNodeFile(projectPath, state.nodes, state.projectMode, nodeId, 'outline');
            }

            delete state.nodes[nodeId];
        };

        for (const oldId of oldChildIds) {
            await deleteSplitSubtree(oldId);
        }

        const timestampBase = Date.now();
        const newChapterIds = [];
        const normalizedChapters = chapters.map((item, index) => ({
            title: normalizeSplitTitle(item?.title, index, targetNodeType),
            summary: String(item?.summary || '').trim()
        }));

        for (let i = 0; i < normalizedChapters.length; i++) {
            const item = normalizedChapters[i];
            const newId = `${targetNodeType.toLowerCase()}-${timestampBase}-${i + 1}`;
            state.nodes[newId] = {
                id: newId,
                type: targetNodeType,
                title: item.title,
                content: '',
                summary: item.summary,
                parentId: sourceNode.id,
                children: []
            };
            newChapterIds.push(newId);
        }

        sourceNode.children = [...newChapterIds];
        sourceNode.expanded = true;
        state.lastOpenedId = newChapterIds[0] || sourceNode.id;

        for (const chapterId of newChapterIds) {
            const chapter = state.nodes[chapterId];
            await FileManager.saveNodeContent(projectPath, state.nodes, state.projectMode, chapterId, chapter.summary || '', 'outline');
        }

        await persistState(state);
        ProjectStore.bumpRevision(state);

        return {
            nodes: clone(state.nodes),
            lastOpenedId: state.lastOpenedId,
            revision: state.revision,
            updatedAt: Date.now()
        };
    }
}
