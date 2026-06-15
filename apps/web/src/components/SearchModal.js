import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, useRef } from 'react';
import { searchApi } from '../lib/api';
export function SearchModal({ onClose, onOpenBookmark, onOpenTopic }) {
    const [query, setQuery] = useState('');
    const [tab, setTab] = useState('bookmarks');
    const [results, setResults] = useState({
        bookmarks: [], topics: []
    });
    const [loading, setLoading] = useState(false);
    const inputRef = useRef(null);
    const debounce = useRef(null);
    // Focus input on mount
    useEffect(() => {
        inputRef.current?.focus();
    }, []);
    // Close on Escape
    useEffect(() => {
        const onKey = (e) => {
            if (e.key === 'Escape')
                onClose();
        };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [onClose]);
    // Debounced search
    useEffect(() => {
        if (debounce.current)
            clearTimeout(debounce.current);
        if (query.length < 2) {
            setResults({ bookmarks: [], topics: [] });
            setLoading(false);
            return;
        }
        setLoading(true);
        debounce.current = setTimeout(async () => {
            const r = await searchApi.search(query);
            if (!r.error)
                setResults(r.data);
            setLoading(false);
        }, 300);
    }, [query]);
    // Highlight matching text in result
    function highlight(text, query) {
        if (!text || !query)
            return text;
        const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
        return parts.map((part, i) => part.toLowerCase() === query.toLowerCase()
            ? _jsx("mark", { className: "bg-brand/30 text-brand-bright rounded px-0.5", children: part }, i)
            : part);
    }
    const totalResults = results.bookmarks.length + results.topics.length;
    const hasQuery = query.length >= 2;
    return (_jsx("div", { className: "fixed inset-0 z-50 flex items-start justify-center pt-[10vh] px-4", style: { background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }, onClick: onClose, children: _jsxs("div", { className: "w-full max-w-2xl bg-surface-2 border border-surface-4\n                   rounded-2xl overflow-hidden shadow-2xl", onClick: e => e.stopPropagation(), children: [_jsxs("div", { className: "flex items-center gap-3 px-4 py-3 border-b border-surface-4", children: [_jsxs("svg", { className: "w-4 h-4 text-ink-3 flex-shrink-0", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2, children: [_jsx("circle", { cx: "11", cy: "11", r: "8" }), _jsx("line", { x1: "21", y1: "21", x2: "16.65", y2: "16.65" })] }), _jsx("input", { ref: inputRef, type: "text", placeholder: "Search bookmarks, wiki topics, notes...", value: query, onChange: e => setQuery(e.target.value), className: "flex-1 bg-transparent text-sm text-ink-1 placeholder-ink-4\n                       outline-none" }), loading && (_jsx("div", { className: "w-4 h-4 border-2 border-brand border-t-transparent\n                            rounded-full animate-spin flex-shrink-0" })), _jsx("kbd", { className: "text-[10px] text-ink-4 px-1.5 py-0.5 bg-surface-3\n                          border border-surface-4 rounded", children: "Esc" })] }), hasQuery && (_jsx("div", { className: "flex border-b border-surface-4", children: [
                        { key: 'bookmarks', label: 'Bookmarks', count: results.bookmarks.length },
                        { key: 'wiki', label: 'Wiki', count: results.topics.length },
                    ].map(t => (_jsxs("button", { onClick: () => setTab(t.key), className: `flex items-center gap-2 px-4 py-2.5 text-xs relative
                            transition-colors
                            ${tab === t.key
                            ? 'text-brand-bright bg-brand/5'
                            : 'text-ink-3 hover:text-ink-2 hover:bg-surface-3'}`, children: [t.label, _jsx("span", { className: `text-[9px] px-1.5 py-0.5 rounded-full
                                  ${tab === t.key
                                    ? 'bg-brand/20 text-brand-bright'
                                    : 'bg-surface-4 text-ink-4'}`, children: t.count }), tab === t.key && (_jsx("div", { className: "absolute bottom-0 left-0 right-0 h-0.5 bg-brand" }))] }, t.key))) })), _jsxs("div", { className: "max-h-[50vh] overflow-y-auto", children: [!hasQuery && (_jsxs("div", { className: "flex flex-col items-center justify-center py-12 text-center", children: [_jsxs("svg", { className: "w-8 h-8 text-ink-5 mb-3", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 1.5, children: [_jsx("circle", { cx: "11", cy: "11", r: "8" }), _jsx("line", { x1: "21", y1: "21", x2: "16.65", y2: "16.65" })] }), _jsx("p", { className: "text-sm text-ink-3 mb-1", children: "Search your knowledge base" }), _jsx("p", { className: "text-xs text-ink-5", children: "Searches bookmarks, wiki topics, and notes" })] })), hasQuery && !loading && totalResults === 0 && (_jsxs("div", { className: "flex flex-col items-center justify-center py-12 text-center", children: [_jsxs("p", { className: "text-sm text-ink-3 mb-1", children: ["No results for \"", query, "\""] }), _jsx("p", { className: "text-xs text-ink-5", children: "Try different keywords" })] })), tab === 'bookmarks' && results.bookmarks.length > 0 && (_jsx("div", { className: "py-1", children: results.bookmarks.map(b => {
                                let domain = '';
                                try {
                                    domain = new URL(b.url).hostname.replace('www.', '');
                                }
                                catch { }
                                return (_jsxs("button", { onClick: () => { onOpenBookmark(b.id); onClose(); }, className: "w-full flex items-start gap-3 px-4 py-3 hover:bg-surface-3\n                               transition-colors text-left group", children: [_jsx("div", { className: "w-8 h-8 bg-surface-3 rounded-lg border border-surface-4\n                                    flex items-center justify-center flex-shrink-0 overflow-hidden\n                                    mt-0.5", children: b.faviconUrl ? (_jsx("img", { src: b.faviconUrl, alt: "", className: "w-5 h-5 object-contain", onError: e => (e.currentTarget.style.display = 'none') })) : (_jsx("svg", { className: "w-4 h-4 text-ink-4", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 1.5, children: _jsx("path", { d: "M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" }) })) }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("p", { className: "text-sm font-medium text-ink-1 truncate\n                                    group-hover:text-brand-bright transition-colors", children: highlight(b.title ?? domain, query) }), _jsx("p", { className: "text-[11px] text-ink-4 truncate mt-0.5", children: domain }), b.snippet && (_jsx("p", { className: "text-[11px] text-ink-3 mt-1 line-clamp-2 leading-relaxed", children: highlight(b.snippet, query) })), b.tags.length > 0 && (_jsx("div", { className: "flex gap-1 mt-1.5 flex-wrap", children: b.tags.slice(0, 3).map((tag) => (_jsx("span", { className: "text-[9px] px-1.5 py-0.5 bg-brand/10\n                                             text-brand-bright rounded-full", children: tag.name }, tag.id))) }))] }), _jsx("svg", { className: "w-3.5 h-3.5 text-ink-5 group-hover:text-ink-3\n                                    transition-colors flex-shrink-0 mt-1", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2, children: _jsx("polyline", { points: "9 18 15 12 9 6" }) })] }, b.id));
                            }) })), tab === 'wiki' && results.topics.length > 0 && (_jsx("div", { className: "py-1", children: results.topics.map(topic => (_jsxs("button", { onClick: () => { onOpenTopic(topic.id); onClose(); }, className: "w-full flex items-start gap-3 px-4 py-3 hover:bg-surface-3\n                             transition-colors text-left group", children: [_jsx("div", { className: "w-8 h-8 rounded-lg flex items-center justify-center\n                               flex-shrink-0 text-lg mt-0.5", style: { background: topic.coverColor + '20',
                                            border: `1px solid ${topic.coverColor}30` }, children: topic.emoji }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("p", { className: "text-sm font-medium text-ink-1 truncate\n                                  group-hover:text-brand-bright transition-colors", children: highlight(topic.title, query) }), topic.snippet && (_jsx("p", { className: "text-[11px] text-ink-3 mt-1 line-clamp-2 leading-relaxed", children: highlight(topic.snippet, query) })), _jsxs("div", { className: "flex items-center gap-3 mt-1.5", children: [_jsxs("span", { className: "text-[9px] text-ink-5", children: [topic.blockCount, " blocks"] }), _jsxs("span", { className: "text-[9px] text-ink-5", children: [topic.refCount, " references"] })] })] }), _jsx("svg", { className: "w-3.5 h-3.5 text-ink-5 group-hover:text-ink-3\n                                  transition-colors flex-shrink-0 mt-1", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2, children: _jsx("polyline", { points: "9 18 15 12 9 6" }) })] }, topic.id))) }))] }), hasQuery && totalResults > 0 && (_jsxs("div", { className: "px-4 py-2 border-t border-surface-4 flex items-center gap-3", children: [_jsxs("span", { className: "text-[10px] text-ink-5", children: [totalResults, " result", totalResults > 1 ? 's' : ''] }), _jsx("span", { className: "text-[10px] text-ink-5 ml-auto", children: "Click to open \u00B7 Esc to close" })] }))] }) }));
}
