import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { profileApi } from '../lib/api';
import { useToast } from './Toast';
export function ProfileModal({ user, onClose, onUpdate }) {
    const { toast } = useToast();
    const [tab, setTab] = useState('profile');
    const [name, setName] = useState(user.name ?? '');
    const [username, setUsername] = useState(user.username ?? '');
    const [saving, setSaving] = useState(false);
    const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl ?? '');
    const [avatarUploading, setAvatarUploading] = useState(false);
    const [stats, setStats] = useState(null);
    const [statsLoading, setStatsLoading] = useState(false);
    // Password change
    const [currentPw, setCurrentPw] = useState('');
    const [newPw, setNewPw] = useState('');
    const [confirmPw, setConfirmPw] = useState('');
    const [showPw, setShowPw] = useState(false);
    const [pwSaving, setPwSaving] = useState(false);
    useEffect(() => {
        if (tab === 'stats' && !stats)
            fetchStats();
    }, [tab]);
    async function fetchStats() {
        setStatsLoading(true);
        const r = await profileApi.getStats();
        if (!r.error)
            setStats(r.data);
        setStatsLoading(false);
    }
    async function handleSaveProfile() {
        setSaving(true);
        const r = await profileApi.updateProfile({ name, username });
        if (r.error) {
            toast(r.error.message, 'error');
        }
        else {
            onUpdate(r.data.user);
            toast('Profile updated', 'success', '✅');
        }
        setSaving(false);
    }
    async function handleChangePassword() {
        if (newPw !== confirmPw) {
            toast('Passwords do not match', 'error');
            return;
        }
        if (newPw.length < 8) {
            toast('Password must be at least 8 characters', 'error');
            return;
        }
        setPwSaving(true);
        const r = await profileApi.changePassword(currentPw, newPw);
        if (r.error) {
            toast(r.error.message, 'error');
        }
        else {
            toast('Password changed successfully', 'success', '🔐');
            setCurrentPw('');
            setNewPw('');
            setConfirmPw('');
        }
        setPwSaving(false);
    }
    const initial = (user.name || user.email)[0].toUpperCase();
    return (_jsx("div", { className: "fixed inset-0 z-50 flex items-center justify-center p-4", style: { background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }, onClick: onClose, children: _jsxs("div", { className: "w-full max-w-md bg-surface-2 border border-surface-4\n                   rounded-2xl overflow-hidden shadow-2xl", onClick: e => e.stopPropagation(), children: [_jsxs("div", { className: "flex items-center justify-between px-5 py-4\n                        border-b border-surface-4", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsxs("div", { className: "relative flex-shrink-0", children: [_jsx("div", { className: "w-10 h-10 rounded-full overflow-hidden bg-brand/20\n                              flex items-center justify-center cursor-pointer\n                              hover:opacity-80 transition-opacity", onClick: () => document.getElementById('avatar-input')?.click(), title: "Click to change photo", children: avatarUrl ? (_jsx("img", { src: avatarUrl, alt: "Avatar", className: "w-full h-full object-cover" })) : (_jsx("span", { className: "text-base font-bold text-brand-bright", children: initial })) }), avatarUploading ? (_jsx("div", { className: "absolute inset-0 rounded-full bg-black/50\n                                flex items-center justify-center", children: _jsx("div", { className: "w-4 h-4 border-2 border-white border-t-transparent\n                                  rounded-full animate-spin" }) })) : (_jsx("div", { className: "absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full\n                                bg-brand flex items-center justify-center\n                                cursor-pointer border-2 border-surface-2", onClick: () => document.getElementById('avatar-input')?.click(), children: _jsx("svg", { className: "w-2.5 h-2.5 text-white", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2.5, children: _jsx("path", { d: "M12 5v14M5 12h14" }) }) })), _jsx("input", { id: "avatar-input", type: "file", accept: "image/*", className: "hidden", onChange: async (e) => {
                                                const file = e.target.files?.[0];
                                                if (!file)
                                                    return;
                                                // Validate size (max 5MB)
                                                if (file.size > 5 * 1024 * 1024) {
                                                    toast('Image must be under 5MB', 'error');
                                                    return;
                                                }
                                                setAvatarUploading(true);
                                                try {
                                                    // Read as base64
                                                    const dataUrl = await new Promise((resolve, reject) => {
                                                        const reader = new FileReader();
                                                        reader.onload = () => resolve(reader.result);
                                                        reader.onerror = reject;
                                                        reader.readAsDataURL(file);
                                                    });
                                                    const r = await profileApi.uploadAvatar(dataUrl);
                                                    if (r.error) {
                                                        toast(r.error.message, 'error');
                                                    }
                                                    else {
                                                        setAvatarUrl(r.data.avatarUrl);
                                                        onUpdate({ ...user, avatarUrl: r.data.avatarUrl });
                                                        toast('Profile photo updated', 'success', '📸');
                                                    }
                                                }
                                                catch {
                                                    toast('Upload failed', 'error');
                                                }
                                                setAvatarUploading(false);
                                                // Reset input so same file can be re-selected
                                                e.target.value = '';
                                            } })] }), _jsxs("div", { children: [_jsx("p", { className: "text-sm font-semibold text-ink-1", children: user.name || 'Your profile' }), _jsx("p", { className: "text-[11px] text-ink-4", children: user.email })] })] }), _jsx("button", { onClick: onClose, className: "w-7 h-7 flex items-center justify-center rounded-lg\n                       text-ink-4 hover:text-ink-1 hover:bg-surface-3\n                       transition-colors", children: _jsxs("svg", { className: "w-4 h-4", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2, children: [_jsx("line", { x1: "18", y1: "6", x2: "6", y2: "18" }), _jsx("line", { x1: "6", y1: "6", x2: "18", y2: "18" })] }) })] }), _jsx("div", { className: "flex border-b border-surface-4", children: [
                        { key: 'profile', label: '👤 Profile' },
                        { key: 'stats', label: '📊 Stats' },
                        { key: 'password', label: '🔐 Password' },
                    ].map(t => (_jsxs("button", { onClick: () => setTab(t.key), className: `flex-1 py-2.5 text-xs font-medium transition-colors relative
                          ${tab === t.key
                            ? 'text-brand-bright'
                            : 'text-ink-4 hover:text-ink-2'}`, children: [t.label, tab === t.key && (_jsx("div", { className: "absolute bottom-0 left-0 right-0 h-0.5 bg-brand" }))] }, t.key))) }), _jsxs("div", { className: "p-5", children: [tab === 'profile' && (_jsxs("div", { className: "flex flex-col gap-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-[10px] font-medium text-ink-4\n                                   uppercase tracking-wider mb-1.5", children: "Display name" }), _jsx("input", { type: "text", value: name, onChange: e => setName(e.target.value), placeholder: "Your name", className: "w-full px-3 py-2 bg-surface-3 border border-surface-4\n                             rounded-lg text-sm text-ink-1 outline-none\n                             focus:border-brand transition-colors placeholder-ink-5" })] }), _jsxs("div", { children: [_jsxs("label", { className: "block text-[10px] font-medium text-ink-4\n                                   uppercase tracking-wider mb-1.5", children: ["Username", _jsx("span", { className: "ml-1 text-ink-5 normal-case font-normal", children: "\u2014 used in your public profile URL" })] }), _jsxs("div", { className: "flex items-center bg-surface-3 border border-surface-4\n                                rounded-lg overflow-hidden focus-within:border-brand\n                                transition-colors", children: [_jsx("span", { className: "px-3 py-2 text-sm text-ink-5 border-r\n                                   border-surface-4 bg-surface-3 flex-shrink-0", children: "/p/" }), _jsx("input", { type: "text", value: username, onChange: e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '')), placeholder: "username", className: "flex-1 px-3 py-2 bg-transparent text-sm text-ink-1\n                               outline-none placeholder-ink-5" })] }), username && (_jsxs("p", { className: "text-[10px] text-ink-5 mt-1", children: ["Your public profile: ", window.location.origin, "/p/", username] }))] }), _jsxs("div", { children: [_jsx("label", { className: "block text-[10px] font-medium text-ink-4\n                                   uppercase tracking-wider mb-1.5", children: "Email" }), _jsx("input", { type: "email", value: user.email, disabled: true, className: "w-full px-3 py-2 bg-surface-3 border border-surface-4\n                             rounded-lg text-sm text-ink-3 outline-none opacity-50\n                             cursor-not-allowed" }), _jsx("p", { className: "text-[10px] text-ink-5 mt-1", children: "Email cannot be changed" })] }), _jsx("button", { onClick: handleSaveProfile, disabled: saving, className: "w-full py-2.5 bg-brand text-white text-sm font-medium\n                           rounded-lg hover:bg-brand/90 disabled:opacity-40\n                           transition-colors", children: saving ? 'Saving...' : 'Save changes' })] })), tab === 'stats' && (_jsx("div", { children: statsLoading ? (_jsx("div", { className: "flex items-center justify-center py-12", children: _jsx("div", { className: "w-5 h-5 border-2 border-brand border-t-transparent\n                                  rounded-full animate-spin" }) })) : stats ? (_jsxs("div", { className: "grid grid-cols-2 gap-3", children: [[
                                        { label: 'Bookmarks', value: stats.bookmarkCount, emoji: '🔖' },
                                        { label: 'Wiki topics', value: stats.topicCount, emoji: '🧠' },
                                        { label: 'Collections', value: stats.collectionCount, emoji: '📁' },
                                        { label: 'Tags', value: stats.tagCount, emoji: '🏷️' },
                                        { label: 'Archived', value: stats.archivedCount, emoji: '📦' },
                                    ].map(stat => (_jsxs("div", { className: "bg-surface-3 border border-surface-4 rounded-xl\n                                    p-4 flex flex-col gap-1", children: [_jsx("span", { className: "text-xl", children: stat.emoji }), _jsx("p", { className: "text-2xl font-bold text-ink-1", children: stat.value.toLocaleString() }), _jsx("p", { className: "text-[11px] text-ink-4", children: stat.label })] }, stat.label))), _jsxs("div", { className: "bg-surface-3 border border-surface-4 rounded-xl\n                                  p-4 flex flex-col gap-1", children: [_jsx("span", { className: "text-xl", children: "\uD83D\uDDD3" }), _jsx("p", { className: "text-sm font-bold text-ink-1", children: "Member" }), _jsx("p", { className: "text-[11px] text-ink-4", children: "Building knowledge with Memex" })] })] })) : (_jsx("p", { className: "text-sm text-ink-3 text-center py-8", children: "Could not load stats" })) })), tab === 'password' && (_jsxs("div", { className: "flex flex-col gap-4", children: [[
                                    { label: 'Current password', value: currentPw,
                                        onChange: setCurrentPw, placeholder: 'Enter current password' },
                                    { label: 'New password', value: newPw,
                                        onChange: setNewPw, placeholder: 'At least 8 characters' },
                                    { label: 'Confirm new password', value: confirmPw,
                                        onChange: setConfirmPw, placeholder: 'Repeat new password' },
                                ].map(field => (_jsxs("div", { children: [_jsx("label", { className: "block text-[10px] font-medium text-ink-4\n                                     uppercase tracking-wider mb-1.5", children: field.label }), _jsx("div", { className: "flex items-center bg-surface-3 border border-surface-4\n                                  rounded-lg overflow-hidden focus-within:border-brand\n                                  transition-colors", children: _jsx("input", { type: showPw ? 'text' : 'password', value: field.value, onChange: e => field.onChange(e.target.value), placeholder: field.placeholder, className: "flex-1 px-3 py-2 bg-transparent text-sm text-ink-1\n                                 outline-none placeholder-ink-5" }) })] }, field.label))), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("input", { type: "checkbox", id: "showpw", checked: showPw, onChange: e => setShowPw(e.target.checked), className: "w-3 h-3" }), _jsx("label", { htmlFor: "showpw", className: "text-[11px] text-ink-4 cursor-pointer", children: "Show passwords" })] }), newPw && confirmPw && newPw !== confirmPw && (_jsx("p", { className: "text-[11px] text-red-400", children: "Passwords do not match" })), _jsx("button", { onClick: handleChangePassword, disabled: pwSaving || !currentPw || !newPw || !confirmPw, className: "w-full py-2.5 bg-brand text-white text-sm font-medium\n                           rounded-lg hover:bg-brand/90 disabled:opacity-40\n                           transition-colors", children: pwSaving ? 'Changing...' : 'Change password' })] }))] })] }) }));
}
