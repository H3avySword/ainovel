import FileManager from '../FileManager.js';

const sessions = new Map();

const clone = (value) => JSON.parse(JSON.stringify(value));

export default class ProjectStore {
    static async ensure(projectPath) {
        const existing = sessions.get(projectPath);
        if (existing) return existing;

        const loaded = await FileManager.loadProject(projectPath);
        if (!loaded.success || !loaded.data) {
            throw new Error(loaded.error || '项目加载失败。');
        }

        const data = loaded.data;
        const state = {
            projectPath,
            projectMode: data.projectMode || 'LONG',
            nodes: data.nodes || {},
            lastOpenedId: data.lastOpenedId || 'story-root',
            revision: 1
        };
        sessions.set(projectPath, state);
        return state;
    }

    static async refresh(projectPath) {
        sessions.delete(projectPath);
        return this.ensure(projectPath);
    }

    static async getSnapshot(projectPath) {
        const state = await this.ensure(projectPath);
        return {
            projectMode: state.projectMode,
            nodes: clone(state.nodes),
            lastOpenedId: state.lastOpenedId,
            revision: state.revision
        };
    }

    static bumpRevision(state) {
        state.revision += 1;
    }

    static assertRevision(state, expectedRevision) {
        if (expectedRevision === undefined || expectedRevision === null) return;
        if (!Number.isInteger(expectedRevision)) {
            const error = new Error('expectedRevision 非法。');
            error.code = 'VALIDATION_ERROR';
            throw error;
        }
        if (expectedRevision !== state.revision) {
            const error = new Error(`版本冲突：当前版本 ${state.revision}，请求版本 ${expectedRevision}。`);
            error.code = 'REVISION_CONFLICT';
            throw error;
        }
    }
}
