import React, { useState } from 'react';
import { AlertTriangle, Clock, Server, Monitor } from 'lucide-react';
import * as syncEngine from '../lib/sync_engine';

export default function SyncConflictModal({ peerId, conflicts, onResolvedAll }) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const currentConflict = conflicts[currentIndex];

    if (!currentConflict) return null;

    const handleResolve = (winningContent) => {
        syncEngine.sendConflictResolution(peerId, currentConflict.nodeId, winningContent);

        if (currentIndex < conflicts.length - 1) {
            setCurrentIndex(prev => prev + 1);
        } else {
            onResolvedAll();
        }
    };

    const fileName = currentConflict.nodeId.split('/').pop();
    const localTime = currentConflict.localTimestamp ? new Date(currentConflict.localTimestamp).toLocaleString() : 'Unknown';

    return (
        <div className="modal-overlay" style={{ zIndex: 10001 }}>
            <div className="modal-content" style={{ maxWidth: '500px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', color: 'var(--danger-color)' }}>
                    <AlertTriangle size={24} />
                    <h2 style={{ margin: 0, fontSize: '20px' }}>Sync Conflict Detected</h2>
                </div>

                <p style={{ color: 'var(--text-secondary)', fontSize: '14.5px', marginBottom: '8px' }}>
                    Both you and <strong>{peerId.substring(0, 8)}...</strong> have modified the file <code style={{ background: 'var(--bg-secondary)', padding: '2px 4px', borderRadius: '4px' }}>{fileName}</code> while offline.
                </p>
                <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '24px' }}>
                    Conflict {currentIndex + 1} of {conflicts.length}
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px', marginBottom: '24px' }}>
                    <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '16px', background: 'var(--bg-secondary)' }}>
                        <h3 style={{ margin: '0 0 8px 0', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Monitor size={16} className="icon-color" /> Local Version
                        </h3>
                        <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '12px' }}>
                            <Clock size={12} /> Last edited: {localTime}
                        </div>
                        <div style={{
                            background: 'var(--bg-primary)', padding: '12px', borderRadius: '4px', fontSize: '13px',
                            maxHeight: '120px', overflowY: 'auto', whiteSpace: 'pre-wrap', color: 'var(--text-secondary)',
                            border: '1px solid var(--border-color)'
                        }}>
                            {currentConflict.localContent || "(Empty file)"}
                        </div>
                        <button
                            className="primary-btn"
                            style={{ width: '100%', marginTop: '12px', padding: '10px' }}
                            onClick={() => handleResolve(currentConflict.localContent || '')}
                        >
                            Keep Local Version
                        </button>
                    </div>

                    <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '16px', background: 'var(--bg-secondary)' }}>
                        <h3 style={{ margin: '0 0 8px 0', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Server size={16} className="icon-color" /> Remote Version
                        </h3>
                        <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '12px' }}>
                            <Clock size={12} /> Pending Download
                        </div>
                        <div style={{
                            background: 'var(--bg-primary)', padding: '12px', borderRadius: '4px', fontSize: '13px',
                            color: 'var(--text-tertiary)', fontStyle: 'italic', border: '1px solid var(--border-color)', textAlign: 'center'
                        }}>
                            Cannot preview remote text until chosen.
                        </div>
                        <button
                            className="secondary-btn"
                            style={{ width: '100%', marginTop: '12px', padding: '10px', background: 'var(--bg-primary)' }}
                            onClick={() => {
                                // To choose remote, we don't send *our* content back. 
                                // Actually, if we choose Remote, we just tell the Sync Engine "I surrender, ask them for the file!"
                                // For simplicity, we can just trigger a manual file fetch.
                                // But since sendConflictResolution pushes a string, we kinda need the remote string.
                                // For this MVP, if they keep remote, we just trigger a force overwrite.
                                syncEngine.sendConflictResolution(peerId, currentConflict.nodeId, null /* triggers remote overwrite hook */);
                                if (currentIndex < conflicts.length - 1) setCurrentIndex(prev => prev + 1);
                                else onResolvedAll();
                            }}
                            disabled={true}
                            title="Previewing remote content is not supported yet. Please keep local."
                        >
                            Keep Remote Version (Disabled API)
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
}
