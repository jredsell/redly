import React, { useMemo, useState, useEffect, useRef } from 'react';
import { CheckSquare, Square, Folder, FileText, ChevronRight, LayoutList, Columns, Tag } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { useNotes } from '../context/NotesContext';
import { parseTasksFromNodes } from '../utils/taskParser';
import { getDateColor } from '../utils/dateHelpers';
import InlineDateInput from './InlineDateInput';

export default function GlobalTasks() {
    const { nodes, openAndExpandFile, editNode, ensureAllContentsLoaded } = useNotes();
    const [isLoading, setIsLoading] = useState(true);
    const [viewMode, setViewMode] = useState('list'); // 'list' or 'kanban'
    const [selectedTagFilter, setSelectedTagFilter] = useState('');

    const tagFilterRef = useRef(null);

    useEffect(() => {
        const load = async () => {
            await ensureAllContentsLoaded();
            setIsLoading(false);
        };
        load();

        const handleKeyDown = (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.closest('.ProseMirror')) {
                return;
            }
            if (e.altKey && !e.shiftKey && e.key.toLowerCase() === 'v') {
                e.preventDefault();
                setViewMode(prev => prev === 'list' ? 'kanban' : 'list');
            }
            if (e.altKey && !e.shiftKey && e.key.toLowerCase() === 'g') {
                e.preventDefault();
                if (tagFilterRef.current) {
                    // Small timeout ensures the DOM has settled and React isn't 
                    // capturing/reverting focus for another reason
                    setTimeout(() => tagFilterRef.current.focus(), 10);
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [ensureAllContentsLoaded]);

    const sortedTasks = useMemo(() => {
        const parsedTasks = parseTasksFromNodes(nodes);
        return parsedTasks.sort((a, b) => {
            const getUrgency = (task) => {
                if (!task.date) return 4;
                const color = getDateColor(task.date, task.hasTime);
                if (color === 'var(--color-overdue)') return 1;
                if (color === 'var(--color-today)') return 2;
                if (color === 'var(--color-future)') return 3;
                return 4;
            };

            const urgencyA = getUrgency(a);
            const urgencyB = getUrgency(b);

            // 1. Sort by Urgency (Red -> Orange -> Green -> None)
            if (urgencyA !== urgencyB) {
                return urgencyA - urgencyB;
            }

            // 2. If same urgency, sort chronologically
            if (a.date && b.date) {
                const dateA = new Date(a.date).getTime();
                const dateB = new Date(b.date).getTime();
                if (dateA !== dateB) return dateA - dateB;
            }

            // 3. Secondary sort: Alphabetical by task text
            const textA = (a.text || '').trim().toLowerCase();
            const textB = (b.text || '').trim().toLowerCase();
            return textA.localeCompare(textB);
        });
    }, [nodes]);

    const allAvailableTags = useMemo(() => {
        const tagSet = new Set(['backlog', 'todo', 'doing', 'review', 'done']);
        sortedTasks.forEach(t => {
            if (t.tags && t.tags.length > 0) {
                t.tags.forEach(tag => tagSet.add(tag));
            }
        });
        return Array.from(tagSet).sort();
    }, [sortedTasks]);

    const filteredTasks = useMemo(() => {
        if (!selectedTagFilter) return sortedTasks;
        return sortedTasks.filter(t => t.tags && t.tags.includes(selectedTagFilter));
    }, [sortedTasks, selectedTagFilter]);

    const pendingTasks = filteredTasks.filter(t => !t.checked);
    const completedTasks = filteredTasks.filter(t => t.checked);

    const handleToggle = async (e, task) => {
        e.stopPropagation();
        const file = nodes.find(n => n.id === task.fileId);
        if (!file || !file.content) return;

        const lines = file.content.split('\n');
        const taskLine = lines[task.lineIndex];

        if (taskLine) {
            // Toggle [ ] <-> [x]
            if (taskLine.includes('- [ ]')) {
                lines[task.lineIndex] = taskLine.replace('- [ ]', '- [x]');
            } else if (taskLine.includes('- [x]')) {
                lines[task.lineIndex] = taskLine.replace('- [x]', '- [ ]');
            }

            await editNode(task.fileId, { content: lines.join('\n') });
        }
    };

    const handleDateUpdate = async (task, newDateString, newHasTime) => {
        const file = nodes.find(n => n.id === task.fileId);
        if (!file || !file.content) return;

        const lines = file.content.split('\n');
        let taskLine = lines[task.lineIndex];

        if (taskLine) {
            // Remove existing @date pattern (robust version)
            taskLine = taskLine.replace(/\s*@\d{4}-\d{2}-\d{2}(\s+\d{2}:\d{2})?/, '');

            // Add new @date if provided
            if (newDateString) {
                const [datePart, timePart] = newDateString.split('T');
                const formattedDate = newHasTime && timePart
                    ? `${datePart} ${timePart.substring(0, 5)}`
                    : datePart;
                taskLine = `${taskLine.trimEnd()} @${formattedDate}`;
            }

            lines[task.lineIndex] = taskLine;
            await editNode(task.fileId, { content: lines.join('\n') });
        }
    };



    const columns = useMemo(() => {
        const allColumns = new Set(['backlog', 'todo', 'doing', 'review', 'done']);
        filteredTasks.forEach(t => {
            if (t.column && t.column.trim() !== '') allColumns.add(t.column.toLowerCase());
        });
        const colArray = Array.from(allColumns).filter(c => c !== 'done');
        if (allColumns.has('done')) colArray.push('done');
        return colArray;
    }, [filteredTasks]);

    const onDragEnd = async (result) => {
        const { destination, source, draggableId } = result;
        if (!destination) return;
        if (destination.droppableId === source.droppableId && destination.index === source.index) return;

        const task = sortedTasks.find(t => t.id === draggableId);
        if (!task) return;

        const newColumn = destination.droppableId;
        const targetColumnTag = `#${newColumn}`;

        const file = nodes.find(n => n.id === task.fileId);
        if (!file || !file.content) return;

        const lines = file.content.split('\n');
        let taskLine = lines[task.lineIndex];

        if (taskLine) {
            // Find the last hashtag in the text to replace it
            const tagRegex = /(?:^|\s)#([a-zA-Z0-9_-]+)/g;
            let tagMatch;
            let lastTagMatch = null;
            while ((tagMatch = tagRegex.exec(taskLine)) !== null) {
                lastTagMatch = tagMatch;
            }

            if (lastTagMatch && lastTagMatch[1].toLowerCase() === task.column) {
                // Task had an explicit tag, replace it
                taskLine = taskLine.substring(0, lastTagMatch.index) + taskLine.substring(lastTagMatch.index).replace(lastTagMatch[0], ` ${targetColumnTag}`);
            } else {
                // Task had no explicit tag (defaulted column), append it
                taskLine = taskLine.trimEnd() + ` ${targetColumnTag}`;
            }

            // Sync visual checkbox state with 'done' vs 'todo/doing'
            if (newColumn === 'done' && taskLine.includes('- [ ]')) {
                taskLine = taskLine.replace('- [ ]', '- [x]');
            } else if (newColumn !== 'done' && taskLine.includes('- [x]')) {
                taskLine = taskLine.replace('- [x]', '- [ ]');
            }

            lines[task.lineIndex] = taskLine;
            await editNode(task.fileId, { content: lines.join('\n') });
        }
    };

    const TaskItem = ({ task }) => (
        <div
            className="global-task-item"
            style={{
                display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '12px 16px',
                borderBottom: '1px solid var(--border-color)', cursor: 'pointer',
                transition: 'background 0.2s'
            }}
            onClick={() => openAndExpandFile(task.fileId)}
        >
            <div
                onClick={(e) => handleToggle(e, task)}
                style={{
                    color: task.checked ? 'var(--text-tertiary)' : (task.date ? getDateColor(task.date, task.hasTime) : 'var(--accent-color)'),
                    marginTop: '2px',
                    cursor: 'pointer'
                }}
                title="Toggle Task"
            >

                {task.checked ? <CheckSquare size={18} /> : <Square size={18} />}
            </div>

            <div style={{ flex: 1 }}>
                <div style={{
                    fontSize: '15px', color: task.checked ? 'var(--text-tertiary)' : 'var(--text-primary)',
                    textDecoration: task.checked ? 'line-through' : 'none',
                    lineHeight: '1.4', marginBottom: '4px',
                    display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '6px'
                }}>
                    <span>{task.text || <em>Empty task</em>}</span>
                    {task.tags && task.tags.length > 0 && task.tags.map(tag => (
                        <span key={tag} style={{
                            background: 'var(--bg-secondary)',
                            color: 'var(--accent-color)',
                            border: '1px solid var(--border-color)',
                            padding: '1px 8px',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: '600',
                            textDecoration: 'none'
                        }}>
                            #{tag}
                        </span>
                    ))}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-tertiary)' }}>
                    {task.path.map((segment, idx) => (
                        <React.Fragment key={idx}>
                            <span style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                color: task.checked ? 'var(--text-tertiary)' : (idx === task.path.length - 1 && task.date ? getDateColor(task.date, task.hasTime) : 'inherit')
                            }}>
                                {idx === task.path.length - 1 ? <FileText size={12} /> : <Folder size={12} />}
                                {segment}
                            </span>

                            {idx < task.path.length - 1 && <ChevronRight size={12} style={{ opacity: 0.5 }} />}
                        </React.Fragment>
                    ))}

                    {task.date && (
                        <div style={{ marginLeft: '8px', zIndex: 10 }}>
                            <InlineDateInput
                                initialDate={task.date instanceof Date ? task.date.toISOString() : task.date}
                                initialHasTime={task.hasTime === true || task.hasTime === 'true'}
                                isChecked={task.checked}
                                onDateChange={(newDateStr, newHasTime) => handleDateUpdate(task, newDateStr, newHasTime)}
                                onClearDate={() => handleDateUpdate(task, null, false)}
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-primary)' }}>
            <div style={{ padding: '24px', borderBottom: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '8px', flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                    <div>
                        <h1 style={{ margin: 0, fontSize: '24px', display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-primary)' }}>
                            <CheckSquare size={28} style={{ color: 'var(--accent-color)' }} />
                            Tasks Overview
                        </h1>
                        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>
                            Manage all your Todo items across your knowledge base.
                        </p>
                    </div>

                    {/* View Toggle and Filter */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {allAvailableTags.length > 0 && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Tag size={16} style={{ color: 'var(--text-tertiary)' }} />
                                <select
                                    name="tag-filter"
                                    id="tag-filter"
                                    ref={tagFilterRef}
                                    value={selectedTagFilter}
                                    onChange={(e) => setSelectedTagFilter(e.target.value)}
                                    className="tag-filter-select"
                                    style={{
                                        background: 'var(--bg-secondary)',
                                        color: 'var(--text-primary)',
                                        border: '1px solid var(--border-color)',
                                        borderRadius: '6px',
                                        padding: '4px 8px',
                                        fontSize: '13px',
                                        cursor: 'pointer',
                                        outline: 'none'
                                    }}
                                >
                                    <option value="">All Tags</option>
                                    {allAvailableTags.map(tag => (
                                        <option key={tag} value={tag}>#{tag}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                        <div style={{ display: 'flex', background: 'var(--bg-secondary)', padding: '4px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                            <button
                                onClick={() => setViewMode('list')}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '4px', border: 'none', cursor: 'pointer',
                                    fontSize: '13px', fontWeight: 'bold', transition: 'all 0.2s',
                                    background: viewMode === 'list' ? 'var(--bg-accent)' : 'transparent',
                                    color: viewMode === 'list' ? 'var(--accent-color)' : 'var(--text-secondary)'
                                }}
                            >
                                <LayoutList size={16} /> List
                            </button>
                            <button
                                onClick={() => setViewMode('kanban')}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '4px', border: 'none', cursor: 'pointer',
                                    fontSize: '13px', fontWeight: 'bold', transition: 'all 0.2s',
                                    background: viewMode === 'kanban' ? 'var(--bg-accent)' : 'transparent',
                                    color: viewMode === 'kanban' ? 'var(--accent-color)' : 'var(--text-secondary)'
                                }}
                            >
                                <Columns size={16} /> Board
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: viewMode === 'kanban' ? '0 24px' : '0 24px 24px 24px', display: 'flex', flexDirection: 'column' }}>
                <div style={{ maxWidth: '800px', margin: '0 auto', paddingTop: '24px' }}>

                    {isLoading ? (
                        <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-tertiary)' }}>
                            <div className="loading-spinner" style={{ marginBottom: '16px' }}>
                                <CheckSquare size={48} style={{ opacity: 0.2, animation: 'pulse 1.5s infinite' }} />
                            </div>
                            <p>Scanning all notes for tasks...</p>
                            <style>{`
                                @keyframes pulse {
                                    0% { transform: scale(0.95); opacity: 0.2; }
                                    50% { transform: scale(1.05); opacity: 0.5; }
                                    100% { transform: scale(0.95); opacity: 0.2; }
                                }
                            `}</style>
                        </div>
                    ) : pendingTasks.length === 0 && completedTasks.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-tertiary)' }}>
                            <CheckSquare size={48} style={{ opacity: 0.2, marginBottom: '16px' }} />
                            <p>You don't have any tasks right now.</p>
                            <p style={{ fontSize: '13px' }}>Type `/` in any note and select "Todo List" to create one.</p>
                        </div>
                    ) : viewMode === 'list' ? (
                        <div style={{ maxWidth: '800px', margin: '0 auto', paddingTop: '24px' }}>
                            <div style={{ marginBottom: '32px' }}>
                                <h3 style={{ fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--accent-color)', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px', marginBottom: '0' }}>
                                    Pending Actions ({pendingTasks.length})
                                </h3>
                                <div>
                                    {pendingTasks.map(task => <TaskItem key={task.id} task={task} />)}
                                </div>
                            </div>

                            {completedTasks.length > 0 && (
                                <div style={{ opacity: 0.7 }}>
                                    <h3 style={{ fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-tertiary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px', marginBottom: '0' }}>
                                        Completed ({completedTasks.length})
                                    </h3>
                                    <div>
                                        {completedTasks.map(task => <TaskItem key={task.id} task={task} />)}
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <DragDropContext onDragEnd={onDragEnd}>
                            <div className="kanban-board-scroll" style={{ display: 'flex', gap: '24px', padding: '12px 4px 24px 4px', overflowX: 'auto', flex: 1, height: '100%', alignItems: 'flex-start' }}>
                                {columns.map(col => {
                                    const colTasks = filteredTasks.filter(t => t.column === col);
                                    return (
                                        <div key={col} className="kanban-column" style={{ minWidth: '275px', width: '275px', borderRadius: '12px', display: 'flex', flexDirection: 'column', maxHeight: '100%', overflow: 'hidden' }}>
                                            <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-color)', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-secondary)' }}>
                                                <span style={{ textTransform: 'uppercase', fontSize: '13px', letterSpacing: '0.05em', color: 'var(--text-primary)' }}>#{col}</span>
                                                <span style={{ fontSize: '12px', background: 'var(--bg-primary)', color: 'var(--text-secondary)', padding: '2px 10px', borderRadius: '12px', border: '1px solid var(--border-color)', fontWeight: '600' }}>{colTasks.length}</span>
                                            </div>
                                            <Droppable droppableId={col}>
                                                {(provided, snapshot) => (
                                                    <div ref={provided.innerRef} {...provided.droppableProps} style={{ padding: '12px', flex: 1, overflowY: 'auto', minHeight: '150px', display: 'flex', flexDirection: 'column', gap: '10px', background: snapshot.isDraggingOver ? 'var(--bg-hover)' : 'transparent', transition: 'background 0.2s', borderBottomLeftRadius: '12px', borderBottomRightRadius: '12px' }}>
                                                        {colTasks.map((task, index) => (
                                                            <Draggable key={task.id} draggableId={task.id} index={index}>
                                                                {(provided, snapshot) => (
                                                                    <div
                                                                        ref={provided.innerRef}
                                                                        {...provided.draggableProps}
                                                                        {...provided.dragHandleProps}
                                                                        className="kanban-card"
                                                                        style={{
                                                                            ...provided.draggableProps.style,
                                                                            background: 'var(--bg-primary)',
                                                                            border: '1px solid var(--border-color)',
                                                                            borderRadius: '8px',
                                                                            padding: '14px',
                                                                            boxShadow: snapshot.isDragging ? 'var(--shadow-md)' : 'var(--shadow-sm)',
                                                                            opacity: snapshot.isDragging ? 0.95 : 1,
                                                                            userSelect: 'none',
                                                                            display: 'flex',
                                                                            flexDirection: 'column',
                                                                            gap: '6px'
                                                                        }}
                                                                        onClick={(e) => {
                                                                            if (e.target.tagName.toLowerCase() === 'input') return;
                                                                            openAndExpandFile(task.fileId);
                                                                        }}
                                                                    >
                                                                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                                                                            <div onClick={(e) => handleToggle(e, task)} style={{ color: task.checked ? 'var(--text-tertiary)' : (task.date ? getDateColor(task.date, task.hasTime) : 'var(--accent-color)'), cursor: 'pointer', marginTop: '1px' }}>
                                                                                {task.checked ? <CheckSquare size={18} /> : <Square size={18} />}
                                                                            </div>
                                                                            <div style={{ flex: 1, fontSize: '14.5px', color: task.checked ? 'var(--text-tertiary)' : 'var(--text-primary)', textDecoration: task.checked ? 'line-through' : 'none', lineHeight: '1.4', fontWeight: task.checked ? '400' : '500' }}>
                                                                                <div style={{ marginBottom: '4px' }}>{task.text || <em>Empty task</em>}</div>
                                                                                {task.tags && task.tags.length > 0 && (
                                                                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                                                                                        {task.tags.map(tag => (
                                                                                            <span key={tag} style={{
                                                                                                background: 'var(--bg-secondary)',
                                                                                                color: 'var(--accent-color)',
                                                                                                border: '1px solid var(--border-color)',
                                                                                                padding: '1px 8px',
                                                                                                borderRadius: '12px',
                                                                                                fontSize: '11px',
                                                                                                fontWeight: '600',
                                                                                                textDecoration: 'none'
                                                                                            }}>
                                                                                                #{tag}
                                                                                            </span>
                                                                                        ))}
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', marginTop: '6px' }}>
                                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: '500', color: 'var(--text-tertiary)', background: 'var(--bg-secondary)', padding: '2px 8px', borderRadius: '4px', cursor: 'pointer' }}>
                                                                                <Folder size={12} />
                                                                                {task.path.slice(-1)[0]}
                                                                            </div>
                                                                            {task.date && (
                                                                                <div>
                                                                                    <InlineDateInput
                                                                                        initialDate={task.date instanceof Date ? task.date.toISOString() : task.date}
                                                                                        initialHasTime={task.hasTime === true || task.hasTime === 'true'}
                                                                                        isChecked={task.checked}
                                                                                        onDateChange={(newDateStr, newHasTime) => handleDateUpdate(task, newDateStr, newHasTime)}
                                                                                        onClearDate={() => handleDateUpdate(task, null, false)}
                                                                                    />
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </Draggable>
                                                        ))}
                                                        {provided.placeholder}
                                                    </div>
                                                )}
                                            </Droppable>
                                        </div>
                                    );
                                })}
                            </div>
                        </DragDropContext>
                    )}
                </div>
            </div>
        </div>
    );
}
