import { openDB } from 'idb';

const CONFIG_DB_NAME = 'redly-config-db';
const CONFIG_STORE = 'config';

export const initConfigDB = async () => {
  return openDB(CONFIG_DB_NAME, 1, {
    upgrade(db) {
      db.createObjectStore(CONFIG_STORE);
    }
  });
};

export const saveWorkspaceHandle = async (handle) => {
  const db = await initConfigDB();
  await db.put(CONFIG_STORE, handle, 'workspaceHandle');
};

export const getSavedWorkspaceHandle = async () => {
  const db = await initConfigDB();
  return db.get(CONFIG_STORE, 'workspaceHandle');
};

export const clearWorkspaceHandle = async () => {
  const db = await initConfigDB();
  await db.delete(CONFIG_STORE, 'workspaceHandle');
};

export const verifyPermission = async (handle, mode = 'readwrite') => {
  if ((await handle.queryPermission({ mode })) === 'granted') {
    return true;
  }
  if ((await handle.requestPermission({ mode })) === 'granted') {
    return true;
  }
  return false;
};

// Internal helper to get a handle from a path string
const getHandleFromPath = async (rootHandle, pathStr, isFile = true, create = false) => {
  if (!pathStr || pathStr === '/') return rootHandle;

  const parts = pathStr.split('/');
  let currentHandle = rootHandle;

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (!part) continue;

    const isLast = i === parts.length - 1;
    if (isLast && isFile) {
      currentHandle = await currentHandle.getFileHandle(`${part}.md`, { create });
    } else {
      currentHandle = await currentHandle.getDirectoryHandle(part, { create });
    }
  }
  return currentHandle;
};

export const getNodes = async (rootHandle) => {
  if (!rootHandle) return [];
  const nodes = [];

  async function walk(dirHandle, currentPath = '') {
    for await (const entry of dirHandle.values()) {
      if (entry.name.startsWith('.')) continue; // skip hidden files

      const fullPath = currentPath ? `${currentPath}/${entry.name}` : entry.name;

      if (entry.kind === 'file' && entry.name.endsWith('.md')) {
        try {
          const file = await entry.getFile();
          const content = await file.text();
          const nameWithoutExt = entry.name.replace(/\.md$/, '');
          const idPath = currentPath ? `${currentPath}/${nameWithoutExt}` : nameWithoutExt;

          nodes.push({
            id: idPath,
            name: nameWithoutExt,
            type: 'file',
            parentId: currentPath || null,
            content: content,
            updatedAt: file.lastModified
          });
        } catch (e) {
          console.error('Error reading file:', entry.name, e);
        }
      } else if (entry.kind === 'directory') {
        nodes.push({
          id: fullPath,
          name: entry.name,
          type: 'folder',
          parentId: currentPath || null,
          updatedAt: Date.now()
        });
        await walk(entry, fullPath);
      }
    }
  }

  await walk(rootHandle);
  return nodes;
};

export const createNode = async (rootHandle, node) => {
  const { id, type, content } = node;
  try {
    if (type === 'file') {
      const fileHandle = await getHandleFromPath(rootHandle, id, true, true);
      const writable = await fileHandle.createWritable();
      await writable.write(content || '');
      await writable.close();
      const file = await fileHandle.getFile();
      return { ...node, updatedAt: file.lastModified };
    } else {
      await getHandleFromPath(rootHandle, id, false, true);
      return { ...node, updatedAt: Date.now() };
    }
  } catch (e) {
    console.error('Failed to create node:', e);
    throw e;
  }
};

const copyDirectory = async (srcHandle, destHandle) => {
  for await (const entry of srcHandle.values()) {
    if (entry.kind === 'file') {
      const fileHandle = await srcHandle.getFileHandle(entry.name);
      const file = await fileHandle.getFile();
      const newFileHandle = await destHandle.getFileHandle(entry.name, { create: true });
      const writable = await newFileHandle.createWritable();
      await writable.write(file);
      await writable.close();
    } else if (entry.kind === 'directory') {
      const subSrc = await srcHandle.getDirectoryHandle(entry.name);
      const subDest = await destHandle.getDirectoryHandle(entry.name, { create: true });
      await copyDirectory(subSrc, subDest);
    }
  }
};

