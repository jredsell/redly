import Peer from 'peerjs';
import * as db from './db';
import * as localDriver from './local_driver';

let peer = null;
let myId = null;
const TRUSTED_DEVICES_KEY = 'redly_trusted_devices';

// Callbacks for UI
let onPeerRequest = null;
let onSyncProgress = null;
let onSyncComplete = null;
let onSyncError = null;
let onConflictDetected = null;

// The active open connections
const connections = new Map();

export const initSyncEngine = (callbacks) => {
    if (callbacks.onRequest) onPeerRequest = callbacks.onRequest;
    if (callbacks.onProgress) onSyncProgress = callbacks.onProgress;
    if (callbacks.onComplete) onSyncComplete = callbacks.onComplete;
    if (callbacks.onError) onSyncError = callbacks.onError;
    if (callbacks.onConflict) onConflictDetected = callbacks.onConflict;

    // We try to use a deterministic previously-generated ID from local storage if available
    const savedId = localStorage.getItem('redly_peer_id');

    const initPeer = (idToTry, isRetry = false) => {
        return new Promise((resolve, reject) => {
            const tempPeer = new Peer(idToTry, {
                debug: 2,
                config: {
                    iceServers: [
                        { urls: 'stun:stun.l.google.com:19302' },
                        { urls: 'stun:stun1.l.google.com:19302' }
                    ]
                }
            });

            tempPeer.on('open', (id) => {
                myId = id;
                peer = tempPeer;
                localStorage.setItem('redly_peer_id', id);
                tempPeer.on('connection', handleIncomingConnection);
                resolve(id);
            });

            tempPeer.on('error', (err) => {
                console.error('PeerJS Error:', err);
                if (err.type === 'unavailable-id' && !isRetry) {
                    console.log('[Sync] ID already taken. Requesting a new unique ID...');
                    localStorage.removeItem('redly_peer_id');
                    tempPeer.destroy();
                    // Retry once without an ID
                    resolve(initPeer(undefined, true));
                    return;
                }

                if (onSyncError) onSyncError(err);
                reject(err);
            });
        });
    };

    return initPeer(savedId || undefined);
};

export const getMyId = () => myId;

// --- Device Management ---
export const getTrustedDevices = () => {
    const data = localStorage.getItem(TRUSTED_DEVICES_KEY);
    return data ? JSON.parse(data) : [];
};

export const addTrustedDevice = (id) => {
    const devices = getTrustedDevices();
    if (!devices.includes(id)) {
        devices.push(id);
        localStorage.setItem(TRUSTED_DEVICES_KEY, JSON.stringify(devices));
    }
};

export const removeTrustedDevice = (id) => {
    let devices = getTrustedDevices();
    devices = devices.filter(d => d !== id);
    localStorage.setItem(TRUSTED_DEVICES_KEY, JSON.stringify(devices));
    // Close connection if active
    if (connections.has(id)) {
        connections.get(id).close();
        connections.delete(id);
    }
};

// --- Connection Handling ---
const handleIncomingConnection = (conn) => {
    console.log('[Sync] Incoming connection from', conn.peer);
    const trusted = getTrustedDevices();

    // Buffer any messages that arrive while the user is looking at the Accept/Reject prompt
    const earlyMessages = [];
    const bufferListener = (data) => earlyMessages.push(data);
    conn.on('data', bufferListener);

    if (trusted.includes(conn.peer)) {
        conn.off('data', bufferListener);
        setupConnection(conn);
    } else {
        if (onPeerRequest) {
            onPeerRequest(conn.peer, () => {
                // Accepted
                addTrustedDevice(conn.peer);
                conn.off('data', bufferListener);
                setupConnection(conn);
                // Replay buffered messages
                earlyMessages.forEach(msg => handleIncomingData(conn.peer, msg));
            }, () => {
                conn.close();
            });
        } else {
            conn.close();
        }
    }
};

