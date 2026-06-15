import { jsx as _jsx } from "react/jsx-runtime";
import React from 'react';
/**
 * Lightweight markdown-ish renderer for extracted text / notes.
 * Supports:
 *   # / ## / ### headings
 *   • bullet lines
 *   > quote lines
 *   ``` code fences
 *   bare URLs → clickable links
 *   blank-line separated paragraphs
 */
export function FormattedText({ text, className = '' }) {
    if (!text)
        return null;
    const lines = text.split('\n');
    const blocks = [];
    let i = 0;
    let key = 0;
    while (i < lines.length) {
        const line = lines[i];
        // Code fence
        if (line.trim().startsWith('```')) {
            const codeLines = [];
            i++;
            while (i < lines.length && !lines[i].trim().startsWith('```')) {
                codeLines.push(lines[i]);
                i++;
            }
            i++; // skip closing ```
            blocks.push(_jsx("pre", { className: "text-xs text-green-400 font-mono bg-surface-3\n                                     rounded-xl px-4 py-3 my-2 overflow-x-auto", children: codeLines.join('\n') }, key++));
            continue;
        }
        // Headings
        const h3 = line.match(/^###\s+(.*)/);
        const h2 = line.match(/^##\s+(.*)/);
        const h1 = line.match(/^#\s+(.*)/);
        if (h1) {
            blocks.push(_jsx("h1", { className: "text-lg font-bold text-ink-1 mt-4 mb-1", children: linkify(h1[1]) }, key++));
            i++;
            continue;
        }
        if (h2) {
            blocks.push(_jsx("h2", { className: "text-base font-semibold text-ink-1 mt-3 mb-1", children: linkify(h2[1]) }, key++));
            i++;
            continue;
        }
        if (h3) {
            blocks.push(_jsx("h3", { className: "text-sm font-semibold text-ink-2 mt-2 mb-1", children: linkify(h3[1]) }, key++));
            i++;
            continue;
        }
        // Bullet group
        if (line.trim().startsWith('•') || line.trim().startsWith('- ')) {
            const items = [];
            while (i < lines.length && (lines[i].trim().startsWith('•') || lines[i].trim().startsWith('- '))) {
                items.push(lines[i].trim().replace(/^[•-]\s*/, ''));
                i++;
            }
            blocks.push(_jsx("ul", { className: "list-disc list-inside text-sm text-ink-1\n                                    leading-relaxed space-y-0.5 my-1.5 pl-1", children: items.map((it, idx) => _jsx("li", { children: linkify(it) }, idx)) }, key++));
            continue;
        }
        // Quote
        if (line.trim().startsWith('>')) {
            blocks.push(_jsx("blockquote", { className: "text-sm text-ink-2 italic border-l-2 border-brand/40\n                     pl-3 py-0.5 my-2", children: linkify(line.trim().replace(/^>\s*/, '')) }, key++));
            i++;
            continue;
        }
        // Divider
        if (line.trim() === '─'.repeat(40) || /^─{3,}$/.test(line.trim())) {
            blocks.push(_jsx("hr", { className: "border-surface-4 my-3" }, key++));
            i++;
            continue;
        }
        // Blank line — skip
        if (line.trim() === '') {
            i++;
            continue;
        }
        // Regular paragraph — accumulate consecutive non-special lines
        const paraLines = [];
        while (i < lines.length &&
            lines[i].trim() !== '' &&
            !lines[i].trim().startsWith('#') &&
            !lines[i].trim().startsWith('•') &&
            !lines[i].trim().startsWith('- ') &&
            !lines[i].trim().startsWith('>') &&
            !lines[i].trim().startsWith('```')) {
            paraLines.push(lines[i]);
            i++;
        }
        blocks.push(_jsx("p", { className: "text-sm text-ink-1 leading-relaxed my-1.5", children: linkify(paraLines.join(' ')) }, key++));
    }
    return _jsx("div", { className: className, children: blocks });
}
/**
 * Turns bare URLs in a string into clickable links,
 * returns an array of React nodes/strings.
 */
function linkify(text) {
    const urlRegex = /(https?:\/\/[^\s)]+)/g;
    const parts = text.split(urlRegex);
    return parts.map((part, idx) => {
        if (urlRegex.test(part) && part.startsWith('http')) {
            let display = part;
            try {
                const u = new URL(part);
                display = u.hostname.replace('www.', '') + (u.pathname !== '/' ? u.pathname : '');
                if (display.length > 45)
                    display = display.slice(0, 45) + '…';
            }
            catch { }
            return (_jsx("a", { href: part, target: "_blank", rel: "noopener noreferrer", className: "text-brand-bright hover:underline break-all", onClick: e => e.stopPropagation(), children: display }, idx));
        }
        return _jsx(React.Fragment, { children: part }, idx);
    });
}
