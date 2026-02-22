import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNotes } from '../context/NotesContext';
import { Trash } from 'lucide-react';
import { useEditor, EditorContent, ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';
import { Node, mergeAttributes, InputRule } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import TaskItem from '@tiptap/extension-task-item';
import TaskList from '@tiptap/extension-task-list';
import { Markdown } from 'tiptap-markdown';
import { NodeViewContent } from '@tiptap/react';
import { getDateColor, parseDateString } from '../utils/dateHelpers';
import InlineDateInput from './InlineDateInput';

// Custom TaskItem with built-in Date Picker React Node View
const CustomTaskItemComponent = (props) => {
    const { node, updateAttributes } = props;

    const clearDate = (e) => {
        if (e && e.stopPropagation) e.stopPropagation();
        updateAttributes({ hasDate: false, date: '', hasTime: false });
    };

    const handleDateUpdate = (newDateUrlString, newHasTime) => {
        updateAttributes({ date: newDateUrlString, hasDate: true, hasTime: newHasTime });
    };

    const hasDate = node.attrs.hasDate;

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
                    minHeight: '24px',
                    outline: 'none'
                }} />

                {hasDate && (
                    <div contentEditable={false} style={{ marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px', userSelect: 'none' }}>
                        <InlineDateInput
                            initialDate={node.attrs.date}
                            initialHasTime={node.attrs.hasTime}
                            isChecked={node.attrs.checked}
                            onDateChange={handleDateUpdate}
                            onClearDate={clearDate}
                        />
                        <button
                            onClick={clearDate}
                            style={{
                                background: 'transparent', border: 'none',
                                padding: '2px 4px', fontSize: '12px', color: 'var(--danger-color)', cursor: 'pointer', marginLeft: '2px'
                            }}
                            title="Remove Date"
                        >
                            ✕
                        </button>
                    </div>
                )}
            </div>
        </NodeViewWrapper>
    );
};

const CustomTaskItem = TaskItem.extend({
    addAttributes() {
        return {
            ...this.parent?.(),
            date: { default: '' },
            hasTime: { default: false },
            hasDate: { default: false }
        };
    },
    addKeyboardShortcuts() {
        return {
            ...this.parent?.(),
            Enter: () => this.editor.commands.splitListItem(this.name, {
                checked: false,
                date: '',
                hasTime: false,
                hasDate: false
            })
        };
    },
    addNodeView() {
        return ReactNodeViewRenderer(CustomTaskItemComponent);
    }
});

