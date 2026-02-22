export const saveWorkspaceHandle = async (handle) => {
  localStorage.setItem('redly_workspace_path', handle);
};

export const getSavedWorkspaceHandle = async () => {
  return localStorage.getItem('redly_workspace_path');
};

export const clearWorkspaceHandle = async () => {
  localStorage.removeItem('redly_workspace_path');
};

export const getNodes = async (rootPath) => {
  if (!rootPath) return [];
  try {
    return await window.electronAPI.getNodes(rootPath);
  } catch (e) {
    console.error('Error fetching nodes', e);
    return [];
  }
};

export const createNode = async (rootPath, node) => {
  return await window.electronAPI.createNode(rootPath, node);
};

export const updateNode = async (rootPath, id, updates, oldNode) => {
  return await window.electronAPI.updateNode(rootPath, id, updates, oldNode);
};

export const deleteNode = async (rootPath, id, type) => {
  return await window.electronAPI.deleteNode(rootPath, id, type);
};

export const buildTree = (nodes) => {
  const map = new Map();
  const roots = [];

  nodes.forEach(node => {
    map.set(node.id, { ...node, children: [] });
  });

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
    nodeList.forEach(n => {
      if (n.children.length > 0) sortNodes(n.children);
    });
  };

  sortNodes(roots);
  return roots;
};
