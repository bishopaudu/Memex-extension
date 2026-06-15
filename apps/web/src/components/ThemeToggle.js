import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export function ThemeToggle({ theme, toggle }) {
    return (_jsx("button", { onClick: toggle, title: `Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`, className: "w-7 h-7 flex items-center justify-center rounded-md\n                 text-ink-3 hover:text-ink-1 hover:bg-surface-3\n                 transition-colors", children: theme === 'dark' ? (
        // Sun icon — click to go light
        _jsxs("svg", { className: "w-3.5 h-3.5", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2, children: [_jsx("circle", { cx: "12", cy: "12", r: "5" }), _jsx("line", { x1: "12", y1: "1", x2: "12", y2: "3" }), _jsx("line", { x1: "12", y1: "21", x2: "12", y2: "23" }), _jsx("line", { x1: "4.22", y1: "4.22", x2: "5.64", y2: "5.64" }), _jsx("line", { x1: "18.36", y1: "18.36", x2: "19.78", y2: "19.78" }), _jsx("line", { x1: "1", y1: "12", x2: "3", y2: "12" }), _jsx("line", { x1: "21", y1: "12", x2: "23", y2: "12" }), _jsx("line", { x1: "4.22", y1: "19.78", x2: "5.64", y2: "18.36" }), _jsx("line", { x1: "18.36", y1: "5.64", x2: "19.78", y2: "4.22" })] })) : (
        // Moon icon — click to go dark
        _jsx("svg", { className: "w-3.5 h-3.5", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2, children: _jsx("path", { d: "M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" }) })) }));
}
