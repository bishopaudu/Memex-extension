import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { bookmarksApi } from '../lib/api';
export function ArchivePage({ onOpenBookmark }) {
    const [bookmarks, setBookmarks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    useEffect(() => { fetchArchived(); }, []);
    async function fetchArchived() {
        setLoading(true);
        const r = await bookmarksApi.listArchived();
        if (!r.error)
            setBookmarks(r.data.items);
        setLoading(false);
    }
    async function handleUnarchive(id) {
        setBookmarks(prev => prev.filter(b => b.id !== id));
        await bookmarksApi.unarchive(id);
    }
    async function handleDelete(id) {
        setBookmarks(prev => prev.filter(b => b.id !== id));
        await bookmarksApi.delete(id);
    }
    const filtered = bookmarks.filter(b => !search ||
        (b.title ?? b.url).toLowerCase().includes(search.toLowerCase()));
    return (_jsxs("div", { className: "flex-1 flex flex-col overflow-hidden bg-surface-1", children: [_jsxs("header", { className: "h-12 border-b border-surface-4 flex items-center\n                         gap-3 px-5 flex-shrink-0", children: [_jsxs("div", { className: "flex items-center gap-2 text-xs text-ink-3", children: [_jsx("span", { children: "Memex" }), _jsx("span", { className: "text-ink-5", children: "/" }), _jsx("span", { className: "text-ink-1 font-medium flex items-center gap-1.5", children: "\uD83D\uDCE6 Archive" })] }), _jsxs("div", { className: "ml-auto relative", children: [_jsxs("svg", { className: "absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-ink-4", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2, children: [_jsx("circle", { cx: "11", cy: "11", r: "8" }), _jsx("line", { x1: "21", y1: "21", x2: "16.65", y2: "16.65" })] }), _jsx("input", { type: "text", placeholder: "Search archive...", value: search, onChange: e => setSearch(e.target.value), className: "pl-8 pr-3 py-1.5 w-44 bg-surface-3 border border-surface-4\n                       rounded-lg text-xs text-ink-1 placeholder-ink-4 outline-none\n                       focus:border-brand transition-colors" })] })] }), _jsxs("main", { className: "flex-1 overflow-y-auto p-5", children: [_jsxs("div", { className: "flex items-center justify-between mb-5", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-sm font-semibold text-ink-1", children: "Archive" }), _jsxs("p", { className: "text-[11px] text-ink-4 mt-0.5", children: [bookmarks.length, " archived ", bookmarks.length === 1 ? 'bookmark' : 'bookmarks'] })] }), bookmarks.length > 0 && (_jsx("p", { className: "text-[11px] text-ink-4", children: "Restore to move back to your library" }))] }), loading && (_jsx("div", { className: "flex items-center justify-center py-24", children: _jsx("div", { className: "w-5 h-5 border-2 border-brand border-t-transparent\n                            rounded-full animate-spin" }) })), !loading && bookmarks.length === 0 && (_jsxs("div", { className: "flex flex-col items-center justify-center py-24 text-center", children: [_jsx("div", { className: "w-14 h-14 bg-surface-3 border border-surface-4 rounded-2xl\n                            flex items-center justify-center text-2xl mb-4", children: "\uD83D\uDCE6" }), _jsx("p", { className: "text-sm font-medium text-ink-2 mb-1", children: "Archive is empty" }), _jsx("p", { className: "text-xs text-ink-4 max-w-xs", children: "Bookmarks you archive will appear here. Right-click any bookmark card to archive it." })] })), !loading && filtered.length === 0 && bookmarks.length > 0 && (_jsxs("p", { className: "text-xs text-ink-4 text-center py-8", children: ["No archived bookmarks match \"", search, "\""] })), !loading && filtered.length > 0 && (_jsx("div", { className: "flex flex-col gap-2", children: filtered.map(b => {
                            let domain = '';
                            try {
                                domain = new URL(b.url).hostname.replace('www.', '');
                            }
                            catch { }
                            function timeAgo(date) {
                                const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
                                if (s < 86400)
                                    return `${Math.floor(s / 3600)}h ago`;
                                if (s < 604800)
                                    return `${Math.floor(s / 86400)}d ago`;
                                return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                            }
                            return (_jsxs("div", { className: "group flex items-center gap-3 p-3 bg-surface-2\n                             border border-surface-4 rounded-xl hover:border-surface-5\n                             transition-colors", children: [_jsx("div", { className: "w-8 h-8 bg-surface-3 border border-surface-4\n                                  rounded-lg flex items-center justify-center flex-shrink-0", children: b.faviconUrl ? (_jsx("img", { src: b.faviconUrl, alt: "", className: "w-5 h-5 object-contain", onError: e => (e.currentTarget.style.display = 'none') })) : (_jsx("svg", { className: "w-4 h-4 text-ink-4", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 1.5, children: _jsx("path", { d: "M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" }) })) }), _jsxs("div", { className: "flex-1 min-w-0 cursor-pointer", onClick: () => onOpenBookmark(b.id), children: [_jsx("p", { className: "text-xs font-medium text-ink-1 truncate\n                                  hover:text-brand-bright transition-colors", children: b.title ?? domain }), _jsx("p", { className: "text-[10px] text-ink-4 truncate", children: domain })] }), _jsx("div", { className: "flex items-center gap-1 flex-shrink-0", children: (b.tags ?? []).slice(0, 2).map((tag) => (_jsx("span", { className: "text-[9px] px-1.5 py-0.5 bg-surface-3\n                                       text-ink-4 rounded-full", children: tag.name }, tag.id))) }), _jsx("span", { className: "text-[10px] text-ink-5 flex-shrink-0", children: timeAgo(b.createdAt) }), _jsxs("div", { className: "flex items-center gap-1 opacity-0 group-hover:opacity-100\n                                  transition-opacity flex-shrink-0", children: [_jsxs("button", { onClick: () => handleUnarchive(b.id), className: "flex items-center gap-1 px-2 py-1 text-[10px]\n                                 text-green-400 hover:bg-green-400/10 rounded-lg\n                                 transition-colors", title: "Restore to library", children: [_jsxs("svg", { className: "w-3 h-3", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2, children: [_jsx("polyline", { points: "1 4 1 10 7 10" }), _jsx("path", { d: "M3.51 15a9 9 0 102.13-9.36L1 10" })] }), "Restore"] }), _jsxs("button", { onClick: () => handleDelete(b.id), className: "flex items-center gap-1 px-2 py-1 text-[10px]\n                                 text-red-400 hover:bg-red-400/10 rounded-lg\n                                 transition-colors", title: "Delete permanently", children: [_jsxs("svg", { className: "w-3 h-3", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2, children: [_jsx("polyline", { points: "3 6 5 6 21 6" }), _jsx("path", { d: "M19 6l-1 14H6L5 6" })] }), "Delete"] })] })] }, b.id));
                        }) }))] })] }));
}
