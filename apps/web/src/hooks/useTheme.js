import { useState, useEffect } from 'react';
export function useTheme() {
    const [theme, setTheme] = useState(() => {
        // Read from localStorage on first load
        return localStorage.getItem('memex_theme') ?? 'dark';
    });
    useEffect(() => {
        // Apply theme class to html element
        const html = document.documentElement;
        if (theme === 'light') {
            html.classList.add('light');
        }
        else {
            html.classList.remove('light');
        }
        localStorage.setItem('memex_theme', theme);
    }, [theme]);
    function toggle() {
        setTheme(prev => prev === 'dark' ? 'light' : 'dark');
    }
    return { theme, toggle };
}
