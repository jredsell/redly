import React, { useState } from 'react';
import { useNotes } from '../context/NotesContext';
import { Trash2, RefreshCw, X, AlertTriangle } from 'lucide-react';

export default function TrashModal({ isOpen, onClose }) {
    const { trashNodes, restoreNodeList, emptyTrashList } = useNotes();
    const [confirmEmpty, setConfirmEmpty] = useState(false);

    if (!isOpen) return null;

    const handleEmptyTrash = async () => {
        if (confirmEmpty) {
            await emptyTrashList();
            setConfirmEmpty(false);
        } else {
            setConfirmEmpty(true);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1000 }}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ width: '500px', maxWidth: '90%', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Trash2 size={24} style={{ color: 'var(--accent-color)' }} />
                        <h2 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '20px', fontWeight: '600' }}>Recycle Bin</h2>
                    </div>
                    <button className="icon-button" onClick={onClose} title="Close" aria-label="Close Recycle Bin">
                        <X size={20} />
                    </button>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', minHeight: '150px', marginBottom: '16px', border: '1px solid var(--border-color)', borderRadius: '6px', backgroundColor: 'var(--bg-secondary)', padding: '8px' }}>
                    {trashNodes.length === 0 ? (
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--text-tertiary)', fontSize: '14px' }}>
                            The Recycle Bin is empty.
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {trashNodes.map(node => (
                                <div key={node.trashId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px', background: 'var(--bg-primary)', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                                    <div style={{ overflow: 'hidden' }}>
                                        <div style={{ color: 'var(--text-primary)', fontWeight: '500', fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {node.originalName} {node.type === 'folder' && <span style={{ color: 'var(--text-tertiary)', fontSize: '12px' }}>(Folder)</span>}
                                        </div>
                                        <div style={{ color: 'var(--text-tertiary)', fontSize: '12px', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            Original Path: {node.originalParentId || '/'}
                                            &nbsp;&bull;&nbsp;
                                            Deleted: {new Date(node.deletedAt).toLocaleDateString()}
                                        </div>
                                    </div>
                                    <button
                                        className="icon-button"
                                        style={{ color: 'var(--accent-color)', padding: '4px', flexShrink: 0, marginLeft: '8px' }}
                                        onClick={() => restoreNodeList(node.trashId)}
                                        title="Restore"
                                        aria-label={`Restore ${node.originalName}`}
                                    >
                                        <RefreshCw size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '8px' }}>
                    {confirmEmpty && (
                        <span style={{ color: 'var(--danger-color)', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <AlertTriangle size={14} /> Are you sure?
                        </span>
                    )}
                    <button
                        className={confirmEmpty ? "danger-btn" : "secondary-btn"}
                        onClick={handleEmptyTrash}
                        disabled={trashNodes.length === 0}
                        style={{
                            padding: '8px 16px', borderRadius: '6px', cursor: trashNodes.length === 0 ? 'not-allowed' : 'pointer',
                            fontWeight: '500', opacity: trashNodes.length === 0 ? 0.5 : 1,
                            ...(confirmEmpty ? {} : { border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-primary)' })
                        }}
                    >
                        {confirmEmpty ? 'Yes, Empty Trash' : 'Empty Trash'}
                    </button>
                    {confirmEmpty && (
                        <button
                            className="secondary-btn"
                            onClick={() => setConfirmEmpty(false)}
                            style={{ padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: '500', border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-primary)' }}
                        >
                            Cancel
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
