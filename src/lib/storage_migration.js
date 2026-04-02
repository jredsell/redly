/**
 * migrationUtility.js - Handles migrating data from legacy storage (IndexedDB/LocalStorage) 
 * to the modern OPFS (Origin Private File System) sandbox.
 */

import * as db from './db';

const LEGACY_LS_KEY = 'redly_notes_data';
const LEGACY_IDB_NAME = 'redly-legacy-notes';
const LEGACY_IDB_STORE = 'notes';

// idb-keyval defaults
const IDB_KEYVAL_NAME = 'keyval-store';
const IDB_KEYVAL_STORE = 'keyval';

/**
 * Checks for any legacy data and migrates it to OPFS.
 * Returns true if migration was performed.
 */
export const migrateFromLegacy = async () => {
    let migrated = false;

    // 1. Check LocalStorage (Easy)
    const lsData = localStorage.getItem(LEGACY_LS_KEY);
    if (lsData) {
        try {
            console.log("[Migration] Found legacy LocalStorage data. Migrating...");
            const backup = JSON.parse(lsData);
            if (backup && backup.nodes) {
                await db.importSandboxData(backup);
                localStorage.removeItem(LEGACY_LS_KEY);
                migrated = true;
            }
        } catch (e) {
            console.error("[Migration] Failed to migrate LocalStorage data:", e);
        }
    }

    // 2. Check IndexedDB (More involved)
    // We attempt to open the legacy DB if it exists
    const dbs = await window.indexedDB.databases?.() || [];
    const hasLegacyDB = dbs.some(d => d.name === LEGACY_IDB_NAME);

    if (hasLegacyDB) {
        try {
            console.log("[Migration] Found legacy IndexedDB. Migrating...");
            const data = await readLegacyIDB();
            if (data && data.nodes) {
                await db.importSandboxData(data);
                // We don't delete the DB immediately for safety, or we mark it migrated
                localStorage.setItem('redly_idb_migrated', 'true');
                migrated = true;
            }
        } catch (e) {
            console.error("[Migration] Failed to migrate IndexedDB data:", e);
        }
    }

    // 3. Check idb-keyval (Common PWA storage)
    const hasKeyvalDB = dbs.some(d => d.name === IDB_KEYVAL_NAME);
    if (hasKeyvalDB) {
        try {
            console.log("[Migration] Found idb-keyval storage. Migrating...");
            const data = await readLegacyIDB(IDB_KEYVAL_NAME, IDB_KEYVAL_STORE, "redly-notes-backup");
            if (data && data.nodes) {
                await db.importSandboxData(data);
                localStorage.setItem('redly_keyval_migrated', 'true');
                migrated = true;
            }
        } catch (e) {
            console.error("[Migration] Failed to migrate idb-keyval data:", e);
        }
    }

    return migrated;
};

async function readLegacyIDB(dbName = LEGACY_IDB_NAME, storeName = LEGACY_IDB_STORE, key = "full_backup") {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(dbName);
        request.onerror = () => reject("Failed to open legacy DB");
        request.onsuccess = (event) => {
            const dbObj = event.target.result;
            if (!dbObj.objectStoreNames.contains(storeName)) {
                dbObj.close();
                return resolve(null);
            }
            const tx = dbObj.transaction(storeName, "readonly");
            const store = tx.objectStore(storeName);
            const getReq = store.get(key);
            getReq.onsuccess = () => {
                dbObj.close();
                resolve(getReq.result);
            };
            getReq.onerror = () => reject("Failed to read legacy store");
        };
    });
}
