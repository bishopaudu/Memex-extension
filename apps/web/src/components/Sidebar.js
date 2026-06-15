import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { collectionsApi, digestApi } from '../lib/api';
const COLORS = ['#4f6ef7', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];
export function Sidebar({ tags, collections, activeTag, activeCollection, bookmarkCount, currentPage, onTagClick, onCollectionClick, onCollectionsChange, onOpenCollectionsPage, onOpenWikiPage, onOpenArchive, onOpenReadingList, onGoHome, onOpenProfile, avatarUrl, userEmail, onLogout }) {
    const [creating, setCreating] = useState(false);
    const [newName, setNewName] = useState('');
    const [newColor, setNewColor] = useState(COLORS[0]);
    const [newIcon, setNewIcon] = useState('📁');
    const [saving, setSaving] = useState(false);
    const [sendingDigest, setSendingDigest] = useState(false);
    const [digestSent, setDigestSent] = useState(false);
    async function handleCreate() {
        if (!newName.trim())
            return;
        setSaving(true);
        await collectionsApi.create({ name: newName.trim(), color: newColor, icon: newIcon });
        setNewName('');
        setCreating(false);
        setSaving(false);
        onCollectionsChange();
    }
    const initial = userEmail?.[0]?.toUpperCase() ?? 'U';
    return (_jsxs("aside", { className: "w-[220px] flex-shrink-0 bg-surface-2 border-r border-surface-4\n                      flex flex-col h-screen sticky top-0 overflow-y-auto", children: [_jsxs("div", { className: "flex items-center gap-2 px-4 py-4 border-b border-surface-4", children: [_jsx("div", { className: "w-7 h-7 bg-brand rounded-lg flex items-center justify-center\n                        text-white font-bold text-xs flex-shrink-0", children: "M" }), _jsx("span", { className: "text-sm font-semibold text-ink-1", children: "Memex" })] }), _jsxs("nav", { className: "flex-1 p-2 overflow-y-auto", children: [_jsxs("div", { className: "mb-4", children: [_jsxs("button", { onClick: () => { onTagClick(''); onCollectionClick(''); onGoHome(); }, className: `w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs
                        transition-colors text-left
                        ${!activeTag && !activeCollection
                                    ? 'bg-brand/10 text-brand-bright'
                                    : 'text-ink-3 hover:text-ink-2 hover:bg-surface-3'}`, children: [_jsxs("svg", { className: "w-3.5 h-3.5 flex-shrink-0", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2, children: [_jsx("rect", { x: "3", y: "3", width: "7", height: "7" }), _jsx("rect", { x: "14", y: "3", width: "7", height: "7" }), _jsx("rect", { x: "3", y: "14", width: "7", height: "7" }), _jsx("rect", { x: "14", y: "14", width: "7", height: "7" })] }), "All bookmarks", _jsx("span", { className: "ml-auto text-[10px] bg-surface-3 text-ink-4 px-1.5 py-0.5 rounded", children: bookmarkCount })] }), _jsxs("button", { onClick: onOpenCollectionsPage, className: `w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs
                        transition-colors text-left
                        ${currentPage === 'collections'
                                    ? 'bg-brand/10 text-brand-bright'
                                    : 'text-ink-3 hover:text-ink-2 hover:bg-surface-3'}`, children: [_jsx("svg", { className: "w-3.5 h-3.5 flex-shrink-0", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2, children: _jsx("path", { d: "M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" }) }), "Collections", _jsx("span", { className: "ml-auto text-[10px] bg-surface-3 text-ink-4 px-1.5 py-0.5 rounded", children: collections.length })] }), _jsxs("button", { onClick: onOpenWikiPage, className: `w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs
                        transition-colors text-left
                        ${currentPage === 'wiki'
                                    ? 'bg-brand/10 text-brand-bright'
                                    : 'text-ink-3 hover:text-ink-2 hover:bg-surface-3'}`, children: [_jsx("span", { className: "text-sm leading-none", children: "\uD83E\uDDE0" }), "Wiki"] }), _jsxs("button", { onClick: onOpenArchive, className: `w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs
                        transition-colors text-left
                        ${currentPage === 'archive'
                                    ? 'bg-brand/10 text-brand-bright'
                                    : 'text-ink-3 hover:text-ink-2 hover:bg-surface-3'}`, children: [_jsx("span", { className: "text-sm leading-none", children: "\uD83D\uDCE6" }), "Archive"] }), _jsxs("button", { onClick: onOpenReadingList, className: `w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs
                        transition-colors text-left
                        ${currentPage === 'reading'
                                    ? 'bg-brand/10 text-brand-bright'
                                    : 'text-ink-3 hover:text-ink-2 hover:bg-surface-3'}`, children: [_jsx("span", { className: "text-sm leading-none", children: "\uD83D\uDCD6" }), "Reading list"] })] }), _jsxs("div", { className: "mb-4", children: [_jsxs("div", { className: "flex items-center justify-between px-2 mb-1", children: [_jsx("span", { className: "text-[10px] font-medium text-ink-4 uppercase tracking-widest", children: "Collections" }), _jsx("button", { onClick: () => setCreating(true), className: "w-4 h-4 flex items-center justify-center text-ink-4\n                         hover:text-ink-2 transition-colors", children: _jsxs("svg", { className: "w-3 h-3", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2, children: [_jsx("line", { x1: "12", y1: "5", x2: "12", y2: "19" }), _jsx("line", { x1: "5", y1: "12", x2: "19", y2: "12" })] }) })] }), collections.map(col => (_jsxs("button", { onClick: () => onCollectionClick(col.id === activeCollection ? '' : col.id), className: `w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs
                          transition-colors text-left group
                          ${activeCollection === col.id
                                    ? 'bg-brand/10 text-brand-bright'
                                    : 'text-ink-3 hover:text-ink-2 hover:bg-surface-3'}`, children: [_jsx("span", { className: "text-sm", children: col.icon }), _jsx("span", { className: "truncate flex-1", children: col.name }), _jsx("span", { className: "text-[10px] text-ink-4 ml-auto", children: col.count })] }, col.id))), creating && (_jsxs("div", { className: "mt-2 p-2 bg-surface-3 rounded-lg border border-surface-4", children: [_jsx("input", { autoFocus: true, type: "text", placeholder: "Collection name", value: newName, onChange: e => setNewName(e.target.value), onKeyDown: e => {
                                            if (e.key === 'Enter')
                                                handleCreate();
                                            if (e.key === 'Escape')
                                                setCreating(false);
                                        }, className: "w-full bg-surface-2 border border-surface-4 rounded px-2 py-1\n                           text-xs text-ink-1 outline-none focus:border-brand\n                           placeholder-ink-4 mb-2" }), _jsx("div", { className: "flex gap-1 mb-2 flex-wrap", children: ['📁', '🔖', '⭐', '🎨', '💻', '📚', '🚀', '💡', '🔬', '📝'].map(e => (_jsx("button", { onClick: () => setNewIcon(e), className: `w-6 h-6 text-xs rounded transition-colors
                                ${newIcon === e ? 'bg-brand/20' : 'hover:bg-surface-4'}`, children: e }, e))) }), _jsx("div", { className: "flex gap-1 mb-2", children: COLORS.map(c => (_jsx("button", { onClick: () => setNewColor(c), style: { background: c }, className: `w-4 h-4 rounded-full transition-transform
                                ${newColor === c ? 'scale-125' : ''}` }, c))) }), _jsxs("div", { className: "flex gap-1", children: [_jsx("button", { onClick: handleCreate, disabled: saving || !newName.trim(), className: "flex-1 py-1 bg-brand text-white text-xs rounded\n                             disabled:opacity-40 hover:bg-brand/90 transition-colors", children: saving ? '...' : 'Create' }), _jsx("button", { onClick: () => setCreating(false), className: "px-2 py-1 text-ink-3 text-xs hover:text-ink-1 transition-colors", children: "Cancel" })] })] })), collections.length === 0 && !creating && (_jsx("p", { className: "text-[10px] text-ink-4 px-2 py-1", children: "No collections yet" }))] }), tags.length > 0 && (_jsxs("div", { children: [_jsx("div", { className: "px-2 mb-1", children: _jsx("span", { className: "text-[10px] font-medium text-ink-4 uppercase tracking-widest", children: "Tags" }) }), tags.slice(0, 10).map(tag => (_jsxs("button", { onClick: () => { onTagClick(tag.name === activeTag ? '' : tag.name); onGoHome(); }, className: `w-full flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs
                            transition-colors text-left
                            ${activeTag === tag.name
                                    ? 'bg-brand/10 text-brand-bright'
                                    : 'text-ink-3 hover:text-ink-2 hover:bg-surface-3'}`, children: [_jsx("span", { className: "text-brand-bright opacity-60", children: "#" }), _jsx("span", { className: "truncate flex-1", children: tag.name }), _jsx("span", { className: "text-[10px] text-ink-4", children: tag.count })] }, tag.id)))] }))] }), _jsxs("div", { className: "px-2 pb-2 flex flex-col gap-0.5", children: [_jsxs("a", { href: "/explore", target: "_blank", className: "w-full flex items-center gap-2 px-2 py-1.5 rounded-md\n                      text-xs text-ink-4 hover:text-ink-2 hover:bg-surface-3\n                      transition-colors", children: [_jsx("span", { className: "text-sm", children: "\uD83C\uDF0D" }), "Explore public knowledge", _jsxs("svg", { className: "w-2.5 h-2.5 ml-auto text-ink-5", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2, children: [_jsx("path", { d: "M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" }), _jsx("polyline", { points: "15 3 21 3 21 9" }), _jsx("line", { x1: "10", y1: "14", x2: "21", y2: "3" })] })] }), _jsxs("a", { href: "/help", target: "_blank", className: "w-full flex items-center gap-2 px-2 py-1.5 rounded-md\n                      text-xs text-ink-4 hover:text-ink-2 hover:bg-surface-3\n                      transition-colors", children: [_jsx("span", { className: "text-sm", children: "\u2753" }), "Help & guides"] }), _jsxs("a", { href: "/feedback", target: "_blank", className: "w-full flex items-center gap-2 px-2 py-1.5 rounded-md\n                      text-xs text-ink-4 hover:text-ink-2 hover:bg-surface-3\n                      transition-colors", children: [_jsx("span", { className: "text-sm", children: "\uD83D\uDCAC" }), "Send feedback"] })] }), _jsxs("div", { className: "p-3 border-t border-surface-4 flex items-center gap-2", children: [_jsx("button", { onClick: onOpenProfile, className: "w-6 h-6 rounded-full overflow-hidden flex items-center\n                     justify-center flex-shrink-0 hover:opacity-80\n                     transition-opacity", title: "View profile", children: avatarUrl ? (_jsx("img", { src: avatarUrl, alt: "Avatar", className: "w-full h-full object-cover" })) : (_jsx("div", { className: "w-full h-full bg-brand/20 flex items-center\n                            justify-center text-[10px] font-medium text-brand-bright", children: initial })) }), _jsx("button", { onClick: onOpenProfile, className: "text-[11px] text-ink-3 truncate flex-1 text-left\n                     hover:text-ink-1 transition-colors", title: "View profile", children: userEmail }), _jsx("button", { onClick: async () => {
                            setSendingDigest(true);
                            await digestApi.sendDigest();
                            setSendingDigest(false);
                            setDigestSent(true);
                            setTimeout(() => setDigestSent(false), 3000);
                        }, disabled: sendingDigest, className: "text-[10px] text-ink-4 hover:text-ink-2 transition-colors\n                     flex-shrink-0 mr-1", title: "Send weekly digest email", children: digestSent ? '✓' : sendingDigest ? '...' : '📧' }), _jsx("button", { onClick: onLogout, className: "text-[10px] text-ink-4 hover:text-ink-2 transition-colors flex-shrink-0", title: "Sign out", children: _jsxs("svg", { className: "w-3 h-3", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2, children: [_jsx("path", { d: "M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" }), _jsx("polyline", { points: "16 17 21 12 16 7" }), _jsx("line", { x1: "21", y1: "12", x2: "9", y2: "12" })] }) })] })] }));
}
