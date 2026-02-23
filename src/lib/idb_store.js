// --- Lightweight IndexedDB wrapper for Persistence ---
const DB_NAME = 'RedlyDB';
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
