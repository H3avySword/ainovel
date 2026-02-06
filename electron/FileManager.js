import fs from 'fs/promises';
import path from 'path';
import { app } from 'electron';

const writeQueues = new Map();

const enqueueFileWrite = (filePath, writer) => {
    const previous = writeQueues.get(filePath) || Promise.resolve();
    const current = previous
        .catch(() => {})
        .then(writer)
        .finally(() => {
            if (writeQueues.get(filePath) === current) {
                writeQueues.delete(filePath);
            }
        });
    writeQueues.set(filePath, current);
    return current;
};

export default class FileManager {

    static async writeTextAtomic(filePath, content) {
        return enqueueFileWrite(filePath, async () => {
            const tempPath = `${filePath}.${Date.now()}.${Math.random().toString(16).slice(2)}.tmp`;
            await fs.mkdir(path.dirname(filePath), { recursive: true });
            await fs.writeFile(tempPath, content, 'utf-8');
            await fs.rename(tempPath, filePath);
        });
    }

    // --- Path Resolution Logic (Ported from Frontend) ---

    /**
     * Build path segments for a node based on the node tree.
     * @param {Object} nodes - The node map.
     * @param {string} nodeId - The ID of the node.
     * @returns {string[]} - Array of path segments.
     */
    static getPathSegments(nodes, nodeId) {
        const segments = [];
        let current = nodes[nodeId];

        while (current && current.parentId) {
            const parent = nodes[current.parentId];
            if (!parent) break;

            // VOLUME and SECTION are directory containers
            // SETTING_FOLDER/ROOT are also containers
            if (parent.type === 'VOLUME' || parent.type === 'SECTION') {
                segments.unshift(parent.id);
            } else if (parent.type === 'SETTING_FOLDER' || parent.type === 'SETTING_ROOT') {
                // Use ID for folder names to ensure stability
                segments.unshift(parent.id);
            }
            current = parent;
        }
        return segments;
    }

    /**
     * Resolve absolute file path.
     */
    static getPath(projectRoot, nodes, mode, nodeId, fileType) {
        const node = nodes[nodeId];
        if (!node) throw new Error(`Node ${nodeId} not found`);

        const isShort = mode === 'SHORT';
        const segments = this.getPathSegments(nodes, nodeId);

        // 1. SETTINGS
        if (fileType === 'setting') {
            return path.join(projectRoot, 'Settings', ...segments, `${node.id}.md`);
        }

        // 2. GLOBAL OUTLINE
        if (node.type === 'ROOT') {
            return path.join(projectRoot, 'outlines', 'global_outline.md');
        }

        // 3. CONTENT (Chapters)
        if (fileType === 'content') {
            if (node.type !== 'CHAPTER') throw new Error("Only Chapters have content");
            if (isShort) {
                return path.join(projectRoot, 'contents', `${node.id}.md`);
            } else {
                return path.join(projectRoot, 'contents', ...segments, `${node.id}.md`);
            }
        }

        // 4. NODE OUTLINE (Summary)
        if (fileType === 'outline') {
            if (node.type === 'VOLUME') {
                return path.join(projectRoot, 'outlines', node.id, `${node.id}_outline.md`);
            }
            if (node.type === 'SECTION') {
                return path.join(projectRoot, 'outlines', ...segments, node.id, `${node.id}_outline.md`);
            }
            if (node.type === 'CHAPTER') {
                if (isShort) {
                    return path.join(projectRoot, 'outlines', `${node.id}_outline.md`);
                } else {
                    return path.join(projectRoot, 'outlines', ...segments, `${node.id}_outline.md`);
                }
            }
        }

        throw new Error(`Unsupported path resolution for node ${node.type} / ${fileType}`);
    }

    // --- Helper: Settings Management ---

    static async loadAppSettings() {
        const userDataPath = app.getPath('userData');
        const settingsFile = path.join(userDataPath, 'settings.json');
        try {
            const data = await fs.readFile(settingsFile, 'utf-8');
            return JSON.parse(data);
        } catch (e) {
            return {};
        }
    }

    static async saveAppSettings(settings) {
        const userDataPath = app.getPath('userData');
        const settingsFile = path.join(userDataPath, 'settings.json');
        try {
            await fs.writeFile(settingsFile, JSON.stringify(settings, null, 2), 'utf-8');
        } catch (e) {
            console.error('Failed to save settings:', e);
        }
    }

    // --- Public API ---

    /**
     * Load Project: Read project.json and update lastProject setting.
     */
    static async loadProject(dirPath) {
        try {
            const filePath = path.join(dirPath, 'project.json');
            const content = await fs.readFile(filePath, 'utf-8');

            // Validate JSON
            const data = JSON.parse(content);

            // Update Last Project
            const settings = await this.loadAppSettings();
            if (settings.lastProject !== dirPath) {
                settings.lastProject = dirPath;
                await this.saveAppSettings(settings);
            }

            return { success: true, data };
        } catch (e) {
            console.error('Load project failed:', e);
            return { success: false, error: e.message };
        }
    }

