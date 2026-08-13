import React, { useState, useRef, useEffect } from 'react';
import { useNotes } from '../context/NotesContext';
import {
    Folder, FolderOpen, FileText,
    MoreVertical, Edit2, Trash2,
    Plus, FolderPlus, Share2, Activity, Printer,
    HardDrive, Github, Box, Unplug
} from 'lucide-react';

import markdownit from 'markdown-it';
import taskLists from 'markdown-it-task-lists';
const md = markdownit({ html: true, linkify: true, typographer: true }).use(taskLists, { label: false });

export default function FileTree({ node, depth }) {
    const { 
        activeFileId, setActiveFileId, expandedFolders, toggleFolder, 
        removeNode, editNode, addNode, globalAddingState, setGlobalAddingState, 
        setLastInteractedNodeId, lastInteractedNodeId,
        getFileContent,
        disconnectWorkspaceById
    } = useNotes();
    const [showMenu, setShowMenu] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState(node.name);
    const [newName, setNewName] = useState('');
    const menuRef = useRef(null);
    const itemRef = useRef(null);
    const deleteBtnRef = useRef(null);

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

    useEffect(() => {
        if (showDeleteConfirm && deleteBtnRef.current) {
            deleteBtnRef.current.focus();
        }
    }, [showDeleteConfirm]);

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
        setShowDeleteConfirm(true);
        setShowMenu(false);
    };

    const confirmDelete = (e) => {
        e.stopPropagation();
        removeNode(node.id);
        setShowDeleteConfirm(false);
    };

    const cancelDelete = (e) => {
        e.stopPropagation();
        setShowDeleteConfirm(false);
    };

    const handleExportPDF = async (e) => {
        e.stopPropagation();
        setShowMenu(false);
        if (activeFileId !== node.id) {
             setActiveFileId(node.id);
             setTimeout(() => window.print(), 200); 
        } else {
             window.print();
        }
    };

    const handleExportWord = async (e) => {
        e.stopPropagation();
        setShowMenu(false);
        
        let content = node.content;
        if (content === undefined) {
            content = await getFileContent(node.id);
        }
        
        const html = md.render(content || '');
        const header = "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>Export</title></head><body>";
        const footer = "</body></html>";
        const sourceHTML = header + `<h1>${node.name}</h1>` + html + footer;

        const source = 'data:application/vnd.ms-word;charset=utf-8,' + encodeURIComponent(sourceHTML);
        const fileDownload = document.createElement("a");
        document.body.appendChild(fileDownload);
        fileDownload.href = source;
        fileDownload.download = `${node.name.replace(/\.md$/i, '')}.doc`;
        fileDownload.click();
        document.body.removeChild(fileDownload);
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
        if (e.dataTransfer.types.includes('Files')) {
            e.dataTransfer.dropEffect = 'copy';
        } else {
            e.dataTransfer.dropEffect = 'move';
        }
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

        // External File Drop
        if (e.dataTransfer.items && Array.from(e.dataTransfer.items).some(item => item.kind === 'file')) {
            const items = Array.from(e.dataTransfer.items).filter(item => item.kind === 'file');
            const targetParentId = isFolder ? node.id : node.parentId;
            
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
                if (entry) await processEntry(entry, targetParentId);
            }
            if (isFolder && !isExpanded) toggleFolder(node.id);
            return;
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
                itemRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            } else if (!document.activeElement || document.activeElement === document.body) {
                itemRef.current.focus();
                itemRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            } else {
                // If focus is in Editor or Global Tasks, just scroll it into view so the user sees it without stealing type focus!
                itemRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
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
                        e.stopPropagation();
                        handleClick(e);
                    } else if (e.key === 'Delete' || (e.key === 'Backspace' && (e.metaKey || e.ctrlKey))) {
                        // Delete item (require ctrl/meta for backspace to avoid accidental deletion)
                        e.preventDefault();
                        e.stopPropagation();
                        handleDelete(e);
                    } else if (e.altKey && e.key.toLowerCase() === 'r') {
                        // Rename item
                        e.preventDefault();
                        e.stopPropagation();
                        setIsEditing(true);
                        setShowMenu(false);
                    }
                }}

            >
                <div className="tree-item-content">
                    <span className="icon-color" style={{ color: isFolder ? 'var(--accent-color)' : 'var(--text-tertiary)', display: 'flex' }} aria-hidden="true">
                        {node.isWorkspaceRoot ? (
                            node.workspaceType === 'local' ? <HardDrive size={16} /> :
                            node.workspaceType === 'github' ? <Github size={16} /> :
                            <Box size={16} />
                        ) : isFolder ? (isExpanded ? <FolderOpen size={16} /> : <Folder size={16} />) : <FileText size={16} />}
                    </span>

                    {isEditing ? (
                        <input
                            name="rename-item"
                            id="rename-item"
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
                            {!isFolder && (
                                <>
                                    <button className="icon-button" style={{ justifyContent: 'flex-start', width: '100%', gap: '8px', fontSize: '13px', padding: '6px 8px' }} onClick={handleExportPDF} aria-label={`Export PDF`}>
                                        <Printer size={14} aria-hidden="true" /> Export PDF
                                    </button>
                                    <button className="icon-button" style={{ justifyContent: 'flex-start', width: '100%', gap: '8px', fontSize: '13px', padding: '6px 8px' }} onClick={handleExportWord} aria-label={`Export Word`}>
                                        <FileText size={14} aria-hidden="true" /> Export Word
                                    </button>
                                    <div style={{ height: '1px', background: 'var(--border-color)', margin: '4px 0' }} aria-hidden="true"></div>
                                </>
                            )}

                            {!node.isWorkspaceRoot ? (
                                <>
                                    <button className="icon-button" style={{ justifyContent: 'flex-start', width: '100%', gap: '8px', fontSize: '13px', padding: '6px 8px' }} onClick={(e) => { e.stopPropagation(); setIsEditing(true); setShowMenu(false); }} aria-label={`Rename ${node.name}`}>
                                        <Edit2 size={14} aria-hidden="true" /> Rename
                                    </button>
                                    <button className="icon-button" style={{ justifyContent: 'flex-start', width: '100%', gap: '8px', fontSize: '13px', padding: '6px 8px', color: 'var(--danger-color)' }} onClick={handleDelete} aria-label={`Delete ${node.name}`}>
                                        <Trash2 size={14} aria-hidden="true" /> Delete
                                    </button>
                                </>
                            ) : (
                                <button className="icon-button" style={{ justifyContent: 'flex-start', width: '100%', gap: '8px', fontSize: '13px', padding: '6px 8px', color: 'var(--danger-color)' }} onClick={(e) => {
                                    e.stopPropagation();
                                    if(window.confirm(`Disconnect workspace "${node.name}"?`)) {
                                        disconnectWorkspaceById(node.id);
                                    }
                                }} aria-label={`Disconnect ${node.name}`}>
                                    <Unplug size={14} aria-hidden="true" /> Disconnect
                                </button>
                            )}
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
                                        name="new-item-name"
                                        id="new-item-name"
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

            {showDeleteConfirm && (
                <div className="modal-overlay" onClick={cancelDelete}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <h2 style={{ marginTop: 0, color: 'var(--text-primary)', fontSize: '20px', fontWeight: '600', marginBottom: '8px' }}>Delete {isFolder ? 'Folder' : 'Note'}</h2>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '14.5px', marginBottom: '28px', lineHeight: '1.5' }}>
                            Are you sure you want to delete <strong style={{ color: 'var(--text-primary)' }}>"{node.name}"</strong>{isFolder ? ' and all its contents' : ''}? <br />This action cannot be undone.
                        </p>
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                            <button className="secondary-btn" onClick={cancelDelete} style={{ padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: '500', border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-primary)' }}>Cancel</button>
                            <button ref={deleteBtnRef} className="danger-btn" onClick={confirmDelete} style={{ padding: '8px 16px', borderRadius: '6px', background: 'var(--danger-color)', color: 'white', border: 'none', cursor: 'pointer', fontWeight: '500' }}>Delete</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
