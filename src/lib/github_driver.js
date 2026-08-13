import FS from '@isomorphic-git/lightning-fs';

const fs = new FS('redly-github');
const pfs = fs.promises;

/** 
 * GitHub Driver for Redly (Worker-Optimized)
 * Bridges the Redly UI with a background Git Worker for a lag-free experience.
 */

const githubConfigs = new Map();

let worker = null;
const pendingPromises = new Map();
let messageIdCounter = 0;

const getWorker = () => {
    if (worker) return worker;
    
    // Vite-specific worker initialization
    worker = new Worker(new URL('./github_worker.js', import.meta.url), { type: 'module' });
    
    worker.onmessage = ({ data }) => {
        const { id, type, error } = data;
        const promise = pendingPromises.get(id);
        if (!promise) return;
        
        if (type === 'SUCCESS') promise.resolve();
        else promise.reject(new Error(error || 'Action failed'));
        
        pendingPromises.delete(id);
    };
    
    return worker;
};

const sendRequest = (type, payload = {}) => {
    const id = messageIdCounter++;
    const worker = getWorker();
    
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            pendingPromises.delete(id);
            reject(new Error(`Timeout: ${type} request took too long`));
        }, 300000); // 5 minute timeout for Git operations

        pendingPromises.set(id, { 
            resolve: (val) => { clearTimeout(timeout); resolve(val); }, 
            reject: (err) => { clearTimeout(timeout); reject(err); } 
        });
        worker.postMessage({ id, type, payload });
    });
};

export const setConfig = (workspaceId, config) => {
    const existing = githubConfigs.get(workspaceId) || {
        branch: 'main',
        corsProxy: 'https://cors.isomorphic-git.org'
    };
    githubConfigs.set(workspaceId, { ...existing, ...config });
};

export const init = async (workspaceId) => {
    try {
        await pfs.stat(`/notes/${workspaceId}/.git`);
        return true;
    } catch (e) {
        return false; 
    }
};

export const cloneRepo = async (workspaceId, config) => {
    setConfig(workspaceId, config);
    const resolvedConfig = githubConfigs.get(workspaceId);
    const url = `https://github.com/${resolvedConfig.owner}/${resolvedConfig.repo}.git`;
    
    return sendRequest('CLONE', {
        workspaceId,
        url,
        token: resolvedConfig.token,
        corsProxy: resolvedConfig.corsProxy
    });
};

export const pull = async (workspaceId) => {
    const config = githubConfigs.get(workspaceId);
    if (!config || !config.token) return;
    return sendRequest('PULL', {
        workspaceId,
        token: config.token,
        corsProxy: config.corsProxy
    });
};

export const push = async (workspaceId) => {
    const config = githubConfigs.get(workspaceId);
    if (!config || !config.token) return;
    return sendRequest('PUSH', {
        workspaceId,
        token: config.token,
        corsProxy: config.corsProxy
    });
};

export const sync = async (workspaceId) => {
    await pull(workspaceId);
    return true; 
};

// --- Redly File System API Implementation (Main Thread) ---

export const getNodes = async (workspaceId) => {
    const nodes = [];
    const dir = `/notes/${workspaceId}`;
    async function scan(currentDir) {
        let files = [];
        try {
            files = await pfs.readdir(currentDir);
        } catch (e) {
            return;
        }

        for (const name of files) {
            if (name === '.git') continue;
            const path = (currentDir === '/' ? '' : currentDir) + '/' + name;
            const stat = await pfs.lstat(path);
            
            // id is relative to the dir root for the app
            let id = path;
            if (path.startsWith(dir)) {
                id = path.substring(dir.length + 1); // Remove '/notes/workspaceId/'
            }

            if (stat.isDirectory()) {
                nodes.push({ id, name, type: 'folder', parentId: currentDir === dir ? null : currentDir.substring(dir.length + 1) });
                await scan(path);
            } else if (name.endsWith('.md') || name.endsWith('.json') || name.includes('.')) {
                nodes.push({ id, name, type: 'file', parentId: currentDir === dir ? null : currentDir.substring(dir.length + 1) });
            }
        }
    }
    await scan(dir);
    return nodes;
};

export const getFileContent = async (workspaceId, id) => {
    const content = await pfs.readFile(`/notes/${workspaceId}/${id}`, 'utf8');
    return content;
};

