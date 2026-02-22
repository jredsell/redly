import React, { useState } from 'react';
import { useNotes } from '../context/NotesContext';
import { FileText, FolderPlus, ListTodo, Clock, ChevronDown, ChevronRight, HardDrive, Cloud, ShieldCheck } from 'lucide-react';
import logo from '../assets/logo.png';

export default function WelcomeScreen({ openHelp }) {
    const { addNode, nodes, setActiveFileId, workspaceHandle, selectWorkspace } = useNotes();
    const [showRecent, setShowRecent] = useState(true);

    const recentFiles = nodes
        .filter(n => n.type === 'file')
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .slice(0, 4);

    const getPath = (node) => {
        let path = [];
        let current = node;
        while (current && current.parentId) {
            const parent = nodes.find(n => n.id === current.parentId);
            if (parent) {
                path.unshift(parent.name);
                current = parent;
            } else {
                break;
            }
        }
        return path.length > 0 ? path.join(' > ') + ' > ' : '';
    };

    if (!workspaceHandle) {
        return (
            <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                minHeight: '100%', padding: '40px 20px', textAlign: 'center', color: 'var(--text-primary)',
                backgroundColor: 'var(--bg-primary)', overflowY: 'auto'
            }}>
                <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'center' }}>
                    <img src={logo} alt="Redly Logo" style={{ width: '80px', height: '80px', borderRadius: '20px', boxShadow: 'var(--shadow-md)' }} />
                </div>

                <h1 style={{ fontSize: '32px', marginBottom: '16px', fontWeight: '800', letterSpacing: '-0.5px' }}>Welcome to Redly</h1>
                <p style={{ fontSize: '18px', color: 'var(--text-secondary)', maxWidth: '550px', marginBottom: '40px', lineHeight: '1.5' }}>
                    Your offline-first Markdown knowledge base.<br />
                    Notes and tasks, <em style={{ color: 'var(--accent-color)', fontWeight: '600', fontStyle: 'normal' }}>redly</em> available.
                </p>

                <button
                    onClick={selectWorkspace}
                    className="primary-action-btn"
                    style={{
                        background: 'var(--accent-color)',
                        color: 'white',
                        border: 'none',
                        padding: '16px 32px',
                        borderRadius: '12px', fontSize: '18px', fontWeight: 'bold',
                        cursor: 'pointer',
                        boxShadow: '0 4px 14px 0 rgba(0, 112, 243, 0.39)',
                        transition: 'transform 0.2s, box-shadow 0.2s',
                        display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '48px'
                    }}
                    onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                    onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                >
                    <FolderPlus size={24} />
                    Select Location (Creates 'redly' folder)
                </button>

                <div style={{
                    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                    gap: '24px', width: '100%', maxWidth: '800px', textAlign: 'left'
                }}>
                    <div className="info-card">
                        <ShieldCheck size={28} style={{ color: 'var(--color-future)', marginBottom: '12px' }} />
                        <h3 style={{ fontSize: '16px', marginBottom: '8px', fontWeight: '600' }}>Native App</h3>
                        <p style={{ fontSize: '14px', color: 'var(--text-tertiary)', lineHeight: '1.5', margin: 0 }}>
                            Redly is now a fully native Desktop app. Your workspace is always accessible completely offline with zero browser permissions required.
                        </p>
                    </div>
                    <div className="info-card">
                        <HardDrive size={28} style={{ color: 'var(--accent-color)', marginBottom: '12px' }} />
                        <h3 style={{ fontSize: '16px', marginBottom: '8px', fontWeight: '600' }}>True Portability</h3>
                        <p style={{ fontSize: '14px', color: 'var(--text-tertiary)', lineHeight: '1.5', margin: 0 }}>
                            Select a <b>USB flash drive</b> and a <code>redly</code> folder will be created so you can take your entire knowledge base anywhere.
                        </p>
                    </div>
                    <div className="info-card">
                        <Cloud size={28} style={{ color: 'var(--color-today)', marginBottom: '12px' }} />
                        <h3 style={{ fontSize: '16px', marginBottom: '8px', fontWeight: '600' }}>Instant Cloud Sync</h3>
                        <p style={{ fontSize: '14px', color: 'var(--text-tertiary)', lineHeight: '1.5', margin: 0 }}>
                            Select a folder managed by <b>Google Drive</b> or <b>OneDrive</b> to automatically back up and sync your <code>.md</code> files remotely.
                        </p>
                    </div>
                </div>

                <style>{`
                    .info-card {
                        background: var(--bg-secondary); border: 1px solid var(--border-color);
                        padding: 24px; border-radius: 16px;
                    }
                    .primary-action-btn:active {
                        transform: scale(0.98) !important;
                    }
                `}</style>
            </div>
        );
    }

    return (
        <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            minHeight: '100%', padding: '40px 20px', textAlign: 'center', color: 'var(--text-primary)',
            backgroundColor: 'var(--bg-primary)', overflowY: 'auto'
        }}>
            <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'center' }}>
                <img src={logo} alt="Redly Logo" style={{ width: '80px', height: '80px', borderRadius: '20px', boxShadow: 'var(--shadow-md)' }} />
            </div>

            <h1 style={{ fontSize: '32px', marginBottom: '16px', fontWeight: '800', letterSpacing: '-0.5px' }}>Welcome back to Redly</h1>
            <p style={{ fontSize: '18px', color: 'var(--text-secondary)', maxWidth: '550px', marginBottom: '40px', lineHeight: '1.5' }}>
                Your offline-first Markdown knowledge base.<br />
                Notes and tasks, <em style={{ color: 'var(--accent-color)', fontWeight: '600', fontStyle: 'normal' }}>redly</em> available.
            </p>

            <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '12px', width: '100%', maxWidth: '600px', marginBottom: '32px'
            }}>
                <button
                    onClick={() => addNode('Untitled Note', 'file')}
                    className="welcome-card"
                >
                    <FileText size={24} style={{ color: 'var(--accent-color)' }} />
                    <div className="title">Create Note</div>
                    <div className="desc">Start writing instantly</div>
                </button>

                <button
                    onClick={() => addNode('New Folder', 'folder')}
                    className="welcome-card"
                >
                    <FolderPlus size={24} style={{ color: 'var(--color-future)' }} />
                    <div className="title">Create Folder</div>
                    <div className="desc">Organise your thoughts</div>
                </button>

                <button
                    onClick={openHelp}
                    className="welcome-card"
                >
                    <ListTodo size={24} style={{ color: 'var(--color-today)' }} />
                    <div className="title">View Cheatsheet</div>
                    <div className="desc">Learn Slash & Hotkeys</div>
                </button>
            </div>

            <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '16px', marginBottom: '24px' }}>
                <span><strong>Alt+N</strong> New Note</span>
                <span><strong>Alt+F</strong> New Folder</span>
                <span><strong>Alt+H</strong> Home</span>
                <span><strong>Alt+W</strong> Workspace</span>
                <span><strong>Alt+/</strong> Help</span>
            </div>

            {recentFiles.length > 0 && (
                <div style={{ width: '100%', maxWidth: '600px', textAlign: 'left', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                    <button
                        onClick={() => setShowRecent(!showRecent)}
                        style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '8px 0', fontSize: '13px', fontWeight: '600' }}
                    >
                        <Clock size={16} /> Recent Files {showRecent ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </button>

                    {showRecent && (
                        <div style={{
                            display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                            gap: '12px', padding: '12px 0', width: '100%'
                        }}>
                            {recentFiles.map(file => {
                                const folderPath = getPath(file);
                                return (
                                    <button
                                        key={file.id}
                                        onClick={() => setActiveFileId(file.id)}
                                        className="recent-file-chip"
                                        title={`Last edited: ${new Date(file.updatedAt).toLocaleString()}`}
                                    >
                                        <FileText size={16} style={{ color: 'var(--accent-color)', flexShrink: 0, marginTop: '2px' }} />
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', overflow: 'hidden', width: '100%' }}>
                                            <span className="title">{file.name}</span>
                                            <span className="path">
                                                {folderPath ? folderPath.slice(0, -3) : 'Workspace'}
                                            </span>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            <style>{`
                .welcome-card {
                    display: flex; flex-direction: column; alignItems: center; justify-content: center;
                    background: var(--bg-secondary); border: 1px solid var(--border-color);
                    padding: 16px; border-radius: 12px; cursor: pointer;
                    transition: all 0.2s ease; box-shadow: var(--shadow-sm); gap: 6px;
                }
                .welcome-card:hover { border-color: var(--accent-color); transform: translateY(-2px); box-shadow: var(--shadow-md); }
                .welcome-card .title { font-weight: 600; font-size: 15px; color: var(--text-primary); margin-top: 8px; }
                .welcome-card .desc { font-size: 13px; color: var(--text-tertiary); }
                .recent-file-chip {
                    display: flex; align-items: flex-start; gap: 12px;
                    background: var(--bg-secondary); border: 1px solid var(--border-color);
                    padding: 12px 16px; border-radius: 8px; cursor: pointer; transition: all 0.2s ease;
                    text-align: left; width: 100%; height: 100%;
                }
                .recent-file-chip:hover { border-color: var(--accent-color); background: var(--bg-hover); transform: translateY(-2px); box-shadow: var(--shadow-sm); }
                .recent-file-chip .title { font-size: 14px; color: var(--text-primary); font-weight: 600; margin-bottom: 2px; width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
                .recent-file-chip .path { color: var(--text-tertiary); font-size: 11px; width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
            `}</style>
        </div>
    );
}
