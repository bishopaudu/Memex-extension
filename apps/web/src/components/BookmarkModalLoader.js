import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { bookmarksApi } from '../lib/api';
import { BookmarkModal } from './BookmarkModal';
export function BookmarkModalLoader({ bookmarkId, onClose, onDelete, onTagClick }) {
    const [bookmark, setBookmark] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    useEffect(() => {
        fetchBookmark();
    }, [bookmarkId]);
    async function fetchBookmark() {
        setLoading(true);
        setError(false);
        const result = await bookmarksApi.getOne(bookmarkId);
        if (result.error) {
            setError(true);
            setLoading(false);
            return;
        }
        setBookmark(result.data.bookmark);
        setLoading(false);
    }
    // ── Loading state ──
    if (loading) {
        return (_jsx("div", { className: "fixed inset-0 z-50 flex items-center justify-center", style: { background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(6px)' }, onClick: onClose, children: _jsxs("div", { className: "bg-surface-2 border border-surface-4 rounded-2xl\n                     p-8 flex flex-col items-center gap-3", onClick: e => e.stopPropagation(), children: [_jsx("div", { className: "w-6 h-6 border-2 border-brand border-t-transparent\n                          rounded-full animate-spin" }), _jsx("p", { className: "text-xs text-ink-3", children: "Loading bookmark..." })] }) }));
    }
    // ── Error state ──
    if (error || !bookmark) {
        return (_jsx("div", { className: "fixed inset-0 z-50 flex items-center justify-center", style: { background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(6px)' }, onClick: onClose, children: _jsxs("div", { className: "bg-surface-2 border border-surface-4 rounded-2xl\n                     p-8 flex flex-col items-center gap-3", onClick: e => e.stopPropagation(), children: [_jsx("p", { className: "text-sm text-ink-2", children: "Failed to load bookmark" }), _jsx("button", { onClick: fetchBookmark, className: "text-xs text-brand-bright hover:underline", children: "Try again" }), _jsx("button", { onClick: onClose, className: "text-xs text-ink-4 hover:text-ink-2", children: "Close" })] }) }));
    }
    return (_jsx(BookmarkModal, { bookmark: bookmark, onClose: onClose, onDelete: onDelete, onTagClick: onTagClick }));
}
