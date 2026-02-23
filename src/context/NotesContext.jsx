import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { loadSavedWorkspace, initWorkspace, requestLocalPermission, clearWorkspaceHandle, getNodes, createNode, updateNode, deleteNode, buildTree } from '../lib/db';

const NotesContext = createContext(undefined);

export const NotesProvider = ({ children }) => {
    const [nodes, setNodes] = useState([]);
    const [workspaceHandle, setWorkspaceHandle] = useState(null); // 'active' flag
    const [isInitializing, setIsInitializing] = useState(true);
    const [needsPermission, setNeedsPermission] = useState(false);

    const [activeFileId, setActiveFileId] = useState(() => localStorage.getItem('redly_activeFileId') || null);
    const [expandedFolders, setExpandedFolders] = useState(() => {
        const saved = localStorage.getItem('redly_expandedFolders');
        return saved ? new Set(JSON.parse(saved)) : new Set();
    });

    const [globalAddingState, setGlobalAddingState] = useState({ type: null, parentId: null });
    const [lastInteractedNodeId, setLastInteractedNodeId] = useState(null);
    const [deferredPrompt, setDeferredPrompt] = useState(null);

    useEffect(() => {
        const handleBeforeInstallPrompt = (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
        };
        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    }, []);

    const installApp = async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            setDeferredPrompt(null);
        }
    };

    // Initial load - check if user already has a workspace configured
    useEffect(() => {
        const init = async () => {
            try {
                const status = await loadSavedWorkspace();
                if (status === true) {
                    setWorkspaceHandle(true);
                    setNodes(await getNodes());
                } else if (status === 'requires_permission') {
                    setNeedsPermission(true);
                }
            } catch (e) {
                console.error("Initialisation failed", e);
            } finally {
                setIsInitializing(false);
            }
        };
        init();
    }, []);

    const loadNodes = useCallback(async () => {
        if (!workspaceHandle) return;
        try { setNodes(await getNodes()); }
        catch (e) { console.error('Failed to load nodes:', e); }
    }, [workspaceHandle]);

    // Function to request permission on boot if returning to a local folder
    const grantLocalPermission = async () => {
        if (await requestLocalPermission()) {
            setNeedsPermission(false);
            setWorkspaceHandle(true);
            setNodes(await getNodes());
        }
    };

    // Updated to handle Tiers 1 and 2
    const selectWorkspace = async (mode = 'sandbox', options = {}) => {
        try {
            await initWorkspace(mode, options);
            setWorkspaceHandle(true);
            setNodes(await getNodes());
        } catch (e) {
            console.error("Workspace selection error", e);
        }
    };

    const disconnectWorkspace = async () => {
        await clearWorkspaceHandle();
        setWorkspaceHandle(null);
        setNeedsPermission(false);
        setNodes([]);
        setActiveFileId(null);
        setExpandedFolders(new Set());
    };

    useEffect(() => {
        if (activeFileId) localStorage.setItem('redly_activeFileId', activeFileId);
        else localStorage.removeItem('redly_activeFileId');
    }, [activeFileId]);

    useEffect(() => {
        localStorage.setItem('redly_expandedFolders', JSON.stringify(Array.from(expandedFolders)));
    }, [expandedFolders]);

    const tree = buildTree(nodes);

    const toggleFolder = (folderId) => {
        setExpandedFolders(prev => {
            const next = new Set(prev);
            if (next.has(folderId)) next.delete(folderId);
            else next.add(folderId);
            return next;
        });
    };

    const expandAll = () => setExpandedFolders(new Set(nodes.filter(n => n.type === 'folder').map(n => n.id)));
    const collapseAll = () => setExpandedFolders(new Set());

    const addNode = async (name, type, parentId = null) => {
        if (!workspaceHandle) return;
        const safeName = name.replace(/[\\/:*?"<>|]/g, '-').trim();
        const idPath = parentId ? `${parentId}/${safeName}` : safeName;

        let existingNode = nodes.find(n => n.id === idPath);
        let finalIdPath = idPath;
        let counter = 1;

        while (existingNode) {
            finalIdPath = `${idPath} (${counter})`;
            existingNode = nodes.find(n => n.id === finalIdPath);
            counter++;
        }

        const newNode = {
            id: finalIdPath,
            name: finalIdPath.split('/').pop(),
            type,
            parentId,
            ...(type === 'file' ? { content: '' } : {})
        };

        await createNode(null, newNode);
        await loadNodes();

        if (type === 'file') setActiveFileId(newNode.id);
        if (parentId && !expandedFolders.has(parentId)) setExpandedFolders(prev => new Set(prev).add(parentId));
    };

    const editNode = async (id, updates) => {
        if (!workspaceHandle) return;
        const oldNode = nodes.find(n => n.id === id);
        if (!oldNode) return;

        if (updates.name) updates.name = updates.name.replace(/[\\/:*?"<>|]/g, '-').trim();
        const updatedNode = await updateNode(null, id, updates, oldNode);

        if (updatedNode && updatedNode.id !== id) {
            if (activeFileId === id) setActiveFileId(updatedNode.id);
            if (lastInteractedNodeId === id) setLastInteractedNodeId(updatedNode.id);
        }
        await loadNodes();
    };

    const removeNode = async (id) => {
        if (!workspaceHandle) return;
        const node = nodes.find(n => n.id === id);
        if (!node) return;

        await deleteNode(null, id, node.type, node);
        if (activeFileId === id) setActiveFileId(null);
        if (lastInteractedNodeId === id) setLastInteractedNodeId(null);
        await loadNodes();
    };

    const value = {
        nodes, tree, activeFileId, setActiveFileId, expandedFolders, toggleFolder, expandAll, collapseAll,
        addNode, editNode, removeNode, isInitializing, workspaceHandle, selectWorkspace, disconnectWorkspace,
        needsPermission, grantLocalPermission, globalAddingState, setGlobalAddingState, lastInteractedNodeId, setLastInteractedNodeId,
        installApp, isInstallable: !!deferredPrompt
    };

    return <NotesContext.Provider value={value}>{children}</NotesContext.Provider>;
};

export const useNotes = () => {
    const context = useContext(NotesContext);
    if (!context) throw new Error('useNotes must be used within a NotesProvider');
    return context;
};