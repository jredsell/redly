// --- Google Drive API Driver for Redly ---
import { getHandle, setHandle } from './idb_store';

let accessToken = null;

const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';
const SCOPES = 'https://www.googleapis.com/auth/drive';
// Client ID is a public identifier — safe to include in source. The deploy workflow also
// injects it via VITE_GDRIVE_CLIENT_ID env var (set as a GitHub repo variable).
const CLIENT_ID = import.meta.env.VITE_GDRIVE_CLIENT_ID || '747035091008-jcps855ub365ck2893203ucgce1hcn4h.apps.googleusercontent.com';

console.log('[GDrive] Driver initialized. Client ID present:', !!CLIENT_ID);

const waitForGoogle = () => {
    return new Promise((resolve) => {
        if (window.google?.accounts?.oauth2) {
            console.log('[GDrive] GIS script already loaded');
            return resolve();
        }
        console.log('[GDrive] Waiting for GIS script...');
        const interval = setInterval(() => {
            if (window.google?.accounts?.oauth2) {
                console.log('[GDrive] GIS script loaded after wait');
                clearInterval(interval);
                resolve();
            }
        }, 100);
        setTimeout(() => {
            clearInterval(interval);
            if (!window.google?.accounts?.oauth2) console.warn('[GDrive] GIS script wait timed out after 5s');
            resolve(); // Try anyway after 5s or handle error
        }, 5000);
    });
};

export const resetAccessToken = () => {
    accessToken = null;
    localStorage.removeItem('gdrive_token');
    localStorage.removeItem('gdrive_token_expiry');
};

export const getAccessToken = async () => {
    if (accessToken) return accessToken;
    const savedToken = localStorage.getItem('gdrive_token');
    const expiry = localStorage.getItem('gdrive_token_expiry');
    if (savedToken && expiry && Date.now() < parseInt(expiry)) {
        accessToken = savedToken;
        return accessToken;
    }

    // Check if GIS is loaded before proceeding
    if (!window.google?.accounts?.oauth2) {
        console.log('[GDrive] Waiting for GIS script before auth...');
        await waitForGoogle();
    }

    return new Promise((resolve, reject) => {
        if (!window.google?.accounts?.oauth2) {
            return reject(new Error('Google Identity Services script not loaded. Check your internet connection.'));
        }
        if (!CLIENT_ID) {
            return reject(new Error('Google Drive Client ID is missing.'));
        }

        let isResolved = false;
        const client = window.google.accounts.oauth2.initTokenClient({
            client_id: CLIENT_ID,
            scope: SCOPES,
            callback: (response) => {
                isResolved = true;
                console.log('[GDrive] Auth callback received:', response);
                if (response.error) {
                    console.error('[GDrive] Auth error:', response.error, response.error_description || '');
                    reject(new Error(response.error === 'popup_closed_by_user' ? 'Sign-in cancelled' : `Auth Error: ${response.error}`));
                } else {
                    accessToken = response.access_token;
                    localStorage.setItem('gdrive_token', accessToken);
                    localStorage.setItem('gdrive_token_expiry', (Date.now() + response.expires_in * 1000).toString());
                    resolve(accessToken);
                }
            },
            error_callback: (err) => {
                isResolved = true;
                console.error('[GDrive] Token client error:', err);
                reject(new Error('Token client initialization failed.'));
            }
        });

        console.log('[GDrive] Requesting access token...');
        client.requestAccessToken();

        // Safety timeout for silent failures
        setTimeout(() => {
            if (!isResolved) {
                console.warn('[GDrive] Auth timeout - popup might be blocked or stalled.');
                reject(new Error('Connection timed out. Please check if popups are blocked.'));
            }
        }, 60000);
    });
};

export const initRootFolder = async () => {
    await getAccessToken();
    const q = "name = 'redly' and mimeType = 'application/vnd.google-apps.folder' and trashed = false";
    const data = await driveRequest(`/files?q=${encodeURIComponent(q)}&fields=files(id,name)`);
    const existingFolder = data.files && data.files.find(f => f.name.toLowerCase() === 'redly');

    if (existingFolder) {
        return existingFolder.id;
    } else {
        const res = await driveRequest('/files', {
            method: 'POST',
            body: JSON.stringify({
                name: 'redly',
                mimeType: 'application/vnd.google-apps.folder',
                description: 'Storage for Redly Markdown notes'
            })
        });
        return res.id;
    }
};

const driveRequest = async (path, options = {}) => {
    const token = accessToken || await getAccessToken();
    const url = `https://www.googleapis.com/drive/v3${path}`;
    const res = await fetch(url, {
        ...options,
        headers: {
            ...options.headers,
            'Authorization': `Bearer ${token}`,
            'Content-Type': options.body ? 'application/json' : undefined
        }
    });
    if (!res.ok) throw await res.json();
    return res.json();
};

let nodeCache = [];

