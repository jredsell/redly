import React, { useState } from 'react';
import { useNotes } from '../context/NotesContext';
import { FileText, FolderPlus, ListTodo, Clock, ChevronDown, ChevronRight, HardDrive, ShieldCheck, Box, Unlock, ArrowRight, Monitor, Share, PlusSquare, MoreVertical, X } from 'lucide-react';
import RedlyLogo from './RedlyLogo';

const InstallGuideModal = ({ isOpen, onClose, isDarkMode }) => {
    if (!isOpen) return null;

    const browser = (() => {
        const ua = navigator.userAgent.toLowerCase();
        if (ua.includes('chrome')) return 'chrome';
        if (ua.includes('safari') && !ua.includes('chrome')) return 'safari';
        if (ua.includes('edge')) return 'edge';
        return 'chrome';
    })();

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '440px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <h2 style={{ fontSize: '20px', fontWeight: '800', margin: 0 }}>Install Redly</h2>
                    <button onClick={onClose} className="icon-button" style={{ padding: '8px' }}>
                        <X size={20} />
                    </button>
                </div>

                <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                    <div style={{
                        width: '80px',
                        height: '80px',
                        background: 'var(--bg-secondary)',
                        borderRadius: '20px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 16px',
                        border: '1px solid var(--border-color)'
                    }}>
                        <Monitor size={40} style={{ color: 'var(--accent-color)' }} />
                    </div>
                    <p style={{ fontSize: '15px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                        Install Redly as a standalone app for an offline-first, distraction-free experience.
                    </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {browser === 'safari' ? (
                        <>
                            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                                <div style={{ background: 'var(--bg-secondary)', padding: '8px', borderRadius: '8px', fontWeight: 'bold', fontSize: '14px', minWidth: '32px', textAlign: 'center' }}>1</div>
                                <p style={{ margin: 0, fontSize: '14px' }}>Tap the <strong>Share</strong> button <Share size={16} style={{ verticalAlign: 'middle' }} /> in the toolbar.</p>
                            </div>
                            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                                <div style={{ background: 'var(--bg-secondary)', padding: '8px', borderRadius: '8px', fontWeight: 'bold', fontSize: '14px', minWidth: '32px', textAlign: 'center' }}>2</div>
                                <p style={{ margin: 0, fontSize: '14px' }}>Scroll down and select <strong>'Add to Home Screen'</strong> <PlusSquare size={16} style={{ verticalAlign: 'middle' }} />.</p>
                            </div>
                        </>
                    ) : (
                        <>
                            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                                <div style={{ background: 'var(--bg-secondary)', padding: '8px', borderRadius: '8px', fontWeight: 'bold', fontSize: '14px', minWidth: '32px', textAlign: 'center' }}>1</div>
                                <p style={{ margin: 0, fontSize: '14px' }}>Click the <strong>Menu</strong> icon <MoreVertical size={16} style={{ verticalAlign: 'middle' }} /> in the top-right corner.</p>
                            </div>
                            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                                <div style={{ background: 'var(--bg-secondary)', padding: '8px', borderRadius: '8px', fontWeight: 'bold', fontSize: '14px', minWidth: '32px', textAlign: 'center' }}>2</div>
                                <p style={{ margin: 0, fontSize: '14px' }}>Select <strong>'Install Redly'</strong> or <strong>'App &gt; Install this site'</strong>.</p>
                            </div>
                        </>
                    )}
                </div>

                <button onClick={onClose} className="primary-action-btn" style={{ width: '100%', marginTop: '32px', padding: '12px', fontSize: '16px', justifyContent: 'center' }}>
                    Got it
                </button>
            </div>
        </div>
    );
};

const renderLogo = (isDarkMode, size = 80) => (
    <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'center' }}>
        <RedlyLogo size={size} showText={true} isDarkMode={isDarkMode} style={{ maxWidth: '320px' }} />
    </div>
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
    const { addNode, nodes, setActiveFileId, workspaceHandle, selectWorkspace, needsPermission, grantLocalPermission, installApp, isInstallable, isDarkMode, showInstallModal, setShowInstallModal } = useNotes();
    const recentFiles = nodes
        .filter(n => n.type === 'file')
        .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
        .slice(0, 4);


    if (needsPermission) {
        return (
            <div className="welcome-container">
                <style>{SHARED_STYLES}</style>
                {renderLogo(isDarkMode)}
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
                {renderLogo(isDarkMode)}

                {isInstallable && (
                    <button
                        onClick={installApp}
                        style={{
                            marginBottom: '40px',
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
                            cursor: 'pointer',
                            width: '100%',
                            maxWidth: '320px',
                            boxShadow: 'var(--shadow-sm)',
                            transition: 'all 0.2s ease',
                        }}
                        onMouseOver={(e) => { e.currentTarget.style.borderColor = 'var(--accent-color)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                        onMouseOut={(e) => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                        aria-label="Install Redly as a Desktop App"
                    >
                        <ShieldCheck size={20} />
                        <span>Install Redly Desktop App</span>
                    </button>
                )}

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
                </div>
                <InstallGuideModal isOpen={showInstallModal} onClose={() => setShowInstallModal(false)} isDarkMode={isDarkMode} />
            </div>
        );
    }

    return (
        <div className="welcome-container">
            <style>{SHARED_STYLES}</style>
            {renderLogo(isDarkMode, 60)}

            {isInstallable && (
                <button
                    onClick={installApp}
                    style={{
                        marginBottom: '40px',
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
                        cursor: 'pointer',
                        width: '100%',
                        maxWidth: '320px',
                        boxShadow: 'var(--shadow-sm)',
                        transition: 'all 0.2s ease',
                    }}
                    onMouseOver={(e) => { e.currentTarget.style.borderColor = 'var(--accent-color)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                    onMouseOut={(e) => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                    aria-label="Install Redly as a Desktop App"
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
        </div>
    );
}