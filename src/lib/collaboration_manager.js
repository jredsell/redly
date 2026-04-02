import * as Y from 'yjs';
import { WebrtcProvider } from 'y-webrtc';
import { v4 as uuidv4 } from 'uuid';

class CollaborationManager {
    constructor() {
        this.doc = null;
        this.provider = null;
        this.awareness = null;
        this.activeRoomId = null;
        this.activeKey = null;
        this.activeField = null;
        this.pendingInitialContent = null; // Markdown string — Editor will convert & seed
        this.onUpdateCallback = null;
    }

    /**
     * Generate a unique Room ID (UUID)
     */
    static generateRoomId() {
        return uuidv4();
    }

    /**
     * Generate a secure random encryption key (Base64)
     */
    static generateEncryptionKey() {
        const array = new Uint8Array(32);
        window.crypto.getRandomValues(array);
        return btoa(String.fromCharCode(...array))
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=/g, '');
    }

    /**
     * Formats the collaboration URL
     */
    static getCollaborationUrl(roomId, key, type, id) {
        const baseUrl = window.location.origin + window.location.pathname;
        const encodedId = encodeURIComponent(id || '');
        return `${baseUrl}#room=${roomId}&key=${key}&type=${type}&id=${encodedId}`;
    }

    /**
     * Initialize a collaboration session
     * @param {string} roomId 
     * @param {string} key 
     * @param {string} initialContent (Optional, for host seeding)
     * @param {string} signalingUrl 
     */
    initSession(roomId, key, field, initialContent = null, signalingUrl = null) {
        if (this.provider) {
            this.stopSession();
        }

        // Use multiple signaling servers for redundancy
        const DEFAULT_SIGNALING = [
            'wss://signaling.yjs.dev',
            'wss://y-webrtc-signaling-eu.herokuapp.com',
            'wss://y-webrtc-signaling-us.herokuapp.com',
            'wss://y-webrtc.fly.dev',
            'wss://y-webrtc.onrender.com'
        ];
        const signaling = signalingUrl ? [signalingUrl] : DEFAULT_SIGNALING;

        this.activeRoomId = roomId;
        this.activeKey = key;
        this.activeField = field;
        this.doc = new Y.Doc();

        if (initialContent !== null && initialContent !== undefined) {
            // Store for the Editor to retrieve — it will convert Markdown→HTML and seed the Yjs doc
            this.pendingInitialContent = initialContent;
            console.log(`[Collab] Host initial content stored (${initialContent.length} chars) for field: ${field}`);
        } else {
            this.pendingInitialContent = null;
        }

        // Initialize WebrtcProvider with encryption key as password
        this.provider = new WebrtcProvider(roomId, this.doc, {
            password: key,
            signaling: signaling,
            peerOpts: {
                config: {
                    iceServers: [
                        { urls: 'stun:stun.l.google.com:19302' },
                        { urls: 'stun:stun1.l.google.com:19302' }
                    ]
                }
            }
        });

        this.awareness = this.provider.awareness;

        console.log(`[Collab] Session initialized. Room: ${roomId}`);
        
        this.provider.on('status', event => {
            const connected = event.status === 'connected';
            console.log(`[Collab] Connection status:`, event.status, connected ? '✅' : '⏳');
            if (connected) {
                console.log(`[Collab] Connected via:`, this.provider.signalingUrls?.[0] || 'Local/BroadcastChannel');
            }
        });

        this.provider.on('synced', synced => {
            console.log(`[Collab] Document synced: ${synced ? '✅' : '❌'}`);
        });

        return {
            doc: this.doc,
            provider: this.provider,
            awareness: this.awareness
        };
    }

    /**
     * Set user presence information
     * @param {Object} userInfo { name, color, initial }
     */
    setPresence(userInfo) {
        if (!this.awareness) return;
        this.awareness.setLocalStateField('user', userInfo);
    }

    /**
     * Stop the current collaboration session
     */
    stopSession() {
        if (this.provider) {
            try { this.provider.destroy(); } catch (e) {}
            this.provider = null;
        }
        if (this.doc) {
            try { this.doc.destroy(); } catch (e) {}
            this.doc = null;
        }
        this.awareness = null;
        this.activeRoomId = null;
        this.activeKey = null;
        this.activeField = null;
        this.pendingInitialContent = null;
        console.log('[Collab] Session stopped.');
    }

    /**
     * Returns true if the shared Yjs XML fragment for the given field has no content yet.
     * The Host Editor calls this to decide whether to seed the document.
     * @param {string} field
     */
    isFieldEmpty(field) {
        if (!this.doc) return true;
        try {
            const fragment = this.doc.getXmlFragment(field);
            return fragment.length === 0;
        } catch (e) {
            return true;
        }
    }

    /**
     * Parse the URL for room and key
     */
    static parseUrlParams() {
        const hash = window.location.hash.substring(1);
        if (!hash) return null;

        const params = new URLSearchParams(hash);
        return {
            roomId: params.get('room'),
            key: params.get('key'),
            type: params.get('type'),
            id: decodeURIComponent(params.get('id') || '')
        };
    }
}

export const collabManager = new CollaborationManager();
export default collabManager;
