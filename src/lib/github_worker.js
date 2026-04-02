import git from 'isomorphic-git';
import http from 'isomorphic-git/http/web';
import FS from '@isomorphic-git/lightning-fs';
import { Buffer } from 'buffer';

// isomorphic-git needs Buffer to be available globally in the worker
if (typeof self !== 'undefined' && !self.Buffer) {
    self.Buffer = Buffer;
}

const fs = new FS('redly-github');
const dir = '/notes'; // Use a dedicated subdirectory to avoid root conflicts
const defaultProxy = 'https://cors.isomorphic-git.org';

self.onmessage = async ({ data }) => {
    const { type, payload, id } = data;
    
    try {
        switch (type) {
            case 'CLONE': {
                const { url, token, corsProxy } = payload;
                
                // 1. Wipe the specific notes directory if it exists
                const wipe = async (p) => {
                    try {
                        const files = await fs.promises.readdir(p);
                        for (const f of files) {
                            const cp = `${p}/${f}`;
                            const stat = await fs.promises.lstat(cp);
                            if (stat.isDirectory()) {
                                await wipe(cp);
                                await fs.promises.rmdir(cp);
                            } else {
                                await fs.promises.unlink(cp);
                            }
                        }
                    } catch (e) {
                        // Directory doesn't exist, ignore
                    }
                };
                
                await wipe(dir);
                try { await fs.promises.mkdir(dir); } catch (e) {}
                
                await git.clone({
                    fs, http, dir, url,
                    corsProxy: corsProxy || defaultProxy,
                    onAuth: () => ({ username: token }),
                    singleBranch: true,
                    depth: 1
                });
                self.postMessage({ id, type: 'SUCCESS' });
                break;
            }
            
            case 'PULL': {
                const { token, corsProxy } = payload;
                await git.pull({
                    fs, http, dir,
                    remote: 'origin',
                    corsProxy: corsProxy || defaultProxy,
                    onAuth: () => ({ username: token }),
                    author: { name: 'Redly User', email: 'user@redly.app' }
                });
                self.postMessage({ id, type: 'SUCCESS' });
                break;
            }
            
            case 'PUSH': {
                const { token, corsProxy } = payload;
                await git.push({
                    fs, http, dir,
                    remote: 'origin',
                    corsProxy: corsProxy || defaultProxy,
                    onAuth: () => ({ username: token })
                });
                self.postMessage({ id, type: 'SUCCESS' });
                break;
            }
            
            case 'COMMIT': {
                const { filepath, message, token, corsProxy, autoPush } = payload;
                await git.add({ fs, dir, filepath: filepath || '.' });
                await git.commit({
                    fs, dir,
                    message: message || `Update from Redly: ${new Date().toISOString()}`,
                    author: { name: 'Redly User', email: 'user@redly.app' }
                });
                if (autoPush) {
                    await git.push({
                        fs, http, dir,
                        remote: 'origin',
                        corsProxy: corsProxy || defaultProxy,
                        onAuth: () => ({ username: token })
                    });
                }
                self.postMessage({ id, type: 'SUCCESS' });
                break;
            }
            
            case 'RENAME': {
                const { oldPath, newPath, message, token, corsProxy, autoPush } = payload;
                try {
                    await git.remove({ fs, dir, filepath: oldPath });
                } catch (e) {
                    console.warn('[Worker] Git remove failed (might be a new untracked file):', e);
                }
                await git.add({ fs, dir, filepath: newPath });
                await git.commit({
                    fs, dir,
                    message: message || `Rename from ${oldPath} to ${newPath}`,
                    author: { name: 'Redly User', email: 'user@redly.app' }
                });
                if (autoPush) {
                    await git.push({
                        fs, http, dir,
                        remote: 'origin',
                        corsProxy: corsProxy || defaultProxy,
                        onAuth: () => ({ username: token })
                    });
                }
                self.postMessage({ id, type: 'SUCCESS' });
                break;
            }

            default:
                self.postMessage({ id, type: 'ERROR', error: 'Unknown action type' });
        }
    } catch (error) {
        console.error(`[Worker] Error in ${type}:`, error);
        self.postMessage({ id, type: 'ERROR', error: error.message });
    }
};
