import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, useRef, useCallback } from 'react';
import { API_BASE } from '../lib/config';
import { topicsApi, bookmarksApi, authApi } from '../lib/api';
const BLOCK_TYPES = [
    { type: 'heading1', icon: 'H1', label: 'Heading 1' },
    { type: 'heading2', icon: 'H2', label: 'Heading 2' },
    { type: 'heading3', icon: 'H3', label: 'Heading 3' },
    { type: 'paragraph', icon: '¶', label: 'Paragraph' },
    { type: 'bullet', icon: '•', label: 'Bullet' },
    { type: 'code', icon: '<>', label: 'Code' },
    { type: 'quote', icon: '"', label: 'Quote' },
    { type: 'divider', icon: '—', label: 'Divider' },
    { type: 'bookmark_embed', icon: '🔗', label: 'Bookmark embed' },
];
export function TopicPage({ topicId, allTopics, onBack, onDelete }) {
    const [topic, setTopic] = useState(null);
    const [blocks, setBlocks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [editingTitle, setEditingTitle] = useState(false);
    const [titleVal, setTitleVal] = useState('');
    const [showAddRef, setShowAddRef] = useState(false);
    const [showConnect, setShowConnect] = useState(false);
    const [sharing, setSharing] = useState(false);
    const [shareUrl, setShareUrl] = useState(null);
    const [copiedShare, setCopiedShare] = useState(false);
    const [allBookmarks, setAllBookmarks] = useState([]);
    const [blockMenu, setBlockMenu] = useState(null);
    const [activeBlock, setActiveBlock] = useState(null);
    const saveTimer = useRef(null);
    useEffect(() => {
        fetchTopic();
        fetchBookmarks();
    }, [topicId]);
    async function fetchTopic() {
        setLoading(true);
        const r = await topicsApi.getOne(topicId);
        if (!r.error) {
            setTopic(r.data.topic);
            setBlocks(r.data.topic.blocks);
            setTitleVal(r.data.topic.title);
        }
        setLoading(false);
    }
    async function fetchBookmarks() {
        const r = await bookmarksApi.list();
        if (!r.error)
            setAllBookmarks(r.data.items);
    }
    // Auto-save blocks 1.5s after last change
    const scheduleAutoSave = useCallback((newBlocks) => {
        if (saveTimer.current)
            clearTimeout(saveTimer.current);
        saveTimer.current = setTimeout(async () => {
            setSaving(true);
            await topicsApi.saveBlocks(topicId, newBlocks);
            setSaving(false);
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        }, 1500);
    }, [topicId]);
    function updateBlock(id, content) {
        const newBlocks = blocks.map(b => b.id === id ? { ...b, content } : b);
        setBlocks(newBlocks);
        scheduleAutoSave(newBlocks);
    }
    function addBlock(afterId, type = 'paragraph') {
        const newBlock = {
            id: crypto.randomUUID(),
            type,
            content: '',
            order: Date.now().toString(),
        };
        const idx = blocks.findIndex(b => b.id === afterId);
        const newBlocks = [
            ...blocks.slice(0, idx + 1),
            newBlock,
            ...blocks.slice(idx + 1),
        ];
        setBlocks(newBlocks);
        setBlockMenu(null);
        scheduleAutoSave(newBlocks);
        // Focus new block
        setTimeout(() => {
            document.getElementById(`block-${newBlock.id}`)?.focus();
        }, 50);
    }
    function deleteBlock(id) {
        if (blocks.length <= 1)
            return;
        const newBlocks = blocks.filter(b => b.id !== id);
        setBlocks(newBlocks);
        scheduleAutoSave(newBlocks);
    }
    function changeBlockType(id, type) {
        const newBlocks = blocks.map(b => b.id === id ? { ...b, type } : b);
        setBlocks(newBlocks);
        setBlockMenu(null);
        scheduleAutoSave(newBlocks);
    }
    async function saveTitle() {
        if (!topic || !titleVal.trim())
            return;
        setEditingTitle(false);
        await topicsApi.update(topicId, { title: titleVal });
        setTopic(prev => prev ? { ...prev, title: titleVal } : prev);
    }
    async function addReference(bookmarkId) {
        await topicsApi.addReference(topicId, bookmarkId);
        setShowAddRef(false);
        fetchTopic();
    }
    async function removeReference(bookmarkId) {
        await topicsApi.removeReference(topicId, bookmarkId);
        fetchTopic();
    }
    async function handleTogglePublic() {
        if (!topic)
            return;
        setSharing(true);
        const newIsPublic = !topic.isPublic;
        const r = await topicsApi.update(topic.id, { isPublic: newIsPublic });
        if (!r.error) {
            setTopic(prev => prev ? { ...prev, isPublic: newIsPublic } : prev);
            if (newIsPublic) {
                // The PATCH response returns slug directly
                let slug = r.data?.slug;
                // If not in response, fetch the topic to get the slug
                if (!slug) {
                    const updated = await topicsApi.getOne(topic.id);
                    if (!updated.error) {
                        slug = updated.data.topic.slug;
                    }
                }
                if (slug) {
                    // Get real username from API
                    let username = 'user';
                    try {
                        const meRes = await authApi.me();
                        if (!meRes.error) {
                            username = meRes.data.user.username ?? meRes.data.user.email.split('@')[0];
                        }
                    }
                    catch { }
                    setTopic(prev => prev ? { ...prev, slug, isPublic: newIsPublic } : prev);
                    setShareUrl(`${window.location.origin}/p/${username}/topic/${slug}`);
                }
                else {
                    // slug still null — generate one client-side from title as fallback
                    const fallbackSlug = topic.title
                        .toLowerCase()
                        .replace(/[^a-z0-9\s-]/g, '')
                        .replace(/\s+/g, '-')
                        .slice(0, 60);
                    setShareUrl(`${window.location.origin}/p/user/topic/${fallbackSlug}`);
                }
            }
            else {
                setShareUrl(null);
            }
        }
        setSharing(false);
    }
    async function connectTopic(toId) {
        await topicsApi.connect(topicId, toId);
        // Don't close panel — user can keep adding connections
        fetchTopic();
    }
    async function disconnectTopic(toId) {
        await topicsApi.disconnect(topicId, toId);
        fetchTopic();
    }
    if (loading) {
        return (_jsx("div", { className: "flex-1 flex items-center justify-center bg-surface-1", children: _jsx("div", { className: "w-5 h-5 border-2 border-brand border-t-transparent\n                        rounded-full animate-spin" }) }));
    }
    if (!topic) {
        return (_jsx("div", { className: "flex-1 flex items-center justify-center bg-surface-1", children: _jsxs("div", { className: "text-center", children: [_jsx("p", { className: "text-sm text-ink-2 mb-2", children: "Topic not found" }), _jsx("button", { onClick: onBack, className: "text-xs text-brand-bright hover:underline", children: "\u2190 Back" })] }) }));
    }
    // Topics not already connected, excluding self
    const connectableTopics = allTopics.filter(t => t.id !== topicId &&
        !topic.connections.some(c => c.topicId === t.id) &&
        !topic.backlinks.some(b => b.topicId === t.id));
    // Bookmarks not already referenced
    const unreferencedBookmarks = allBookmarks.filter(b => !topic.references.some(r => r.bookmarkId === b.id));
    return (_jsxs("div", { className: "flex-1 flex flex-col overflow-hidden bg-surface-1", children: [_jsxs("header", { className: "h-12 border-b border-surface-4 flex items-center\n                         gap-3 px-5 flex-shrink-0", children: [_jsxs("div", { className: "flex items-center gap-2 text-xs text-ink-3", children: [_jsxs("button", { onClick: onBack, className: "hover:text-ink-1 transition-colors flex items-center gap-1", children: [_jsx("svg", { className: "w-3 h-3", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2, children: _jsx("polyline", { points: "15 18 9 12 15 6" }) }), "Wiki"] }), _jsx("span", { className: "text-ink-5", children: "/" }), _jsxs("span", { className: "text-ink-1 font-medium", children: [topic.emoji, " ", topic.title] })] }), _jsxs("div", { className: "ml-auto flex items-center gap-2", children: [saving && (_jsxs("span", { className: "text-[10px] text-ink-4 flex items-center gap-1", children: [_jsx("div", { className: "w-2.5 h-2.5 border border-ink-4 border-t-transparent\n                              rounded-full animate-spin" }), "Saving..."] })), saved && !saving && (_jsx("span", { className: "text-[10px] text-green-400", children: "\u2713 Saved" })), _jsx("button", { onClick: () => onDelete(topic.id), className: "text-[10px] text-ink-4 hover:text-red-400 px-2 py-1\n                       hover:bg-red-400/10 rounded transition-colors", children: "Delete topic" })] })] }), _jsxs("div", { className: "flex-1 flex overflow-hidden", children: [_jsx("div", { className: "flex-1 overflow-y-auto", children: _jsxs("div", { className: "max-w-2xl mx-auto px-8 py-10", children: [_jsx("div", { className: "w-full h-1.5 rounded-full mb-8 opacity-60", style: { background: topic.coverColor } }), _jsxs("div", { className: "flex items-start gap-3 mb-8", children: [_jsx("button", { className: "text-4xl hover:opacity-80 transition-opacity mt-1", title: "Change emoji", onClick: () => { }, children: topic.emoji }), editingTitle ? (_jsx("input", { autoFocus: true, value: titleVal, onChange: e => setTitleVal(e.target.value), onBlur: saveTitle, onKeyDown: e => { if (e.key === 'Enter')
                                                saveTitle(); }, className: "flex-1 text-3xl font-bold text-ink-1 bg-transparent\n                             outline-none border-b border-brand/40 pb-1" })) : (_jsx("h1", { onClick: () => setEditingTitle(true), className: "flex-1 text-3xl font-bold text-ink-1 cursor-text\n                             hover:opacity-80 transition-opacity leading-tight", children: topic.title }))] }), _jsx(SummaryInput, { value: topic.summary ?? '', onChange: async (v) => {
                                        setTopic(prev => prev ? { ...prev, summary: v } : prev);
                                        await topicsApi.update(topicId, { summary: v });
                                    } }), _jsxs("div", { className: "mt-6 flex flex-col gap-0.5", children: [blocks.map((block, idx) => (block.type === 'bookmark_embed' ? (_jsx(BookmarkEmbedBlock, { block: block, allBookmarks: allBookmarks, onSelect: (bookmarkId) => updateBlock(block.id, bookmarkId), onDelete: () => deleteBlock(block.id) }, block.id)) : (_jsx(BlockEditor, { block: block, isActive: activeBlock === block.id, showMenu: blockMenu === block.id, onFocus: () => setActiveBlock(block.id), onBlur: () => setActiveBlock(null), onUpdate: content => updateBlock(block.id, content), onEnter: () => addBlock(block.id), onDelete: () => deleteBlock(block.id), onMenuToggle: () => setBlockMenu(prev => prev === block.id ? null : block.id), onChangeType: type => changeBlockType(block.id, type), onAddBelow: type => addBlock(block.id, type) }, block.id)))), _jsxs("button", { onClick: () => addBlock(blocks[blocks.length - 1]?.id ?? '', 'paragraph'), className: "flex items-center gap-2 mt-4 text-xs text-ink-5\n                           hover:text-ink-3 transition-colors group", children: [_jsx("span", { className: "w-5 h-5 rounded border border-dashed border-surface-5\n                                 group-hover:border-surface-6 flex items-center justify-center\n                                 text-[10px]", children: "+" }), "Add block"] })] })] }) }), _jsxs("div", { className: "w-72 flex-shrink-0 border-l border-surface-4 overflow-y-auto\n                        bg-surface-2 p-4 flex flex-col gap-5", children: [_jsxs("div", { children: [_jsxs("div", { className: "flex items-center justify-between mb-2", children: [_jsxs("p", { className: "text-[10px] font-medium text-ink-4 uppercase tracking-wider", children: ["References (", topic.references.length, ")"] }), _jsx("button", { onClick: () => setShowAddRef(!showAddRef), className: "text-[10px] text-brand-bright hover:underline", children: "+ Add" })] }), showAddRef && (_jsx(ReferenceSearch, { bookmarks: unreferencedBookmarks, onAdd: addReference, onClose: () => setShowAddRef(false) })), _jsxs("div", { className: "flex flex-col gap-1.5", children: [topic.references.length === 0 && !showAddRef && (_jsx("p", { className: "text-[10px] text-ink-5 py-2 text-center border border-dashed\n                               border-surface-5 rounded-lg", children: "No references yet" })), topic.references.map(ref => (_jsx(ReferenceCard, { reference: ref, onRemove: () => removeReference(ref.bookmarkId) }, ref.bookmarkId)))] })] }), _jsxs("div", { children: [_jsxs("div", { className: "flex items-center justify-between mb-2", children: [_jsxs("p", { className: "text-[10px] font-medium text-ink-4 uppercase tracking-wider", children: ["Connected topics (", topic.connections.length + topic.backlinks.length, ")"] }), _jsx("button", { onClick: () => setShowConnect(!showConnect), className: `text-[10px] transition-colors
                            ${showConnect
                                                    ? 'text-ink-3 hover:text-ink-1'
                                                    : 'text-brand-bright hover:underline'}`, children: showConnect ? 'Done' : '+ Link' })] }), showConnect && (_jsx("div", { className: "mb-2 bg-surface-3 border border-surface-4 rounded-lg\n                              overflow-hidden max-h-36 overflow-y-auto", children: connectableTopics.length === 0 ? (_jsx("p", { className: "text-[10px] text-ink-4 p-3 text-center", children: "No other topics to link" })) : (connectableTopics.map(t => (_jsxs("button", { onClick: () => connectTopic(t.id), className: "w-full flex items-center gap-2 px-3 py-2 text-left\n                                 text-[11px] text-ink-2 hover:bg-surface-4 transition-colors", children: [_jsx("span", { children: t.emoji }), _jsx("span", { className: "truncate", children: t.title })] }, t.id)))) })), _jsxs("div", { className: "flex flex-col gap-1", children: [topic.connections.map(conn => (_jsx(ConnectionPill, { conn: conn, direction: "outgoing", onRemove: () => disconnectTopic(conn.topicId) }, conn.topicId))), topic.backlinks.map(bl => (_jsx(ConnectionPill, { conn: bl, direction: "incoming", onRemove: () => { } }, bl.topicId))), topic.connections.length === 0 && topic.backlinks.length === 0 && (_jsx("p", { className: "text-[10px] text-ink-5 py-2 text-center border border-dashed\n                               border-surface-5 rounded-lg", children: "No connections yet" }))] })] }), _jsxs("div", { className: "border-t border-surface-4 pt-4", children: [_jsxs("div", { className: "flex items-center justify-between mb-2", children: [_jsx("p", { className: "text-[10px] font-medium text-ink-4 uppercase tracking-wider", children: "Sharing" }), _jsx("button", { onClick: handleTogglePublic, disabled: sharing, className: `relative w-8 h-4 rounded-full transition-colors flex-shrink-0
                            ${topic.isPublic ? 'bg-green-500' : 'bg-surface-5'}
                            ${sharing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`, title: topic.isPublic ? 'Make private' : 'Make public', children: _jsx("div", { className: `absolute top-0.5 w-3 h-3 rounded-full bg-white
                                 transition-transform shadow-sm
                                 ${topic.isPublic ? 'translate-x-4' : 'translate-x-0.5'}` }) })] }), topic.isPublic ? (_jsxs("div", { className: "flex flex-col gap-1.5", children: [_jsxs("p", { className: "text-[10px] text-green-400 flex items-center gap-1", children: [_jsx("span", { children: "\u25CF" }), " Public \u2014 anyone with the link can view"] }), shareUrl ? (_jsxs("div", { className: "flex items-center gap-1 bg-surface-3 border\n                                  border-surface-4 rounded-lg overflow-hidden", children: [_jsx("p", { className: "text-[9px] text-ink-4 px-2 truncate flex-1 py-1.5", children: shareUrl.replace(window.location.origin, '') }), _jsx("button", { onClick: async () => {
                                                            await navigator.clipboard.writeText(shareUrl);
                                                            setCopiedShare(true);
                                                            setTimeout(() => setCopiedShare(false), 2000);
                                                        }, className: "px-2 py-1.5 text-[9px] bg-surface-4 hover:bg-surface-5\n                                 text-ink-3 hover:text-ink-1 transition-colors flex-shrink-0\n                                 border-l border-surface-4", children: copiedShare ? '✓' : 'Copy' })] })) : (_jsx("button", { onClick: async () => {
                                                    const updated = await topicsApi.getOne(topicId);
                                                    if (!updated.error) {
                                                        const slug = updated.data.topic.slug;
                                                        try {
                                                            const meRes = await fetch(`${API_BASE}/api/auth/me`, {
                                                                headers: { Authorization: `Bearer ${localStorage.getItem('memex_token') ?? ''}` }
                                                            });
                                                            const meData = await meRes.json();
                                                            const username = meData?.data?.user?.username ?? 'user';
                                                            setShareUrl(`${window.location.origin}/p/${username}/topic/${slug}`);
                                                        }
                                                        catch {
                                                            setShareUrl(`${window.location.origin}/p/user/topic/${slug}`);
                                                        }
                                                    }
                                                }, className: "text-[9px] text-brand-bright hover:underline", children: "Get share link \u2192" }))] })) : (_jsx("p", { className: "text-[10px] text-ink-5", children: "Toggle to make this topic publicly viewable" })), _jsxs("p", { className: "text-[10px] text-ink-5 mt-3", children: ["Updated ", new Date(topic.updatedAt).toLocaleDateString('en-US', {
                                                month: 'short', day: 'numeric', year: 'numeric'
                                            })] })] })] })] })] }));
}
// ─────────────────────────────────────────────
// Summary input — editable on click
// ─────────────────────────────────────────────
function SummaryInput({ value, onChange }) {
    const [editing, setEditing] = useState(false);
    const [val, setVal] = useState(value);
    return editing ? (_jsx("textarea", { autoFocus: true, value: val, onChange: e => setVal(e.target.value), onBlur: () => { setEditing(false); onChange(val); }, placeholder: "Add a short summary of this topic...", rows: 2, className: "w-full text-sm text-ink-3 bg-surface-3 border border-brand/30\n                 rounded-lg px-3 py-2 outline-none resize-none leading-relaxed" })) : (_jsx("p", { onClick: () => setEditing(true), className: `text-sm leading-relaxed cursor-text rounded-lg px-3 py-2
                  hover:bg-surface-3 transition-colors
                  ${val ? 'text-ink-3' : 'text-ink-5 italic'}`, children: val || 'Add a short summary of this topic...' }));
}
// ─────────────────────────────────────────────
// Block Editor — single block
// ─────────────────────────────────────────────
// ─────────────────────────────────────────────
// Bookmark Embed Block
// ─────────────────────────────────────────────
function BookmarkEmbedBlock({ block, allBookmarks, onSelect, onDelete }) {
    const [showSearch, setShowSearch] = useState(false);
    const [query, setQuery] = useState('');
    // block.content stores the bookmarkId once selected
    const selectedBookmark = block.content
        ? allBookmarks.find(b => b.id === block.content)
        : null;
    const filtered = allBookmarks.filter(b => (b.title ?? b.url).toLowerCase().includes(query.toLowerCase())).slice(0, 6);
    if (selectedBookmark) {
        let domain = '';
        try {
            domain = new URL(selectedBookmark.url).hostname.replace('www.', '');
        }
        catch { }
        return (_jsxs("div", { className: "group my-1 relative", children: [_jsxs("a", { href: selectedBookmark.url, target: "_blank", rel: "noopener noreferrer", className: "flex items-center gap-3 p-3 bg-surface-3 border border-surface-4\n                     rounded-xl hover:border-brand/30 transition-colors", children: [selectedBookmark.faviconUrl && (_jsx("div", { className: "w-8 h-8 bg-surface-2 rounded-lg border border-surface-4\n                            flex items-center justify-center flex-shrink-0 overflow-hidden", children: _jsx("img", { src: selectedBookmark.faviconUrl, alt: "", className: "w-5 h-5 object-contain", onError: e => (e.currentTarget.style.display = 'none') }) })), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("p", { className: "text-xs font-medium text-ink-1 truncate", children: selectedBookmark.title ?? domain }), _jsx("p", { className: "text-[10px] text-ink-4 truncate", children: selectedBookmark.url }), selectedBookmark.description && (_jsx("p", { className: "text-[10px] text-ink-3 line-clamp-1 mt-0.5", children: selectedBookmark.description }))] }), _jsxs("svg", { className: "w-3.5 h-3.5 text-ink-5 flex-shrink-0", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2, children: [_jsx("path", { d: "M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" }), _jsx("polyline", { points: "15 3 21 3 21 9" }), _jsx("line", { x1: "10", y1: "14", x2: "21", y2: "3" })] })] }), _jsx("button", { onClick: onDelete, className: "absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center\n                     rounded-full bg-surface-2 border border-surface-4 text-ink-4\n                     hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all", children: _jsxs("svg", { className: "w-3 h-3", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2, children: [_jsx("line", { x1: "18", y1: "6", x2: "6", y2: "18" }), _jsx("line", { x1: "6", y1: "6", x2: "18", y2: "18" })] }) })] }));
    }
    // No bookmark selected yet — show search
    return (_jsxs("div", { className: "my-1 border border-dashed border-surface-5 rounded-xl p-3", children: [_jsxs("p", { className: "text-[11px] text-ink-4 mb-2 flex items-center gap-1.5", children: [_jsx("span", { children: "\uD83D\uDD17" }), " Select a bookmark to embed"] }), _jsx("input", { autoFocus: true, type: "text", placeholder: "Search your bookmarks...", value: query, onChange: e => setQuery(e.target.value), className: "w-full px-3 py-1.5 bg-surface-3 border border-surface-4 rounded-lg\n                   text-xs text-ink-1 placeholder-ink-4 outline-none focus:border-brand\n                   transition-colors mb-2" }), _jsxs("div", { className: "flex flex-col gap-0.5 max-h-32 overflow-y-auto", children: [filtered.map(b => {
                        let domain = '';
                        try {
                            domain = new URL(b.url).hostname.replace('www.', '');
                        }
                        catch { }
                        return (_jsxs("button", { onClick: () => {
                                // Update block content with bookmarkId
                                onSelect(b.id);
                            }, className: "flex items-center gap-2 px-2 py-1.5 rounded-lg text-left\n                         hover:bg-surface-3 transition-colors", children: [b.faviconUrl && (_jsx("img", { src: b.faviconUrl, alt: "", className: "w-3.5 h-3.5 flex-shrink-0", onError: e => (e.currentTarget.style.display = 'none') })), _jsx("p", { className: "text-[11px] text-ink-2 truncate", children: b.title ?? domain })] }, b.id));
                    }), filtered.length === 0 && query && (_jsx("p", { className: "text-[10px] text-ink-5 text-center py-2", children: "No bookmarks found" }))] }), _jsx("button", { onClick: onDelete, className: "mt-2 text-[10px] text-ink-5 hover:text-ink-3 transition-colors", children: "Cancel" })] }));
}
function BlockEditor({ block, isActive, showMenu, onFocus, onBlur, onUpdate, onEnter, onDelete, onMenuToggle, onChangeType, onAddBelow }) {
    if (block.type === 'divider') {
        return (_jsxs("div", { className: "group flex items-center gap-2 py-2", children: [_jsx("hr", { className: "flex-1 border-surface-4" }), _jsx("button", { onClick: onDelete, className: "opacity-0 group-hover:opacity-100 text-[10px] text-ink-4\n                     hover:text-red-400 transition-all", children: "\u00D7" })] }));
    }
    const classes = {
        heading1: 'text-2xl font-bold text-ink-1',
        heading2: 'text-xl font-semibold text-ink-1',
        heading3: 'text-base font-semibold text-ink-2',
        paragraph: 'text-sm text-ink-1 leading-relaxed',
        bullet: 'text-sm text-ink-1 leading-relaxed',
        code: 'text-xs text-green-400 font-mono bg-surface-3 rounded px-3 py-2',
        quote: 'text-sm text-ink-2 italic border-l-2 border-brand/40 pl-3',
    };
    const textClass = classes[block.type] ?? 'text-sm text-ink-1';
    return (_jsxs("div", { className: "group relative flex items-start gap-1", children: [_jsxs("div", { className: "relative", children: [_jsx("button", { onClick: onMenuToggle, className: `w-5 h-5 flex items-center justify-center rounded text-[9px]
                      font-mono mt-1 transition-all flex-shrink-0
                      ${isActive || showMenu
                            ? 'opacity-100 bg-surface-3 text-ink-3'
                            : 'opacity-0 group-hover:opacity-100 text-ink-4'}`, children: "\u22EE\u22EE" }), showMenu && (_jsxs("div", { className: "absolute left-6 top-0 z-20 w-44 bg-surface-2 border\n                          border-surface-4 rounded-xl shadow-xl overflow-hidden py-1", children: [BLOCK_TYPES.map(bt => (_jsxs("button", { onClick: () => onChangeType(bt.type), className: `w-full flex items-center gap-2.5 px-3 py-1.5 text-left
                            text-xs transition-colors
                            ${block.type === bt.type
                                    ? 'bg-brand/10 text-brand-bright'
                                    : 'text-ink-2 hover:bg-surface-3'}`, children: [_jsx("span", { className: "w-5 text-[10px] font-mono text-center text-ink-4", children: bt.icon }), bt.label] }, bt.type))), _jsx("div", { className: "border-t border-surface-4 mt-1 pt-1", children: _jsxs("button", { onClick: onDelete, className: "w-full flex items-center gap-2.5 px-3 py-1.5 text-left\n                           text-xs text-red-400 hover:bg-red-400/10 transition-colors", children: [_jsx("span", { className: "w-5 text-center text-[10px]", children: "\uD83D\uDDD1" }), "Delete block"] }) })] }))] }), block.type === 'bullet' && (_jsx("span", { className: "text-ink-4 mt-1 flex-shrink-0 text-xs", children: "\u2022" })), _jsx("div", { id: `block-${block.id}`, contentEditable: true, suppressContentEditableWarning: true, onFocus: onFocus, onBlur: e => { onBlur(); onUpdate(e.currentTarget.textContent ?? ''); }, onInput: e => onUpdate(e.target.textContent ?? ''), onKeyDown: e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        onEnter();
                    }
                    if (e.key === 'Backspace' && block.content === '') {
                        e.preventDefault();
                        onDelete();
                    }
                }, className: `flex-1 outline-none min-h-[1.5em] ${textClass}
                    empty:before:content-[attr(data-placeholder)]
                    empty:before:text-ink-5 empty:before:pointer-events-none`, "data-placeholder": block.type === 'heading1' ? 'Heading 1'
                    : block.type === 'heading2' ? 'Heading 2'
                        : block.type === 'heading3' ? 'Heading 3'
                            : block.type === 'code' ? 'Code...'
                                : block.type === 'quote' ? 'Quote...'
                                    : 'Write something...', dangerouslySetInnerHTML: { __html: block.content } })] }));
}
// ─────────────────────────────────────────────
// Reference search + add
// ─────────────────────────────────────────────
function ReferenceSearch({ bookmarks, onAdd, onClose }) {
    const [query, setQuery] = useState('');
    const filtered = bookmarks.filter(b => (b.title ?? b.url).toLowerCase().includes(query.toLowerCase())).slice(0, 8);
    return (_jsxs("div", { className: "mb-2 bg-surface-3 border border-surface-4 rounded-lg overflow-hidden", children: [_jsx("input", { autoFocus: true, type: "text", placeholder: "Search bookmarks...", value: query, onChange: e => setQuery(e.target.value), className: "w-full px-3 py-2 bg-transparent text-xs text-ink-1\n                   placeholder-ink-4 outline-none border-b border-surface-4" }), _jsx("div", { className: "max-h-40 overflow-y-auto", children: filtered.length === 0 ? (_jsx("p", { className: "text-[10px] text-ink-4 p-3 text-center", children: "No bookmarks found" })) : (filtered.map(b => {
                    let domain = '';
                    try {
                        domain = new URL(b.url).hostname.replace('www.', '');
                    }
                    catch { }
                    return (_jsxs("button", { onClick: () => onAdd(b.id), className: "w-full flex items-center gap-2 px-3 py-2 text-left\n                           hover:bg-surface-4 transition-colors", children: [b.faviconUrl && (_jsx("img", { src: b.faviconUrl, alt: "", className: "w-3.5 h-3.5 flex-shrink-0", onError: e => (e.currentTarget.style.display = 'none') })), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("p", { className: "text-[11px] text-ink-1 truncate", children: b.title ?? domain }), _jsx("p", { className: "text-[9px] text-ink-4 truncate", children: domain })] })] }, b.id));
                })) }), _jsx("button", { onClick: onClose, className: "w-full py-1.5 text-[10px] text-ink-4 hover:text-ink-2\n                   transition-colors border-t border-surface-4", children: "Cancel" })] }));
}
// ─────────────────────────────────────────────
// Reference card in sidebar
// ─────────────────────────────────────────────
function ReferenceCard({ reference, onRemove }) {
    let domain = '';
    try {
        domain = new URL(reference.bookmark.url).hostname.replace('www.', '');
    }
    catch { }
    return (_jsxs("div", { className: "group flex items-start gap-2 p-2 bg-surface-3 border border-surface-4\n                    rounded-lg hover:border-surface-5 transition-colors", children: [reference.bookmark.faviconUrl && (_jsx("img", { src: reference.bookmark.faviconUrl, alt: "", className: "w-4 h-4 flex-shrink-0 mt-0.5", onError: e => (e.currentTarget.style.display = 'none') })), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("a", { href: reference.bookmark.url, target: "_blank", rel: "noopener noreferrer", className: "text-[11px] font-medium text-ink-1 truncate block\n                      hover:text-brand-bright transition-colors", children: reference.bookmark.title ?? domain }), _jsx("p", { className: "text-[10px] text-ink-4 truncate", children: domain }), reference.note && (_jsx("p", { className: "text-[10px] text-ink-3 mt-1 line-clamp-2 italic", children: reference.note }))] }), _jsx("button", { onClick: onRemove, className: "opacity-0 group-hover:opacity-100 text-ink-4 hover:text-red-400\n                   transition-all flex-shrink-0", children: _jsxs("svg", { className: "w-3 h-3", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2, children: [_jsx("line", { x1: "18", y1: "6", x2: "6", y2: "18" }), _jsx("line", { x1: "6", y1: "6", x2: "18", y2: "18" })] }) })] }));
}
// ─────────────────────────────────────────────
// Connection pill
// ─────────────────────────────────────────────
function ConnectionPill({ conn, direction, onRemove }) {
    return (_jsxs("div", { className: "group flex items-center gap-1.5 px-2.5 py-1.5 bg-surface-3\n                    border border-surface-4 rounded-lg hover:border-surface-5\n                    transition-colors", children: [_jsx("span", { className: "text-[10px] text-ink-4 flex-shrink-0", children: direction === 'outgoing' ? '→' : '←' }), _jsx("span", { className: "text-xs", children: conn.emoji }), _jsx("span", { className: "text-[11px] text-ink-2 truncate flex-1", children: conn.title }), conn.label && (_jsx("span", { className: "text-[9px] text-ink-4 italic truncate max-w-[50px]", children: conn.label })), direction === 'outgoing' && (_jsx("button", { onClick: onRemove, className: "opacity-0 group-hover:opacity-100 text-ink-4 hover:text-red-400\n                     transition-all flex-shrink-0", children: _jsxs("svg", { className: "w-3 h-3", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2, children: [_jsx("line", { x1: "18", y1: "6", x2: "6", y2: "18" }), _jsx("line", { x1: "6", y1: "6", x2: "18", y2: "18" })] }) }))] }));
}
