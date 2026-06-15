import { jsx as _jsx } from "react/jsx-runtime";
export function Spinner({ size = 'md' }) {
    const s = { sm: 'w-3 h-3', md: 'w-5 h-5', lg: 'w-8 h-8' }[size];
    return (_jsx("div", { className: `${s} border-2 border-primary-500 border-t-transparent
                     rounded-full animate-spin` }));
}
