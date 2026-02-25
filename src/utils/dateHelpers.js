export const getDateColor = (dateObj, hasTime = false) => {
    if (!dateObj) return 'var(--danger-color)';

    const now = new Date();
    const target = new Date(dateObj);

    // Get strictly local Y-M-D for "is it today" check
    const nowLocalStr = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
    const targetLocalStr = `${target.getFullYear()}-${target.getMonth() + 1}-${target.getDate()}`;
    const isToday = nowLocalStr === targetLocalStr;

    if (hasTime) {
        // If it's today and the specific time hasn't passed yet, it's "Today" (Amber)
        // If the specific time has passed today, it's "Overdue" (Red)
        if (target.getTime() < now.getTime()) {
            return 'var(--color-overdue)';
        }
        if (isToday) return 'var(--color-today)';
        return 'var(--color-future)';
    } else {
        // Pure day comparison
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const targetDay = new Date(target.getFullYear(), target.getMonth(), target.getDate());

        const diffTime = targetDay.getTime() - today.getTime();
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 0) return 'var(--color-overdue)'; // Overdue
        if (diffDays === 0) return 'var(--color-today)'; // Today
        return 'var(--color-future)'; // Future
    }
};

export const parseDateString = (input) => {
    if (!input || !input.trim()) return { parsedDate: '', hasDate: false, hasTime: false };

    let hasDate = false;
    let hasTime = false;
    let dateObj = new Date(); // default to today for relative times

    const str = input.trim().toLowerCase();

    // Extract time (e.g. 5pm, 15:30)
    let timeRegex = /\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i;
    let hours = 0;
    let minutes = 0;

    let timeMatch = str.match(timeRegex);
    let dateStrWithoutTime = str;

    if (timeMatch) {
        hasTime = true;
        hours = parseInt(timeMatch[1], 10);
        minutes = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
        const ampm = timeMatch[3];

        if (ampm === 'pm' && hours < 12) hours += 12;
        if (ampm === 'am' && hours === 12) hours = 0;

        dateStrWithoutTime = str.replace(timeMatch[0], '').trim();
    } else {
        const fallbackRegex = /\b(\d{1,2}):(\d{2})\b/;
        const m = str.match(fallbackRegex);
        if (m) {
            hasTime = true;
            hours = parseInt(m[1], 10);
            minutes = parseInt(m[2], 10);
            dateStrWithoutTime = str.replace(m[0], '').trim();
        }
    }

    if (!dateStrWithoutTime) {
        // if it was only time, like "5pm", assume today
        hasDate = true;
    } else if (dateStrWithoutTime.includes('today')) {
        hasDate = true;
    } else if (dateStrWithoutTime.includes('tomorrow')) {
        dateObj.setDate(dateObj.getDate() + 1);
        hasDate = true;
    } else {
        // ISO format: YYYY-MM-DD (from stored data-date attributes on reload)
        const isoMatch = dateStrWithoutTime.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
        if (isoMatch) {
            hasDate = true;
            dateObj.setFullYear(parseInt(isoMatch[1], 10));
            dateObj.setMonth(parseInt(isoMatch[2], 10) - 1);
            dateObj.setDate(parseInt(isoMatch[3], 10));
        } else {
            // DD/MM or DD/MM/YYYY or DD/MM/YY
            const dateMatch = dateStrWithoutTime.match(/\b(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?\b/);
            if (dateMatch) {
                hasDate = true;
                const dStr = parseInt(dateMatch[1], 10);
                const mStr = parseInt(dateMatch[2], 10) - 1;
                dateObj.setMonth(mStr);
                dateObj.setDate(dStr);
                if (dateMatch[3]) {
                    let y = parseInt(dateMatch[3], 10);
                    if (y < 100) y += 2000;
                    dateObj.setFullYear(y);
                }
            } else {
                // Days of week
                const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
                let nextIndex = -1;
                for (let i = 0; i < days.length; i++) {
                    if (dateStrWithoutTime.includes(days[i])) {
                        nextIndex = i;
                        break;
                    }
                }
                if (nextIndex !== -1) {
                    hasDate = true;
                    const isNext = dateStrWithoutTime.includes('next');
                    let dayDiff = nextIndex - dateObj.getDay();
                    if (dayDiff <= 0) dayDiff += 7; // Always jump to future
                    if (isNext) dayDiff += 7; // jump to week after
                    dateObj.setDate(dateObj.getDate() + dayDiff);
                }
            }
        }
    }

    if (!hasDate) {
        return { parsedDate: '', hasDate: false, hasTime: false };
    }

    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const d = String(dateObj.getDate()).padStart(2, '0');
    let parsedDate = `${y}-${m}-${d}`;

    if (hasTime) {
        const hh = String(hours).padStart(2, '0');
        const mm = String(minutes).padStart(2, '0');
        parsedDate += `T${hh}:${mm}`;
    }

    return { parsedDate, hasDate, hasTime };
}
