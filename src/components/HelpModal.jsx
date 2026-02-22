import React from 'react';
import { X, Command, Calendar, FolderPlus, FileText, Move, CheckSquare, Sun } from 'lucide-react';

export default function HelpModal({ isOpen, onClose }) {
    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose} style={{
            position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 100,
            display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(3px)'
        }}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{
                background: 'var(--bg-primary)', padding: '24px', borderRadius: '12px',
                width: '90%', maxWidth: '450px', boxShadow: 'var(--shadow-lg)', color: 'var(--text-primary)',
                maxHeight: '90vh', overflowY: 'auto'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>App Shortcuts & Help</h2>
                    <button onClick={onClose} className="icon-button" style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-secondary)' }}><X size={20} /></button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: '8px' }}>
                        <h3 style={{ margin: '0 0 8px 0', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Command size={18} style={{ color: 'var(--accent-color)' }} /> Slash Commands
                        </h3>
                        <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                            Type <kbd style={kbdStyle}>/</kbd> inside any note to open the rich formatting menu. You can quickly add Headings, Todo lists, blockquotes, and lists natively while you type.
                        </p>
                    </div>

                    <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: '8px' }}>
                        <h3 style={{ margin: '0 0 8px 0', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Calendar size={18} style={{ color: 'var(--accent-color)' }} /> Interactive Timelines
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
                            <CheckSquare size={18} style={{ color: 'var(--accent-color)' }} /> Global Tasks Dashboard
                        </h3>
                        <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                            Click the <b>Global Tasks</b> button in the sidebar to view a unified dashboard of every Todo item across your entire workspace.
                            <br /><br />
                            <b>Actionable:</b> Check off items directly from the dashboard, or click their interactive Date badges to change deadlines on the fly! Click the text to teleport into the parent Note.
                        </p>
                    </div>

                    <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: '8px' }}>
                        <h3 style={{ margin: '0 0 12px 0', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <FileText size={18} style={{ color: 'var(--accent-color)' }} /> Hotkeys
                        </h3>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '12px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><FileText size={14} /> New Note <span style={{ fontSize: '0.85em', opacity: 0.7 }}>(Contextual)</span></span>
                            <div><kbd style={kbdStyle}>Alt</kbd> + <kbd style={kbdStyle}>N</kbd></div>

                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><FolderPlus size={14} /> New Folder <span style={{ fontSize: '0.85em', opacity: 0.7 }}>(Contextual)</span></span>
                            <div><kbd style={kbdStyle}>Alt</kbd> + <kbd style={kbdStyle}>F</kbd></div>
                        </div>
                    </div>

                    <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: '8px' }}>
                        <h3 style={{ margin: '0 0 8px 0', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <FolderPlus size={18} style={{ color: 'var(--accent-color)' }} /> Navigation & Features
                        </h3>
                        <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                            <b>Recent Files:</b> Re-open your most recently edited notes straight from the top of the Welcome Screen.<br />
                            <b>Folder Counts:</b> Every folder displays the number of items it contains next to its name.<br />
                            <b>Expand/Collapse All:</b> Use the double-chevron icons at the top of the sidebar to instantly open or close your entire folder tree.<br />
                            <b>Keyboard Control:</b> Use Arrow Keys (<kbd style={kbdStyle}>↑</kbd> <kbd style={kbdStyle}>↓</kbd> <kbd style={kbdStyle}>←</kbd> <kbd style={kbdStyle}>→</kbd>) to traverse the folder tree. Press <kbd style={kbdStyle}>Enter</kbd> to open.
                        </p>
                    </div>

                    <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: '8px' }}>
                        <h3 style={{ margin: '0 0 8px 0', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Move size={18} style={{ color: 'var(--accent-color)' }} /> Drag & Drop
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
                        <Sun size={18} style={{ color: 'var(--accent-color)' }} /> Theme Toggle
                    </h3>
                    <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                        Click the <b>sun/moon</b> icon in the top right corner to instantly toggle between light and dark themes. Redly remembers your preference automatically!
                    </p>
                </div>

                <div style={{ marginTop: '24px', textAlign: 'center' }}>
                    <button onClick={onClose} style={{
                        background: 'var(--accent-color)', color: 'white', border: 'none', padding: '10px 32px',
                        borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '0.95em',
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
