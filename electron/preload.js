const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    minimize: () => ipcRenderer.send('window-minimize'),
    maximize: () => ipcRenderer.send('window-maximize'),
    close: () => ipcRenderer.send('window-close'),

    // File/Project
    showSaveDialog: (defaultName) => ipcRenderer.invoke('show-save-dialog', defaultName),
    saveFile: (path, content) => ipcRenderer.invoke('save-file', path, content),
    selectDirectory: () => ipcRenderer.invoke('select-directory'),
    saveProject: (path, content) => ipcRenderer.invoke('save-project', path, content),
    saveProjectMeta: (path, content) => ipcRenderer.invoke('save-project-meta', path, content), // [NEW]
    loadProject: (path) => ipcRenderer.invoke('load-project', path),
    getLastProject: () => ipcRenderer.invoke('get-last-project'),

    // File System Operations [NEW]
    readFileContent: (path) => ipcRenderer.invoke('read-file-content', path),
    saveFileContent: (path, content) => ipcRenderer.invoke('save-file-content', path, content),
    ensureDirectory: (path) => ipcRenderer.invoke('ensure-directory', path),
    moveToTrash: (path, projectRoot) => ipcRenderer.invoke('move-to-trash', path, projectRoot),
    pathJoin: (...args) => ipcRenderer.invoke('path-join', ...args), // [NEW]

    // Node Operations
    loadNodeContent: (projectPath, nodes, mode, nodeId, fileType) => ipcRenderer.invoke('load-node-content', { projectPath, nodes, mode, nodeId, fileType }),
    saveNodeContent: (projectPath, nodes, mode, nodeId, content, fileType) => ipcRenderer.invoke('save-node-content', { projectPath, nodes, mode, nodeId, content, fileType }),
    deleteNodeFile: (projectPath, nodes, mode, nodeId, fileType) => ipcRenderer.invoke('delete-node-file', { projectPath, nodes, mode, nodeId, fileType }),
    createProject: (dirPath, nodes, mode) => ipcRenderer.invoke('create-project', dirPath, nodes, mode),

    // App Config & Lifecycle
    getAppConfig: () => ipcRenderer.invoke('get-app-config'),
    onBackendReady: (callback) => {
        const subscription = (event, ...args) => callback(...args);
        ipcRenderer.on('backend-ready', subscription);
        return () => {
            ipcRenderer.removeListener('backend-ready', subscription);
        };
    }
});
