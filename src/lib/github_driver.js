import FS from '@isomorphic-git/lightning-fs';

const fs = new FS('redly-github');
const pfs = fs.promises;
const dir = '/notes'; // Must match the worker path

/** 
 * GitHub Driver for Redly (Worker-Optimized)
 * Bridges the Redly UI with a background Git Worker for a lag-free experience.
 */

let githubConfig = {
    token: null,
    repo: null,
    owner: null,
    branch: 'main',
    corsProxy: 'https://cors.isomorphic-git.org'
};

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

export const setConfig = (config) => {
    githubConfig = { ...githubConfig, ...config };
};

export const init = async () => {
    try {
        await pfs.stat(`${dir}/.git`);
        return true;
    } catch (e) {
        return false; 
    }
};

export const cloneRepo = async (config) => {
    githubConfig = { ...githubConfig, ...config };
    const url = `https://github.com/${config.owner}/${config.repo}.git`;
    
    return sendRequest('CLONE', {
        url,
        token: config.token,
        corsProxy: githubConfig.corsProxy
    });
};

export const pull = async () => {
    if (!githubConfig.token) return;
    return sendRequest('PULL', {
        token: githubConfig.token,
        corsProxy: githubConfig.corsProxy
    });
};

export const push = async () => {
    if (!githubConfig.token) return;
    return sendRequest('PUSH', {
        token: githubConfig.token,
        corsProxy: githubConfig.corsProxy
    });
};

export const sync = async () => {
    await pull();
    return true; 
};

// --- Redly File System API Implementation (Main Thread) ---

export const getNodes = async () => {
    const nodes = [];
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
                id = path.substring(dir.length + 1); // Remove '/notes/'
            }

            if (stat.isDirectory()) {
                nodes.push({ id, name, type: 'folder', parentId: currentDir === dir ? null : currentDir.substring(dir.length + 1) });
                await scan(path);
            } else if (name.endsWith('.md') || name.endsWith('.json')) {
                nodes.push({ id, name, type: 'file', parentId: currentDir === dir ? null : currentDir.substring(dir.length + 1) });
            }
        }
    }
    await scan(dir);
    return nodes;
};

export const getFileContent = async (id) => {
    const content = await pfs.readFile(`${dir}/${id}`, 'utf8');
    return content;
};

export const createNode = async (node) => {
    const path = `${dir}/${node.id}`;
    if (node.type === 'folder') {
        await pfs.mkdir(path);
    } else {
        await pfs.writeFile(path, node.content || '');
    }
    
    sendRequest('COMMIT', {
        filepath: node.id,
        message: `Create ${node.name}`,
        token: githubConfig.token,
        corsProxy: githubConfig.corsProxy,
        autoPush: true
    }).catch(err => console.error('[GitHub Sync] Create Failed:', err));
};

export const updateNode = async (id, updates) => {
    const path = `${dir}/${id}`;
    if (updates.content !== undefined) {
        await pfs.writeFile(path, updates.content);
        
        sendRequest('COMMIT', {
            filepath: id,
            message: `Update ${id}`,
            token: githubConfig.token,
            corsProxy: githubConfig.corsProxy,
            autoPush: true
        }).catch(err => console.error('[GitHub Sync] Update Failed:', err));
    }
};

export const deleteNode = async (id, type) => {
    const path = `${dir}/${id}`;
    if (type === 'folder') {
        await pfs.rmdir(path, { recursive: true });
    } else {
        await pfs.unlink(path);
    }
    
    sendRequest('COMMIT', {
        filepath: id,
        message: `Delete ${id}`,
        token: githubConfig.token,
        corsProxy: githubConfig.corsProxy,
        autoPush: true
    }).catch(err => console.error('[GitHub Sync] Delete Failed:', err));
};

export const importNodes = async (nodes) => {
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

    // 2. Perform a single batch commit and push
    return sendRequest('COMMIT', {
        filepath: '.',
        message: 'Initial migration to GitHub',
        token: githubConfig.token,
        corsProxy: githubConfig.corsProxy,
        autoPush: true
    });
};
