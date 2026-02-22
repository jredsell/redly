export function parseTasksFromNodes(nodes) {
    const parser = new DOMParser();
    const tasks = [];

    // Helper to resolve breadcrumb path for a node
    const getPath = (nodeId) => {
        const path = [];
        let currentId = nodeId;
        while (currentId) {
            const current = nodes.find(n => n.id === currentId);
            if (current) {
                path.unshift(current.name);
                currentId = current.parentId;
            } else {
                break;
            }
        }
        return path;
    };

    // Only process files containing tasks (quick rough string check first to save DOM parsing)
    const filesWithTasks = nodes.filter(n => n.type === 'file' && n.content && n.content.includes('data-type="taskItem"'));

    filesWithTasks.forEach(file => {
        const doc = parser.parseFromString(file.content, 'text/html');
        const taskElements = doc.querySelectorAll('li[data-type="taskItem"]');
        const breadcrumbPath = getPath(file.id);

        taskElements.forEach((el, idx) => {
            const isChecked = el.getAttribute('data-checked') === 'true';

            // Extract the main text and any inline dates
            const labelEl = el.querySelector('label');
            const innerContent = el.querySelector('div');

            let text = '';
            let date = null;
            let hasTime = false;

            const rawDate = el.getAttribute('date');
            if (rawDate) {
                date = new Date(rawDate);
                hasTime = el.getAttribute('hasTime') === 'true';
            }

            if (innerContent) {
                // Clone to manipulate safely
                const cloned = innerContent.cloneNode(true);
                text = cloned.textContent.trim();
            } else {
                text = el.textContent.trim();
            }

            tasks.push({
                id: Math.random().toString(36).substring(7), // Ephemeral ID for React keys
                fileId: file.id,
                taskIndex: idx,
                path: breadcrumbPath,
                checked: isChecked,
                text: text,
                date: date,
                hasTime: hasTime
            });
        });
    });

    return tasks;
}
