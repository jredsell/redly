const { app, BrowserWindow, ipcMain, dialog, Menu, shell, net } = require('electron');
const path = require('path');
const fs = require('fs/promises');

// Disable warn-about-insecure-content where appropriate or disable hardware acceleration if needed.
let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        icon: path.join(__dirname, '../redly_logo.png'),
        webPreferences: {
            preload: path.join(__dirname, 'preload.cjs'),
            contextIsolation: true,
            nodeIntegration: false
        }
    });

    const isDev = process.env.VITE_DEV_SERVER_URL;
    if (isDev) {
        mainWindow.loadURL(isDev);
    } else {
        mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    }
}

// Update Checker (Portable)
async function checkForUpdates(manualCheck = false) {
    try {
        const currentVersion = app.getVersion();
        const request = net.request('https://api.github.com/repos/jredsell/redly/releases/latest');

        request.on('response', (response) => {
            let data = '';
            response.on('data', (chunk) => { data += chunk; });
            response.on('end', () => {
                if (response.statusCode === 200) {
                    const release = JSON.parse(data);
                    // Standardize semver without the 'v'
                    const latestVersion = release.tag_name.replace(/^v/, '');

                    if (latestVersion && latestVersion !== currentVersion) {
                        dialog.showMessageBox(mainWindow, {
                            type: 'info',
                            title: 'Update Available',
                            message: `A new version of Redly (v${latestVersion}) is available!`,
                            detail: `You are currently running v${currentVersion}.\n\nWould you like to download the new portable version now?`,
                            buttons: ['Yes, Download Update', 'No, Later'],
                            defaultId: 0,
                            cancelId: 1
                        }).then(result => {
                            if (result.response === 0) {
                                shell.openExternal(release.html_url);
                            }
                        });
                    } else if (manualCheck) {
                        dialog.showMessageBox(mainWindow, {
                            type: 'info',
                            title: 'Up to Date',
                            message: 'You are running the latest version of Redly!',
                            detail: `Current version: v${currentVersion}`
                        });
                    }
                } else if (manualCheck) {
                    dialog.showErrorBox('Update Check Failed', 'Could not reach GitHub releases. Please check your connection.');
                }
            });
        });

        // Custom User-Agent required by GitHub API
        request.setHeader('User-Agent', 'Redly-Electron-App');
        request.end();
    } catch (error) {
        if (manualCheck) {
            dialog.showErrorBox('Update Check Error', error.message);
        }
    }
}

function setupApplicationMenu() {
    const isMac = process.platform === 'darwin';
    const template = [
        // { role: 'appMenu' }
        ...(isMac
            ? [{
                label: app.name,
                submenu: [
                    { role: 'about' },
                    { type: 'separator' },
                    { role: 'services' },
                    { type: 'separator' },
                    { role: 'hide' },
                    { role: 'hideOthers' },
                    { role: 'unhide' },
                    { type: 'separator' },
                    { role: 'quit' }
                ]
            }]
            : []),
        // { role: 'fileMenu' }
        {
            label: 'File',
            submenu: [
                isMac ? { role: 'close' } : { role: 'quit' }
            ]
        },
        // { role: 'viewMenu' }
        {
            label: 'View',
            submenu: [
                { role: 'reload' },
                { role: 'forceReload' },
                { role: 'toggleDevTools' },
                { type: 'separator' },
                { role: 'resetZoom' },
                { role: 'zoomIn' },
                { role: 'zoomOut' },
                { type: 'separator' },
                { role: 'togglefullscreen' }
            ]
        },
        {
            label: 'Help',
            submenu: [
                {
                    label: 'About Redly',
                    click: () => {
                        dialog.showMessageBox(mainWindow, {
                            type: 'info',
                            title: 'About Redly',
                            message: `Redly v${app.getVersion()}`,
                            detail: "Your offline-first Markdown knowledge base.\n\nCreated by jredsell."
                        });
                    }
                },
                {
                    label: 'Check for Updates...',
                    click: () => checkForUpdates(true)
                }
            ]
        }
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
}

app.whenReady().then(() => {
    setupApplicationMenu();
    createWindow();


    mainWindow.webContents.on('did-finish-load', () => {
        checkForUpdates(false); // Silent background check
    });

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

// File System IPC Handlers
ipcMain.handle('dialog:openDirectory', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
        properties: ['openDirectory']
    });
    if (canceled) return null;
    return filePaths[0];
});

