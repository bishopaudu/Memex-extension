import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { adminApi } from '../lib/api';
import { useToast } from '../components/Toast';
export function AdminPage() {
    const { toast } = useToast();
    const [stats, setStats] = useState(null);
    const [users, setUsers] = useState([]);
    const [totalUsers, setTotalUsers] = useState(0);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [usersLoading, setUsersLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [confirmDelete, setConfirmDelete] = useState(null);
    useEffect(() => { fetchStats(); fetchUsers(1); }, []);
    async function fetchStats() {
        const r = await adminApi.getStats();
        if (!r.error)
            setStats(r.data);
        setLoading(false);
    }
    async function fetchUsers(p) {
        setUsersLoading(true);
        const r = await adminApi.getUsers(p);
        if (!r.error) {
            setUsers(r.data.users);
            setTotalUsers(r.data.total);
            setPage(p);
        }
        setUsersLoading(false);
    }
    async function handleDeleteUser(id) {
        const r = await adminApi.deleteUser(id);
        if (r.error) {
            toast(r.error.message, 'error');
        }
        else {
            toast('User deleted', 'success', '🗑');
            setUsers(prev => prev.filter(u => u.id !== id));
            setTotalUsers(prev => prev - 1);
        }
        setConfirmDelete(null);
    }
    const filtered = users.filter(u => !search ||
        u.email.toLowerCase().includes(search.toLowerCase()) ||
        (u.name ?? '').toLowerCase().includes(search.toLowerCase()) ||
        (u.username ?? '').toLowerCase().includes(search.toLowerCase()));
    function timeAgo(date) {
        const days = Math.floor((Date.now() - new Date(date).getTime()) / 86400000);
        if (days === 0)
            return 'Today';
        if (days === 1)
            return 'Yesterday';
        if (days < 30)
            return `${days}d ago`;
        return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
    return (_jsx("div", { className: "min-h-screen bg-surface-0 p-6", children: _jsxs("div", { className: "max-w-5xl mx-auto", children: [_jsxs("div", { className: "flex items-center justify-between mb-8", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-xl font-bold text-ink-1 flex items-center gap-2", children: "\u2699\uFE0F Admin Dashboard" }), _jsx("p", { className: "text-xs text-ink-4 mt-0.5", children: "Platform overview and user management" })] }), _jsx("a", { href: "/", className: "text-xs text-brand-bright hover:underline", children: "\u2190 Back to app" })] }), loading ? (_jsx("div", { className: "flex items-center justify-center py-12", children: _jsx("div", { className: "w-6 h-6 border-2 border-brand border-t-transparent\n                            rounded-full animate-spin" }) })) : stats && (_jsx("div", { className: "grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8", children: [
                        { label: 'Total users', value: stats.users.total,
                            sub: `+${stats.users.newThisWeek} this week`, emoji: '👥', color: '#4f6ef7' },
                        { label: 'New this month', value: stats.users.newThisMonth,
                            sub: 'new signups', emoji: '🆕', color: '#10b981' },
                        { label: 'Total bookmarks', value: stats.content.bookmarks,
                            sub: `+${stats.content.newBookmarksThisWeek} this week`, emoji: '🔖', color: '#f59e0b' },
                        { label: 'Wiki topics', value: stats.content.topics,
                            sub: `${stats.content.collections} collections`, emoji: '🧠', color: '#8b5cf6' },
                    ].map(stat => (_jsxs("div", { className: "bg-surface-2 border border-surface-4 rounded-2xl p-4", children: [_jsxs("div", { className: "flex items-center justify-between mb-3", children: [_jsx("span", { className: "text-xl", children: stat.emoji }), _jsx("div", { className: "w-2 h-2 rounded-full", style: { background: stat.color } })] }), _jsx("p", { className: "text-2xl font-bold text-ink-1 mb-0.5", children: stat.value.toLocaleString() }), _jsx("p", { className: "text-[10px] text-ink-4", children: stat.label }), _jsx("p", { className: "text-[10px] text-ink-5 mt-0.5", children: stat.sub })] }, stat.label))) })), _jsxs("div", { className: "bg-surface-2 border border-surface-4 rounded-2xl overflow-hidden", children: [_jsxs("div", { className: "flex items-center justify-between px-5 py-4\n                          border-b border-surface-4", children: [_jsxs("div", { children: [_jsx("h2", { className: "text-sm font-semibold text-ink-1", children: "Users" }), _jsxs("p", { className: "text-[11px] text-ink-4 mt-0.5", children: [totalUsers, " total users"] })] }), _jsxs("div", { className: "relative", children: [_jsxs("svg", { className: "absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-ink-4", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2, children: [_jsx("circle", { cx: "11", cy: "11", r: "8" }), _jsx("line", { x1: "21", y1: "21", x2: "16.65", y2: "16.65" })] }), _jsx("input", { type: "text", placeholder: "Search users...", value: search, onChange: e => setSearch(e.target.value), className: "pl-8 pr-3 py-1.5 w-44 bg-surface-3 border border-surface-4\n                           rounded-lg text-xs text-ink-1 placeholder-ink-4 outline-none\n                           focus:border-brand transition-colors" })] })] }), usersLoading ? (_jsx("div", { className: "flex items-center justify-center py-12", children: _jsx("div", { className: "w-5 h-5 border-2 border-brand border-t-transparent\n                              rounded-full animate-spin" }) })) : (_jsxs(_Fragment, { children: [_jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "w-full", children: [_jsx("thead", { children: _jsx("tr", { className: "border-b border-surface-4", children: ['User', 'Username', 'Bookmarks', 'Joined', 'Actions'].map(h => (_jsx("th", { className: "px-5 py-3 text-left text-[10px] font-medium\n                                       text-ink-4 uppercase tracking-wider", children: h }, h))) }) }), _jsx("tbody", { children: filtered.map(user => (_jsxs("tr", { className: "border-b border-surface-4 hover:bg-surface-3\n                                     transition-colors", children: [_jsx("td", { className: "px-5 py-3", children: _jsxs("div", { className: "flex items-center gap-3", children: [_jsx("div", { className: "w-7 h-7 rounded-full bg-brand/20\n                                            flex items-center justify-center\n                                            text-[11px] font-bold text-brand-bright\n                                            flex-shrink-0", children: (user.name || user.email)[0].toUpperCase() }), _jsxs("div", { className: "min-w-0", children: [_jsx("p", { className: "text-xs font-medium text-ink-1 truncate", children: user.name || '—' }), _jsx("p", { className: "text-[10px] text-ink-4 truncate", children: user.email })] })] }) }), _jsx("td", { className: "px-5 py-3", children: _jsx("span", { className: "text-[11px] text-ink-3", children: user.username ? `@${user.username}` : '—' }) }), _jsx("td", { className: "px-5 py-3", children: _jsx("span", { className: "text-xs font-medium text-ink-1", children: user.bookmarkCount.toLocaleString() }) }), _jsx("td", { className: "px-5 py-3", children: _jsx("span", { className: "text-[11px] text-ink-4", children: timeAgo(user.createdAt) }) }), _jsx("td", { className: "px-5 py-3", children: confirmDelete === user.id ? (_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "text-[10px] text-ink-3", children: "Sure?" }), _jsx("button", { onClick: () => handleDeleteUser(user.id), className: "text-[10px] text-red-400 hover:text-red-300\n                                           px-2 py-0.5 bg-red-400/10 border border-red-400/20\n                                           rounded transition-colors", children: "Delete" }), _jsx("button", { onClick: () => setConfirmDelete(null), className: "text-[10px] text-ink-4 hover:text-ink-2", children: "Cancel" })] })) : (_jsx("button", { onClick: () => setConfirmDelete(user.id), className: "text-[10px] text-ink-4 hover:text-red-400\n                                         hover:bg-red-400/10 px-2 py-1 rounded\n                                         transition-colors", children: "Delete" })) })] }, user.id))) })] }) }), totalUsers > 20 && (_jsxs("div", { className: "flex items-center justify-between px-5 py-3\n                                border-t border-surface-4", children: [_jsxs("p", { className: "text-[11px] text-ink-4", children: ["Showing ", (page - 1) * 20 + 1, "\u2013", Math.min(page * 20, totalUsers), " of ", totalUsers] }), _jsxs("div", { className: "flex items-center gap-1", children: [_jsx("button", { onClick: () => fetchUsers(page - 1), disabled: page === 1, className: "px-3 py-1 text-xs text-ink-3 bg-surface-3\n                                 border border-surface-4 rounded-lg\n                                 disabled:opacity-40 hover:bg-surface-4\n                                 transition-colors", children: "\u2190 Prev" }), _jsxs("span", { className: "px-3 py-1 text-xs text-ink-2", children: [page, " / ", Math.ceil(totalUsers / 20)] }), _jsx("button", { onClick: () => fetchUsers(page + 1), disabled: page >= Math.ceil(totalUsers / 20), className: "px-3 py-1 text-xs text-ink-3 bg-surface-3\n                                 border border-surface-4 rounded-lg\n                                 disabled:opacity-40 hover:bg-surface-4\n                                 transition-colors", children: "Next \u2192" })] })] }))] }))] })] }) }));
}