export const createNode = async (workspaceId, node) => {
    const dir = `/notes/${workspaceId}`;
    const path = `${dir}/${node.id}`;
    if (node.type === 'folder') {
        await pfs.mkdir(path);
    } else {
        await pfs.writeFile(path, node.content || '');
    }
    
    const config = githubConfigs.get(workspaceId);
    sendRequest('COMMIT', {
        workspaceId,
        filepath: node.id,
        message: `Create ${node.name}`,
        token: config.token,
        corsProxy: config.corsProxy,
        autoPush: true
    }).catch(err => console.error('[GitHub Sync] Create Failed:', err));
};

export const updateNode = async (workspaceId, id, updates, oldNode) => {
    const dir = `/notes/${workspaceId}`;
    const oldPath = `${dir}/${id}`;
    const config = githubConfigs.get(workspaceId);
    
    // 1. Handle Content Translation
    if (updates.content !== undefined) {
        await pfs.writeFile(oldPath, updates.content);
        
        sendRequest('COMMIT', {
            workspaceId,
            filepath: id,
            message: `Update ${id}`,
            token: config.token,
            corsProxy: config.corsProxy,
            autoPush: true
        }).catch(err => console.error('[GitHub Sync] Update Failed:', err));
    }

    // 2. Handle Renaming or Moving
    if ((updates.name && updates.name !== oldNode.name) || (updates.parentId !== undefined && updates.parentId !== oldNode.parentId)) {
        const newName = updates.name || oldNode.name;
        const newParentId = updates.parentId !== undefined ? updates.parentId : oldNode.parentId;
        
        // Construct new ID (same logic as local_driver)
        let newId = id;
        if (oldNode.type === 'file') {
            const fileName = newName.includes('.') ? newName : `${newName}.md`;
            newId = newParentId ? `${newParentId}/${fileName}` : fileName;
        } else {
            newId = newParentId ? `${newParentId}/${newName}` : newName;
        }

        const newPath = `${dir}/${newId}`;
        
        // Ensure parent directory exists if moving
        if (updates.parentId !== undefined) {
            const parentDir = newPath.substring(0, newPath.lastIndexOf('/'));
            try { await pfs.mkdir(parentDir); } catch(e) {}
        }

        await pfs.rename(oldPath, newPath);

        sendRequest('RENAME', {
            workspaceId,
            oldPath: id,
            newPath: newId,
            message: `Rename ${oldNode.name} to ${newName}`,
            token: config.token,
            corsProxy: config.corsProxy,
            autoPush: true
        }).catch(err => console.error('[GitHub Sync] Rename Failed:', err));

        return { ...oldNode, ...updates, id: newId };
    }
};

export const deleteNode = async (workspaceId, id, type) => {
    const dir = `/notes/${workspaceId}`;
    const path = `${dir}/${id}`;
    if (type === 'folder') {
        const deleteRecursive = async (dirPath) => {
            const files = await pfs.readdir(dirPath).catch(() => []);
            for (const file of files) {
                const fullPath = `${dirPath}/${file}`;
                const stats = await pfs.stat(fullPath);
                if (stats.isDirectory()) {
                    await deleteRecursive(fullPath);
                } else {
                    await pfs.unlink(fullPath);
                }
            }
            await pfs.rmdir(dirPath);
        };
        await deleteRecursive(path);
    } else {
        await pfs.unlink(path);
    }
    
    const config = githubConfigs.get(workspaceId);
    sendRequest('DELETE', {
        workspaceId,
        filepath: id,
        message: `Delete ${id}`,
        token: config.token,
        corsProxy: config.corsProxy,
        autoPush: true
    }).catch(err => console.error('[GitHub Sync] Delete Failed:', err));
};

export const importNodes = async (workspaceId, nodes) => {
    const dir = `/notes/${workspaceId}`;
    // 1. Write all nodes to filesystem (no Git yet)
    // Sort to ensure folders are created before their children
    const sortedNodes = [...nodes].sort((a, b) => a.id.split('/').length - b.id.split('/').length);

    for (const node of sortedNodes) {
        const path = `${dir}/${node.id}`;
        try {
            if (node.type === 'folder') {
                await pfs.mkdir(path).catch(() => {}); // Ignore if exists
            } else {
                await pfs.writeFile(path, node.content || '');
            }
        } catch (e) {
            console.warn('[GitHub Driver] Failed to write node during import:', node.id, e);
        }
    }

    const config = githubConfigs.get(workspaceId);
    // 2. Perform a single batch commit and push
    return sendRequest('COMMIT', {
        workspaceId,
        filepath: '.',
        message: 'Initial migration to GitHub',
        token: config.token,
        corsProxy: config.corsProxy,
        autoPush: true
    });
};

export const getTrashNodes = async (workspaceId) => {
    return [];
};

export const restoreNode = async (workspaceId, trashId) => {
    return true;
};

export const emptyTrash = async (workspaceId) => {
    return true;
};
