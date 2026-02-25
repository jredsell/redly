/**
 * Utility for managing browser notifications for tasks.
 */

export const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
        console.warn('This browser does not support desktop notification');
        return false;
    }

    if (Notification.permission === 'granted') {
        return true;
    }

    if (Notification.permission !== 'denied' || Notification.permission === 'default') {
        const permission = await Notification.requestPermission();
        return permission === 'granted';
    }

    return false;
};

export const sendNotification = (title, options = {}) => {
    if (Notification.permission === 'granted') {
        try {
            new Notification(title, {
                icon: '/redly_logo.png',
                ...options
            });
            return true;
        } catch (e) {
            console.error('Failed to send notification:', e);
            return false;
        }
    }
    return false;
};

/**
 * Checks for upcoming tasks and triggers notifications.
 * @param {Array} tasks - List of parsed tasks.
 * @param {Object} settings - Notification settings.
 * @param {Set} notifiedIds - Set of IDs already notified in the current session.
 * @returns {Array} - List of new notified IDs.
 */
export const checkUpcomingTasks = (tasks, settings, notifiedIds) => {
    if (!settings.enabled || Notification.permission !== 'granted') return [];

    const now = new Date();
    const leadTimeMs = settings.leadTime * 60 * 1000;
    const newNotifiedIds = [];

    tasks.forEach(task => {
        if (task.checked || !task.date || notifiedIds.has(task.id)) return;

        const taskTime = new Date(task.date).getTime();
        const timeUntilTask = taskTime - now.getTime();

        // If task is in the future and within lead time (or was due in the last 1 minute to catch missed ones)
        if (timeUntilTask <= leadTimeMs && timeUntilTask > -60000) {
            const timeDesc = timeUntilTask > 0
                ? `Due in ${Math.round(timeUntilTask / 60000)} minutes`
                : 'Due now!';

            sendNotification(`Task Reminder: ${task.text}`, {
                body: `${timeDesc}\nFrom: ${task.path.join(' > ')}`,
                tag: task.id // Prevent duplicate notifications for the same task
            });

            newNotifiedIds.push(task.id);
        }
    });

    return newNotifiedIds;
};
