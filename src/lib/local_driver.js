// --- Driver for OPFS and Native File System API ---

let currentRootHandle = null;
let operationLock = Promise.resolve();

async function withLock(fn) {
    const next = operationLock.then(fn);
    operationLock = next.catch(() => { });
    return next;
}

async function withRetry(fn, retries = 3, delay = 50) {
    for (let i = 0; i < retries; i++) {
        try {
            return await fn();
        } catch (err) {
            const isStateError = err.message?.includes('state had changed') || err.name === 'ModificationError';
            if (isStateError && i < retries - 1) {
                console.warn(`[local_driver] Operation failed (state changed), retrying ${i + 1}/${retries}...`);
                await new Promise(r => setTimeout(r, delay));
                continue;
            }
            throw err;
        }
    }
}

// Global Sync Journal logging (Run inside withLock!)
async function _logSyncAction(action, nodeId, type) {
    try {
        if (!currentRootHandle) return;
        const syncHandle = await currentRootHandle.getDirectoryHandle('.sync', { create: true });

        let journal = {};
        try {
            const fileHandle = await syncHandle.getFileHandle('journal.json');
            const file = await fileHandle.getFile();
            const text = await file.text();
            if (text) journal = JSON.parse(text);
        } catch (e) { }

        journal[nodeId] = {
            action,
            type,
            timestamp: Date.now()
        };

        const newHandle = await syncHandle.getFileHandle('journal.json', { create: true });
        const writable = await newHandle.createWritable();
        await writable.write(JSON.stringify(journal));
        await writable.close();
    } catch (err) {
        console.error("Failed to write to sync journal", err);
    }
}

export const getSyncJournal = async () => {
    try {
        if (!currentRootHandle) return {};
        const syncHandle = await currentRootHandle.getDirectoryHandle('.sync');
        const fileHandle = await syncHandle.getFileHandle('journal.json');
        const file = await fileHandle.getFile();
        const text = await file.text();
        if (!text) return {};

        const journal = JSON.parse(text);
        const correctedJournal = {};

        for (const [key, value] of Object.entries(journal)) {
            let newKey = key;
            // Silent backward-compatibility migration for old OPFS journal entries
            if (value.type === 'file' && !key.endsWith('.md')) {
                newKey = `${key}.md`;
            }
            if (!correctedJournal[newKey] || value.timestamp > correctedJournal[newKey].timestamp) {
                correctedJournal[newKey] = value;
            }
        }
        return correctedJournal;
    } catch (e) {
        return {};
    }
};

export const auditSyncJournal = async (nodes) => {
    try {
        if (!currentRootHandle) return;

        const journal = await getSyncJournal();
        let changed = false;

        for (const node of nodes) {
            if (!journal[node.id]) {
                journal[node.id] = {
                    action: 'update',
                    timestamp: node.updatedAt || Date.now(),
                    type: node.type
                };
                changed = true;
            }
        }

        if (changed) {
            const syncHandle = await currentRootHandle.getDirectoryHandle('.sync', { create: true });
            const fileHandle = await syncHandle.getFileHandle('journal.json', { create: true });
            // Use withLock-like manual lock if available, or just straight write since this only runs on mount
            const writable = await fileHandle.createWritable();
            await writable.write(JSON.stringify(journal));
            await writable.close();
            console.log("[Sync] Audited and backfilled missing native files into local journal.");
        }
    } catch (err) {
        console.error("Failed to audit sync journal", err);
    }
};

export const setRootHandle = (handle) => { currentRootHandle = handle; };

export const getDirHandleFromPath = async (path, create = false) => {
    if (!path) return currentRootHandle;
    const parts = path.split('/');
    let handle = currentRootHandle;
    for (const part of parts) {
        handle = await handle.getDirectoryHandle(part, { create });
    }
    return handle;
};

