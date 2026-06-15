import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { publicApi } from '../lib/api';
export function PublicCollectionPage() {
    const { username, slug } = useParams();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);
    useEffect(() => {
        if (username && slug)
            fetchCollection();
    }, [username, slug]);
    async function fetchCollection() {
        setLoading(true);
        const r = await publicApi.getCollection(username, slug);
        if (r.error)
            setNotFound(true);
        else
            setData(r.data);
        setLoading(false);
    }
    if (loading) {
        return (_jsx("div", { className: "min-h-screen bg-surface-0 flex items-center justify-center", children: _jsx("div", { className: "w-6 h-6 border-2 border-brand border-t-transparent\n                        rounded-full animate-spin" }) }));
    }
    if (notFound || !data) {
        return (_jsxs("div", { className: "min-h-screen bg-surface-0 flex flex-col items-center\n                      justify-center text-center p-6", children: [_jsx("p", { className: "text-4xl mb-4", children: "\uD83D\uDD12" }), _jsx("h1", { className: "text-lg font-semibold text-ink-1 mb-2", children: "Collection not found" }), _jsx("p", { className: "text-sm text-ink-3 mb-6", children: "This collection doesn't exist or isn't public" }), _jsx("a", { href: "/", className: "text-sm text-brand-bright hover:underline", children: "\u2190 Go to Memex" })] }));
    }
    const { author, collection, bookmarks } = data;
    return (_jsxs("div", { className: "min-h-screen bg-surface-0", children: [_jsxs("nav", { className: "border-b border-surface-4 px-6 py-3 flex items-center\n                      justify-between max-w-5xl mx-auto", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("div", { className: "w-7 h-7 bg-brand rounded-lg flex items-center justify-center\n                          text-white font-bold text-xs", children: "M" }), _jsxs("div", { className: "text-xs text-ink-3", children: [_jsx("span", { className: "text-ink-1 font-medium", children: author.name || author.username }), _jsx("span", { className: "text-ink-5 mx-1", children: "/" }), _jsx("span", { children: "Collections" })] })] }), _jsx("a", { href: "/", className: "text-xs px-3 py-1.5 bg-brand text-white rounded-lg\n                      hover:bg-brand/90 transition-colors", children: "Get Memex free" })] }), _jsxs("main", { className: "max-w-5xl mx-auto px-6 py-10", children: [_jsxs("div", { className: "flex items-center gap-4 mb-8 pb-8 border-b border-surface-4", children: [_jsx("div", { className: "w-16 h-16 rounded-2xl flex items-center justify-center\n                       text-3xl border flex-shrink-0", style: {
                                    background: collection.color + '15',
                                    borderColor: collection.color + '30',
                                }, children: collection.icon }), _jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-bold text-ink-1 mb-1", children: collection.name }), collection.description && (_jsx("p", { className: "text-sm text-ink-3", children: collection.description })), _jsxs("p", { className: "text-xs text-ink-4 mt-1", children: [bookmarks.length, " bookmarks \u00B7 curated by ", author.name || author.username] })] })] }), bookmarks.length === 0 ? (_jsx("div", { className: "text-center py-16", children: _jsx("p", { className: "text-sm text-ink-3", children: "No bookmarks in this collection yet" }) })) : (_jsx("div", { className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4", children: bookmarks.map((b) => {
                            let domain = '';
                            try {
                                domain = new URL(b.url).hostname.replace('www.', '');
                            }
                            catch { }
                            return (_jsxs("a", { href: b.url, target: "_blank", rel: "noopener noreferrer", className: "group flex flex-col bg-surface-2 border border-surface-4\n                             rounded-2xl overflow-hidden hover:border-brand/30\n                             hover:shadow-lg hover:shadow-black/20 transition-all\n                             hover:-translate-y-0.5", children: [b.ogImageUrl && (_jsx("div", { className: "aspect-video overflow-hidden bg-surface-3", children: _jsx("img", { src: b.ogImageUrl, alt: "", className: "w-full h-full object-cover group-hover:scale-105\n                                      transition-transform duration-300", onError: e => (e.currentTarget.parentElement.style.display = 'none') }) })), _jsxs("div", { className: "p-4 flex-1 flex flex-col", children: [_jsxs("div", { className: "flex items-center gap-2 mb-2", children: [b.faviconUrl && (_jsx("img", { src: b.faviconUrl, alt: "", className: "w-4 h-4 flex-shrink-0", onError: e => (e.currentTarget.style.display = 'none') })), _jsx("span", { className: "text-[10px] text-ink-4 truncate", children: domain })] }), _jsx("p", { className: "text-sm font-semibold text-ink-1 leading-snug mb-2\n                                  group-hover:text-brand-bright transition-colors line-clamp-2", children: b.title || domain }), b.description && (_jsx("p", { className: "text-[11px] text-ink-3 leading-relaxed line-clamp-2\n                                    flex-1", children: b.description })), b.tags.length > 0 && (_jsx("div", { className: "flex flex-wrap gap-1 mt-3", children: b.tags.slice(0, 3).map((tag) => (_jsxs("span", { className: "text-[9px] px-2 py-0.5 bg-brand/10\n                                           text-brand-bright rounded-full", children: ["#", tag.name] }, tag.id))) }))] })] }, b.id));
                        }) })), _jsxs("div", { className: "border-t border-surface-4 mt-12 pt-8 flex flex-col\n                        items-center text-center gap-3", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("div", { className: "w-8 h-8 bg-brand rounded-lg flex items-center justify-center\n                            text-white font-bold text-sm", children: "M" }), _jsx("span", { className: "font-semibold text-ink-1", children: "Memex" })] }), _jsx("p", { className: "text-sm text-ink-3 max-w-xs", children: "Save, organize and share your bookmarks with Memex. Build your personal knowledge base." }), _jsx("a", { href: "/", className: "px-6 py-2.5 bg-brand text-white text-sm font-medium\n                        rounded-xl hover:bg-brand/90 transition-colors", children: "Start for free" })] })] })] }));
}