export const connectToPeer = (remoteId) => {
    if (!peer) throw new Error('Sync engine not initialized');

    return new Promise(async (resolve, reject) => {
        addTrustedDevice(remoteId); // Optimistically trust them since WE initiated it

        try {
            // Auto-reconnect to signaling server if the tab went to sleep
            if (peer.disconnected) {
                console.log("[Sync] Reconnecting to signaling server...");
                peer.reconnect();
                await new Promise((res, rej) => {
                    const onOpen = () => { peer.off('error', onError); res(); };
                    const onError = (e) => { peer.off('open', onOpen); rej(e); };
                    peer.once('open', onOpen);
                    peer.once('error', onError);
                });
            }

            const conn = peer.connect(remoteId, { reliable: true });

            if (!conn) {
                removeTrustedDevice(remoteId);
                return reject(new Error("Networking error: Could not establish peer connection. Are you connected to the internet?"));
            }

            const timeout = setTimeout(() => {
                removeTrustedDevice(remoteId);
                reject(new Error("Connection timed out (30s). Ensure the other device is online, has Redly open, and accepted the prompt."));
            }, 30000);

            conn.on('open', () => {
                clearTimeout(timeout);
                setupConnection(conn);
                resolve(true);
            });

            conn.on('error', (err) => {
                clearTimeout(timeout);
                console.error('Connection error:', err);
                removeTrustedDevice(remoteId);
                reject(err);
            });
        } catch (e) {
            console.error('Peer connection exception:', e);
            removeTrustedDevice(remoteId);
            reject(new Error("Internal signaling error: " + (e.message || "Unknown error")));
        }
    });
};

const setupConnection = (conn) => {
    connections.set(conn.peer, conn);

    conn.on('data', (data) => {
        handleIncomingData(conn.peer, data);
    });

    conn.on('close', () => {
        connections.delete(conn.peer);
    });

    safeSend(conn, null, () => initiateSyncHandshake(conn));
};

const safeSend = (conn, data, callback = null) => {
    if (conn.open) {
        if (data) conn.send(data);
        if (callback) callback();
    } else {
        conn.once('open', () => {
            if (data) conn.send(data);
            if (callback) callback();
        });
    }
};

// --- Sync Protocol Logic ---
// We will build this fully out in the next phase!
const initiateSyncHandshake = async (conn) => {
    if (onSyncProgress) onSyncProgress(conn.peer, 'Compiling local journal...');
    try {
        const journal = await localDriver.getSyncJournal();
        safeSend(conn, {
            type: 'SYNC_HANDSHAKE',
            journal: journal
        });
    } catch (e) {
        console.error('Failed to prepare sync handshake:', e);
        if (onSyncError) onSyncError(e);
    }
};