ipcMain.handle('fs:walk', async (event, rootPath) => {
    try {
        const nodes = [];
        async function walk(dir, currentRelative = '') {
            const entries = await fs.readdir(dir, { withFileTypes: true });
            for (let entry of entries) {
                if (entry.name.startsWith('.')) continue; // skip hidden

                const fullPath = path.join(dir, entry.name);
                const relPath = currentRelative ? `${currentRelative}/${entry.name}` : entry.name;

                if (entry.isFile() && entry.name.endsWith('.md')) {
                    const content = await fs.readFile(fullPath, 'utf8');
                    const stat = await fs.stat(fullPath);
                    const nameWithoutExt = entry.name.replace(/\.md$/, '');
                    const idPath = currentRelative ? `${currentRelative}/${nameWithoutExt}` : nameWithoutExt;

                    nodes.push({
                        id: idPath,
                        name: nameWithoutExt,
                        type: 'file',
                        parentId: currentRelative || null,
                        content: content,
                        updatedAt: stat.mtimeMs
                    });
                } else if (entry.isDirectory()) {
                    nodes.push({
                        id: relPath,
                        name: entry.name,
                        type: 'folder',
                        parentId: currentRelative || null,
                        updatedAt: Date.now()
                    });
                    await walk(fullPath, relPath);
                }
            }
        }
        await walk(rootPath);
        return nodes;
    } catch (e) {
        console.error('Walk error', e);
        throw e;
    }
});

async function safeWrite(fullPath, content) {
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, content, 'utf8');
}

ipcMain.handle('fs:createNode', async (event, rootPath, node) => {
    try {
        if (node.type === 'file') {
            const fullPath = path.join(rootPath, node.id + '.md');
            await safeWrite(fullPath, node.content || '');
            const stat = await fs.stat(fullPath);
            return { ...node, updatedAt: stat.mtimeMs };
        } else {
            const fullPath = path.join(rootPath, node.id);
            await fs.mkdir(fullPath, { recursive: true });
            return { ...node, updatedAt: Date.now() };
        }
    } catch (e) {
        console.error('Create error', e);
        throw e;
    }
});

ipcMain.handle('fs:updateNode', async (event, rootPath, id, updates, oldNode) => {
    try {
        if (updates.name && updates.name !== oldNode.name) {
            // Rename
            const parentRelative = oldNode.parentId;
            const newId = parentRelative ? `${parentRelative}/${updates.name}` : updates.name;
            const content = updates.content !== undefined ? updates.content : oldNode.content;

            if (oldNode.type === 'file') {
                const oldPath = path.join(rootPath, oldNode.id + '.md');
                const newPath = path.join(rootPath, newId + '.md');

                await fs.rename(oldPath, newPath);
                if (updates.content !== undefined) {
                    await fs.writeFile(newPath, content, 'utf8');
                }
                const stat = await fs.stat(newPath);
                return { id: newId, name: updates.name, type: 'file', parentId: parentRelative, content, updatedAt: stat.mtimeMs };
            } else {
                const oldPath = path.join(rootPath, oldNode.id);
                const newPath = path.join(rootPath, newId);
                await fs.rename(oldPath, newPath);
                return { id: newId, name: updates.name, type: 'folder', parentId: parentRelative, updatedAt: Date.now() };
            }
        } else {
            // Content Update / Move
            if (oldNode.type === 'file' && updates.content !== undefined) {
                const fullPath = path.join(rootPath, id + '.md');
                await fs.writeFile(fullPath, updates.content, 'utf8');
                const stat = await fs.stat(fullPath);
                return { ...oldNode, content: updates.content, updatedAt: stat.mtimeMs };
            } else if (updates.parentId !== undefined && updates.parentId !== oldNode.parentId) {
                // Move logic 
                const newParentId = updates.parentId;
                const newId = newParentId ? `${newParentId}/${oldNode.name}` : oldNode.name;

                if (oldNode.type === 'file') {
                    const oldPath = path.join(rootPath, oldNode.id + '.md');
                    const newPath = path.join(rootPath, newId + '.md');
                    await fs.mkdir(path.dirname(newPath), { recursive: true });
                    await fs.rename(oldPath, newPath);
                    const stat = await fs.stat(newPath);
                    return { ...oldNode, id: newId, parentId: newParentId, updatedAt: stat.mtimeMs };
                } else {
                    const oldPath = path.join(rootPath, oldNode.id);
                    const newPath = path.join(rootPath, newId);
                    await fs.mkdir(path.dirname(newPath), { recursive: true });
                    await fs.rename(oldPath, newPath);
                    return { ...oldNode, id: newId, parentId: newParentId, updatedAt: Date.now() };
                }
            }
            return oldNode;
        }
    } catch (e) {
        console.error('Update error', e);
        throw e;
    }
});

ipcMain.handle('fs:deleteNode', async (event, rootPath, id, type) => {
    try {
        if (type === 'file') {
            const fullPath = path.join(rootPath, id + '.md');
            await fs.unlink(fullPath);
        } else {
            const fullPath = path.join(rootPath, id);
            await fs.rm(fullPath, { recursive: true, force: true });
        }
    } catch (e) {
        console.error('Delete error', e);
        throw e;
    }
});
