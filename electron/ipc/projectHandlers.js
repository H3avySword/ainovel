import ProjectService from '../services/ProjectService.js';

const fail = (code, message, details) => ({
    success: false,
    error: { code, message, details }
});

const handleError = (error, fallbackMessage) => {
    const code = error?.code || 'UNKNOWN_ERROR';
    const message = error?.message || fallbackMessage;
    return fail(code, message);
};

const isValidChapterCount = (value) => Number.isInteger(value) && value >= 2 && value <= 50;
const isValidSplitTargetType = (value) => ['CHAPTER', 'SECTION', 'VOLUME'].includes(value);

export const registerProjectHandlers = (ipcMain, deps) => {
    const { getBackendPort, getBackendToken, emitProjectState } = deps;

    const pushStateChanged = async (projectPath) => {
        if (!emitProjectState) return;
        const state = await ProjectService.getState({ projectPath });
        emitProjectState(projectPath, state);
    };

    ipcMain.handle('project:get-state', async (event, payload) => {
        try {
            if (!payload?.projectPath) {
                return fail('VALIDATION_ERROR', '参数无效：缺少 projectPath。');
            }
            const data = await ProjectService.getState({ projectPath: payload.projectPath });
            return { success: true, data };
        } catch (error) {
            return handleError(error, '获取项目状态失败。');
        }
    });

    ipcMain.handle('project:select-node', async (event, payload) => {
        try {
            if (!payload?.projectPath || !payload?.nodeId) {
                return fail('VALIDATION_ERROR', '参数无效：缺少 projectPath 或 nodeId。');
            }
            const data = await ProjectService.selectNode({
                projectPath: payload.projectPath,
                nodeId: payload.nodeId,
                expectedRevision: payload.expectedRevision
            });
            return { success: true, data };
        } catch (error) {
            return handleError(error, '选择节点失败。');
        }
    });

    ipcMain.handle('project:load-node-field', async (event, payload) => {
        try {
            if (!payload?.projectPath || !payload?.nodeId || !payload?.field) {
                return fail('VALIDATION_ERROR', '参数无效：缺少 projectPath/nodeId/field。');
            }
            const data = await ProjectService.loadNodeField({
                projectPath: payload.projectPath,
                nodeId: payload.nodeId,
                field: payload.field
            });
            return { success: true, data };
        } catch (error) {
            return handleError(error, '加载节点字段失败。');
        }
    });

    ipcMain.handle('project:update-node', async (event, payload) => {
        try {
            if (!payload?.projectPath || !payload?.nodeId || !payload?.field) {
                return fail('VALIDATION_ERROR', '参数无效：缺少 projectPath/nodeId/field。');
            }
            const data = await ProjectService.updateNode({
                projectPath: payload.projectPath,
                nodeId: payload.nodeId,
                field: payload.field,
                value: payload.value,
                expectedRevision: payload.expectedRevision
            });
            await pushStateChanged(payload.projectPath);
            return { success: true, data };
        } catch (error) {
            return handleError(error, '更新节点失败。');
        }
    });

    ipcMain.handle('project:save', async (event, payload) => {
        try {
            if (!payload?.projectPath) {
                return fail('VALIDATION_ERROR', '参数无效：缺少 projectPath。');
            }
            const data = await ProjectService.saveProject({
                projectPath: payload.projectPath,
                expectedRevision: payload.expectedRevision
            });
            await pushStateChanged(payload.projectPath);
            return { success: true, data };
        } catch (error) {
            return handleError(error, '保存项目失败。');
        }
    });

    ipcMain.handle('project:add-node', async (event, payload) => {
        try {
            if (!payload?.projectPath || !payload?.parentId || !payload?.type) {
                return fail('VALIDATION_ERROR', '参数无效：缺少 projectPath/parentId/type。');
            }
            const data = await ProjectService.addNode({
                projectPath: payload.projectPath,
                parentId: payload.parentId,
                type: payload.type,
                expectedRevision: payload.expectedRevision
            });
            await pushStateChanged(payload.projectPath);
            return { success: true, data };
        } catch (error) {
            return handleError(error, '新增节点失败。');
        }
    });

    ipcMain.handle('project:rename-node', async (event, payload) => {
        try {
            if (!payload?.projectPath || !payload?.nodeId) {
                return fail('VALIDATION_ERROR', '参数无效：缺少 projectPath 或 nodeId。');
            }
            const data = await ProjectService.renameNode({
                projectPath: payload.projectPath,
                nodeId: payload.nodeId,
                title: payload.title,
                expectedRevision: payload.expectedRevision
            });
            await pushStateChanged(payload.projectPath);
            return { success: true, data };
        } catch (error) {
            return handleError(error, '重命名节点失败。');
        }
    });

    ipcMain.handle('project:delete-node', async (event, payload) => {
        try {
            if (!payload?.projectPath || !payload?.nodeId) {
                return fail('VALIDATION_ERROR', '参数无效：缺少 projectPath 或 nodeId。');
            }
            const data = await ProjectService.deleteNode({
                projectPath: payload.projectPath,
                nodeId: payload.nodeId,
                expectedRevision: payload.expectedRevision
            });
            await pushStateChanged(payload.projectPath);
            return { success: true, data };
        } catch (error) {
            return handleError(error, '删除节点失败。');
        }
    });

    ipcMain.handle('project:split-short-preview', async (event, payload) => {
        try {
            const chapterCount = Number(payload?.chapterCount);
            if (!payload?.projectPath || !payload?.sourceNodeId || !isValidSplitTargetType(payload?.targetNodeType) || !isValidChapterCount(chapterCount)) {
                return fail('VALIDATION_ERROR', '参数无效：projectPath/sourceNodeId/targetNodeType/chapterCount 不合法。');
            }

            const data = await ProjectService.splitShortPreview({
                projectPath: payload.projectPath,
                sourceNodeId: payload.sourceNodeId,
                targetNodeType: payload.targetNodeType,
                chapterCount,
                modelName: payload.modelName,
                temperature: payload.temperature,
                backendPort: getBackendPort(),
                backendToken: getBackendToken()
            });
            return { success: true, ...data };
        } catch (error) {
            return handleError(error, '生成章节预览失败。');
        }
    });

    ipcMain.handle('project:apply-short-split', async (event, payload) => {
        try {
            if (!payload?.projectPath || !payload?.sourceNodeId || !isValidSplitTargetType(payload?.targetNodeType) || payload?.overwriteAll !== true || !Array.isArray(payload?.chapters)) {
                return fail('VALIDATION_ERROR', '参数无效：projectPath/sourceNodeId/targetNodeType/overwriteAll/chapters 不合法。');
            }

            const data = await ProjectService.applyShortSplit({
                projectPath: payload.projectPath,
                sourceNodeId: payload.sourceNodeId,
                targetNodeType: payload.targetNodeType,
                chapters: payload.chapters,
                overwriteAll: true,
                expectedRevision: payload.expectedRevision
            });

            await pushStateChanged(payload.projectPath);

            return { success: true, data };
        } catch (error) {
            return handleError(error, '应用章节拆分失败。');
        }
    });
};