export const updateNode = async (rootHandle, id, updates, oldNode) => {
  if (updates.name && updates.name !== oldNode.name) {
    // Rename
    const parentPath = oldNode.parentId;
    const newId = parentPath ? `${parentPath}/${updates.name}` : updates.name;
    const content = updates.content !== undefined ? updates.content : oldNode.content;

    if (oldNode.type === 'file') {
      const newHandle = await getHandleFromPath(rootHandle, newId, true, true);
      const writable = await newHandle.createWritable();
      await writable.write(content);
      await writable.close();

      const oldParentHandle = await getHandleFromPath(rootHandle, parentPath, false, false);
      await oldParentHandle.removeEntry(`${oldNode.name}.md`);

      const file = await newHandle.getFile();
      return { id: newId, name: updates.name, type: 'file', parentId: parentPath, content, updatedAt: file.lastModified };
    } else {
      const oldHandle = await getHandleFromPath(rootHandle, id, false, false);
      const newHandle = await getHandleFromPath(rootHandle, newId, false, true);

      await copyDirectory(oldHandle, newHandle);

      const oldParentHandle = await getHandleFromPath(rootHandle, parentPath, false, false);
      await oldParentHandle.removeEntry(oldNode.name, { recursive: true });

      return { id: newId, name: updates.name, type: 'folder', parentId: parentPath, updatedAt: Date.now() };
    }
  } else {
    // Content update or Move
    if (oldNode.type === 'file' && updates.content !== undefined) {
      const fileHandle = await getHandleFromPath(rootHandle, id, true, false);
      const writable = await fileHandle.createWritable();
      await writable.write(updates.content);
      await writable.close();
      const file = await fileHandle.getFile();
      return { ...oldNode, content: updates.content, updatedAt: file.lastModified };
    } else if (updates.parentId !== undefined && updates.parentId !== oldNode.parentId) {
      // Drag and drop Move
      const newParentId = updates.parentId;
      const newId = newParentId ? `${newParentId}/${oldNode.name}` : oldNode.name;

      if (oldNode.type === 'file') {
        const newHandle = await getHandleFromPath(rootHandle, newId, true, true);
        const writable = await newHandle.createWritable();
        await writable.write(oldNode.content);
        await writable.close();

        const oldParentHandle = await getHandleFromPath(rootHandle, oldNode.parentId, false, false);
        await oldParentHandle.removeEntry(`${oldNode.name}.md`);

        const file = await newHandle.getFile();
        return { ...oldNode, id: newId, parentId: newParentId, updatedAt: file.lastModified };
      } else {
        const oldHandle = await getHandleFromPath(rootHandle, id, false, false);
        const newHandle = await getHandleFromPath(rootHandle, newId, false, true);

        await copyDirectory(oldHandle, newHandle);

        const oldParentHandle = await getHandleFromPath(rootHandle, oldNode.parentId, false, false);
        await oldParentHandle.removeEntry(oldNode.name, { recursive: true });

        return { ...oldNode, id: newId, parentId: newParentId, updatedAt: Date.now() };
      }
    }
    return oldNode;
  }
};

export const deleteNode = async (rootHandle, id, type) => {
  const parts = id.split('/');
  const name = parts.pop();
  const parentPath = parts.join('/');

  const parentHandle = await getHandleFromPath(rootHandle, parentPath, false, false);
  await parentHandle.removeEntry(type === 'file' ? `${name}.md` : name, { recursive: true });
};

export const buildTree = (nodes) => {
  const map = new Map();
  const roots = [];

  nodes.forEach(node => {
    map.set(node.id, { ...node, children: [] });
  });

  nodes.forEach(node => {
    const mappedNode = map.get(node.id);
    if (node.parentId && map.has(node.parentId)) {
      map.get(node.parentId).children.push(mappedNode);
    } else {
      roots.push(mappedNode);
    }
  });

  const sortNodes = (nodeList) => {
    nodeList.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    nodeList.forEach(n => {
      if (n.children.length > 0) sortNodes(n.children);
    });
  };

  sortNodes(roots);
  return roots;
};
