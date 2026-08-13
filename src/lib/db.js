import * as idbStore from './idb_store';
import * as localDriver from './local_driver';
import * as githubDriver from './github_driver';

export { getHandle } from './idb_store';

const getDriver = (type) => {
  return type === 'github' ? githubDriver : localDriver;
};

// --- Workspace Initialization & Management ---

// Backward compatibility: migrate old single workspace to multi-workspace array
export const migrateLegacyWorkspace = async () => {
  const mode = await idbStore.getHandle('workspace_mode');
  if (mode) {
    const workspaces = await idbStore.getWorkspaces();
    if (workspaces.length === 0) {
      if (mode === 'sandbox') {
        await idbStore.addWorkspace({ id: 'sandbox_1', type: 'sandbox', name: 'Sandbox' });
      } else if (mode === 'local') {
        const handle = await idbStore.getHandle('local_root');
        if (handle) {
          await idbStore.addWorkspace({ id: 'local_1', type: 'local', name: 'Local Folder', handle });
        }
      } else if (mode === 'github') {
        const config = await idbStore.getHandle('github_config');
        if (config) {
          await idbStore.addWorkspace({ id: 'github_1', type: 'github', name: `${config.owner}/${config.repo}`, config });
        }
      }
    }
    // Clear legacy single flags to avoid re-migration
    await idbStore.clearHandles(); 
    // Re-save workspaces since clearHandles wiped everything
    const newWorkspaces = await idbStore.getWorkspaces();
    if(newWorkspaces.length === 0 && workspaces.length > 0) {
       await idbStore.saveWorkspaces(workspaces);
    }
  }
};

export const initWorkspace = async (mode, options = {}) => {
  try {
    const timestamp = Date.now();
    let workspaceConfig = null;

    if (mode === 'sandbox') {
      const handle = await navigator.storage.getDirectory();
      const id = `sandbox_${timestamp}`;
      workspaceConfig = { id, type: 'sandbox', name: 'Sandbox' };
      localDriver.setRootHandle(id, handle);
    } else if (mode === 'local') {
      const handle = options.handle || await window.showDirectoryPicker({ mode: 'readwrite' });
      const id = `local_${timestamp}`;
      workspaceConfig = { id, type: 'local', name: handle.name, handle };
      localDriver.setRootHandle(id, handle);
    } else if (mode === 'github') {
      const id = `github_${timestamp}`;
      workspaceConfig = { id, type: 'github', name: `${options.config.owner}/${options.config.repo}`, config: options.config };
      await githubDriver.cloneRepo(id, options.config);
    }

    if (workspaceConfig) {
      await idbStore.addWorkspace(workspaceConfig);
    }
    return workspaceConfig;
  } catch (err) {
    console.error('Workspace initialization failed:', err);
    throw err;
  }
};

export const loadSavedWorkspaces = async () => {
  await migrateLegacyWorkspace();
  const workspaces = await idbStore.getWorkspaces();
  
  if (workspaces.length === 0) return false;

  for (const ws of workspaces) {
    if (ws.type === 'sandbox') {
      localDriver.setRootHandle(ws.id, await navigator.storage.getDirectory());
    } else if (ws.type === 'local') {
      if (ws.handle) {
        const perm = await ws.handle.queryPermission({ mode: 'readwrite' });
        if (perm === 'granted') {
          localDriver.setRootHandle(ws.id, ws.handle);
        } else {
          // Requires permission, could be requested later by UI
          localDriver.setRootHandle(ws.id, ws.handle);
        }
      }
    } else if (ws.type === 'github') {
      githubDriver.setConfig(ws.id, ws.config);
      await githubDriver.init(ws.id);
    }
  }
  return true;
};

export const disconnectWorkspace = async (workspaceId) => {
    await idbStore.removeWorkspace(workspaceId);
};

export const clearAllWorkspaces = async () => {
  await idbStore.clearHandles();
};

export const getWorkspaces = async () => {
  return await idbStore.getWorkspaces();
};

// --- ID Routing & Namespacing ---

const parseId = (globalId) => {
  if (!globalId) return { workspaceId: null, relativeId: null };
  const parts = globalId.split('::');
  if (parts.length === 1) {
    return { workspaceId: globalId, relativeId: null };
  }
  const workspaceId = parts[0];
  const relativeId = parts.slice(1).join('::');
  return { workspaceId, relativeId };
};

const mapToGlobal = (workspaceId, relativeNode) => {
  if (!relativeNode) return null;
  const parentId = relativeNode.parentId ? `${workspaceId}::${relativeNode.parentId}` : workspaceId;
  return {
    ...relativeNode,
    id: `${workspaceId}::${relativeNode.id}`,
    parentId
  };
};

const mapToRelative = (globalNode) => {
  if (!globalNode) return null;
  const { relativeId } = parseId(globalNode.id);
  const { relativeId: relativeParentId } = parseId(globalNode.parentId);
  return {
    ...globalNode,
    id: relativeId,
    parentId: relativeParentId
  };
};

// --- Global File System API ---

export const getNodes = async () => {
  const allNodes = [];
  const workspaces = await idbStore.getWorkspaces();

  for (const ws of workspaces) {
    allNodes.push({
      id: ws.id,
      name: ws.name || ws.id,
      type: 'folder',
      parentId: null,
      isWorkspaceRoot: true,
      workspaceType: ws.type
    });

    const driver = getDriver(ws.type);
    try {
      const nodes = await driver.getNodes(ws.id);
      for (const node of nodes) {
        allNodes.push(mapToGlobal(ws.id, node));
      }
    } catch (e) {
      console.error(`Failed to get nodes for workspace ${ws.id}`, e);
    }
  }
  return allNodes;
};

