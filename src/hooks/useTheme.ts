import { useCallback, useEffect, useState } from 'react';
export type Theme = 'light' | 'dark';
const STORAGE_KEY = 'autoflow-theme';

function getStoredTheme(): Theme | null {
    try {
        const savedTheme = localStorage.getItem(STORAGE_KEY);
        return savedTheme === 'light' || savedTheme === 'dark' ? savedTheme : null;
    } catch {
        return null;
    }
}

function getInitialTheme(): Theme {
    const storedTheme = getStoredTheme();
    if (storedTheme) return storedTheme;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function useTheme() {
    const [theme, setThemeState] = useState<Theme>(getInitialTheme);
    useEffect(() => {
        const root = document.documentElement;
        root.classList.toggle('dark', theme === 'dark');
        root.dataset.theme = theme;
        root.style.colorScheme = theme;
        try {
            localStorage.setItem(STORAGE_KEY, theme);
        } catch {
            return;
        }
    }, [theme]);
    const setTheme = useCallback((nextTheme: Theme) => {
        setThemeState(nextTheme);
    }, []);
    return { theme, setTheme };
}
