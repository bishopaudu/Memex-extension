import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { API_BASE } from '../lib/config';
import { collectionsApi } from '../lib/api';
import { BookmarkCard } from '../components/BookmarkCard';
import { BookmarkDetailPage } from './BookmarkDetailPage';
import { BookmarkModalLoader } from '../components/BookmarkModalLoader';
export function CollectionDetailPage({ collectionId, allCollections, onBack, onTagClick, onCollectionsChange }) {
    const [collection, setCollection] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedId, setSelectedId] = useState(null);
    const [detailId, setDetailId] = useState(null);
    const [view, setView] = useState('grid');
    const [sharing, setSharing] = useState(false);
    const [shareUrl, setShareUrl] = useState(null);
    const [copied, setCopied] = useState(false);
    useEffect(() => {
        fetchCollection();
    }, [collectionId]);
    async function fetchCollection() {
        setLoading(true);
        const result = await collectionsApi.getOne(collectionId);
        if (!result.error)
            setCollection(result.data.collection);
        setLoading(false);
    }
    async function handleTogglePublic() {
        if (!collection)
            return;
        setSharing(true);
        const r = await collectionsApi.update(collection.id, { isPublic: !collection.isPublic });
        if (!r.error) {
            const newIsPublic = !collection.isPublic;
            setCollection((prev) => prev ? { ...prev, isPublic: newIsPublic } : prev);
            if (newIsPublic) {
                const meRes = await fetch(`${API_BASE}/api/auth/me`, {
                    headers: { Authorization: `Bearer ${localStorage.getItem('memex_token') ?? ''}` }
                });
                const meData = await meRes.json().catch(() => null);
                const username = meData?.data?.user?.username ?? 'user';
                // Get slug from updated collection
                const updated = await collectionsApi.getOne(collection.id);
                if (!updated.error) {
                    const slug = updated.data.collection.slug;
                    setCollection((prev) => prev ? { ...prev, slug } : prev);
                    setShareUrl(`${window.location.origin}/p/${username}/collection/${slug}`);
                }
            }
            else {
                setShareUrl(null);
            }
        }
        setSharing(false);
    }
    async function handleDelete(bookmarkId) {
        // Remove bookmark from local state optimistically
        setCollection((prev) => ({
            ...prev,
            bookmarks: prev.bookmarks.filter((b) => b.id !== bookmarkId),
        }));
    }
    if (detailId) {
        return (_jsx(BookmarkDetailPage, { bookmarkId: detailId, onBack: () => setDetailId(null), onDelete: id => { handleDelete(id); setDetailId(null); }, onTagClick: tag => { onTagClick(tag); onBack(); } }));
    }
    if (loading) {
        return (_jsx("div", { className: "flex-1 flex items-center justify-center bg-surface-1", children: _jsx("div", { className: "w-5 h-5 border-2 border-brand border-t-transparent\n                        rounded-full animate-spin" }) }));
    }
    if (!collection) {
        return (_jsx("div", { className: "flex-1 flex items-center justify-center bg-surface-1", children: _jsxs("div", { className: "text-center", children: [_jsx("p", { className: "text-sm text-ink-2 mb-2", children: "Collection not found" }), _jsx("button", { onClick: onBack, className: "text-xs text-brand-bright hover:underline", children: "\u2190 Back to collections" })] }) }));
    }
    const bookmarks = collection.bookmarks ?? [];
    return (_jsxs("div", { className: "flex-1 flex flex-col overflow-hidden bg-surface-1", children: [_jsxs("header", { className: "h-12 border-b border-surface-4 flex items-center\n                         gap-3 px-5 flex-shrink-0", children: [_jsxs("div", { className: "flex items-center gap-2 text-xs text-ink-3", children: [_jsxs("button", { onClick: onBack, className: "hover:text-ink-1 transition-colors flex items-center gap-1", children: [_jsx("svg", { className: "w-3 h-3", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2, children: _jsx("polyline", { points: "15 18 9 12 15 6" }) }), "Collections"] }), _jsx("span", { className: "text-ink-5", children: "/" }), _jsxs("span", { className: "text-ink-1 font-medium flex items-center gap-1", children: [_jsx("span", { children: collection.icon }), collection.name] })] }), _jsxs("div", { className: "ml-auto flex items-center gap-0.5 bg-surface-3 rounded-md p-0.5", children: [_jsx("button", { onClick: () => setView('grid'), className: `w-6 h-6 rounded flex items-center justify-center transition-colors
                        ${view === 'grid' ? 'bg-surface-4 text-ink-1' : 'text-ink-4 hover:text-ink-2'}`, children: _jsxs("svg", { className: "w-3 h-3", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2, children: [_jsx("rect", { x: "3", y: "3", width: "7", height: "7" }), _jsx("rect", { x: "14", y: "3", width: "7", height: "7" }), _jsx("rect", { x: "3", y: "14", width: "7", height: "7" }), _jsx("rect", { x: "14", y: "14", width: "7", height: "7" })] }) }), _jsx("button", { onClick: () => setView('list'), className: `w-6 h-6 rounded flex items-center justify-center transition-colors
                        ${view === 'list' ? 'bg-surface-4 text-ink-1' : 'text-ink-4 hover:text-ink-2'}`, children: _jsxs("svg", { className: "w-3 h-3", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2, children: [_jsx("line", { x1: "3", y1: "6", x2: "21", y2: "6" }), _jsx("line", { x1: "3", y1: "12", x2: "21", y2: "12" }), _jsx("line", { x1: "3", y1: "18", x2: "21", y2: "18" })] }) })] })] }), _jsxs("main", { className: "flex-1 overflow-y-auto", children: [_jsx("div", { className: "border-b border-surface-4 px-5 py-5", children: _jsxs("div", { className: "flex items-center gap-4", children: [_jsx("div", { className: "w-14 h-14 rounded-2xl flex items-center justify-center\n                         text-3xl border flex-shrink-0", style: {
                                        background: collection.color + '15',
                                        borderColor: collection.color + '30',
                                    }, children: collection.icon }), _jsxs("div", { children: [_jsx("h1", { className: "text-base font-semibold text-ink-1 mb-0.5", children: collection.name }), collection.description && (_jsx("p", { className: "text-xs text-ink-3 mb-1", children: collection.description })), _jsxs("p", { className: "text-[11px] text-ink-4", children: [bookmarks.length, " ", bookmarks.length === 1 ? 'bookmark' : 'bookmarks'] })] })] }) }), _jsxs("div", { className: "p-5", children: [bookmarks.length === 0 && (_jsxs("div", { className: "flex flex-col items-center justify-center py-20 text-center", children: [_jsx("div", { className: "w-14 h-14 bg-surface-3 border border-surface-4 rounded-2xl\n                              flex items-center justify-center text-2xl mb-4", children: collection.icon }), _jsx("p", { className: "text-sm font-medium text-ink-2 mb-1", children: "This collection is empty" }), _jsx("p", { className: "text-xs text-ink-4 max-w-xs", children: "Add bookmarks to this collection from any bookmark card using the folder icon" })] })), bookmarks.length > 0 && view === 'grid' && (_jsx("div", { className: "columns-1 sm:columns-2 lg:grid-cols-3\n                            xl:columns-4 gap-3", children: bookmarks.map((b) => (_jsx("div", { className: "break-inside-avoid mb-3", children: _jsx(BookmarkCard, { bookmark: b, collections: allCollections, onDelete: handleDelete, onTagClick: tag => { onTagClick(tag); onBack(); }, onOpenModal: b => setDetailId(b.id), onCollectionsChange: onCollectionsChange }, b.id) }, b.id))) })), bookmarks.length > 0 && view === 'list' && (_jsx("div", { className: "flex flex-col gap-1", children: bookmarks.map((b) => (_jsx(CollectionListRow, { bookmark: b, onDelete: handleDelete, onOpenModal: b => setDetailId(b.id) }, b.id))) }))] })] }), selectedId && (_jsx(BookmarkModalLoader, { bookmarkId: selectedId, onClose: () => setSelectedId(null), onDelete: id => { handleDelete(id); setSelectedId(null); }, onTagClick: tag => { onTagClick(tag); onBack(); setSelectedId(null); } }))] }));
}
function CollectionListRow({ bookmark, onDelete, onOpenModal }) {
    let domain = '';
    try {
        domain = new URL(bookmark.url).hostname.replace('www.', '');
    }
    catch { }
    return (_jsxs("div", { onClick: () => onOpenModal(bookmark), className: "group flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer\n                 hover:bg-surface-2 transition-colors border border-transparent\n                 hover:border-surface-4", children: [bookmark.faviconUrl && (_jsx("img", { src: bookmark.faviconUrl, alt: "", className: "w-4 h-4 flex-shrink-0", onError: e => (e.currentTarget.style.display = 'none') })), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("p", { className: "text-xs text-ink-1 truncate", children: bookmark.title ?? domain }), _jsx("p", { className: "text-[10px] text-ink-4 truncate", children: domain })] }), _jsx("div", { className: "flex items-center gap-1", children: (bookmark.tags ?? []).slice(0, 2).map((tag) => (_jsx("span", { className: "px-1.5 py-0.5 bg-brand/10 text-brand-bright\n                           text-[9px] rounded", children: tag.name }, tag.id))) }), _jsx("button", { onClick: e => { e.stopPropagation(); onDelete(bookmark.id); }, className: "opacity-0 group-hover:opacity-100 w-5 h-5 flex items-center\n                   justify-center rounded text-ink-4 hover:text-red-400\n                   hover:bg-red-400/10 transition-all", children: _jsxs("svg", { className: "w-3 h-3", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2, children: [_jsx("polyline", { points: "3 6 5 6 21 6" }), _jsx("path", { d: "M19 6l-1 14H6L5 6" })] }) })] }));
}