export const getNodes = async () => {
    const rootId = await getHandle('gdrive_root_id');
    if (!rootId) return [];

    console.log('[GDrive] Batch fetching all nodes...');
    // Fetch all files that are not trashed and have the rootId or some other parent.
    // We use a flat query to get everything at once.
    const q = "trashed = false";
    const data = await driveRequest(`/files?q=${encodeURIComponent(q)}&fields=files(id,name,mimeType,modifiedTime,parents)&pageSize=1000`);

    if (!data.files) return [];

    const allFiles = data.files;
    const nodes = [];

    // Map to quickly find gdriveId -> nodePath
    const idToPath = new Map();
    idToPath.set(rootId, '');

    // We might need multiple passes to build paths if parents aren't ordered
    const processQueue = [...allFiles];
    let lastLength = -1;

    while (processQueue.length > 0 && processQueue.length !== lastLength) {
        lastLength = processQueue.length;
        for (let i = processQueue.length - 1; i >= 0; i--) {
            const file = processQueue[i];
            const parentId = file.parents?.[0];

            if (idToPath.has(parentId)) {
                const parentPath = idToPath.get(parentId);
                const nodePath = parentPath ? `${parentPath}/${file.name}` : file.name;

                idToPath.set(file.id, nodePath);

                if (file.mimeType === 'application/vnd.google-apps.folder') {
                    nodes.push({ id: nodePath, name: file.name, type: 'folder', parentId: parentPath || null, gdriveId: file.id });
                } else if (file.name.endsWith('.md')) {
                    nodes.push({
                        id: nodePath,
                        name: file.name.replace('.md', ''),
                        type: 'file',
                        parentId: parentPath || null,
                        updatedAt: new Date(file.modifiedTime).getTime(),
                        gdriveId: file.id
                    });
                }
                processQueue.splice(i, 1);
            }
        }
    }

    console.log(`[GDrive] Processed ${nodes.length} nodes from ${allFiles.length} files.`);
    nodeCache = nodes;
    return nodes;
};

export const getFileContent = async (id, node) => {
    // If we have the node object with gdriveId, use it directly. 
    // Otherwise try to find it in cache.
    const targetNode = node?.gdriveId ? node : nodeCache.find(n => n.id === id);

    if (!targetNode || !targetNode.gdriveId) {
        // Fallback: one last attempt to refresh cache if missing
        const freshNodes = await getNodes();
        const refoundNode = freshNodes.find(n => n.id === id);
        if (!refoundNode) return '';
        return getFileContent(id, refoundNode);
    }

    const contentRes = await fetch(`https://www.googleapis.com/drive/v3/files/${targetNode.gdriveId}?alt=media`, {
        headers: { 'Authorization': `Bearer ${accessToken || await getAccessToken()}` }
    });
    return await contentRes.text();
};

export const createNode = async (node) => {
    const rootId = await getHandle('gdrive_root_id');
    let parentGDriveId = rootId;
    if (node.parentId) {
        const parts = node.parentId.split('/');
        let currentFolderId = rootId;
        for (const part of parts) {
            const q = `'${currentFolderId}' in parents and name = '${part}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
            const data = await driveRequest(`/files?q=${encodeURIComponent(q)}&fields=files(id)`);
            if (data.files && data.files.length > 0) {
                currentFolderId = data.files[0].id;
            } else {
                currentFolderId = rootId;
                break;
            }
        }
        parentGDriveId = currentFolderId;
    }

    const metadata = {
        name: node.type === 'file' ? `${node.name}.md` : node.name,
        mimeType: node.type === 'file' ? 'text/markdown' : 'application/vnd.google-apps.folder',
        parents: [parentGDriveId]
    };

    if (node.type === 'folder') {
        const res = await driveRequest('/files', {
            method: 'POST',
            body: JSON.stringify(metadata)
        });
        return { ...node, gdriveId: res.id };
    } else {
        const form = new FormData();
        form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
        form.append('file', new Blob([node.content || ''], { type: 'text/markdown' }));

        const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${accessToken}` },
            body: form
        });
        const data = await res.json();
        return { ...node, gdriveId: data.id };
    }
};

export const updateNode = async (id, updates, oldNode) => {
    if (updates.content !== undefined) {
        await fetch(`https://www.googleapis.com/upload/drive/v3/files/${oldNode.gdriveId}?uploadType=media`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'text/markdown'
            },
            body: updates.content
        });
    }
    if (updates.name && updates.name !== oldNode.name) {
        await driveRequest(`/files/${oldNode.gdriveId}`, {
            method: 'PATCH',
            body: JSON.stringify({ name: oldNode.type === 'file' ? `${updates.name}.md` : updates.name })
        });
    }
    if (updates.parentId !== undefined) {
        // Move in GDrive: requires adding new parent and removing old parent
        const rootId = await getHandle('gdrive_root_id');
        let newParentId = rootId;
        if (updates.parentId) {
            // This is a bit simplified, ideally we'd look up the gdriveId of the new parentId path
            // But for now, we'll try to find it in the current nodes list or root
            const newParentNode = (await driveRequest(`/files?q='${rootId}' in parents and name='${updates.parentId.split('/').pop()}'&fields=files(id)`)).files[0];
            if (newParentNode) newParentId = newParentNode.id;
        }

        // To do a proper move we need the current parents
        const fileInfo = await driveRequest(`/files/${oldNode.gdriveId}?fields=parents`);
        const oldParents = fileInfo.parents.join(',');

        await driveRequest(`/files/${oldNode.gdriveId}?addParents=${newParentId}&removeParents=${oldParents}`, {
            method: 'PATCH'
        });
    }

    return { ...oldNode, ...updates };
};

export const deleteNode = async (id, type, gdriveId) => {
    await driveRequest(`/files/${gdriveId}`, { method: 'DELETE' });
};
