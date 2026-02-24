// --- Google Drive API Driver for Redly ---
import { getHandle, setHandle } from './idb_store';

let accessToken = null;

const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';
const SCOPES = 'https://www.googleapis.com/auth/drive.file';
const CLIENT_ID = import.meta.env.VITE_GDRIVE_CLIENT_ID;

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

    return new Promise(async (resolve, reject) => {
        await waitForGoogle();
        if (!window.google?.accounts?.oauth2) {
            return reject(new Error('Google Identity Services script not loaded. Check your internet connection or Content Security Policy.'));
        }
        if (!CLIENT_ID) {
            return reject(new Error('Google Drive Client ID is missing. Check your .env.local file.'));
        }

        const client = window.google.accounts.oauth2.initTokenClient({
            client_id: CLIENT_ID,
            scope: SCOPES,
            callback: (response) => {
                console.log('[GDrive] Auth callback received:', response);
                if (response.error) {
                    console.error('[GDrive] Auth error:', response.error, response.error_description || '');
                    reject(new Error(`Google Auth Error: ${response.error}`));
                } else {
                    accessToken = response.access_token;
                    localStorage.setItem('gdrive_token', accessToken);
                    localStorage.setItem('gdrive_token_expiry', (Date.now() + response.expires_in * 1000).toString());
                    console.log('[GDrive] Auth successful, token stored');
                    resolve(accessToken);
                }
            },
            error_callback: (err) => {
                console.error('[GDrive] Token client error:', err);
                reject(err);
            }
        });
        console.log('[GDrive] Requesting access token via GIS popup...');
        try {
            client.requestAccessToken();
        } catch (e) {
            console.error('[GDrive] Failed to trigger requestAccessToken:', e);
            reject(e);
        }
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

export const getNodes = async () => {
    const rootId = await getHandle('gdrive_root_id');
    if (!rootId) return [];

    const nodes = [];
    const fetchPath = async (folderId, currentPath = '') => {
        const q = `'${folderId}' in parents and trashed = false`;
        const data = await driveRequest(`/files?q=${encodeURIComponent(q)}&fields=files(id,name,mimeType,modifiedTime)`);

        for (const file of data.files) {
            const nodePath = currentPath ? `${currentPath}/${file.name}` : file.name;
            if (file.mimeType === 'application/vnd.google-apps.folder') {
                nodes.push({ id: nodePath, name: file.name, type: 'folder', parentId: currentPath || null, gdriveId: file.id });
                await fetchPath(file.id, nodePath);
            } else if (file.name.endsWith('.md')) {
                const contentRes = await fetch(`https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`, {
                    headers: { 'Authorization': `Bearer ${accessToken}` }
                });
                const content = await contentRes.text();
                nodes.push({
                    id: nodePath,
                    name: file.name.replace('.md', ''),
                    type: 'file',
                    parentId: currentPath || null,
                    content,
                    updatedAt: new Date(file.modifiedTime).getTime(),
                    gdriveId: file.id
                });
            }
        }
    };
    await fetchPath(rootId);
    return nodes;
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
