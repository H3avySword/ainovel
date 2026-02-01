
import { NodeMap, ProjectMode } from '../types';

// Helper to access Electron API safely
const electron = (window as any).electronAPI;

export class FileManager {

    /**
     * Resolve the absolute file path for a node.
     * DEPRECATED: Logic moved to backend. Keeping stub if needed, but App.tsx shouldn't use it.
     */
    /*
    public static async getPath(...) {
        throw new Error("getPath is moved to backend");
    }
    */

    /**
     * Save content or outline to disk.
     */
    public static async saveNode(
        projectRoot: string,
        nodes: NodeMap,
        mode: ProjectMode,
        nodeId: string,
        content: string,
        fileType: 'content' | 'outline' | 'setting'
    ): Promise<boolean> {
        try {
            const res = await electron.saveNodeContent(projectRoot, nodes, mode, nodeId, content, fileType);
            if (!res.success) {
                console.error("Failed to save file:", res.error);
                return false;
            }
            return true;
        } catch (err) {
            console.error("Save Helper Error:", err);
            return false;
        }
    }

    /**
     * Load content or outline from disk.
     */
    public static async loadNode(
        projectRoot: string,
        nodes: NodeMap,
        mode: ProjectMode,
        nodeId: string,
        fileType: 'content' | 'outline' | 'setting'
    ): Promise<string> {
        try {
            const res = await electron.loadNodeContent(projectRoot, nodes, mode, nodeId, fileType);
            if (res.success) {
                return res.content;
            } else {
                console.warn("Failed to load file result:", res.error);
                throw new Error(res.error || "Unknown load error");
            }
        } catch (err) {
            console.error("Load Helper Error:", err);
            throw err;
        }
    }

    /**
     * Save Project (project.json only)
     */
    public static async saveProjectMeta(projectRoot: string, updates: any) {
        // Renamed backend method to 'saveProject' and it accepts object updates
        return await electron.saveProject(projectRoot, updates);
    }

    /**
     * Create a new project structure on disk.
     */
    public static async createProject(
        projectRoot: string,
        nodes: NodeMap,
        mode: ProjectMode
    ): Promise<boolean> {
        try {
            const res = await electron.createProject(projectRoot, nodes, mode);
            return res.success;
        } catch (e) {
            console.error("Create Project Failed:", e);
            return false;
        }
    }

    /**
     * Delete a node's associated file (Moved to Trash).
     */
    public static async deleteNodeFile(
        projectRoot: string,
        nodes: NodeMap,
        mode: ProjectMode,
        nodeId: string,
        fileType: 'content' | 'outline' | 'setting'
    ): Promise<boolean> {
        try {
            const res = await electron.deleteNodeFile(projectRoot, nodes, mode, nodeId, fileType);
            return res.success;
        } catch (e) {
            console.error("Delete File Failed:", e);
            return false;
        }
    }
}
