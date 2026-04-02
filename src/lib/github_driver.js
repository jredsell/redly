import FS from '@isomorphic-git/lightning-fs';

const fs = new FS('redly-github');
const pfs = fs.promises;
const dir = '/';

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
        else promise.reject(new Error(error));
        
        pendingPromises.delete(id);
    };
    
    return worker;
};

const sendRequest = (type, payload = {}) => {
    const id = messageIdCounter++;
    const worker = getWorker();
    
    return new Promise((resolve, reject) => {
        pendingPromises.set(id, { resolve, reject });
        worker.postMessage({ id, type, payload });
    });
};

export const setConfig = (config) => {
    githubConfig = { ...githubConfig, ...config };
};

export const init = async () => {
    try {
        await pfs.stat('/.git');
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
// We keep these in the main thread for instant UI response time.

export const getNodes = async () => {
    const nodes = [];
    async function scan(currentDir) {
        const files = await pfs.readdir(currentDir);
        for (const name of files) {
            if (name === '.git') continue;
            const path = (currentDir === '/' ? '' : currentDir) + '/' + name;
            const stat = await pfs.lstat(path);
            const id = path.substring(1); 

            if (stat.isDirectory()) {
                nodes.push({ id, name, type: 'folder', parentId: currentDir === '/' ? null : currentDir.substring(1) });
                await scan(path);
            } else if (name.endsWith('.md') || name.endsWith('.json')) {
                nodes.push({ id, name, type: 'file', parentId: currentDir === '/' ? null : currentDir.substring(1) });
            }
        }
    }
    await scan('/');
    return nodes;
};

export const getFileContent = async (id) => {
    const content = await pfs.readFile('/' + id, 'utf8');
    return content;
};

export const createNode = async (node) => {
    const path = '/' + node.id;
    if (node.type === 'folder') {
        await pfs.mkdir(path);
    } else {
        await pfs.writeFile(path, node.content || '');
    }
    
    // Asynchronously commit and push via worker (Don't await it to keep UI fast!)
    sendRequest('COMMIT', {
        filepath: node.id,
        message: `Create ${node.name}`,
        token: githubConfig.token,
        corsProxy: githubConfig.corsProxy,
        autoPush: true
    }).catch(err => console.error('[GitHub Sync] Create Failed:', err));
};

export const updateNode = async (id, updates) => {
    const path = '/' + id;
    if (updates.content !== undefined) {
        await pfs.writeFile(path, updates.content);
        
        // Asynchronously commit and push via worker
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
    const path = '/' + id;
    if (type === 'folder') {
        await pfs.rmdir(path, { recursive: true });
    } else {
        await pfs.unlink(path);
    }
    
    // Asynchronously commit and push via worker
    sendRequest('COMMIT', {
        filepath: id,
        message: `Delete ${id}`,
        token: githubConfig.token,
        corsProxy: githubConfig.corsProxy,
        autoPush: true
    }).catch(err => console.error('[GitHub Sync] Delete Failed:', err));
};
