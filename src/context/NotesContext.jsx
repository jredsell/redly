import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { loadSavedWorkspace, initWorkspace, requestLocalPermission, clearWorkspaceHandle, getNodes, createNode, updateNode, deleteNode, buildTree, getHandle, getFileContent } from '../lib/db';
import { parseTasksFromNodes } from '../utils/taskParser';
import { checkUpcomingTasks } from '../utils/notificationManager';

const NotesContext = createContext(undefined);

export const NotesProvider = ({ children }) => {
    const [nodes, setNodes] = useState([]);
    const [workspaceHandle, setWorkspaceHandle] = useState(null); // 'active' flag
    const [storageMode, setStorageMode] = useState(null);
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

    // Refs for performance-sensitive background tasks
    const nodesRef = useRef(nodes);
    useEffect(() => { nodesRef.current = nodes; }, [nodes]);

    const [notificationSettings, setNotificationSettings] = useState(() => {
        const saved = localStorage.getItem('redly_notificationSettings');
        return saved ? JSON.parse(saved) : { enabled: false, leadTime: 10 };
    });
    const [notifiedTaskIds, setNotifiedTaskIds] = useState(new Set());

    useEffect(() => {
        const handleBeforeInstallPrompt = (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
        };
        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    }, []);

    const installApp = async () => {
        console.log('installApp called, deferredPrompt available:', !!deferredPrompt);
        if (!deferredPrompt) return;
        try {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            console.log('PWA Install User Choice Outcome:', outcome);
            if (outcome === 'accepted') {
                setDeferredPrompt(null);
            }
        } catch (err) {
            console.error('PWA Install Prompt Failed:', err);
        }
    };

    // Initial load - check if user already has a workspace configured
    useEffect(() => {
        const init = async () => {
            try {
                const status = await loadSavedWorkspace();
                if (status === true) {
                    setWorkspaceHandle(true);
                    let mode = await getHandle('workspace_mode');
                    if (!mode) mode = localStorage.getItem('redly_last_storage_mode');
                    console.log('[NotesContext] Detected storage mode:', mode);
                    setStorageMode(mode || 'sandbox');
                    setNodes(await getNodes());
                } else if (status === 'requires_permission') {
                    setNeedsPermission(true);
                }
            } catch (e) {
                console.error("[NotesContext] Initialisation failed:", e);
            } finally {
                setIsInitializing(false);
            }
        };
        init();
    }, []);

    const loadNodes = useCallback(async () => {
        if (!workspaceHandle) return;
        try {
            const freshNodes = await getNodes();
            // Simple hash comparison to avoid unnecessary state updates
            setNodes(prev => {
                const prevJson = JSON.stringify(prev);
                const nextJson = JSON.stringify(freshNodes);
                if (prevJson === nextJson) return prev;
                return freshNodes;
            });
        }
        catch (e) {
            console.error('Failed to load nodes:', e);
        }
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
            localStorage.setItem('redly_last_storage_mode', mode); // Fallback for UI sync
            setStorageMode(mode);
            setWorkspaceHandle(true);
            setNodes(await getNodes());
        } catch (e) {
            console.error("Workspace selection error", e);
            throw e; // Re-throw so callers (Sidebar, WelcomeScreen) can handle auth errors
        }
    };

    const disconnectWorkspace = async () => {
        console.log('[NotesContext] Disconnecting workspace...');
        try {
            await clearWorkspaceHandle();
            console.log('[NotesContext] Storage handles cleared.');
        } catch (e) {
            console.error('[NotesContext] Failed to clear handles, proceeding anyway:', e);
        }

        setWorkspaceHandle(null);
        setStorageMode(null);
        setNeedsPermission(false);
        setNodes([]);
        setActiveFileId(null);
        setExpandedFolders(new Set());
        console.log('[NotesContext] Workspace disconnected and state reset.');
    };

    useEffect(() => {
        if (activeFileId) localStorage.setItem('redly_activeFileId', activeFileId);
        else localStorage.removeItem('redly_activeFileId');
    }, [activeFileId]);

    useEffect(() => {
        localStorage.setItem('redly_expandedFolders', JSON.stringify(Array.from(expandedFolders)));
    }, [expandedFolders]);

    useEffect(() => {
        localStorage.setItem('redly_notificationSettings', JSON.stringify(notificationSettings));
    }, [notificationSettings]);

    // Keep a ref to latest notification settings to avoid stale closures in the interval
    const notificationSettingsRef = useRef(notificationSettings);
    useEffect(() => { notificationSettingsRef.current = notificationSettings; }, [notificationSettings]);

    // Background task notification checker
    useEffect(() => {
        if (!notificationSettings.enabled || !workspaceHandle) return;

        const check = async () => {
            const currentNodes = nodesRef.current;

            // Nodes from getNodes() don't have content — load it here
            const nodesWithContent = await Promise.all(
                currentNodes.map(async (node) => {
                    if (node.type !== 'file') return node;
                    if (node.content !== undefined) return node;
                    try {
                        const content = await getFileContent(node.id, node);
                        return { ...node, content };
                    } catch (e) {
                        console.warn('[Notifications] Failed to load content for', node.name, e);
                        return node;
                    }
                })
            );

            const tasks = parseTasksFromNodes(nodesWithContent);
            const settings = notificationSettingsRef.current;

            // Run checkUpcomingTasks OUTSIDE setState to avoid React suppressing side-effects
            setNotifiedTaskIds(prevNotifiedIds => {
                const newIds = checkUpcomingTasks(tasks, settings, prevNotifiedIds);
                if (newIds.length === 0) return prevNotifiedIds;
                const next = new Set(prevNotifiedIds);
                newIds.forEach(id => next.add(id));
                return next;
            });
        };

        const interval = setInterval(check, 60000);
        check(); // Run immediately on enable

        return () => clearInterval(interval);
    }, [notificationSettings.enabled, workspaceHandle]);

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
        const extension = type === 'file' ? '.md' : '';
        const idPath = parentId ? `${parentId}/${safeName}${extension}` : `${safeName}${extension}`;

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
            name: safeName,
            type,
            parentId,
            ...(type === 'file' ? { content: '' } : {})
        };

        const previousNodes = nodes;
        setNodes(prev => [...prev, newNode]);
        if (type === 'file') setActiveFileId(newNode.id);
        if (parentId && !expandedFolders.has(parentId)) {
            setExpandedFolders(prev => new Set(prev).add(parentId));
        }

        try {
            await createNode(null, newNode);
            // We don't necessarily need to loadNodes() here if createNode 
            // successfully updates the backend-specific metadata (like gdriveId) 
            // in the local driver's internal state/cache. 
            // But for safety and to get formal IDs:
            await loadNodes();
        } catch (e) {
            console.error("Failed to add node:", e);
            setNodes(previousNodes);
            alert("Error: Could not create " + type + ". Reverting changes.");
        }
    };

    const editNode = async (id, updates) => {
        if (!workspaceHandle) return;
        const oldNode = nodes.find(n => n.id === id);
        if (!oldNode) return;

        const previousNodes = nodes;
        const previousActiveFileId = activeFileId;
        const previousLastInteractedNodeId = lastInteractedNodeId;

        // Optimistically update
        setNodes(prev => prev.map(n => {
            if (n.id !== id) return n;
            const updated = { ...n, ...updates };
            // Note: if name changed, id should probably change too for local logic
            // but the current architecture uses path as ID. 
            // If the name changed, we'll wait for the backend's result to get the new formal path ID.
            return updated;
        }));

        try {
            const updatedNode = await updateNode(null, id, updates, oldNode);
            if (updatedNode && updatedNode.id !== id) {
                if (activeFileId === id) setActiveFileId(updatedNode.id);
                if (lastInteractedNodeId === id) setLastInteractedNodeId(updatedNode.id);
            }
            await loadNodes();
        } catch (e) {
            console.error("Failed to edit node:", e);
            setNodes(previousNodes);
            setActiveFileId(previousActiveFileId);
            setLastInteractedNodeId(previousLastInteractedNodeId);
            alert("Error: Could not update item. Reverting changes.");
        }
    };

    const removeNode = async (id) => {
        if (!workspaceHandle) return;
        const node = nodes.find(n => n.id === id);
        if (!node) return;

        const previousNodes = nodes;
        setNodes(prev => prev.filter(n => n.id !== id));
        if (activeFileId === id) setActiveFileId(null);
        if (lastInteractedNodeId === id) setLastInteractedNodeId(null);

        try {
            await deleteNode(null, id, node.type, node);
            await loadNodes();
        } catch (e) {
            console.error("Failed to remove node:", e);
            setNodes(previousNodes);
            alert("Error: Could not delete item. Reverting changes.");
        }
    };

    const ensureAllContentsLoaded = async () => {
        const filesToLoad = nodes.filter(n => n.type === 'file' && n.content === undefined);
        if (filesToLoad.length === 0) return;

        console.log(`[GlobalTasks] Loading content for ${filesToLoad.length} files...`);

        // Load all missing contents
        const updatedNodes = await Promise.all(nodes.map(async (node) => {
            if (node.type === 'file' && node.content === undefined) {
                try {
                    const content = await getFileContent(node.id, node);
                    return { ...node, content };
                } catch (e) {
                    console.error(`Failed to load content for ${node.id}:`, e);
                    return node;
                }
            }
            return node;
        }));

        setNodes(updatedNodes);
    };

    const value = {
        nodes, tree, activeFileId, setActiveFileId, expandedFolders, toggleFolder, expandAll, collapseAll,
        addNode, editNode, removeNode, getFileContent, ensureAllContentsLoaded, isInitializing, workspaceHandle, storageMode, selectWorkspace, disconnectWorkspace,
        needsPermission, grantLocalPermission, globalAddingState, setGlobalAddingState, lastInteractedNodeId, setLastInteractedNodeId,
        installApp, isInstallable: !!deferredPrompt,
        notificationSettings, setNotificationSettings
    };

    return <NotesContext.Provider value={value}>{children}</NotesContext.Provider>;
};

export const useNotes = () => {
    const context = useContext(NotesContext);
    if (!context) throw new Error('useNotes must be used within a NotesProvider');
    return context;
};