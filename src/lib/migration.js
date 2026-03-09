import JSZip from 'jszip';
import { getNodes, getFileContent } from './db';

// --- NATIVE FILE SYSTEM API PATHS ---

/**
 * Reads everything from Sandbox and writes it to the provided Native Directory Handle
 */
export const migrateSandboxToLocal = async (nativeDirHandle, sandboxNodes) => {
    // Sort so folders are created before files
    const sortedNodes = [...sandboxNodes].sort((a, b) => a.id.split('/').length - b.id.split('/').length);

    // PRE-FETCH all content. getFileContent relies on the active local_driver handle.
    // We must do this before creating new handles to avoid race conditions.
    const nodesWithContent = await Promise.all(sortedNodes.map(async (node) => {
        if (node.type === 'file') {
            const content = await getFileContent(node.id);
            return { ...node, content };
        }
        return node;
    }));

    // Map of path to handle
    const handleCache = { '': nativeDirHandle };

    for (const node of nodesWithContent) {
        if (node.type === 'folder') {
            const parentKey = node.parentId || '';
            const parentHandle = handleCache[parentKey];
            if (!parentHandle) continue;

            const newFolderHandle = await parentHandle.getDirectoryHandle(node.name, { create: true });
            handleCache[node.id] = newFolderHandle;
        } else {
            const parentKey = node.parentId || '';
            const parentHandle = handleCache[parentKey];
            if (!parentHandle) continue;

            const fileHandle = await parentHandle.getFileHandle(`${node.name}.md`, { create: true });
            const writable = await fileHandle.createWritable();
            await writable.write(node.content || '');
            await writable.close();
        }
    }
};

/**
 * Reads everything from a Native Directory Handle and writes it to the Sandbox
 */
export const migrateLocalToSandbox = async (sourceDirHandle, createNodeFn) => {

    // Recursive folder reader
    const processDirectory = async (dirHandle, currentPath = '') => {
        for await (const entry of dirHandle.values()) {
            const nodePath = currentPath ? `${currentPath}/${entry.name}` : entry.name;

            if (entry.kind === 'file' && (!entry.name.includes('.') || entry.name.endsWith('.md'))) {
                const file = await entry.getFile();
                const content = await file.text();
                const cleanName = entry.name.endsWith('.md') ? entry.name.slice(0, -3) : entry.name;

                await createNodeFn({
                    name: cleanName,
                    type: 'file',
                    parentId: currentPath || null,
                    content: content
                });
            } else if (entry.kind === 'directory' && !entry.name.startsWith('.')) {
                await createNodeFn({
                    name: entry.name,
                    type: 'folder',
                    parentId: currentPath || null
                });
                await processDirectory(entry, nodePath);
            }
        }
    };

    await processDirectory(sourceDirHandle);
};


// --- FALLBACK ZIP PATHS ---

/**
 * Generates a ZIP file of the entire Sandbox contents
 */
export const exportSandboxToZip = async () => {
    const nodes = await getNodes();
    const zip = new JSZip();

    for (const node of nodes) {
        if (node.type === 'file') {
            const content = await getFileContent(node.id);
            // Reconstruct path. JSZip handles nested paths natively.
            const fullPath = node.parentId ? `${node.parentId}/${node.name}.md` : `${node.name}.md`;
            zip.file(fullPath, content || '');
        } else {
            const fullPath = node.parentId ? `${node.parentId}/${node.name}` : node.name;
            zip.folder(fullPath);
        }
    }

    return await zip.generateAsync({ type: 'blob' });
};

/**
 * Reads a user uploaded ZIP file and creates nodes in Sandbox
 */
export const importZipToSandbox = async (zipFile, createNodeFn) => {
    const zip = new JSZip();
    const contents = await zip.loadAsync(zipFile);

    // We only care about .md files or folders. Mac creates __MACOSX which we should ignore.
    for (const [relativePath, zipEntry] of Object.entries(contents.files)) {
        if (relativePath.includes('__MACOSX') || relativePath.startsWith('.')) continue;

        // JSZip relativePath includes trailing slash for folders
        const cleanPath = relativePath.endsWith('/') ? relativePath.slice(0, -1) : relativePath;
        const parts = cleanPath.split('/');
        const rawName = parts.pop();
        const parentId = parts.length > 0 ? parts.join('/') : null;

        if (zipEntry.dir) {
            await createNodeFn({
                name: rawName,
                type: 'folder',
                parentId
            });
        } else if (rawName.endsWith('.md')) {
            const content = await zipEntry.async('string');
            const cleanName = rawName.slice(0, -3);
            await createNodeFn({
                name: cleanName,
                type: 'file',
                parentId,
                content
            });
        }
    }
};
