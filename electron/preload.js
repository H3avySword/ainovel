const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    minimize: () => ipcRenderer.send('window-minimize'),
    maximize: () => ipcRenderer.send('window-maximize'),
    close: () => ipcRenderer.send('window-close'),

    // Project bootstrap
    selectDirectory: () => ipcRenderer.invoke('select-directory'),
    getLastProject: () => ipcRenderer.invoke('get-last-project'),
    createProject: (dirPath, nodes, mode) => ipcRenderer.invoke('create-project', dirPath, nodes, mode),

    // Project commands
    project: {
        getState: (payload) => ipcRenderer.invoke('project:get-state', payload),
        selectNode: (payload) => ipcRenderer.invoke('project:select-node', payload),
        loadNodeField: (payload) => ipcRenderer.invoke('project:load-node-field', payload),
        updateNode: (payload) => ipcRenderer.invoke('project:update-node', payload),
        save: (payload) => ipcRenderer.invoke('project:save', payload),
        addNode: (payload) => ipcRenderer.invoke('project:add-node', payload),
        renameNode: (payload) => ipcRenderer.invoke('project:rename-node', payload),
        deleteNode: (payload) => ipcRenderer.invoke('project:delete-node', payload),
        splitShortPreview: (payload) => ipcRenderer.invoke('project:split-short-preview', payload),
        applyShortSplit: (payload) => ipcRenderer.invoke('project:apply-short-split', payload)
    },

    // App Config & Lifecycle
    getAppConfig: () => ipcRenderer.invoke('get-app-config'),
    onBackendReady: (callback) => {
        const subscription = (event, ...args) => callback(...args);
        ipcRenderer.on('backend-ready', subscription);
        return () => {
            ipcRenderer.removeListener('backend-ready', subscription);
        };
    },
    onProjectStateChanged: (callback) => {
        const subscription = (event, payload) => callback(payload);
        ipcRenderer.on('project:state-changed', subscription);
        return () => {
            ipcRenderer.removeListener('project:state-changed', subscription);
        };
    }
});
