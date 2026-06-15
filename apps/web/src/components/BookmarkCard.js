import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { collectionsApi, readingApi } from '../lib/api';
import { useToast } from './Toast';
export function BookmarkCard({ bookmark, collections, onDelete, onArchive, onAddToReading, onTagClick, onOpenModal, onCollectionsChange, isSelected = false, onToggleSelect, }) {
    const [showCollMenu, setShowCollMenu] = useState(false);
    const [adding, setAdding] = useState(false);
    const { toast } = useToast();
    const image = bookmark.screenshotUrl ?? bookmark.ogImageUrl;
    let domain = '';
    try {
        domain = new URL(bookmark.url).hostname.replace('www.', '');
    }
    catch { }
    function timeAgo(date) {
        const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
        if (s < 60)
            return 'just now';
        if (s < 3600)
            return `${Math.floor(s / 60)}m ago`;
        if (s < 86400)
            return `${Math.floor(s / 3600)}h ago`;
        return `${Math.floor(s / 86400)}d ago`;
    }
    async function addToCollection(collectionId) {
        setAdding(true);
        await collectionsApi.addBookmark(collectionId, bookmark.id);
        setAdding(false);
        setShowCollMenu(false);
        onCollectionsChange();
        const col = collections.find(c => c.id === collectionId);
        toast(`Added to ${col?.name ?? 'collection'}`, 'success', col?.icon ?? '📁');
    }
    // Attachment summary for the card strip
    const atts = bookmark.attachments ?? [];
    const imageAtts = atts.filter(a => a.type === 'screenshot' || a.type === 'area_screenshot' || a.type === 'image');
    const textAtts = atts.filter(a => a.type === 'text');
    const hasAtts = atts.length > 0;
    return (_jsxs("div", { className: `group relative bg-surface-2 rounded-xl overflow-hidden
                  transition-all duration-200 cursor-pointer border
                  ${isSelected
            ? 'border-brand/60 ring-2 ring-brand/20 bg-brand/5'
            : 'border-surface-4 hover:border-surface-5'}`, onClick: (e) => {
            if (e.target.closest('[data-checkbox]'))
                return;
            onOpenModal(bookmark);
        }, children: [onToggleSelect && (_jsx("div", { "data-checkbox": "true", onClick: e => { e.stopPropagation(); onToggleSelect(bookmark.id); }, className: `absolute top-2 left-2 z-20 w-5 h-5 rounded-md border-2
                      flex items-center justify-center transition-all cursor-pointer
                      ${isSelected
                    ? 'bg-brand border-brand'
                    : 'bg-surface-2/80 border-surface-5 opacity-0 group-hover:opacity-100'}`, children: isSelected && (_jsx("svg", { className: "w-3 h-3 text-white", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 3, children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M5 13l4 4L19 7" }) })) })), _jsxs("div", { className: "w-full bg-surface-3 overflow-hidden relative", style: { minHeight: '80px' }, children: [image ? (_jsx("img", { src: image, alt: "", className: "w-full h-full object-cover group-hover:scale-[1.02]\n                       transition-transform duration-300", onError: e => {
                            const p = e.currentTarget.parentElement;
                            p.innerHTML = `<div class="w-full h-full flex items-center
                justify-center">
                <svg width="24" height="24" fill="none" viewBox="0 0 24 24"
                  stroke="#333" stroke-width="1.5">
                  <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/>
                </svg></div>`;
                        } })) : (_jsx("div", { className: "w-full h-full flex items-center justify-center", children: _jsx("svg", { className: "w-6 h-6 text-surface-5", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 1.5, children: _jsx("path", { d: "M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" }) }) })), hasAtts && (_jsx("div", { className: "absolute top-2 right-2", children: _jsxs("div", { className: "flex items-center gap-1 px-2 py-0.5 rounded-full\n                            bg-black/65 backdrop-blur-sm text-white text-[9px]\n                            font-medium", children: [_jsx("svg", { className: "w-2.5 h-2.5", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2, children: _jsx("path", { d: "M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19\n                         a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" }) }), atts.length] }) })), _jsx("div", { className: "absolute inset-0 bg-black/0 group-hover:bg-black/10\n                        transition-colors duration-200" })] }), _jsxs("div", { className: "p-3", children: [_jsx("p", { className: "text-xs font-medium text-ink-1 leading-snug line-clamp-2\n                      group-hover:text-brand-bright transition-colors mb-1", children: bookmark.title ?? domain }), _jsxs("div", { className: "flex items-center gap-1.5 mb-2", children: [bookmark.faviconUrl && (_jsx("img", { src: bookmark.faviconUrl, alt: "", className: "w-3 h-3 flex-shrink-0", onError: e => (e.currentTarget.style.display = 'none') })), _jsx("p", { className: "text-[10px] text-ink-4 truncate", children: domain })] }), bookmark.tags.length > 0 && (_jsxs("div", { className: "flex flex-wrap gap-1 mb-2", children: [bookmark.tags.slice(0, 3).map(tag => (_jsx("button", { onClick: e => { e.stopPropagation(); onTagClick(tag.name); }, className: "px-1.5 py-0.5 bg-brand/10 text-brand-bright text-[10px]\n                           rounded hover:bg-brand/20 transition-colors", children: tag.name }, tag.id))), bookmark.tags.length > 3 && (_jsxs("span", { className: "px-1.5 py-0.5 text-ink-4 text-[10px]", children: ["+", bookmark.tags.length - 3] }))] })), imageAtts.length > 0 && (_jsxs("div", { className: "flex gap-1 mb-2", children: [imageAtts.slice(0, 3).map(att => (att.url ? (_jsx("div", { className: "w-10 h-8 rounded border border-surface-4\n                             overflow-hidden flex-shrink-0 bg-surface-3", children: _jsx("img", { src: att.url, alt: "", className: "w-full h-full object-cover" }) }, att.id)) : null)), imageAtts.length > 3 && (_jsxs("div", { className: "w-10 h-8 rounded border border-surface-4\n                              bg-surface-3 flex items-center justify-center\n                              text-[9px] text-ink-4 flex-shrink-0", children: ["+", imageAtts.length - 3] }))] })), textAtts.length > 0 && (_jsx("div", { className: "mb-2 px-2 py-1.5 bg-surface-3 border-l-2 border-brand\n                          rounded-r-md", children: _jsx("p", { className: "text-[10px] text-ink-3 line-clamp-1", children: textAtts[0].content }) })), _jsxs("div", { className: "flex items-center justify-between pt-2 border-t border-surface-4", onClick: e => e.stopPropagation(), children: [_jsx("span", { className: "text-[10px] text-ink-4", children: timeAgo(bookmark.createdAt) }), _jsxs("div", { className: "flex items-center gap-1 opacity-0 group-hover:opacity-100\n                          transition-opacity", children: [_jsxs("div", { className: "relative", children: [_jsx("button", { onClick: e => { e.stopPropagation(); setShowCollMenu(!showCollMenu); }, className: "w-5 h-5 flex items-center justify-center rounded\n                           bg-surface-3 text-ink-3 hover:text-ink-1\n                           hover:bg-surface-4 transition-colors", title: "Add to collection", children: _jsx("svg", { className: "w-2.5 h-2.5", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2, children: _jsx("path", { d: "M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" }) }) }), showCollMenu && (_jsx("div", { className: "absolute bottom-6 right-0 w-44 bg-surface-2 border\n                                border-surface-4 rounded-lg shadow-xl z-20 py-1", children: collections.length === 0 ? (_jsx("p", { className: "text-[10px] text-ink-4 px-3 py-2", children: "No collections yet" })) : (collections.map(col => (_jsxs("button", { onClick: () => addToCollection(col.id), disabled: adding, className: "w-full flex items-center gap-2 px-3 py-1.5\n                                   text-[11px] text-ink-2 hover:bg-surface-3\n                                   transition-colors text-left", children: [_jsx("span", { children: col.icon }), _jsx("span", { className: "truncate", children: col.name })] }, col.id)))) }))] }), _jsx("a", { href: bookmark.url, target: "_blank", rel: "noopener noreferrer", onClick: e => e.stopPropagation(), className: "w-5 h-5 flex items-center justify-center rounded\n                         bg-surface-3 text-ink-3 hover:text-ink-1\n                         hover:bg-surface-4 transition-colors", title: "Open", children: _jsxs("svg", { className: "w-2.5 h-2.5", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2, children: [_jsx("path", { d: "M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" }), _jsx("polyline", { points: "15 3 21 3 21 9" }), _jsx("line", { x1: "10", y1: "14", x2: "21", y2: "3" })] }) }), onAddToReading && (_jsx("button", { onClick: async (e) => {
                                            e.stopPropagation();
                                            await readingApi.add(bookmark.id);
                                            onAddToReading(bookmark.id);
                                            toast('Added to reading list', 'success', '📖');
                                        }, className: "w-5 h-5 flex items-center justify-center rounded\n                           bg-surface-3 text-ink-3 hover:text-brand-bright\n                           hover:bg-brand/10 transition-colors", title: "Save to reading list", children: _jsxs("svg", { className: "w-2.5 h-2.5", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2, children: [_jsx("path", { d: "M12 20h9" }), _jsx("path", { d: "M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" })] }) })), onArchive && (_jsx("button", { onClick: e => { e.stopPropagation(); onArchive(bookmark.id); }, className: "w-5 h-5 flex items-center justify-center rounded\n                           bg-surface-3 text-ink-3 hover:text-amber-400\n                           hover:bg-amber-400/10 transition-colors", title: "Archive", children: _jsxs("svg", { className: "w-2.5 h-2.5", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2, children: [_jsx("polyline", { points: "21 8 21 21 3 21 3 8" }), _jsx("rect", { x: "1", y: "3", width: "22", height: "5" }), _jsx("line", { x1: "10", y1: "12", x2: "14", y2: "12" })] }) })), _jsx("button", { onClick: e => {
                                            e.stopPropagation();
                                            onDelete(bookmark.id);
                                            toast('Bookmark deleted', 'error', '🗑');
                                        }, className: "w-5 h-5 flex items-center justify-center rounded\n                         bg-surface-3 text-ink-3 hover:text-red-400\n                         hover:bg-red-400/10 transition-colors", title: "Delete", children: _jsxs("svg", { className: "w-2.5 h-2.5", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2, children: [_jsx("polyline", { points: "3 6 5 6 21 6" }), _jsx("path", { d: "M19 6l-1 14H6L5 6" })] }) })] })] })] })] }));
}
