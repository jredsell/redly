import React, { useState, useEffect, useCallback } from 'react';
import { useNotes } from '../context/NotesContext';
import { Heart, ChevronRight, ChevronDown, FileText, Folder, Plus, Trash2, FolderPlus, MoreVertical, Edit2, Play, Settings, Menu, Settings2, Moon, Sun, HelpCircle, Activity, X, CheckSquare, ChevronsDown, ChevronsUp, RefreshCw, PanelLeftClose } from 'lucide-react';
import FileTree from './FileTree';
import RedlyLogo from './RedlyLogo';

export default function Sidebar({ isOpen, onClose, onOpenHelp, onOpenTrash, onOpenSync, setShowTasks, onGoHome, isSidebarCollapsed, setIsSidebarCollapsed, sidebarWidth, setSidebarWidth }) {
    const {
        tree, nodes, activeFileId, setActiveFileId, addNode, expandAll, collapseAll,
        editNode, isInitializing, globalAddingState, setGlobalAddingState,
        lastInteractedNodeId, setLastInteractedNodeId, expandedFolders,
        toggleFolder, disconnectWorkspace, isDarkMode, syncStatus,
        storageMode, isSyncing
    } = useNotes();

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
            // Ignore if typing in an input/textarea, or if focused on a button (to allow Enter to click buttons)
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'BUTTON' || e.target.closest('.ProseMirror')) {
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
                } else if (currentNode.type === 'file') {
                    // Open the file and focus the editor
                    setActiveFileId(currentNode.id);
                    setTimeout(() => {
                        document.querySelector('.ProseMirror')?.focus();
                    }, 50);
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
    const handleMouseDown = useCallback((e) => {
        e.preventDefault();
        const handleMouseMove = (mouseMoveEvent) => {
            if (isSidebarCollapsed) setIsSidebarCollapsed(false);
            const newWidth = mouseMoveEvent.clientX;
            setSidebarWidth(Math.max(260, newWidth)); // Enforce 260px minimum width
        };
        const handleMouseUp = () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = 'default';
        };
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = 'col-resize';
    }, [isSidebarCollapsed, setIsSidebarCollapsed, setSidebarWidth]);

    return (
        <aside className={`sidebar ${isOpen ? 'open' : ''} ${isSidebarCollapsed ? 'collapsed' : ''}`} role="navigation" aria-label="Main Navigation">
            {!isSidebarCollapsed && (
                <>
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
                            <a href="https://github.com/sponsors/jredsell" target="_blank" rel="noopener noreferrer" className="icon-button" title="Sponsor Redly" aria-label="Sponsor on GitHub" style={{ display: 'flex', alignItems: 'center', justifyItems: 'center', color: 'inherit', textDecoration: 'none' }} onClick={(e) => e.stopPropagation()}>
                                <Heart size={15} style={{ color: '#ec4899' }} aria-hidden="true" />
                            </a>
                            <RedlyLogo size={28} showText={false} />
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
                        <button className="icon-button hide-sidebar-btn" onClick={() => setIsSidebarCollapsed(true)} title="Hide Sidebar" aria-label="Hide Sidebar" style={{ marginLeft: '4px' }}>
                            <PanelLeftClose size={16} aria-hidden="true" />
                        </button>
                        {isOpen && (
                            <React.Fragment>
                                <button className="icon-button mobile-close-btn" onClick={onClose} style={{ display: 'none' }} aria-label="Close Sidebar">
                                    <X size={18} aria-hidden="true" />
                                </button>
                                <style>{`
                                    @media (max-width: 768px) {
                                        .mobile-close-btn { display: flex !important; margin-left: 4px; }
                                    }
                                `}</style>
                            </React.Fragment>
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
                    if (e.dataTransfer.types.includes('Files')) {
                        e.dataTransfer.dropEffect = 'copy';
                    } else {
                        e.dataTransfer.dropEffect = 'move';
                    }
                }}
                onDrop={async (e) => {
                    e.preventDefault();
                    
                    // External File Drop
                    if (e.dataTransfer.items && Array.from(e.dataTransfer.items).some(item => item.kind === 'file')) {
                        const items = Array.from(e.dataTransfer.items).filter(item => item.kind === 'file');
                        
                        const processEntry = async (entry, currentParentId) => {
                            if (entry.isFile) {
                                if (entry.name.endsWith('.md') || entry.name.endsWith('.txt')) {
                                    const file = await new Promise((resolve, reject) => entry.file(resolve, reject));
                                    const text = await file.text();
                                    let baseName = entry.name;
                                    if (baseName.endsWith('.md')) baseName = baseName.slice(0, -3);
                                    else if (baseName.endsWith('.txt')) baseName = baseName.slice(0, -4);
                                    
                                    await addNode(baseName, 'file', currentParentId, false, text);
                                }
                            } else if (entry.isDirectory) {
                                const folderNode = await addNode(entry.name, 'folder', currentParentId, false);
                                if (folderNode) {
                                    const dirReader = entry.createReader();
                                    const readEntries = async () => {
                                        let allEntries = [];
                                        const readBatch = async () => {
                                            const entries = await new Promise((resolve, reject) => dirReader.readEntries(resolve, reject));
                                            if (entries.length > 0) {
                                                allEntries = allEntries.concat(entries);
                                                await readBatch();
                                            }
                                        };
                                        await readBatch();
                                        for (const child of allEntries) {
                                            await processEntry(child, folderNode.id);
                                        }
                                    };
                                    await readEntries();
                                }
                            }
                        };

                        for (const item of items) {
                            const entry = item.webkitGetAsEntry();
                            if (entry) {
                                await processEntry(entry, null);
                            }
                        }
                        return;
                    }

                    // Internal Node Movement
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
                            name="sidebar-new-item"
                            id="sidebar-new-item"
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
                    onClick={onOpenSync}
                    aria-label="Open Sync Center"
                    style={{
                        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
                        background: isSyncing ? 'rgba(37, 99, 235, 0.05)' : 'var(--bg-accent)', border: 'none', padding: '8px', borderRadius: '6px',
                        color: isSyncing ? 'var(--accent-color)' : 'var(--text-secondary)', cursor: 'pointer', fontSize: '12px',
                        transition: 'all 0.3s ease'
                    }}
                >
                    {storageMode === 'github' ? (
                        <>
                            <RefreshCw 
                                size={14} 
                                className={isSyncing ? 'spin' : ''} 
                                style={{ color: 'var(--accent-color)', animation: isSyncing ? 'spin 2s linear infinite' : 'none' }} 
                            />
                            {isSyncing ? 'Syncing...' : 'GitHub'}
                        </>
                    ) : (
                        <>
                            <Activity
                                size={16}
                                aria-hidden="true"
                                style={{ color: syncStatus === 'error' ? 'var(--danger-color)' : (syncStatus === 'connected' ? 'var(--success-color)' : 'var(--text-tertiary)') }}
                            /> 
                            Sync
                        </>
                    )}
                </button>

                <button
                    onClick={onOpenHelp}
                    aria-label="Open Keyboard Shortcuts and Help"
                    style={{
                        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
                        background: 'var(--bg-accent)', border: 'none', padding: '8px', borderRadius: '6px',
                        color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '13px'
                    }}
                    title="Shortcuts & Help"
                >
                    <HelpCircle size={16} aria-hidden="true" /> Guide
                </button>

                <button
                    onClick={onOpenTrash}
                    aria-label="Open Recycle Bin"
                    style={{
                        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
                        background: 'var(--bg-accent)', border: 'none', padding: '8px', borderRadius: '6px',
                        color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '13px'
                    }}
                    title="Recycle Bin"
                >
                    <Trash2 size={16} aria-hidden="true" /> Trash
                </button>
            </div>
            </>
            )}
            <div className="sidebar-resize-handle" onMouseDown={handleMouseDown} onDoubleClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} title="Drag to resize, double-click to toggle"></div>
        </aside>
    );
}
