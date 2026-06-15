import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
import { feedbackApi } from '../lib/api';
export function FeedbackPage() {
    const [category, setCategory] = useState('general');
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [sending, setSending] = useState(false);
    const [sent, setSent] = useState(false);
    const [error, setError] = useState('');
    async function handleSubmit() {
        if (message.trim().length < 5) {
            setError('Please write a bit more detail');
            return;
        }
        setError('');
        setSending(true);
        const r = await feedbackApi.submit({
            email: email.trim() || undefined,
            category,
            message: message.trim(),
        });
        setSending(false);
        if (r.error) {
            setError('Something went wrong — please try again');
        }
        else {
            setSent(true);
        }
    }
    const categories = [
        { key: 'bug', label: 'Bug report', emoji: '🐛' },
        { key: 'feature', label: 'Feature request', emoji: '💡' },
        { key: 'general', label: 'General feedback', emoji: '💬' },
        { key: 'other', label: 'Something else', emoji: '✨' },
    ];
    return (_jsxs("div", { className: "min-h-screen bg-surface-0", children: [_jsxs("nav", { className: "border-b border-surface-4 px-6 py-3 flex items-center\n                      justify-between max-w-4xl mx-auto", children: [_jsxs("a", { href: "/", className: "flex items-center gap-3", children: [_jsx("div", { className: "w-7 h-7 bg-brand rounded-lg flex items-center\n                          justify-center text-white font-bold text-xs", children: "M" }), _jsx("span", { className: "font-semibold text-ink-1 text-sm", children: "Memex" }), _jsx("span", { className: "text-ink-5 text-xs", children: "/" }), _jsx("span", { className: "text-xs text-ink-3", children: "Feedback" })] }), _jsxs("div", { className: "flex items-center gap-4", children: [_jsx("a", { href: "/help", className: "text-xs text-ink-3 hover:text-ink-1 transition-colors", children: "Help" }), _jsx("a", { href: "/about", className: "text-xs text-ink-3 hover:text-ink-1 transition-colors", children: "About" }), _jsx("a", { href: "/explore", className: "text-xs text-ink-3 hover:text-ink-1 transition-colors", children: "Explore" })] })] }), _jsx("main", { className: "max-w-lg mx-auto px-6 py-16", children: sent ? (_jsxs("div", { className: "text-center py-12", children: [_jsx("p", { className: "text-4xl mb-4", children: "\uD83C\uDF89" }), _jsx("h1", { className: "text-xl font-bold text-ink-1 mb-2", children: "Thank you!" }), _jsx("p", { className: "text-sm text-ink-3 mb-6", children: "Your feedback has been received. We read every message." }), _jsx("a", { href: "/", className: "inline-block px-4 py-2 bg-brand text-white text-xs\n                          font-medium rounded-xl hover:bg-brand/90 transition-colors", children: "Back to Memex" })] })) : (_jsxs(_Fragment, { children: [_jsxs("div", { className: "mb-8", children: [_jsx("h1", { className: "text-2xl font-bold text-ink-1 mb-2", children: "Send feedback" }), _jsx("p", { className: "text-sm text-ink-3", children: "Found a bug? Have an idea? Let us know \u2014 we read everything." })] }), _jsxs("div", { className: "flex flex-col gap-5", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-[10px] font-medium text-ink-4\n                                   uppercase tracking-wider mb-2", children: "Category" }), _jsx("div", { className: "grid grid-cols-2 gap-2", children: categories.map(cat => (_jsxs("button", { onClick: () => setCategory(cat.key), className: `flex items-center gap-2 px-3 py-2.5 rounded-xl
                                  border text-xs font-medium transition-colors
                                  ${category === cat.key
                                                    ? 'border-brand/40 bg-brand/10 text-brand-bright'
                                                    : 'border-surface-4 bg-surface-2 text-ink-3 hover:text-ink-1'}`, children: [_jsx("span", { children: cat.emoji }), cat.label] }, cat.key))) })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-[10px] font-medium text-ink-4\n                                   uppercase tracking-wider mb-2", children: "Message" }), _jsx("textarea", { value: message, onChange: e => setMessage(e.target.value), rows: 6, placeholder: "Tell us what's on your mind...", className: "w-full px-3 py-2.5 bg-surface-2 border border-surface-4\n                             rounded-xl text-sm text-ink-1 outline-none resize-none\n                             focus:border-brand transition-colors placeholder-ink-5" })] }), _jsxs("div", { children: [_jsxs("label", { className: "block text-[10px] font-medium text-ink-4\n                                   uppercase tracking-wider mb-2", children: ["Email ", _jsx("span", { className: "normal-case font-normal text-ink-5", children: "(optional, if you'd like a reply)" })] }), _jsx("input", { type: "email", value: email, onChange: e => setEmail(e.target.value), placeholder: "you@example.com", className: "w-full px-3 py-2.5 bg-surface-2 border border-surface-4\n                             rounded-xl text-sm text-ink-1 outline-none\n                             focus:border-brand transition-colors placeholder-ink-5" })] }), error && (_jsx("p", { className: "text-xs text-red-400", children: error })), _jsx("button", { onClick: handleSubmit, disabled: sending, className: "w-full py-3 bg-brand text-white text-sm font-medium\n                           rounded-xl hover:bg-brand/90 disabled:opacity-40\n                           transition-colors", children: sending ? 'Sending...' : 'Send feedback' })] })] })) })] }));
}
