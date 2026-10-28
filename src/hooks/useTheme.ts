import { useEffect, useState } from 'react';
import { ThemeMode } from '../types';

export function useTheme() {
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('citoled_theme') as ThemeMode;
    if (saved === 'light' || saved === 'dark') {
      return saved;
    }
    return 'dark'; // Mặc định chế độ Ban đêm (Dark mode) cho ứng dụng điều khiển đèn LED
  });

  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('citoled_theme');
    return saved === 'light' ? 'light' : 'dark';
  });

  useEffect(() => {
    const isDark = themeMode === 'dark';
    setResolvedTheme(isDark ? 'dark' : 'light');

    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
      root.style.colorScheme = 'dark';
      document.body.classList.add('dark');
    } else {
      root.classList.remove('dark');
      root.style.colorScheme = 'light';
      document.body.classList.remove('dark');
    }

    try {
      localStorage.setItem('citoled_theme', themeMode);
    } catch {
      // ignore
    }
  }, [themeMode]);

  const toggleTheme = () => {
    setThemeMode((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  return {
    themeMode,
    setThemeMode,
    resolvedTheme,
    toggleTheme,
  };
}
