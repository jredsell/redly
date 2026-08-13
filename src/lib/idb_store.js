// --- Lightweight IndexedDB wrapper for Persistence ---
const DB_NAME = 'redly';
const STORE_NAME = 'handles';

const getDB = () => new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME);
        }
    };
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = () => reject('IDB Error');
});

export const setHandle = async (key, handle) => {
    const db = await getDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.put(handle, key);
        req.onsuccess = () => resolve();
        req.onerror = () => reject('Failed to save handle');
    });
};

export const getHandle = async (key) => {
    const db = await getDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(key);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject('Failed to retrieve handle');
    });
};

export const clearHandles = async () => {
    const db = await getDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.clear();
        tx.oncomplete = () => resolve();
        req.onerror = () => reject('Failed to clear handles');
    });
};

// --- Multi-Workspace Management Helpers ---
export const getWorkspaces = async () => {
    try {
        const ws = await getHandle('workspaces');
        return ws || [];
    } catch (e) {
        return [];
    }
};

export const saveWorkspaces = async (workspaces) => {
    await setHandle('workspaces', workspaces);
};

export const addWorkspace = async (workspaceConfig) => {
    const workspaces = await getWorkspaces();
    const exists = workspaces.find(w => w.id === workspaceConfig.id);
    if (!exists) {
        workspaces.push(workspaceConfig);
        await saveWorkspaces(workspaces);
    }
    return workspaces;
};

export const removeWorkspace = async (workspaceId) => {
    const workspaces = await getWorkspaces();
    const filtered = workspaces.filter(w => w.id !== workspaceId);
    await saveWorkspaces(filtered);
    return filtered;
};
