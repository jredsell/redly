import React, { useState, useEffect, useRef } from 'react';
import { useNotes } from '../context/NotesContext';
import { X, FileText, Search, Plus, Copy, Trash2, Edit2 } from 'lucide-react';

const DEFAULT_TEMPLATES = [
    { 
        name: 'Meeting Notes', 
        content: `# Meeting Notes: [Meeting Title]\n\n**Date:** @today\n**Attendees:** \n\n## Agenda\n- [ ] Topic 1\n- [ ] Topic 2\n\n## Discussion & Notes\n\n## Action Items\n- [ ] @today Follow up with team\n` 
    },
    { 
        name: 'Project Update', 
        content: `# Project Update: [Project Name]\n\n**Status:** 🟢 On Track\n**Date:** @today\n\n## Progress This Week\n- [x] Major milestone achieved\n- [ ] Continuing work on X\n\n## Blockers\n- \n\n## Next Steps\n- [ ] Prepare for demo\n` 
    },
    { 
        name: 'Daily Journal', 
        content: `# Journal Entry - @today\n\n## Intentions for Today\n- [ ] Main highlight: \n- [ ] Secondary task: \n\n## Brain Dump\n\n## Daily Reflection\n- **What went well?** \n- **What could be improved?** \n` 
    },
    { 
        name: '1-2-1 Catchup', 
        content: `# 1-2-1 Catchup: [Name] & [Name]\n\n**Date:** @today\n\n## Last Meeting Follow-up\n- Review progress on previous action items\n\n## [Name] Updates & Agenda\n- Current projects\n- Wins since last time\n\n## Feedback / Career Growth\n- What's on your mind?\n\n## Action Items\n- [ ] \n` 
    }
];

