import React, { useState } from 'react';
import { useNotes } from '../context/NotesContext';
import { FileText, FolderPlus, ListTodo, Clock, ChevronDown, ChevronRight, HardDrive, ShieldCheck, Box, Unlock, Monitor, CloudUpload, ArrowRight } from 'lucide-react';
import logo from '../assets/logo.png';

const SHARED_STYLES = `
    .welcome-container { 
        display: flex; 
        flex-direction: column; 
        align-items: center; 
        justify-content: center; 
        height: 100%; 
        width: 100%;
        padding: 40px 20px; 
        text-align: center; 
        color: var(--text-primary); 
        background-color: var(--bg-primary); 
        overflow-y: auto; 
    }
    
    .primary-action-btn { background: var(--accent-color); color: white; border: none; padding: 16px 32px; border-radius: 12px; font-size: 18px; font-weight: bold; cursor: pointer; box-shadow: 0 4px 14px 0 rgba(0, 112, 243, 0.39); transition: transform 0.2s, box-shadow 0.2s; display: flex; align-items: center; gap: 12px; }
    .primary-action-btn:hover { transform: translateY(-2px); }
    .primary-action-btn:active { transform: scale(0.98); }
    .primary-action-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    
    .secondary-action-btn { background: transparent; border: 1px solid var(--border-color); padding: 12px 24px; border-radius: 12px; font-weight: 600; cursor: pointer; color: var(--text-secondary); transition: all 0.2s; }
    .secondary-action-btn:hover { background: var(--bg-secondary); border-color: var(--text-tertiary); }

    .welcome-card { display: flex; flex-direction: column; align-items: center; justify-content: center; background: var(--bg-secondary); border: 1px solid var(--border-color); padding: 16px; border-radius: 12px; cursor: pointer; transition: all 0.2s ease; gap: 8px; width: 100%; border-bottom-width: 4px; color: var(--text-primary); }
    .welcome-card:hover { border-color: var(--accent-color); transform: translateY(-2px); }
    .welcome-card:active { transform: translateY(0); border-bottom-width: 1px; margin-top: 3px; }

    .storage-option-btn { background: var(--bg-secondary); border: 1px solid var(--border-color); padding: 16px; border-radius: 16px; cursor: pointer; text-align: left; max-width: 240px; transition: all 0.2s ease; display: flex; flex-direction: column; align-items: flex-start; height: 100%; border-bottom-width: 4px; color: var(--text-primary); }
    .storage-option-btn:hover { border-color: var(--accent-color); transform: translateY(-4px); }
    .storage-option-btn:active { transform: translateY(0); border-bottom-width: 1px; margin-top: 3px; }

    .modal-overlay { 
        position: fixed; 
        top: 0; 
        left: 0; 
        width: 100%; 
        height: 100%; 
        background: rgba(0,0,0,0.85); 
        backdrop-filter: blur(12px); 
        display: flex; 
        align-items: center; 
        justify-content: center; 
        z-index: 100000; 
        padding: 20px;
    }
    
    .modal-content { 
        background: var(--bg-primary); 
        padding: 40px; 
        border-radius: 32px; 
        border: 1px solid var(--border-color); 
        box-shadow: 0 30px 60px rgba(0,0,0,0.5); 
        max-width: 500px; 
        width: 100%; 
        text-align: left; 
        animation: modal-in 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    }

    @keyframes modal-in {
        from { opacity: 0; transform: scale(0.9) translateY(20px); }
        to { opacity: 1; transform: scale(1) translateY(0); }
    }

    .recent-file-chip { display: flex; align-items: flex-start; gap: 12px; background: var(--bg-secondary); border: 1px solid var(--border-color); padding: 12px 16px; border-radius: 8px; cursor: pointer; transition: all 0.2s ease; text-align: left; width: 100%; }
    .recent-file-chip:hover { border-color: var(--accent-color); background: var(--bg-hover); }

    .badge-cloud { background: rgba(37, 99, 235, 0.1); color: var(--accent-color); padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 700; text-transform: uppercase; margin-bottom: 8px; }
`;

