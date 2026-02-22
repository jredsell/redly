import React, { useEffect } from 'react';
import { X } from 'lucide-react';

const cheatsheetData = [
    { syntax: '# Header 1', example: '<h1>Header 1</h1>' },
    { syntax: '## Header 2', example: '<h2>Header 2</h2>' },
    { syntax: '**Bold**', example: '<strong>Bold</strong>' },
    { syntax: '*Italic*', example: '<em>Italic</em>' },
    { syntax: '[Link](url)', example: '<a href="#">Link</a>' },
    { syntax: '`Code`', example: '<code>Code</code>' },
    { syntax: '```\nCode Block\n```', example: '<pre>Code Block</pre>' },
    { syntax: '- List item', example: '<ul><li>List item</li></ul>' },
    { syntax: '> Quote', example: '<blockquote>Quote</blockquote>' },
    { syntax: '---', example: '<hr />' },
];

export default function Cheatsheet({ isOpen, onClose }) {
    // Close on Escape key
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') onClose();
        };
        if (isOpen) {
            window.addEventListener('keydown', handleKeyDown);
        }
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose} style={{
            position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(2px)', zIndex: 100,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px'
        }}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{
                backgroundColor: 'var(--bg-primary)',
                borderRadius: '12px', width: '100%', maxWidth: '600px',
                maxHeight: '80vh', display: 'flex', flexDirection: 'column',
                boxShadow: 'var(--shadow-md)', overflow: 'hidden'
            }}>
                <div style={{
                    padding: '16px 24px', borderBottom: '1px solid var(--border-color)',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                }}>
                    <h2 style={{ fontSize: '18px', fontWeight: '600', margin: 0 }}>Markdown Cheatsheet</h2>
                    <button className="icon-button" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <div style={{ padding: '24px', overflowY: 'auto', flex: 1, display: 'grid', gap: '16px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                                <th style={{ padding: '12px 8px', color: 'var(--text-tertiary)', fontWeight: '500' }}>Syntax</th>
                                <th style={{ padding: '12px 8px', color: 'var(--text-tertiary)', fontWeight: '500' }}>Renders as</th>
                            </tr>
                        </thead>
                        <tbody>
                            {cheatsheetData.map((item, idx) => (
                                <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                    <td style={{ padding: '12px 8px' }}>
                                        <code style={{
                                            background: 'var(--bg-accent)', padding: '4px 8px',
                                            borderRadius: '4px', fontSize: '14px', whiteSpace: 'pre-wrap'
                                        }}>{item.syntax}</code>
                                    </td>
                                    <td style={{ padding: '12px 8px' }} dangerouslySetInnerHTML={{ __html: item.example }} />
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    <div style={{ marginTop: '16px', padding: '16px', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px' }}>
                        <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-secondary)' }}>
                            <strong>Tip:</strong> You can type <code>/</code> inside the editor to quickly insert elements!
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
