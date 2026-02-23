import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNotes } from '../context/NotesContext';
import { Trash, Bold, Italic, Strikethrough, Code, Heading1, Heading2, List, ListOrdered, Quote } from 'lucide-react';
import { useEditor, EditorContent, ReactNodeViewRenderer, NodeViewWrapper, NodeViewContent } from '@tiptap/react';
import { Node, mergeAttributes, InputRule } from '@tiptap/core';
import TurndownService from 'turndown';
import markdownit from 'markdown-it';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import TaskItem from '@tiptap/extension-task-item';
import TaskList from '@tiptap/extension-task-list';
import { parseDateString } from '../utils/dateHelpers';
import InlineDateInput from './InlineDateInput';

// React Component for TaskItem Node View
const CustomTaskItemComponent = (props) => {
    const { node, updateAttributes } = props;
    const clearDate = (e) => {
        if (e && e.stopPropagation) e.stopPropagation();
        updateAttributes({ hasDate: false, date: '', hasTime: false });
    };
    const handleDateUpdate = (newDateUrlString, newHasTime) => {
        updateAttributes({ date: newDateUrlString, hasDate: true, hasTime: newHasTime });
    };
    return (
        <NodeViewWrapper as="li" data-type="taskItem" data-checked={node.attrs.checked} style={{ display: 'flex', alignItems: 'flex-start', margin: '4px 0', gap: '8px' }}>
            <label contentEditable={false} style={{ marginTop: '4px', cursor: 'pointer', display: 'flex' }}>
                <input
                    type="checkbox"
                    checked={node.attrs.checked}
                    onChange={e => updateAttributes({ checked: e.target.checked })}
                    style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                />
            </label>
            <div style={{ flex: 1 }}>
                <NodeViewContent as="div" style={{
                    textDecoration: node.attrs.checked ? 'line-through' : 'none',
                    color: node.attrs.checked ? 'var(--text-tertiary)' : 'inherit',
                    minHeight: '24px', outline: 'none'
                }} />
                {node.attrs.hasDate && (
                    <div contentEditable={false} style={{ marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px', userSelect: 'none' }}>
                        <InlineDateInput
                            initialDate={node.attrs.date}
                            initialHasTime={node.attrs.hasTime}
                            isChecked={node.attrs.checked}
                            onDateChange={handleDateUpdate}
                            onClearDate={clearDate}
                        />
                        <button onClick={clearDate} style={{ background: 'transparent', border: 'none', padding: '2px 4px', fontSize: '12px', color: 'var(--danger-color)', cursor: 'pointer' }} title="Remove Date">✕</button>
                    </div>
                )}
            </div>
        </NodeViewWrapper>
    );
};

// React Component for Inline Date Input
const InlineDateInputNodeView = (props) => {
    const [value, setValue] = useState('');
    const inputRef = useRef(null);
    useEffect(() => { if (inputRef.current) setTimeout(() => inputRef.current?.focus(), 10); }, []);
    const handleKeyDown = (e) => {
        if (e.key === 'Tab') {
            e.preventDefault();
            const today = new Date();
            setValue(`${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            const { editor, getPos } = props;
            const $pos = editor.state.doc.resolve(getPos());
            let taskItemNode = null;
            for (let i = $pos.depth; i > 0; i--) { if ($pos.node(i).type.name === 'taskItem') { taskItemNode = $pos.node(i); break; } }
            const { parsedDate, hasDate, hasTime } = parseDateString(value);
            if (taskItemNode && hasDate) {
                editor.chain().deleteRange({ from: getPos(), to: getPos() + 1 }).updateAttributes('taskItem', { date: parsedDate, hasDate, hasTime }).focus().run();
            } else {
                editor.chain().deleteRange({ from: getPos(), to: getPos() + 1 }).insertContent(`@${value}`).focus().run();
            }
        } else if (e.key === 'Escape') {
            props.editor.chain().deleteRange({ from: props.getPos(), to: props.getPos() + 1 }).insertContent(`@${value}`).focus().run();
        }
    };
    return (
        <NodeViewWrapper as="span" style={{ display: 'inline-flex', alignItems: 'center', background: 'var(--bg-accent)', borderRadius: '4px', padding: '0 4px', color: 'var(--accent-color)' }}>
            <span style={{ fontWeight: 'bold', marginRight: '2px' }}>@</span>
            <input ref={inputRef} type="text" value={value} onChange={e => setValue(e.target.value)} onKeyDown={handleKeyDown}
                style={{ border: 'none', outline: 'none', background: 'transparent', color: 'var(--accent-color)', fontFamily: 'monospace', fontSize: '0.9em', width: '17ch' }} />
        </NodeViewWrapper>
    );
};

const md = markdownit({ html: true, linkify: true, typographer: true });
const td = new TurndownService({ headingStyle: 'atx', hr: '---', bulletListMarker: '-', codeBlockStyle: 'fenced' });
td.addRule('taskList', {
    filter: (node) => node.nodeName === 'LI' && node.parentElement?.getAttribute('data-type') === 'taskList',
    replacement: (content, node) => {
        const isChecked = node.getAttribute('data-checked') === 'true';
        return `${isChecked ? '[x]' : '[ ]'} ${content.trim()}\n`;
    }
});
td.addRule('fencedCodeBlock', {
    filter: 'pre',
    replacement: (content, node) => {
        const code = node.querySelector('code')?.textContent || content;
        return `\n\n\`\`\`\n${code}\n\`\`\`\n\n`;
    }
});

const SLASH_OPTIONS = [
    { label: 'Heading 1', icon: 'H1', command: (editor) => editor.chain().focus().toggleHeading({ level: 1 }).run() },
    { label: 'Heading 2', icon: 'H2', command: (editor) => editor.chain().focus().toggleHeading({ level: 2 }).run() },
    { label: 'Heading 3', icon: 'H3', command: (editor) => editor.chain().focus().toggleHeading({ level: 3 }).run() },
    { label: 'Bold', icon: 'B', command: (editor) => editor.chain().focus().toggleBold().run() },
    { label: 'Italic', icon: 'I', command: (editor) => editor.chain().focus().toggleItalic().run() },
    { label: 'Bulleted List', icon: '•', command: (editor) => editor.chain().focus().toggleBulletList().run() },
    { label: 'Numbered List', icon: '1.', command: (editor) => editor.chain().focus().toggleOrderedList().run() },
    { label: 'Todo List', icon: '☐', command: (editor) => editor.chain().focus().toggleTaskList().run() },
    { label: 'Quote', icon: '”', command: (editor) => editor.chain().focus().toggleBlockquote().run() },
    { label: 'Code Block', icon: '</>', command: (editor) => editor.chain().focus().toggleCodeBlock().run() },
    { label: 'Divider', icon: '—', command: (editor) => editor.chain().focus().setHorizontalRule().run() },
];

export default function Editor({ fileId }) {
    const { nodes, editNode, removeNode } = useNotes();
    const [file, setFile] = useState(null);
    const saveTimeoutRef = useRef(null);
    const [localTitle, setLocalTitle] = useState('');
    const [slashMenu, setSlashMenu] = useState({ isOpen: false, top: 0, left: 0, query: '', triggerIdx: -1, selectedIndex: 0 });
    const [bubbleMenu, setBubbleMenu] = useState({ isOpen: false, top: 0, left: 0 });

    const debouncedSave = useCallback((updates) => {
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = setTimeout(() => {
            if (updates.content) updates.content = td.turndown(updates.content);
            editNode(fileId, updates);
        }, 1000);
    }, [fileId, editNode]);

    const extensions = useMemo(() => [
        StarterKit.configure({ heading: { levels: [1, 2, 3] }, history: true }),
        Placeholder.configure({ placeholder: "Start typing..." }),
        TaskList,
        TaskItem.extend({
            addAttributes() { return { ...(this.parent ? this.parent() : {}), date: { default: '' }, hasTime: { default: false }, hasDate: { default: false } }; },
            addNodeView() { return ReactNodeViewRenderer(CustomTaskItemComponent); }
        }),
        Node.create({
            name: 'inlineDateInput', group: 'inline', inline: true, atom: true,
            parseHTML() { return [{ tag: 'span[data-type="inline-date"]' }]; },
            renderHTML({ HTMLAttributes }) { return ['span', mergeAttributes(HTMLAttributes, { 'data-type': 'inline-date' })]; },
            addNodeView() { return ReactNodeViewRenderer(InlineDateInputNodeView); },
            addInputRules() {
                return [new InputRule({
                    find: /(?:^|\s)(@)$/,
                    handler: ({ state, range }) => {
                        const $from = state.selection.$from;
                        let inTaskItem = false;
                        for (let i = $from.depth; i > 0; i--) { if ($from.node(i).type.name === 'taskItem') { inTaskItem = true; break; } }
                        if (inTaskItem) state.tr.replaceWith(range.from + 1, range.to, this.type.create());
                    }
                })];
            }
        })
    ], []);

    const editor = useEditor({
        extensions,
        content: '',
        onUpdate: ({ editor }) => debouncedSave({ content: editor.getHTML() }),
        onSelectionUpdate: ({ editor }) => {
            try {
                const { from, to, empty } = editor.state.selection;

                // Safety Gate: If selection is massive (> 5000 chars), close menus.
                // This prevents the 'coordsAtPos' crash on large text selections.
                if (!empty && (to - from) < 5000) {
                    const coords = editor.view.coordsAtPos(from);

                    // Verify coords exist and are valid numbers before updating state
                    if (coords && typeof coords.top === 'number' && typeof coords.left === 'number') {
                        setBubbleMenu({
                            isOpen: true,
                            top: coords.top - 50,
                            left: coords.left
                        });
                        setSlashMenu(prev => ({ ...prev, isOpen: false }));
                    } else {
                        setBubbleMenu({ isOpen: false, top: 0, left: 0 });
                    }
                } else {
                    // Close menus for large selections or empty cursors
                    setBubbleMenu({ isOpen: false, top: 0, left: 0 });

                    if (empty) {
                        const $pos = editor.state.doc.resolve(from);
                        const textBefore = $pos.parent.textBetween(0, $pos.parentOffset, '\n');
                        const match = textBefore.match(/(?:^|\s)\/([a-zA-Z0-9]*)$/);

                        if (match) {
                            const query = match[1];
                            const triggerIdx = from - query.length - 1;
                            const coords = editor.view.coordsAtPos(triggerIdx);

                            if (coords && typeof coords.bottom === 'number' && typeof coords.left === 'number') {
                                setSlashMenu({
                                    isOpen: true,
                                    top: coords.bottom + 4,
                                    left: coords.left,
                                    query: query,
                                    triggerIdx: triggerIdx,
                                    selectedIndex: 0
                                });
                            } else {
                                setSlashMenu(prev => ({ ...prev, isOpen: false }));
                            }
                        } else {
                            setSlashMenu(prev => ({ ...prev, isOpen: false }));
                        }
                    }
                }
            } catch (err) {
                // Fallback to prevent the "White Screen of Death"
                console.warn('Editor: Suppressed selection update error', err);
                setBubbleMenu({ isOpen: false, top: 0, left: 0 });
                setSlashMenu(prev => ({ ...prev, isOpen: false }));
            }
        },
    });

    const handleTitleChange = useCallback((e) => {
        const newName = e.target.value;
        setLocalTitle(newName);
        debouncedSave({ name: newName });
    }, [debouncedSave]);

    const handleKeyDown = useCallback((e) => {
        if (!slashMenu.isOpen) return;

        const filteredOptions = SLASH_OPTIONS.filter(opt =>
            opt.label.toLowerCase().includes(slashMenu.query.toLowerCase())
        );

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSlashMenu(prev => ({ ...prev, selectedIndex: (prev.selectedIndex + 1) % filteredOptions.length }));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSlashMenu(prev => ({ ...prev, selectedIndex: (prev.selectedIndex - 1 + filteredOptions.length) % filteredOptions.length }));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            const selectedOption = filteredOptions[slashMenu.selectedIndex];
            if (selectedOption) {
                editor.chain().focus().deleteRange({ from: slashMenu.triggerIdx, to: editor.state.selection.from }).run();
                selectedOption.command(editor);
                setSlashMenu(prev => ({ ...prev, isOpen: false }));
            }
        } else if (e.key === 'Escape') {
            setSlashMenu(prev => ({ ...prev, isOpen: false }));
        }
    }, [slashMenu, editor]);

    useEffect(() => {
        const f = nodes.find(n => n.id === fileId);
        if (f && (!file || file.id !== fileId)) {
            setFile(f);
            setLocalTitle(f.name || '');
            if (editor) {
                // IMPORTANT: Convert Markdown from storage to HTML for Tiptap
                const html = md.render(f.content || '');
                editor.commands.setContent(html, false);
            }
        }
    }, [fileId, nodes, file, editor]);

    if (!file) return null;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
            <div className="editor-header">
                <input
                    className="title-input"
                    value={localTitle}
                    onChange={handleTitleChange}
                    placeholder="Note Title"
                />
                <button
                    className="icon-button"
                    onClick={() => {
                        if (window.confirm("Delete this note?")) removeNode(fileId);
                    }}
                    title="Delete Note"
                    style={{ color: 'var(--danger-color)', marginLeft: 'auto' }}
                >
                    <Trash size={18} />
                </button>
            </div>

            <div className="editor-body" style={{ flex: 1, overflowY: 'auto', padding: '24px', position: 'relative' }} onKeyDownCapture={handleKeyDown}>
                <EditorContent editor={editor} className="tiptap-container" />

                {/* Custom Bubble (Formatting) Menu */}
                {bubbleMenu.isOpen && editor && (
                    <div className="custom-bubble-menu" style={{ position: 'fixed', top: bubbleMenu.top, left: bubbleMenu.left, zIndex: 100 }}>
                        <button onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} className={editor.isActive('heading', { level: 1 }) ? 'is-active' : ''} title="Heading 1"><Heading1 size={16} /></button>
                        <button onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={editor.isActive('heading', { level: 2 }) ? 'is-active' : ''} title="Heading 2"><Heading2 size={16} /></button>
                        <button onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} className={editor.isActive('heading', { level: 3 }) ? 'is-active' : ''} title="Heading 3"><Heading3 size={16} /></button>
                        <button onClick={() => editor.chain().focus().setParagraph().run()} className={editor.isActive('paragraph') ? 'is-active' : ''} title="Text"><span style={{ fontSize: '12px', fontWeight: 'bold' }}>T</span></button>

                        <div className="menu-separator" />

                        <button onClick={() => editor.chain().focus().toggleBold().run()} className={editor.isActive('bold') ? 'is-active' : ''} title="Bold"><Bold size={16} /></button>
                        <button onClick={() => editor.chain().focus().toggleItalic().run()} className={editor.isActive('italic') ? 'is-active' : ''} title="Italic"><Italic size={16} /></button>
                        <button onClick={() => editor.chain().focus().toggleStrike().run()} className={editor.isActive('strike') ? 'is-active' : ''} title="Strikethrough"><Strikethrough size={16} /></button>
                        <button onClick={() => editor.chain().focus().toggleCode().run()} className={editor.isActive('code') ? 'is-active' : ''} title="Code"><Code size={16} /></button>

                        <div className="menu-separator" />

                        <button onClick={() => editor.chain().focus().toggleBulletList().run()} className={editor.isActive('bulletList') ? 'is-active' : ''} title="Bullet List"><List size={16} /></button>
                        <button onClick={() => editor.chain().focus().toggleOrderedList().run()} className={editor.isActive('orderedList') ? 'is-active' : ''} title="Numbered List"><ListOrdered size={16} /></button>
                        <button onClick={() => editor.chain().focus().toggleBlockquote().run()} className={editor.isActive('blockquote') ? 'is-active' : ''} title="Quote"><Quote size={16} /></button>
                    </div>
                )}

                {/* Custom Slash Menu */}
                {slashMenu.isOpen && (
                    <div style={{
                        position: 'fixed',
                        top: slashMenu.top,
                        left: slashMenu.left,
                        backgroundColor: 'var(--bg-secondary)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px',
                        boxShadow: 'var(--shadow-md)',
                        zIndex: 100,
                        minWidth: '180px',
                        padding: '4px'
                    }}>
                        <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                            {SLASH_OPTIONS.filter(o => o.label.toLowerCase().includes(slashMenu.query.toLowerCase())).map((opt, idx) => (
                                <li
                                    key={idx}
                                    onMouseDown={(e) => {
                                        e.preventDefault();
                                        editor.chain().focus().deleteRange({ from: slashMenu.triggerIdx, to: editor.state.selection.from }).run();
                                        opt.command(editor);
                                        setSlashMenu(prev => ({ ...prev, isOpen: false }));
                                    }}
                                    style={{
                                        padding: '8px 12px',
                                        cursor: 'pointer',
                                        borderRadius: '4px',
                                        backgroundColor: idx === slashMenu.selectedIndex ? 'var(--bg-accent)' : 'transparent',
                                        color: idx === slashMenu.selectedIndex ? 'var(--text-primary)' : 'var(--text-secondary)',
                                        fontSize: '14px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '12px'
                                    }}
                                >
                                    <span style={{ fontSize: '12px', opacity: 0.6, width: '20px', textAlign: 'center' }}>{opt.icon}</span>
                                    {opt.label}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>

            <style>{`
                .custom-bubble-menu {
                    display: flex;
                    background: var(--bg-secondary);
                    padding: 4px;
                    border-radius: 8px;
                    border: 1px solid var(--border-color);
                    box-shadow: var(--shadow-md);
                    gap: 2px;
                    backdrop-filter: blur(8px);
                }
                .custom-bubble-menu button {
                    background: transparent;
                    border: none;
                    border-radius: 4px;
                    padding: 6px;
                    color: var(--text-secondary);
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .custom-bubble-menu button.is-active {
                    background: var(--accent-color);
                    color: white;
                }
                .menu-separator {
                    width: 1px;
                    height: 20px;
                    background: var(--border-color);
                    align-self: center;
                    margin: 0 4px;
                }
                .title-input {
                    background: transparent;
                    border: none;
                    outline: none;
                    font-size: 24px;
                    font-weight: bold;
                    color: var(--text-primary);
                    width: 100%;
                }
                .tiptap-container {
                    user-select: text !important;
                    -webkit-user-select: text !important;
                    outline: none;
                }
            `}</style>
        </div>
    );
}