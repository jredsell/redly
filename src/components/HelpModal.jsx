import React from 'react';
import { X, Command, Calendar, FolderPlus, FileText, Move, CheckSquare, Sun, HardDrive, Box, RefreshCw, Table2, Bell, LayoutList, Search } from 'lucide-react';
import { useNotes } from '../context/NotesContext';

import { exportSandboxToZip, importZipToSandbox, migrateLocalToSandbox, migrateSandboxToLocal } from '../lib/migration';
import { Download, Upload, FolderUp } from 'lucide-react';
import { createNode } from '../lib/db';

export default function HelpModal({ isOpen, onClose }) {
    const { storageMode, disconnectWorkspace, nodes, selectWorkspace } = useNotes();
    const [isMigrating, setIsMigrating] = React.useState(false);
    const [showMigrationPrompt, setShowMigrationPrompt] = React.useState(false);

    if (!isOpen) return null;

    const getStorageInfo = () => {
        if (storageMode === 'local') return { name: 'Local Storage', icon: <HardDrive size={18} aria-hidden="true" />, detail: 'Mapped to your computer' };
        if (storageMode === 'sandbox') return { name: 'Browser Storage', icon: <Box size={18} aria-hidden="true" />, detail: 'Private Vault' };
        return { name: 'Unknown', icon: <Box size={18} aria-hidden="true" />, detail: 'Not connected' };
    };

    const handleExport = async () => {
        try {
            const blob = await exportSandboxToZip();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = `redly-backup-${new Date().toISOString().split('T')[0]}.zip`;
            document.body.appendChild(a);
            a.click();

            // Record the backup time for the 7-day warning
            localStorage.setItem('redly_last_backup_time', Date.now().toString());

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
        if (!window.confirm('This will insert the files from your ZIP into your current browser notes. Continue?')) return;

        try {
            await importZipToSandbox(file, createNode);
            window.location.reload(); // Refresh to see changes
        } catch (e) {
            alert('Import failed: ' + e.message);
        }
    };

    const handleImportFolder = async () => {
        try {
            const dirHandle = await window.showDirectoryPicker({ mode: 'read' });
            if (!window.confirm(`This will import all supported files from "${dirHandle.name}" into your browser storage. Continue?`)) return;

            await migrateLocalToSandbox(dirHandle, createNode);
            window.location.reload();
        } catch (e) {
            if (e.name !== 'AbortError') alert('Folder Import failed: ' + e.message);
        }
    };

    const handleDisconnect = async () => {
        if (storageMode === 'sandbox' && nodes && nodes.length > 0) {
            // Show custom migration prompt instead of window.confirm
            setShowMigrationPrompt(true);
            return;
        }

        disconnectWorkspace();
        onClose();
    };

    const confirmMigration = async () => {
        setShowMigrationPrompt(false);
        if ('showDirectoryPicker' in window) {
            try {
                setIsMigrating(true);
                const dirHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
                await migrateSandboxToLocal(dirHandle, nodes);
                await selectWorkspace('local', { handle: dirHandle });
                setIsMigrating(false);
                onClose();
            } catch (e) {
                setIsMigrating(false);
                if (e.name !== 'AbortError') alert("Migration failed: " + e.message);
            }
        } else {
            alert("Your browser doesn't support the Native File System.\n\nWe will export a .zip backup of your notes instead.");
            await handleExport();
        }
    };

    const skipMigration = () => {
        setShowMigrationPrompt(false);
        disconnectWorkspace();
        onClose();
    };

    if (showMigrationPrompt) {
        return (
            <div className="modal-overlay" style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(3px)' }}>
                <div className="modal-content" style={{ background: 'var(--bg-primary)', padding: '32px', borderRadius: '12px', color: 'var(--text-primary)', maxWidth: '420px', width: '90%' }}>
                    <h2 style={{ fontSize: '20px', margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Move size={20} style={{ color: 'var(--accent-color)' }} />
                        Migrate Notes?
                    </h2>
                    <p style={{ margin: '0 0 24px 0', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                        Before you change workspaces, would you like to migrate your Browser notes to a Local folder on your computer?
                        <br /><br />
                        <span style={{ fontSize: '0.9em', opacity: 0.8 }}>(If you skip this, they will safely remain in the browser sandbox for later)</span>
                    </p>
                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                        <button
                            onClick={skipMigration}
                            style={{ padding: '10px 20px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-primary)', cursor: 'pointer', fontWeight: 500 }}
                        >
                            Skip & Change
                        </button>
                        <button
                            onClick={confirmMigration}
                            style={{ padding: '10px 20px', borderRadius: '6px', border: 'none', background: 'var(--accent-color)', color: 'white', cursor: 'pointer', fontWeight: 500 }}
                        >
                            Select Folder to Migrate
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (isMigrating) {
        return (
            <div className="modal-overlay" style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(3px)' }}>
                <div className="modal-content" style={{ background: 'var(--bg-primary)', padding: '40px', borderRadius: '12px', textAlign: 'center', color: 'var(--text-primary)' }}>
                    <RefreshCw className="spin" size={32} style={{ color: 'var(--accent-color)', marginBottom: '16px' }} />
                    <h2 style={{ fontSize: '20px', margin: '0 0 8px 0' }}>Migrating Data...</h2>
                    <p style={{ margin: 0, color: 'var(--text-secondary)' }}>Copying your notes. Please don't close this window.</p>
                    <style>{`
                        @keyframes spin { 100% { transform: rotate(360deg); } }
                        .spin { animation: spin 2s linear infinite; }
                    `}</style>
                </div>
            </div>
        );
    }

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
                                onClick={handleDisconnect}
                                className="secondary-action-btn"
                                aria-label="Change current storage location"
                                style={{ padding: '8px 12px', fontSize: '12px', borderStyle: 'dashed', borderRadius: '8px' }}
                            >
                                <RefreshCw size={14} style={{ marginRight: '6px' }} aria-hidden="true" />
                                Change
                            </button>
                        </div>
                        <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)', opacity: 0.8, marginBottom: '8px' }}>
                            {storage.detail}. Your notes are stored here securely and privately.
                        </p>

                        {storageMode === 'sandbox' && (
                            <div style={{ padding: '8px', background: 'var(--bg-primary)', borderRadius: '6px', fontSize: '11.5px', color: 'var(--text-secondary)', marginBottom: '16px', borderLeft: '2px solid var(--accent-color)' }}>
                                <b>Note:</b> Browser Storage is strictly temporary. We recommend switching to Local Storage for permanent safekeeping. You'll receive a prompt to export a backup every 7 days.
                            </div>
                        )}

                        {storageMode === 'sandbox' && (
                            <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid var(--border-color)', paddingTop: '16px', flexWrap: 'wrap' }}>
                                <button
                                    onClick={handleExport}
                                    className="secondary-action-btn"
                                    style={{ flex: '1 1 auto', padding: '8px', fontSize: '12px', borderRadius: '8px', justifyContent: 'center' }}
                                >
                                    <Download size={14} style={{ marginRight: '6px' }} />
                                    Export Backup
                                </button>

                                {'showDirectoryPicker' in window && (
                                    <button
                                        onClick={handleImportFolder}
                                        className="secondary-action-btn"
                                        style={{ flex: '1 1 auto', padding: '8px', fontSize: '12px', borderRadius: '8px', justifyContent: 'center', display: 'flex', alignItems: 'center' }}
                                    >
                                        <FolderUp size={14} style={{ marginRight: '6px' }} />
                                        Import Folder
                                    </button>
                                )}

                                <label
                                    className="secondary-action-btn"
                                    style={{ flex: '1 1 auto', padding: '8px', fontSize: '12px', borderRadius: '8px', justifyContent: 'center', cursor: 'pointer', display: 'flex', alignItems: 'center', background: 'rgba(37, 99, 235, 0.05)', borderColor: 'rgba(37, 99, 235, 0.2)', color: 'var(--accent-color)' }}
                                >
                                    <Upload size={14} style={{ marginRight: '6px' }} />
                                    Import (.zip)
                                    <input name="import-backup" id="import-backup" type="file" accept=".zip" onChange={handleImport} style={{ display: 'none' }} />
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
                            <LayoutList size={18} style={{ color: 'var(--accent-color)' }} aria-hidden="true" /> WikiLinks & Backlinks
                        </h3>
                        <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                            Turn your flat folders into a linked web of ideas using WikiLinks! Type <kbd style={kbdStyle}>[[</kbd> to open an autocomplete menu specifically for notes.
                            <br /><br />
                            <b>Creating Links:</b> Type <code>[[Note Name]]</code> to create a clickable link instantly. Clicking the link will navigate you straight to that file.<br />
                            <b>Linked References:</b> Notes that are linked to from other pages will automatically display a <b>Linked References</b> footer at the bottom, complete with context excerpts of exactly how they were mentioned!
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
                            <CheckSquare size={18} style={{ color: 'var(--accent-color)' }} aria-hidden="true" /> Global Tasks & Kanban Dashboard
                        </h3>
                        <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                            Click the <b>Global Tasks</b> button in the sidebar (or press <kbd style={kbdStyle}>Alt</kbd> + <kbd style={kbdStyle}>T</kbd>) to view a unified dashboard of every Todo item across your entire workspace.
                            <br /><br />
                            <b>Kanban Board View:</b> Toggle between the traditional list view and the interactive <b>Kanban Board</b> by pressing <kbd style={kbdStyle}>Alt</kbd> + <kbd style={kbdStyle}>V</kbd>.
                            <br /><br />
                            <b>Kanban Tags:</b> By default, tasks without a tag go into the `#backlog`. You can organise tasks into specific columns by simply picking up a card and dragging it! Redly will automatically rewrite the raw markdown in your note to append the new column's hashtag to the end of your task text (e.g. <code>- [ ] My task #doing</code>).
                            If you have multiple tags on a task, the <b>last tag in the text will always determine its column status</b> on the Kanban board.
                            You can even create your own unlimited custom column names—just type any `#new_status` as the final tag in your task text, and Redly will instantly generate a new column for it on the board!
                            <br /><br />
                            <b>Project Tags & Filters:</b> You can add multiple tags to a task (e.g. <code>- [ ] Buy milk #groceries #urgent</code>) to categorize them by project or context! Use the dropdown filter at the top of the Global Tasks view to instantly filter your List or Board down to a specific project tag, effectively creating custom "Views"!
                            <br /><br />
                            <b>Editor Autocomplete:</b> Inside any note, type <code>#</code> to instantly bring up a floating autocomplete menu showing every tag you've used across your entire workspace! Tags will also be distinctively colour-coded in the editor to help them stand out.
                            <br /><br />
                            <b>Actionable:</b> Check off items directly from the dashboard, or click their interactive Date badges to change deadlines on the fly! Click anywhere on a task card to automatically open its note and scroll to the exact file in the sidebar.
                        </p>
                    </div>

                    <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: '8px' }}>
                        <h3 style={{ margin: '0 0 12px 0', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <FileText size={18} style={{ color: 'var(--accent-color)' }} aria-hidden="true" /> Hotkeys
                        </h3>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '12px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><FileText size={14} /> New Note <span style={{ fontSize: '0.85em', opacity: 0.7 }}>(Contextual)</span></span>
                            <div><kbd style={kbdStyle}>Alt</kbd> + <kbd style={kbdStyle}>N</kbd></div>

                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Search size={14} /> Filter Tags <span style={{ fontSize: '0.85em', opacity: 0.7 }}>(Tasks Vw)</span></span>
                            <div><kbd style={kbdStyle}>Alt</kbd> + <kbd style={kbdStyle}>G</kbd></div>

                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><FolderPlus size={14} /> New Folder <span style={{ fontSize: '0.85em', opacity: 0.7 }}>(Contextual)</span></span>
                            <div><kbd style={kbdStyle}>Alt</kbd> + <kbd style={kbdStyle}>F</kbd></div>

                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>Go Home</span>
                            <div><kbd style={kbdStyle}>Alt</kbd> + <kbd style={kbdStyle}>H</kbd></div>

                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>Focus Editor</span>
                            <div><kbd style={kbdStyle}>Alt</kbd> + <kbd style={kbdStyle}>E</kbd></div>

                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>Focus Sidebar</span>
                            <div><kbd style={kbdStyle}>Alt</kbd> + <kbd style={kbdStyle}>S</kbd></div>

                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>Global Tasks</span>
                            <div><kbd style={kbdStyle}>Alt</kbd> + <kbd style={kbdStyle}>T</kbd></div>

                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>Toggle List/Kanban View</span>
                            <div><kbd style={kbdStyle}>Alt</kbd> + <kbd style={kbdStyle}>V</kbd></div>

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
                            <b>Enter Note:</b> Press <kbd style={kbdStyle}>→</kbd> (Right Arrow) or <kbd style={kbdStyle}>Alt</kbd> + <kbd style={kbdStyle}>E</kbd> to jump from the sidebar into the editor. <br />
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
