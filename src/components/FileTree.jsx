import React, { useState, useRef, useEffect } from 'react';
import { useNotes } from '../context/NotesContext';
import {
    Folder, FolderOpen, FileText,
    MoreVertical, Edit2, Trash2,
    Plus, FolderPlus
} from 'lucide-react';

export default function FileTree({ node, depth }) {
    const { activeFileId, setActiveFileId, expandedFolders, toggleFolder, removeNode, editNode, addNode, globalAddingState, setGlobalAddingState, setLastInteractedNodeId, lastInteractedNodeId } = useNotes();
    const [showMenu, setShowMenu] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState(node.name);
    const [newName, setNewName] = useState('');
    const menuRef = useRef(null);
    const itemRef = useRef(null);

    const isFolder = node.type === 'folder';
    const isAddingMode = (globalAddingState.parentId === node.id) ? globalAddingState.type : null;
    const isExpanded = expandedFolders.has(node.id);
    const isActive = activeFileId === node.id;

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                setShowMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleClick = (e) => {
        e.stopPropagation();
        setLastInteractedNodeId(node.id);
        if (isFolder) {
            toggleFolder(node.id);
        } else {
            setActiveFileId(node.id);
        }
    };

    const handleDelete = (e) => {
        e.stopPropagation();
        if (window.confirm(`Are you sure you want to delete "${node.name}"${isFolder ? ' and all its contents' : ''}?`)) {
            removeNode(node.id);
        }
        setShowMenu(false);
    };

    const handleRename = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (editName.trim() && editName !== node.name) {
            editNode(node.id, { name: editName.trim() });
        }
        setIsEditing(false);
    };

    const handleAddSubmit = async (e) => {
        e.preventDefault();
        if (newName.trim()) {
            await addNode(newName.trim(), isAddingMode, node.id);
        }
        setNewName('');
        setGlobalAddingState({ type: null, parentId: null });
    };

    const startAdding = (e, type) => {
        e.stopPropagation();
        setShowMenu(false);
        if (!isExpanded) toggleFolder(node.id);
        setGlobalAddingState({ type, parentId: node.id });
    };

    const handleDragStart = (e) => {
        e.stopPropagation();
        e.dataTransfer.setData('text/plain', node.id);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = 'move';
        if (isFolder) {
            e.currentTarget.classList.add('drag-over');
        }
    };

    const handleDragLeave = (e) => {
        e.stopPropagation();
        if (isFolder) {
            e.currentTarget.classList.remove('drag-over');
        }
    };

    const handleDrop = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (isFolder) {
            e.currentTarget.classList.remove('drag-over');
        }

        const draggedId = e.dataTransfer.getData('text/plain');
        if (!draggedId || draggedId === node.id) return;

        // Move to folder if it's a folder, otherwise move to the same parent as the target file
        const targetParentId = isFolder ? node.id : node.parentId;
        editNode(draggedId, { parentId: targetParentId });

        if (isFolder && !isExpanded) toggleFolder(node.id);
    };


    const isFocused = lastInteractedNodeId === node.id || (!lastInteractedNodeId && isActive);

    useEffect(() => {
        if (isFocused && itemRef.current) {
            // Only focus if we aren't already focused, to avoid stealing focus from the editor
            // unless we are actively using the sidebar
            if (document.activeElement !== itemRef.current && document.activeElement?.closest('.sidebar-content')) {
                itemRef.current.focus();
            } else if (!document.activeElement || document.activeElement === document.body) {
                itemRef.current.focus();
            }
        }
    }, [isFocused]);

    return (
        <div>
            <div
                ref={itemRef}
                className={`tree-item ${isActive ? 'active' : ''} ${isFocused ? 'focused' : ''}`}
                role="treeitem"
                aria-expanded={isFolder ? isExpanded : undefined}
                aria-selected={isActive}
                style={{ '--depth': depth }}
                onClick={handleClick}
                title={node.name}
                draggable
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}

                tabIndex={0}
                onKeyDown={(e) => {
                    if (e.target.tagName === 'INPUT') return;
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        e.stopPropagation(); // add stopPropagation so parent folders don't also handle the Enter key!
                        handleClick(e);
                    }
                }}

            >
                <div className="tree-item-content">
                    <span className="icon-color" style={{ color: isFolder ? 'var(--accent-color)' : 'var(--text-tertiary)', display: 'flex' }} aria-hidden="true">
                        {isFolder ? (isExpanded ? <FolderOpen size={16} /> : <Folder size={16} />) : <FileText size={16} />}
                    </span>

                    {isEditing ? (
                        <input
                            autoFocus
                            value={editName}
                            onChange={e => setEditName(e.target.value)}
                            onBlur={handleRename}
                            onKeyDown={e => e.key === 'Enter' && handleRename(e)}
                            onClick={e => e.stopPropagation()}
                            style={{ background: 'transparent', border: 'none', color: 'inherit', outline: 'none', width: '100%' }}
                        />
                    ) : (
                        <span className="tree-item-label">
                            {node.name.replace(/\.md$/i, '')}

                            {isFolder && (
                                <span style={{ marginLeft: '6px', fontSize: '12px', color: 'var(--text-tertiary)', opacity: 0.8 }}>
                                    ({node.children?.length || 0})
                                </span>
                            )}
                        </span>
                    )}
                </div>

                {/* Hover/Context Menu */}
                <div className="tree-item-actions" style={{ position: 'relative', display: 'flex', alignItems: 'center' }} ref={menuRef}>
                    <button
                        className="icon-button"
                        onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
                        style={{ padding: '2px', opacity: showMenu ? 1 : '' }}
                        aria-label={`Options for ${node.name}`}
                        aria-haspopup="true"
                        aria-expanded={showMenu}
                    >
                        <MoreVertical size={14} className={isActive ? 'icon-color' : ''} aria-hidden="true" />
                    </button>

                    {showMenu && (
                        <div style={{
                            position: 'absolute', right: '0', top: '100%', marginTop: '4px',
                            backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
                            borderRadius: '6px', padding: '4px', zIndex: 50,
                            boxShadow: 'var(--shadow-md)', minWidth: '140px', display: 'flex', flexDirection: 'column'
                        }}>
                            {isFolder && (
                                <>
                                    <button className="icon-button" style={{ justifyContent: 'flex-start', width: '100%', gap: '8px', fontSize: '13px', padding: '6px 8px' }} onClick={(e) => startAdding(e, 'file')} aria-label="Create New Note in this folder">
                                        <Plus size={14} aria-hidden="true" /> New Note
                                    </button>
                                    <button className="icon-button" style={{ justifyContent: 'flex-start', width: '100%', gap: '8px', fontSize: '13px', padding: '6px 8px' }} onClick={(e) => startAdding(e, 'folder')} aria-label="Create New Folder in this folder">
                                        <FolderPlus size={14} aria-hidden="true" /> New Folder
                                    </button>
                                    <div style={{ height: '1px', background: 'var(--border-color)', margin: '4px 0' }} aria-hidden="true"></div>
                                </>
                            )}
                            <button className="icon-button" style={{ justifyContent: 'flex-start', width: '100%', gap: '8px', fontSize: '13px', padding: '6px 8px' }} onClick={(e) => { e.stopPropagation(); setIsEditing(true); setShowMenu(false); }} aria-label={`Rename ${node.name}`}>
                                <Edit2 size={14} aria-hidden="true" /> Rename
                            </button>
                            <button className="icon-button" style={{ justifyContent: 'flex-start', width: '100%', gap: '8px', fontSize: '13px', padding: '6px 8px', color: 'var(--danger-color)' }} onClick={handleDelete} aria-label={`Delete ${node.name}`}>
                                <Trash2 size={14} aria-hidden="true" /> Delete
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {isFolder && isExpanded && (
                <div>
                    {isAddingMode && (
                        <div className="tree-item" style={{ '--depth': depth + 1, backgroundColor: 'transparent' }}>
                            <div className="tree-item-content">
                                <span style={{ color: 'var(--text-tertiary)' }} aria-hidden="true">
                                    {isAddingMode === 'folder' ? <FolderPlus size={16} /> : <FileText size={16} />}
                                </span>
                                <form onSubmit={handleAddSubmit} style={{ width: '100%' }}>
                                    <input
                                        autoFocus
                                        value={newName}
                                        onChange={e => setNewName(e.target.value)}
                                        onBlur={() => setGlobalAddingState({ type: null, parentId: null })}
                                        placeholder={`New ${isAddingMode}...`}
                                        style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', outline: 'none', width: '100%', fontSize: '14px' }}
                                    />
                                </form>
                            </div>
                        </div>
                    )}
                    {node.children.map(childNode => (
                        <FileTree
                            key={childNode.id}
                            node={childNode}
                            depth={depth + 1}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
