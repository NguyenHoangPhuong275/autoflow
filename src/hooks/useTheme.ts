import { useCallback, useEffect, useState } from 'react';
export type Theme = 'light' | 'dark';
const STORAGE_KEY = 'autoflow-theme';
function getInitialTheme(): Theme {
    const savedTheme = localStorage.getItem(STORAGE_KEY);
    if (savedTheme === 'light' || savedTheme === 'dark')
        return savedTheme;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}
export function useTheme() {
    const [theme, setThemeState] = useState<Theme>(getInitialTheme);
    useEffect(() => {
        const root = document.documentElement;
        root.classList.toggle('dark', theme === 'dark');
        root.dataset.theme = theme;
        root.style.colorScheme = theme;
        localStorage.setItem(STORAGE_KEY, theme);
    }, [theme]);
    const setTheme = useCallback((nextTheme: Theme) => {
        setThemeState(nextTheme);
    }, []);
    return { theme, setTheme };
}