export default function WelcomeScreen({ openHelp }) {
    const { addNode, nodes, setActiveFileId, workspaceHandle, selectWorkspace, needsPermission, grantLocalPermission, installApp, isInstallable } = useNotes();
    const [showRecent, setShowRecent] = useState(true);
    const [status, setStatus] = useState('idle'); // idle, checking, migrating, loading
    const [showBackupModal, setShowBackupModal] = useState(false);

    const CLIENT_ID = import.meta.env.VITE_GDRIVE_CLIENT_ID;

    const recentFiles = nodes
        .filter(n => n.type === 'file')
        .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
        .slice(0, 4);

    const handleGDriveClick = async () => {
        console.log('[GDrive] Cloud Sync button clicked');
        // If they already have nodes and are switching TO GDrive
        if (nodes.length > 0 && workspaceHandle) {
            setShowBackupModal(true);
        } else {
            initGDrive(false);
        }
    };

    const initGDrive = async (shouldMigrate = false) => {
        setStatus('loading');
        setShowBackupModal(false);
        try {
            await selectWorkspace('gdrive', { migrate: shouldMigrate });
            setStatus('idle');
        } catch (e) {
            console.error('GDrive init failed:', e);
            setStatus('idle');
            alert('Cloud connection failed. Please try again.');
        }
    };

    const renderLogo = (size = 80) => (
        <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'center' }}>
            <img src={logo} alt="Redly Logo" style={{ width: `${size}px`, height: `${size}px`, borderRadius: '20px', boxShadow: 'var(--shadow-md)' }} />
        </div>
    );

    const renderBackupModal = () => {
        if (!showBackupModal) return null;
        return (
            <div className="modal-overlay">
                <div className="modal-content">
                    <div className="badge-cloud">Cloud Migration</div>
                    <h3 style={{ fontSize: '26px', fontWeight: '800', marginBottom: '12px', letterSpacing: '-0.5px' }}>Move your notes to Cloud?</h3>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '32px', lineHeight: '1.6', fontSize: '15px' }}>
                        We detected <strong>{nodes.length}</strong> items in your current storage. Would you like to back them up to Google Drive or start fresh?
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <button onClick={() => initGDrive(true)} className="primary-action-btn" style={{ width: '100%', justifyContent: 'center' }}>
                            <CloudUpload size={20} />
                            Backup & Switch to Cloud
                        </button>
                        <button onClick={() => initGDrive(false)} className="secondary-action-btn" style={{ width: '100%', borderStyle: 'dashed' }}>
                            Start Fresh in Cloud
                        </button>
                        <button onClick={() => setShowBackupModal(false)} className="secondary-action-btn" style={{ width: '100%', border: 'none' }}>
                            Go Back
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    if (status === 'loading') {
        return (
            <div className="welcome-container">
                <style>{SHARED_STYLES}</style>
                {renderLogo()}
                <h1 style={{ fontSize: '24px', fontWeight: '700' }}>Connecting to Cloud...</h1>
                <p style={{ color: 'var(--text-tertiary)' }}>Please complete the authentication in the popup window.</p>
            </div>
        );
    }

    if (needsPermission) {
        return (
            <div className="welcome-container">
                <style>{SHARED_STYLES}</style>
                {renderLogo()}
                <h1 style={{ fontSize: '32px', marginBottom: '16px', fontWeight: '800', letterSpacing: '-0.5px' }}>Reconnect Workspace</h1>
                <p style={{ fontSize: '18px', color: 'var(--text-secondary)', marginBottom: '40px', maxWidth: '500px' }}>
                    Browser security requires you to re-verify access to your local <code>redly</code> folder for this session.
                </p>
                <button onClick={grantLocalPermission} className="primary-action-btn" aria-label="Unlock Folder and grant storage permissions">
                    <Unlock size={24} aria-hidden="true" />
                    Unlock Folder
                </button>
            </div>
        );
    }

    if (!workspaceHandle) {
        return (
            <div className="welcome-container">
                <style>{SHARED_STYLES}</style>
                {renderLogo()}
                <h1 style={{ fontSize: '42px', marginBottom: '12px', fontWeight: '900', letterSpacing: '-1.5px' }}>Redly</h1>
                <p style={{ fontSize: '18px', color: 'var(--text-secondary)', marginBottom: '48px', maxWidth: '550px', lineHeight: '1.5' }}>
                    Your private, offline-first Markdown knowledge base.
                </p>

                <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', justifyContent: 'center', maxWidth: '1000px', width: '100%' }}>
                    <button onClick={() => selectWorkspace('sandbox')} className="storage-option-btn" aria-label="Select Browser Storage: Hidden browser sandbox">
                        <Box size={24} style={{ color: 'var(--color-future)', marginBottom: '12px' }} aria-hidden="true" />
                        <h3 style={{ fontWeight: '700', fontSize: '16px', marginBottom: '4px' }}>Browser Storage</h3>
                        <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', margin: 0, lineHeight: '1.4' }}>Store notes in a hidden, secure browser sandbox. Fast and zero-config.</p>
                    </button>

                    <button onClick={() => selectWorkspace('local')} className="storage-option-btn" aria-label="Select Local Storage: Visible markdown files on your computer">
                        <HardDrive size={24} style={{ color: 'var(--accent-color)', marginBottom: '12px' }} aria-hidden="true" />
                        <h3 style={{ fontWeight: '700', fontSize: '16px', marginBottom: '4px' }}>Local Storage</h3>
                        <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', margin: 0, lineHeight: '1.4' }}>Save notes as visible <code>.md</code> files on your computer. Your data, your control.</p>
                    </button>

                    <button onClick={handleGDriveClick} className="storage-option-btn" aria-label="Select Cloud Storage: Google Drive synchronization">
                        <Monitor size={24} style={{ color: 'var(--color-today)', marginBottom: '12px' }} aria-hidden="true" />
                        <h3 style={{ fontWeight: '700', fontSize: '16px', marginBottom: '4px' }}>Cloud Storage</h3>
                        <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', margin: 0, lineHeight: '1.4' }}>Connect your Google Drive to sync notes across devices seamlessly.</p>
                    </button>

                    {isInstallable ? (
                        <button onClick={installApp} className="storage-option-btn" style={{ borderStyle: 'dashed' }} aria-label="Install Redly as a Desktop App">
                            <ShieldCheck size={24} style={{ color: 'var(--color-tomorrow)', marginBottom: '12px' }} aria-hidden="true" />
                            <h3 style={{ fontWeight: '700', fontSize: '16px', marginBottom: '4px' }}>Install as App</h3>
                            <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', margin: 0, lineHeight: '1.4' }}>Add Redly to your desktop or mobile home screen for the best experience.</p>
                        </button>
                    ) : (
                        <div className="storage-option-btn" style={{ borderStyle: 'dashed', opacity: 0.8, cursor: 'default' }} role="status" aria-label="PWA status: Install via browser menu if needed">
                            <Monitor size={24} style={{ color: 'var(--text-tertiary)', marginBottom: '12px' }} aria-hidden="true" />
                            <h3 style={{ fontWeight: '700', fontSize: '16px', marginBottom: '4px' }}>PWA Ready</h3>
                            <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', margin: 0, lineHeight: '1.4' }}>
                                To install manually: Open browser menu (⋮) → "Install App" or "Save as shortcut".
                            </p>
                        </div>
                    )}
                </div>
                {renderBackupModal()}
            </div>
        );
    }

    return (
        <div className="welcome-container">
            <style>{SHARED_STYLES}</style>
            {renderLogo(60)}
            <h1 style={{ fontSize: '32px', marginBottom: '32px', fontWeight: '800', letterSpacing: '-0.5px' }}>What's next?</h1>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', width: '100%', maxWidth: '600px', marginBottom: '48px' }}>
                <button onClick={() => addNode('Untitled Note', 'file')} className="welcome-card" aria-label="Create a New Note">
                    <FileText size={24} style={{ color: 'var(--accent-color)' }} aria-hidden="true" />
                    <span style={{ fontWeight: '600' }}>New Note</span>
                </button>
                <button onClick={() => addNode('New Folder', 'folder')} className="welcome-card" aria-label="Create a New Folder">
                    <FolderPlus size={24} style={{ color: 'var(--color-future)' }} aria-hidden="true" />
                    <span style={{ fontWeight: '600' }}>New Folder</span>
                </button>
                <button onClick={openHelp} className="welcome-card" aria-label="Open Help and Shortcuts">
                    <ListTodo size={24} style={{ color: 'var(--color-today)' }} aria-hidden="true" />
                    <span style={{ fontWeight: '600' }}>Help</span>
                </button>
            </div>

            {recentFiles.length > 0 && (
                <div style={{ width: '100%', maxWidth: '600px', textAlign: 'left' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-tertiary)', fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', marginBottom: '16px', letterSpacing: '1px' }}>
                        <Clock size={14} /> Recent Notes
                    </div>
                    <div style={{ display: 'grid', gap: '12px' }}>
                        {recentFiles.map(file => (
                            <button key={file.id} onClick={() => setActiveFileId(file.id)} className="recent-file-chip">
                                <FileText size={16} style={{ color: 'var(--accent-color)', marginTop: '2px' }} />
                                <div style={{ overflow: 'hidden' }}>
                                    <div style={{ fontWeight: '600', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{file.name}</div>
                                    <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{new Date(file.updatedAt).toLocaleDateString()}</div>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            )}
            {renderBackupModal()}
        </div>
    );
}