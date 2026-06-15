import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { readingApi } from '../lib/api';
export function ReadingListPage({ onOpenBookmark }) {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('unread');
    useEffect(() => { fetchList(); }, [filter]);
    async function fetchList() {
        setLoading(true);
        const r = await readingApi.list(filter);
        if (!r.error)
            setItems(r.data.items);
        setLoading(false);
    }
    async function markRead(bookmarkId, isRead) {
        setItems(prev => prev.map(i => i.bookmark.id === bookmarkId ? { ...i, isRead } : i));
        await readingApi.markRead(bookmarkId, isRead);
        if (filter !== 'all')
            fetchList();
    }
    async function removeFromList(bookmarkId) {
        setItems(prev => prev.filter(i => i.bookmark.id !== bookmarkId));
        await readingApi.remove(bookmarkId);
    }
    return (_jsxs("div", { className: "flex-1 flex flex-col overflow-hidden bg-surface-1", children: [_jsxs("header", { className: "h-12 border-b border-surface-4 flex items-center\n                         gap-3 px-5 flex-shrink-0", children: [_jsxs("div", { className: "flex items-center gap-2 text-xs text-ink-3", children: [_jsx("span", { children: "Memex" }), _jsx("span", { className: "text-ink-5", children: "/" }), _jsx("span", { className: "text-ink-1 font-medium", children: "\uD83D\uDCD6 Reading list" })] }), _jsx("div", { className: "ml-auto flex items-center gap-0.5 bg-surface-3\n                        rounded-lg p-0.5", children: ['unread', 'read', 'all'].map(f => (_jsx("button", { onClick: () => setFilter(f), className: `px-3 py-1 text-[10px] rounded-md capitalize transition-colors
                          ${filter === f
                                ? 'bg-surface-2 text-ink-1 font-medium shadow-sm'
                                : 'text-ink-4 hover:text-ink-2'}`, children: f }, f))) })] }), _jsxs("main", { className: "flex-1 overflow-y-auto p-5", children: [_jsx("div", { className: "flex items-center justify-between mb-5", children: _jsxs("div", { children: [_jsx("h1", { className: "text-sm font-semibold text-ink-1", children: "Reading list" }), _jsxs("p", { className: "text-[11px] text-ink-4 mt-0.5", children: [items.length, " ", filter === 'all' ? '' : filter, ' ', items.length === 1 ? 'item' : 'items'] })] }) }), loading && (_jsx("div", { className: "flex items-center justify-center py-24", children: _jsx("div", { className: "w-5 h-5 border-2 border-brand border-t-transparent\n                            rounded-full animate-spin" }) })), !loading && items.length === 0 && (_jsxs("div", { className: "flex flex-col items-center justify-center py-24 text-center", children: [_jsx("div", { className: "text-4xl mb-4", children: "\uD83D\uDCD6" }), _jsx("p", { className: "text-sm font-medium text-ink-2 mb-1", children: filter === 'read' ? 'Nothing read yet' : 'Reading list is empty' }), _jsx("p", { className: "text-xs text-ink-4 max-w-xs", children: filter === 'read'
                                    ? 'Mark items as read and they will appear here'
                                    : 'Add bookmarks to your reading list to read them later' })] })), !loading && items.length > 0 && (_jsx("div", { className: "flex flex-col gap-2", children: items.map((item) => {
                            const b = item.bookmark;
                            let domain = '';
                            try {
                                domain = new URL(b.url).hostname.replace('www.', '');
                            }
                            catch { }
                            return (_jsxs("div", { className: `group flex items-center gap-3 p-3 rounded-xl border
                              transition-all
                              ${item.isRead
                                    ? 'bg-surface-2 border-surface-4 opacity-60'
                                    : 'bg-surface-2 border-surface-4 hover:border-brand/30'}`, children: [_jsx("button", { onClick: () => markRead(b.id, !item.isRead), className: `w-5 h-5 rounded-full border-2 flex items-center
                                justify-center flex-shrink-0 transition-colors
                                ${item.isRead
                                            ? 'bg-green-500 border-green-500'
                                            : 'border-surface-5 hover:border-brand'}`, title: item.isRead ? 'Mark as unread' : 'Mark as read', children: item.isRead && (_jsx("svg", { className: "w-3 h-3 text-white", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 3, children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M5 13l4 4L19 7" }) })) }), b.faviconUrl && (_jsx("img", { src: b.faviconUrl, alt: "", className: "w-4 h-4 flex-shrink-0", onError: e => (e.currentTarget.style.display = 'none') })), _jsxs("div", { className: "flex-1 min-w-0 cursor-pointer", onClick: () => onOpenBookmark(b.id), children: [_jsx("p", { className: `text-xs font-medium truncate hover:text-brand-bright
                                   transition-colors
                                   ${item.isRead ? 'text-ink-3 line-through' : 'text-ink-1'}`, children: b.title ?? domain }), _jsx("p", { className: "text-[10px] text-ink-4 truncate", children: domain })] }), _jsx("div", { className: "flex items-center gap-1", children: (b.tags ?? []).slice(0, 2).map((tag) => (_jsx("span", { className: "text-[9px] px-1.5 py-0.5 bg-brand/10\n                                       text-brand-bright rounded-full", children: tag.name }, tag.id))) }), _jsx("button", { onClick: () => removeFromList(b.id), className: "opacity-0 group-hover:opacity-100 w-5 h-5 flex items-center\n                               justify-center text-ink-4 hover:text-red-400 transition-all", children: _jsxs("svg", { className: "w-3 h-3", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2, children: [_jsx("line", { x1: "18", y1: "6", x2: "6", y2: "18" }), _jsx("line", { x1: "6", y1: "6", x2: "18", y2: "18" })] }) })] }, item.id));
                        }) }))] })] }));
}
