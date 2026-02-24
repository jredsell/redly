// --- Driver for OPFS and Native File System API ---

let currentRootHandle = null;

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

            if (entry.kind === 'file' && entry.name.endsWith('.md')) {
                const file = await entry.getFile();
                const content = await file.text();
                nodes.push({
                    id: nodePath,
                    name: entry.name.replace('.md', ''),
                    type: 'file',
                    parentId: currentPath || null,
                    content,
                    updatedAt: file.lastModified
                });
            } else if (entry.kind === 'directory' && !entry.name.startsWith('.')) {
                nodes.push({ id: nodePath, name: entry.name, type: 'folder', parentId: currentPath || null });
                const children = await getNodes(entry, nodePath);
                nodes.push(...children);
            }
        }
    } catch (err) {
        console.error('Failed to get nodes:', err);
    }
    return nodes;
};

export const createNode = async (node) => {
    const parentHandle = await getDirHandleFromPath(node.parentId, true);
    if (node.type === 'folder') {
        await parentHandle.getDirectoryHandle(node.name, { create: true });
    } else {
        const fileHandle = await parentHandle.getFileHandle(`${node.name}.md`, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(node.content || '');
        await writable.close();
    }
    return node;
};

export const updateNode = async (id, updates, oldNode) => {
    const parentHandle = await getDirHandleFromPath(oldNode.parentId);

    if (updates.name && updates.name !== oldNode.name) {
        if (oldNode.type === 'file') {
            const oldFileHandle = await parentHandle.getFileHandle(`${oldNode.name}.md`);
            if (oldFileHandle.move) {
                await oldFileHandle.move(`${updates.name}.md`);
            } else {
                const file = await oldFileHandle.getFile();
                const content = updates.content !== undefined ? updates.content : await file.text();
                const newFileHandle = await parentHandle.getFileHandle(`${updates.name}.md`, { create: true });
                const writable = await newFileHandle.createWritable();
                await writable.write(content);
                await writable.close();
                await parentHandle.removeEntry(`${oldNode.name}.md`);
            }
            return { ...oldNode, ...updates, id: id.replace(oldNode.name, updates.name) };
        } else {
            // Folder renaming: Native File System API doesn't support directory.move() well everywhere
            // But we can try it if available, or just update the metadata in our internal state if it's just a name change
            // Actually, for local files, we MUST rename the physical folder.
            const oldFolderHandle = await parentHandle.getDirectoryHandle(oldNode.name);
            if (oldFolderHandle.move) {
                await oldFolderHandle.move(updates.name);
            } else {
                // Fallback: Create new, move all children (Complex, but needed if no .move())
                // For now, let's assume .move() or warn. Most modern browsers support it on handles.
                throw new Error("Folder renaming not supported in this browser version.");
            }
            return { ...oldNode, ...updates, id: id.replace(oldNode.name, updates.name) };
        }
    } else if (updates.parentId !== undefined) {
        // Drag and Drop (MOVE)
        const itemHandle = oldNode.type === 'file'
            ? await parentHandle.getFileHandle(`${oldNode.name}.md`)
            : await parentHandle.getDirectoryHandle(oldNode.name);

        const newParentHandle = await getDirHandleFromPath(updates.parentId, true);
        if (itemHandle.move) {
            await itemHandle.move(newParentHandle);
            const newId = updates.parentId ? `${updates.parentId}/${oldNode.name}` : oldNode.name;
            return { ...oldNode, ...updates, id: newId };
        }
    }
    else if (updates.content !== undefined && oldNode.type === 'file') {
        const fileHandle = await parentHandle.getFileHandle(`${oldNode.name}.md`);
        const writable = await fileHandle.createWritable();
        await writable.write(updates.content);
        await writable.close();
    }
    return { ...oldNode, ...updates };
};

export const deleteNode = async (id, type) => {
    const name = id.split('/').pop();
    const parentId = id.substring(0, id.lastIndexOf('/')) || null;
    const parentHandle = await getDirHandleFromPath(parentId);
    await parentHandle.removeEntry(type === 'file' ? `${name}.md` : name, { recursive: true });
};
