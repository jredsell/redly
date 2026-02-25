import { setHandle, getHandle, clearHandles } from './idb_store';
import * as localDriver from './local_driver';
import * as gdriveDriver from './gdrive';

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
    } else if (mode === 'gdrive') {
      await setHandle('workspace_mode', 'gdrive');
      const rootId = await gdriveDriver.initRootFolder();
      await setHandle('gdrive_root_id', rootId);

      if (options.migrate) {
        const nodesToMigrate = await localDriver.getNodes();
        for (const node of nodesToMigrate) {
          await gdriveDriver.createNode(node);
        }
      }
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
  } else if (mode === 'gdrive') {
    return true; // GDrive handles its own auth check
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
  gdriveDriver.resetAccessToken();
  currentMode = null;
};

export const getNodes = async () => {
  if (currentMode === 'gdrive') {
    return gdriveDriver.getNodes();
  }
  return localDriver.getNodes();
};

export const getFileContent = async (id) => {
  if (currentMode === 'gdrive') {
    return gdriveDriver.getFileContent ? gdriveDriver.getFileContent(id) : ''; // GDrive driver might need update too
  }
  return localDriver.getFileContent(id);
};

export const createNode = async (rootPath, node) => {
  if (currentMode === 'gdrive') {
    return gdriveDriver.createNode(node);
  }
  return localDriver.createNode(node);
};

export const updateNode = async (rootPath, id, updates, oldNode) => {
  if (currentMode === 'gdrive') {
    return gdriveDriver.updateNode(id, updates, oldNode);
  }
  return localDriver.updateNode(id, updates, oldNode);
};

export const deleteNode = async (rootPath, id, type, node) => {
  if (currentMode === 'gdrive') {
    return gdriveDriver.deleteNode(id, type, node.gdriveId);
  }
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
