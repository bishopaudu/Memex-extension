import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { API_BASE } from '../lib/config';
import { useParams } from 'react-router-dom';
import { FormattedText } from '../lib/textFormat';
export function PublicBookmarkPage() {
    const { slug } = useParams();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);
    useEffect(() => { if (slug)
        fetchBookmark(); }, [slug]);
    async function fetchBookmark() {
        setLoading(true);
        try {
            const r = await fetch(`${API_BASE}/p/b/${slug}`);
            const json = await r.json();
            if (json.error)
                setNotFound(true);
            else
                setData(json.data);
        }
        catch {
            setNotFound(true);
        }
        setLoading(false);
    }
    if (loading) {
        return (_jsx("div", { className: "min-h-screen bg-surface-0 flex items-center justify-center", children: _jsx("div", { className: "w-6 h-6 border-2 border-brand border-t-transparent\n                        rounded-full animate-spin" }) }));
    }
    if (notFound || !data) {
        return (_jsxs("div", { className: "min-h-screen bg-surface-0 flex flex-col items-center\n                      justify-center text-center p-6", children: [_jsx("p", { className: "text-4xl mb-4", children: "\uD83D\uDD12" }), _jsx("h1", { className: "text-lg font-semibold text-ink-1 mb-2", children: "Bookmark not found" }), _jsx("p", { className: "text-sm text-ink-3 mb-6", children: "This bookmark doesn't exist or isn't public" }), _jsx("a", { href: "/", className: "text-sm text-brand-bright hover:underline", children: "\u2190 Go to Memex" })] }));
    }
    const { author, bookmark } = data;
    let domain = '';
    try {
        domain = new URL(bookmark.url).hostname.replace('www.', '');
    }
    catch { }
    const screenshots = bookmark.attachments.filter((a) => a.type === 'screenshot' || a.type === 'area_screenshot');
    const heroImage = bookmark.screenshotUrl ?? bookmark.ogImageUrl;
    return (_jsxs("div", { className: "min-h-screen bg-surface-0", children: [_jsxs("nav", { className: "border-b border-surface-4 px-6 py-3 flex items-center\n                      justify-between max-w-4xl mx-auto", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("div", { className: "w-7 h-7 bg-brand rounded-lg flex items-center\n                          justify-center text-white font-bold text-xs", children: "M" }), _jsxs("div", { className: "text-xs text-ink-3", children: [_jsx("a", { href: `/p/${author.username}`, className: "text-ink-1 font-medium hover:text-brand-bright\n                          transition-colors", children: author.name || author.username }), _jsx("span", { className: "text-ink-5 mx-1", children: "/" }), _jsx("span", { children: "Bookmarks" })] })] }), _jsx("a", { href: "/", className: "text-xs px-3 py-1.5 bg-brand text-white rounded-lg\n                      hover:bg-brand/90 transition-colors", children: "Get Memex free" })] }), _jsxs("main", { className: "max-w-3xl mx-auto px-6 py-10", children: [heroImage && (_jsxs("div", { className: "relative w-full bg-surface-3 rounded-2xl overflow-hidden\n                          mb-8 border border-surface-4", style: { maxHeight: 400 }, children: [_jsx("div", { className: "absolute inset-0", style: {
                                    backgroundImage: `url(${heroImage})`,
                                    backgroundSize: 'cover',
                                    backgroundPosition: 'center',
                                    filter: 'blur(20px) brightness(0.4)',
                                    transform: 'scale(1.1)',
                                } }), _jsx("div", { className: "relative flex items-center justify-center p-6", children: _jsx("img", { src: heroImage, alt: "", className: "max-h-80 max-w-full object-contain rounded-xl\n                              shadow-2xl" }) })] })), _jsxs("div", { className: "mb-8", children: [_jsxs("div", { className: "flex items-center gap-2 mb-3", children: [bookmark.faviconUrl && (_jsx("img", { src: bookmark.faviconUrl, alt: "", className: "w-5 h-5", onError: e => (e.currentTarget.style.display = 'none') })), _jsx("span", { className: "text-xs text-ink-4", children: domain }), _jsx("span", { className: "text-ink-5", children: "\u00B7" }), _jsx("span", { className: "text-xs text-ink-4", children: new Date(bookmark.createdAt).toLocaleDateString('en-US', {
                                            month: 'long', day: 'numeric', year: 'numeric'
                                        }) })] }), _jsx("h1", { className: "text-2xl font-bold text-ink-1 leading-snug mb-3", children: bookmark.title || domain }), bookmark.description && (_jsx("p", { className: "text-sm text-ink-3 leading-relaxed mb-4", children: bookmark.description })), _jsxs("a", { href: bookmark.url, target: "_blank", rel: "noopener noreferrer", className: "inline-flex items-center gap-2 px-4 py-2 bg-brand\n                        text-white text-sm font-medium rounded-xl\n                        hover:bg-brand/90 transition-colors", children: [_jsxs("svg", { className: "w-3.5 h-3.5", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2, children: [_jsx("path", { d: "M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" }), _jsx("polyline", { points: "15 3 21 3 21 9" }), _jsx("line", { x1: "10", y1: "14", x2: "21", y2: "3" })] }), "Visit ", domain] }), bookmark.tags.length > 0 && (_jsx("div", { className: "flex flex-wrap gap-2 mt-4", children: bookmark.tags.map((tag) => (_jsxs("span", { className: "px-2.5 py-1 bg-brand/10 text-brand-bright\n                                 text-xs rounded-full border border-brand/20", children: ["#", tag.name] }, tag.id))) }))] }), screenshots.length > 0 && (_jsxs("div", { className: "mb-8", children: [_jsxs("h2", { className: "text-xs font-semibold text-ink-4 uppercase\n                           tracking-wider mb-4", children: ["Screenshots (", screenshots.length, ")"] }), _jsx("div", { className: "flex flex-col gap-4", children: screenshots.map((att) => (att.url && (_jsx("div", { className: "rounded-xl overflow-hidden border border-surface-4\n                                  bg-surface-2", children: _jsx("img", { src: att.url, alt: "", className: "w-full object-contain" }) }, att.id)))) })] })), bookmark.notes.length > 0 && (_jsxs("div", { className: "mb-8", children: [_jsxs("h2", { className: "text-xs font-semibold text-ink-4 uppercase\n                           tracking-wider mb-4", children: ["Notes (", bookmark.notes.length, ")"] }), _jsx("div", { className: "flex flex-col gap-3", children: bookmark.notes.map((note) => (_jsxs("div", { className: "bg-surface-2 border border-surface-4\n                                rounded-xl overflow-hidden", children: [_jsx("div", { className: "w-full h-0.5 bg-brand/40" }), _jsx("div", { className: "px-4 py-3", children: _jsx(FormattedText, { text: note.content ?? '' }) })] }, note.id))) })] })), _jsxs("div", { className: "border-t border-surface-4 pt-6 flex items-center\n                        justify-between", children: [_jsxs("div", { className: "flex items-center gap-2 text-xs text-ink-4", children: [_jsx("span", { children: "Saved by" }), _jsx("a", { href: `/p/${author.username}`, className: "font-medium text-ink-2 hover:text-brand-bright\n                          transition-colors", children: author.name || author.username })] }), _jsx("a", { href: "/", className: "text-xs text-brand-bright hover:underline", children: "Save your own with Memex \u2192" })] })] })] }));
}
