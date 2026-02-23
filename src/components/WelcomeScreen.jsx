import React, { useState } from 'react';
import { useNotes } from '../context/NotesContext';
import { FileText, FolderPlus, ListTodo, Clock, ChevronDown, ChevronRight, HardDrive, ShieldCheck, Box, Unlock, Monitor } from 'lucide-react';
import logo from '../assets/logo.png';

export default function WelcomeScreen({ openHelp }) {
    const { addNode, nodes, setActiveFileId, workspaceHandle, selectWorkspace, needsPermission, grantLocalPermission, installApp, isInstallable } = useNotes();
    const [showRecent, setShowRecent] = useState(true);
    const [gdriveStep, setGDriveStep] = useState('idle'); // idle, config, loading
    const [clientId, setClientId] = useState('747035091008-jcps855ub365ck2893203ucgce1hcn4h.apps.googleusercontent.com');

    const recentFiles = nodes
        .filter(n => n.type === 'file')
        .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
        .slice(0, 4);

    const getPath = (node) => {
        let path = [];
        let current = node;
        while (current && current.parentId) {
            const parent = nodes.find(n => n.id === current.parentId);
            if (parent) {
                path.unshift(parent.name);
                current = parent;
            } else {
                break;
            }
        }
        return path.length > 0 ? path.join(' > ') + ' > ' : '';
    };

    // --- RECONNECT SCREEN ---
    // Shown when the user returns to the app and the browser needs them to re-approve the local folder
    if (needsPermission) {
        return (
            <div className="welcome-container">
                <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'center' }}>
                    <img src={logo} alt="Redly Logo" style={{ width: '80px', height: '80px', borderRadius: '20px', boxShadow: 'var(--shadow-md)' }} />
                </div>
                <h1 style={{ fontSize: '32px', marginBottom: '16px', fontWeight: '800' }}>Reconnect Workspace</h1>
                <p style={{ fontSize: '18px', color: 'var(--text-secondary)', maxWidth: '550px', marginBottom: '40px', lineHeight: '1.5' }}>
                    For your security, your browser requires you to verify access to your local folder each session.
                </p>
                <button onClick={grantLocalPermission} className="primary-action-btn">
                    <Unlock size={24} />
                    Grant Access
                </button>
                <style>{`
                    .welcome-container { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100%; padding: 40px 20px; text-align: center; color: var(--text-primary); background-color: var(--bg-primary); overflow-y: auto; }
                    .primary-action-btn { background: var(--accent-color); color: white; border: none; padding: 16px 32px; border-radius: 12px; font-size: 18px; font-weight: bold; cursor: pointer; box-shadow: 0 4px 14px 0 rgba(0, 112, 243, 0.39); transition: transform 0.2s, box-shadow 0.2s; display: flex; align-items: center; gap: 12px; }
                    .primary-action-btn:active { transform: scale(0.98); }
                    .primary-action-btn:hover { transform: translateY(-2px); }
                `}</style>
            </div>
        );
    }

    // --- NEW USER / NO WORKSPACE SCREEN ---
    if (!workspaceHandle) {
        return (
            <div className="welcome-container">
                <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'center' }}>
                    <img src={logo} alt="Redly Logo" style={{ width: '80px', height: '80px', borderRadius: '20px', boxShadow: 'var(--shadow-md)' }} />
                </div>

                <h1 style={{ fontSize: '32px', marginBottom: '16px', fontWeight: '800', letterSpacing: '-0.5px' }}>Welcome to Redly</h1>
                <p style={{ fontSize: '18px', color: 'var(--text-secondary)', maxWidth: '550px', marginBottom: '40px', lineHeight: '1.5' }}>
                    Your offline-first Markdown knowledge base.<br />
                    Choose how you want to store your data today:
                </p>

                <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', justifyContent: 'center', marginBottom: '48px', maxWidth: '800px' }}>
                    {/* Option 1: OPFS Sandbox */}
                    <button onClick={() => selectWorkspace('sandbox')} className="storage-option-btn">
                        <Box size={32} style={{ color: 'var(--color-future)', marginBottom: '16px' }} />
                        <h3 style={{ fontSize: '18px', marginBottom: '8px', fontWeight: '600', color: 'var(--text-primary)' }}>Private Browser Vault</h3>
                        <p style={{ fontSize: '14px', color: 'var(--text-tertiary)', lineHeight: '1.5', margin: 0 }}>
                            Instant setup, zero permissions. Files are hidden inside your browser's secure sandbox. Perfect for quick use or strict IT environments.
                        </p>
                    </button>

                    {/* Option 2: Local Folder */}
                    <button onClick={() => selectWorkspace('local')} className="storage-option-btn">
                        <HardDrive size={32} style={{ color: 'var(--accent-color)', marginBottom: '16px' }} />
                        <h3 style={{ fontSize: '18px', marginBottom: '8px', fontWeight: '600', color: 'var(--text-primary)' }}>Local Device Folder</h3>
                        <p style={{ fontSize: '14px', color: 'var(--text-tertiary)', lineHeight: '1.5', margin: 0 }}>
                            Pick a folder on your PC. Files are saved as visible <code>.md</code> documents. Great for backing up to Google Drive or Dropbox.
                        </p>
                    </button>

                    {/* Option 3: Google Drive */}
                    <button onClick={() => setGDriveStep('config')} className="storage-option-btn">
                        <Monitor size={32} style={{ color: 'var(--color-today)', marginBottom: '16px' }} />
                        <h3 style={{ fontSize: '18px', marginBottom: '8px', fontWeight: '600', color: 'var(--text-primary)' }}>Cloud Sync (Google Drive)</h3>
                        <p style={{ fontSize: '14px', color: 'var(--text-tertiary)', lineHeight: '1.5', margin: 0 }}>
                            Sync your notes across devices using your own Google Drive. Private, secure, and always available.
                        </p>
                    </button>

                    {/* Option 4: Install App (Conditional) */}
                    {isInstallable && (
                        <button onClick={installApp} className="storage-option-btn" style={{ borderStyle: 'dashed' }}>
                            <ShieldCheck size={32} style={{ color: 'var(--color-future)', marginBottom: '16px' }} />
                            <h3 style={{ fontSize: '18px', marginBottom: '8px', fontWeight: '600', color: 'var(--text-primary)' }}>Install as App</h3>
                            <p style={{ fontSize: '14px', color: 'var(--text-tertiary)', lineHeight: '1.5', margin: 0 }}>
                                Add Redly to your desktop or mobile home screen for a fast, native-like experience and easy access.
                            </p>
                        </button>
                    )}
                </div>

                {gdriveStep === 'config' && (
                    <div className="modal-overlay">
                        <div className="modal-content">
                            <h3>Google Drive Setup</h3>
                            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
                                To use Google Drive, you need a Client ID from the Google Cloud Console.
                            </p>
                            <input
                                type="text"
                                placeholder="Enter Google Client ID"
                                value={clientId}
                                onChange={(e) => setClientId(e.target.value)}
                                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '16px', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                            />
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <button onClick={() => setGDriveStep('idle')} className="secondary-action-btn">Cancel</button>
                                <button
                                    onClick={async () => {
                                        if (!clientId) return;
                                        setGDriveStep('loading');
                                        try {
                                            await selectWorkspace('gdrive', { clientId });
                                            setGDriveStep('idle');
                                        } catch (e) {
                                            console.error(e);
                                            setGDriveStep('config');
                                            alert('Google Drive connection failed. Please check your Client ID and network.');
                                        }
                                    }}
                                    className="primary-action-btn"
                                    disabled={!clientId || gdriveStep === 'loading'}
                                >
                                    {gdriveStep === 'loading' ? 'Initialising...' : 'Continue'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <style>{`
                    .welcome-container { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100%; padding: 40px 20px; text-align: center; color: var(--text-primary); background-color: var(--bg-primary); overflow-y: auto; }
                    .storage-option-btn { background: var(--bg-secondary); border: 1px solid var(--border-color); padding: 24px; border-radius: 16px; cursor: pointer; text-align: left; max-width: 320px; transition: all 0.2s ease; display: flex; flex-direction: column; align-items: flex-start; }
                    .storage-option-btn:hover { border-color: var(--accent-color); transform: translateY(-4px); box-shadow: var(--shadow-md); }
                `}</style>
            </div>
        );
    }

    // --- EXISTING USER DASHBOARD ---
    return (
        <div className="welcome-container">
            <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'center' }}>
                <img src={logo} alt="Redly Logo" style={{ width: '80px', height: '80px', borderRadius: '20px', boxShadow: 'var(--shadow-md)' }} />
            </div>

            <h1 style={{ fontSize: '32px', marginBottom: '16px', fontWeight: '800', letterSpacing: '-0.5px' }}>Welcome back to Redly</h1>
            <p style={{ fontSize: '18px', color: 'var(--text-secondary)', maxWidth: '550px', marginBottom: '40px', lineHeight: '1.5' }}>
                Your offline-first Markdown knowledge base.<br />
                Notes and tasks, <em style={{ color: 'var(--accent-color)', fontWeight: '600', fontStyle: 'normal' }}>redly</em> available.
            </p>

            <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '12px', width: '100%', maxWidth: '600px', marginBottom: '32px'
            }}>
                <button onClick={() => addNode('Untitled Note', 'file')} className="welcome-card">
                    <FileText size={24} style={{ color: 'var(--accent-color)' }} />
                    <div className="title">Create Note</div>
                    <div className="desc">Start writing instantly</div>
                </button>

                <button onClick={() => addNode('New Folder', 'folder')} className="welcome-card">
                    <FolderPlus size={24} style={{ color: 'var(--color-future)' }} />
                    <div className="title">Create Folder</div>
                    <div className="desc">Organise your thoughts</div>
                </button>

                <button onClick={openHelp} className="welcome-card">
                    <ListTodo size={24} style={{ color: 'var(--color-today)' }} />
                    <div className="title">View Cheatsheet</div>
                    <div className="desc">Learn Slash & Hotkeys</div>
                </button>
            </div>

            <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '16px', marginBottom: '24px' }}>
                <span><strong>Alt+N</strong> New Note</span>
                <span><strong>Alt+F</strong> New Folder</span>
                <span><strong>Alt+H</strong> Home</span>
                <span><strong>Alt+W</strong> Workspace</span>
                <span><strong>Alt+/</strong> Help</span>
            </div>

            {recentFiles.length > 0 && (
                <div style={{ width: '100%', maxWidth: '600px', textAlign: 'left', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                    <button
                        onClick={() => setShowRecent(!showRecent)}
                        style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '8px 0', fontSize: '13px', fontWeight: '600' }}
                    >
                        <Clock size={16} /> Recent Files {showRecent ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </button>

                    {showRecent && (
                        <div style={{
                            display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                            gap: '12px', padding: '12px 0', width: '100%'
                        }}>
                            {recentFiles.map(file => {
                                const folderPath = getPath(file);
                                return (
                                    <button
                                        key={file.id}
                                        onClick={() => setActiveFileId(file.id)}
                                        className="recent-file-chip"
                                        title={`Last edited: ${file.updatedAt ? new Date(file.updatedAt).toLocaleString() : 'Recently'}`}
                                    >
                                        <FileText size={16} style={{ color: 'var(--accent-color)', flexShrink: 0, marginTop: '2px' }} />
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', overflow: 'hidden', width: '100%' }}>
                                            <span className="title">{file.name}</span>
                                            <span className="path">
                                                {folderPath ? folderPath.slice(0, -3) : 'Workspace'}
                                            </span>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            <style>{`
                .welcome-container { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100%; padding: 40px 20px; text-align: center; color: var(--text-primary); background-color: var(--bg-primary); overflow-y: auto; }
                .welcome-card { display: flex; flex-direction: column; align-items: center; justify-content: center; background: var(--bg-secondary); border: 1px solid var(--border-color); padding: 16px; border-radius: 12px; cursor: pointer; transition: all 0.2s ease; box-shadow: var(--shadow-sm); gap: 6px; }
                .welcome-card:hover { border-color: var(--accent-color); transform: translateY(-2px); box-shadow: var(--shadow-md); }
                .welcome-card .title { font-weight: 600; font-size: 15px; color: var(--text-primary); margin-top: 8px; }
                .welcome-card .desc { font-size: 13px; color: var(--text-tertiary); }
                .recent-file-chip { display: flex; align-items: flex-start; gap: 12px; background: var(--bg-secondary); border: 1px solid var(--border-color); padding: 12px 16px; border-radius: 8px; cursor: pointer; transition: all 0.2s ease; text-align: left; width: 100%; height: 100%; }
                .recent-file-chip:hover { border-color: var(--accent-color); background: var(--bg-hover); transform: translateY(-2px); box-shadow: var(--shadow-sm); }
                .recent-file-chip .title { font-size: 14px; color: var(--text-primary); font-weight: 600; margin-bottom: 2px; width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
                .recent-file-chip .path { color: var(--text-tertiary); font-size: 11px; width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

                .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 1000; }
                .modal-content { background: var(--bg-primary); padding: 32px; border-radius: 20px; border: 1px solid var(--border-color); box-shadow: var(--shadow-lg); max-width: 400px; width: 90%; text-align: left; }
                .modal-content h3 { font-size: 20px; font-weight: 800; margin-bottom: 12px; color: var(--text-primary); }
                .secondary-action-btn { background: transparent; border: 1px solid var(--border-color); padding: 12px 24px; border-radius: 12px; font-weight: 600; cursor: pointer; color: var(--text-secondary); transition: all 0.2s; }
                .secondary-action-btn:hover { background: var(--bg-secondary); border-color: var(--text-tertiary); }
            `}</style>
        </div>
    );
}