export const getNodes = async (dirHandle = currentRootHandle, currentPath = '') => {
    if (!dirHandle) return [];
    const nodes = [];
    try {
        for await (const entry of dirHandle.values()) {
            const nodePath = currentPath ? `${currentPath}/${entry.name}` : entry.name;

            if (entry.kind === 'file' && (!entry.name.includes('.') || entry.name.endsWith('.md'))) {
                const file = await entry.getFile();
                nodes.push({
                    id: nodePath,
                    name: entry.name.endsWith('.md') ? entry.name.slice(0, -3) : entry.name,
                    type: 'file',
                    parentId: currentPath || null,
                    updatedAt: file.lastModified
                });
            } else if (entry.kind === 'directory' && !entry.name.startsWith('.')) {
                nodes.push({ id: nodePath, name: entry.name, type: 'folder', parentId: currentPath || null, updatedAt: Date.now() });
                const children = await getNodes(entry, nodePath);
                nodes.push(...children);
            }
        }
    } catch (err) {
        console.error('Failed to get nodes:', err);
    }
    return nodes;
};

export const getFileContent = async (id) => {
    return withLock(() => withRetry(async () => {
        const parts = id.split('/');
        const fileName = parts.pop();
        const parentPath = parts.join('/');
        const parentHandle = await getDirHandleFromPath(parentPath);

        try {
            const fileHandle = await parentHandle.getFileHandle(fileName);
            const file = await fileHandle.getFile();
            return await file.text();
        } catch (e) {
            if (fileName.endsWith('.md')) {
                const legacyName = fileName.replace('.md', '');
                try {
                    const fallbackHandle = await parentHandle.getFileHandle(legacyName);
                    const file = await fallbackHandle.getFile();
                    return await file.text();
                } catch (err2) {
                    throw e; // throw original
                }
            }
            throw e;
        }
    }));
};

export const createNode = async (node) => {
    return withLock(() => withRetry(async () => {
        const parentHandle = await getDirHandleFromPath(node.parentId, true);
        if (node.type === 'folder') {
            await parentHandle.getDirectoryHandle(node.name, { create: true });
            node.id = node.parentId ? `${node.parentId}/${node.name}` : node.name;
        } else {
            const fileHandle = await parentHandle.getFileHandle(`${node.name}.md`, { create: true });
            const writable = await fileHandle.createWritable();
            await writable.write(node.content || '');
            await writable.close();
            node.id = node.parentId ? `${node.parentId}/${node.name}.md` : `${node.name}.md`;
        }
        await _logSyncAction('create', node.id, node.type);
        return node;
    }));
};

// Helper for recursive folder copy (fallback when .move() is unavailable)
async function copyFolderContents(sourceHandle, targetHandle) {
    for await (const entry of sourceHandle.values()) {
        if (entry.kind === 'file') {
            const file = await entry.getFile();
            const newFileHandle = await targetHandle.getFileHandle(entry.name, { create: true });
            const writable = await newFileHandle.createWritable();
            await writable.write(await file.arrayBuffer());
            await writable.close();
        } else if (entry.kind === 'directory') {
            const newFolderHandle = await targetHandle.getDirectoryHandle(entry.name, { create: true });
            await copyFolderContents(entry, newFolderHandle);
        }
    }
}

