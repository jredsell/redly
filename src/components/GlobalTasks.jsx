import React, { useMemo } from 'react';
import { CheckSquare, Square, Folder, FileText, ChevronRight } from 'lucide-react';
import { useNotes } from '../context/NotesContext';
import { parseTasksFromNodes } from '../utils/taskParser';
import { getDateColor } from '../utils/dateHelpers';
import InlineDateInput from './InlineDateInput';

export default function GlobalTasks() {
    const { nodes, setActiveFileId, editNode } = useNotes();

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

    const pendingTasks = sortedTasks.filter(t => !t.checked);
    const completedTasks = sortedTasks.filter(t => t.checked);

    const handleToggle = async (e, task) => {
        e.stopPropagation();
        const file = nodes.find(n => n.id === task.fileId);
        if (!file || !file.content) return;

        const parser = new DOMParser();
        const doc = parser.parseFromString(file.content, 'text/html');
        const taskElements = doc.querySelectorAll('li[data-type="taskItem"]');

        if (taskElements[task.taskIndex]) {
            const el = taskElements[task.taskIndex];
            const isChecked = el.getAttribute('data-checked') === 'true';
            el.setAttribute('data-checked', isChecked ? 'false' : 'true');
            await editNode(task.fileId, { content: doc.body.innerHTML });
        }
    };

    const handleDateUpdate = async (task, newDateString, newHasTime) => {
        const file = nodes.find(n => n.id === task.fileId);
        if (!file || !file.content) return;

        const parser = new DOMParser();
        const doc = parser.parseFromString(file.content, 'text/html');
        const taskElements = doc.querySelectorAll('li[data-type="taskItem"]');

        if (taskElements[task.taskIndex]) {
            const el = taskElements[task.taskIndex];

            if (newDateString) {
                el.setAttribute('date', newDateString);
                el.setAttribute('hasDate', 'true');
                el.setAttribute('hasTime', newHasTime ? 'true' : 'false');
            } else {
                el.removeAttribute('date');
                el.removeAttribute('hasDate');
                el.removeAttribute('hasTime');
            }

            await editNode(task.fileId, { content: doc.body.innerHTML });
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
            onClick={() => setActiveFileId(task.fileId)}
        >
            <div
                onClick={(e) => handleToggle(e, task)}
                style={{ color: task.checked ? 'var(--text-tertiary)' : 'var(--accent-color)', marginTop: '2px', cursor: 'pointer' }}
                title="Toggle Task"
            >
                {task.checked ? <CheckSquare size={18} /> : <Square size={18} />}
            </div>

            <div style={{ flex: 1 }}>
                <div style={{
                    fontSize: '15px', color: task.checked ? 'var(--text-tertiary)' : 'var(--text-primary)',
                    textDecoration: task.checked ? 'line-through' : 'none',
                    lineHeight: '1.4', marginBottom: '4px'
                }}>
                    {task.text || <em>Empty task</em>}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-tertiary)' }}>
                    {task.path.map((segment, idx) => (
                        <React.Fragment key={idx}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
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
                                initialHasTime={task.hasTime}
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
                <h1 style={{ margin: 0, fontSize: '24px', display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-primary)' }}>
                    <CheckSquare size={28} style={{ color: 'var(--accent-color)' }} />
                    Global Tasks Overview
                </h1>
                <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '14px' }}>
                    Manage all your Todo items across your knowledge base. Check off tasks, edit deadlines, or click a task to jump to its note.
                </p>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '0 24px 24px 24px' }}>
                <div style={{ maxWidth: '800px', margin: '0 auto', paddingTop: '24px' }}>

                    {pendingTasks.length === 0 && completedTasks.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-tertiary)' }}>
                            <CheckSquare size={48} style={{ opacity: 0.2, marginBottom: '16px' }} />
                            <p>You don't have any tasks right now.</p>
                            <p style={{ fontSize: '13px' }}>Type `/` in any note and select "Todo List" to create one.</p>
                        </div>
                    ) : (
                        <>
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
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
