import React from 'react';
import { X, Command, Calendar, FolderPlus, FileText, Move, CheckSquare, Sun, HardDrive, Box, RefreshCw, Table2, Bell } from 'lucide-react';
import { useNotes } from '../context/NotesContext';
import logo from '../assets/logo.png';

import { exportSandboxData, importSandboxData } from '../lib/db';
import { Download, Upload } from 'lucide-react';

export default function HelpModal({ isOpen, onClose }) {
    const { storageMode, disconnectWorkspace } = useNotes();
    if (!isOpen) return null;

    const getStorageInfo = () => {
        if (storageMode === 'local') return { name: 'Local Storage', icon: <HardDrive size={18} aria-hidden="true" />, detail: 'Mapped to your computer' };
        if (storageMode === 'sandbox') return { name: 'Browser Storage', icon: <Box size={18} aria-hidden="true" />, detail: 'Private Vault' };
        return { name: 'Unknown', icon: <Box size={18} aria-hidden="true" />, detail: 'Not connected' };
    };

    const handleExport = async () => {
        try {
            const data = await exportSandboxData();
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = `redly-backup-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            // Delay revocation to ensure the browser has time to initiate the download
            setTimeout(() => {
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
            }, 1000);
        } catch (e) {
            alert('Export failed: ' + e.message);
        }
    };

    const handleImport = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (!window.confirm('This will OVERWRITE all your current browser notes. Continue?')) return;

        try {
            const text = await file.text();
            const data = JSON.parse(text);
            await importSandboxData(data);
            window.location.reload(); // Refresh to see changes
        } catch (e) {
            alert('Import failed: ' + e.message);
        }
    };

    const storage = getStorageInfo();

    return (
        <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="help-modal-title" style={{
            position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 100,
            display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(3px)'
        }}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{
                background: 'var(--bg-primary)', padding: '24px', borderRadius: '12px',
                width: '90%', maxWidth: '450px', boxShadow: 'var(--shadow-lg)', color: 'var(--text-primary)',
                maxHeight: '90vh', overflowY: 'auto'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h2 id="help-modal-title" style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>App Shortcuts & Help</h2>
                    <button onClick={onClose} className="icon-button" aria-label="Close Help" style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-secondary)' }}><X size={20} aria-hidden="true" /></button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)', marginBottom: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                            <div style={{ background: 'var(--bg-primary)', padding: '8px', borderRadius: '10px', color: 'var(--accent-color)' }} aria-hidden="true">
                                {storage.icon}
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>Current Storage</div>
                                <div style={{ fontSize: '15px', fontWeight: 700 }}>{storage.name}</div>
                            </div>
                            <button
                                onClick={() => { disconnectWorkspace(); onClose(); }}
                                className="secondary-action-btn"
                                aria-label="Change current storage location"
                                style={{ padding: '8px 12px', fontSize: '12px', borderStyle: 'dashed', borderRadius: '8px' }}
                            >
                                <RefreshCw size={14} style={{ marginRight: '6px' }} aria-hidden="true" />
                                Change
                            </button>
                        </div>
                        <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)', opacity: 0.8, marginBottom: '16px' }}>
                            {storage.detail}. Your notes are stored here securely and privately.
                        </p>

                        {storageMode === 'sandbox' && (
                            <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                                <button
                                    onClick={handleExport}
                                    className="secondary-action-btn"
                                    style={{ flex: 1, padding: '8px', fontSize: '12px', borderRadius: '8px', justifyContent: 'center' }}
                                >
                                    <Download size={14} style={{ marginRight: '6px' }} />
                                    Export Backup
                                </button>
                                <label
                                    className="secondary-action-btn"
                                    style={{ flex: 1, padding: '8px', fontSize: '12px', borderRadius: '8px', justifyContent: 'center', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                                >
                                    <Upload size={14} style={{ marginRight: '6px' }} />
                                    Import Backup
                                    <input type="file" accept=".json" onChange={handleImport} style={{ display: 'none' }} />
                                </label>
                            </div>
                        )}
                    </div>

                    <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: '8px' }}>
                        <h3 style={{ margin: '0 0 8px 0', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Command size={18} style={{ color: 'var(--accent-color)' }} aria-hidden="true" /> Slash Commands
                        </h3>
                        <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                            Type <kbd style={kbdStyle}>/</kbd> inside any note to open the rich formatting menu. You can quickly add Headings, Todo lists, blockquotes, and lists natively while you type.
                        </p>
                    </div>

                    <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: '8px' }}>
                        <h3 style={{ margin: '0 0 8px 0', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Table2 size={18} style={{ color: 'var(--accent-color)' }} aria-hidden="true" /> Tables
                        </h3>
                        <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                            Type <kbd style={kbdStyle}>/</kbd> and choose <b>Table</b> to insert a 3&times;3 table with a header row instantly.
                            <br /><br />
                            Once inside a table, a <b>toolbar appears at the top-right of the editor</b> with buttons to:
                            <br />
                            <b>+ Row / &minus; Row:</b> Add or remove rows.<br />
                            <b>+ Col / &minus; Col:</b> Add or remove columns.<br />
                            Use <kbd style={kbdStyle}>Tab</kbd> to jump between cells.
                        </p>
                    </div>

                    <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: '8px' }}>
                        <h3 style={{ margin: '0 0 8px 0', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Bell size={18} style={{ color: 'var(--accent-color)' }} aria-hidden="true" /> Task Notifications
                        </h3>
                        <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                            Click the <b>🔔 bell icon</b> in the <b>top-right bar</b> (next to the theme toggle) to enable notifications. Your browser will ask for permission — click <i>Allow</i>.
                            <br /><br />
                            <b>Lead Time:</b> Once enabled, an <b>Alert [X] min before</b> input appears inline. Set how many minutes before a task is due you want to be notified (0 = notify right at due time).<br />
                            <b>How it works:</b> Any Todo item with an <code>@date</code> badge triggers a desktop notification when it enters the window. Each task only notifies once per session.<br />
                            <b>Not seeing popups?</b> Check Windows Settings → Notifications and ensure Focus Assist / Do Not Disturb is off for Chrome.
                        </p>
                    </div>

                    <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: '8px' }}>
                        <h3 style={{ margin: '0 0 8px 0', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Calendar size={18} style={{ color: 'var(--accent-color)' }} aria-hidden="true" /> Interactive Timelines
                        </h3>
                        <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                            Inside any <b>Todo List</b> item, simply type <kbd style={kbdStyle}>@</kbd> followed by a date to open the inline parser.
                            You can use natural language like <code>@friday</code>, <code>@next monday 9am</code>, shorthand formats like <code>@15/04</code>, or specific times like <code>@tomorrow 5pm</code>.
                            Press <kbd style={kbdStyle}>Tab</kbd> to quickly auto-fill today's date, or press <b>Enter</b> to lock in your custom date. Once created, the date badge is highly interactive:
                            <br /><br />
                            <b>1. Click to Edit:</b> Click any Date badge to modify the deadline instantly.
                            <br />
                            <b>2. Colour Coded:</b> Badges automatically change colour: <span style={{ color: '#10b981', fontWeight: 600 }}>Green</span> (Future), <span style={{ color: '#f59e0b', fontWeight: 600 }}>Orange</span> (Today), or <span style={{ color: '#ef4444', fontWeight: 600 }}>Red</span> (Overdue).
                        </p>
                    </div>

                    <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: '8px' }}>
                        <h3 style={{ margin: '0 0 8px 0', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <CheckSquare size={18} style={{ color: 'var(--accent-color)' }} aria-hidden="true" /> Global Tasks Dashboard
                        </h3>
                        <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                            Click the <b>Global Tasks</b> button in the sidebar to view a unified dashboard of every Todo item across your entire workspace.
                            <br /><br />
                            <b>Actionable:</b> Check off items directly from the dashboard, or click their interactive Date badges to change deadlines on the fly! Click the text to teleport into the parent Note.
                        </p>
                    </div>

                    <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: '8px' }}>
                        <h3 style={{ margin: '0 0 12px 0', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <FileText size={18} style={{ color: 'var(--accent-color)' }} aria-hidden="true" /> Hotkeys
                        </h3>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '12px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><FileText size={14} /> New Note <span style={{ fontSize: '0.85em', opacity: 0.7 }}>(Contextual)</span></span>
                            <div><kbd style={kbdStyle}>Alt</kbd> + <kbd style={kbdStyle}>N</kbd></div>

                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><FolderPlus size={14} /> New Folder <span style={{ fontSize: '0.85em', opacity: 0.7 }}>(Contextual)</span></span>
                            <div><kbd style={kbdStyle}>Alt</kbd> + <kbd style={kbdStyle}>F</kbd></div>

                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>Go Home</span>
                            <div><kbd style={kbdStyle}>Alt</kbd> + <kbd style={kbdStyle}>H</kbd></div>

                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>Focus Sidebar</span>
                            <div><kbd style={kbdStyle}>Alt</kbd> + <kbd style={kbdStyle}>S</kbd></div>

                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>Global Tasks</span>
                            <div><kbd style={kbdStyle}>Alt</kbd> + <kbd style={kbdStyle}>T</kbd></div>

                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>Change Workspace</span>
                            <div><kbd style={kbdStyle}>Alt</kbd> + <kbd style={kbdStyle}>W</kbd></div>

                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>Help</span>
                            <div><kbd style={kbdStyle}>Alt</kbd> + <kbd style={kbdStyle}>/</kbd></div>
                        </div>
                    </div>

                    <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: '8px' }}>
                        <h3 style={{ margin: '0 0 8px 0', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <FolderPlus size={18} style={{ color: 'var(--accent-color)' }} aria-hidden="true" /> Navigation & Features
                        </h3>
                        <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                            <b>Focus Sidebar:</b> Press <kbd style={kbdStyle}>Alt</kbd> + <kbd style={kbdStyle}>S</kbd> to focus the sidebar from anywhere.<br />
                            <b>Traverse Tree:</b> Use Arrow Keys (<kbd style={kbdStyle}>↑</kbd> <kbd style={kbdStyle}>↓</kbd> <kbd style={kbdStyle}>←</kbd> <kbd style={kbdStyle}>→</kbd>) to move through the tree. <br />
                            <b>Open Note:</b> Press <kbd style={kbdStyle}>Enter</kbd> or <kbd style={kbdStyle}>Space</kbd> on a selected note to open it. <br />
                            <b>Rename:</b> Press <kbd style={kbdStyle}>F2</kbd> on any selected folder or note to rename it.<br />
                            <b>Delete:</b> Press <kbd style={kbdStyle}>Delete</kbd> (or <kbd style={kbdStyle}>Ctrl</kbd> + <kbd style={kbdStyle}>Backspace</kbd>) to remove an item. <br />
                            <br />
                            <b>Recent Files:</b> Re-open your most recently edited notes straight from the top of the Welcome Screen.<br />
                            <b>Folder Counts:</b> Every folder displays the number of items it contains next to its name.<br />
                            <b>Expand/Collapse All:</b> Use the double-chevron icons at the top of the sidebar to instantly open or close your entire folder tree.
                        </p>
                    </div>

                    <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: '8px' }}>
                        <h3 style={{ margin: '0 0 8px 0', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Move size={18} style={{ color: 'var(--accent-color)' }} aria-hidden="true" /> Drag & Drop
                        </h3>
                        <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                            You can click and hold any Note or Folder in the left sidebar to drag it.
                            Drop it onto a <b>Folder</b> to move it inside.
                            Drop it onto the <b>Empty Sidebar Space</b> at the bottom to eject it back to the root level!
                        </p>
                    </div>
                </div>

                <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: '8px', marginTop: '16px' }}>
                    <h3 style={{ margin: '0 0 8px 0', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Sun size={18} style={{ color: 'var(--accent-color)' }} aria-hidden="true" /> Theme Toggle
                    </h3>
                    <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                        Click the <b>sun/moon</b> icon in the top right corner to instantly toggle between light and dark themes. Redly remembers your preference automatically!
                    </p>
                </div>

                <div style={{ marginTop: '24px', textAlign: 'center' }}>
                    <button onClick={onClose} style={{
                        background: 'var(--accent-color)', color: 'white', border: 'none', padding: '10px 32px',
                        borderRadius: '4px', cursor: 'pointer', fontWeight: 600, fontSize: '0.95em',
                        boxShadow: '0 2px 4px rgba(99, 102, 241, 0.3)'
                    }}>Got It!</button>
                </div>
            </div>
        </div>
    );
}

const kbdStyle = {
    background: 'var(--bg-primary)',
    border: '1px solid var(--border-color)',
    borderRadius: '4px',
    padding: '2px 6px',
    fontSize: '0.85em',
    fontFamily: 'monospace',
    boxShadow: '0 1px 1px rgba(0,0,0,0.05)',
    fontWeight: 600
};
