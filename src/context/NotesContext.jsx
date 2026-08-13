import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { loadSavedWorkspaces, initWorkspace, disconnectWorkspace, clearAllWorkspaces, getWorkspaces, getNodes, createNode, updateNode, deleteNode, buildTree, getHandle, getFileContent, getFileBlob, getTrashNodes, restoreNode, emptyTrash, sync } from '../lib/db';
import * as localDriver from '../lib/local_driver';
import { parseTasksFromNodes } from '../utils/taskParser';
import { checkUpcomingTasks } from '../utils/notificationManager';
import { buildBacklinkIndex } from '../utils/backlinkHelper';
import * as syncEngine from '../lib/sync_engine';


const NotesContext = createContext(undefined);

export const NotesProvider = ({ children }) => {
    const [nodes, setNodes] = useState([]);
    const [trashNodes, setTrashNodes] = useState([]);
    const [backlinkIndex, setBacklinkIndex] = useState(new Map());
    const [workspaceHandle, setWorkspaceHandle] = useState(null); // 'active' flag
    const [storageMode, setStorageMode] = useState(null);
    const [isInitializing, setIsInitializing] = useState(true);
    const [syncStatus, setSyncStatus] = useState(syncEngine.getSyncStatus());
    const [needsPermission, setNeedsPermission] = useState(false);
    const [migrationStatus, setMigrationStatus] = useState(null); // 'migrating', 'complete', or null
    const [isSyncing, setIsSyncing] = useState(false);


    const [activeFileId, setActiveFileId] = useState(() => localStorage.getItem('redly_activeFileId') || null);
    const [expandedFolders, setExpandedFolders] = useState(() => {
        const saved = localStorage.getItem('redly_expandedFolders');
        return saved ? new Set(JSON.parse(saved)) : new Set();
    });

    const [globalAddingState, setGlobalAddingState] = useState({ type: null, parentId: null });
    const [lastInteractedNodeId, setLastInteractedNodeId] = useState(null);
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [showInstallModal, setShowInstallModal] = useState(false);
    const [isPwaInstalled, setIsPwaInstalled] = useState(() => {
        return localStorage.getItem('redly_pwa_installed') === 'true';
    });

    const [isDarkMode, setIsDarkMode] = useState(() => {
        const saved = localStorage.getItem('theme');
        if (saved) return saved === 'dark';
        return true; // Default to dark mode
    });

    const [syncPulse, setSyncPulse] = useState(0);
    const triggerSyncPulse = useCallback(() => setSyncPulse(p => p + 1), []);

    useEffect(() => {
        if (isDarkMode) {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }
    }, [isDarkMode]);

    // Refs for performance-sensitive background tasks
    const nodesRef = useRef(nodes);
    useEffect(() => { nodesRef.current = nodes; }, [nodes]);

    const [notificationSettings, setNotificationSettings] = useState(() => {
        const saved = localStorage.getItem('redly_notificationSettings');
        return saved ? JSON.parse(saved) : { enabled: false, leadTime: 10 };
    });
    const [notifiedTaskIds, setNotifiedTaskIds] = useState(new Set());

    useEffect(() => {
        const updateStatus = (status) => setSyncStatus(status);
        syncEngine.onSyncStatusChanged(updateStatus);
        return () => syncEngine.removeSyncStatusChanged(updateStatus);
    }, []);

    useEffect(() => {
        if (!workspaceHandle || nodes.length === 0) {
            setBacklinkIndex(new Map());
            return;
        }

        // This calculates backlinks in the background without blocking render.
        // It relies on the nodes having content, or pulling from the cache map if needed.
        // Since we lazy load content, we might not have all content strictly in `nodes`.
        // The most accurate way is for the Editor to save content to nodes, which happens eventually.
        const calculateBacklinks = async () => {
            const index = buildBacklinkIndex(nodes);
            setBacklinkIndex(index);
        };

        // Use a small timeout to not block the main thread during heavy typing
        const timeoutId = setTimeout(calculateBacklinks, 500);
        return () => clearTimeout(timeoutId);
    }, [nodes, workspaceHandle]);

    const handleBeforeInstallPrompt = useCallback((e) => {
        e.preventDefault();
        setDeferredPrompt(e);
    }, []);

    const handleAppInstalled = useCallback(() => {
        setIsPwaInstalled(true);
        localStorage.setItem('redly_pwa_installed', 'true');
        setDeferredPrompt(null);
    }, []);

    const handleDeferredPromptCaptured = useCallback(() => {
        setDeferredPrompt(window.__DEFERRED_PROMPT__);
    }, []);

    useEffect(() => {
        // If the PWA is opened in standalone mode, auto-detect it's installed
        if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone) {
            setIsPwaInstalled(true);
            localStorage.setItem('redly_pwa_installed', 'true');
        }

        // Check if the global interceptor already caught it
        if (window.__DEFERRED_PROMPT__) {
            setDeferredPrompt(window.__DEFERRED_PROMPT__);
        } else {
            // Otherwise listen for the global custom event or the native event
            window.addEventListener('deferred-prompt-captured', handleDeferredPromptCaptured);
        }
    }, [handleDeferredPromptCaptured]);

    const installApp = async () => {
        if (deferredPrompt) {
            try {
                deferredPrompt.prompt();
                const { outcome } = await deferredPrompt.userChoice;

                if (outcome === 'accepted') {
                    setIsPwaInstalled(true);
                    localStorage.setItem('redly_pwa_installed', 'true');
                }

                setDeferredPrompt(null);
            } catch (err) {
                console.error('[NotesContext] PWA Install Prompt Failed:', err);
                setShowInstallModal(true); // Fallback to modal on error
                setDeferredPrompt(null);
            }
        } else {
            // No native prompt available, show our premium guide instead
            setShowInstallModal(true);
        }
    };

    // Initial load - check if user already has a workspace configured
    useEffect(() => {
        const init = async () => {
            try {
                // Perform one-time migration check from legacy storage
                const { migrateFromLegacy } = await import('../lib/storage_migration');
                setMigrationStatus('migrating');
                const wasMigrated = await migrateFromLegacy();
                if (wasMigrated) setMigrationStatus('complete');
                else setMigrationStatus(null);

                const status = await loadSavedWorkspaces();
                if (status === true) {
                    setWorkspaceHandle(true);
                    
                    const nodes = await getNodes();
                    setNodes(nodes);
                    setTrashNodes(await getTrashNodes());
                    syncEngine.broadcastSync();

                    setIsSyncing(true);
                    sync().then(() => loadNodes()).finally(() => setIsSyncing(false));
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

    const loadTrashNodes = useCallback(async () => {
        if (!workspaceHandle) return;
        try {
            const freshTrash = await getTrashNodes();
            setTrashNodes(freshTrash);
        } catch (e) {
            console.error('Failed to load trash nodes:', e);
        }
    }, [workspaceHandle]);


    // Function to request permission on boot if returning to a local folder
    const grantLocalPermission = async () => {
        // Handled automatically via file picker if needed during workspace add
    };

    const addWorkspaceInstance = async (mode = 'sandbox', options = {}) => {
        try {
            await initWorkspace(mode, options);

            setWorkspaceHandle(true);
            const nodes = await getNodes();
            setNodes(nodes);
            setTrashNodes(await getTrashNodes());
            syncEngine.broadcastSync();

            if (mode === 'github') {
                setIsSyncing(true);
                await sync();
                await loadNodes();
                setIsSyncing(false);
            }
        } catch (e) {
            console.error("Workspace selection error", e);
            throw e; 
        }
    };

    const disconnectWorkspace = async () => {

        try {
            await clearWorkspaceHandle();

        } catch (e) {
            console.error('[NotesContext] Failed to clear handles, proceeding anyway:', e);
        }

        setWorkspaceHandle(null);
        setStorageMode(null);
        setNeedsPermission(false);
        setNodes([]);
        setTrashNodes([]);
        setActiveFileId(null);
        setExpandedFolders(new Set());

    };

    useEffect(() => {
        if (activeFileId) localStorage.setItem('redly_activeFileId', activeFileId);
        else localStorage.removeItem('redly_activeFileId');
    }, [activeFileId]);

    useEffect(() => {
        // If the active file gets deleted natively or remotely via Sync, gracefully exit the editor
        if (activeFileId && workspaceHandle && !isInitializing) {
            const fileStillExists = nodes.some(n => n.id === activeFileId);
            if (!fileStillExists) {
                // React states can overlap during background loadNodes() async delays.
                // Verify against hard metal disk to prevent false editor evictions after Alt+N.
                const verifyAndEvict = async () => {
                    try {
                        await localDriver.getFileContent(activeFileId);
                        // File exists, it was a stale React render gap. Ignore.
                    } catch (e) {
                        // console.log(`[NotesContext] Active file ${activeFileId} was confirmed deleted natively. Evicting editor.`);
                        setActiveFileId(null);
                    }
                };
                verifyAndEvict();
            }
        }
    }, [nodes, activeFileId, workspaceHandle, isInitializing]);

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
                        const content = await getFileContent(node.id);
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

    // Background Image Garbage Collection
    useEffect(() => {
        if (!workspaceHandle) return;

        const runGarbageCollection = async () => {
            const currentNodes = nodesRef.current;
            const binaryNodes = currentNodes.filter(n => n.type === 'binary');
            if (binaryNodes.length === 0) return;

            const referencedImages = new Set();
            const mdNodes = currentNodes.filter(n => n.type === 'file');

            for (const node of mdNodes) {
                let content = node.content;
                if (content === undefined) {
                    try {
                        content = await getFileContent(node.id);
                    } catch (e) {
                        continue;
                    }
                }
                if (!content) continue;

                // Match Markdown images: ![alt](...)
                const imgRegex = /!\[.*?\]\((.*?)\)/g;
                let match;
                while ((match = imgRegex.exec(content)) !== null) {
                    let inner = match[1].trim();
                    if (inner.startsWith('<')) {
                        const endIdx = inner.indexOf('>');
                        if (endIdx !== -1) inner = inner.substring(1, endIdx);
                    } else {
                        const spaceIdx = inner.indexOf(' ');
                        if (spaceIdx !== -1) inner = inner.substring(0, spaceIdx);
                    }
                    let decodedSrc = inner;
                    try { decodedSrc = decodeURIComponent(inner); } catch(e) {}
                    referencedImages.add(decodedSrc);
                }
            }

            // Find unreferenced binaries
            const unreferenced = binaryNodes.filter(n => !referencedImages.has(n.id) && !referencedImages.has(n.name));
            
            for (const node of unreferenced) {
                try {
                    console.log(`[GarbageCollector] Deleting unreferenced image: ${node.id}`);
                    await removeNode(node.id);
                } catch(e) {
                    console.error('Failed to garbage collect', node.id, e);
                }
            }
        };

        const initialTimeout = setTimeout(runGarbageCollection, 5000);
        const interval = setInterval(runGarbageCollection, 2 * 60 * 1000); // Check every 2 minutes

        return () => {
            clearTimeout(initialTimeout);
            clearInterval(interval);
        };
    }, [workspaceHandle]);

    const tree = buildTree(nodes.filter(n => {
        if (n.type === 'binary') return false;
        const parts = n.id.split('/');
        // Hide anything in a dot-folder (like .templates, .trash, .sync) from the main tree
        return !parts.some(p => p.startsWith('.') && p !== '.');
    }));

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

    const openAndExpandFile = (fileId) => {
        const targetNode = nodes.find(n => n.id === fileId);
        if (!targetNode) return;

        setActiveFileId(fileId);
        setLastInteractedNodeId(fileId);

        let currentParentId = targetNode.parentId;
        if (currentParentId) {
            const parentsToExpand = [];
            while (currentParentId) {
                parentsToExpand.push(currentParentId);
                const parentNode = nodes.find(n => n.id === currentParentId);
                currentParentId = parentNode ? parentNode.parentId : null;
            }

            setExpandedFolders(prev => {
                const next = new Set(prev);
                parentsToExpand.forEach(id => next.add(id));
                return next;
            });
        }
    };

    const addNode = async (name, type, parentId = null, autoOpen = true, initialContent = '') => {
        if (!parentId) {
            const workspaces = await getWorkspaces();
            if (workspaces.length > 0) {
                parentId = workspaces[0].id;
            } else {
                throw new Error("No active workspaces");
            }
        }

        if (!workspaceHandle) return;
        const safeName = name.replace(/[\\/:*?"<>|]/g, '-').trim();
        const extension = type === 'file' ? '.md' : '';
        const separator = parentId ? (parentId.includes('::') ? '/' : '::') : '';
        const idPath = parentId ? `${parentId}${separator}${safeName}${extension}` : `${safeName}${extension}`;

        let existingNode = nodes.find(n => n.id === idPath);
        let finalIdPath = idPath;
        let counter = 1;

        while (existingNode) {
            finalIdPath = parentId ? `${parentId}${separator}${safeName} (${counter})${extension}` : `${safeName} (${counter})${extension}`;
            existingNode = nodes.find(n => n.id === finalIdPath);
            counter++;
        }

        const newNode = {
            id: finalIdPath,
            name: safeName,
            type,
            parentId,
            ...(type === 'file' ? { content: initialContent } : {})
        };

        const previousNodes = nodes;
        setNodes(prev => [...prev, newNode]);
        if (type === 'file' && autoOpen) setActiveFileId(newNode.id);
        if (parentId && !expandedFolders.has(parentId)) {
            setExpandedFolders(prev => new Set(prev).add(parentId));
        }

        try {
            await createNode(newNode);
            // We don't necessarily need to loadNodes() here if createNode 
            // successfully updates the backend-specific metadata (like gdriveId) 
            // in the local driver's internal state/cache. 
            // But for safety and to get formal IDs:
            await loadNodes();
            syncEngine.broadcastSync();
            return newNode;
        } catch (e) {
            console.error("Failed to add node:", e);
            setNodes(previousNodes);
            alert("Error: Could not create " + type + ". Reverting changes.");
            return null;
        }
    };

    const addBinaryNode = async (name, parentId, binaryData) => {
        if (!parentId) {
            const workspaces = await getWorkspaces();
            if (workspaces.length > 0) {
                parentId = workspaces[0].id;
            } else {
                throw new Error("No active workspaces");
            }
        }
        if (!workspaceHandle) return;
        const safeName = name.replace(/[\\/:*?"<>|]/g, '-').trim();
        const separator = parentId ? (parentId.includes('::') ? '/' : '::') : '';
        const idPath = parentId ? `${parentId}${separator}${safeName}` : `${safeName}`;

        let existingNode = nodes.find(n => n.id === idPath);
        let finalIdPath = idPath;
        let counter = 1;

        while (existingNode) {
            const parts = safeName.split('.');
            const ext = parts.length > 1 ? `.${parts.pop()}` : '';
            const base = parts.join('.');
            finalIdPath = parentId ? `${parentId}${separator}${base} (${counter})${ext}` : `${base} (${counter})${ext}`;
            existingNode = nodes.find(n => n.id === finalIdPath);
            counter++;
        }

        const finalName = separator ? finalIdPath.split(separator).pop() : finalIdPath;

        const newNode = {
            id: finalIdPath,
            name: finalName,
            type: 'binary',
            parentId,
            content: binaryData
        };

        const previousNodes = nodes;
        setNodes(prev => [...prev, newNode]);

        try {
            await createNode(newNode);
            await loadNodes();
            syncEngine.broadcastSync();
            return newNode;
        } catch (e) {
            console.error("Failed to add binary node:", e);
            setNodes(previousNodes);
            alert("Error: Could not save image.");
            return null;
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
            // Auto bi-directional linking
            if (updates.content !== undefined) {
                const oldContent = oldNode.content !== undefined ? oldNode.content : (await getFileContent(oldNode.id) || '');
                if (updates.content !== oldContent) {
                    const { extractLinks } = await import('../utils/backlinkHelper.js');
                    const oldLinks = extractLinks(oldContent);
                    const newLinks = extractLinks(updates.content);
                    const addedLinks = newLinks.filter(l => !oldLinks.includes(l));

                    for (const targetName of addedLinks) {
                        const targetNode = nodes.find(n => n.name.toLowerCase() === targetName.toLowerCase() && n.type === 'file');
                        if (targetNode && targetNode.id !== id) {
                            const currentTargetContent = targetNode.content !== undefined ? targetNode.content : (await getFileContent(targetNode.id) || '');
                            const targetLinks = extractLinks(currentTargetContent);
                            if (!targetLinks.includes(oldNode.name)) {
                                const newTargetContent = (currentTargetContent || '') + `\n\n[[${oldNode.name}]]`;
                                await updateNode(targetNode.id, { content: newTargetContent }, targetNode);
                            }
                        }
                    }
                }
            }

            const updatedNode = await updateNode(id, updates, oldNode);
            if (updatedNode && updatedNode.id !== id) {
                // Synchronously inject the new ID into state so the eviction observer doesn't trip
                setNodes(prev => prev.map(n => n.id === id ? updatedNode : n));
                if (activeFileId === id) setActiveFileId(updatedNode.id);
                if (lastInteractedNodeId === id) setLastInteractedNodeId(updatedNode.id);
            }
            await loadNodes();
            syncEngine.broadcastSync();
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
            await deleteNode(id, node.type);
            await loadNodes();
            await loadTrashNodes();
            syncEngine.broadcastSync();
        } catch (e) {
            console.error("Failed to remove node:", e);
            setNodes(previousNodes);
            alert("Error: Could not delete item. Reverting changes.");
        }
    };

    const disconnectWorkspaceById = async (workspaceId) => {
        if (collabManager.provider) {
            stopCollaboration();
        }
        try {
            await disconnectWorkspace(workspaceId);
            const workspaces = await getWorkspaces();
            if (workspaces.length === 0) {
                setNodes([]);
                setTrashNodes([]);
                setWorkspaceHandle(false);
                setStorageMode(null);
            } else {
                await loadNodes();
            }
        } catch (e) {
            console.error("Failed to disconnect workspace", e);
        }
    };

    const emptyTrashList = async () => {
        if (!workspaceHandle) return;
        try {
            await emptyTrash();
            await loadTrashNodes();
            syncEngine.broadcastSync();
        } catch (e) {
            console.error("Failed to empty trash:", e);
        }
    };

    const restoreNodeList = async (trashId) => {
        if (!workspaceHandle) return;
        try {
            await restoreNode(trashId);
            await loadNodes();
            await loadTrashNodes();
            syncEngine.broadcastSync();
        } catch (e) {
            console.error("Failed to restore node:", e);
        }
    };


    const ensureAllContentsLoaded = async () => {
        const filesToLoad = nodes.filter(n => n.type === 'file' && n.content === undefined);
        if (filesToLoad.length === 0) return;



        // Load all missing contents
        const updatedNodes = await Promise.all(nodes.map(async (node) => {
            if (node.type === 'file' && node.content === undefined) {
                try {
                    const content = await getFileContent(node.id);
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

    const switchWorkspaceToGithub = async (config, shouldMigrate = false) => {
        setIsSyncing(true);
        try {
            if (shouldMigrate) {
                await migrateToGithub(config);
            } else {
                await initWorkspace('github', { config });
            }
            setStorageMode('github');
            setWorkspaceHandle(true);
            await loadNodes();
            setTrashNodes(await getTrashNodes());
            syncEngine.broadcastSync();
        } catch (e) {
            console.error('[NotesContext] GitHub Migration/Switch Failed:', e);
            throw e;
        } finally {
            setIsSyncing(false);
        }
    };



    useEffect(() => {
        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        window.addEventListener('appinstalled', handleAppInstalled);

        // Sync on focus for GitHub/Cloud modes
        const handleFocus = async () => {
            if (storageMode === 'github' && !isSyncing) {
                setIsSyncing(true);
                try {
                    await sync();
                    await loadNodes();
                } catch (e) {
                    console.warn('[Sync] Auto-pull on focus failed:', e);
                } finally {
                    setIsSyncing(false);
                }
            }
        };
        window.addEventListener('focus', handleFocus);

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
            window.removeEventListener('appinstalled', handleAppInstalled);
            window.removeEventListener('focus', handleFocus);
        };
    }, [storageMode, isSyncing, sync, loadNodes]);

    const value = {
        nodes, tree, trashNodes, activeFileId, setActiveFileId, expandedFolders, toggleFolder, expandAll, collapseAll, openAndExpandFile,
        addNode, addBinaryNode, editNode, removeNode, restoreNodeList, emptyTrashList, getFileContent, getFileBlob, ensureAllContentsLoaded, isInitializing, workspaceHandle, storageMode,
        addWorkspaceInstance, disconnectWorkspaceById,
        needsPermission, grantLocalPermission, globalAddingState, setGlobalAddingState, lastInteractedNodeId, setLastInteractedNodeId,
        loadNodes,
        installApp,
        isInstallable: !isPwaInstalled && !window.matchMedia('(display-mode: standalone)').matches && (!window.navigator.standalone),
        showInstallModal, setShowInstallModal,
        notificationSettings, setNotificationSettings,
        isDarkMode, setIsDarkMode,
        syncPulse, triggerSyncPulse, syncStatus, backlinkIndex,
        isSyncing, sync
    };

    return <NotesContext.Provider value={value}>{children}</NotesContext.Provider>;
};

export const useNotes = () => {
    const context = useContext(NotesContext);
    if (!context) throw new Error('useNotes must be used within a NotesProvider');
    return context;
};