import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { API_BASE } from '../lib/config';
export function ExplorePage() {
    const [data, setData] = useState({});
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    useEffect(() => { fetchExplore(); }, [filter]);
    async function fetchExplore() {
        setLoading(true);
        try {
            const r = await fetch(`${API_BASE}/p/explore?type=${filter}`);
            const json = await r.json();
            if (!json.error)
                setData(json.data);
        }
        catch { }
        setLoading(false);
    }
    const topics = (data.topics ?? []);
    const collections = (data.collections ?? []);
    const bookmarks = (data.bookmarks ?? []);
    // Unified feed — interleave for a natural Pinterest mix
    const feed = [];
    const maxLen = Math.max(topics.length, collections.length, bookmarks.length);
    for (let i = 0; i < maxLen; i++) {
        if (topics[i])
            feed.push({ kind: 'topic', data: topics[i] });
        if (bookmarks[i])
            feed.push({ kind: 'bookmark', data: bookmarks[i] });
        if (bookmarks[i + 1])
            feed.push({ kind: 'bookmark', data: bookmarks[i + 1] });
        if (collections[i])
            feed.push({ kind: 'collection', data: collections[i] });
    }
    const hasContent = feed.length > 0;
    return (_jsxs("div", { className: "min-h-screen bg-surface-0", children: [_jsxs("nav", { className: "border-b border-surface-4 px-6 py-3 flex items-center\n                      justify-between max-w-6xl mx-auto", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("div", { className: "w-7 h-7 bg-brand rounded-lg flex items-center\n                          justify-center text-white font-bold text-xs", children: "M" }), _jsx("span", { className: "font-semibold text-ink-1 text-sm", children: "Memex" }), _jsx("span", { className: "text-ink-5 text-xs", children: "/" }), _jsx("span", { className: "text-xs text-ink-3", children: "Explore" })] }), _jsxs("div", { className: "flex items-center gap-4", children: [_jsx("a", { href: "/help", className: "text-xs text-ink-3 hover:text-ink-1 transition-colors", children: "Help" }), _jsx("a", { href: "/about", className: "text-xs text-ink-3 hover:text-ink-1 transition-colors", children: "About" }), _jsx("a", { href: "/auth", className: "text-xs text-ink-3 hover:text-ink-1 transition-colors", children: "Sign in" }), _jsx("a", { href: "/auth", className: "text-xs px-3 py-1.5 bg-brand text-white rounded-lg\n                        hover:bg-brand/90 transition-colors", children: "Get started free" })] })] }), _jsxs("div", { className: "text-center py-14 px-6 max-w-2xl mx-auto", children: [_jsx("h1", { className: "text-3xl font-bold text-ink-1 mb-3", children: "Explore public knowledge" }), _jsx("p", { className: "text-sm text-ink-3 leading-relaxed", children: "Discover bookmarks, collections, and wiki topics shared by the Memex community. Find ideas, save what inspires you, build your own knowledge base." })] }), _jsx("div", { className: "flex items-center justify-center gap-2 mb-8 px-6", children: [
                    { key: 'all', label: '✨ All' },
                    { key: 'topics', label: '🧠 Wiki topics' },
                    { key: 'collections', label: '📁 Collections' },
                    { key: 'bookmarks', label: '🔖 Bookmarks' },
                ].map(f => (_jsx("button", { onClick: () => setFilter(f.key), className: `px-4 py-2 text-xs font-medium rounded-full transition-colors
                        ${filter === f.key
                        ? 'bg-brand text-white'
                        : 'bg-surface-2 border border-surface-4 text-ink-3 hover:text-ink-1'}`, children: f.label }, f.key))) }), _jsxs("main", { className: "max-w-6xl mx-auto px-6 pb-16", children: [loading && (_jsx("div", { className: "flex items-center justify-center py-24", children: _jsx("div", { className: "w-6 h-6 border-2 border-brand border-t-transparent\n                            rounded-full animate-spin" }) })), !loading && !hasContent && (_jsxs("div", { className: "text-center py-24", children: [_jsx("p", { className: "text-4xl mb-4", children: "\uD83C\uDF31" }), _jsx("p", { className: "text-sm font-medium text-ink-2 mb-1", children: "Nothing public yet" }), _jsx("p", { className: "text-xs text-ink-4 mb-6", children: "Be the first to share your knowledge" }), _jsx("a", { href: "/auth", className: "text-sm text-brand-bright hover:underline", children: "Create your account \u2192" })] })), !loading && hasContent && (_jsx("div", { className: "columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4", children: feed.map((item, i) => (_jsxs("div", { className: "break-inside-avoid mb-4", children: [item.kind === 'topic' && _jsx(TopicCard, { t: item.data }), item.kind === 'collection' && _jsx(CollectionCard, { c: item.data }), item.kind === 'bookmark' && _jsx(BookmarkCard, { b: item.data })] }, `${item.kind}-${item.data.id}-${i}`))) }))] }), _jsx("footer", { className: "border-t border-surface-4 px-6 py-6", children: _jsxs("div", { className: "max-w-6xl mx-auto flex items-center justify-between\n                        text-[11px] text-ink-4", children: [_jsxs("span", { children: ["\u00A9 ", new Date().getFullYear(), " Memex"] }), _jsxs("div", { className: "flex items-center gap-4", children: [_jsx("a", { href: "/about", className: "hover:text-ink-2 transition-colors", children: "About" }), _jsx("a", { href: "/help", className: "hover:text-ink-2 transition-colors", children: "Help" }), _jsx("a", { href: "/feedback", className: "hover:text-ink-2 transition-colors", children: "Feedback" })] })] }) })] }));
}
// ─────────────────────────────────────────────
// Author chip — shown at the bottom of every card
// ─────────────────────────────────────────────
function AuthorChip({ username, name, avatarUrl }) {
    const initial = (name || username || '?')[0].toUpperCase();
    return (_jsxs("a", { href: `/p/${username}`, onClick: e => e.stopPropagation(), className: "flex items-center gap-1.5 hover:opacity-80 transition-opacity", children: [_jsx("div", { className: "w-4 h-4 rounded-full overflow-hidden bg-brand/20\n                      flex items-center justify-center flex-shrink-0", children: avatarUrl ? (_jsx("img", { src: avatarUrl, alt: "", className: "w-full h-full object-cover" })) : (_jsx("span", { className: "text-[8px] font-bold text-brand-bright", children: initial })) }), _jsx("span", { className: "text-[10px] text-ink-4 truncate", children: name || username })] }));
}
// ─────────────────────────────────────────────
// Topic card
// ─────────────────────────────────────────────
function TopicCard({ t }) {
    return (_jsxs("a", { href: `/p/${t.username}/topic/${t.slug}`, className: "group block bg-surface-2 border border-surface-4 rounded-2xl\n                  overflow-hidden hover:border-brand/30 hover:shadow-lg\n                  hover:shadow-black/20 transition-all hover:-translate-y-0.5", children: [_jsxs("div", { className: "h-20 flex items-center justify-center relative overflow-hidden", style: { background: `linear-gradient(135deg, ${t.cover_color}25, ${t.cover_color}05)` }, children: [_jsx("span", { className: "text-4xl", children: t.emoji }), _jsx("span", { className: "absolute top-2 right-2 text-[9px] px-2 py-0.5\n                         bg-surface-2/80 text-ink-3 rounded-full border border-surface-4", children: "\uD83E\uDDE0 Wiki" })] }), _jsxs("div", { className: "p-4", children: [_jsx("p", { className: "text-sm font-semibold text-ink-1 mb-1 line-clamp-2\n                      group-hover:text-brand-bright transition-colors", children: t.title }), t.summary && (_jsx("p", { className: "text-[11px] text-ink-4 line-clamp-3 leading-relaxed mb-3", children: t.summary })), _jsxs("div", { className: "flex items-center justify-between pt-2 border-t border-surface-4", children: [_jsx(AuthorChip, { username: t.username, name: t.user_name, avatarUrl: t.avatar_url }), _jsx("span", { className: "text-[9px] text-ink-5", children: new Date(t.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) })] })] })] }));
}
// ─────────────────────────────────────────────
// Collection card
// ─────────────────────────────────────────────
function CollectionCard({ c }) {
    return (_jsxs("a", { href: `/p/${c.username}/collection/${c.slug}`, className: "group block bg-surface-2 border border-surface-4 rounded-2xl\n                  overflow-hidden hover:border-brand/30 hover:shadow-lg\n                  hover:shadow-black/20 transition-all hover:-translate-y-0.5", children: [_jsxs("div", { className: "h-20 flex items-center justify-center relative overflow-hidden", style: { background: `linear-gradient(135deg, ${c.color}25, ${c.color}05)` }, children: [_jsx("span", { className: "text-4xl", children: c.icon }), _jsx("span", { className: "absolute top-2 right-2 text-[9px] px-2 py-0.5\n                         bg-surface-2/80 text-ink-3 rounded-full border border-surface-4", children: "\uD83D\uDCC1 Collection" })] }), _jsxs("div", { className: "p-4", children: [_jsx("p", { className: "text-sm font-semibold text-ink-1 mb-1 line-clamp-2\n                      group-hover:text-brand-bright transition-colors", children: c.name }), c.description ? (_jsx("p", { className: "text-[11px] text-ink-4 line-clamp-2 leading-relaxed mb-2", children: c.description })) : (_jsxs("p", { className: "text-[11px] text-ink-4 mb-2", children: [c.bookmark_count, " bookmark", c.bookmark_count === 1 ? '' : 's'] })), _jsxs("div", { className: "flex items-center justify-between pt-2 border-t border-surface-4", children: [_jsx(AuthorChip, { username: c.username, name: c.user_name, avatarUrl: c.avatar_url }), _jsxs("span", { className: "text-[9px] text-ink-5", children: [c.bookmark_count, " saved"] })] })] })] }));
}
// ─────────────────────────────────────────────
// Bookmark card — Pinterest style with image
// ─────────────────────────────────────────────
function BookmarkCard({ b }) {
    let domain = '';
    try {
        domain = new URL(b.url).hostname.replace('www.', '');
    }
    catch { }
    const img = b.screenshot_url ?? b.og_image_url;
    return (_jsxs("a", { href: `/p/b/${b.public_slug}`, className: "group block bg-surface-2 border border-surface-4 rounded-2xl\n                  overflow-hidden hover:border-brand/30 hover:shadow-lg\n                  hover:shadow-black/20 transition-all hover:-translate-y-0.5", children: [img ? (_jsx("div", { className: "w-full overflow-hidden bg-surface-3", children: _jsx("img", { src: img, alt: "", className: "w-full object-cover group-hover:scale-105\n                          transition-transform duration-300", onError: e => (e.currentTarget.parentElement.style.display = 'none') }) })) : (_jsx("div", { className: "h-20 flex items-center justify-center bg-surface-3", children: _jsx("span", { className: "text-3xl opacity-40", children: "\uD83D\uDD16" }) })), _jsxs("div", { className: "p-3", children: [_jsxs("div", { className: "flex items-center gap-1.5 mb-1.5", children: [b.favicon_url && (_jsx("img", { src: b.favicon_url, alt: "", className: "w-3.5 h-3.5 flex-shrink-0", onError: e => (e.currentTarget.style.display = 'none') })), _jsx("span", { className: "text-[10px] text-ink-4 truncate", children: domain })] }), _jsx("p", { className: "text-xs font-medium text-ink-1 line-clamp-2\n                      group-hover:text-brand-bright transition-colors mb-1", children: b.title || domain }), b.description && (_jsx("p", { className: "text-[10px] text-ink-4 line-clamp-2 leading-relaxed mb-2", children: b.description })), _jsxs("div", { className: "flex items-center justify-between pt-2 border-t border-surface-4", children: [_jsx(AuthorChip, { username: b.username, name: b.user_name, avatarUrl: b.avatar_url }), _jsx("span", { className: "text-[9px] text-ink-5", children: "\uD83D\uDD16" })] })] })] }));
}
