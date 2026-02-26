import { setHandle, getHandle, clearHandles } from './idb_store';
import * as localDriver from './local_driver';

export { getHandle };
let currentMode = null;

export const initWorkspace = async (mode, options = {}) => {
  try {
    currentMode = mode;
    if (mode === 'sandbox') {
      const handle = await navigator.storage.getDirectory();
      localDriver.setRootHandle(handle);
      await setHandle('workspace_mode', 'sandbox');
    } else if (mode === 'local') {
      const handle = await window.showDirectoryPicker({ mode: 'readwrite' });
      localDriver.setRootHandle(handle);
      await setHandle('workspace_mode', 'local');
      await setHandle('local_root', handle);
    }
    return true;
  } catch (err) {
    console.error('Initialisation failed:', err);
    throw err;
  }
};

export const loadSavedWorkspace = async () => {
  const mode = await getHandle('workspace_mode');
  currentMode = mode;
  if (mode === 'sandbox') {
    localDriver.setRootHandle(await navigator.storage.getDirectory());
    return true;
  } else if (mode === 'local') {
    const handle = await getHandle('local_root');
    if (handle) {
      const perm = await handle.queryPermission({ mode: 'readwrite' });
      if (perm === 'granted') {
        localDriver.setRootHandle(handle);
        return true;
      } else {
        return 'requires_permission';
      }
    }
  }
  return false;
};

export const requestLocalPermission = async () => {
  const handle = await getHandle('local_root');
  if (handle && (await handle.requestPermission({ mode: 'readwrite' })) === 'granted') {
    localDriver.setRootHandle(handle);
    return true;
  }
  return false;
};

export const clearWorkspaceHandle = async () => {
  await clearHandles();
  currentMode = null;
};

export const getNodes = async () => {
  return localDriver.getNodes();
};

export const getFileContent = async (id, node) => {
  return localDriver.getFileContent(id);
};

export const createNode = async (rootPath, node) => {
  return localDriver.createNode(node);
};

export const updateNode = async (rootPath, id, updates, oldNode) => {
  return localDriver.updateNode(id, updates, oldNode);
};

export const deleteNode = async (rootPath, id, type, node) => {
  return localDriver.deleteNode(id, type);
};

export const buildTree = (nodes) => {
  const map = new Map();
  const roots = [];
  nodes.forEach(node => map.set(node.id, { ...node, children: [] }));
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
    nodeList.forEach(n => { if (n.children.length > 0) sortNodes(n.children); });
  };
  sortNodes(roots);
  return roots;
};

// Backup and Restore for Sandbox
export const exportSandboxData = async () => {
  if (currentMode !== 'sandbox') throw new Error('Export only supported for Sandbox storage');
  const nodes = await localDriver.getNodes();
  const fullNodes = await Promise.all(nodes.map(async node => {
    if (node.type === 'file') {
      const content = await localDriver.getFileContent(node.id);
      return { ...node, content };
    }
    return node;
  }));
  return {
    version: '1.0',
    timestamp: new Date().toISOString(),
    nodes: fullNodes
  };
};

export const importSandboxData = async (backup) => {
  if (currentMode !== 'sandbox') throw new Error('Import only supported for Sandbox storage');
  if (!backup || !backup.nodes) throw new Error('Invalid backup format');

  // Clear existing sandbox
  const nodes = await localDriver.getNodes();
  for (const node of nodes) {
    try {
      await localDriver.deleteNode(node.id, node.type);
    } catch (e) {
      console.warn('Failed to delete node during import cleanup:', node.id);
    }
  }

  // Restore from backup
  // Sort by ID depth to ensure folders are created before files
  const sortedNodes = [...backup.nodes].sort((a, b) => a.id.split('/').length - b.id.split('/').length);

  for (const node of sortedNodes) {
    await localDriver.createNode(node);
  }
};