    /**
     * Save Project: Updates project.json with new data.
     * Merges provided updates with existing data to preserve fields like createdAt.
     * @param {string} dirPath - Project root directory.
     * @param {Object} updates - Object containing fields to update (nodes, projectMode, etc).
     */
    static async saveProject(dirPath, updates) {
        try {
            const filePath = path.join(dirPath, 'project.json');

            // 1. Read existing file
            let existingData = {};
            try {
                const content = await fs.readFile(filePath, 'utf-8');
                const trimmed = content.trim();
                existingData = trimmed ? JSON.parse(trimmed) : {};
            } catch (e) {
                // 文件不存在或内容损坏时，按空对象继续，避免保存流程中断。
                if (e.code !== 'ENOENT' && !(e instanceof SyntaxError)) throw e;
            }

            // 2. Merge updates
            const projectData = {
                ...existingData,
                ...updates,
                updatedAt: Date.now(), // Always update timestamp
                version: existingData.version || "1.0.0"
            };

            // 3. Write back
            await this.writeTextAtomic(filePath, JSON.stringify(projectData, null, 2));

            // 4. Update Last Project Setting
            const settings = await this.loadAppSettings();
            if (settings.lastProject !== dirPath) {
                settings.lastProject = dirPath;
                await this.saveAppSettings(settings);
            }

            return { success: true };
        } catch (e) {
            console.error('Save project failed:', e);
            return { success: false, error: e.message };
        }
    }

    static async saveProjectMeta(projectRoot, content) {
        const filePath = path.join(projectRoot, 'project.json');
        await this.writeTextAtomic(filePath, content);
    }

    /**
     * Save Node Content or Outline.
     * Expects `nodes` map to be passed to resolve path correctly.
     */
    static async saveNodeContent(projectRoot, nodes, mode, nodeId, content, fileType) {
        try {
            const filePath = this.getPath(projectRoot, nodes, mode, nodeId, fileType);

            // Ensure dir exists
            await fs.mkdir(path.dirname(filePath), { recursive: true });

            await fs.writeFile(filePath, content, 'utf-8');
            return { success: true };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    /**
     * Load Node Content or Outline.
     */
    static async loadNodeContent(projectRoot, nodes, mode, nodeId, fileType) {
        try {
            const filePath = this.getPath(projectRoot, nodes, mode, nodeId, fileType);
            const content = await fs.readFile(filePath, 'utf-8');
            return { success: true, content };
        } catch (e) {
            if (e.code === 'ENOENT') {
                return { success: true, content: '' }; // Empty if not found
            }
            return { success: false, error: e.message };
        }
    }

    /**
     * Create New Project Scaffold.
     */
    static async createProject(projectRoot, initialNodes, mode) {
        try {
            // 1. Create Base Dirs
            const dirs = ['contents', 'outlines', 'Settings', 'vector_db', '.trash'];
            for (const dir of dirs) {
                await fs.mkdir(path.join(projectRoot, dir), { recursive: true });
            }

            // 2. Create Settings Subdirs
            const settingsDirs = ['Characters', 'Locations', 'Items', 'Terms'];
            for (const sub of settingsDirs) {
                await fs.mkdir(path.join(projectRoot, 'Settings', sub), { recursive: true });
            }

            // 3. Global Outline
            await fs.writeFile(path.join(projectRoot, 'outlines', 'global_outline.md'), '', 'utf-8');

            // 4. Initial Node Files
            for (const node of Object.values(initialNodes)) {
                if (node.type === 'CHAPTER') {
                    await this.saveNodeContent(projectRoot, initialNodes, mode, node.id, '', 'content');
                }
                if (node.summary) {
                    await this.saveNodeContent(projectRoot, initialNodes, mode, node.id, node.summary, 'outline');
                }
            }

            // 5. Save project.json
            const projectData = {
                version: "1.0.0",
                projectMode: mode,
                createdAt: Date.now(),
                updatedAt: Date.now(),
                lastOpenedId: 'story-root',
                nodes: initialNodes
            };

            await this.saveProjectMeta(projectRoot, JSON.stringify(projectData, null, 2));

            return { success: true };
        } catch (e) {
            console.error("Create Project Failed:", e);
            return { success: false, error: e.message };
        }
    }

    /**
     * Move Node File to Trash (when deleting a node).
     */
    static async deleteNodeFile(projectRoot, nodes, mode, nodeId, fileType) {
        try {
            const filePath = this.getPath(projectRoot, nodes, mode, nodeId, fileType);

            const trashDir = path.join(projectRoot, '.trash');
            await fs.mkdir(trashDir, { recursive: true });

            const fileName = path.basename(filePath);
            const timestamp = Date.now();
            const trashPath = path.join(trashDir, `${timestamp}_${fileName}`);

            await fs.rename(filePath, trashPath);
            return { success: true };
        } catch (e) {
            // Check if file exists, if not, it's already "deleted"
            if (e.code === 'ENOENT') return { success: true };
            return { success: false, error: e.message };
        }
    }

    // Legacy helper for generic file writes if needed (e.g. vector db)
    static async ensureDirectory(dirPath) {
        try {
            await fs.mkdir(dirPath, { recursive: true });
            return { success: true };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }
}


