/**
 * Utility functions for parsing and rendering Wiki-style [[Links]] and Backlinks
 */

import { parseDateString } from './dateHelpers';

// Extract all link targets from a given text content
export const extractLinks = (content) => {
    if (!content) return [];

    const links = [];
    const regex = /\[\[([^\]]+)\]\]/g;
    let match;

    while ((match = regex.exec(content)) !== null) {
        links.push(match[1].trim());
    }

    // Deduplicate links within the same note to avoid redundant backlink entries
    return [...new Set(links)];
};

// Generates an excerpt of text surrounding the link match for context
const generateExcerpt = (fullText, linkTarget, maxLength = 80) => {
    if (!fullText) return '';

    // Exact match for the wiki link syntax
    const searchString = `[[${linkTarget}]]`;
    const idx = fullText.indexOf(searchString);

    if (idx === -1) return ''; // Should not happen if the link was found, but safe fallback

    const contextPrefix = 30;
    let startIdx = Math.max(0, idx - contextPrefix);
    let endIdx = Math.min(fullText.length, idx + searchString.length + (maxLength - contextPrefix));

    let excerpt = fullText.substring(startIdx, endIdx);

    // Add ellipses if we truncated
    if (startIdx > 0) excerpt = '...' + excerpt;
    if (endIdx < fullText.length) excerpt = excerpt + '...';

    return excerpt.replace(/\n/g, ' ').trim(); // Flatten for single line display
};

// Iterates through all nodes and builds a reverse-lookup map
// Map<TargetNoteName_Lowercased, Array<{sourceId: string, sourceName: string, contextExcerpt: string}>>
export const buildBacklinkIndex = (nodes, fileContents = {}) => {
    const index = new Map();

    // For backlinks, we need the actual text. If fileContents hasn't finished lazy loading, 
    // it will index what it has loaded, and NotesContext will trigger updates as more load.

    nodes.forEach(node => {
        // We can only parse if it's a file and we have the content
        if (node.isDir) return;

        // If content isn't in node tree, we expect the context to pass it in fileContents mapping
        const contentToParse = node.content !== undefined ? node.content : fileContents[node.id];

        if (contentToParse) {
            const extractedLinks = extractLinks(contentToParse);

            extractedLinks.forEach(linkTarget => {
                const targetKey = linkTarget.toLowerCase();

                if (!index.has(targetKey)) {
                    index.set(targetKey, []);
                }

                const excerpt = generateExcerpt(contentToParse, linkTarget);

                index.get(targetKey).push({
                    sourceId: node.id,
                    sourceName: node.name,
                    contextExcerpt: excerpt
                });
            });
        }
    });

    return index;
};