export const updateNode = async (id, updates, oldNode) => {
    return withLock(() => withRetry(async () => {
        const parentHandle = await getDirHandleFromPath(oldNode.parentId);
        let currentHandle = oldNode.type === 'file'
            ? await parentHandle.getFileHandle(`${oldNode.name}.md`)
            : await parentHandle.getDirectoryHandle(oldNode.name);

        let finalNode = { ...oldNode, ...updates };

        // 1. Handle Renaming or Moving (Storage Level)
        if ((updates.name && updates.name !== oldNode.name) || (updates.parentId !== undefined && updates.parentId !== oldNode.parentId)) {
            const newName = updates.name || oldNode.name;
            const newParentId = updates.parentId !== undefined ? updates.parentId : oldNode.parentId;
            const newParentHandle = await getDirHandleFromPath(newParentId, true);
            const fileName = oldNode.type === 'file' ? `${newName}.md` : newName;

            let moveSuccessful = false;
            if (currentHandle.move) {
                try {
                    await currentHandle.move(newParentHandle, fileName);
                    // After move, we need to update the handle reference if we want to write content later
                    currentHandle = oldNode.type === 'file'
                        ? await newParentHandle.getFileHandle(fileName)
                        : await newParentHandle.getDirectoryHandle(newName);
                    moveSuccessful = true;
                } catch (moveErr) {
                    console.warn('Native move failed, falling back to copy/delete:', moveErr);
                }
            }

            if (!moveSuccessful) {
                // Fallback: Copy and Delete
                if (oldNode.type === 'file') {
                    const file = await currentHandle.getFile();
                    const content = updates.content !== undefined ? updates.content : await file.text();
                    const newFileHandle = await newParentHandle.getFileHandle(fileName, { create: true });
                    const writable = await newFileHandle.createWritable();
                    await writable.write(content);
                    await writable.close();

                    // Ensure we use the correct filename including extension for removal
                    const oldFileName = oldNode.type === 'file' ? `${oldNode.name}.md` : oldNode.name;
                    await parentHandle.removeEntry(oldFileName, { recursive: oldNode.type === 'folder' });
                    currentHandle = newFileHandle;
                    // Mark content as handled so we don't write it again below
                    updates.content = undefined;
                } else {
                    const newFolderHandle = await newParentHandle.getDirectoryHandle(newName, { create: true });
                    await copyFolderContents(currentHandle, newFolderHandle);
                    await parentHandle.removeEntry(oldNode.name, { recursive: true });
                    currentHandle = newFolderHandle;
                }
            }


            // Update ID
            if (oldNode.type === 'file') {
                finalNode.id = newParentId ? `${newParentId}/${fileName}` : fileName;
            } else {
                // For folders, we need to be careful with ID replacement if it's a nested path
                const oldPath = oldNode.id;
                const parentPath = oldNode.parentId || '';
                finalNode.id = parentPath ? `${parentPath}/${newName}` : newName;
            }
        }

        // 2. Handle Content Updates (if not already handled by copy fallback)
        if (updates.content !== undefined && oldNode.type === 'file') {
            const writable = await currentHandle.createWritable();
            await writable.write(updates.content);
            await writable.close();
        }

        // Update ID & Log actions
        if ((updates.name && updates.name !== oldNode.name) || (updates.parentId !== undefined && updates.parentId !== oldNode.parentId)) {
            // It was renamed or moved. Log old as deleted, new as created/updated.
            await _logSyncAction('delete', oldNode.id, oldNode.type);
            await _logSyncAction('update', finalNode.id, finalNode.type);
        } else if (updates.content !== undefined) {
            // Just content updated
            await _logSyncAction('update', finalNode.id, finalNode.type);
        }

        return finalNode;
    }));
};

