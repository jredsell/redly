// --- Google Drive API Driver for Redly ---
import { getHandle, setHandle } from './idb_store';

let accessToken = null;

const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';
const SCOPES = 'https://www.googleapis.com/auth/drive.file';
const CLIENT_ID = import.meta.env.VITE_GDRIVE_CLIENT_ID;

export const getAccessToken = async () => {
    if (accessToken) return accessToken;
    const savedToken = localStorage.getItem('gdrive_token');
    const expiry = localStorage.getItem('gdrive_token_expiry');
    if (savedToken && expiry && Date.now() < parseInt(expiry)) {
        accessToken = savedToken;
        return accessToken;
    }

    return new Promise((resolve, reject) => {
        const client = window.google.accounts.oauth2.initTokenClient({
            client_id: CLIENT_ID,
            scope: SCOPES,
            callback: (response) => {
                if (response.error) reject(response);
                accessToken = response.access_token;
                localStorage.setItem('gdrive_token', accessToken);
                localStorage.setItem('gdrive_token_expiry', (Date.now() + response.expires_in * 1000).toString());
                resolve(accessToken);
            },
        });
        client.requestAccessToken();
    });
};

export const initRootFolder = async () => {
    await getAccessToken();
    // Search for "redly" folder (case-insensitive if possible, but created lowercase)
    const q = "name = 'redly' and mimeType = 'application/vnd.google-apps.folder' and trashed = false";
    const data = await driveRequest(`/files?q=${encodeURIComponent(q)}&fields=files(id,name)`);

    // Exact match check (Drive API 'name =' is already exact-ish but let's be sure)
    const existingFolder = data.files && data.files.find(f => f.name.toLowerCase() === 'redly');

    if (existingFolder) {
        return existingFolder.id;
    } else {
        // Create it - MUST BE EXACTLY 'redly'
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
                // Fetch content
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
    // Note: This is simplified. Proper recursive ID lookup would be better for nested folders.
    // For now, we assume parentId is available or root.
    const rootId = await getHandle('gdrive_root_id');
    const parentGDriveId = node.parentId ? /* lookup in local nodes? logic needed */ rootId : rootId;

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
        // Multi-part create for file with content
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
            body: JSON.stringify({ name: `${updates.name}.md` })
        });
    }
    return { ...oldNode, ...updates };
};

export const deleteNode = async (id, type, gdriveId) => {
    await driveRequest(`/files/${gdriveId}`, { method: 'DELETE' });
};
