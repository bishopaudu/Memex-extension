import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect, useRef } from 'react';
import { bookmarksApi } from '../lib/api';
export function DailyRediscovery({ onOpenBookmark }) {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [dismissed, setDismissed] = useState(false);
    const [current, setCurrent] = useState(0);
    const currentRef = useRef(0);
    const itemsRef = useRef([]);
    const timerRef = useRef(null);
    // Keep refs in sync
    useEffect(() => { currentRef.current = current; }, [current]);
    useEffect(() => { itemsRef.current = items; }, [items]);
    useEffect(() => {
        const today = new Date().toDateString();
        const lastShown = localStorage.getItem('memex_rediscovery_date');
        const cached = localStorage.getItem('memex_rediscovery_items');
        const wasDismissed = localStorage.getItem('memex_rediscovery_dismissed');
        if (wasDismissed === today) {
            setDismissed(true);
            setLoading(false);
            return;
        }
        if (lastShown === today && cached) {
            try {
                const parsed = JSON.parse(cached);
                if (parsed.length > 0) {
                    setItems(parsed);
                    itemsRef.current = parsed;
                    setLoading(false);
                    return;
                }
            }
            catch { }
        }
        fetchItems(today);
    }, []);
    // Start auto-advance AFTER items are loaded
    useEffect(() => {
        if (items.length <= 1)
            return;
        startTimer();
        return () => clearInterval(timerRef.current);
    }, [items.length]);
    function startTimer() {
        clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
            const next = (currentRef.current + 1) % itemsRef.current.length;
            setCurrent(next);
            currentRef.current = next;
        }, 4000);
    }
    async function fetchItems(today) {
        setLoading(true);
        const r = await bookmarksApi.list({ limit: 50 });
        if (!r.error && r.data.items.length >= 3) {
            const shuffled = [...r.data.items]
                .sort(() => Math.random() - 0.5)
                .slice(0, 8);
            setItems(shuffled);
            itemsRef.current = shuffled;
            localStorage.setItem('memex_rediscovery_date', today);
            localStorage.setItem('memex_rediscovery_items', JSON.stringify(shuffled));
        }
        setLoading(false);
    }
    function goTo(index) {
        clearInterval(timerRef.current);
        setCurrent(index);
        currentRef.current = index;
        startTimer(); // restart timer after manual navigation
    }
    function goNext() {
        const next = (currentRef.current + 1) % itemsRef.current.length;
        goTo(next);
    }
    function goPrev() {
        const prev = (currentRef.current - 1 + itemsRef.current.length) % itemsRef.current.length;
        goTo(prev);
    }
    function handleDismiss() {
        clearInterval(timerRef.current);
        localStorage.setItem('memex_rediscovery_dismissed', new Date().toDateString());
        setDismissed(true);
    }
    if (dismissed || loading || items.length === 0)
        return null;
    const item = items[current];
    let domain = '';
    try {
        domain = new URL(item.url).hostname.replace('www.', '');
    }
    catch { }
    function timeAgo(date) {
        const days = Math.floor((Date.now() - new Date(date).getTime()) / 86400000);
        if (days === 0)
            return 'today';
        if (days === 1)
            return 'yesterday';
        if (days < 30)
            return `${days}d ago`;
        if (days < 365)
            return `${Math.floor(days / 30)}mo ago`;
        return `${Math.floor(days / 365)}y ago`;
    }
    const heroImage = item.screenshotUrl ?? item.ogImageUrl;
    return (_jsxs("div", { className: "mb-6 bg-surface-2 border border-surface-4 rounded-2xl\n                    overflow-hidden select-none", children: [_jsxs("div", { className: "flex items-center justify-between px-4 py-2.5\n                      border-b border-surface-4", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "text-sm", children: "\u2728" }), _jsx("p", { className: "text-xs font-semibold text-ink-1", children: "From your past" }), _jsxs("span", { className: "text-[10px] text-ink-5", children: ["\u00B7 saved ", timeAgo(item.createdAt)] })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("div", { className: "flex items-center gap-1", children: items.map((_, i) => (_jsx("button", { onClick: () => goTo(i), className: `rounded-full transition-all duration-300 ${i === current
                                        ? 'w-4 h-1.5 bg-brand'
                                        : 'w-1.5 h-1.5 bg-surface-5 hover:bg-ink-4'}` }, i))) }), _jsx("button", { onClick: handleDismiss, className: "w-5 h-5 flex items-center justify-center rounded\n                       text-ink-5 hover:text-ink-3 transition-colors ml-1", children: _jsxs("svg", { className: "w-3 h-3", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2, children: [_jsx("line", { x1: "18", y1: "6", x2: "6", y2: "18" }), _jsx("line", { x1: "6", y1: "6", x2: "18", y2: "18" })] }) })] })] }), _jsxs("div", { className: "relative", children: [_jsxs("div", { className: "flex gap-4 p-4 cursor-pointer hover:bg-surface-3\n                     transition-colors animate-in fade-in duration-300", onClick: () => onOpenBookmark(item.id), children: [heroImage && (_jsx("div", { className: "w-24 h-16 rounded-xl overflow-hidden bg-surface-3\n                            flex-shrink-0 border border-surface-4", children: _jsx("img", { src: heroImage, alt: "", className: "w-full h-full object-cover", onError: e => (e.currentTarget.parentElement.style.display = 'none') }) })), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsxs("div", { className: "flex items-center gap-1.5 mb-1", children: [item.faviconUrl && (_jsx("img", { src: item.faviconUrl, alt: "", className: "w-3.5 h-3.5 flex-shrink-0", onError: e => (e.currentTarget.style.display = 'none') })), _jsx("span", { className: "text-[10px] text-ink-4 truncate", children: domain })] }), _jsx("p", { className: "text-sm font-semibold text-ink-1 line-clamp-2\n                          leading-snug mb-1", children: item.title || domain }), item.description && (_jsx("p", { className: "text-[11px] text-ink-4 line-clamp-2 leading-relaxed", children: item.description })), item.tags?.length > 0 && (_jsx("div", { className: "flex gap-1 mt-1.5", children: item.tags.slice(0, 3).map((t) => (_jsxs("span", { className: "text-[9px] px-1.5 py-0.5 bg-brand/10\n                                   text-brand-bright rounded-full", children: ["#", t.name] }, t.id))) }))] })] }, current), items.length > 1 && (_jsxs(_Fragment, { children: [_jsx("button", { onClick: e => { e.stopPropagation(); goPrev(); }, className: "absolute left-2 top-1/2 -translate-y-1/2 w-6 h-6\n                         bg-surface-3 border border-surface-4 rounded-full\n                         flex items-center justify-center text-ink-3\n                         hover:text-ink-1 hover:bg-surface-4 transition-colors\n                         shadow-sm opacity-0 group-hover:opacity-100", style: { opacity: 0.7 }, children: _jsx("svg", { className: "w-3 h-3", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2.5, children: _jsx("polyline", { points: "15 18 9 12 15 6" }) }) }), _jsx("button", { onClick: e => { e.stopPropagation(); goNext(); }, className: "absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6\n                         bg-surface-3 border border-surface-4 rounded-full\n                         flex items-center justify-center text-ink-3\n                         hover:text-ink-1 hover:bg-surface-4 transition-colors\n                         shadow-sm", style: { opacity: 0.7 }, children: _jsx("svg", { className: "w-3 h-3", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2.5, children: _jsx("polyline", { points: "9 18 15 12 9 6" }) }) })] }))] }), items.length > 1 && (_jsx("div", { className: "h-0.5 bg-surface-4", children: _jsx("div", { className: "h-full bg-brand/40", style: {
                        animation: 'progress 4s linear forwards',
                    } }, current) })), _jsx("style", { children: `
        @keyframes progress {
          from { width: 0% }
          to   { width: 100% }
        }
      ` })] }));
}
