import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
import { topicsApi } from '../lib/api';
import { TopicGraph } from '../components/TopicGraph';
const COVER_COLORS = [
    '#4f6ef7', '#10b981', '#f59e0b', '#ef4444',
    '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16',
];
const DEFAULT_EMOJIS = [
    '📄', '🧠', '💡', '🔬', '🎯', '⚡',
    '🌐', '📊', '🏗️', '🎨', '🚀', '📚',
];
export function WikiPage({ topics, theme, onOpenTopic, onTopicsChange }) {
    const [creating, setCreating] = useState(false);
    const [newTitle, setNewTitle] = useState('');
    const [newEmoji, setNewEmoji] = useState('📄');
    const [newColor, setNewColor] = useState(COVER_COLORS[0]);
    const [saving, setSaving] = useState(false);
    const [searchQ, setSearchQ] = useState('');
    const [showGraph, setShowGraph] = useState(false);
    async function handleCreate() {
        if (!newTitle.trim())
            return;
        setSaving(true);
        const r = await topicsApi.create({
            title: newTitle.trim(),
            emoji: newEmoji,
            coverColor: newColor,
        });
        setSaving(false);
        setCreating(false);
        setNewTitle('');
        onTopicsChange();
        if (!r.error)
            onOpenTopic(r.data.topic.id);
    }
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
    const filtered = topics.filter(t => t.title.toLowerCase().includes(searchQ.toLowerCase()));
    return (_jsxs(_Fragment, { children: [showGraph && (_jsx(TopicGraph, { theme: theme, onOpenTopic: onOpenTopic, onClose: () => setShowGraph(false) })), _jsxs("div", { className: "flex-1 flex flex-col overflow-hidden bg-surface-1", children: [_jsxs("header", { className: "h-12 border-b border-surface-4 flex items-center\n                           gap-3 px-5 flex-shrink-0", children: [_jsxs("div", { className: "flex items-center gap-2 text-xs text-ink-3", children: [_jsx("span", { children: "Memex" }), _jsx("span", { className: "text-ink-5", children: "/" }), _jsx("span", { className: "text-ink-1 font-medium flex items-center gap-1.5", children: "\uD83E\uDDE0 Wiki" })] }), _jsxs("div", { className: "ml-auto flex items-center gap-2", children: [_jsxs("div", { className: "relative", children: [_jsxs("svg", { className: "absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-ink-4", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2, children: [_jsx("circle", { cx: "11", cy: "11", r: "8" }), _jsx("line", { x1: "21", y1: "21", x2: "16.65", y2: "16.65" })] }), _jsx("input", { type: "text", placeholder: "Search topics...", value: searchQ, onChange: e => setSearchQ(e.target.value), className: "pl-8 pr-3 py-1.5 w-40 bg-surface-3 border border-surface-4\n                           rounded-lg text-xs text-ink-1 placeholder-ink-4 outline-none\n                           focus:border-brand transition-colors" })] }), _jsxs("button", { onClick: () => setShowGraph(true), disabled: topics.length === 0, title: topics.length === 0 ? 'Create topics first' : 'View knowledge graph', className: "flex items-center gap-1.5 px-3 py-1.5 bg-surface-3\n                         border border-surface-4 text-ink-2 text-xs rounded-lg\n                         hover:bg-surface-4 hover:border-brand/30 hover:text-brand-bright\n                         transition-colors disabled:opacity-40 disabled:cursor-not-allowed", children: [_jsxs("svg", { className: "w-3 h-3", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2, children: [_jsx("circle", { cx: "5", cy: "12", r: "2" }), _jsx("circle", { cx: "19", cy: "5", r: "2" }), _jsx("circle", { cx: "19", cy: "19", r: "2" }), _jsx("line", { x1: "7", y1: "11.5", x2: "17", y2: "6.5" }), _jsx("line", { x1: "7", y1: "12.5", x2: "17", y2: "17.5" })] }), "Graph view"] }), _jsxs("button", { onClick: () => setCreating(true), className: "flex items-center gap-1.5 px-3 py-1.5 bg-brand text-white\n                         text-xs font-medium rounded-lg hover:bg-brand/90 transition-colors", children: [_jsxs("svg", { className: "w-3 h-3", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2.5, children: [_jsx("line", { x1: "12", y1: "5", x2: "12", y2: "19" }), _jsx("line", { x1: "5", y1: "12", x2: "19", y2: "12" })] }), "New topic"] })] })] }), _jsxs("main", { className: "flex-1 overflow-y-auto p-5", children: [_jsx("div", { className: "flex items-start gap-4 mb-6", children: _jsxs("div", { className: "flex-1", children: [_jsx("h1", { className: "text-sm font-semibold text-ink-1 flex items-center gap-2 mb-0.5", children: "\uD83E\uDDE0 Knowledge Wiki" }), _jsxs("p", { className: "text-[11px] text-ink-4", children: [topics.length, " ", topics.length === 1 ? 'topic' : 'topics', topics.length > 0 && ' · Click any topic to open the editor'] })] }) }), creating && (_jsxs("div", { className: "mb-6 p-4 bg-surface-2 border border-brand/20\n                            rounded-2xl animate-in", children: [_jsx("p", { className: "text-xs font-medium text-ink-2 mb-4", children: "Create new topic" }), _jsxs("div", { className: "flex gap-4 mb-4", children: [_jsxs("div", { className: "flex flex-col gap-3", children: [_jsxs("div", { children: [_jsx("p", { className: "text-[10px] text-ink-4 uppercase tracking-wider mb-2", children: "Emoji" }), _jsx("div", { className: "flex flex-wrap gap-1 w-36", children: DEFAULT_EMOJIS.map(e => (_jsx("button", { onClick: () => setNewEmoji(e), className: `w-7 h-7 rounded-lg text-sm transition-all
                                      ${newEmoji === e
                                                                        ? 'bg-brand/20 ring-1 ring-brand/50 scale-110'
                                                                        : 'hover:bg-surface-3'}`, children: e }, e))) })] }), _jsxs("div", { children: [_jsx("p", { className: "text-[10px] text-ink-4 uppercase tracking-wider mb-2", children: "Color" }), _jsx("div", { className: "flex gap-2 flex-wrap", children: COVER_COLORS.map(c => (_jsx("button", { onClick: () => setNewColor(c), style: { background: c }, className: `w-5 h-5 rounded-full transition-transform
                                      ${newColor === c
                                                                        ? 'scale-125 ring-2 ring-offset-1 ring-white/30'
                                                                        : 'hover:scale-110'}` }, c))) })] })] }), _jsxs("div", { className: "flex-1", children: [_jsx("p", { className: "text-[10px] text-ink-4 uppercase tracking-wider mb-2", children: "Title" }), _jsx("input", { autoFocus: true, type: "text", placeholder: "e.g. React Server Components", value: newTitle, onChange: e => setNewTitle(e.target.value), onKeyDown: e => {
                                                            if (e.key === 'Enter')
                                                                handleCreate();
                                                            if (e.key === 'Escape')
                                                                setCreating(false);
                                                        }, className: "w-full px-3 py-2.5 bg-surface-3 border border-surface-4\n                               rounded-lg text-sm text-ink-1 outline-none focus:border-brand\n                               placeholder-ink-5 transition-colors" }), newTitle && (_jsxs("div", { className: "flex items-center gap-2 mt-3 p-2.5 bg-surface-3\n                                    rounded-xl border border-surface-4", children: [_jsx("div", { className: "w-8 h-8 rounded-lg flex items-center justify-center text-lg", style: { background: newColor + '20', border: `1px solid ${newColor}30` }, children: newEmoji }), _jsxs("div", { children: [_jsx("p", { className: "text-xs font-medium text-ink-1", children: newTitle }), _jsx("p", { className: "text-[10px] text-ink-4", children: "Preview" })] })] }))] })] }), _jsxs("div", { className: "flex gap-2", children: [_jsx("button", { onClick: handleCreate, disabled: saving || !newTitle.trim(), className: "flex-1 py-2 bg-brand text-white text-xs font-medium\n                             rounded-lg disabled:opacity-40 hover:bg-brand/90\n                             transition-colors", children: saving ? 'Creating...' : 'Create & open →' }), _jsx("button", { onClick: () => { setCreating(false); setNewTitle(''); }, className: "px-4 py-2 text-ink-3 text-xs hover:text-ink-1\n                             hover:bg-surface-3 rounded-lg transition-colors", children: "Cancel" })] })] })), filtered.length === 0 && !creating && (_jsxs("div", { className: "flex flex-col items-center justify-center py-24 text-center", children: [_jsx("div", { className: "text-5xl mb-4", children: "\uD83E\uDDE0" }), _jsx("p", { className: "text-sm font-medium text-ink-2 mb-2", children: searchQ ? 'No topics match' : 'Your wiki is empty' }), _jsx("p", { className: "text-xs text-ink-4 mb-6 max-w-sm leading-relaxed", children: searchQ
                                            ? 'Try different keywords'
                                            : 'Create topics to build your knowledge base. Each topic is a wiki page where you write your understanding and attach your saved bookmarks as references.' }), !searchQ && (_jsxs("button", { onClick: () => setCreating(true), className: "flex items-center gap-1.5 px-4 py-2 bg-brand text-white\n                             text-xs font-medium rounded-lg hover:bg-brand/90\n                             transition-colors", children: [_jsxs("svg", { className: "w-3 h-3", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2.5, children: [_jsx("line", { x1: "12", y1: "5", x2: "12", y2: "19" }), _jsx("line", { x1: "5", y1: "12", x2: "19", y2: "12" })] }), "Create your first topic"] }))] })), filtered.length > 0 && (_jsx("div", { className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3\n                            xl:grid-cols-4 gap-4", children: filtered.map(topic => (_jsx(TopicCard, { topic: topic, onClick: () => onOpenTopic(topic.id), onDelete: async () => {
                                        await topicsApi.delete(topic.id);
                                        onTopicsChange();
                                    }, timeAgo: timeAgo }, topic.id))) }))] })] })] }));
}
// ─────────────────────────────────────────────
// Topic Card
// ─────────────────────────────────────────────
function TopicCard({ topic, onClick, onDelete, timeAgo }) {
    const [confirmDelete, setConfirmDelete] = useState(false);
    return (_jsxs("div", { onClick: onClick, className: "group relative bg-surface-2 border border-surface-4 rounded-2xl\n                 overflow-hidden cursor-pointer transition-all duration-200\n                 hover:border-surface-5 hover:shadow-lg hover:shadow-black/20\n                 hover:-translate-y-0.5", children: [_jsx("div", { className: "h-1", style: { background: topic.coverColor } }), _jsxs("div", { className: "p-4", children: [_jsxs("div", { className: "flex items-start justify-between mb-3", children: [_jsx("span", { className: "text-3xl leading-none group-hover:scale-110\n                       transition-transform duration-200 inline-block", children: topic.emoji }), _jsx("div", { onClick: e => e.stopPropagation(), children: confirmDelete ? (_jsxs("div", { className: "flex items-center gap-1", children: [_jsx("button", { onClick: onDelete, className: "text-[10px] text-red-400 px-2 py-1 bg-red-400/10\n                             border border-red-400/20 rounded-lg", children: "Delete" }), _jsx("button", { onClick: () => setConfirmDelete(false), className: "text-[10px] text-ink-3 px-1.5 py-1 hover:text-ink-1", children: "\u00D7" })] })) : (_jsx("button", { onClick: () => setConfirmDelete(true), className: "w-6 h-6 flex items-center justify-center rounded-lg\n                           text-ink-5 hover:text-red-400 hover:bg-red-400/10\n                           transition-colors opacity-0 group-hover:opacity-100", children: _jsxs("svg", { className: "w-3 h-3", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2, children: [_jsx("polyline", { points: "3 6 5 6 21 6" }), _jsx("path", { d: "M19 6l-1 14H6L5 6" })] }) })) })] }), _jsx("p", { className: "text-xs font-semibold text-ink-1 mb-1.5 leading-snug", children: topic.title }), topic.summary && (_jsx("p", { className: "text-[10px] text-ink-4 leading-relaxed line-clamp-2 mb-3", children: topic.summary })), _jsxs("div", { className: "flex items-center gap-3 pt-2.5 border-t border-surface-4", children: [_jsxs("span", { className: "text-[10px] text-ink-5 flex items-center gap-1", children: [_jsxs("svg", { className: "w-3 h-3", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2, children: [_jsx("path", { d: "M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" }), _jsx("polyline", { points: "14 2 14 8 20 8" })] }), topic.blockCount, " blocks"] }), _jsxs("span", { className: "text-[10px] text-ink-5 flex items-center gap-1", children: [_jsxs("svg", { className: "w-3 h-3", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2, children: [_jsx("path", { d: "M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" }), _jsx("path", { d: "M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" })] }), topic.refCount, " refs"] }), _jsx("span", { className: "text-[10px] text-ink-5 ml-auto", children: timeAgo(topic.updatedAt) })] })] })] }));
}
