import React, { useState, useEffect } from 'react';
import { X, Copy, Check, Link, Trash2, Smartphone, ShieldCheck, Activity } from 'lucide-react';
import * as syncEngine from '../lib/sync_engine';

export default function SyncModal({ onClose }) {
    const [copied, setCopied] = useState(false);
    const [remoteId, setRemoteId] = useState('');
    const [status, setStatus] = useState('');
    const [trustedDevices, setTrustedDevices] = useState([]);
    const myId = syncEngine.getMyId();

    useEffect(() => {
        refreshTrustedDevices();
    }, []);

    const refreshTrustedDevices = () => {
        setTrustedDevices(syncEngine.getTrustedDevices());
    };

    const handleCopy = async () => {
        if (!myId) return;
        try {
            await navigator.clipboard.writeText(myId);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy text:', err);
        }
    };

    const handleConnect = async (e) => {
        e.preventDefault();
        if (!remoteId.trim()) return;

        setStatus('Connecting...');
        try {
            await syncEngine.connectToPeer(remoteId.trim());
            setStatus('Connected & Synced!');
            setRemoteId('');
            refreshTrustedDevices();
            setTimeout(() => setStatus(''), 3000);
        } catch (err) {
            setStatus('Connection failed. Is the other device online?');
            console.error("Connection failed", err);
        }
    };

    const handleRemoveDevice = (id) => {
        syncEngine.removeTrustedDevice(id);
        refreshTrustedDevices();
    };

    return (
        <div className="modal-overlay" onClick={onClose} style={{ zIndex: 9999 }}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '440px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <h2 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '20px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Activity size={20} className="icon-color" /> WebRTC Sync
                    </h2>
                    <button className="icon-button" onClick={onClose} aria-label="Close Sync Modal">
                        <X size={20} />
                    </button>
                </div>

                <div style={{ marginBottom: '24px' }}>
                    <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Your Device ID
                    </label>
                    <div style={{ display: 'flex', background: 'var(--bg-secondary)', borderRadius: '6px', border: '1px solid var(--border-color)', padding: '12px 14px', alignItems: 'center', gap: '12px' }}>
                        <code style={{ flex: 1, fontFamily: 'monospace', fontSize: '15px', color: 'var(--text-primary)', wordBreak: 'break-all' }}>
                            {myId || 'Initializing...'}
                        </code>
                        <button
                            className={`icon-button ${copied ? 'success' : ''}`}
                            onClick={handleCopy}
                            disabled={!myId}
                            title="Copy Device ID"
                            style={{ padding: '6px', background: copied ? 'var(--success-color)' : 'var(--bg-tertiary)', color: copied ? 'white' : 'var(--text-secondary)' }}
                        >
                            {copied ? <Check size={16} /> : <Copy size={16} />}
                        </button>
                    </div>
                </div>

                <div style={{ marginBottom: '24px', position: 'relative' }}>
                    <div style={{ position: 'absolute', top: '-12px', left: 0, right: 0, textAlign: 'center', zIndex: 1 }}>
                        <span style={{ background: 'var(--bg-primary)', padding: '0 8px', fontSize: '12px', color: 'var(--text-tertiary)' }}>PAIR DEVICE</span>
                    </div>
                    <div style={{ borderTop: '1px solid var(--border-color)', margin: '0 0 20px 0' }} />

                    <form onSubmit={handleConnect} style={{ display: 'flex', gap: '8px' }}>
                        <input
                            type="text"
                            value={remoteId}
                            onChange={(e) => setRemoteId(e.target.value)}
                            placeholder="Enter a peer's Device ID..."
                            className="search-input"
                            style={{ flex: 1, padding: '10px 14px', height: 'auto', background: 'var(--bg-secondary)' }}
                        />
                        <button type="submit" className="primary-btn" disabled={!remoteId.trim()} style={{ height: 'auto', padding: '0 16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Link size={16} /> Connect
                        </button>
                    </form>
                    {status && <div style={{ marginTop: '8px', fontSize: '13px', color: status.includes('failed') ? 'var(--danger-color)' : 'var(--success-color)' }}>{status}</div>}
                </div>

                <div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        <ShieldCheck size={14} /> Trusted Chain
                    </label>
                    {trustedDevices.length === 0 ? (
                        <div style={{ padding: '16px', background: 'var(--bg-secondary)', borderRadius: '6px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '14px' }}>
                            No active peers paired.
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {trustedDevices.map(id => (
                                <div key={id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--bg-secondary)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
                                        <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'var(--bg-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                            <Smartphone size={14} className="icon-color" />
                                        </div>
                                        <code style={{ fontSize: '12px', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {id.substring(0, 16)}...
                                        </code>
                                    </div>
                                    <button className="icon-button" onClick={() => handleRemoveDevice(id)} title="Revoke Access" style={{ color: 'var(--danger-color)' }}>
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