// Custom Inline Date parser Node View
const InlineDateInputComponent = (props) => {
    const [value, setValue] = useState('');
    const inputRef = useRef(null);

    useEffect(() => {
        if (inputRef.current) {
            setTimeout(() => {
                if (inputRef.current) inputRef.current.focus();
            }, 10);
        }
    }, []);

    const handleKeyDown = (e) => {
        if (e.key === 'Tab') {
            e.preventDefault();
            const today = new Date();
            const d = String(today.getDate()).padStart(2, '0');
            const m = String(today.getMonth() + 1).padStart(2, '0');
            const y = today.getFullYear();
            setValue(`${d}/${m}/${y}`);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            const { editor, getPos } = props;

            const $pos = editor.state.doc.resolve(getPos());
            let taskItemNode = null;
            let taskItemPos = -1;
            for (let i = $pos.depth; i > 0; i--) {
                const node = $pos.node(i);
                if (node.type.name === 'taskItem') {
                    taskItemNode = node;
                    taskItemPos = $pos.before(i);
                    break;
                }
            }

            if (taskItemNode) {
                const { parsedDate, hasDate, hasTime } = parseDateString(value);

                if (hasDate) {
                    editor.chain()
                        .deleteRange({ from: getPos(), to: getPos() + 1 })
                        .updateAttributes('taskItem', { date: parsedDate, hasDate, hasTime })
                        .focus()
                        .run();
                } else {
                    editor.chain()
                        .deleteRange({ from: getPos(), to: getPos() + 1 })
                        .insertContent(`@${value}`)
                        .focus()
                        .run();
                }
            } else {
                editor.chain()
                    .deleteRange({ from: getPos(), to: getPos() + 1 })
                    .insertContent(`@${value}`)
                    .focus()
                    .run();
            }
        } else if (e.key === 'Escape') {
            e.preventDefault();
            const { editor, getPos } = props;
            editor.chain()
                .deleteRange({ from: getPos(), to: getPos() + 1 })
                .insertContent(`@${value}`)
                .focus()
                .run();
        }
    };

    return (
        <NodeViewWrapper as="span" style={{ display: 'inline-flex', alignItems: 'center', background: 'var(--bg-accent)', borderRadius: '4px', padding: '0 4px', color: 'var(--accent-color)', position: 'relative' }}>
            <span style={{ fontWeight: 'bold', marginRight: '2px' }}>@</span>
            <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
                <span style={{ position: 'absolute', pointerEvents: 'none', fontFamily: 'monospace', fontSize: '0.9em', whiteSpace: 'pre' }}>
                    <span style={{ color: 'var(--accent-color)' }}>{value}</span>
                    {value.length === 0 && <span style={{ color: 'var(--text-tertiary)', opacity: 0.6 }}> e.g. Friday 5pm</span>}
                </span>
                <input
                    ref={inputRef}
                    type="text"
                    value={value}
                    onChange={e => setValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    style={{
                        border: 'none', outline: 'none', background: 'transparent',
                        color: 'transparent', caretColor: 'var(--accent-color)',
                        fontFamily: 'monospace', fontSize: '0.9em',
                        width: '17ch'
                    }}
                />
            </div>
        </NodeViewWrapper>
    );
};

const InlineDateInputNode = Node.create({
    name: 'inlineDateInput',
    group: 'inline',
    inline: true,
    atom: true,

    parseHTML() {
        return [{ tag: 'span[data-type="inline-date"]' }];
    },

    renderHTML({ HTMLAttributes }) {
        return ['span', mergeAttributes(HTMLAttributes, { 'data-type': 'inline-date' })];
    },

    addNodeView() {
        return ReactNodeViewRenderer(InlineDateInputComponent);
    },

    addInputRules() {
        return [
            new InputRule({
                find: /(?:^|\s)(@)$/,
                handler: ({ state, range, match }) => {
                    const $from = state.selection.$from;
                    let inTaskItem = false;
                    for (let i = $from.depth; i > 0; i--) {
                        if ($from.node(i).type.name === 'taskItem') {
                            inTaskItem = true;
                            break;
                        }
                    }
                    if (!inTaskItem) return;

                    const offset = match[0].length - match[1].length;
                    const start = range.from + offset;
                    const end = range.to;
                    state.tr.replaceWith(start, end, this.type.create());
                },
            }),
        ];
    },
});

const SLASH_OPTIONS = [
    { label: 'Heading 1', icon: 'H1', command: (editor) => editor.chain().focus().toggleHeading({ level: 1 }).run() },
    { label: 'Heading 2', icon: 'H2', command: (editor) => editor.chain().focus().toggleHeading({ level: 2 }).run() },
    { label: 'Heading 3', icon: 'H3', command: (editor) => editor.chain().focus().toggleHeading({ level: 3 }).run() },
    { label: 'Bold', icon: 'B', command: (editor) => editor.chain().focus().toggleBold().run() },
    { label: 'Italic', icon: 'I', command: (editor) => editor.chain().focus().toggleItalic().run() },
    { label: 'Bulleted List', icon: '•', command: (editor) => editor.chain().focus().toggleBulletList().run() },
    { label: 'Numbered List', icon: '1.', command: (editor) => editor.chain().focus().toggleOrderedList().run() },
    {
        label: 'Todo List', icon: '☐', command: (editor) => {
            editor.chain().focus().toggleTaskList().run();
        }
    },
    { label: 'Quote', icon: '”', command: (editor) => editor.chain().focus().toggleBlockquote().run() },
    { label: 'Code Block', icon: '</>', command: (editor) => editor.chain().focus().toggleCodeBlock().run() },
    { label: 'Divider', icon: '—', command: (editor) => editor.chain().focus().setHorizontalRule().run() },
];

export default function Editor({ fileId }) {
    const { nodes, editNode, removeNode } = useNotes();
    const [file, setFile] = useState(null);
    const saveTimeoutRef = useRef(null);

    const [localTitle, setLocalTitle] = useState('');

    const [slashMenu, setSlashMenu] = useState({
        isOpen: false,
        top: 0,
        bottom: undefined,
        left: 0,
        query: '',
        triggerIdx: -1,
        selectedIndex: 0
    });

    const debouncedSave = useCallback((updates) => {
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = setTimeout(() => {
            editNode(fileId, updates);
        }, 1000);
    }, [fileId, editNode]);

    const editor = useEditor({
        extensions: [
            StarterKit,
            TaskList,
            CustomTaskItem.configure({ nested: true }),
            InlineDateInputNode,
            Markdown,
            Placeholder.configure({ placeholder: "Start typing Markdown directly... (Type '/' for commands)" })
        ],
        content: '',
        onUpdate: ({ editor }) => {
            debouncedSave({ content: editor.getHTML() });
        },
        onSelectionUpdate: ({ editor }) => {
            const { from, to, empty } = editor.state.selection;
            if (!empty) {
                setSlashMenu(prev => prev.isOpen ? { ...prev, isOpen: false } : prev);
                return;
            }

            const $pos = editor.state.doc.resolve(from);
            const textBefore = $pos.parent.textBetween(0, $pos.parentOffset, '\n');

            const match = textBefore.match(/(?:^|\s)\/([a-zA-Z0-9]*)$/);
            if (match) {
                const query = match[1];
                const triggerIdx = from - query.length - 1;
                const coords = editor.view.coordsAtPos(triggerIdx);
                const MENU_HEIGHT = 300;
                const isOverflowing = (coords.bottom + MENU_HEIGHT) > window.innerHeight;

                setSlashMenu(prev => ({
                    ...prev,
                    isOpen: true,
                    top: isOverflowing ? undefined : coords.bottom + 4,
                    bottom: isOverflowing ? (window.innerHeight - coords.top + 4) : undefined,
                    left: coords.left,
                    query: query,
                    triggerIdx: triggerIdx,
                    selectedIndex: prev.query === query ? prev.selectedIndex : 0
                }));
            } else {
                setSlashMenu(prev => prev.isOpen ? { ...prev, isOpen: false } : prev);
            }
        }
    });

    useEffect(() => {
        const f = nodes.find(n => n.id === fileId);
        if (f) {
            if (!file || file.id !== fileId) {
                setFile(f);
                setLocalTitle(f.name || '');
                if (editor) {
                    editor.commands.setContent(f.content || '', false);
                }
                setSlashMenu(prev => ({ ...prev, isOpen: false }));
            }
        }
    }, [fileId, nodes, file, editor]);

    const handleTitleChange = (e) => {
        const newName = e.target.value;
        setLocalTitle(newName);
        debouncedSave({ name: newName });
    };

    const closeSlashMenu = () => {
        setSlashMenu(prev => ({ ...prev, isOpen: false }));
    };

    const executeSlashCommand = (option) => {
        if (!editor) return;
        // Delete the slash trigger text
        editor.chain().focus().deleteRange({ from: slashMenu.triggerIdx, to: editor.state.selection.from }).run();
        // Run the formatting command
        option.command(editor);
        closeSlashMenu();
    };

    const filteredOptions = SLASH_OPTIONS.filter(opt =>
        opt.label.toLowerCase().includes(slashMenu.query.toLowerCase())
    );

    useEffect(() => {
        if (slashMenu.isOpen && filteredOptions.length > 0) {
            const el = document.getElementById(`slash-menu-item-${slashMenu.selectedIndex}`);
            if (el) {
                el.scrollIntoView({ block: 'nearest' });
            }
        }
    }, [slashMenu.selectedIndex, slashMenu.isOpen, filteredOptions.length]);

    const handleKeyDown = (e) => {
        if (!slashMenu.isOpen) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            e.stopPropagation();
            setSlashMenu(prev => ({ ...prev, selectedIndex: (prev.selectedIndex + 1) % filteredOptions.length }));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            e.stopPropagation();
            setSlashMenu(prev => ({ ...prev, selectedIndex: (prev.selectedIndex - 1 + filteredOptions.length) % filteredOptions.length }));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            e.stopPropagation();
            if (filteredOptions[slashMenu.selectedIndex]) {
                const selectedOption = filteredOptions[slashMenu.selectedIndex];
                setTimeout(() => executeSlashCommand(selectedOption), 0);
            }
        } else if (e.key === 'Escape') {
            closeSlashMenu();
        }
    };

    if (!file) return null;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div className="editor-header">
                <input
                    className="title-input"
                    value={localTitle}
                    onChange={handleTitleChange}
                    placeholder="Note Title"
                />
                <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto' }}>
                    <button
                        className="icon-button"
                        onClick={() => {
                            if (window.confirm("Delete this note?")) removeNode(fileId);
                        }}
                        title="Delete Note"
                        style={{ color: 'var(--danger-color)' }}
                    >
                        <Trash size={18} />
                    </button>
                </div>
            </div>

            <div className="editor-body" style={{ flex: 1, overflowY: 'auto', padding: '24px' }} onKeyDownCapture={handleKeyDown}>
                <EditorContent editor={editor} className="tiptap-container" />

                {slashMenu.isOpen && filteredOptions.length > 0 && (
                    <div style={{
                        position: 'fixed',
                        top: slashMenu.top,
                        bottom: slashMenu.bottom,
                        left: slashMenu.left,
                        maxHeight: '300px',
                        overflowY: 'auto',
                        backgroundColor: 'var(--bg-secondary)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px',
                        boxShadow: 'var(--shadow-md)',
                        zIndex: 50,
                        minWidth: '180px',
                    }}>
                        <ul id="slash-menu-list" style={{ listStyle: 'none', margin: 0, padding: '4px' }}>
                            {filteredOptions.map((opt, idx) => (
                                <li
                                    id={`slash-menu-item-${idx}`}
                                    key={opt.label}
                                    onMouseDown={(e) => {
                                        e.preventDefault();
                                        executeSlashCommand(opt);
                                    }}
                                    onMouseEnter={() => setSlashMenu(prev => ({ ...prev, selectedIndex: idx }))}
                                    style={{
                                        padding: '8px 12px',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '12px',
                                        borderRadius: '4px',
                                        backgroundColor: idx === slashMenu.selectedIndex ? 'var(--bg-accent)' : 'transparent',
                                        color: idx === slashMenu.selectedIndex ? 'var(--text-primary)' : 'var(--text-secondary)',
                                        fontSize: '14px'
                                    }}
                                >
                                    <span style={{
                                        width: '24px', height: '24px',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        backgroundColor: 'var(--bg-primary)', borderRadius: '4px',
                                        fontSize: '12px', fontWeight: 'bold', color: 'var(--text-tertiary)'
                                    }}>
                                        {opt.icon}
                                    </span>
                                    {opt.label}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
}
