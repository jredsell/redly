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
            const [datePart, timePart] = initialDate.split('T');
            const [y, m, d] = datePart.split('-');
            const formattedTime = (isTimeSet && timePart) ? timePart.substring(0, 5) : '';
            display = `${d}/${m}/${y} ${formattedTime}`.trim();
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
                    style={{
                        background: 'transparent', border: '1px dashed var(--accent-color)',
                        color: 'var(--accent-color)', fontWeight: '600', fontSize: '11px',
                        fontFamily: 'monospace', padding: '2px 4px', borderRadius: '4px',
                        outline: 'none', width: `${Math.max(editValue.length + 2, 12)}ch`
                    }}
                />
            ) : (
                <span
                    onClick={(e) => {
                        e.stopPropagation();
                        // Pre-fill "HH:MM" so it's obvious to the user they can add a time
                        setEditValue(isTimeSet ? display : `${display} HH:MM`);
                        setIsEditing(true);
                    }}
                    style={{
                        background: isChecked ? 'var(--bg-secondary)' : dateColor,
                        color: isChecked ? 'var(--text-tertiary)' : 'var(--color-badge-text)',
                        padding: '2px 6px', borderRadius: '4px',
                        fontWeight: '600', fontSize: '0.85em', display: 'inline-flex', alignItems: 'center', gap: '4px', cursor: 'text'
                    }}
                    title="Click to edit date/time text"
                >
                    {isTimeSet ? '⏱' : '📅'} Due: {display}
                </span>
            )}
        </div>
    );
}
