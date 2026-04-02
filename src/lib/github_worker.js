import git from 'isomorphic-git';
import http from 'isomorphic-git/http/web';
import FS from '@isomorphic-git/lightning-fs';

const fs = new FS('redly-github');
const dir = '/';
const defaultProxy = 'https://cors.isomorphic-git.org';

self.onmessage = async ({ data }) => {
    const { type, payload, id } = data;
    
    try {
        switch (type) {
            case 'CLONE': {
                const { url, token, corsProxy } = payload;
                // Wipe if exists to ensure clean clone
                try { await fs.promises.rmdir('/', { recursive: true }); } catch(e) {}
                await fs.promises.mkdir('/');
                
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
                
                // 1. Git Add (Single file or all)
                await git.add({ fs, dir, filepath: filepath || '.' });
                
                // 2. Git Commit
                await git.commit({
                    fs, dir,
                    message: message || `Update from Redly: ${new Date().toISOString()}`,
                    author: { name: 'Redly User', email: 'user@redly.app' }
                });
                
                // 3. Optional Auto Push
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
