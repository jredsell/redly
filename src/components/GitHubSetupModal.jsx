import React from 'react';
import { X, RefreshCw, Github } from 'lucide-react';

export default function GitHubSetupModal({ isOpen, onClose, onConnect, isDarkMode }) {
    const [token, setToken] = React.useState('');
    const [repo, setRepo] = React.useState('');
    const [owner, setOwner] = React.useState('');
    const [isConnecting, setIsConnecting] = React.useState(false);

    if (!isOpen) return null;

    const handleConnect = async (e) => {
        e.preventDefault();
        setIsConnecting(true);
        try {
            await onConnect({ token, repo, owner });
        } catch (err) {
            alert("Failed to connect: " + err.message);
        } finally {
            setIsConnecting(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <h2 style={{ fontSize: '20px', fontWeight: '800', margin: 0 }}>Connect GitHub</h2>
                    <button onClick={onClose} className="icon-button">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleConnect} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', marginBottom: '8px', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>GitHub Personal Access Token</label>
                        <input 
                            type="password" 
                            value={token} 
                            onChange={e => setToken(e.target.value)}
                            placeholder="ghp_xxxxxxxxxxxx"
                            style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                            required
                        />
                        <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '8px' }}>
                            Needs <code>repo</code> scope. Generate one in GitHub Settings &gt; Developer settings.
                        </p>
                    </div>

                    <div style={{ display: 'flex', gap: '16px' }}>
                        <div style={{ flex: 1 }}>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', marginBottom: '8px', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Username / Org</label>
                            <input 
                                type="text" 
                                value={owner} 
                                onChange={e => setOwner(e.target.value)}
                                placeholder="octocat"
                                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                                required
                            />
                        </div>
                        <div style={{ flex: 1 }}>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', marginBottom: '8px', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Repository Name</label>
                            <input 
                                type="text" 
                                value={repo} 
                                onChange={e => setRepo(e.target.value)}
                                placeholder="my-notes"
                                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                                required
                            />
                        </div>
                    </div>

                    <button type="submit" disabled={isConnecting} className="primary-action-btn" style={{ width: '100%', justifyContent: 'center' }}>
                        {isConnecting ? <RefreshCw className="spin" size={20} /> : <Github size={20} />}
                        {isConnecting ? 'Cloning Repository...' : 'Connect Workspace'}
                    </button>
                </form>
            </div>
        </div>
    );
}
