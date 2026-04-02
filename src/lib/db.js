import { setHandle, getHandle, clearHandles } from './idb_store';
import * as localDriver from './local_driver';
import * as githubDriver from './github_driver';

export { getHandle };
let currentMode = null;
let activeDriver = localDriver;

const setDriver = (mode) => {
  currentMode = mode;
  if (mode === 'github') activeDriver = githubDriver;
  else activeDriver = localDriver;
};

export const initWorkspace = async (mode, options = {}) => {
  try {
    setDriver(mode);
    if (mode === 'sandbox') {
      const handle = await navigator.storage.getDirectory();
      localDriver.setRootHandle(handle);
      await setHandle('workspace_mode', 'sandbox');
    } else if (mode === 'local') {
      const handle = options.handle || await window.showDirectoryPicker({ mode: 'readwrite' });
      localDriver.setRootHandle(handle);
      await setHandle('workspace_mode', 'local');
      await setHandle('local_root', handle);
    } else if (mode === 'github') {
      await githubDriver.cloneRepo(options.config);
      await setHandle('workspace_mode', 'github');
      await setHandle('github_config', options.config);
    }
    return true;
  } catch (err) {
    console.error('Initialisation failed:', err);
    throw err;
  }
};

export const loadSavedWorkspace = async () => {
  const mode = await getHandle('workspace_mode');
  setDriver(mode);
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
  } else if (mode === 'github') {
    const config = await getHandle('github_config');
    if (config) {
      githubDriver.setConfig(config);
      await githubDriver.init();
      return true;
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
  return activeDriver.getNodes();
};

export const getFileContent = async (id) => {
  return activeDriver.getFileContent(id);
};

export const createNode = async (node) => {
  return activeDriver.createNode(node);
};

export const updateNode = async (id, updates, oldNode) => {
  return activeDriver.updateNode(id, updates, oldNode);
};

export const deleteNode = async (id, type) => {
  return activeDriver.deleteNode(id, type);
};

export const getTrashNodes = async () => {
  return activeDriver.getTrashNodes();
};

export const restoreNode = async (trashId) => {
  return activeDriver.restoreNode(trashId);
};

export const emptyTrash = async () => {
  return activeDriver.emptyTrash();
};

export const sync = async () => {
  if (activeDriver.sync) return activeDriver.sync();
  return true;
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

export const migrateToGithub = async (config) => {
  // 1. Export all data from current driver
  const nodes = await activeDriver.getNodes();
  const fullNodes = await Promise.all(nodes.map(async node => {
    if (node.type === 'file') {
      const content = await activeDriver.getFileContent(node.id);
      return { ...node, content };
    }
    return node;
  }));

  // 2. Initialize GitHub workspace (this will clone/init)
  await githubDriver.cloneRepo(config);
  
  // 3. Temporarily set activeDriver to github to perform the import
  const oldDriver = activeDriver;
  const oldMode = currentMode;
  setDriver('github');
  
  try {
    // 4. Import nodes into GitHub driver
    // Sort by depth to ensure parent folders are created first
    const sortedNodes = [...fullNodes].sort((a, b) => a.id.split('/').length - b.id.split('/').length);
    for (const node of sortedNodes) {
      await githubDriver.createNode(node);
    }

    // 5. Finalize the move
    await setHandle('workspace_mode', 'github');
    await setHandle('github_config', config);
    return true;
  } catch (err) {
    // If migration fails, revert to old driver
    console.error('Migration to GitHub failed:', err);
    activeDriver = oldDriver;
    currentMode = oldMode;
    throw err;
  }
};
export const exportSandboxData = async () => {
  const nodes = await activeDriver.getNodes();
  const fullNodes = await Promise.all(nodes.map(async node => {
    if (node.type === 'file') {
      const content = await activeDriver.getFileContent(node.id);
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
  if (!backup || !backup.nodes) throw new Error('Invalid backup format');

  // Clear existing nodes in active driver
  const nodes = await activeDriver.getNodes();
  for (const node of nodes) {
    try {
      await activeDriver.deleteNode(node.id, node.type);
    } catch (e) {
      console.warn('Failed to delete node during import cleanup:', node.id);
    }
  }

  // Restore from backup
  // Sort by ID depth to ensure folders are created before files
  const sortedNodes = [...backup.nodes].sort((a, b) => a.id.split('/').length - b.id.split('/').length);

  for (const node of sortedNodes) {
    await activeDriver.createNode(node);
  }
};
