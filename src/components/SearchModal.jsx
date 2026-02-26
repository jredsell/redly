import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, FileText, ChevronRight, X } from 'lucide-react';
import { useNotes } from '../context/NotesContext';
import { getFileContent } from '../lib/db';

export default function SearchModal({ isOpen, onClose }) {
    const { nodes, setActiveFileId } = useNotes();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [isSearching, setIsSearching] = useState(false);
    const inputRef = useRef(null);

    useEffect(() => {
        if (isOpen) {
            setQuery('');
            setResults([]);
            setSelectedIndex(0);
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen || query.trim().length < 2) {
            setResults([]);
            return;
        }

        const performSearch = async () => {
            setIsSearching(true);
            const lowerQuery = query.toLowerCase();
            const searchResults = [];

            // 1. Search Filenames (Fast)
            const fileNodes = nodes.filter(n => n.type === 'file');

            // We'll process in chunks or all at once since it's local
            for (const node of fileNodes) {
                const nameMatch = node.name.toLowerCase().includes(lowerQuery);
                let contentSnippet = null;

                // 2. Search Content (Requires I/O)
                try {
                    const content = await getFileContent(node.id, node);
                    const lowerContent = content.toLowerCase();
                    const contentIndex = lowerContent.indexOf(lowerQuery);

                    if (contentIndex !== -1) {
                        // Extract snippet
                        const start = Math.max(0, contentIndex - 40);
                        const end = Math.min(content.length, contentIndex + lowerQuery.length + 40);
                        let snippet = content.substring(start, end).replace(/\n/g, ' ');
                        if (start > 0) snippet = '...' + snippet;
                        if (end < content.length) snippet = snippet + '...';
                        contentSnippet = snippet;
                    }
                } catch (e) {
                    console.error('Search failed for file:', node.id, e);
                }

                if (nameMatch || contentSnippet) {
                    searchResults.push({
                        ...node,
                        nameMatch,
                        contentSnippet
                    });
                }
            }

            // Sort: Filename matches first
            searchResults.sort((a, b) => {
                if (a.nameMatch && !b.nameMatch) return -1;
                if (!a.nameMatch && b.nameMatch) return 1;
                return a.name.localeCompare(b.name);
            });

            setResults(searchResults.slice(0, 50)); // Limit to top 50
            setSelectedIndex(0);
            setIsSearching(false);
        };

        const timeoutId = setTimeout(performSearch, 300);
        return () => clearTimeout(timeoutId);
    }, [query, nodes, isOpen]);

    const handleKeyDown = (e) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(prev => (prev + 1) % Math.max(1, results.length));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(prev => (prev - 1 + results.length) % Math.max(1, results.length));
        } else if (e.key === 'Enter' && results[selectedIndex]) {
            e.preventDefault();
            handleSelect(results[selectedIndex]);
        } else if (e.key === 'Escape') {
            onClose();
        }
    };

    const handleSelect = (node) => {
        setActiveFileId(node.id);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose} style={{ zIndex: 2000 }}>
            <div
                className="modal-content search-modal"
                onClick={e => e.stopPropagation()}
                style={{
                    maxWidth: '600px',
                    width: '90%',
                    marginTop: '10vh',
                    maxHeight: '70vh',
                    display: 'flex',
                    flexDirection: 'column',
                    padding: 0,
                    overflow: 'hidden'
                }}
            >
                <div style={{ padding: '16px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Search size={20} style={{ color: 'var(--text-tertiary)' }} />
                    <input
                        ref={inputRef}
                        className="search-input"
                        placeholder="Search files and content... (Alt + K)"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                        style={{
                            flex: 1,
                            background: 'transparent',
                            border: 'none',
                            outline: 'none',
                            color: 'var(--text-primary)',
                            fontSize: '1.1rem'
                        }}
                    />
                    {isSearching && <div className="spinner-small" />}
                    <button className="icon-button" onClick={onClose}><X size={18} /></button>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
                    {query.trim().length < 2 ? (
                        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                            Type at least 2 characters to search...
                        </div>
                    ) : results.length === 0 && !isSearching ? (
                        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                            No matches found for "{query}"
                        </div>
                    ) : (
                        results.map((result, index) => (
                            <div
                                key={result.id}
                                className={`search-result-item ${index === selectedIndex ? 'selected' : ''}`}
                                onClick={() => handleSelect(result)}
                                onMouseEnter={() => setSelectedIndex(index)}
                                style={{
                                    padding: '12px',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    background: index === selectedIndex ? 'var(--bg-secondary)' : 'transparent',
                                    border: '1px solid',
                                    borderColor: index === selectedIndex ? 'var(--border-color)' : 'transparent',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '4px'
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <FileText size={16} style={{ color: result.nameMatch ? 'var(--accent-color)' : 'var(--text-tertiary)' }} />
                                    <span style={{ fontWeight: result.nameMatch ? '600' : '400', color: 'var(--text-primary)' }}>
                                        {result.name}
                                    </span>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', opacity: 0.7 }}>
                                        {result.parentId ? `in ${result.parentId}` : 'at root'}
                                    </span>
                                </div>
                                {result.contentSnippet && (
                                    <div style={{
                                        fontSize: '0.85rem',
                                        color: 'var(--text-secondary)',
                                        marginLeft: '24px',
                                        fontStyle: 'italic',
                                        wordBreak: 'break-all',
                                        opacity: index === selectedIndex ? 1 : 0.8
                                    }}>
                                        {result.contentSnippet}
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>

                <div style={{
                    padding: '8px 16px',
                    fontSize: '0.75rem',
                    color: 'var(--text-tertiary)',
                    borderTop: '1px solid var(--border-color)',
                    display: 'flex',
                    gap: '16px'
                }}>
                    <span><kbd style={{ background: 'var(--bg-secondary)', padding: '2px 4px', borderRadius: '4px' }}>↑↓</kbd> to navigate</span>
                    <span><kbd style={{ background: 'var(--bg-secondary)', padding: '2px 4px', borderRadius: '4px' }}>Enter</kbd> to open</span>
                    <span><kbd style={{ background: 'var(--bg-secondary)', padding: '2px 4px', borderRadius: '4px' }}>Esc</kbd> to close</span>
                </div>
            </div>
            <style>{`
                .search-result-item.selected {
                    background-color: var(--bg-hover) !important;
                }
                .search-input::placeholder {
                    color: var(--text-tertiary);
                    opacity: 0.5;
                }
                .spinner-small {
                    width: 16px;
                    height: 16px;
                    border: 2px solid var(--border-color);
                    border-top-color: var(--accent-color);
                    border-radius: 50%;
                    animation: spin 0.8s linear infinite;
                }
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}
