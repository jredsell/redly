import React, { useState, useEffect, useCallback } from 'react';
import { useNotes } from '../context/NotesContext';
import { Plus, FolderPlus, X, FileText, Download, Upload, HelpCircle, CheckSquare, ChevronsDown, ChevronsUp, FolderArchive } from 'lucide-react';
import FileTree from './FileTree';
import logo from '../assets/logo.png';

export default function Sidebar({ isOpen, onClose, onOpenHelp, setShowTasks, onGoHome }) {
    const { tree, nodes, activeFileId, setActiveFileId, addNode, expandAll, collapseAll, editNode, handleExport, handleImport, isInitializing, globalAddingState, setGlobalAddingState, lastInteractedNodeId, setLastInteractedNodeId, expandedFolders, toggleFolder, disconnectWorkspace } = useNotes();
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

    const triggerImport = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e) => {
            if (e.target.files && e.target.files[0]) {
                handleImport(e.target.files[0]);
            }
        };
        input.click();
    };

    return (
        <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
            <div className="sidebar-header" style={{ height: 'auto', padding: '16px', flexDirection: 'column', alignItems: 'stretch', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                        <div
                            style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
                            onClick={onGoHome}
                            title="Go to Home"
                        >
                            <img src={logo} alt="Redly Logo" style={{ width: '24px', height: '24px', borderRadius: '6px' }} />
                            <span style={{ fontWeight: 800, color: 'var(--accent-color)' }}>redly</span>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '4px' }}>
                        <button className="icon-button" onClick={disconnectWorkspace} title="Change Workspace" style={{ marginRight: '8px' }}>
                            <FolderArchive size={16} />
                        </button>
                        {expandedFolders.size > 0 ? (
                            <button className="icon-button" onClick={collapseAll} title="Collapse All Folders" style={{ marginRight: '8px' }}>
                                <ChevronsUp size={14} />
                            </button>
                        ) : (
                            <button className="icon-button" onClick={expandAll} title="Expand All Folders" style={{ marginRight: '8px' }}>
                                <ChevronsDown size={14} />
                            </button>
                        )}
                        <div style={{ width: '1px', background: 'var(--border-color)', margin: '4px 0', marginRight: '4px' }}></div>
                        <button className="icon-button" onClick={() => handleNewItem('file')} title="New Note (Alt+N)">
                            <Plus size={18} />
                        </button>
                        <button className="icon-button" onClick={() => handleNewItem('folder')} title="New Folder (Alt+F)">
                            <FolderPlus size={18} />
                        </button>
                        {isOpen && (
                            <button className="icon-button" onClick={onClose} style={{ display: 'none' /* handled by media query later if needed */ }}>
                                <X size={18} />
                            </button>
                        )}
                    </div>
                </div>

                <button
                    onClick={setShowTasks}
                    style={{
                        display: 'flex', alignItems: 'center', gap: '8px', padding: '8px',
                        background: 'var(--bg-secondary)', border: 'none', borderRadius: '6px',
                        color: 'var(--text-primary)', fontSize: '14px', cursor: 'pointer',
                        fontWeight: 500, transition: 'background 0.2s', width: '100%'
                    }}
                    onMouseEnter={(e) => e.target.style.background = 'var(--bg-hover)'}
                    onMouseLeave={(e) => e.target.style.background = 'var(--bg-secondary)'}
                >
                    <CheckSquare size={16} style={{ color: 'var(--accent-color)' }} />
                    Global Tasks
                </button>
            </div>

            <div
                className="sidebar-content"
                onClick={() => setLastInteractedNodeId(null)}
                onDragOver={e => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                }}
                onDrop={e => {
                    e.preventDefault();
                    // Drop to Root if they drop on the empty space of the sidebar
                    const draggedId = e.dataTransfer.getData('text/plain');
                    if (draggedId && e.target === e.currentTarget) {
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

            <div style={{
                padding: '12px',
                borderTop: '1px solid var(--border-color)',
                display: 'flex',
                gap: '8px',
                justifyContent: 'center'
            }}>
                <button
                    onClick={handleExport}
                    style={{
                        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                        background: 'var(--bg-accent)', border: 'none', padding: '6px', borderRadius: '4px',
                        color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '13px'
                    }}
                    disabled={isInitializing}
                    title="Export backup"
                >
                    <Download size={14} /> Export
                </button>
                <button
                    onClick={triggerImport}
                    style={{
                        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                        background: 'var(--bg-accent)', border: 'none', padding: '6px', borderRadius: '4px',
                        color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '13px'
                    }}
                    disabled={isInitializing}
                    title="Import backup"
                >
                    <Upload size={14} /> Import
                </button>
                <button
                    onClick={onOpenHelp}
                    style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: 'var(--bg-accent)', border: 'none', padding: '6px', borderRadius: '4px',
                        color: 'var(--text-secondary)', cursor: 'pointer', minWidth: '32px'
                    }}
                    title="Shortcuts & Help"
                >
                    <HelpCircle size={15} />
                </button>
            </div>
        </aside>
    );
}
