import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { publicApi } from '../lib/api';
export function PublicTopicPage() {
    const { username, slug } = useParams();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);
    useEffect(() => {
        if (username && slug)
            fetchTopic();
    }, [username, slug]);
    async function fetchTopic() {
        setLoading(true);
        const r = await publicApi.getTopic(username, slug);
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
        return (_jsxs("div", { className: "min-h-screen bg-surface-0 flex flex-col items-center\n                      justify-center text-center p-6", children: [_jsx("p", { className: "text-4xl mb-4", children: "\uD83D\uDD12" }), _jsx("h1", { className: "text-lg font-semibold text-ink-1 mb-2", children: "Topic not found" }), _jsx("p", { className: "text-sm text-ink-3 mb-6", children: "This topic doesn't exist or isn't public" }), _jsx("a", { href: "/", className: "text-sm text-brand-bright hover:underline", children: "\u2190 Go to Memex" })] }));
    }
    const { author, topic } = data;
    return (_jsxs("div", { className: "min-h-screen bg-surface-0", children: [_jsxs("nav", { className: "border-b border-surface-4 px-6 py-3 flex items-center\n                      justify-between max-w-4xl mx-auto", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("div", { className: "w-7 h-7 bg-brand rounded-lg flex items-center justify-center\n                          text-white font-bold text-xs", children: "M" }), _jsxs("div", { className: "text-xs text-ink-3", children: [_jsx("span", { className: "text-ink-1 font-medium", children: author.name || author.username }), _jsx("span", { className: "text-ink-5 mx-1", children: "/" }), _jsx("span", { children: "Wiki" })] })] }), _jsx("a", { href: "/", className: "text-xs px-3 py-1.5 bg-brand text-white rounded-lg\n                      hover:bg-brand/90 transition-colors", children: "Get Memex free" })] }), _jsxs("main", { className: "max-w-3xl mx-auto px-6 py-10", children: [_jsx("div", { className: "h-1 rounded-full mb-8 max-w-xs", style: { background: topic.coverColor } }), _jsxs("div", { className: "flex items-start gap-4 mb-8", children: [_jsx("span", { className: "text-5xl leading-none mt-1", children: topic.emoji }), _jsxs("div", { children: [_jsx("h1", { className: "text-3xl font-bold text-ink-1 leading-tight mb-2", children: topic.title }), topic.summary && (_jsx("p", { className: "text-sm text-ink-3 leading-relaxed max-w-2xl", children: topic.summary })), _jsxs("p", { className: "text-[11px] text-ink-5 mt-2", children: ["by ", author.name || author.username, " \u00B7", ' ', new Date(topic.updatedAt).toLocaleDateString('en-US', {
                                                month: 'long', day: 'numeric', year: 'numeric'
                                            })] })] })] }), _jsx("div", { className: "flex flex-col gap-1 mb-12", children: topic.blocks.map((block) => (_jsx(PublicBlock, { block: block }, block.id))) }), topic.references.length > 0 && (_jsxs("div", { className: "mb-10", children: [_jsxs("h2", { className: "text-xs font-semibold text-ink-4 uppercase tracking-wider mb-4", children: ["References (", topic.references.length, ")"] }), _jsx("div", { className: "flex flex-col gap-2", children: topic.references.map((ref) => (_jsxs("a", { href: ref.bookmark.url, target: "_blank", rel: "noopener noreferrer", className: "flex items-center gap-3 p-3 bg-surface-2 border\n                              border-surface-4 rounded-xl hover:border-brand/30\n                              hover:bg-surface-3 transition-all group", children: [ref.bookmark.faviconUrl && (_jsx("img", { src: ref.bookmark.faviconUrl, alt: "", className: "w-5 h-5 flex-shrink-0", onError: e => (e.currentTarget.style.display = 'none') })), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("p", { className: "text-sm font-medium text-ink-1 truncate\n                                  group-hover:text-brand-bright transition-colors", children: ref.bookmark.title || ref.bookmark.url }), _jsx("p", { className: "text-[10px] text-ink-4 truncate", children: ref.bookmark.url })] }), _jsxs("svg", { className: "w-3.5 h-3.5 text-ink-5 group-hover:text-ink-3\n                                  flex-shrink-0 transition-colors", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2, children: [_jsx("path", { d: "M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" }), _jsx("polyline", { points: "15 3 21 3 21 9" }), _jsx("line", { x1: "10", y1: "14", x2: "21", y2: "3" })] })] }, ref.bookmarkId))) })] })), topic.connections.length > 0 && (_jsxs("div", { className: "mb-10", children: [_jsx("h2", { className: "text-xs font-semibold text-ink-4 uppercase tracking-wider mb-4", children: "Connected topics" }), _jsx("div", { className: "flex flex-wrap gap-2", children: topic.connections.map((conn) => (_jsxs("a", { href: `/p/${username}/topic/${conn.slug}`, className: "flex items-center gap-2 px-3 py-2 bg-surface-2\n                              border border-surface-4 rounded-xl text-sm\n                              hover:border-brand/30 hover:bg-surface-3 transition-all", children: [_jsx("span", { children: conn.emoji }), _jsx("span", { className: "text-ink-2 font-medium", children: conn.title })] }, conn.topicId))) })] })), _jsxs("div", { className: "border-t border-surface-4 pt-8 flex flex-col items-center\n                        text-center gap-3", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("div", { className: "w-8 h-8 bg-brand rounded-lg flex items-center justify-center\n                            text-white font-bold text-sm", children: "M" }), _jsx("span", { className: "font-semibold text-ink-1", children: "Memex" })] }), _jsx("p", { className: "text-sm text-ink-3 max-w-xs", children: "Build your own visual knowledge wiki. Save anything from the web, connect your ideas, share your knowledge." }), _jsx("a", { href: "/", className: "px-6 py-2.5 bg-brand text-white text-sm font-medium\n                        rounded-xl hover:bg-brand/90 transition-colors", children: "Start building your wiki \u2014 it's free" })] })] })] }));
}
// ─────────────────────────────────────────────
// Read-only block renderer
// ─────────────────────────────────────────────
function PublicBlock({ block }) {
    if (block.type === 'divider') {
        return _jsx("hr", { className: "border-surface-4 my-4" });
    }
    const content = block.content || '';
    if (!content && block.type !== 'divider')
        return null;
    const classes = {
        heading1: 'text-2xl font-bold text-ink-1 mt-8 mb-2',
        heading2: 'text-xl font-semibold text-ink-1 mt-6 mb-2',
        heading3: 'text-base font-semibold text-ink-2 mt-4 mb-1',
        paragraph: 'text-sm text-ink-1 leading-relaxed',
        bullet: 'text-sm text-ink-1 leading-relaxed flex gap-2',
        code: 'text-xs text-green-400 font-mono bg-surface-3 rounded-xl px-4 py-3 my-2',
        quote: 'text-sm text-ink-2 italic border-l-2 pl-4 py-1 my-2',
    };
    const cls = classes[block.type] ?? 'text-sm text-ink-1';
    // Quote gets special border color
    const style = block.type === 'quote' ? { borderColor: '#4f6ef760' } : {};
    return (_jsxs("div", { className: cls, style: style, children: [block.type === 'bullet' && (_jsx("span", { className: "text-ink-4 flex-shrink-0 mt-0.5", children: "\u2022" })), _jsx("span", { children: content })] }));
}