export const getFileContent = async (globalId) => {
  const { workspaceId, relativeId } = parseId(globalId);
  const workspaces = await idbStore.getWorkspaces();
  const ws = workspaces.find(w => w.id === workspaceId);
  if (!ws) throw new Error("Workspace not found");
  
  const driver = getDriver(ws.type);
  return driver.getFileContent(workspaceId, relativeId);
};

export const getFileBlob = async (globalId) => {
  const { workspaceId, relativeId } = parseId(globalId);
  const workspaces = await idbStore.getWorkspaces();
  const ws = workspaces.find(w => w.id === workspaceId);
  if (!ws) throw new Error("Workspace not found");
  
  const driver = getDriver(ws.type);
  if (driver.getFileBlob) {
    return driver.getFileBlob(workspaceId, relativeId);
  }
};

export const createNode = async (globalNode) => {
  const { workspaceId, relativeId: relativeParentId } = parseId(globalNode.parentId);
  const workspaces = await idbStore.getWorkspaces();
  const ws = workspaces.find(w => w.id === workspaceId);
  if (!ws) throw new Error("Workspace not found for creation");

  const driver = getDriver(ws.type);
  const relativeNode = { ...globalNode, parentId: relativeParentId };
  
  const created = await driver.createNode(workspaceId, relativeNode);
  return mapToGlobal(workspaceId, created);
};

export const updateNode = async (globalId, updates, oldGlobalNode) => {
  const { workspaceId, relativeId } = parseId(globalId);
  
  if (oldGlobalNode.isWorkspaceRoot) {
    if (updates.name) {
      const workspaces = await idbStore.getWorkspaces();
      const wsIndex = workspaces.findIndex(w => w.id === workspaceId);
      if (wsIndex !== -1) {
        workspaces[wsIndex].name = updates.name;
        await idbStore.saveWorkspaces(workspaces);
      }
    }
    return { ...oldGlobalNode, ...updates };
  }

  const workspaces = await idbStore.getWorkspaces();
  const ws = workspaces.find(w => w.id === workspaceId);
  if (!ws) throw new Error("Workspace not found for update");

  const driver = getDriver(ws.type);
  const relativeUpdates = mapToRelative({ ...updates, id: globalId, parentId: updates.parentId || oldGlobalNode.parentId });
  delete relativeUpdates.id;
  
  const oldRelativeNode = mapToRelative(oldGlobalNode);

  const updated = await driver.updateNode(workspaceId, relativeId, relativeUpdates, oldRelativeNode);
  return mapToGlobal(workspaceId, updated);
};

export const deleteNode = async (globalId, type) => {
  const { workspaceId, relativeId } = parseId(globalId);
  
  if (!relativeId) {
    // Attempting to delete a workspace root
    await disconnectWorkspace(workspaceId);
    return;
  }

  const workspaces = await idbStore.getWorkspaces();
  const ws = workspaces.find(w => w.id === workspaceId);
  if (!ws) throw new Error("Workspace not found for deletion");

  const driver = getDriver(ws.type);
  return driver.deleteNode(workspaceId, relativeId, type);
};

export const getTrashNodes = async () => {
  const allTrash = [];
  const workspaces = await idbStore.getWorkspaces();
  for (const ws of workspaces) {
    const driver = getDriver(ws.type);
    if (driver.getTrashNodes) {
      try {
        const trash = await driver.getTrashNodes(ws.id);
        for (const item of trash) {
          allTrash.push({
            ...item,
            globalTrashId: `${ws.id}::${item.trashId}`,
            originalGlobalId: `${ws.id}::${item.originalId}`,
            workspaceId: ws.id
          });
        }
      } catch (e) {}
    }
  }
  return allTrash;
};

export const restoreNode = async (globalTrashId) => {
  const { workspaceId, relativeId: trashId } = parseId(globalTrashId);
  const workspaces = await idbStore.getWorkspaces();
  const ws = workspaces.find(w => w.id === workspaceId);
  if (!ws) return;

  const driver = getDriver(ws.type);
  if (driver.restoreNode) {
    return driver.restoreNode(workspaceId, trashId);
  }
};

export const emptyTrash = async () => {
  const workspaces = await idbStore.getWorkspaces();
  for (const ws of workspaces) {
    const driver = getDriver(ws.type);
    if (driver.emptyTrash) {
      await driver.emptyTrash(ws.id);
    }
  }
};

export const sync = async () => {
  const workspaces = await idbStore.getWorkspaces();
  for (const ws of workspaces) {
    const driver = getDriver(ws.type);
    if (driver.sync) {
      try {
        await driver.sync(ws.id);
      } catch (e) {
        console.error(`Sync failed for ${ws.id}`, e);
      }
    }
  }
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

// --- Not supported with multi-workspace yet, just stubs ---
export const migrateToGithub = async () => { throw new Error("Use Add Workspace instead"); };
export const exportSandboxData = async () => { throw new Error("Not implemented for multi-workspace"); };
export const importSandboxData = async () => { throw new Error("Not implemented for multi-workspace"); };
