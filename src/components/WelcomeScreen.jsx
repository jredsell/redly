import React, { useState } from 'react';
import { useNotes } from '../context/NotesContext';
import { FileText, FolderPlus, ListTodo, Clock, ChevronDown, ChevronRight, HardDrive, ShieldCheck, Box, Unlock, CloudUpload, ArrowRight } from 'lucide-react';
import logo from '../assets/logo.png';
import { getAccessToken } from '../lib/gdrive';

// Official Google "G" coloured logo (Google brand guidelines)
const GoogleGLogo = ({ size = 24 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
);

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

    const handleGDriveClick = () => {
        console.log('[GDrive] Cloud Sync button clicked');

        // PRE-TRIGGER Auth: Call this immediately in the click handler to stay within the user gesture window.
        // This ensures the browser doesn't block the Google OAuth popup.
        getAccessToken().catch(e => console.warn('[GDrive] Auth pre-trigger failed:', e));

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
            // Provide specific feedback for common errors
            if (e.message?.includes('redirect_uri_mismatch')) {
                alert('Connection Error: The request origin (localhost) is not authorized for this Client ID. Please check your Google Cloud Console settings.');
            } else if (e.message?.includes('Sign-in cancelled')) {
                // No need for alert if user just closed the popup
            } else if (e.message?.includes('timed out')) {
                alert('Connection Timed Out: Please check if popups are blocked in your browser.');
            } else {
                alert('Cloud connection failed: ' + (e.message || 'Unknown error'));
            }
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
                    <div className="badge-cloud">Google Drive Migration</div>
                    <h3 style={{ fontSize: '26px', fontWeight: '800', marginBottom: '12px', letterSpacing: '-0.5px' }}>Move your notes to Google Drive?</h3>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '32px', lineHeight: '1.6', fontSize: '15px' }}>
                        We detected <strong>{nodes.length}</strong> items in your current storage. Would you like to back them up to Google Drive or start fresh?
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <button onClick={() => initGDrive(true)} className="primary-action-btn" style={{ width: '100%', justifyContent: 'center' }}>
                            <CloudUpload size={20} />
                            Backup & Switch to Google Drive
                        </button>
                        <button onClick={() => initGDrive(false)} className="secondary-action-btn" style={{ width: '100%', borderStyle: 'dashed' }}>
                            Start Fresh in Google Drive
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
                <h1 style={{ fontSize: '24px', fontWeight: '700' }}>Connecting to Google Drive...</h1>
                <p style={{ color: 'var(--text-tertiary)', marginBottom: '32px' }}>Please complete the authentication in the popup window.</p>
                <button onClick={() => setStatus('idle')} className="secondary-action-btn" style={{ border: 'none' }}>
                    Cancel & Go Back
                </button>
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
                    Browser security requires you re-verify access to your local <code>Redly</code> folder for this session.
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

                    <button onClick={handleGDriveClick} className="storage-option-btn" aria-label="Select Google Drive: Cloud synchronization">
                        <GoogleGLogo size={24} style={{ marginBottom: '12px' }} />
                        <h3 style={{ fontWeight: '700', fontSize: '16px', marginBottom: '4px' }}>Google Drive</h3>
                        <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', margin: 0, lineHeight: '1.4' }}>Connect your Google Drive to sync notes across devices seamlessly.</p>
                    </button>
                </div>
                {renderBackupModal()}
            </div>
        );
    }

    return (
        <div className="welcome-container">
            <style>{SHARED_STYLES}</style>
            {renderLogo(60)}

            {isInstallable && (
                <button
                    onClick={installApp}
                    className="pwa-install-banner"
                    style={{
                        fontSize: '14px',
                        padding: '12px 24px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '12px',
                        background: 'var(--bg-secondary)',
                        color: 'var(--accent-color)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '12px',
                        fontWeight: '600',
                        marginBottom: '40px',
                        cursor: 'pointer',
                        width: '100%',
                        maxWidth: '500px',
                        boxShadow: 'var(--shadow-sm)',
                        transition: 'all 0.2s ease'
                    }}
                    onMouseOver={(e) => {
                        e.currentTarget.style.borderColor = 'var(--accent-color)';
                        e.currentTarget.style.transform = 'translateY(-1px)';
                        e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                    }}
                    onMouseOut={(e) => {
                        e.currentTarget.style.borderColor = 'var(--border-color)';
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
                    }}
                >
                    <ShieldCheck size={20} />
                    <span>Install Redly Desktop App</span>
                </button>
            )}

            <h1 style={{ fontSize: '32px', marginBottom: '32px', fontWeight: '800', letterSpacing: '-0.5px', textAlign: 'center' }}>What's next?</h1>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', width: '100%', maxWidth: '600px', marginBottom: '48px' }}>
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
                    <span style={{ fontWeight: '600' }}>Redly Guide</span>

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