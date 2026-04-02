import React, { useState, useEffect } from 'react';
import { X, Copy, Check, Link, Trash2, Smartphone, ShieldCheck, Activity, QrCode, Camera, Github, Cloud, RefreshCw, AlertTriangle, Database, ArrowRight } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import * as syncEngine from '../lib/sync_engine';
import { useNotes } from '../context/NotesContext';

export default function SyncModal({ onClose }) {
    const { storageMode, isSyncing, switchWorkspaceToGithub, sync } = useNotes();
    const [activeTab, setActiveTab] = useState(storageMode === 'github' ? 'cloud' : 'p2p');
    const [copied, setCopied] = useState(false);
    const [remoteId, setRemoteId] = useState('');
    const [status, setStatus] = useState('');
    const [trustedDevices, setTrustedDevices] = useState([]);
    const [showQr, setShowQr] = useState(false);
    const [showScanner, setShowScanner] = useState(false);
    const myId = syncEngine.getMyId();

    // GitHub Form State
    const [ghToken, setGhToken] = useState('');
    const [ghOwner, setGhOwner] = useState('');
    const [ghRepo, setGhRepo] = useState('');
    const [shouldMigrate, setShouldMigrate] = useState(true);
    const [ghStatus, setGhStatus] = useState('');

    useEffect(() => {
        refreshTrustedDevices();
        const onPeersUpdate = () => refreshTrustedDevices();
        window.addEventListener('syncPeersUpdated', onPeersUpdate);
        return () => window.removeEventListener('syncPeersUpdated', onPeersUpdate);
    }, []);

    const scannerRef = React.useRef(null);

    useEffect(() => {
        if (!showScanner || activeTab !== 'p2p') return;

        scannerRef.current = new Html5QrcodeScanner(
            "sync-qr-reader",
            { fps: 10, qrbox: { width: 250, height: 250 } },
            false
        );

        let isScanning = true;
        scannerRef.current.render(
            (decodedText) => {
                if (!isScanning) return;
                isScanning = false;
                setRemoteId(decodedText);
                setStatus('Scanned QR code. Ready to connect.');
                setShowScanner(false);
            },
            () => {}
        );

        return () => {
            isScanning = false;
            try {
                if (document.getElementById("sync-qr-reader")?.innerHTML !== "") {
                    scannerRef.current?.clear().catch(() => { });
                }
            } catch (e) { }
        };
    }, [showScanner, activeTab]);

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

    const handleConnect = async (e, directId = null) => {
        if (e) e.preventDefault();
        const targetId = directId || remoteId.trim();
        if (!targetId) return;

        setStatus('Connecting...');
        try {
            await syncEngine.connectToPeer(targetId);
            if (!directId) setRemoteId('');
            refreshTrustedDevices();
        } catch (err) {
            setStatus(err.message || 'Connection failed. Is the other device online?');
        }
    };

    const handleGithubConnect = async (e) => {
        e.preventDefault();
        setGhStatus('Initializing...');
        try {
            await switchWorkspaceToGithub({
                token: ghToken,
                owner: ghOwner,
                repo: ghRepo
            }, shouldMigrate);
            setGhStatus('Connected Successfully!');
        } catch (err) {
            setGhStatus('Failed: ' + err.message);
        }
    };

    const handleRemoveDevice = (id) => {
        syncEngine.removeTrustedDevice(id);
        refreshTrustedDevices();
    };

    return (
        <div className="modal-overlay" onClick={onClose} style={{ zIndex: 9999 }}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px', padding: 0, overflow: 'hidden' }}>
                {/* Header & Tabs */}
                <div style={{ padding: '24px 24px 0', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <h2 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '18px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {activeTab === 'p2p' ? <Activity size={18} className="icon-color" /> : <Cloud size={18} style={{ color: 'var(--accent-color)' }} />}
                            Sync Center
                        </h2>
                        <button className="icon-button" onClick={onClose} aria-label="Close Sync Modal">
                            <X size={20} />
                        </button>
                    </div>

                    <div style={{ display: 'flex', gap: '24px' }}>
                        <button 
                            onClick={() => setActiveTab('p2p')}
                            style={{ 
                                padding: '0 4px 12px', background: 'none', border: 'none', borderBottom: `2px solid ${activeTab === 'p2p' ? 'var(--accent-color)' : 'transparent'}`,
                                color: activeTab === 'p2p' ? 'var(--text-primary)' : 'var(--text-tertiary)', fontWeight: '700', fontSize: '13px', cursor: 'pointer', transition: 'all 0.2s'
                            }}
                        >
                            Peer-to-Peer
                        </button>
                        <button 
                            onClick={() => setActiveTab('cloud')}
                            style={{ 
                                padding: '0 4px 12px', background: 'none', border: 'none', borderBottom: `2px solid ${activeTab === 'cloud' ? 'var(--accent-color)' : 'transparent'}`,
                                color: activeTab === 'cloud' ? 'var(--text-primary)' : 'var(--text-tertiary)', fontWeight: '700', fontSize: '13px', cursor: 'pointer', transition: 'all 0.2s'
                            }}
                        >
                            Cloud Sync (GitHub)
                        </button>
                    </div>
                </div>

                <div style={{ padding: '24px', maxHeight: '70vh', overflowY: 'auto' }}>
                    {activeTab === 'p2p' ? (
                        /* P2P UI */
                        <>
                            <div style={{ marginBottom: '24px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                    <label style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        Your Device ID
                                    </label>
                                    <button className="icon-button" onClick={() => setShowQr(!showQr)} style={{ fontSize: '11px', padding: '2px 6px', display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--bg-tertiary)' }}>
                                        <QrCode size={12} /> {showQr ? "Hide" : "Show"} QR
                                    </button>
                                </div>

                                {showQr && myId && (
                                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px', padding: '16px', background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                                        <div style={{ background: '#ffffff', padding: '12px', borderRadius: '8px' }}>
                                            <QRCodeCanvas value={myId} size={140} />
                                        </div>
                                    </div>
                                )}

                                <div style={{ display: 'flex', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-color)', padding: '10px 14px', alignItems: 'center', gap: '12px' }}>
                                    <code style={{ flex: 1, fontFamily: 'monospace', fontSize: '14px', color: 'var(--text-primary)', wordBreak: 'break-all' }}>
                                        {myId || 'Initializing...'}
                                    </code>
                                    <button className={`icon-button ${copied ? 'success' : ''}`} onClick={handleCopy} disabled={!myId} style={{ padding: '6px', background: copied ? 'var(--success-color)' : 'var(--bg-tertiary)', color: copied ? 'white' : 'var(--text-secondary)' }}>
                                        {copied ? <Check size={14} /> : <Copy size={14} />}
                                    </button>
                                </div>
                            </div>

                            <div style={{ marginBottom: '24px' }}>
                                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
                                    <button className="icon-button" onClick={() => setShowScanner(!showScanner)} style={{ fontSize: '11px', padding: '2px 6px', display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--bg-tertiary)' }}>
                                        <Camera size={12} /> {showScanner ? "Close Scanner" : "Scan QR"}
                                    </button>
                                </div>

                                {showScanner && (
                                    <div id="sync-qr-reader" style={{ width: '100%', marginBottom: '16px', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border-color)', background: '#fff' }}></div>
                                )}

                                <form onSubmit={handleConnect} style={{ display: 'flex', gap: '8px' }}>
                                    <input value={remoteId} onChange={(e) => setRemoteId(e.target.value)} placeholder="Enter Device ID..." className="search-input" style={{ flex: 1, padding: '10px 14px', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
                                    <button type="submit" className="primary-btn" disabled={!remoteId.trim()} style={{ padding: '0 16px', fontSize: '13px' }}>
                                        Connect
                                    </button>
                                </form>
                                {status && <div style={{ marginTop: '8px', fontSize: '12px', color: status.includes('failed') ? 'var(--danger-color)' : 'var(--success-color)' }}>{status}</div>}
                            </div>

                            <div>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '12px', fontWeight: '700', textTransform: 'uppercase' }}>
                                    <ShieldCheck size={14} /> Trusted Devices
                                </label>
                                {trustedDevices.length === 0 ? (
                                    <div style={{ padding: '16px', background: 'var(--bg-secondary)', borderRadius: '8px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '13px', border: '1px dashed var(--border-color)' }}>
                                        No active peers paired.
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {trustedDevices.map(id => (
                                            <div key={id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <Smartphone size={14} className="icon-color" />
                                                    <code style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{id.substring(0, 12)}...</code>
                                                </div>
                                                <div style={{ display: 'flex', gap: '4px' }}>
                                                    <button className="icon-button" onClick={() => handleConnect(null, id)} style={{ color: 'var(--accent-color)' }}><Activity size={14} /></button>
                                                    <button className="icon-button" onClick={() => handleRemoveDevice(id)} style={{ color: 'var(--danger-color)' }}><Trash2 size={14} /></button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        /* Cloud Sync (GitHub) UI */
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            {storageMode === 'github' ? (
                                <div style={{ background: 'var(--bg-secondary)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                                    <div style={{ width: '48px', height: '48px', background: 'var(--bg-primary)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', border: '1px solid var(--border-color)' }}>
                                        <Cloud size={24} style={{ color: 'var(--success-color)' }} />
                                    </div>
                                    <h3 style={{ margin: '0 0 4px 0', fontSize: '16px' }}>Connected to GitHub</h3>
                                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 20px 0' }}>Your notes are syncing and version-controlled instantly.</p>
                                    <button 
                                        onClick={() => { setGhStatus('Syncing...'); sync().then(() => setGhStatus('Sync Complete!')) }} 
                                        disabled={isSyncing} 
                                        className="primary-btn" 
                                        style={{ width: '100%', justifyContent: 'center', background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
                                    >
                                        <RefreshCw size={16} className={isSyncing ? 'spin' : ''} />
                                        Force Cloud Pull
                                    </button>
                                    {ghStatus && <p style={{ fontSize: '12px', color: 'var(--accent-color)', marginTop: '8px' }}>{ghStatus}</p>}
                                </div>
                            ) : (
                                <>
                                    <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                                        <AlertTriangle size={20} style={{ color: 'var(--color-future)', flexShrink: 0 }} />
                                        <div>
                                            <p style={{ margin: 0, fontSize: '13px', fontWeight: 'bold' }}>Moving to Cloud Sync?</p>
                                            <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                                                Switching to GitHub allows you to sync across all devices instantly with version history. 
                                            </p>
                                        </div>
                                    </div>

                                    <form onSubmit={handleGithubConnect} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', marginBottom: '6px', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Token</label>
                                            <input type="password" value={ghToken} onChange={e => setGhToken(e.target.value)} placeholder="ghp_xxxxxxxxxxxx" className="search-input" style={{ width: '100%', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }} required />
                                        </div>
                                        <div style={{ display: 'flex', gap: '12px' }}>
                                            <div style={{ flex: 1 }}>
                                                <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', marginBottom: '6px', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Owner</label>
                                                <input type="text" value={ghOwner} onChange={e => setGhOwner(e.target.value)} placeholder="username" className="search-input" style={{ width: '100%', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }} required />
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', marginBottom: '6px', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Repo</label>
                                                <input type="text" value={ghRepo} onChange={e => setGhRepo(e.target.value)} placeholder="my-notes" className="search-input" style={{ width: '100%', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }} required />
                                            </div>
                                        </div>

                                        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', padding: '12px', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontSize: '13px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <Database size={14} /> Transfer current notes
                                                </div>
                                                <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Upload your local files to GitHub now.</div>
                                            </div>
                                            <input type="checkbox" checked={shouldMigrate} onChange={e => setShouldMigrate(e.target.checked)} style={{ width: '18px', height: '18px', accentColor: 'var(--accent-color)' }} />
                                        </label>

                                        <button type="submit" disabled={isSyncing} className="primary-btn" style={{ width: '100%', justifyContent: 'center', padding: '12px' }}>
                                            {isSyncing ? <RefreshCw className="spin" size={18} /> : <Github size={18} />}
                                            {isSyncing ? 'Migrating to GitHub...' : 'Connect & Sync Cloud'}
                                        </button>
                                    </form>
                                    {ghStatus && <p style={{ textAlign: 'center', fontSize: '13px', color: 'var(--accent-color)' }}>{ghStatus}</p>}
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
