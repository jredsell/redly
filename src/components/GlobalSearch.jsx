import React, { useState, useEffect, useRef } from 'react';
import { Search, FileText, X } from 'lucide-react';
import { useNotes } from '../context/NotesContext';
import { getFileContent } from '../lib/db';

export default function GlobalSearch() {
    const { nodes, setActiveFileId } = useNotes();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [isSearching, setIsSearching] = useState(false);
    const containerRef = useRef(null);
    const inputRef = useRef(null);

    // Global focus shortcut (Alt + K)
    useEffect(() => {
        const handleGlobalKeyDown = (e) => {
            if (e.altKey && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                inputRef.current?.focus();
            }
        };
        window.addEventListener('keydown', handleGlobalKeyDown);
        return () => window.removeEventListener('keydown', handleGlobalKeyDown);
    }, []);

    // Handle clicks outside to close dropdown
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Perform search
    useEffect(() => {
        if (query.trim().length < 2) {
            setResults([]);
            setIsOpen(false);
            return;
        }

        const performSearch = async () => {
            setIsSearching(true);
            const lowerQuery = query.toLowerCase();
            const searchResults = [];

            // Files only
            const fileNodes = nodes.filter(n => n.type === 'file');

            for (const node of fileNodes) {
                const nameMatch = node.name.toLowerCase().includes(lowerQuery);
                let contentSnippet = null;

                try {
                    const content = await getFileContent(node.id, node);
                    if (content) {
                        const lowerContent = content.toLowerCase();
                        const contentIndex = lowerContent.indexOf(lowerQuery);
                        if (contentIndex !== -1) {
                            // Extract snippet
                            const start = Math.max(0, contentIndex - 30);
                            const end = Math.min(content.length, contentIndex + lowerQuery.length + 30);
                            let snippet = content.substring(start, end).replace(/\n/g, ' ');
                            if (start > 0) snippet = '...' + snippet;
                            if (end < content.length) snippet = snippet + '...';
                            contentSnippet = snippet;
                        }
                    }
                } catch (e) {
                    console.error('Header search failed for:', node.id, e);
                }

                if (nameMatch || contentSnippet) {
                    searchResults.push({
                        ...node,
                        nameMatch,
                        contentSnippet
                    });
                }
            }

            // Sort: Name matches first
            searchResults.sort((a, b) => {
                if (a.nameMatch && !b.nameMatch) return -1;
                if (!a.nameMatch && b.nameMatch) return 1;
                return a.name.localeCompare(b.name);
            });

            setResults(searchResults.slice(0, 10)); // Limit Results in dropdown
            setSelectedIndex(0);
            setIsSearching(false);
            setIsOpen(true);
        };

        const timeoutId = setTimeout(performSearch, 250);
        return () => clearTimeout(timeoutId);
    }, [query, nodes]);

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
            setIsOpen(false);
            inputRef.current?.blur();
        }
    };

    const handleSelect = (node) => {
        setActiveFileId(node.id);
        setIsOpen(false);
        setQuery('');
        inputRef.current?.blur();
    };

    return (
        <div ref={containerRef} className="global-search-container" style={{ position: 'relative', flex: 1, maxWidth: '400px', margin: '0 16px' }}>
            <div style={{
                display: 'flex',
                alignItems: 'center',
                background: 'var(--bg-secondary)',
                borderRadius: '10px',
                padding: '4px 12px',
                border: '1px solid var(--border-color)',
                transition: 'all 0.2s ease',
                boxShadow: isOpen ? '0 0 0 2px var(--accent-color-alpha)' : 'none',
                borderColor: isOpen ? 'var(--accent-color)' : 'var(--border-color)'
            }}>
                <Search size={16} style={{ color: 'var(--text-tertiary)', marginRight: '8px' }} />
                <input
                    ref={inputRef}
                    className="global-search-input"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onFocus={() => query.length >= 2 && setIsOpen(true)}
                    placeholder="Search notes... (Alt + K)"
                    style={{
                        flex: 1,
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-primary)',
                        outline: 'none',
                        height: '32px',
                        fontSize: '14px'
                    }}
                />
                {query && (
                    <button
                        onClick={() => { setQuery(''); setResults([]); setIsOpen(false); inputRef.current?.focus(); }}
                        style={{ background: 'transparent', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', padding: '4px', display: 'flex' }}
                    >
                        <X size={14} />
                    </button>
                )}
                {isSearching && (
                    <div className="search-spinner-tiny" style={{
                        width: '12px',
                        height: '12px',
                        border: '2px solid var(--border-color)',
                        borderTopColor: 'var(--accent-color)',
                        borderRadius: '50%',
                        animation: 'spin-fast 0.6s linear infinite',
                        marginLeft: '4px'
                    }} />
                )}
            </div>

            {isOpen && results.length > 0 && (
                <div
                    className="search-dropdown-results"
                    style={{
                        position: 'absolute',
                        top: 'calc(100% + 8px)',
                        left: 0,
                        right: 0,
                        background: 'var(--bg-primary)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '10px',
                        boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
                        zIndex: 1000,
                        overflow: 'hidden',
                        padding: '4px'
                    }}
                >
                    {results.map((res, i) => (
                        <div
                            key={res.id}
                            onClick={() => handleSelect(res)}
                            onMouseEnter={() => setSelectedIndex(i)}
                            style={{
                                padding: '10px 12px',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                background: i === selectedIndex ? 'var(--bg-secondary)' : 'transparent',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '2px',
                                borderLeft: i === selectedIndex ? '3px solid var(--accent-color)' : '3px solid transparent',
                                transition: 'background 0.1s ease'
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <FileText size={14} style={{ color: res.nameMatch ? 'var(--accent-color)' : 'var(--text-tertiary)' }} />
                                <span style={{
                                    fontSize: '14px',
                                    fontWeight: res.nameMatch ? '600' : '400',
                                    color: 'var(--text-primary)',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis'
                                }}>
                                    {res.name}
                                </span>
                                <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginLeft: 'auto', opacity: 0.7 }}>
                                    {res.parentId || 'root'}
                                </span>
                            </div>
                            {res.contentSnippet && (
                                <div style={{
                                    fontSize: '12px',
                                    color: 'var(--text-tertiary)',
                                    marginLeft: '22px',
                                    fontStyle: 'italic',
                                    display: '-webkit-box',
                                    WebkitLineClamp: 1,
                                    WebkitBoxOrient: 'vertical',
                                    overflow: 'hidden'
                                }}>
                                    {res.contentSnippet}
                                </div>
                            )}
                        </div>
                    ))}
                    <div style={{ padding: '8px 12px', borderTop: '1px solid var(--border-color)', fontSize: '11px', color: 'var(--text-tertiary)', display: 'flex', gap: '10px' }}>
                        <span><kbd>Enter</kbd> to open</span>
                        <span><kbd>↑↓</kbd> to move</span>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes spin-fast {
                    to { transform: rotate(360deg); }
                }
                .global-search-input::placeholder {
                    color: var(--text-tertiary);
                    opacity: 0.6;
                }
                kbd {
                    background: var(--bg-secondary);
                    padding: 2px 4px;
                    border-radius: 4px;
                    border: 1px solid var(--border-color);
                }
            `}</style>
        </div>
    );
}