const handleIncomingData = async (peerId, payload) => {
    const { type } = payload;
    console.log(`[Sync] Received ${type} from ${peerId}`);
    const conn = connections.get(peerId);
    if (!conn) return;

    if (type === 'SYNC_HANDSHAKE') {
        if (onSyncProgress) onSyncProgress(peerId, 'Comparing files...');
        const remoteJournal = payload.journal || {};
        const localJournal = await localDriver.getSyncJournal();
        const lastSyncTime = parseInt(localStorage.getItem('sync_time_' + peerId) || '0', 10);

        const actionsToSend = [];
        const conflictNodes = [];

        for (const [nodeId, localEntry] of Object.entries(localJournal)) {
            const remoteEntry = remoteJournal[nodeId];

            if (remoteEntry) {
                // Check for divergence: both modified since last sync
                if (localEntry.timestamp > lastSyncTime && remoteEntry.timestamp > lastSyncTime && localEntry.timestamp !== remoteEntry.timestamp) {
                    if (localEntry.action === 'update' && remoteEntry.action === 'update') {
                        conflictNodes.push(nodeId);
                        continue; // Skip automatic resolution
                    }
                }
            }

            if (!remoteEntry || localEntry.timestamp > remoteEntry.timestamp) {
                actionsToSend.push({ nodeId, ...localEntry });
            }
        }

        // If there are conflicts, alert the UI immediately to stop and ask the user
        if (conflictNodes.length > 0) {
            if (onConflictDetected) {
                // Fetch the contents of both sides
                const conflictsData = await Promise.all(conflictNodes.map(async (nodeId) => {
                    const localContent = await db.getFileContent(nodeId).catch(() => '');
                    // We need to ask the remote for THEIR content to show side-by-side
                    return { nodeId, localContent, remoteTimestamp: remoteJournal[nodeId].timestamp, localTimestamp: localJournal[nodeId].timestamp };
                }));

                // For now, we will just halt sync for these specific conflict files, but continue the rest
                safeSend(conn, { type: 'SYNC_ACTIONS', actions: actionsToSend, conflicts: conflictNodes });
                onConflictDetected(peerId, conflictsData);
                return;
            }
        }

        if (actionsToSend.length > 0) {
            safeSend(conn, { type: 'SYNC_ACTIONS', actions: actionsToSend, conflicts: [] });
        } else {
            safeSend(conn, { type: 'SYNC_UP_TO_DATE' });
        }
    }
    else if (type === 'SYNC_ACTIONS') {
        const { actions, conflicts } = payload;
        const filesToRequest = [];

        // Also if Remote told us there are conflicts, alert our UI
        if (conflicts && conflicts.length > 0 && onConflictDetected) {
            const localJournal = await localDriver.getSyncJournal();
            const conflictsData = await Promise.all(conflicts.map(async (nodeId) => {
                const localContent = await db.getFileContent(nodeId).catch(() => '');
                return { nodeId, localContent, localTimestamp: localJournal[nodeId]?.timestamp || 0 };
            }));
            onConflictDetected(peerId, conflictsData, true); // true = we are the receiver
        }

        for (const actionObj of actions) {
            const { action, nodeId, type: nodeType } = actionObj;
            if (action === 'delete') {
                try { await db.deleteNode(nodeId, nodeType); } catch (e) { }
            } else if (action === 'create' && nodeType === 'folder') {
                try {
                    const name = nodeId.split('/').pop();
                    const parentId = nodeId.substring(0, nodeId.lastIndexOf('/')) || null;
                    await db.createNode({ name, parentId, type: 'folder' });
                } catch (e) { }
            } else if (action === 'create' || action === 'update') {
                filesToRequest.push(nodeId);
            }
        }

        if (filesToRequest.length > 0) {
            if (onSyncProgress) onSyncProgress(peerId, `Requesting ${filesToRequest.length} files...`);
            safeSend(conn, { type: 'SYNC_FILE_REQUEST', neededFiles: filesToRequest });
        } else {
            safeSend(conn, { type: 'SYNC_UP_TO_DATE' });
            if (onSyncComplete) onSyncComplete(peerId);
        }
    }
    else if (type === 'SYNC_FILE_REQUEST') {
        const { neededFiles } = payload;
        const fileBatch = [];
        for (const nodeId of neededFiles) {
            try {
                const content = await db.getFileContent(nodeId);
                const name = nodeId.split('/').pop().replace('.md', '');
                const parentId = nodeId.substring(0, nodeId.lastIndexOf('/')) || null;
                fileBatch.push({ nodeId, name, parentId, content });
            } catch (e) {
                console.warn(`Could not read file for sync: ${nodeId}`);
            }
        }
        safeSend(conn, { type: 'SYNC_FILE_BATCH', files: fileBatch });
    }
    else if (type === 'SYNC_FILE_BATCH') {
        const { files } = payload;
        if (onSyncProgress) onSyncProgress(peerId, `Saving ${files.length} files...`);
        for (const fileObj of files) {
            const { nodeId, name, parentId, content } = fileObj;
            try {
                await db.updateNode(nodeId, { content }, { id: nodeId, name, parentId, type: 'file' });
            } catch (e) {
                await db.createNode({ name, parentId, type: 'file', content });
            }
        }
        safeSend(conn, { type: 'SYNC_UP_TO_DATE' });
        localStorage.setItem('sync_time_' + peerId, Date.now());
        if (onSyncComplete) onSyncComplete(peerId);
    }
    else if (type === 'SYNC_UP_TO_DATE') {
        localStorage.setItem('sync_time_' + peerId, Date.now());
        if (onSyncComplete) onSyncComplete(peerId);
    }
    else if (type === 'SYNC_RESOLVE_CONFLICT') {
        // The other peer resolved the conflict and sent us the winner content
        const { nodeId, content, name, parentId } = payload;
        try {
            await db.updateNode(nodeId, { content }, { id: nodeId, name, parentId, type: 'file' });
        } catch (e) {
            await db.createNode({ name, parentId, type: 'file', content });
        }
        // No need to send UP_TO_DATE here, to avoid infinite loops
    }
};

export const sendConflictResolution = (peerId, nodeId, winningContent) => {
    const conn = connections.get(peerId);
    if (!conn) return;
    const name = nodeId.split('/').pop().replace('.md', '');
    const parentId = nodeId.substring(0, nodeId.lastIndexOf('/')) || null;

    // Send to remote so they can update
    conn.send({ type: 'SYNC_RESOLVE_CONFLICT', nodeId, content: winningContent, name, parentId });
    // Also update locally
    db.updateNode(nodeId, { content: winningContent }, { id: nodeId, name, parentId, type: 'file' }).catch(() => {
        db.createNode({ name, parentId, type: 'file', content: winningContent });
    });
};
