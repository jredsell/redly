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
            return { ...oldNode, ...updates, id: oldNode.parentId ? `${oldNode.parentId}/${updates.name}.md` : `${updates.name}.md` };

        } else {
            // Folder renaming: Native File System API fallback
            const oldFolderHandle = await parentHandle.getDirectoryHandle(oldNode.name);
            if (oldFolderHandle.move) {
                await oldFolderHandle.move(updates.name);
            } else {
                // Fallback: Recursive Copy and Delete
                const newFolderHandle = await parentHandle.getDirectoryHandle(updates.name, { create: true });
                await copyFolderContents(oldFolderHandle, newFolderHandle);
                await parentHandle.removeEntry(oldNode.name, { recursive: true });
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
            const fileName = oldNode.type === 'file' ? `${oldNode.name}.md` : oldNode.name;
            await itemHandle.move(newParentHandle);
            const newId = updates.parentId ? `${updates.parentId}/${fileName}` : fileName;
            return { ...oldNode, ...updates, id: newId };
        } else {
            // Fallback for Move: Copy and Delete
            if (oldNode.type === 'file') {
                const file = await itemHandle.getFile();
                const content = await file.text();
                const fileName = `${oldNode.name}.md`;
                const newFileHandle = await newParentHandle.getFileHandle(fileName, { create: true });
                const writable = await newFileHandle.createWritable();
                await writable.write(content);
                await writable.close();
                await parentHandle.removeEntry(fileName);
                const newId = updates.parentId ? `${updates.parentId}/${fileName}` : fileName;
                return { ...oldNode, ...updates, id: newId };
            } else {
                // Folder Move Fallback
                const newFolderHandle = await newParentHandle.getDirectoryHandle(oldNode.name, { create: true });
                await copyFolderContents(itemHandle, newFolderHandle);
                await parentHandle.removeEntry(oldNode.name, { recursive: true });
                const newId = updates.parentId ? `${updates.parentId}/${oldNode.name}` : oldNode.name;
                return { ...oldNode, ...updates, id: newId };
            }
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
    // name already includes .md for files because id is nodePath which is entry.name
    await parentHandle.removeEntry(name, { recursive: true });
};

