const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    showOpenDialog: () => ipcRenderer.invoke('dialog:openDirectory'),
    getNodes: (rootPath) => ipcRenderer.invoke('fs:walk', rootPath),
    createNode: (rootPath, node) => ipcRenderer.invoke('fs:createNode', rootPath, node),
    updateNode: (rootPath, id, updates, oldNode) => ipcRenderer.invoke('fs:updateNode', rootPath, id, updates, oldNode),
    deleteNode: (rootPath, id, type) => ipcRenderer.invoke('fs:deleteNode', rootPath, id, type)
});
