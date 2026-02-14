const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    minimize: () => ipcRenderer.send('window-minimize'),
    maximize: () => ipcRenderer.send('window-maximize'),
    close: () => ipcRenderer.send('window-close'),
    clipboard: {
        readText: () => ipcRenderer.invoke('clipboard:read-text'),
        writeText: (text) => ipcRenderer.invoke('clipboard:write-text', text),
    },

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
    providerCache: {
        get: (providerKey) => ipcRenderer.invoke('provider-cache:get', providerKey),
        set: (providerKey, payload) => ipcRenderer.invoke('provider-cache:set', providerKey, payload),
        clear: (providerKey) => ipcRenderer.invoke('provider-cache:clear', providerKey)
    },
    providerSelection: {
        get: () => ipcRenderer.invoke('provider-selection:get'),
        set: (providerKey) => ipcRenderer.invoke('provider-selection:set', providerKey)
    },
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
