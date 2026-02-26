import React, { useState, useEffect, useCallback } from 'react';
import { useNotes } from '../context/NotesContext';
import { Plus, FolderPlus, X, FileText, HelpCircle, CheckSquare, ChevronsDown, ChevronsUp } from 'lucide-react';
import FileTree from './FileTree';
import logo from '../assets/logo.png';
import { getAccessToken } from '../lib/gdrive';

// Official Google "G" coloured logo (Google brand guidelines)
const GoogleGLogo = ({ size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
);

export default function Sidebar({ isOpen, onClose, onOpenHelp, setShowTasks, onGoHome }) {
    const { tree, nodes, activeFileId, setActiveFileId, addNode, expandAll, collapseAll, editNode, isInitializing, globalAddingState, setGlobalAddingState, lastInteractedNodeId, setLastInteractedNodeId, expandedFolders, toggleFolder, disconnectWorkspace, selectWorkspace, storageMode } = useNotes();
    const [gdriveConnecting, setGdriveConnecting] = useState(false);

    const handleGDriveClick = useCallback(async () => {
        if (gdriveConnecting) return;
        setGdriveConnecting(true);
        try {
            // Must call getAccessToken() within the click handler to stay in the user-gesture window
            // so the browser allows the OAuth popup to open.
            await getAccessToken();
            await selectWorkspace('gdrive');
        } catch (e) {
            if (e.message?.includes('Sign-in cancelled')) {
                // User closed popup — no alert needed
            } else if (e.message?.includes('timed out') || e.message?.includes('popup')) {
                alert('Connection timed out. Please check if popups are blocked in your browser.');
            } else if (e.message?.includes('Client ID')) {
                alert('Google Drive is not configured. Please check the app settings.');
            } else {
                alert('Google Drive connection failed: ' + (e.message || 'Unknown error'));
            }
        } finally {
            setGdriveConnecting(false);
        }
    }, [gdriveConnecting, selectWorkspace]);
    const [newName, setNewName] = useState('');

    const isAdding = globalAddingState.type;
    const targetFolder = globalAddingState.parentId;

    const handleAdd = async (e) => {
        e.preventDefault();
        if (!newName.trim()) return;
        await addNode(newName.trim(), isAdding, targetFolder); // Adding to target
        setNewName('');
        setGlobalAddingState({ type: null, parentId: null });
    };

    const handleNewItem = useCallback((type) => {
        const targetNode = nodes.find(n => n.id === lastInteractedNodeId) || nodes.find(n => n.id === activeFileId);
        const parentId = targetNode ? (targetNode.type === 'folder' ? targetNode.id : targetNode.parentId) : null;
        setGlobalAddingState({ type, parentId });
        if (parentId && !expandedFolders.has(parentId)) toggleFolder(parentId);
    }, [nodes, lastInteractedNodeId, activeFileId, setGlobalAddingState, expandedFolders, toggleFolder]);

    // Flatten visible nodes for keyboard navigation
    const getVisibleNodes = useCallback(() => {
        const visible = [];
        const traverse = (nodeList) => {
            for (const node of nodeList) {
                visible.push(node);
                if (node.type === 'folder' && expandedFolders.has(node.id) && node.children) {
                    traverse(node.children);
                }
            }
        };
        traverse(tree);
        return visible;
    }, [tree, expandedFolders]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            // Ignore if typing in an input/textarea
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.closest('.ProseMirror')) {
                return;
            }

            if (e.altKey && !e.shiftKey && e.key.toLowerCase() === 'n') {
                e.preventDefault();
                handleNewItem('file');
                return;
            } else if (e.altKey && !e.shiftKey && e.key.toLowerCase() === 'f') {
                e.preventDefault();
                handleNewItem('folder');
                return;
            }

            // Tree navigation
            const visibleNodes = getVisibleNodes();
            if (visibleNodes.length === 0) return;

            const currentIndex = visibleNodes.findIndex(n => n.id === lastInteractedNodeId);
            const currentNode = currentIndex !== -1 ? visibleNodes[currentIndex] : null;

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                if (currentIndex === -1) {
                    setLastInteractedNodeId(visibleNodes[0].id);
                } else if (currentIndex < visibleNodes.length - 1) {
                    setLastInteractedNodeId(visibleNodes[currentIndex + 1].id);
                }
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                if (currentIndex > 0) {
                    setLastInteractedNodeId(visibleNodes[currentIndex - 1].id);
                } else if (currentIndex === -1) {
                    setLastInteractedNodeId(visibleNodes[visibleNodes.length - 1].id);
                }
            } else if (e.key === 'ArrowRight' && currentNode) {
                e.preventDefault();
                if (currentNode.type === 'folder') {
                    if (!expandedFolders.has(currentNode.id)) {
                        toggleFolder(currentNode.id);
                    } else if (currentIndex < visibleNodes.length - 1 && visibleNodes[currentIndex + 1].parentId === currentNode.id) {
                        // Move to first child
                        setLastInteractedNodeId(visibleNodes[currentIndex + 1].id);
                    }
                }
            } else if (e.key === 'ArrowLeft' && currentNode) {
                e.preventDefault();
                if (currentNode.type === 'folder' && expandedFolders.has(currentNode.id)) {
                    toggleFolder(currentNode.id);
                } else if (currentNode.parentId) {
                    setLastInteractedNodeId(currentNode.parentId);
                }
            } else if ((e.key === 'Enter' || e.key === ' ') && currentNode) {
                e.preventDefault();
                if (currentNode.type === 'folder') {
                    toggleFolder(currentNode.id);
                } else {
                    setActiveFileId(currentNode.id);
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleNewItem, getVisibleNodes, lastInteractedNodeId, expandedFolders, toggleFolder, setActiveFileId, setLastInteractedNodeId]);

    return (
        <aside className={`sidebar ${isOpen ? 'open' : ''}`} role="navigation" aria-label="Main Navigation">
            <div className="sidebar-header" style={{ padding: '16px', flexDirection: 'column', alignItems: 'stretch', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                        <div
                            style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
                            onClick={onGoHome}
                            title="Go to Home"
                            role="button"
                            aria-label="Redly Home"
                        >
                            <img src={logo} alt="" style={{ width: '24px', height: '24px', borderRadius: '6px' }} aria-hidden="true" />
                            <span style={{ fontWeight: 800, color: 'var(--accent-color)' }}>Redly</span>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '4px' }}>
                        {expandedFolders.size > 0 ? (
                            <button className="icon-button" onClick={collapseAll} title="Collapse All Folders" aria-label="Collapse All Folders" style={{ marginRight: '8px' }}>
                                <ChevronsUp size={14} aria-hidden="true" />
                            </button>
                        ) : (
                            <button className="icon-button" onClick={expandAll} title="Expand All Folders" aria-label="Expand All Folders" style={{ marginRight: '8px' }}>
                                <ChevronsDown size={14} aria-hidden="true" />
                            </button>
                        )}
                        <div style={{ width: '1px', background: 'var(--border-color)', margin: '4px 0', marginRight: '4px' }}></div>
                        <button className="icon-button" onClick={() => handleNewItem('file')} title="New Note (Alt+N)" aria-label="Create New Note">
                            <Plus size={16} aria-hidden="true" />
                        </button>
                        <button className="icon-button" onClick={() => handleNewItem('folder')} title="New Folder (Alt+F)" aria-label="Create New Folder">
                            <FolderPlus size={16} aria-hidden="true" />
                        </button>
                        {isOpen && (
                            <button className="icon-button" onClick={onClose} style={{ display: 'none' }} aria-label="Close Sidebar">
                                <X size={18} aria-hidden="true" />
                            </button>
                        )}
                    </div>
                </div>

                <button
                    onClick={setShowTasks}
                    aria-label="View Global Tasks"
                    style={{
                        display: 'flex', alignItems: 'center', gap: '8px', padding: '8px',
                        background: 'var(--bg-secondary)', border: 'none', borderRadius: '6px',
                        color: 'var(--text-primary)', fontSize: '14px', cursor: 'pointer',
                        fontWeight: 500, transition: 'background 0.2s', width: '100%'
                    }}
                    onMouseEnter={(e) => e.target.style.background = 'var(--bg-hover)'}
                    onMouseLeave={(e) => e.target.style.background = 'var(--bg-secondary)'}
                >
                    <CheckSquare size={16} style={{ color: 'var(--accent-color)' }} aria-hidden="true" />
                    Global Tasks
                </button>
            </div>


            <div
                className="sidebar-content"
                role="tree"
                aria-label="Notes Explorer"
                onClick={() => setLastInteractedNodeId(null)}
                onDragOver={e => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                }}
                onDrop={e => {
                    e.preventDefault();
                    // Drop to Root if they drop anywhere in the sidebar content
                    const draggedId = e.dataTransfer.getData('text/plain');
                    if (draggedId) {
                        editNode(draggedId, { parentId: null });
                    }
                }}

            >
                {isAdding && targetFolder === null && (
                    <form onSubmit={handleAdd} style={{ padding: '8px', display: 'flex', gap: '8px', background: 'transparent', borderBottom: '1px solid var(--border-color)' }}>
                        {isAdding === 'folder' ? <FolderPlus size={16} /> : <FileText size={16} />}
                        <input
                            autoFocus
                            className="title-input"
                            style={{ fontSize: '14px', borderBottom: '1px solid var(--border-color)', borderRadius: 0, width: '100%' }}
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            placeholder={`New ${isAdding}...`}
                            onBlur={() => setGlobalAddingState({ type: null, parentId: null })}
                        />
                    </form>
                )}

                {tree.length === 0 && !isAdding ? (
                    <div style={{ padding: '16px', color: 'var(--text-tertiary)', fontSize: '14px', textAlign: 'center' }}>
                        No notes yet. Create one!
                    </div>
                ) : (
                    tree.map(node => <FileTree key={node.id} node={node} depth={0} />)
                )}
            </div>

            <div className="sidebar-footer" style={{
                padding: '12px',
                borderTop: '1px solid var(--border-color)',
                display: 'flex',
                gap: '8px',
                justifyContent: 'center',
                flexShrink: 0
            }}>
                <button
                    onClick={onOpenHelp}
                    aria-label="Open Keyboard Shortcuts and Help"
                    style={{
                        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                        background: 'var(--bg-accent)', border: 'none', padding: '8px', borderRadius: '6px',
                        color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '14px'
                    }}
                    title="Shortcuts & Help"
                >
                    <HelpCircle size={16} aria-hidden="true" /> Redly Guide
                </button>

                <button
                    onClick={handleGDriveClick}
                    aria-label={storageMode === 'gdrive' ? 'Connected to Google Drive' : 'Connect Google Drive'}
                    disabled={gdriveConnecting}
                    title={storageMode === 'gdrive' ? 'Google Drive — connected' : gdriveConnecting ? 'Connecting...' : 'Connect Google Drive'}
                    style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                        background: storageMode === 'gdrive' ? 'rgba(66,133,244,0.12)' : 'var(--bg-accent)',
                        border: storageMode === 'gdrive' ? '1px solid rgba(66,133,244,0.4)' : '1px solid transparent',
                        padding: '8px 12px', borderRadius: '6px',
                        color: storageMode === 'gdrive' ? '#4285F4' : 'var(--text-secondary)',
                        cursor: gdriveConnecting ? 'wait' : 'pointer',
                        fontSize: '13px', fontWeight: 500,
                        opacity: gdriveConnecting ? 0.7 : 1,
                        transition: 'all 0.2s',
                        flexShrink: 0
                    }}
                    onMouseEnter={(e) => { if (!gdriveConnecting) e.currentTarget.style.background = storageMode === 'gdrive' ? 'rgba(66,133,244,0.2)' : 'var(--bg-hover)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = storageMode === 'gdrive' ? 'rgba(66,133,244,0.12)' : 'var(--bg-accent)'; }}
                >
                    <GoogleGLogo size={16} />
                    {storageMode === 'gdrive' ? 'Drive' : gdriveConnecting ? '...' : 'Drive'}
                </button>
            </div>
        </aside>
    );
}
