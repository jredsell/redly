import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { getSavedWorkspaceHandle, saveWorkspaceHandle, clearWorkspaceHandle, getNodes, createNode, updateNode, deleteNode, buildTree } from '../lib/db';

const NotesContext = createContext(undefined);

export const NotesProvider = ({ children }) => {
    const [nodes, setNodes] = useState([]);
    const [workspaceHandle, setWorkspaceHandle] = useState(null);
    const [isInitializing, setIsInitializing] = useState(true);

    const [activeFileId, setActiveFileId] = useState(() => {
        const saved = localStorage.getItem('redly_activeFileId');
        return saved || null;
    });

    const [expandedFolders, setExpandedFolders] = useState(() => {
        const saved = localStorage.getItem('redly_expandedFolders');
        if (saved) {
            try { return new Set(JSON.parse(saved)); } catch (e) { }
        }
        return new Set();
    });

    const [globalAddingState, setGlobalAddingState] = useState({ type: null, parentId: null });
    const [lastInteractedNodeId, setLastInteractedNodeId] = useState(null);

    // Initial load
    useEffect(() => {
        const init = async () => {
            try {
                const savedHandle = await getSavedWorkspaceHandle();
                if (savedHandle) {
                    setWorkspaceHandle(savedHandle);
                    const allNodes = await getNodes(savedHandle);
                    setNodes(allNodes);
                }
            } catch (e) {
                console.error("Initialization failed", e);
            } finally {
                setIsInitializing(false);
            }
        };
        init();
    }, []);

    const loadNodes = useCallback(async () => {
        if (!workspaceHandle) return;
        try {
            const allNodes = await getNodes(workspaceHandle);
            setNodes(allNodes);
        } catch (e) {
            console.error('Failed to load nodes:', e);
        }
    }, [workspaceHandle]);

    const selectWorkspace = async () => {
        try {
            const rootPath = await window.electronAPI.showOpenDialog();
            if (!rootPath) {
                setIsInitializing(false);
                return;
            }

            await saveWorkspaceHandle(rootPath);
            setWorkspaceHandle(rootPath);
            setIsInitializing(true);
            const allNodes = await getNodes(rootPath);
            setNodes(allNodes);
        } catch (e) {
            console.error("Picker error", e);
            alert(`Could not open directory:\n\n${e.message}`);
        } finally {
            setIsInitializing(false);
        }
    };

    const disconnectWorkspace = async () => {
        await clearWorkspaceHandle();
        setWorkspaceHandle(null);
        setNodes([]);
        setActiveFileId(null);
        setLastInteractedNodeId(null);
        setExpandedFolders(new Set());
    };

    useEffect(() => {
        if (activeFileId) {
            localStorage.setItem('redly_activeFileId', activeFileId);
        } else {
            localStorage.removeItem('redly_activeFileId');
        }
    }, [activeFileId]);

    useEffect(() => {
        localStorage.setItem('redly_expandedFolders', JSON.stringify(Array.from(expandedFolders)));
    }, [expandedFolders]);

    // Auto-expand folders when a file becomes active
    useEffect(() => {
        if (!activeFileId || nodes.length === 0) return;
        setExpandedFolders(prev => {
            const next = new Set(prev);
            let currentId = activeFileId;
            let modified = false;

            while (currentId) {
                const node = nodes.find(n => n.id === currentId);
                if (!node || !node.parentId) break;

                if (!next.has(node.parentId)) {
                    next.add(node.parentId);
                    modified = true;
                }
                currentId = node.parentId;
            }
            return modified ? next : prev;
        });
    }, [activeFileId, nodes]);

    const tree = buildTree(nodes);

    const toggleFolder = (folderId) => {
        setExpandedFolders(prev => {
            const next = new Set(prev);
            if (next.has(folderId)) next.delete(folderId);
            else next.add(folderId);
            return next;
        });
    };

    const expandAll = () => {
        const folderIds = nodes.filter(n => n.type === 'folder').map(n => n.id);
        setExpandedFolders(new Set(folderIds));
    };

    const collapseAll = () => {
        setExpandedFolders(new Set());
    };

    const addNode = async (name, type, parentId = null) => {
        if (!workspaceHandle) return;

        const safeName = name.replace(/[\\/:*?"<>|]/g, '-').trim(); // Sanitize filename
        const idPath = parentId ? `${parentId}/${safeName}` : safeName;

        let existingNode = nodes.find(n => n.id === idPath);
        let finalIdPath = idPath;
        let counter = 1;

        while (existingNode) {
            finalIdPath = `${idPath} (${counter})`;
            existingNode = nodes.find(n => n.id === finalIdPath);
            counter++;
        }

        const finalName = finalIdPath.split('/').pop();

        const newNode = {
            id: finalIdPath,
            name: finalName,
            type,
            parentId,
            ...(type === 'file' ? { content: '' } : {})
        };

        await createNode(workspaceHandle, newNode);
        await loadNodes();

        if (type === 'file') {
            setActiveFileId(newNode.id);
        }
        if (parentId && !expandedFolders.has(parentId)) {
            setExpandedFolders(prev => new Set(prev).add(parentId));
        }
    };

    const editNode = async (id, updates) => {
        if (!workspaceHandle) return;
        const oldNode = nodes.find(n => n.id === id);
        if (!oldNode) return;

        try {
            if (updates.name) {
                updates.name = updates.name.replace(/[\\/:*?"<>|]/g, '-').trim();
            }
            const updatedNode = await updateNode(workspaceHandle, id, updates, oldNode);
            if (updatedNode && updatedNode.id !== id) {
                if (activeFileId === id) setActiveFileId(updatedNode.id);
                if (lastInteractedNodeId === id) setLastInteractedNodeId(updatedNode.id);
            }
            await loadNodes();
        } catch (e) {
            console.error("Edit failed:", e);
            alert(e.message);
        }
    };

    const removeNode = async (id) => {
        if (!workspaceHandle) return;
        const node = nodes.find(n => n.id === id);
        if (!node) return;

        await deleteNode(workspaceHandle, id, node.type);
        if (activeFileId === id) setActiveFileId(null);
        if (lastInteractedNodeId === id) setLastInteractedNodeId(null);
        await loadNodes();
    };

    const handleExport = () => alert("Not needed! Your files are already physical .md files in your workspace folder.");
    const handleImport = () => alert("Not needed! Just drag and drop .md files directly into your workspace folder using your computer's File Explorer.");

    const value = {
        nodes,
        tree,
        activeFileId,
        setActiveFileId,
        expandedFolders,
        toggleFolder,
        expandAll,
        collapseAll,
        addNode,
        editNode,
        removeNode,
        handleExport,
        handleImport,
        isInitializing,
        workspaceHandle,
        selectWorkspace,
        disconnectWorkspace,
        globalAddingState,
        setGlobalAddingState,
        lastInteractedNodeId,
        setLastInteractedNodeId
    };

    return <NotesContext.Provider value={value}>{children}</NotesContext.Provider>;
};

export const useNotes = () => {
    const context = useContext(NotesContext);
    if (!context) throw new Error('useNotes must be used within a NotesProvider');
    return context;
};
