import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { collectionsApi } from '../lib/api';
const COLORS = ['#4f6ef7', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];
const ICONS = ['📁', '🔖', '⭐', '🎨', '💻', '📚', '🚀', '💡', '🔬', '📝', '🎯', '🌐', '🔑', '📊', '🎵'];
export function CollectionsPage({ collections, onOpenCollection, onCollectionsChange }) {
    const [creating, setCreating] = useState(false);
    const [newName, setNewName] = useState('');
    const [newDesc, setNewDesc] = useState('');
    const [newColor, setNewColor] = useState(COLORS[0]);
    const [newIcon, setNewIcon] = useState('📁');
    const [saving, setSaving] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    async function handleCreate() {
        if (!newName.trim())
            return;
        setSaving(true);
        await collectionsApi.create({
            name: newName.trim(),
            description: newDesc.trim() || undefined,
            color: newColor,
            icon: newIcon,
        });
        setNewName('');
        setNewDesc('');
        setCreating(false);
        setSaving(false);
        onCollectionsChange();
    }
    const filtered = collections.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()));
    const totalBookmarks = collections.reduce((sum, c) => sum + c.count, 0);
    function timeAgo(date) {
        const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
        if (s < 3600)
            return `${Math.floor(s / 60)}m ago`;
        if (s < 86400)
            return `${Math.floor(s / 3600)}h ago`;
        if (s < 604800)
            return `${Math.floor(s / 86400)}d ago`;
        return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
    return (_jsxs("div", { className: "flex-1 flex flex-col overflow-hidden bg-surface-1", children: [_jsxs("header", { className: "h-12 border-b border-surface-4 flex items-center\n                         gap-3 px-5 flex-shrink-0", children: [_jsxs("div", { className: "flex items-center gap-2 text-xs text-ink-3", children: [_jsx("span", { children: "Memex" }), _jsx("span", { className: "text-ink-5", children: "/" }), _jsx("span", { className: "text-ink-1 font-medium", children: "Collections" })] }), _jsx("div", { className: "ml-auto flex items-center gap-2", children: _jsxs("div", { className: "relative", children: [_jsxs("svg", { className: "absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-ink-4", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2, children: [_jsx("circle", { cx: "11", cy: "11", r: "8" }), _jsx("line", { x1: "21", y1: "21", x2: "16.65", y2: "16.65" })] }), _jsx("input", { type: "text", placeholder: "Search collections...", value: searchQuery, onChange: e => setSearchQuery(e.target.value), className: "pl-8 pr-3 py-1.5 w-44 bg-surface-3 border border-surface-4\n                         rounded-lg text-xs text-ink-1 placeholder-ink-4 outline-none\n                         focus:border-brand transition-colors" })] }) })] }), _jsxs("main", { className: "flex-1 overflow-y-auto p-5", children: [_jsxs("div", { className: "flex items-center justify-between mb-6", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-sm font-semibold text-ink-1", children: "Your collections" }), _jsxs("p", { className: "text-[11px] text-ink-4 mt-0.5", children: [collections.length, " ", collections.length === 1 ? 'collection' : 'collections', ' · ', totalBookmarks, " bookmarks total"] })] }), _jsxs("button", { onClick: () => setCreating(true), className: "flex items-center gap-1.5 px-3 py-1.5 bg-brand text-white\n                       text-xs font-medium rounded-lg hover:bg-brand/90 transition-colors", children: [_jsxs("svg", { className: "w-3 h-3", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2.5, children: [_jsx("line", { x1: "12", y1: "5", x2: "12", y2: "19" }), _jsx("line", { x1: "5", y1: "12", x2: "19", y2: "12" })] }), "New collection"] })] }), creating && (_jsxs("div", { className: "mb-6 p-4 bg-surface-2 border border-brand/30 rounded-2xl", children: [_jsx("p", { className: "text-xs font-medium text-ink-2 mb-3", children: "New collection" }), _jsxs("div", { className: "flex gap-3 mb-3", children: [_jsxs("div", { children: [_jsx("p", { className: "text-[10px] text-ink-4 uppercase tracking-wider mb-1.5", children: "Icon" }), _jsx("div", { className: "flex flex-wrap gap-1 w-36", children: ICONS.map(icon => (_jsx("button", { onClick: () => setNewIcon(icon), className: `w-7 h-7 rounded-lg text-sm transition-colors
                                  ${newIcon === icon
                                                        ? 'bg-brand/20 ring-1 ring-brand/40'
                                                        : 'hover:bg-surface-3'}`, children: icon }, icon))) })] }), _jsxs("div", { className: "flex-1 flex flex-col gap-2", children: [_jsxs("div", { children: [_jsx("p", { className: "text-[10px] text-ink-4 uppercase tracking-wider mb-1.5", children: "Name" }), _jsx("input", { autoFocus: true, type: "text", placeholder: "Collection name", value: newName, onChange: e => setNewName(e.target.value), onKeyDown: e => {
                                                            if (e.key === 'Enter')
                                                                handleCreate();
                                                            if (e.key === 'Escape')
                                                                setCreating(false);
                                                        }, className: "w-full px-3 py-2 bg-surface-3 border border-surface-4\n                               rounded-lg text-xs text-ink-1 outline-none focus:border-brand\n                               placeholder-ink-4 transition-colors" })] }), _jsxs("div", { children: [_jsx("p", { className: "text-[10px] text-ink-4 uppercase tracking-wider mb-1.5", children: "Description (optional)" }), _jsx("input", { type: "text", placeholder: "What's this collection for?", value: newDesc, onChange: e => setNewDesc(e.target.value), className: "w-full px-3 py-2 bg-surface-3 border border-surface-4\n                               rounded-lg text-xs text-ink-1 outline-none focus:border-brand\n                               placeholder-ink-4 transition-colors" })] }), _jsxs("div", { children: [_jsx("p", { className: "text-[10px] text-ink-4 uppercase tracking-wider mb-1.5", children: "Color" }), _jsx("div", { className: "flex gap-2", children: COLORS.map(color => (_jsx("button", { onClick: () => setNewColor(color), style: { background: color }, className: `w-5 h-5 rounded-full transition-transform
                                    ${newColor === color ? 'scale-125 ring-2 ring-white/20' : ''}` }, color))) })] })] })] }), _jsxs("div", { className: "flex items-center gap-3 p-3 bg-surface-3 rounded-xl mb-3", children: [_jsx("div", { className: "w-10 h-10 rounded-xl flex items-center justify-center text-xl", style: { background: newColor + '20', border: `1px solid ${newColor}30` }, children: newIcon }), _jsxs("div", { children: [_jsx("p", { className: "text-xs font-medium text-ink-1", children: newName || 'Collection name' }), _jsx("p", { className: "text-[10px] text-ink-4", children: newDesc || 'No description' })] })] }), _jsxs("div", { className: "flex gap-2", children: [_jsx("button", { onClick: handleCreate, disabled: saving || !newName.trim(), className: "flex-1 py-2 bg-brand text-white text-xs font-medium\n                           rounded-lg disabled:opacity-40 hover:bg-brand/90\n                           transition-colors", children: saving ? 'Creating...' : 'Create collection' }), _jsx("button", { onClick: () => { setCreating(false); setNewName(''); setNewDesc(''); }, className: "px-4 py-2 text-ink-3 text-xs hover:text-ink-1 transition-colors", children: "Cancel" })] })] })), filtered.length === 0 && !creating && (_jsxs("div", { className: "flex flex-col items-center justify-center py-24 text-center", children: [_jsx("div", { className: "w-16 h-16 bg-surface-3 border border-surface-4 rounded-2xl\n                            flex items-center justify-center text-3xl mb-4", children: "\uD83D\uDCC1" }), _jsx("p", { className: "text-sm font-medium text-ink-2 mb-1", children: searchQuery ? 'No collections match' : 'No collections yet' }), _jsx("p", { className: "text-xs text-ink-4 mb-4", children: searchQuery
                                    ? 'Try a different search'
                                    : 'Create a collection to organise your bookmarks' }), !searchQuery && (_jsx("button", { onClick: () => setCreating(true), className: "flex items-center gap-1.5 px-4 py-2 bg-brand text-white\n                           text-xs font-medium rounded-lg hover:bg-brand/90 transition-colors", children: "Create your first collection" }))] })), filtered.length > 0 && (_jsx("div", { className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4", children: filtered.map(collection => (_jsx(FolderCard, { collection: collection, onClick: () => onOpenCollection(collection.id), onDelete: async () => {
                                await collectionsApi.delete(collection.id);
                                onCollectionsChange();
                            }, timeAgo: timeAgo }, collection.id))) }))] })] }));
}
// ─────────────────────────────────────────────
// Folder Card
// ─────────────────────────────────────────────
function FolderCard({ collection, onClick, onDelete, timeAgo }) {
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [hovered, setHovered] = useState(false);
    return (_jsxs("div", { className: "group relative bg-surface-2 border border-surface-4 rounded-2xl\n                 overflow-hidden cursor-pointer transition-all duration-200\n                 hover:border-surface-5 hover:shadow-lg hover:shadow-black/20", onClick: onClick, onMouseEnter: () => setHovered(true), onMouseLeave: () => { setHovered(false); setConfirmDelete(false); }, children: [_jsxs("div", { className: "p-4 pb-3", children: [_jsxs("div", { className: "flex items-start justify-between gap-2 mb-3", children: [_jsx("div", { className: "w-11 h-11 rounded-xl flex items-center justify-center\n                       text-2xl flex-shrink-0 transition-transform duration-200\n                       group-hover:scale-110", style: {
                                    background: collection.color + '18',
                                    border: `1px solid ${collection.color}25`,
                                }, children: collection.icon }), hovered && !confirmDelete && (_jsx("button", { onClick: e => { e.stopPropagation(); setConfirmDelete(true); }, className: "w-6 h-6 flex items-center justify-center rounded-lg\n                         text-ink-4 hover:text-red-400 hover:bg-red-400/10\n                         transition-colors opacity-0 group-hover:opacity-100", children: _jsxs("svg", { className: "w-3 h-3", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2, children: [_jsx("polyline", { points: "3 6 5 6 21 6" }), _jsx("path", { d: "M19 6l-1 14H6L5 6" })] }) })), confirmDelete && (_jsxs("div", { className: "flex items-center gap-1", onClick: e => e.stopPropagation(), children: [_jsx("button", { onClick: onDelete, className: "text-[10px] text-red-400 px-2 py-1 bg-red-400/10\n                           border border-red-400/20 rounded", children: "Delete" }), _jsx("button", { onClick: () => setConfirmDelete(false), className: "text-[10px] text-ink-3 hover:text-ink-1 px-1", children: "\u00D7" })] }))] }), _jsx("p", { className: "text-xs font-semibold text-ink-1 mb-0.5 leading-tight", children: collection.name }), collection.description && (_jsx("p", { className: "text-[10px] text-ink-4 leading-relaxed line-clamp-2", children: collection.description }))] }), _jsx(PreviewStrip, { count: collection.count, color: collection.color }), _jsxs("div", { className: "flex items-center justify-between px-4 py-2.5\n                      border-t border-surface-4", children: [_jsxs("span", { className: "text-[10px] text-ink-4 flex items-center gap-1", children: [_jsx("svg", { className: "w-3 h-3", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2, children: _jsx("path", { d: "M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" }) }), collection.count, " ", collection.count === 1 ? 'bookmark' : 'bookmarks'] }), _jsxs("div", { className: "flex items-center gap-1.5", children: [collection.isPublic && (_jsx("span", { className: "text-[9px] px-1.5 py-0.5 bg-brand/10 text-brand-bright\n                             rounded-full", children: "Public" })), _jsx("span", { className: "text-[10px] text-ink-5", children: timeAgo(collection.createdAt) })] })] })] }));
}
// ─────────────────────────────────────────────
// Preview strip — shows thumbnail placeholders
// In production these would be actual screenshots
// ─────────────────────────────────────────────
function PreviewStrip({ count, color }) {
    if (count === 0) {
        return (_jsx("div", { className: "mx-3 mb-3 h-14 bg-surface-3 border border-surface-4\n                      rounded-xl flex items-center justify-center", children: _jsx("p", { className: "text-[10px] text-ink-5", children: "Empty collection" }) }));
    }
    return (_jsx("div", { className: "grid grid-cols-3 gap-0.5 mx-3 mb-3 rounded-xl overflow-hidden h-14", children: [0, 1, 2].map(i => (_jsx("div", { className: "flex items-center justify-center", style: { background: color + (i === 0 ? '20' : i === 1 ? '14' : '0a') }, children: i < count ? (_jsx("svg", { className: "w-5 h-5", fill: "none", viewBox: "0 0 24 24", stroke: color + '60', strokeWidth: 1.5, children: _jsx("path", { d: "M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" }) })) : (_jsx("div", { className: "w-4 h-4 border border-dashed rounded", style: { borderColor: color + '20' } })) }, i))) }));
}
