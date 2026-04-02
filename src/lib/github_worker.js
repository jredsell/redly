import git from 'isomorphic-git';
import http from 'isomorphic-git/http/web';
import FS from '@isomorphic-git/lightning-fs';

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
                try {
                    const files = await fs.promises.readdir(dir);
                    for (const f of files) {
                        const path = `${dir}/${f}`;
                        const stat = await fs.promises.lstat(path);
                        if (stat.isDirectory()) {
                            // Simple recursive delete for subfolders
                            const deleteDir = async (p) => {
                                const children = await fs.promises.readdir(p);
                                for (const c of children) {
                                    const cp = `${p}/${c}`;
                                    if ((await fs.promises.lstat(cp)).isDirectory()) await deleteDir(cp);
                                    else await fs.promises.unlink(cp);
                                }
                                await fs.promises.rmdir(p);
                            };
                            await deleteDir(path);
                        } else {
                            await fs.promises.unlink(path);
                        }
                    }
                } catch (e) {
                    // Directory probably doesn't exist yet, create it
                    await fs.promises.mkdir(dir);
                }
                
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
            
            default:
                self.postMessage({ id, type: 'ERROR', error: 'Unknown action type' });
        }
    } catch (error) {
        console.error(`[Worker] Error in ${type}:`, error);
        self.postMessage({ id, type: 'ERROR', error: error.message });
    }
};
