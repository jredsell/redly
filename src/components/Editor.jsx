import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNotes } from '../context/NotesContext';
import { Trash, Bold, Italic, Strikethrough, Code, Heading1, Heading2, Heading3, List, ListOrdered, Quote, CheckSquare, Link as LinkIcon, ExternalLink } from 'lucide-react';


import { useEditor, EditorContent, ReactNodeViewRenderer, NodeViewWrapper, NodeViewContent } from '@tiptap/react';
import { Node, mergeAttributes, InputRule } from '@tiptap/core';
import TurndownService from 'turndown';
import markdownit from 'markdown-it';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import TaskItem from '@tiptap/extension-task-item';
import TaskList from '@tiptap/extension-task-list';
import taskLists from 'markdown-it-task-lists';
import { parseDateString } from '../utils/dateHelpers';
import InlineDateInput from './InlineDateInput';
import CodeBlock from '@tiptap/extension-code-block';
import TiptapLink from '@tiptap/extension-link';


// React Component for TaskItem Node View
const CustomTaskItemComponent = (props) => {
    const { node, updateAttributes } = props;
    if (!node || !node.attrs) return null;
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
                    onChange={e => {
                        updateAttributes({ checked: e.target.checked });
                    }}
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
                    <div data-type="inline-date-badge" contentEditable={false} style={{ marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px', userSelect: 'none' }}>

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
            if (typeof getPos !== 'function') return;
            const pos = getPos();
            if (pos === undefined) return;
            const $pos = editor.state.doc.resolve(pos);
            let taskItemNode = null;
            for (let i = $pos.depth; i > 0; i--) { if ($pos.node(i).type.name === 'taskItem') { taskItemNode = $pos.node(i); break; } }
            const { parsedDate, hasDate, hasTime } = parseDateString(value);
            if (taskItemNode && hasDate) {
                editor.chain().deleteRange({ from: pos, to: pos + 1 }).updateAttributes('taskItem', { date: parsedDate, hasDate, hasTime }).focus().run();
            } else {
                editor.chain().deleteRange({ from: pos, to: pos + 1 }).insertContent(`@${value}`).focus().run();
            }
        } else if (e.key === 'Escape') {
            const { getPos } = props;
            if (typeof getPos !== 'function') return;
            const pos = getPos();
            if (pos === undefined) return;
            props.editor.chain().deleteRange({ from: pos, to: pos + 1 }).insertContent(`@${value}`).focus().run();
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

const md = markdownit({ html: true, linkify: true, typographer: true }).use(taskLists, { label: false });

const td = new TurndownService({
    headingStyle: 'atx',
    hr: '---',
    bulletListMarker: '-',
    codeBlockStyle: 'fenced',
    blankReplacement: (content, node) => {
        return node.nodeName === 'P' ? '&nbsp;\n\n' : (node.isBlock ? '\n\n' : '');
    }
});
// Task Item serialization
td.addRule('taskItem', {
    filter: (node) => node.nodeName === 'LI' && (
        node.getAttribute('data-type') === 'taskItem' ||
        node.classList.contains('task-list-item')
    ),
    replacement: (content, node) => {
        const isChecked = node.getAttribute('data-checked') === 'true' ||
            node.hasAttribute('checked') ||
            node.classList.contains('is-checked') ||
            !!node.querySelector('input[checked]') ||
            !!node.querySelector('input[type="checkbox"]:checked');




        const date = node.getAttribute('data-date');
        const hasTime = node.getAttribute('data-has-time') === 'true';

        // Content should be clean text/markdown from children
        let cleanContent = content.trim();

        // Remove any leading/trailing list markers that might have leaked from default rules
        cleanContent = cleanContent.replace(/^[\s\-\*\[\]x]*\s*/, '');
        // Remove "Due:" text if added by badges
        cleanContent = cleanContent.replace(/Due:\s*[^]*?(\n|$)/g, '').trim();

        let dateString = '';
        if (date) {
            const formattedDate = hasTime ? date.replace('T', ' ') : date.split('T')[0];
            dateString = ` @${formattedDate}`;
        }

        return `\n- [${isChecked ? 'x' : ' '}] ${cleanContent}${dateString}`;
    }
});



td.addRule('inlineDateInput', {
    filter: (node) => node.getAttribute('data-type') === 'inline-date',
    replacement: (content, node) => {
        const input = node.querySelector('input');
        const badgeValue = node.getAttribute('data-date-value');
        return `@${input ? input.value : (badgeValue || '')}`;
    }
});

// Explicitly ignore the date badge text in Turndown
td.addRule('ignoreDateBadge', {
    filter: (node) => {
        // More robust filter for the date badge div
        return (
            (node.getAttribute('contenteditable') === 'false' && (node.innerText?.includes('Due:') || node.textContent?.includes('Due:'))) ||
            node.getAttribute('data-type') === 'inline-date-badge'
        );
    },
    replacement: () => ''
});

td.addRule('fencedCodeBlock', {
    filter: 'pre',
    replacement: (content, node) => {
        const code = node.innerText || node.textContent || '';
        return `\n\n\`\`\`\n${code.trim()}\n\`\`\`\n\n`;
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

const BubbleMenuUI = ({ editor, bubbleMenu, setBubbleMenu }) => {
    const [, setTick] = useState(0);

    useEffect(() => {
        if (!editor || !bubbleMenu.isOpen) return;
        const update = () => setTick(t => t + 1);
        editor.on('transaction', update);
        return () => editor.off('transaction', update);
    }, [editor, bubbleMenu.isOpen]);

    if (!bubbleMenu.isOpen || !editor || typeof bubbleMenu.top !== 'number' || typeof bubbleMenu.left !== 'number') return null;

    return (
        <div
            className="custom-bubble-menu"
            style={{ position: 'fixed', top: bubbleMenu.top, left: bubbleMenu.left, zIndex: 100 }}
            onMouseDown={(e) => e.preventDefault()} // Prevent stealing focus from the editor
        >
            <button onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} className={editor.isActive('heading', { level: 1 }) ? 'is-active' : ''} title="Heading 1"><Heading1 size={16} /></button>
            <button onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={editor.isActive('heading', { level: 2 }) ? 'is-active' : ''} title="Heading 2"><Heading2 size={16} /></button>
            <button onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} className={editor.isActive('heading', { level: 3 }) ? 'is-active' : ''} title="Heading 3"><Heading3 size={16} /></button>
            <button onClick={() => editor.chain().focus().setParagraph().run()} className={editor.isActive('paragraph') ? 'is-active' : ''} title="Text"><span style={{ fontSize: '12px', fontWeight: 'bold' }}>T</span></button>

            <button onClick={() => editor.chain().focus().toggleBold().run()} className={editor.isActive('bold') ? 'is-active' : ''} title="Bold"><Bold size={16} /></button>
            <button onClick={() => editor.chain().focus().toggleItalic().run()} className={editor.isActive('italic') ? 'is-active' : ''} title="Italic"><Italic size={16} /></button>
            <button onClick={() => editor.chain().focus().toggleStrike().run()} className={editor.isActive('strike') ? 'is-active' : ''} title="Strikethrough"><Strikethrough size={16} /></button>

            {!editor.isActive('link') && (
                <button
                    onClick={() => {
                        const url = window.prompt('URL');
                        if (url) editor.chain().focus().setLink({ href: url }).run();
                    }}
                    title="Add Link"
                >
                    <LinkIcon size={16} />
                </button>
            )}

            {editor.isActive('link') && (
                <>
                    <button
                        onClick={() => {
                            const currentUrl = editor.getAttributes('link').href;
                            const url = window.prompt('Edit URL', currentUrl);
                            if (url === null) return;

                            // Accurately find the link bounds
                            const { selection, doc } = editor.state;
                            let linkStart = selection.from;
                            let linkEnd = selection.to;

                            doc.nodesBetween(selection.from, selection.to, (node, pos) => {
                                if (node.marks.find(m => m.type.name === 'link')) {
                                    linkStart = Math.min(linkStart, pos);
                                    linkEnd = Math.max(linkEnd, pos + node.nodeSize);
                                }
                            });

                            const currentText = doc.textBetween(linkStart, linkEnd, ' ');
                            const text = window.prompt('Edit Display Text', currentText);

                            if (url === '') {
                                editor.chain().focus().extendMarkRange('link').unsetLink().run();
                                if (text !== null && text !== currentText) {
                                    editor.chain().focus().deleteRange({ from: linkStart, to: linkEnd }).insertContent(text).run();
                                }
                                return;
                            }

                            if (text !== null && text !== currentText) {
                                editor.chain().focus()
                                    .deleteRange({ from: linkStart, to: linkEnd })
                                    .insertContent({
                                        type: 'text',
                                        text: text,
                                        marks: [{ type: 'link', attrs: { href: url } }]
                                    })
                                    .run();
                            } else {
                                editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
                            }
                        }}
                        className="is-active"
                        title="Edit Link"
                        style={{ fontSize: '12px', padding: '4px 8px', whiteSpace: 'nowrap' }}
                    >
                        Edit Link
                    </button>
                    <button
                        onClick={() => {
                            editor.chain().focus().extendMarkRange('link').unsetLink().run();
                        }}
                        title="Remove Link"
                        style={{ color: 'var(--danger-color)', fontSize: '12px', padding: '4px 8px', whiteSpace: 'nowrap' }}
                    >
                        Unlink
                    </button>
                </>
            )}

            <button onClick={() => editor.chain().focus().toggleCode().run()} className={editor.isActive('code') ? 'is-active' : ''} title="Code Inline"><Code size={16} /></button>
            <div className="menu-separator" />
            <button onClick={() => editor.chain().focus().toggleBulletList().run()} className={editor.isActive('bulletList') ? 'is-active' : ''} title="Bullet List"><List size={16} /></button>
            <button onClick={() => editor.chain().focus().toggleOrderedList().run()} className={editor.isActive('orderedList') ? 'is-active' : ''} title="Numbered List"><ListOrdered size={16} /></button>
            <button onClick={() => editor.chain().focus().toggleTaskList().run()} className={editor.isActive('taskList') ? 'is-active' : ''} title="Todo List"><CheckSquare size={16} /></button>
            <button onClick={() => editor.chain().focus().toggleBlockquote().run()} className={editor.isActive('blockquote') ? 'is-active' : ''} title="Quote"><Quote size={16} /></button>
            <button onClick={() => editor.chain().focus().toggleCodeBlock().run()} className={editor.isActive('codeBlock') ? 'is-active' : ''} title="Code Block"><ExternalLink size={16} /></button>
        </div>
    );
};

export default function Editor({ fileId }) {
    const { nodes, editNode, removeNode, getFileContent } = useNotes();
    const [file, setFile] = useState(null);
    const saveTimeoutRef = useRef(null);
    const lastSavedContentRef = useRef(''); // Track the last saved state to prevent echo updates
    const [localTitle, setLocalTitle] = useState('');
    const pendingUpdatesRef = useRef({}); // Merge updates (name, content) to prevent race conditions during renames
    const [slashMenu, setSlashMenu] = useState({ isOpen: false, top: 0, left: 0, query: '', triggerIdx: -1, selectedIndex: 0 });
    const [bubbleMenu, setBubbleMenu] = useState({ isOpen: false, top: 0, left: 0 });
    const [forceRender, setForceRender] = useState(0);
    const slashMenuListRef = useRef(null);

    const debouncedSave = useCallback((updates) => {
        // Merge new updates into the pending buffer
        pendingUpdatesRef.current = { ...pendingUpdatesRef.current, ...updates };

        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = setTimeout(async () => {
            const currentUpdates = { ...pendingUpdatesRef.current };
            pendingUpdatesRef.current = {}; // Clear buffer BEFORE the async call

            if (currentUpdates.content) {
                currentUpdates.content = td.turndown(currentUpdates.content);
                lastSavedContentRef.current = currentUpdates.content;
            }
            editNode(fileId, currentUpdates);
        }, 1000);
    }, [fileId, editNode]);

    const extensions = useMemo(() => [
        StarterKit.configure({ heading: { levels: [1, 2, 3] }, history: true, codeBlock: false }),
        CodeBlock.configure({
            HTMLAttributes: { class: 'tiptap-code-block' },
        }),
        TiptapLink.configure({
            openOnClick: false,
            autolink: true,
            linkOnPaste: true,
            HTMLAttributes: {
                class: 'editor-link',
                rel: 'noopener noreferrer',
                target: '_blank',
            },
        }),
        Placeholder.configure({ placeholder: "Start typing..." }),

        TaskList.configure({
            HTMLAttributes: { 'data-type': 'taskList', class: 'task-list' },
        }).extend({
            parseHTML() {
                return [
                    { tag: 'ul[data-type="taskList"]', priority: 100 },
                    { tag: 'ul.task-list', priority: 100 },
                ];
            }
        }),
        TaskItem.configure({
            HTMLAttributes: { 'data-type': 'taskItem', class: 'task-list-item' },
            keepAttributes: false,
        }).extend({
            addAttributes() {
                return {
                    checked: {
                        default: false,
                        keepAttributes: true,
                        parseHTML: element => {
                            if (element.hasAttribute('data-checked')) return element.getAttribute('data-checked') === 'true';
                            if (element.hasAttribute('checked')) return true;
                            const checkbox = element.querySelector('input[type="checkbox"]');
                            return checkbox ? checkbox.checked : false;
                        },
                        renderHTML: attributes => ({
                            'data-checked': attributes.checked,
                            checked: attributes.checked ? 'checked' : null
                        })
                    },
                    date: {
                        default: '',
                        parseHTML: element => {
                            const attrDate = element.getAttribute('data-date');
                            if (attrDate) return attrDate;

                            // Fallback: try to extract from text content
                            const text = element.textContent || '';
                            const dateRegex = /@(\d{4}-\d{2}-\d{2}(?:\s+\d{2}:\d{2})?)/;
                            const match = text.match(dateRegex);
                            if (match) {
                                const { parsedDate } = parseDateString(match[1]);
                                // Optional: We could try to physically remove it from the DOM element here 
                                // so Tiptap's content ingestion doesn't see it, but that's risky.
                                // Instead, we rely on the attribute being set and our render logic.
                                return parsedDate;
                            }
                            return '';
                        },
                        renderHTML: attributes => ({ 'data-date': attributes.date })
                    },

                    hasTime: {
                        default: false,
                        parseHTML: element => {
                            if (element.getAttribute('data-has-time')) return element.getAttribute('data-has-time') === 'true';
                            const text = element.textContent || '';
                            return /@\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}/.test(text);
                        },
                        renderHTML: attributes => ({ 'data-has-time': attributes.hasTime })
                    },
                    hasDate: {
                        default: false,
                        parseHTML: element => {
                            if (element.getAttribute('data-has-date')) return element.getAttribute('data-has-date') === 'true';
                            if (element.getAttribute('data-date')) return true;
                            const text = element.textContent || '';
                            return /@\d{4}-\d{2}-\d{2}/.test(text);
                        },
                        renderHTML: attributes => ({ 'data-has-date': attributes.hasDate })
                    }
                };
            },




            parseHTML() {
                return [
                    { tag: 'li[data-type="taskItem"]', priority: 100 },
                    { tag: 'li.task-list-item', priority: 100 },
                    { tag: 'li', getAttrs: element => element.classList.contains('task-list-item') && { 'data-type': 'taskItem' } },
                ];
            },

            addNodeView() { return ReactNodeViewRenderer(CustomTaskItemComponent); },

            addKeyboardShortcuts() {
                return {
                    Enter: () => this.editor.commands.splitListItem(this.name, { checked: false, date: '', hasDate: false, hasTime: false }),
                };
            },

            renderHTML({ node, HTMLAttributes }) {
                // Ensure data-checked accurately reflects the checked attribute
                return ['li', mergeAttributes(HTMLAttributes, {
                    'data-type': 'taskItem',
                    'data-checked': node.attrs.checked ? 'true' : 'false'
                }), 0];
            },




            addInputRules() {
                return [
                    new InputRule({
                        find: /^\s*(\[([ |xX])\])\s$/,
                        handler: ({ state, range, match }) => {
                            const checked = match[2].toLowerCase() === 'x';
                            const { tr } = state;
                            tr.delete(range.from, range.to);
                            return tr.setBlockType(range.from, this.type, { checked });
                        },
                    }),
                ];
            },
            parseHTML() {
                return [
                    { tag: 'li[data-type="taskItem"]', priority: 100 },
                    {
                        tag: 'li.task-list-item',
                        priority: 100,
                        getAttrs: node => {
                            const checkbox = node.querySelector('input[type="checkbox"]');
                            const dateAttr = node.getAttribute('data-date');
                            const hasTimeAttr = node.getAttribute('data-has-time') === 'true';

                            if (dateAttr) {
                                return { checked: checkbox ? checkbox.checked : false, date: dateAttr, hasDate: true, hasTime: hasTimeAttr };
                            }

                            // Fallback: Parse from text content (needed for initial load from Markdown)
                            const text = node.innerText || node.textContent || '';
                            const dateMatch = text.match(/@(\d{2,4}[-\/\. ]\d{2}[-\/\. ]\d{2,4}(?:\s\d{2}:\d{2})?)/);
                            if (dateMatch) {
                                const { parsedDate, hasDate, hasTime } = parseDateString(dateMatch[1]);
                                if (hasDate) {
                                    return { checked: checkbox ? checkbox.checked : false, date: parsedDate, hasDate, hasTime };
                                }
                            }

                            return { checked: checkbox ? checkbox.checked : false, date: '', hasDate: false, hasTime: false };
                        }

                    },
                    {
                        tag: 'li',
                        priority: 50,
                        getAttrs: node => {
                            const isTaskListItem = node.classList.contains('task-list-item') ||
                                node.getAttribute('data-type') === 'taskItem' ||
                                node.querySelector('input[type="checkbox"]');

                            if (!isTaskListItem) return false;

                            const checkbox = node.querySelector('input[type="checkbox"]');
                            const dateAttr = node.getAttribute('data-date');
                            const hasTimeAttr = node.getAttribute('data-has-time') === 'true';

                            if (dateAttr) {
                                return { checked: checkbox ? checkbox.checked : false, date: dateAttr, hasDate: true, hasTime: hasTimeAttr };
                            }

                            // Fallback: Parse from text content
                            const text = node.innerText || node.textContent || '';
                            const dateMatch = text.match(/@(\d{2,4}[-\/\. ]\d{2}[-\/\. ]\d{2,4}(?:\s\d{2}:\d{2})?)/);
                            if (dateMatch) {
                                const { parsedDate, hasDate, hasTime } = parseDateString(dateMatch[1]);
                                if (hasDate) {
                                    return { checked: checkbox ? checkbox.checked : false, date: parsedDate, hasDate, hasTime };
                                }
                            }

                            return { checked: checkbox ? checkbox.checked : false, date: '', hasDate: false, hasTime: false };
                        }

                    }
                ];
            }

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
                        // SCOPE FIX: Only trigger inside a taskItem
                        const $pos = state.doc.resolve(range.from);
                        let isInsideTask = false;
                        for (let i = $pos.depth; i > 0; i--) {
                            if ($pos.node(i).type.name === 'taskItem') {
                                isInsideTask = true;
                                break;
                            }
                        }
                        if (!isInsideTask) return null;

                        state.tr.replaceWith(range.from + 1, range.to, this.type.create());
                    }
                })];
            }

        })
    ], []);

    const editor = useEditor({
        extensions,
        content: '',
        onUpdate: ({ editor }) => debouncedSave({ content: editor.getHTML() }),
        onTransaction: () => {
            // Force UI to re-read editor.isActive() to eliminate active state delays
            setForceRender(prev => prev + 1);
        },
        onSelectionUpdate: ({ editor }) => {
            try {
                const { from, to, empty } = editor.state.selection;

                // Selection can sometimes be out of sync with the view during rapid changes
                if (from < 0 || to > editor.state.doc.content.size) {
                    setBubbleMenu({ isOpen: false, top: 0, left: 0 });
                    return;
                }

                if (!empty && (to - from) < 5000) {
                    // VERIFY VIEW: Ensure the editor view is ready and not destroyed
                    if (!editor.view || !editor.view.domAtPos) {
                        setBubbleMenu({ isOpen: false, top: 0, left: 0 });
                        return;
                    }

                    // DEEP SAFETY: Check if the position exists in the current view mapping
                    try {
                        const { node } = editor.view.domAtPos(from);
                        if (!node) {
                            setBubbleMenu({ isOpen: false, top: 0, left: 0 });
                            return;
                        }

                        // Use coordsAtPos for the end of the selection to place the menu nicely
                        const coords = editor.view.coordsAtPos(to);
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
                    } catch (innerErr) {
                        // This handles cases where domAtPos or coordsAtPos throws
                        setBubbleMenu({ isOpen: false, top: 0, left: 0 });
                    }
                } else {
                    setBubbleMenu({ isOpen: false, top: 0, left: 0 });

                    if (empty) {
                        const $pos = editor.state.doc.resolve(from);
                        const parent = $pos.parent;
                        if (!parent) return;

                        // textBetween can throw if offsets are invalid
                        const textBefore = parent.textBetween(0, Math.min($pos.parentOffset, parent.content.size), '\n');
                        const match = textBefore.match(/(?:^|\s)\/([a-zA-Z0-9]*)$/);

                        if (match) {
                            const query = match[1];
                            const triggerIdx = from - query.length - 1;

                            try {
                                const coords = editor.view.coordsAtPos(triggerIdx);
                                if (coords && typeof coords.bottom === 'number' && typeof coords.left === 'number') {
                                    const menuHeight = 320;
                                    const viewportHeight = window.innerHeight;
                                    const wouldOverflow = coords.bottom + menuHeight > viewportHeight - 20;

                                    setSlashMenu({
                                        isOpen: true,
                                        top: wouldOverflow ? Math.max(10, coords.top - menuHeight - 10) : coords.bottom + 4,
                                        left: coords.left,
                                        query: query,
                                        triggerIdx: triggerIdx,
                                        selectedIndex: 0
                                    });



                                } else {
                                    setSlashMenu(prev => ({ ...prev, isOpen: false }));
                                }
                            } catch (e) {
                                setSlashMenu(prev => ({ ...prev, isOpen: false }));
                            }
                        } else {
                            setSlashMenu(prev => ({ ...prev, isOpen: false }));
                        }
                    }
                }
            } catch (err) {
                console.error('Editor: Selection update error', err);
                setBubbleMenu({ isOpen: false, top: 0, left: 0 });
                setSlashMenu(prev => ({ ...prev, isOpen: false }));
            }
        },

        onBlur: () => {
            setBubbleMenu({ isOpen: false, top: 0, left: 0 });
            setSlashMenu(prev => ({ ...prev, isOpen: false }));
        }

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
        if (slashMenu.isOpen && slashMenuListRef.current) {
            const activeItem = slashMenuListRef.current.children[slashMenu.selectedIndex];
            if (activeItem) {
                activeItem.scrollIntoView({ block: 'nearest' });
            }
        }
    }, [slashMenu.selectedIndex, slashMenu.isOpen]);

    useEffect(() => {
        const f = nodes.find(n => n.id === fileId);
        if (f) {
            const isInitialLoad = !file || file.id !== fileId;
            // Only update if it's NOT the content we just saved (prevent echo)
            // AND ensure f.content is actually defined (it might be undefined if not yet loaded on-demand)
            const isExternalUpdate = !isInitialLoad &&
                f.content !== undefined &&
                f.content !== (file?.content || '') &&
                f.content !== lastSavedContentRef.current &&
                f.updatedAt > (file?.updatedAt || 0);

            // Keep file state up to date without necessarily re-loading editor
            setFile(f);

            if (isInitialLoad || isExternalUpdate) {
                if (isInitialLoad) {
                    setLocalTitle(f.name || '');
                    lastSavedContentRef.current = f.content || ''; // initialize ref
                }

                if (editor) {
                    const loadContent = async () => {
                        let content = f.content;
                        // On-demand loading: if content is missing from node state, fetch it
                        if (content === undefined) {
                            try {
                                content = await getFileContent(fileId);
                                // Update local state so we don't fetch again
                                setFile(prev => prev?.id === fileId ? { ...prev, content } : prev);
                            } catch (err) {
                                console.error('[Editor] Failed to load file content:', err);
                                return;
                            }
                        }

                        lastSavedContentRef.current = content || '';

                        // Ensure task list markers have a space after them for markdown-it-task-lists
                        const preparedContent = (content || '').replace(/^(\s*-\s*\[[ xX]\])(\S)/gm, '$1 $2');
                        let html = md.render(preparedContent);

                        // Convert regular task lists to data-type="taskList" and items to taskItem
                        html = html.replace(/<ul[^>]*class=["'][^"']*task-list[^"']*["'][^>]*>/gi, '<ul data-type="taskList">')
                            .replace(/<li[^>]*class=["'][^"']*task-list-item[^"']*["'][^>]*>/gi, '<li data-type="taskItem">');

                        // Extract @date and move to attribute, but keep other content clean
                        html = html.replace(/(<li data-type="taskItem"[^>]*>)([\s\S]*?)(<\/li>)/gi, (match, openTag, liContent, closeTag) => {
                            const dateRegex = /@(\d{4}-\d{2}-\d{2}(?:\s+\d{2}:\d{2})?)/;
                            const dateMatch = liContent.match(dateRegex);
                            if (dateMatch) {
                                const dateStr = dateMatch[1];
                                const cleanedContent = liContent.replace(dateRegex, '').trim();
                                return `${openTag.replace('>', ` data-date="${dateStr}" data-has-date="true" data-has-time="${dateStr.includes(':')}">`)}${cleanedContent}${closeTag}`;
                            }
                            return match;
                        });

                        const selection = editor.state.selection;
                        editor.commands.setContent(html, false);

                        if (isExternalUpdate) {
                            try {
                                editor.commands.setTextSelection(selection);
                            } catch (e) { /* ignore */ }
                        }
                    };
                    loadContent();
                }
            }
        }
    }, [fileId, nodes, editor, file?.id]);


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
                <BubbleMenuUI editor={editor} bubbleMenu={bubbleMenu} setBubbleMenu={setBubbleMenu} />

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
                        zIndex: 1000,
                        minWidth: '200px',
                        padding: '4px',
                        maxHeight: '300px',
                        overflowY: 'auto'
                    }}>

                        <ul ref={slashMenuListRef} style={{ listStyle: 'none', margin: 0, padding: 0 }}>
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
                .editor-link {
                    color: var(--accent-color);
                    text-decoration: underline;
                    cursor: pointer;
                }
                .editor-link:hover {
                    opacity: 0.8;
                }

            `}</style>
        </div>
    );
}