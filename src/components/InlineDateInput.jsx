import React, { useState, useEffect } from 'react';
import { getDateColor, parseDateString } from '../utils/dateHelpers';

export default function InlineDateInput({
    initialDate,
    initialHasTime,
    isChecked,
    onDateChange,
    onClearDate
}) {
    const isTimeSet = initialHasTime === true || initialHasTime === 'true';
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState('');

    let display = isTimeSet ? "Set Date & Time" : "Set Date";
    let dateColor = 'var(--accent-color)';

    if (initialDate) {
        try {
            // Handle both T-separator ("2026-02-25T22:00") and space-separator ("2026-02-25 22:00")
            const sep = initialDate.includes('T') ? 'T' : ' ';
            const sepIdx = initialDate.indexOf(sep);
            const datePart = sepIdx !== -1 ? initialDate.substring(0, sepIdx) : initialDate;
            const timePart = (sepIdx !== -1 && isTimeSet) ? initialDate.substring(sepIdx + 1, sepIdx + 6) : '';
            const [y, m, d] = datePart.split('-');
            if (y && m && d) {
                display = `${d}/${m}/${y}${timePart ? ' ' + timePart : ''}`.trim();
            }
        } catch (e) { }
        dateColor = getDateColor(initialDate, isTimeSet);
    }

    // Sync external changes
    useEffect(() => {
        if (!isEditing) {
            setEditValue(display);
        }
    }, [display, isEditing]);

    const commitDateChange = (val) => {
        if (!val || val.trim() === '') {
            onClearDate(new Event('clear'));
            setIsEditing(false);
            return;
        }

        const { parsedDate, hasDate, hasTime } = parseDateString(val);
        if (hasDate) {
            onDateChange(parsedDate, hasTime);
        }
        setIsEditing(false);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Tab') {
            e.preventDefault();
            const today = new Date();
            const d = String(today.getDate()).padStart(2, '0');
            const m = String(today.getMonth() + 1).padStart(2, '0');
            const y = today.getFullYear();
            setEditValue(`${d}/${m}/${y}`);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            commitDateChange(editValue);
        } else if (e.key === 'Escape') {
            e.preventDefault();
            setIsEditing(false);
            setEditValue(display);
        }
    };

    return (
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            {isEditing ? (
                <input
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onBlur={() => commitDateChange(editValue)}
                    autoFocus
                    onClick={(e) => e.stopPropagation()}
                    aria-label="Edit due date. Type a date like 'friday' or 'tomorrow 5pm'. Press Tab for today."
                    style={{
                        background: 'transparent', border: '1px dashed var(--accent-color)',
                        color: 'var(--accent-color)', fontWeight: '600', fontSize: '11px',
                        fontFamily: 'monospace', padding: '2px 4px', borderRadius: '4px',
                        outline: 'none', width: `${Math.max(editValue.length + 2, 12)}ch`
                    }}
                />
            ) : (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        // Pre-fill "HH:MM" so it's obvious to the user they can add a time
                        setEditValue(isTimeSet ? display : `${display} HH:MM`);
                        setIsEditing(true);
                    }}
                    aria-label={`Due date: ${display}. Click to edit.`}
                    style={{
                        background: isChecked ? 'var(--bg-secondary)' : dateColor,
                        color: isChecked ? 'var(--text-tertiary)' : 'var(--color-badge-text)',
                        padding: '2px 6px', borderRadius: '4px', border: 'none',
                        fontWeight: '600', fontSize: '0.85em', display: 'inline-flex', alignItems: 'center', gap: '4px', cursor: 'pointer'
                    }}
                    title="Click to edit date/time text"
                >
                    <span aria-hidden="true">{isTimeSet ? '⏱' : '📅'}</span> Due: {display}
                </button>
            )}
        </div>
    );
}