export default function TemplateModal({ isOpen, onClose, onInsert, editorContent }) {
    const { nodes, addNode, removeNode, openAndExpandFile, editNode, getFileContent } = useNotes();
    const [templates, setTemplates] = useState([]);
    const [query, setQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [isSaving, setIsSaving] = useState(false);
    const [newTemplateName, setNewTemplateName] = useState('');
    const [showSaveInput, setShowSaveInput] = useState(false);

    const inputRef = useRef(null);
    const saveInputRef = useRef(null);
    const listRef = useRef(null);
    const hasInitializedRef = useRef(false);

    // Reset initialization when closed
    useEffect(() => {
        if (!isOpen) {
            hasInitializedRef.current = false;
        }
    }, [isOpen]);

    // Extract templates from nodes on mount & when nodes change
    useEffect(() => {
        if (!isOpen) {
            setQuery('');
            setSelectedIndex(0);
            return;
        }

        // Ensure .templates folder exists only once per open
        if (!hasInitializedRef.current) {
            hasInitializedRef.current = true;
            // More robust search for .templates folder
            let templatesFolder = nodes.find(n => n.id === '.templates');
            if (!templatesFolder) {
                templatesFolder = nodes.find(n => n.name === '.templates' && n.type === 'folder');
            }

            if (!templatesFolder) {
                const initializeDefaults = async () => {
                    const folder = await addNode('.templates', 'folder', null, false);
                    if (!folder) return;
                    
                    for (const t of DEFAULT_TEMPLATES) {
                        await addNode(t.name, 'file', folder.id, false, t.content);
                    }
                };
                initializeDefaults();
                return;
            }
        }

        // More robust filtering: check by parentId OR if parent folder name is .templates
        let templatesFolder = nodes.find(n => n.id === '.templates');
        if (!templatesFolder) {
            templatesFolder = nodes.find(n => n.name === '.templates' && n.type === 'folder');
        }

        const templateFiles = nodes.filter(n => 
            (templatesFolder && n.parentId === templatesFolder.id) && n.type === 'file'
        );

        let filtered = templateFiles;
        if (query.trim()) {
            const q = query.toLowerCase();
            filtered = templateFiles.filter(t => t.name.toLowerCase().includes(q));
        }

        setTemplates(filtered);

        // Safety bound index
        if (selectedIndex >= filtered.length) {
            setSelectedIndex(Math.max(0, filtered.length - 1));
        }

    }, [isOpen, nodes, query]);

    // Lazy load content for templates when they change
    useEffect(() => {
        if (!isOpen || templates.length === 0) return;

        const loadMissing = async () => {
            const toLoad = templates.filter(t => t.content === undefined);
            if (toLoad.length === 0) return;

            const loaded = await Promise.all(toLoad.map(async t => {
                try {
                    const content = await getFileContent(t.id);
                    return { ...t, content };
                } catch (e) {
                    return { ...t, content: '' }; // fallback to empty string so it's not undefined
                }
            }));

            setTemplates(prev => prev.map(t => {
                const updated = loaded.find(l => l.id === t.id);
                return updated || t;
            }));
        };

        loadMissing();
    }, [templates, isOpen, getFileContent]);

    // Focus search input on open
    useEffect(() => {
        if (isOpen && !showSaveInput && inputRef.current) {
            setTimeout(() => inputRef.current.focus(), 50);
        }
    }, [isOpen, showSaveInput]);

    // Focus save input when shown
    useEffect(() => {
        if (showSaveInput && saveInputRef.current) {
            setTimeout(() => saveInputRef.current.focus(), 50);
        }
    }, [showSaveInput]);

    // Scroll selected item into view safely
    useEffect(() => {
        if (listRef.current) {
            const activeEl = listRef.current.querySelector('.selected');
            if (activeEl) {
                activeEl.scrollIntoView({ block: 'nearest' });
            }
        }
    }, [selectedIndex]);

    const handleKeyDown = (e) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(prev => Math.min(prev + 1, templates.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(prev => Math.max(prev - 1, 0));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (templates[selectedIndex]) {
                handleInsert(templates[selectedIndex]);
            }
        }
    };

    const handleInsert = async (template) => {
        if (!template) return;
        
        let content = template.content;
        if (content === undefined) {
            try {
                content = await getFileContent(template.id);
            } catch (e) {
                console.error("Failed to load template content for insertion:", e);
                return;
            }
        }

        if (content !== undefined) {
            onInsert(content);
            onClose();
        }
    };

    const handleSaveCurrent = async () => {
        if (!newTemplateName.trim()) return;

        setIsSaving(true);
        let templatesFolder = nodes.find(n => n.id === '.templates');
        if (!templatesFolder) {
            templatesFolder = nodes.find(n => n.name === '.templates' && n.type === 'folder');
        }
        
        if (!templatesFolder) {
            templatesFolder = await addNode('.templates', 'folder', null, false);
        }

        if (templatesFolder) {
            const newNode = await addNode(newTemplateName, 'file', templatesFolder.id, false);
            if (newNode) {
                await editNode(newNode.id, { content: editorContent || '' });
            }
        }

        setIsSaving(false);
        setShowSaveInput(false);
        setNewTemplateName('');
        setQuery('');
    };

    const handleClone = async (template, e) => {
        e.stopPropagation();
        setIsSaving(true);
        const newName = `${template.name.replace('.md', '')} (Copy)`;
        const newNode = await addNode(newName, 'file', template.parentId, false);
        if (newNode) {
            await editNode(newNode.id, { content: template.content || '' });
        }
        setIsSaving(false);
    };

    const handleDelete = async (template, e) => {
        e.stopPropagation();
        if (confirm(`Are you sure you want to delete the template "${template.name}"?`)) {
            await removeNode(template.id);
        }
    };

    const handleEdit = (template, e) => {
        e.stopPropagation();
        onClose();
        openAndExpandFile(template.id);
    };

    const handleRestoreDefaults = async () => {
        if (confirm("This will restore any missing default templates. (Existing ones won't be modified). Proceed?")) {
            let templatesFolder = nodes.find(n => n.id === '.templates');
            if (!templatesFolder) {
                templatesFolder = nodes.find(n => n.name === '.templates' && n.type === 'folder');
            }
            if (!templatesFolder) {
                templatesFolder = await addNode('.templates', 'folder', null, false);
            }
            
            if (!templatesFolder) return;

            const DEFAULT_TEMPLATES = [
                { name: 'Meeting Notes', content: `# Meeting Notes: [Meeting Title]\n\n**Date:** @today\n**Attendees:** \n\n## Agenda\n- [ ] \n\n## Discussion & Notes\n\n## Action Items\n- [ ] \n` },
                { name: 'Project Update', content: `# Project Update: [Project Name]\n\n**Status:** [On Track / At Risk / Delayed]\n**Date:** @today\n\n## Progress\n- What got done this week?\n\n## Blockers\n- Any issues preventing progress?\n\n## Next Steps\n- [ ] \n` },
                { name: 'Daily Journal', content: `# Journal Entry - @today\n\n## Intentions for Today\n- [ ] \n\n## Brain Dump\n\n## Daily Reflection\n- What went well?\n- What could be improved?\n` },
                { name: '1-2-1 Catchup', content: `# 1-2-1 Catchup: [Name] & [Name]\n\n**Date:** @today\n\n## Last Meeting Follow-up\n- \n\n## [Name] Updates & Agenda\n- \n\n## [Your Name] Updates & Agenda\n- \n\n## Feedback / Career Growth\n- \n\n## Action Items\n- [ ] \n` }
            ];

            for (const t of DEFAULT_TEMPLATES) {
                const existing = nodes.find(n => n.parentId === templatesFolder.id && (n.name === t.name || n.name === t.name + '.md' || n.name.replace('.md', '') === t.name));
                if (!existing) {
                    await addNode(t.name, 'file', templatesFolder.id, false, t.content);
                } else {
                    // Forcefully overwrite if suspiciously blank
                    try {
                        const content = await getFileContent(existing.id);
                        if (!content || content.length < 10) {
                             await editNode(existing.id, { content: t.content });
                        }
                    } catch (e) {}
                }
            }
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose} style={{
            position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 100,
            display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(3px)'
        }}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{
                background: 'var(--bg-primary)', padding: '24px', borderRadius: '12px',
                width: '90%', maxWidth: '500px', boxShadow: 'var(--shadow-lg)', color: 'var(--text-primary)',
                display: 'flex', flexDirection: 'column', maxHeight: '80vh'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <FileText size={20} style={{ color: 'var(--accent-color)' }} />
                        Templates
                    </h2>
                    <button onClick={onClose} className="icon-button" style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-secondary)' }}><X size={20} /></button>
                </div>

                <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                    {!showSaveInput ? (
                        <>
                            <div style={{ position: 'relative', flex: 1 }}>
                                <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                                <input
                                    ref={inputRef}
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Search templates..."
                                    style={{
                                        width: '100%', padding: '8px 12px 8px 36px', borderRadius: '6px',
                                        background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
                                        color: 'var(--text-primary)', outline: 'none'
                                    }}
                                />
                            </div>
                            <button
                                onClick={() => setShowSaveInput(true)}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '6px', padding: '0 12px',
                                    background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
                                    borderRadius: '6px', color: 'var(--text-primary)', cursor: 'pointer',
                                    fontWeight: 500, transition: 'background 0.2s'
                                }}
                            >
                                <Plus size={16} style={{ color: 'var(--accent-color)' }} />
                                Save Current
                            </button>
                        </>
                    ) : (
                        <div style={{ display: 'flex', gap: '8px', width: '100%', background: 'var(--bg-secondary)', padding: '8px', borderRadius: '8px', border: '1px solid var(--accent-color)' }}>
                            <input
                                ref={saveInputRef}
                                value={newTemplateName}
                                onChange={(e) => setNewTemplateName(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSaveCurrent();
                                    if (e.key === 'Escape') setShowSaveInput(false);
                                }}
                                placeholder="Template name..."
                                style={{
                                    flex: 1, padding: '6px 10px', borderRadius: '4px',
                                    background: 'var(--bg-primary)', border: '1px solid var(--border-color)',
                                    color: 'var(--text-primary)', outline: 'none'
                                }}
                            />
                            <button
                                onClick={handleSaveCurrent}
                                disabled={isSaving || !newTemplateName.trim()}
                                style={{
                                    padding: '6px 12px', background: 'var(--accent-color)', color: 'white',
                                    border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 600,
                                    opacity: (isSaving || !newTemplateName.trim()) ? 0.5 : 1
                                }}
                            >
                                {isSaving ? 'Saving...' : 'Save'}
                            </button>
                            <button
                                onClick={() => setShowSaveInput(false)}
                                style={{
                                    padding: '6px 12px', background: 'transparent', color: 'var(--text-secondary)',
                                    border: 'none', borderRadius: '4px', cursor: 'pointer'
                                }}
                            >
                                Cancel
                            </button>
                        </div>
                    )}
                </div>

                <div ref={listRef} style={{ flex: 1, overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '6px', background: 'var(--bg-secondary)' }}>
                    {templates.length === 0 ? (
                        <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                            <FileText size={32} style={{ opacity: 0.3, margin: '0 auto 12px auto' }} />
                            <p>No templates found.</p>
                        </div>
                    ) : (
                        <div style={{ padding: '8px' }}>
                            {templates.map((template, i) => (
                                <div
                                    key={template.id}
                                    className={`template-item ${i === selectedIndex ? 'selected' : ''}`}
                                    onClick={() => handleInsert(template)}
                                    onMouseEnter={() => setSelectedIndex(i)}
                                    style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                        padding: '10px 12px', borderRadius: '6px', cursor: 'pointer',
                                        background: i === selectedIndex ? 'var(--accent-color)' : 'transparent',
                                        color: i === selectedIndex ? 'white' : 'var(--text-primary)',
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <FileText size={16} style={{ opacity: i === selectedIndex ? 1 : 0.7, color: i === selectedIndex ? 'white' : 'var(--accent-color)' }} />
                                        <span>{template.name.replace('.md', '')}</span>
                                    </div>

                                    {/* Action Buttons */}
                                    <div style={{ display: 'flex', gap: '4px', opacity: i === selectedIndex ? 1 : 0.4 }}>
                                        <button
                                            onClick={(e) => handleEdit(template, e)}
                                            style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', padding: '4px' }}
                                            title="Edit Template File"
                                        ><Edit2 size={14} /></button>
                                        <button
                                            onClick={(e) => handleClone(template, e)}
                                            style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', padding: '4px' }}
                                            title="Duplicate Template"
                                        ><Copy size={14} /></button>
                                        <button
                                            onClick={(e) => handleDelete(template, e)}
                                            style={{ background: 'transparent', border: 'none', color: i === selectedIndex ? 'currentColor' : 'var(--danger-color)', cursor: 'pointer', padding: '4px' }}
                                            title="Delete Template"
                                        ><Trash2 size={14} /></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div style={{ marginTop: '12px', fontSize: '12px', color: 'var(--text-tertiary)', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div>
                        Use <kbd style={{ background: 'var(--bg-secondary)', padding: '2px 4px', border: '1px solid var(--border-color)', borderRadius: '4px' }}>↑</kbd> <kbd style={{ background: 'var(--bg-secondary)', padding: '2px 4px', border: '1px solid var(--border-color)', borderRadius: '4px' }}>↓</kbd> to navigate, <kbd style={{ background: 'var(--bg-secondary)', padding: '2px 4px', border: '1px solid var(--border-color)', borderRadius: '4px' }}>Enter</kbd> to insert.
                    </div>
                    <button 
                        onClick={handleRestoreDefaults}
                        style={{ background: 'none', border: 'none', color: 'var(--accent-color)', cursor: 'pointer', fontSize: '11px', textDecoration: 'underline', width: 'fit-content', margin: '0 auto' }}
                    >
                        Restore Missing Default Templates
                    </button>
                </div>
            </div>
        </div>
    );
}
