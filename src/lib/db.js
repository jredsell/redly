// --- Lightweight IndexedDB wrapper to save Folder Permissions ---
const DB_NAME = 'RedlyDB';
const STORE_NAME = 'handles';

const getDB = () => new Promise((resolve, reject) => {
  const req = indexedDB.open(DB_NAME, 1);
  req.onupgradeneeded = (e) => e.target.result.createObjectStore(STORE_NAME);
  req.onsuccess = (e) => resolve(e.target.result);
  req.onerror = () => reject('IDB Error');
});

const setHandle = async (key, handle) => {
  const db = await getDB();
  return new Promise((resolve) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(handle, key);
    tx.oncomplete = () => resolve();
  });
};

export const getHandle = async (key) => {
  const db = await getDB();
  return new Promise((resolve) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).get(key);
    req.onsuccess = () => resolve(req.result);
  });
};

export const clearWorkspaceHandle = async () => {
  const db = await getDB();
  return new Promise((resolve) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).clear();
    tx.oncomplete = () => resolve();
  });
};

// --- Core Storage Manager ---
let currentRootHandle = null;

export const initWorkspace = async (mode) => {
  if (mode === 'sandbox') {
    currentRootHandle = await navigator.storage.getDirectory(); // OPFS
    await setHandle('workspace_mode', 'sandbox');
  } else if (mode === 'local') {
    currentRootHandle = await window.showDirectoryPicker({ mode: 'readwrite' }); // Native Folder
    await setHandle('workspace_mode', 'local');
    await setHandle('local_root', currentRootHandle);
  }
  return true;
};

export const loadSavedWorkspace = async () => {
  const mode = await getHandle('workspace_mode');
  if (mode === 'sandbox') {
    currentRootHandle = await navigator.storage.getDirectory();
    return true;
  } else if (mode === 'local') {
    const handle = await getHandle('local_root');
    if (handle) {
      const perm = await handle.queryPermission({ mode: 'readwrite' });
      if (perm === 'granted') {
        currentRootHandle = handle;
        return true;
      } else {
        return 'requires_permission'; // Needs user to click a button to re-verify
      }
    }
  }
  return false;
};

export const requestLocalPermission = async () => {
  const handle = await getHandle('local_root');
  if (handle && (await handle.requestPermission({ mode: 'readwrite' })) === 'granted') {
    currentRootHandle = handle;
    return true;
  }
  return false;
};

// --- File System Operations ---
const getDirHandleFromPath = async (path, create = false) => {
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
        content
      });
    } else if (entry.kind === 'directory' && !entry.name.startsWith('.')) {
      nodes.push({ id: nodePath, name: entry.name, type: 'folder', parentId: currentPath || null });
      const children = await getNodes(entry, nodePath);
      nodes.push(...children);
    }
  }
  return nodes;
};

export const createNode = async (rootPath, node) => {
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

export const updateNode = async (rootPath, id, updates, oldNode) => {
  const parentHandle = await getDirHandleFromPath(oldNode.parentId);

  if (updates.name && updates.name !== oldNode.name) {
    // Note: The File System API doesn't have a simple "rename". We have to copy and delete.
    // For now, if the name changes, we rewrite it.
    if (oldNode.type === 'file') {
      const oldFileHandle = await parentHandle.getFileHandle(`${oldNode.name}.md`);
      const file = await oldFileHandle.getFile();
      const content = updates.content !== undefined ? updates.content : await file.text();

      const newFileHandle = await parentHandle.getFileHandle(`${updates.name}.md`, { create: true });
      const writable = await newFileHandle.createWritable();
      await writable.write(content);
      await writable.close();

      await parentHandle.removeEntry(`${oldNode.name}.md`);
      return { ...oldNode, ...updates, id: id.replace(oldNode.name, updates.name) };
    }
  } else if (updates.content !== undefined && oldNode.type === 'file') {
    const fileHandle = await parentHandle.getFileHandle(`${oldNode.name}.md`);
    const writable = await fileHandle.createWritable();
    await writable.write(updates.content);
    await writable.close();
  }
  return { ...oldNode, ...updates };
};

export const deleteNode = async (rootPath, id, type) => {
  const name = id.split('/').pop();
  const parentId = id.substring(0, id.lastIndexOf('/')) || null;
  const parentHandle = await getDirHandleFromPath(parentId);
  await parentHandle.removeEntry(type === 'file' ? `${name}.md` : name, { recursive: true });
};

export const buildTree = (nodes) => {
  const map = new Map();
  const roots = [];
  nodes.forEach(node => map.set(node.id, { ...node, children: [] }));
  nodes.forEach(node => {
    const mappedNode = map.set(node.id, map.get(node.id) || { ...node, children: [] }).get(node.id);
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
    nodeList.forEach(n => { if (n.children.length > 0) sortNodes(n.children); });
  };
  sortNodes(roots);
  return roots;
};