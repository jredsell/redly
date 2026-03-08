import React from 'react';
import { useNotes } from '../context/NotesContext';
import { Link as LinkIcon } from 'lucide-react';

export default function Backlinks({ noteId }) {
    const { nodes, backlinkIndex, openAndExpandFile } = useNotes();

    // Find the current note to get its name
    const currentNote = nodes.find(n => n.id === noteId);
    if (!currentNote || currentNote.type !== 'file') return null;

    const noteNameKey = currentNote.name.toLowerCase();
    const links = backlinkIndex.get(noteNameKey) || [];
    console.log("[Backlinks] Index keys:", Array.from(backlinkIndex.keys()));
    console.log("[Backlinks] Current note key:", noteNameKey);
    console.log("[Backlinks] Found links:", links);

    if (links.length === 0) return null;

    return (
        <div style={{
            marginTop: '40px',
            paddingTop: '20px',
            borderTop: '1px solid var(--border-color)',
            userSelect: 'none'
        }}>
            <h3 style={{
                fontSize: '12px',
                fontWeight: '600',
                color: 'var(--text-tertiary)',
                textTransform: 'uppercase',
                marginBottom: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
            }}>
                <LinkIcon size={14} />
                Linked References ({links.length})
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {links.map((link, idx) => (
                    <div
                        key={idx}
                        onClick={() => openAndExpandFile(link.sourceId)}
                        style={{
                            padding: '12px',
                            backgroundColor: 'var(--bg-secondary)',
                            borderRadius: '6px',
                            border: '1px solid var(--border-color)',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = 'var(--text-tertiary)';
                            e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = 'var(--border-color)';
                            e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
                        }}
                    >
                        <div style={{ fontWeight: '500', fontSize: '14px', color: 'var(--accent-color)', marginBottom: '4px' }}>
                            {link.sourceName}
                        </div>
                        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                            {/* Simple highlighting of the link target in the excerpt */}
                            {link.contextExcerpt.split(new RegExp(`(\\[\\[${currentNote.name}\\]\\])`, 'gi')).map((part, i) => {
                                if (part.toLowerCase() === `[[${currentNote.name.toLowerCase()}]]`) {
                                    return <span key={i} style={{ color: 'var(--text-primary)', fontWeight: 'bold' }}>{part}</span>;
                                }
                                return part;
                            })}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