export const deleteNode = async (id, type) => {
    return withLock(() => withRetry(async () => {
        const name = id.split('/').pop();
        const parentId = id.substring(0, id.lastIndexOf('/')) || null;
        const parentHandle = await getDirHandleFromPath(parentId);

        const trashHandle = await getDirHandleFromPath('.trash', true);
        const timestamp = Date.now();
        const trashId = `${timestamp}-${name}`;

        const currentHandle = type === 'file'
            ? await parentHandle.getFileHandle(name)
            : await parentHandle.getDirectoryHandle(name);

        let moveSuccessful = false;
        if (currentHandle.move) {
            try {
                await currentHandle.move(trashHandle, trashId);
                moveSuccessful = true;
            } catch (err) {
                console.warn('Native move to trash failed, falling back to copy/delete:', err);
            }
        }

        if (!moveSuccessful) {
            if (type === 'file') {
                const file = await currentHandle.getFile();
                const newFileHandle = await trashHandle.getFileHandle(trashId, { create: true });
                const writable = await newFileHandle.createWritable();
                await writable.write(await file.arrayBuffer());
                await writable.close();
            } else {
                const newFolderHandle = await trashHandle.getDirectoryHandle(trashId, { create: true });
                await copyFolderContents(currentHandle, newFolderHandle);
            }
            await parentHandle.removeEntry(name, { recursive: true });
        }

        // Update manifest
        let manifest = [];
        try {
            const manifestHandle = await trashHandle.getFileHandle('manifest.json');
            const file = await manifestHandle.getFile();
            const text = await file.text();
            if (text) manifest = JSON.parse(text);
        } catch (e) {
            // manifest doesn't exist yet, we'll create it below
        }

        manifest.push({
            trashId,
            originalId: id,
            originalName: name.replace('.md', ''),
            originalParentId: parentId,
            type,
            deletedAt: timestamp
        });

        const newManifestHandle = await trashHandle.getFileHandle('manifest.json', { create: true });
        const writable = await newManifestHandle.createWritable();
        await writable.write(JSON.stringify(manifest));
        await writable.close();

        await _logSyncAction('delete', id, type);
    }));
};

export const getTrashNodes = async () => {
    try {
        const trashHandle = await getDirHandleFromPath('.trash');
        let text = '';
        try {
            const manifestHandle = await trashHandle.getFileHandle('manifest.json');
            const file = await manifestHandle.getFile();
            text = await file.text();
        } catch (e) {
            // File might not exist
            return [];
        }
        return text ? JSON.parse(text) : [];
    } catch (e) {
        return [];
    }
};

export const restoreNode = async (trashId) => {
    return withLock(() => withRetry(async () => {
        let trashHandle;
        try {
            trashHandle = await getDirHandleFromPath('.trash');
        } catch (e) { return; }

        let manifest = [];
        try {
            const manifestHandle = await trashHandle.getFileHandle('manifest.json');
            const file = await manifestHandle.getFile();
            manifest = JSON.parse(await file.text());
        } catch (e) { return; }

        const itemIndex = manifest.findIndex(item => item.trashId === trashId);
        if (itemIndex === -1) return;
        const item = manifest[itemIndex];

        let parentHandle;
        try {
            parentHandle = await getDirHandleFromPath(item.originalParentId);
        } catch (e) {
            parentHandle = await getDirHandleFromPath(''); // root fallback
            item.originalParentId = null;
        }

        const restoreName = item.type === 'file' ? `${item.originalName}.md` : item.originalName;

        const currentHandle = item.type === 'file'
            ? await trashHandle.getFileHandle(trashId)
            : await trashHandle.getDirectoryHandle(trashId);

        let moveSuccessful = false;
        if (currentHandle.move) {
            try {
                await currentHandle.move(parentHandle, restoreName);
                moveSuccessful = true;
            } catch (err) { }
        }

        if (!moveSuccessful) {
            if (item.type === 'file') {
                const file = await currentHandle.getFile();
                const newFileHandle = await parentHandle.getFileHandle(restoreName, { create: true });
                const writable = await newFileHandle.createWritable();
                await writable.write(await file.arrayBuffer());
                await writable.close();
            } else {
                const newFolderHandle = await parentHandle.getDirectoryHandle(restoreName, { create: true });
                await copyFolderContents(currentHandle, newFolderHandle);
            }
            await trashHandle.removeEntry(trashId, { recursive: true });
        }

        manifest.splice(itemIndex, 1);
        const newManifestHandle = await trashHandle.getFileHandle('manifest.json', { create: true });
        const writable = await newManifestHandle.createWritable();
        await writable.write(JSON.stringify(manifest));
        await writable.close();
    }));
};

export const emptyTrash = async () => {
    return withLock(() => withRetry(async () => {
        try {
            const rootHandle = await getDirHandleFromPath('');
            await rootHandle.removeEntry('.trash', { recursive: true });
        } catch (e) { }
    }));
};

