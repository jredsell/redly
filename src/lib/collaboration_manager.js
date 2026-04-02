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
     * @param {string} signalingUrl 
     */
    initSession(roomId, key, signalingUrl = 'wss://signaling.yjs.dev') {
        if (this.provider) {
            this.stopSession();
        }

        this.activeRoomId = roomId;
        this.activeKey = key;
        this.doc = new Y.Doc();

        // Initialize WebrtcProvider with encryption key as password
        this.provider = new WebrtcProvider(roomId, this.doc, {
            password: key,
            signaling: [signalingUrl],
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
            this.provider.destroy();
            this.provider = null;
        }
        if (this.doc) {
            this.doc.destroy();
            this.doc = null;
        }
        this.awareness = null;
        this.activeRoomId = null;
        this.activeKey = null;
        console.log('[Collab] Session stopped.');
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
