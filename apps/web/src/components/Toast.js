import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useCallback } from 'react';
import { createContext, useContext } from 'react';
const ToastContext = createContext({
    toast: () => { },
});
export function useToast() {
    return useContext(ToastContext);
}
export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);
    const toast = useCallback((message, type = 'success', emoji) => {
        const id = crypto.randomUUID();
        setToasts(prev => [...prev, { id, message, type, emoji }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 3000);
    }, []);
    return (_jsxs(ToastContext.Provider, { value: { toast }, children: [children, _jsx("div", { className: "fixed bottom-6 left-1/2 -translate-x-1/2 z-[200]\n                      flex flex-col items-center gap-2 pointer-events-none", children: toasts.map(t => (_jsxs("div", { className: `flex items-center gap-2.5 px-4 py-2.5 rounded-xl
                        shadow-2xl border text-sm font-medium
                        animate-in slide-in-from-bottom-2 duration-200
                        ${t.type === 'success'
                        ? 'bg-surface-2 border-green-500/30 text-ink-1'
                        : t.type === 'error'
                            ? 'bg-surface-2 border-red-500/30 text-ink-1'
                            : 'bg-surface-2 border-brand/30 text-ink-1'}`, style: {
                        boxShadow: t.type === 'success'
                            ? '0 8px 32px rgba(16,185,129,0.15)'
                            : t.type === 'error'
                                ? '0 8px 32px rgba(239,68,68,0.15)'
                                : '0 8px 32px rgba(79,110,247,0.15)',
                    }, children: [t.emoji ? (_jsx("span", { className: "text-base", children: t.emoji })) : t.type === 'success' ? (_jsx("div", { className: "w-4 h-4 rounded-full bg-green-500/20 flex items-center\n                              justify-center flex-shrink-0", children: _jsx("svg", { className: "w-2.5 h-2.5 text-green-400", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 3, children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M5 13l4 4L19 7" }) }) })) : t.type === 'error' ? (_jsx("div", { className: "w-4 h-4 rounded-full bg-red-500/20 flex items-center\n                              justify-center flex-shrink-0", children: _jsxs("svg", { className: "w-2.5 h-2.5 text-red-400", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 3, children: [_jsx("line", { x1: "18", y1: "6", x2: "6", y2: "18" }), _jsx("line", { x1: "6", y1: "6", x2: "18", y2: "18" })] }) })) : (_jsx("div", { className: "w-4 h-4 rounded-full bg-brand/20 flex items-center\n                              justify-center flex-shrink-0", children: _jsxs("svg", { className: "w-2.5 h-2.5 text-brand-bright", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2, children: [_jsx("circle", { cx: "12", cy: "12", r: "10" }), _jsx("line", { x1: "12", y1: "8", x2: "12", y2: "12" }), _jsx("line", { x1: "12", y1: "16", x2: "12.01", y2: "16" })] }) })), _jsx("span", { className: "text-xs", children: t.message })] }, t.id))) })] }));
}
