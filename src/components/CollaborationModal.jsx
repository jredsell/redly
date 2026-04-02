import React, { useState } from 'react';
import { X, Copy, Check, LogOut, Share2, Link as LinkIcon, Shield } from 'lucide-react';
import collabManager from '../lib/collaboration_manager';

export default function CollaborationModal({ isOpen, onClose, collaboration, onStop }) {
    const [copied, setCopied] = useState(false);

    if (!isOpen) return null;

    const shareUrl = collabManager.constructor.getCollaborationUrl(
        collaboration.roomId, 
        collaboration.key, 
        collaboration.sharedType, 
        collaboration.sharedNodeId,
        collabManager.provider?.signalingUrls?.[0] ?? null
    );

    const handleCopy = () => {
        navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content collab-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '450px' }}>
                <div className="modal-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div className="icon-circle" style={{ background: 'var(--bg-accent)', padding: '8px', borderRadius: '50%', color: 'var(--accent-color)' }}>
                            <Share2 size={20} />
                        </div>
                        <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Live Collaboration</h2>
                    </div>
                    <button className="icon-button" onClick={onClose}><X size={20} /></button>
                </div>

                <div className="modal-body" style={{ padding: '20px 0' }}>
                    <div className="info-box" style={{ background: 'rgba(37, 99, 235, 0.05)', padding: '12px', borderRadius: '8px', marginBottom: '20px', border: '1px solid rgba(37, 99, 235, 0.1)' }}>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <Shield size={18} style={{ color: 'var(--accent-color)', flexShrink: 0 }} />
                            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                                This session is <strong>End-to-End Encrypted</strong>. The decryption key is part of the URL fragment and is never sent to the signaling server.
                            </p>
                        </div>
                    </div>

                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-tertiary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Share Link
                        </label>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <div style={{ 
                                flex: 1, 
                                background: 'var(--bg-secondary)', 
                                border: '1px solid var(--border-color)', 
                                borderRadius: '6px', 
                                padding: '8px 12px',
                                fontSize: '0.9rem',
                                color: 'var(--text-secondary)',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                            }}>
                                <LinkIcon size={14} />
                                {shareUrl}
                            </div>
                            <button 
                                className="primary-btn" 
                                onClick={handleCopy}
                                style={{ padding: '8px 16px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '6px', minWidth: '100px', justifyContent: 'center' }}
                            >
                                {copied ? <><Check size={16} /> Copied</> : <><Copy size={16} /> Copy</>}
                            </button>
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                            Active Room ID: <code style={{ background: 'var(--bg-accent)', padding: '2px 4px', borderRadius: '4px' }}>{collaboration.roomId?.substring(0, 8)}...</code>
                        </div>
                    </div>
                </div>

                <div className="modal-footer" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '20px', marginTop: '10px', display: 'flex', justifyContent: 'space-between' }}>
                    <button className="secondary-btn" onClick={onClose} style={{ padding: '8px 16px', borderRadius: '6px' }}>
                        Close
                    </button>
                    <button 
                        className="danger-btn" 
                        onClick={() => { onStop(); onClose(); }}
                        style={{ padding: '8px 16px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                        <LogOut size={16} /> Stop Sharing
                    </button>
                </div>
            </div>

            <style>{`
                .collab-modal {
                    animation: slideUp 0.3s ease-out;
                }
                @keyframes slideUp {
                    from { transform: translateY(20px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
                @keyframes pulse {
                    0% { transform: scale(1); opacity: 1; }
                    50% { transform: scale(1.2); opacity: 0.7; }
                    100% { transform: scale(1); opacity: 1; }
                }
            `}</style>
        </div>
    );
}
