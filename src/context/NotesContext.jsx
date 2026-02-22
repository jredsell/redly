import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { getSavedWorkspaceHandle, saveWorkspaceHandle, clearWorkspaceHandle, verifyPermission, getNodes, createNode, updateNode, deleteNode, buildTree } from '../lib/db';

const NotesContext = createContext(undefined);

export const NotesProvider = ({ children }) => {
    const [nodes, setNodes] = useState([]);
    const [workspaceHandle, setWorkspaceHandle] = useState(null);
    const [pendingHandle, setPendingHandle] = useState(null);
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
                    const permission = await savedHandle.queryPermission({ mode: 'readwrite' });
                    if (permission === 'granted') {
                        setWorkspaceHandle(savedHandle);
                        const allNodes = await getNodes(savedHandle);
                        setNodes(allNodes);
                    } else {
                        // We have the handle but not the permission. Requires user gesture.
                        setPendingHandle(savedHandle);
                    }
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
            const rootHandle = await window.showDirectoryPicker({ mode: 'readwrite' });

            let handle = rootHandle;
            if (rootHandle.name !== 'redly') {
                handle = await rootHandle.getDirectoryHandle('redly', { create: true });
            }

            await saveWorkspaceHandle(handle);
            setWorkspaceHandle(handle);
            setIsInitializing(true);
            const allNodes = await getNodes(handle);
            setNodes(allNodes);
        } catch (e) {
            if (e.name !== 'AbortError') {
                console.error("Picker error", e);
                const isFirefox = navigator.userAgent.toLowerCase().includes('firefox');
                const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

                let errorMsg = e.message || 'Unknown error';
                if (!window.showDirectoryPicker) {
                    errorMsg = "Your browser does not support the File System Access API. Please use Google Chrome, Microsoft Edge, Brave, or Opera.";
                } else if (isFirefox || isSafari) {
                    errorMsg = "Firefox and Safari do not support this feature yet. Please use Chrome or Edge.";
                } else if (e.name === 'SecurityError') {
                    errorMsg = "Security Error: The browser blocked access. This often happens if you try to select a restricted system folder (like 'C:\\' or 'Downloads'). Step inside a normal folder first.";
                }

                alert(`Could not open directory:\n\n${errorMsg}\n\nTechnical details: ${e.name}`);
            }
        } finally {
            setIsInitializing(false);
        }
    };

    const disconnectWorkspace = async () => {
        await clearWorkspaceHandle();
        setWorkspaceHandle(null);
        setPendingHandle(null);
        setNodes([]);
        setActiveFileId(null);
        setLastInteractedNodeId(null);
        setExpandedFolders(new Set());
    };

    const restoreWorkspace = async () => {
        if (!pendingHandle) return;
        setIsInitializing(true);
        try {
            const hasPermission = await verifyPermission(pendingHandle);
            if (hasPermission) {
                setWorkspaceHandle(pendingHandle);
                setPendingHandle(null);
                const allNodes = await getNodes(pendingHandle);
                setNodes(allNodes);
            }
        } catch (e) {
            console.error("Restore failed", e);
        } finally {
            setIsInitializing(false);
        }
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
        pendingHandle,
        selectWorkspace,
        restoreWorkspace,
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
