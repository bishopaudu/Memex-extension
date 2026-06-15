import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { bookmarksApi, attachmentsApi } from '../lib/api';
import { FormattedText } from '../lib/textFormat';
export function BookmarkDetailPage({ bookmarkId, onBack, onDelete, onTagClick }) {
    const [bookmark, setBookmark] = useState(null);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState('overview');
    const [lightbox, setLightbox] = useState(null);
    const [copied, setCopied] = useState(false);
    const [sharing, setSharing] = useState(false);
    const [shareUrl, setShareUrl] = useState(null);
    const [sharecopied, setShareCopied] = useState(false);
    const [editing, setEditing] = useState(false);
    const [editTitle, setEditTitle] = useState('');
    const [editDesc, setEditDesc] = useState('');
    const [editTags, setEditTags] = useState([]);
    const [editSaving, setEditSaving] = useState(false);
    const [showExport, setShowExport] = useState(false);
    useEffect(() => { fetchBookmark(); }, [bookmarkId]);
    useEffect(() => {
        const onKey = (e) => {
            if (e.key === 'Escape') {
                if (lightbox)
                    setLightbox(null);
                else
                    onBack();
            }
        };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [lightbox, onBack]);
    async function fetchBookmark() {
        setLoading(true);
        const r = await bookmarksApi.getOne(bookmarkId);
        if (!r.error)
            setBookmark(r.data.bookmark);
        setLoading(false);
    }
    function startEditing() {
        if (!bookmark)
            return;
        setEditTitle(bookmark.title ?? '');
        setEditDesc(bookmark.description ?? '');
        setEditTags(bookmark.tags.map(t => t.name));
        setEditing(true);
    }
    async function handleSaveEdit() {
        if (!bookmark)
            return;
        setEditSaving(true);
        const r = await bookmarksApi.update(bookmark.id, {
            title: editTitle,
            description: editDesc,
            tags: editTags,
        });
        if (!r.error) {
            setBookmark(prev => prev ? {
                ...prev,
                title: editTitle,
                description: editDesc,
                tags: editTags.map(name => ({ id: name, name })),
            } : prev);
            setEditing(false);
        }
        setEditSaving(false);
    }
    function exportAsMarkdown() {
        if (!bookmark)
            return;
        const lines = [
            `# ${bookmark.title ?? bookmark.url}`,
            ``,
            `**URL:** ${bookmark.url}`,
            bookmark.description ? `
**Description:** ${bookmark.description}` : '',
            bookmark.tags.length > 0
                ? `
**Tags:** ${bookmark.tags.map(t => `#${t.name}`).join(' ')}`
                : '',
            `
**Saved:** ${new Date(bookmark.createdAt).toLocaleDateString()}`,
        ];
        // Add notes
        const notes = (bookmark.attachments ?? []).filter(a => a.type === 'text');
        if (notes.length > 0) {
            lines.push('## notes');
            notes.forEach(n => lines.push(`
${n.content}`));
        }
        const md = lines.filter(Boolean).join('');
        const blob = new Blob([md], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${(bookmark.title ?? 'bookmark').slice(0, 40).replace(/[^a-z0-9]/gi, '-')}.md`;
        a.click();
        URL.revokeObjectURL(url);
    }
    function copyAsRichText() {
        if (!bookmark)
            return;
        const text = `${bookmark.title ?? bookmark.url}
${bookmark.url}`;
        navigator.clipboard.writeText(text);
    }
    async function handleTogglePublic() {
        if (!bookmark)
            return;
        setSharing(true);
        const r = await bookmarksApi.update(bookmark.id, { isPublic: !bookmark.isPublic });
        if (!r.error) {
            const newIsPublic = !bookmark.isPublic;
            setBookmark(prev => prev ? { ...prev, isPublic: newIsPublic } : prev);
            if (newIsPublic) {
                const slug = r.data?.publicSlug;
                if (slug) {
                    setShareUrl(`${window.location.origin}/p/b/${slug}`);
                    setBookmark(prev => prev ? { ...prev, publicSlug: slug } : prev);
                }
            }
            else {
                setShareUrl(null);
            }
        }
        setSharing(false);
    }
    if (loading) {
        return (_jsx("div", { className: "flex-1 flex items-center justify-center bg-surface-1", children: _jsx("div", { className: "w-6 h-6 border-2 border-brand border-t-transparent\n                        rounded-full animate-spin" }) }));
    }
    if (!bookmark) {
        return (_jsx("div", { className: "flex-1 flex items-center justify-center bg-surface-1", children: _jsxs("div", { className: "text-center", children: [_jsx("p", { className: "text-sm text-ink-2 mb-2", children: "Bookmark not found" }), _jsx("button", { onClick: onBack, className: "text-xs text-brand-bright hover:underline", children: "\u2190 Back" })] }) }));
    }
    // Categorise attachments
    const atts = bookmark.attachments ?? [];
    const screenshots = atts.filter(a => a.type === 'screenshot' || a.type === 'area_screenshot');
    const textNotes = atts.filter(a => a.type === 'text' && !isExtraction(a.content));
    const extracted = atts.filter(a => a.type === 'text' && isExtraction(a.content));
    const imgExtract = extracted.filter(a => a.content?.startsWith('🖼️'));
    const linkExtract = extracted.filter(a => a.content?.startsWith('🔗'));
    const textExtract = extracted.filter(a => a.content?.startsWith('📝'));
    // Parse extracted images
    const extractedImages = parseImages(imgExtract);
    const extractedLinks = parseLinks(linkExtract);
    // Hero image
    const heroImage = bookmark.screenshotUrl ?? bookmark.ogImageUrl;
    let domain = '';
    try {
        domain = new URL(bookmark.url).hostname.replace('www.', '');
    }
    catch { }
    function formatDate(d) {
        return new Date(d).toLocaleDateString('en-US', {
            year: 'numeric', month: 'long', day: 'numeric'
        });
    }
    async function copyUrl() {
        await navigator.clipboard.writeText(bookmark.url).catch(() => { });
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }
    /* const tabs: { key: Tab; label: string; count: number }[] = [
       { key: 'overview',    label: 'Overview',    count: 0 },
       { key: 'screenshots', label: 'Screenshots', count: screenshots.length },
       { key: 'images',      label: 'Images',      count: extractedImages.length },
       { key: 'notes',       label: 'Notes',       count: textNotes.length + textExtract.length },
       { key: 'links',       label: 'Links',       count: extractedLinks.length },
     ].filter(t => t.key === 'overview' || t.count > 0)*/
    const allTabs = [
        { key: 'overview', label: 'Overview', count: 0 },
        { key: 'screenshots', label: 'Screenshots', count: screenshots.length },
        { key: 'images', label: 'Images', count: extractedImages.length },
        { key: 'notes', label: 'Notes', count: textNotes.length + textExtract.length },
        { key: 'links', label: 'Links', count: extractedLinks.length },
    ];
    const tabs = allTabs.filter(t => t.key === 'overview' || t.count > 0);
    return (_jsxs("div", { className: "flex-1 flex flex-col overflow-hidden bg-surface-1", children: [_jsxs("header", { className: "h-12 border-b border-surface-4 flex items-center\n                         gap-3 px-5 flex-shrink-0", children: [_jsxs("button", { onClick: onBack, className: "flex items-center gap-1.5 text-xs text-ink-3\n                     hover:text-ink-1 transition-colors", children: [_jsx("svg", { className: "w-3.5 h-3.5", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2, children: _jsx("polyline", { points: "15 18 9 12 15 6" }) }), "Back"] }), _jsx("span", { className: "text-ink-5 text-xs", children: "/" }), _jsxs("div", { className: "flex items-center gap-2 min-w-0 flex-1", children: [bookmark.faviconUrl && (_jsx("img", { src: bookmark.faviconUrl, alt: "", className: "w-4 h-4 flex-shrink-0", onError: e => (e.currentTarget.style.display = 'none') })), _jsx("span", { className: "text-xs font-medium text-ink-1 truncate", children: bookmark.title ?? domain })] }), _jsxs("div", { className: "flex items-center gap-2 flex-shrink-0", children: [_jsxs("a", { href: bookmark.url, target: "_blank", rel: "noopener noreferrer", className: "flex items-center gap-1.5 px-3 py-1.5 bg-brand text-white\n                        text-xs font-medium rounded-lg hover:bg-brand/90 transition-colors", children: [_jsxs("svg", { className: "w-3 h-3", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2, children: [_jsx("path", { d: "M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" }), _jsx("polyline", { points: "15 3 21 3 21 9" }), _jsx("line", { x1: "10", y1: "14", x2: "21", y2: "3" })] }), "Open"] }), _jsx("button", { onClick: copyUrl, className: "flex items-center gap-1.5 px-3 py-1.5 bg-surface-3\n                       border border-surface-4 text-xs text-ink-2 rounded-lg\n                       hover:bg-surface-4 transition-colors", children: copied ? (_jsx("span", { className: "text-green-400", children: "Copied!" })) : (_jsxs(_Fragment, { children: [_jsxs("svg", { className: "w-3 h-3", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2, children: [_jsx("rect", { x: "9", y: "9", width: "13", height: "13", rx: "2", ry: "2" }), _jsx("path", { d: "M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" })] }), "Copy URL"] })) }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("button", { onClick: handleTogglePublic, disabled: sharing, className: `relative w-8 h-4 rounded-full transition-colors flex-shrink-0
                          ${bookmark.isPublic ? 'bg-green-500' : 'bg-surface-5'}
                          ${sharing ? 'opacity-50' : 'cursor-pointer'}`, title: bookmark.isPublic ? 'Make private' : 'Make public', children: _jsx("div", { className: `absolute top-0.5 w-3 h-3 rounded-full bg-white
                               transition-transform shadow-sm
                               ${bookmark.isPublic ? 'translate-x-4' : 'translate-x-0.5'}` }) }), _jsx("span", { className: "text-[10px] text-ink-4 hidden sm:block", children: bookmark.isPublic ? 'Public' : 'Private' }), bookmark.isPublic && shareUrl && (_jsx("button", { onClick: async () => {
                                            await navigator.clipboard.writeText(shareUrl);
                                            setShareCopied(true);
                                            setTimeout(() => setShareCopied(false), 2000);
                                        }, className: "flex items-center gap-1 px-2 py-1 text-[10px]\n                           bg-brand/10 text-brand-bright rounded-lg\n                           hover:bg-brand/20 transition-colors", children: sharecopied ? '✓ Copied' : '🔗 Share' })), bookmark.isPublic && !shareUrl && bookmark.publicSlug && (_jsx("button", { onClick: () => setShareUrl(`${window.location.origin}/p/b/${bookmark.publicSlug}`), className: "text-[10px] text-brand-bright hover:underline", children: "Get link" }))] }), _jsxs("button", { onClick: startEditing, className: "flex items-center gap-1.5 px-3 py-1.5 bg-surface-3\n                       border border-surface-4 text-xs text-ink-2 rounded-lg\n                       hover:bg-surface-4 transition-colors", children: [_jsxs("svg", { className: "w-3 h-3", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2, children: [_jsx("path", { d: "M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" }), _jsx("path", { d: "M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" })] }), "Edit"] }), _jsxs("div", { className: "relative", children: [_jsxs("button", { onClick: () => setShowExport(!showExport), className: "flex items-center gap-1.5 px-3 py-1.5 bg-surface-3\n                         border border-surface-4 text-xs text-ink-2 rounded-lg\n                         hover:bg-surface-4 transition-colors", children: [_jsxs("svg", { className: "w-3 h-3", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2, children: [_jsx("path", { d: "M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" }), _jsx("polyline", { points: "7 10 12 15 17 10" }), _jsx("line", { x1: "12", y1: "15", x2: "12", y2: "3" })] }), "Export"] }), showExport && (_jsxs("div", { className: "absolute right-0 top-full mt-1 w-44 bg-surface-2\n                             border border-surface-4 rounded-xl overflow-hidden\n                             shadow-xl z-20", children: [_jsxs("button", { onClick: () => { exportAsMarkdown(); setShowExport(false); }, className: "w-full flex items-center gap-2 px-3 py-2.5 text-xs\n                             text-ink-2 hover:bg-surface-3 transition-colors text-left", children: [_jsx("span", { children: "\uD83D\uDCDD" }), " Export as Markdown"] }), _jsxs("button", { onClick: () => { copyAsRichText(); setShowExport(false); }, className: "w-full flex items-center gap-2 px-3 py-2.5 text-xs\n                             text-ink-2 hover:bg-surface-3 transition-colors text-left\n                             border-t border-surface-4", children: [_jsx("span", { children: "\uD83D\uDCCB" }), " Copy title + URL"] }), _jsxs("a", { href: bookmark.url, target: "_blank", rel: "noopener noreferrer", className: "flex items-center gap-2 px-3 py-2.5 text-xs\n                             text-ink-2 hover:bg-surface-3 transition-colors\n                             border-t border-surface-4", onClick: () => setShowExport(false), children: [_jsx("span", { children: "\uD83C\uDF10" }), " Open original"] })] }))] }), _jsx("button", { onClick: () => { onDelete(bookmark.id); onBack(); }, className: "w-8 h-8 flex items-center justify-center rounded-lg\n                       text-ink-4 hover:text-red-400 hover:bg-red-400/10\n                       transition-colors", children: _jsxs("svg", { className: "w-3.5 h-3.5", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2, children: [_jsx("polyline", { points: "3 6 5 6 21 6" }), _jsx("path", { d: "M19 6l-1 14H6L5 6" })] }) })] })] }), _jsxs("div", { className: "flex-1 overflow-y-auto", children: [_jsx("div", { className: "relative w-full bg-surface-3 overflow-hidden", style: { height: heroImage ? 280 : 0 }, children: heroImage && (_jsxs(_Fragment, { children: [_jsx("div", { className: "absolute inset-0", style: {
                                        backgroundImage: `url(${heroImage})`,
                                        backgroundSize: 'cover',
                                        backgroundPosition: 'center',
                                        filter: 'blur(20px) brightness(0.4)',
                                        transform: 'scale(1.1)',
                                    } }), _jsx("div", { className: "absolute inset-0 flex items-center justify-center p-4", children: _jsx("img", { src: heroImage, alt: "", className: "max-h-full max-w-full object-contain rounded-xl\n                             shadow-2xl cursor-zoom-in", onClick: () => setLightbox(heroImage) }) }), _jsx("div", { className: "absolute bottom-0 left-0 right-0 h-20", style: { background: 'linear-gradient(transparent, var(--s1))' } })] })) }), _jsx("div", { className: "px-8 py-6 border-b border-surface-4", children: _jsxs("div", { className: "max-w-3xl", children: [_jsxs("div", { className: "flex items-center gap-2 mb-2 text-xs text-ink-4", children: [bookmark.faviconUrl && (_jsx("img", { src: bookmark.faviconUrl, alt: "", className: "w-4 h-4", onError: e => (e.currentTarget.style.display = 'none') })), _jsx("span", { children: domain }), _jsx("span", { className: "text-ink-5", children: "\u00B7" }), _jsx("span", { children: formatDate(bookmark.createdAt) })] }), _jsx("h1", { className: "text-xl font-bold text-ink-1 leading-snug mb-3", children: bookmark.title ?? domain }), bookmark.description && (_jsx("p", { className: "text-sm text-ink-3 leading-relaxed mb-4 max-w-2xl", children: bookmark.description })), bookmark.tags.length > 0 && (_jsx("div", { className: "flex flex-wrap gap-2", children: bookmark.tags.map(tag => (_jsxs("button", { onClick: () => { onTagClick(tag.name); onBack(); }, className: "px-2.5 py-1 bg-brand/10 text-brand-bright text-xs\n                               rounded-full hover:bg-brand/20 transition-colors\n                               border border-brand/20", children: ["#", tag.name] }, tag.id))) }))] }) }), tabs.length > 1 && (_jsx("div", { className: "flex border-b border-surface-4 px-8", children: tabs.map(t => (_jsxs("button", { onClick: () => setTab(t.key), className: `flex items-center gap-2 px-4 py-3 text-xs font-medium
                            relative transition-colors
                            ${tab === t.key
                                ? 'text-brand-bright'
                                : 'text-ink-3 hover:text-ink-2'}`, children: [t.label, t.count > 0 && (_jsx("span", { className: `text-[9px] px-1.5 py-0.5 rounded-full
                                    ${tab === t.key
                                        ? 'bg-brand/20 text-brand-bright'
                                        : 'bg-surface-4 text-ink-4'}`, children: t.count })), tab === t.key && (_jsx("div", { className: "absolute bottom-0 left-0 right-0 h-0.5 bg-brand" }))] }, t.key))) })), _jsxs("div", { className: "px-8 py-6", children: [tab === 'overview' && (_jsxs("div", { className: "max-w-3xl space-y-6", children: [atts.length > 0 && (_jsxs("div", { children: [_jsxs("h3", { className: "text-xs font-semibold text-ink-3 uppercase\n                                 tracking-wider mb-3", children: ["Attachments (", atts.length, ")"] }), _jsxs("div", { className: "grid grid-cols-2 sm:grid-cols-3 gap-3", children: [screenshots.map(att => (_jsxs("div", { onClick: () => att.url && setLightbox(att.url), className: "group relative aspect-video bg-surface-3\n                                   rounded-xl overflow-hidden border border-surface-4\n                                   cursor-zoom-in hover:border-brand/30 transition-colors", children: [att.url && (_jsx("img", { src: att.url, alt: "", className: "w-full h-full object-cover\n                                          group-hover:scale-105 transition-transform" })), _jsx("div", { className: "absolute inset-0 bg-black/0\n                                        group-hover:bg-black/20 transition-colors\n                                        flex items-center justify-center", children: _jsxs("svg", { className: "w-5 h-5 text-white opacity-0\n                                          group-hover:opacity-100 transition-opacity", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2, children: [_jsx("circle", { cx: "11", cy: "11", r: "8" }), _jsx("line", { x1: "21", y1: "21", x2: "16.65", y2: "16.65" }), _jsx("line", { x1: "11", y1: "8", x2: "11", y2: "14" }), _jsx("line", { x1: "8", y1: "11", x2: "14", y2: "11" })] }) }), _jsx("span", { className: "absolute top-2 left-2 text-[9px] px-1.5 py-0.5\n                                         bg-black/60 text-white rounded-full", children: att.type === 'area_screenshot' ? '✂️ Area' : '📸 Screenshot' })] }, att.id))), textNotes.slice(0, 2).map(att => (_jsxs("div", { className: "aspect-video bg-brand/5 border border-brand/20\n                                      rounded-xl p-3 flex flex-col justify-between\n                                      cursor-pointer hover:bg-brand/10 transition-colors", onClick: () => setTab('notes'), children: [_jsx("span", { className: "text-xl", children: "\uD83D\uDCDD" }), _jsx("p", { className: "text-[10px] text-ink-3 line-clamp-3 leading-relaxed", children: att.content?.slice(0, 100) })] }, att.id))), extractedImages.length > 0 && (_jsxs("div", { className: "aspect-video bg-green-500/5 border border-green-500/20\n                                      rounded-xl p-3 flex flex-col items-center justify-center\n                                      gap-2 cursor-pointer hover:bg-green-500/10 transition-colors", onClick: () => setTab('images'), children: [_jsx("span", { className: "text-2xl", children: "\uD83D\uDDBC\uFE0F" }), _jsxs("p", { className: "text-[10px] text-ink-3 text-center", children: [extractedImages.length, " images extracted"] }), _jsx("p", { className: "text-[9px] text-ink-4", children: "Click to view \u2192" })] })), extractedLinks.length > 0 && (_jsxs("div", { className: "aspect-video bg-amber-500/5 border border-amber-500/20\n                                      rounded-xl p-3 flex flex-col items-center justify-center\n                                      gap-2 cursor-pointer hover:bg-amber-500/10 transition-colors", onClick: () => setTab('links'), children: [_jsx("span", { className: "text-2xl", children: "\uD83D\uDD17" }), _jsxs("p", { className: "text-[10px] text-ink-3 text-center", children: [extractedLinks.length, " links extracted"] }), _jsx("p", { className: "text-[9px] text-ink-4", children: "Click to view \u2192" })] }))] })] })), atts.length === 0 && (_jsxs("div", { className: "flex flex-col items-center justify-center py-16 text-center\n                                border border-dashed border-surface-5 rounded-2xl", children: [_jsx("span", { className: "text-4xl mb-3", children: "\uD83D\uDCCE" }), _jsx("p", { className: "text-sm font-medium text-ink-2 mb-1", children: "No attachments" }), _jsx("p", { className: "text-xs text-ink-4 max-w-xs", children: "Use the Memex extension to add screenshots, notes, or extracted content" })] }))] })), tab === 'screenshots' && (_jsx("div", { className: "max-w-4xl", children: screenshots.length === 0 ? (_jsx(EmptyState, { emoji: "\uD83D\uDCF8", title: "No screenshots", subtitle: "Capture screenshots using the extension" })) : (_jsx("div", { className: "flex flex-col gap-6", children: screenshots.map((att, i) => (_jsxs("div", { className: "bg-surface-2 border border-surface-4 rounded-2xl\n                                    overflow-hidden", children: [_jsxs("div", { className: "flex items-center justify-between px-4 py-3\n                                      border-b border-surface-4", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "text-sm", children: att.type === 'area_screenshot' ? '✂️' : '📸' }), _jsx("span", { className: "text-xs font-medium text-ink-2", children: att.type === 'area_screenshot'
                                                                    ? 'Area selection' : 'Full screenshot' }), _jsxs("span", { className: "text-[10px] text-ink-4", children: ["#", i + 1] })] }), _jsx("div", { className: "flex items-center gap-2", children: att.url && (_jsxs(_Fragment, { children: [_jsxs("a", { href: att.url, download: `screenshot-${i + 1}.png`, className: "flex items-center gap-1.5 px-2.5 py-1 text-[10px]\n                                           text-ink-3 hover:text-ink-1 bg-surface-3\n                                           border border-surface-4 rounded-lg transition-colors", onClick: e => e.stopPropagation(), children: [_jsxs("svg", { className: "w-3 h-3", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2, children: [_jsx("path", { d: "M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" }), _jsx("polyline", { points: "7 10 12 15 17 10" }), _jsx("line", { x1: "12", y1: "15", x2: "12", y2: "3" })] }), "Download"] }), _jsxs("button", { onClick: () => setLightbox(att.url), className: "flex items-center gap-1.5 px-2.5 py-1 text-[10px]\n                                           text-ink-3 hover:text-brand-bright bg-surface-3\n                                           border border-surface-4 rounded-lg transition-colors", children: [_jsxs("svg", { className: "w-3 h-3", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2, children: [_jsx("circle", { cx: "11", cy: "11", r: "8" }), _jsx("line", { x1: "21", y1: "21", x2: "16.65", y2: "16.65" })] }), "Full size"] })] })) })] }), att.url ? (_jsxs("div", { className: "group relative cursor-zoom-in bg-surface-3", onClick: () => setLightbox(att.url), children: [_jsx("img", { src: att.url, alt: "", className: "w-full object-contain max-h-96" }), _jsx("div", { className: "absolute inset-0 bg-black/0\n                                          group-hover:bg-black/10 transition-colors\n                                          flex items-center justify-center", children: _jsx("div", { className: "bg-black/50 text-white text-xs px-3 py-1.5\n                                            rounded-full opacity-0 group-hover:opacity-100\n                                            transition-opacity backdrop-blur-sm", children: "Click to enlarge" }) })] })) : (_jsx("div", { className: "h-32 flex items-center justify-center text-ink-4 text-xs", children: "Image not available" }))] }, att.id))) })) })), tab === 'images' && (_jsx("div", { className: "max-w-4xl", children: extractedImages.length === 0 ? (_jsx(EmptyState, { emoji: "\uD83D\uDDBC\uFE0F", title: "No extracted images", subtitle: "Use the Extract button in the extension to extract images" })) : (_jsxs(_Fragment, { children: [_jsxs("p", { className: "text-xs text-ink-4 mb-4", children: [extractedImages.length, " images extracted from this page"] }), _jsx("div", { className: "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3", children: extractedImages.map((img, i) => (_jsx(ImageCard, { img: img, onLightbox: () => setLightbox(img.src) }, i))) })] })) })), tab === 'notes' && (_jsx("div", { className: "max-w-2xl space-y-3", children: textNotes.length === 0 && textExtract.length === 0 ? (_jsx(EmptyState, { emoji: "\uD83D\uDCDD", title: "No notes", subtitle: "Add text notes using the extension" })) : (_jsx(_Fragment, { children: [...textNotes, ...textExtract].map((att, i) => (_jsx(FullNoteCard, { att: att, index: i + 1 }, att.id))) })) })), tab === 'links' && (_jsx("div", { className: "max-w-3xl", children: extractedLinks.length === 0 ? (_jsx(EmptyState, { emoji: "\uD83D\uDD17", title: "No extracted links", subtitle: "Use the Extract button in the extension to extract links" })) : (_jsx(LinksView, { links: extractedLinks })) }))] })] }), editing && (_jsx("div", { className: "fixed inset-0 z-50 flex items-center justify-center p-4", style: { background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }, onClick: () => setEditing(false), children: _jsxs("div", { className: "w-full max-w-lg bg-surface-2 border border-surface-4\n                       rounded-2xl overflow-hidden shadow-2xl", onClick: e => e.stopPropagation(), children: [_jsxs("div", { className: "flex items-center justify-between px-5 py-4\n                            border-b border-surface-4", children: [_jsx("p", { className: "text-sm font-semibold text-ink-1", children: "Edit bookmark" }), _jsx("button", { onClick: () => setEditing(false), className: "text-ink-4 hover:text-ink-1 transition-colors", children: _jsxs("svg", { className: "w-4 h-4", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2, children: [_jsx("line", { x1: "18", y1: "6", x2: "6", y2: "18" }), _jsx("line", { x1: "6", y1: "6", x2: "18", y2: "18" })] }) })] }), _jsxs("div", { className: "p-5 flex flex-col gap-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-[10px] font-medium text-ink-4\n                                   uppercase tracking-wider mb-1.5", children: "Title" }), _jsx("input", { type: "text", value: editTitle, onChange: e => setEditTitle(e.target.value), className: "w-full px-3 py-2 bg-surface-3 border border-surface-4\n                             rounded-lg text-sm text-ink-1 outline-none\n                             focus:border-brand transition-colors" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-[10px] font-medium text-ink-4\n                                   uppercase tracking-wider mb-1.5", children: "Description" }), _jsx("textarea", { value: editDesc, onChange: e => setEditDesc(e.target.value), rows: 3, className: "w-full px-3 py-2 bg-surface-3 border border-surface-4\n                             rounded-lg text-sm text-ink-1 outline-none resize-none\n                             focus:border-brand transition-colors" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-[10px] font-medium text-ink-4\n                                   uppercase tracking-wider mb-1.5", children: "Tags" }), _jsxs("div", { className: "flex flex-wrap gap-1.5 p-2 bg-surface-3\n                                border border-surface-4 rounded-lg\n                                focus-within:border-brand transition-colors\n                                min-h-[38px]", children: [editTags.map(tag => (_jsxs("span", { className: "flex items-center gap-1 px-2 py-0.5\n                                     bg-brand/10 text-brand-bright text-xs\n                                     rounded-md", children: [tag, _jsx("button", { onClick: () => setEditTags(prev => prev.filter(t => t !== tag)), className: "text-brand-bright/60 hover:text-brand-bright", children: "\u00D7" })] }, tag))), _jsx("input", { type: "text", placeholder: "Add tag...", className: "flex-1 min-w-[80px] bg-transparent text-xs\n                               text-ink-1 outline-none placeholder-ink-5", onKeyDown: e => {
                                                        if (e.key === 'Enter' || e.key === ',') {
                                                            e.preventDefault();
                                                            const val = e.target.value.trim();
                                                            if (val && !editTags.includes(val)) {
                                                                setEditTags(prev => [...prev, val]);
                                                                e.target.value = '';
                                                            }
                                                        }
                                                    } })] })] }), _jsxs("div", { className: "flex gap-2 pt-1", children: [_jsx("button", { onClick: handleSaveEdit, disabled: editSaving, className: "flex-1 py-2.5 bg-brand text-white text-sm\n                             font-medium rounded-lg hover:bg-brand/90\n                             disabled:opacity-40 transition-colors", children: editSaving ? 'Saving...' : 'Save changes' }), _jsx("button", { onClick: () => setEditing(false), className: "px-4 py-2.5 text-ink-3 text-sm hover:text-ink-1\n                             hover:bg-surface-3 rounded-lg transition-colors", children: "Cancel" })] })] })] }) })), lightbox && (_jsxs("div", { className: "fixed inset-0 z-50 flex items-center justify-center p-6", style: { background: 'rgba(0,0,0,0.95)' }, onClick: () => setLightbox(null), children: [_jsx("button", { onClick: () => setLightbox(null), className: "absolute top-4 right-4 w-10 h-10 flex items-center justify-center\n                       rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors", children: _jsxs("svg", { className: "w-5 h-5", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2, children: [_jsx("line", { x1: "18", y1: "6", x2: "6", y2: "18" }), _jsx("line", { x1: "6", y1: "6", x2: "18", y2: "18" })] }) }), _jsx("a", { href: lightbox, download: true, className: "absolute top-4 right-16 w-10 h-10 flex items-center\n                       justify-center rounded-full bg-white/10 text-white\n                       hover:bg-white/20 transition-colors", onClick: e => e.stopPropagation(), title: "Download", children: _jsxs("svg", { className: "w-5 h-5", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2, children: [_jsx("path", { d: "M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" }), _jsx("polyline", { points: "7 10 12 15 17 10" }), _jsx("line", { x1: "12", y1: "15", x2: "12", y2: "3" })] }) }), _jsx("p", { className: "absolute bottom-4 text-white/30 text-xs", children: "Press Esc or click to close" }), _jsx("img", { src: lightbox, alt: "", className: "max-w-full max-h-full object-contain rounded-xl shadow-2xl", onClick: e => e.stopPropagation() })] }))] }));
}
// ─────────────────────────────────────────────
// Helpers — parse extracted content
// ─────────────────────────────────────────────
function isExtraction(content) {
    if (!content)
        return false;
    return content.startsWith('📝 Article text') ||
        content.startsWith('🖼️ Images extracted') ||
        content.startsWith('🔗 Links extracted');
}
function parseImages(atts) {
    const images = [];
    const seen = new Set();
    atts.forEach(att => {
        if (!att.content)
            return;
        const lines = att.content.split('\n');
        let currentAlt = '';
        lines.forEach(line => {
            const trimmed = line.trim();
            // Line like: "1. Image alt text"
            const numbered = trimmed.match(/^\d+\.\s+(.+)/);
            if (numbered) {
                currentAlt = numbered[1]
                    .replace(/\s*\(\d+×\d+\).*$/, '') // strip dimensions
                    .trim();
                return;
            }
            // Line that is (or contains) a URL
            const urlMatch = trimmed.match(/https?:\/\/[^\s)]+/);
            if (urlMatch) {
                let src = urlMatch[0];
                // Clean up — remove trailing dimensions like "(800×600)"
                src = src.replace(/\(\d+×\d+\)$/, '').trim();
                // Skip duplicates and non-image URLs
                if (seen.has(src))
                    return;
                if (!src.match(/\.(jpg|jpeg|png|gif|webp|avif|bmp|tiff)(\?.*)?$/i)) {
                    // Allow URLs without extension if they look like image CDNs
                    const imageHosts = ['images.', 'img.', 'cdn.', 'media.',
                        'photos.', 'cloudinary', 'imgix', 'unsplash'];
                    const isImageHost = imageHosts.some(h => src.toLowerCase().includes(h));
                    if (!isImageHost) {
                        currentAlt = '';
                        return;
                    }
                }
                // Extract dimensions if present after the URL
                const dimMatch = trimmed.match(/\((\d+)×(\d+)\)/);
                seen.add(src);
                images.push({
                    src,
                    alt: currentAlt,
                    width: dimMatch?.[1] ?? '',
                    height: dimMatch?.[2] ?? '',
                });
                currentAlt = '';
            }
        });
    });
    return images.filter(img => img.src.startsWith('http'));
}
function parseLinks(atts) {
    const links = [];
    atts.forEach(att => {
        if (!att.content)
            return;
        const lines = att.content.split('\n');
        let currentText = '';
        lines.forEach(line => {
            const trimmed = line.trim();
            if (trimmed.startsWith('•')) {
                currentText = trimmed.slice(1).trim();
            }
            else if (trimmed.startsWith('http') && currentText) {
                links.push({
                    text: currentText,
                    url: trimmed,
                    isExternal: !trimmed.includes(window?.location?.hostname ?? 'x'),
                });
                currentText = '';
            }
        });
    });
    return links;
}
// ─────────────────────────────────────────────
// Image Card
// ─────────────────────────────────────────────
function ImageCard({ img, onLightbox }) {
    const [loaded, setLoaded] = useState(false);
    const [failed, setFailed] = useState(false);
    const [hovered, setHovered] = useState(false);
    if (failed)
        return null;
    return (_jsxs("div", { className: "group relative bg-surface-3 rounded-xl overflow-hidden\n                 border border-surface-4 hover:border-surface-5 transition-colors", onMouseEnter: () => setHovered(true), onMouseLeave: () => setHovered(false), children: [_jsxs("div", { className: "aspect-square cursor-zoom-in relative overflow-hidden", onClick: onLightbox, children: [!loaded && !failed && (_jsx("div", { className: "absolute inset-0 flex items-center justify-center", children: _jsx("div", { className: "w-4 h-4 border-2 border-brand border-t-transparent\n                            rounded-full animate-spin" }) })), _jsx("img", { src: img.src, alt: img.alt, className: "w-full h-full object-cover transition-transform duration-300\n                     group-hover:scale-105", onLoad: () => setLoaded(true), onError: () => setFailed(true), style: { opacity: loaded ? 1 : 0 } }), _jsx("div", { className: `absolute inset-0 bg-black/40 flex items-center justify-center
                         transition-opacity ${hovered ? 'opacity-100' : 'opacity-0'}`, children: _jsxs("svg", { className: "w-6 h-6 text-white", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2, children: [_jsx("circle", { cx: "11", cy: "11", r: "8" }), _jsx("line", { x1: "21", y1: "21", x2: "16.65", y2: "16.65" }), _jsx("line", { x1: "11", y1: "8", x2: "11", y2: "14" }), _jsx("line", { x1: "8", y1: "11", x2: "14", y2: "11" })] }) })] }), _jsxs("div", { className: "px-2 py-1.5 flex items-center justify-between", children: [_jsx("p", { className: "text-[9px] text-ink-4 truncate flex-1", children: img.alt || new URL(img.src).hostname.replace('www.', '') }), _jsx("a", { href: img.src, download: true, className: "flex-shrink-0 w-5 h-5 flex items-center justify-center\n                     text-ink-4 hover:text-brand-bright transition-colors", onClick: e => e.stopPropagation(), title: "Download image", children: _jsxs("svg", { className: "w-3 h-3", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2, children: [_jsx("path", { d: "M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" }), _jsx("polyline", { points: "7 10 12 15 17 10" }), _jsx("line", { x1: "12", y1: "15", x2: "12", y2: "3" })] }) })] })] }));
}
// ─────────────────────────────────────────────
// Links View
// ─────────────────────────────────────────────
function LinksView({ links }) {
    const external = links.filter(l => l.isExternal);
    const internal = links.filter(l => !l.isExternal);
    const [filter, setFilter] = useState('all');
    const [search, setSearch] = useState('');
    const shown = links.filter(l => {
        if (filter === 'external' && !l.isExternal)
            return false;
        if (filter === 'internal' && l.isExternal)
            return false;
        if (search && !l.text.toLowerCase().includes(search.toLowerCase()) &&
            !l.url.toLowerCase().includes(search.toLowerCase()))
            return false;
        return true;
    });
    return (_jsxs("div", { children: [_jsxs("div", { className: "flex items-center gap-3 mb-4", children: [_jsx("div", { className: "flex rounded-lg overflow-hidden border border-surface-4", children: [
                            { key: 'all', label: `All (${links.length})` },
                            { key: 'external', label: `🌐 External (${external.length})` },
                            { key: 'internal', label: `🏠 Internal (${internal.length})` },
                        ].map((f, i) => (_jsx("button", { onClick: () => setFilter(f.key), className: "px-3 py-1.5 text-[10px] transition-colors", style: {
                                background: filter === f.key ? 'var(--brand)' : 'var(--s3)',
                                color: filter === f.key ? '#fff' : 'var(--ink3)',
                                borderLeft: i > 0 ? '0.5px solid var(--s4)' : undefined,
                            }, children: f.label }, f.key))) }), _jsxs("div", { className: "relative flex-1 max-w-xs", children: [_jsxs("svg", { className: "absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-ink-4", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2, children: [_jsx("circle", { cx: "11", cy: "11", r: "8" }), _jsx("line", { x1: "21", y1: "21", x2: "16.65", y2: "16.65" })] }), _jsx("input", { type: "text", placeholder: "Filter links...", value: search, onChange: e => setSearch(e.target.value), className: "w-full pl-8 pr-3 py-1.5 bg-surface-3 border border-surface-4\n                       rounded-lg text-xs text-ink-1 placeholder-ink-4 outline-none\n                       focus:border-brand transition-colors" })] })] }), _jsxs("div", { className: "flex flex-col gap-1", children: [shown.map((link, i) => {
                        let domain = '';
                        try {
                            domain = new URL(link.url).hostname.replace('www.', '');
                        }
                        catch { }
                        return (_jsxs("a", { href: link.url, target: "_blank", rel: "noopener noreferrer", className: "flex items-center gap-3 px-3 py-2.5 rounded-xl\n                         bg-surface-2 border border-surface-4\n                         hover:border-brand/30 hover:bg-surface-3 transition-all group", children: [_jsx("span", { className: "text-sm flex-shrink-0", children: link.isExternal ? '🌐' : '🏠' }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("p", { className: "text-xs font-medium text-ink-1 truncate\n                               group-hover:text-brand-bright transition-colors", children: link.text }), _jsx("p", { className: "text-[10px] text-ink-4 truncate", children: domain })] }), _jsxs("div", { className: "flex items-center gap-2 flex-shrink-0 opacity-0\n                              group-hover:opacity-100 transition-opacity", children: [_jsx("span", { className: "text-[9px] text-ink-4 max-w-32 truncate hidden sm:block", children: link.url }), _jsxs("svg", { className: "w-3.5 h-3.5 text-ink-4", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2, children: [_jsx("path", { d: "M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" }), _jsx("polyline", { points: "15 3 21 3 21 9" }), _jsx("line", { x1: "10", y1: "14", x2: "21", y2: "3" })] })] })] }, i));
                    }), shown.length === 0 && (_jsx("div", { className: "text-center py-8 text-xs text-ink-4", children: "No links match your filter" }))] })] }));
}
// ─────────────────────────────────────────────
// Full Note Card
// ─────────────────────────────────────────────
function FullNoteCard({ att, index }) {
    const [copied, setCopied] = useState(false);
    const [expanded, setExpanded] = useState(false);
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState(att.content ?? '');
    const [content, setContent] = useState(att.content ?? '');
    const [saving, setSaving] = useState(false);
    const isLong = content.length > 600;
    const firstLine = content.split('\n')[0] ?? '';
    const accentColor = firstLine.startsWith('📝') ? '#4f6ef7' :
        firstLine.startsWith('🖼️') ? '#10b981' :
            firstLine.startsWith('🔗') ? '#f59e0b' : '#4f6ef7';
    const typeLabel = firstLine.startsWith('📝') ? 'Article text' :
        firstLine.startsWith('🖼️') ? 'Extracted images' :
            firstLine.startsWith('🔗') ? 'Extracted links' :
                `Note ${index}`;
    async function copy() {
        await navigator.clipboard.writeText(content).catch(() => { });
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }
    function startEdit() {
        setDraft(content);
        setEditing(true);
        setExpanded(true);
    }
    async function saveEdit() {
        setSaving(true);
        const r = await attachmentsApi.update(att.id, draft);
        if (!r.error) {
            setContent(draft);
            setEditing(false);
        }
        setSaving(false);
    }
    const displayed = isLong && !expanded
        ? content.slice(0, 600) + '...'
        : content;
    return (_jsxs("div", { className: "bg-surface-2 border border-surface-4 rounded-2xl overflow-hidden", children: [_jsx("div", { className: "h-0.5", style: { background: accentColor } }), _jsxs("div", { className: "flex items-center justify-between px-4 py-3\n                      border-b border-surface-4", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "text-sm", children: firstLine.startsWith('📝') ? '📝' :
                                    firstLine.startsWith('🖼️') ? '🖼️' :
                                        firstLine.startsWith('🔗') ? '🔗' : '📝' }), _jsx("span", { className: "text-xs font-medium text-ink-2", children: typeLabel }), _jsxs("span", { className: "text-[10px] text-ink-4", children: ["#", index] })] }), _jsxs("div", { className: "flex items-center gap-2", children: [!editing && isLong && (_jsx("button", { onClick: () => setExpanded(!expanded), className: "text-[10px] text-ink-4 hover:text-ink-2 transition-colors", children: expanded ? '↑ Less' : '↓ More' })), editing ? (_jsxs(_Fragment, { children: [_jsx("button", { onClick: () => setEditing(false), className: "text-[10px] text-ink-4 hover:text-ink-2 transition-colors", children: "Cancel" }), _jsx("button", { onClick: saveEdit, disabled: saving, className: "text-[10px] text-white bg-brand px-2.5 py-1 rounded-lg\n                           hover:bg-brand/90 disabled:opacity-40 transition-colors", children: saving ? 'Saving...' : 'Save' })] })) : (_jsxs(_Fragment, { children: [_jsxs("button", { onClick: startEdit, className: "flex items-center gap-1 text-[10px] text-ink-4\n                           hover:text-ink-2 transition-colors", children: [_jsxs("svg", { className: "w-3 h-3", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2, children: [_jsx("path", { d: "M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" }), _jsx("path", { d: "M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" })] }), "Edit"] }), _jsx("button", { onClick: copy, className: "flex items-center gap-1 text-[10px] text-ink-4\n                           hover:text-ink-2 transition-colors", children: copied ? (_jsx("span", { className: "text-green-400", children: "Copied \u2713" })) : (_jsxs(_Fragment, { children: [_jsxs("svg", { className: "w-3 h-3", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2, children: [_jsx("rect", { x: "9", y: "9", width: "13", height: "13", rx: "2", ry: "2" }), _jsx("path", { d: "M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" })] }), "Copy"] })) })] }))] })] }), _jsxs("div", { className: "flex", children: [_jsx("div", { className: "w-1 flex-shrink-0", style: { background: accentColor + '40' } }), _jsx("div", { className: "flex-1 px-4 py-4 min-w-0", children: editing ? (_jsx("textarea", { autoFocus: true, value: draft, onChange: e => setDraft(e.target.value), rows: Math.min(20, Math.max(6, draft.split('\n').length)), className: "w-full bg-surface-3 border border-surface-4 rounded-lg\n                         px-3 py-2 text-sm text-ink-1 font-mono leading-relaxed\n                         outline-none focus:border-brand transition-colors\n                         resize-y" })) : (_jsx(FormattedText, { text: displayed })) })] })] }));
}
// ─────────────────────────────────────────────
// Empty state
// ─────────────────────────────────────────────
function EmptyState({ emoji, title, subtitle }) {
    return (_jsxs("div", { className: "flex flex-col items-center justify-center py-20 text-center\n                    border border-dashed border-surface-5 rounded-2xl", children: [_jsx("span", { className: "text-4xl mb-3", children: emoji }), _jsx("p", { className: "text-sm font-medium text-ink-2 mb-1", children: title }), _jsx("p", { className: "text-xs text-ink-4 max-w-xs", children: subtitle })] }));
}
