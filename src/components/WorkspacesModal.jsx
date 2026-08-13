import React, { useState, useEffect } from 'react';
import { X, HardDrive, Github, Box, Trash2, Plus, Unplug, Layers } from 'lucide-react';
import { useNotes } from '../context/NotesContext';
import { getWorkspaces } from '../lib/db';
import GitHubSetupModal from './GitHubSetupModal';

export default function WorkspacesModal({ onClose }) {
    const { 
        workspaceHandle, addWorkspaceInstance, disconnectWorkspaceById, 
        isDarkMode
    } = useNotes();
    
    const [workspaces, setWorkspaces] = useState([]);
    const [showGithubModal, setShowGithubModal] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const isFileSystemSupported = 'showDirectoryPicker' in window;
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    useEffect(() => {
        loadWorkspaces();
    }, []);

    const loadWorkspaces = async () => {
        setIsLoading(true);
        try {
            const list = await getWorkspaces();
            setWorkspaces(list);
        } catch (e) {
            console.error("Failed to load workspaces", e);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSandboxClick = async () => {
        try {
            await addWorkspaceInstance('sandbox');
            loadWorkspaces();
        } catch (e) {
            console.error(e);
            alert("Failed to create Sandbox workspace.");
        }
    };

    const handleLocalStorageClick = async () => {
        if (!isFileSystemSupported) {
            alert("Local storage is not supported in this browser. Please use Chrome, Edge, or a Chromium-based browser.");
            return;
        }
        try {
            await addWorkspaceInstance('local');
            loadWorkspaces();
        } catch (e) {
            console.error(e);
            if (e.name !== 'AbortError') {
                alert("Failed to connect local folder.");
            }
        }
    };

    const handleGithubConnect = async (config) => {
        try {
            await addWorkspaceInstance('github', { config });
            setShowGithubModal(false);
            loadWorkspaces();
        } catch (err) {
            alert("Failed to connect GitHub workspace: " + err.message);
        }
    };

    const handleDisconnect = async (id) => {
        if (confirm("Are you sure you want to disconnect this workspace? This will not delete your files on disk or in GitHub, but will remove it from Redly's sidebar.")) {
            await disconnectWorkspaceById(id);
            loadWorkspaces();
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose} style={{ zIndex: 9999 }}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px', width: '90%', padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '20px 24px', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '18px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Layers size={20} style={{ color: 'var(--accent-color)' }} />
                        Manage Workspaces
                    </h2>
                    <button className="icon-button" onClick={onClose} aria-label="Close Workspaces Modal">
                        <X size={20} />
                    </button>
                </div>

                <div style={{ padding: '24px', maxHeight: '70vh', overflowY: 'auto' }}>
                    <h3 style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-tertiary)', marginBottom: '12px' }}>
                        Connected Workspaces
                    </h3>
                    
                    {isLoading ? (
                        <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-tertiary)' }}>Loading...</div>
                    ) : workspaces.length === 0 ? (
                        <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-tertiary)', background: 'var(--bg-secondary)', borderRadius: '8px', marginBottom: '24px' }}>
                            No workspaces connected.
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gap: '12px', marginBottom: '32px' }}>
                            {workspaces.map(ws => (
                                <div key={ws.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        {ws.type === 'github' && <Github size={20} style={{ color: '#24292f' }} />}
                                        {ws.type === 'local' && <HardDrive size={20} style={{ color: 'var(--accent-color)' }} />}
                                        {ws.type === 'sandbox' && <Box size={20} style={{ color: 'var(--color-future)' }} />}
                                        
                                        <div>
                                            <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{ws.name || ws.id}</div>
                                            <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', textTransform: 'capitalize' }}>
                                                {ws.type === 'github' ? `GitHub Repository` : ws.type === 'local' ? 'Local Directory' : 'Browser Sandbox'}
                                            </div>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => handleDisconnect(ws.id)}
                                        className="icon-button" 
                                        style={{ color: 'var(--danger-color)', padding: '6px' }}
                                        title="Disconnect Workspace"
                                    >
                                        <Unplug size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    <h3 style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-tertiary)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Plus size={14} /> Add Another Workspace
                    </h3>
                    
                    <div style={{ display: 'flex', gap: '16px', flexDirection: 'column' }}>
                        <button onClick={handleSandboxClick} className="storage-option-btn" style={{ textAlign: 'left', padding: '16px', background: 'var(--bg-secondary)', width: '100%' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                                <Box size={20} style={{ color: 'var(--color-future)' }} />
                                <h3 style={{ fontWeight: '700', fontSize: '15px', margin: 0 }}>Browser Storage</h3>
                            </div>
                            <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', margin: 0, paddingLeft: '32px' }}>Store notes in a hidden, secure browser sandbox. Fast and zero-config.</p>
                        </button>

                        <button onClick={() => setShowGithubModal(true)} className="storage-option-btn" style={{ textAlign: 'left', padding: '16px', background: 'var(--bg-secondary)', width: '100%' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                                <Github size={20} style={{ color: '#24292f' }} />
                                <h3 style={{ fontWeight: '700', fontSize: '15px', margin: 0 }}>Cloud Sync (GitHub)</h3>
                            </div>
                            <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', margin: 0, paddingLeft: '32px' }}>Instant, versioned sync to your own GitHub repository. Accessible everywhere.</p>
                        </button>

                        {!isMobile && (
                            <button onClick={handleLocalStorageClick} className="storage-option-btn" style={{ textAlign: 'left', padding: '16px', background: 'var(--bg-secondary)', width: '100%', opacity: !isFileSystemSupported ? 0.7 : 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                                    <HardDrive size={20} style={{ color: 'var(--accent-color)' }} />
                                    <h3 style={{ fontWeight: '700', fontSize: '15px', margin: 0 }}>
                                        Local Storage
                                        {!isFileSystemSupported && <span style={{ fontSize: '10px', marginLeft: '8px', background: 'var(--bg-tertiary)', padding: '2px 6px', borderRadius: '4px', color: 'var(--text-tertiary)' }}>Unsupported</span>}
                                    </h3>
                                </div>
                                <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', margin: 0, paddingLeft: '32px' }}>Save notes as visible <code>.md</code> files on your computer. Your data, your control.</p>
                            </button>
                        )}
                    </div>
                </div>

                <GitHubSetupModal 
                    isOpen={showGithubModal} 
                    onClose={() => setShowGithubModal(false)} 
                    onConnect={handleGithubConnect} 
                    isDarkMode={isDarkMode} 
                />
            </div>
        </div>
    );
}
