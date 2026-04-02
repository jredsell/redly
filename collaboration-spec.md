# 🔴 Redly Collaboration Blueprint: Granular WebRTC

## 1. Objective
Enable real-time, peer-to-peer (P2P) collaboration using WebRTC and Yjs. The system must maintain Redly’s "No-Server" and "Privacy-First" philosophy, allowing users to collaborate regardless of their primary storage type (OPFS, Local Folder, or GitHub).

## 2. Granularity Levels
The implementation must support three distinct scopes of collaboration:
- **Note Level**: Syncs a single .md file.
- **Folder Level**: Syncs a specific directory and all nested files/sub-folders.
- **Workspace Level**: Syncs the entire root directory (Origin Private File System or mapped Local Folder).

## 3. Technical Stack
- **Engine**: Yjs (CRDT for conflict-free merging).
- **Network**: y-webrtc (P2P communication).
- **Encryption**: AES-GCM (End-to-End Encryption). Keys must be stored in the URL fragment (#) and never sent to the signaling server.
- **Signaling**: Use a lightweight discovery server (default: wss://signaling.yjs.dev) only for the initial handshake.

## 4. User Experience (UX) Flow
1. **Initiation**: User right-clicks an item (Note/Folder/Root) and selects "Collaborate".
2. **Link Generation**: Redly generates a unique Room ID and an Encryption Key.
   - **Format**: `https://redly.app/#room=[UUID]&key=[BASE64_KEY]`
3. **Active State**:
   - A "Pulsing Signal" icon appears next to the shared item in the sidebar.
   - Remote cursors and presence (User Initials) are visible in the editor.
4. **Termination**:
   - User can click "Stop Sharing" in the Sync Menu.
   - Access is automatically revoked when the host closes the browser tab.

## 5. Security & Access Control
- **Zero-Knowledge**: The signaling server must only facilitate connections; it must never have access to the decryption keys.
- **Session-Based**: Access is live only. No data is stored on a 3rd party server.
- **Conflict Resolution**: If a remote user makes a change while the host is offline, the changes remain local to that user until a re-connection is established.
- **Revocation**: Closing the session or regenerating the key immediately invalidates the existing share link.

## 6. Implementation Checklist for Antigravity
- [ ] Create `collaboration_manager.js` to handle Yjs Doc initialization.
- [ ] Build the WebRTC Provider with E2EE enabled.
- [ ] Update `Sidebar.jsx` to show "Shared" status indicators.
- [ ] Implement the "Share Menu" UI with "Copy Link" and "Kill Session" buttons.
- [ ] Ensure `db.js` correctly handles incoming Yjs updates before committing to OPFS/GitHub.
