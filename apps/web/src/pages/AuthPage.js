import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { ThemeToggle } from '../components/ThemeToggle';
export function AuthPage({ theme, toggleTheme }) {
    const [mode, setMode] = useState('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login, signup } = useAuth();
    const navigate = useNavigate();
    async function handleSubmit(e) {
        e.preventDefault();
        setError('');
        setLoading(true);
        const result = mode === 'login'
            ? await login(email, password)
            : await signup(email, password, name);
        if (result.error) {
            setError(result.error);
            setLoading(false);
            return;
        }
        navigate('/');
    }
    return (_jsxs("div", { className: "min-h-screen bg-surface-0 flex items-center justify-center p-4", children: [_jsx("div", { className: "fixed inset-0 opacity-[0.03]", style: {
                    backgroundImage: `linear-gradient(var(--ink1) 1px, transparent 1px),
                               linear-gradient(90deg, var(--ink1) 1px, transparent 1px)`,
                    backgroundSize: '40px 40px'
                } }), _jsx("div", { className: "fixed top-4 right-4", children: _jsx(ThemeToggle, { theme: theme, toggle: toggleTheme }) }), _jsxs("div", { className: "relative w-full max-w-sm", children: [_jsxs("div", { className: "flex items-center justify-center gap-3 mb-8", children: [_jsx("div", { className: "w-10 h-10 bg-brand rounded-xl flex items-center justify-center", children: _jsx("span", { className: "text-white font-bold text-lg", children: "M" }) }), _jsx("span", { className: "text-2xl font-bold text-ink-1", children: "Memex" })] }), _jsxs("div", { className: "bg-surface-2 border border-surface-4 rounded-2xl p-8", children: [_jsx("h1", { className: "text-base font-semibold text-ink-1 mb-1", children: mode === 'login' ? 'Welcome back' : 'Create account' }), _jsx("p", { className: "text-xs text-ink-3 mb-6", children: mode === 'login'
                                    ? 'Sign in to your visual memory'
                                    : 'Start building your second brain' }), _jsxs("form", { onSubmit: handleSubmit, className: "flex flex-col gap-3", children: [mode === 'signup' && (_jsxs("div", { children: [_jsx("label", { className: "text-[10px] font-medium text-ink-3 uppercase\n                                  tracking-wider mb-1 block", children: "Name" }), _jsx("input", { type: "text", placeholder: "Your name", value: name, onChange: e => setName(e.target.value), className: "w-full px-3 py-2.5 bg-surface-3 border border-surface-4\n                             rounded-lg text-sm text-ink-1 placeholder-ink-4 outline-none\n                             focus:border-brand transition-colors" })] })), _jsxs("div", { children: [_jsx("label", { className: "text-[10px] font-medium text-ink-3 uppercase\n                                tracking-wider mb-1 block", children: "Email" }), _jsx("input", { type: "email", placeholder: "you@example.com", value: email, onChange: e => setEmail(e.target.value), required: true, className: "w-full px-3 py-2.5 bg-surface-3 border border-surface-4\n                           rounded-lg text-sm text-ink-1 placeholder-ink-4 outline-none\n                           focus:border-brand transition-colors" })] }), _jsxs("div", { children: [_jsx("label", { className: "text-[10px] font-medium text-ink-3 uppercase\n                                tracking-wider mb-1 block", children: "Password" }), _jsx("input", { type: "password", placeholder: "Min 8 characters", value: password, onChange: e => setPassword(e.target.value), required: true, minLength: 8, className: "w-full px-3 py-2.5 bg-surface-3 border border-surface-4\n                           rounded-lg text-sm text-ink-1 placeholder-ink-4 outline-none\n                           focus:border-brand transition-colors" })] }), error && (_jsx("div", { className: "bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2", children: _jsx("p", { className: "text-red-400 text-xs", children: error }) })), _jsx("button", { type: "submit", disabled: loading, className: "w-full py-2.5 bg-brand hover:bg-brand/90 disabled:opacity-40\n                         text-white text-sm font-medium rounded-lg transition-colors mt-1", children: loading
                                            ? (mode === 'login' ? 'Signing in...' : 'Creating account...')
                                            : (mode === 'login' ? 'Sign in' : 'Create account') })] }), _jsxs("p", { className: "text-xs text-ink-4 text-center mt-5", children: [mode === 'login' ? "Don't have an account? " : 'Already have an account? ', _jsx("button", { onClick: () => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); }, className: "text-brand-bright hover:underline", children: mode === 'login' ? 'Sign up' : 'Sign in' })] })] })] })] }));
}
