/**
 * Parses all tasks from the given nodes.
 * Expects nodes to have Markdown content.
 */
export function parseTasksFromNodes(nodes) {
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

    const files = nodes.filter(n => n.type === 'file' && n.content);

    files.forEach(file => {
        const breadcrumbPath = getPath(file.id);
        const lines = file.content.split('\n');

        // Regex to match GFM task list items: "- [ ] text" or "- [x] text"
        const taskRegex = /^\s*-\s*\[([ xX])\]\s*(.*)$/;

        lines.forEach((line, lineIndex) => {
            const match = line.match(taskRegex);
            if (match) {
                const isChecked = match[1].toLowerCase() === 'x';
                let text = match[2].trim();

                // Advanced date/time extraction
                // Patterns: @YYYY-MM-DD or @YYYY-MM-DD HH:MM
                let date = null;
                let hasTime = false;

                // Matches @2023-10-27 or @2023-10-27 15:30
                const dateRegex = /@(\d{4}-\d{2}-\d{2}(?:\s+\d{2}:\d{2})?)/;
                const dateMatch = text.match(dateRegex);
                if (dateMatch) {
                    const dateStr = dateMatch[1].replace(' ', 'T');
                    try {
                        const d = new Date(dateStr);
                        if (!isNaN(d.getTime())) {
                            date = d;
                            hasTime = dateMatch[1].includes(':');
                            // Remove the date string from the text to avoid duplication in UI
                            text = text.replace(dateRegex, '').trim();
                        }
                    } catch (e) { }
                }

                // Kanban Column Extraction & Tags (Hashtags)
                let column = isChecked ? 'done' : 'backlog'; // default columns based on state
                const tagRegex = /(?:^|\s)#([a-zA-Z0-9_\-]+)/g;
                let tagMatch;
                let lastTagMatch = null;
                const tags = [];

                // Find all hashtags in the string
                while ((tagMatch = tagRegex.exec(text)) !== null) {
                    const tag = tagMatch[1].toLowerCase();
                    if (!tags.includes(tag)) tags.push(tag);
                    lastTagMatch = tagMatch;
                }

                if (lastTagMatch) {
                    column = lastTagMatch[1].toLowerCase();
                }

                // Remove all tags from the display text to keep UI clean
                text = text.replace(/(?:^|\s)#([a-zA-Z0-9_\-]+)/g, '').trim();

                tasks.push({
                    // Stable ID based on file path and line index
                    id: `${file.id}:L${lineIndex}`,
                    fileId: file.id,
                    lineIndex: lineIndex,
                    path: breadcrumbPath,
                    checked: isChecked,
                    text: text,
                    date: date,
                    hasTime: hasTime,
                    column: column,
                    tags: tags
                });
            }
        });
    });

    return tasks;
}
