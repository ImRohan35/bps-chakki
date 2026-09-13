import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  // themeMode: 'light' | 'dark' | 'system'
  const [themeMode, setThemeMode] = useState(() => {
    return localStorage.getItem('bps_theme_mode') || localStorage.getItem('bps_theme') || 'system';
  });

  // systemTheme helper
  const getSystemTheme = () => {
    if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  };

  const [resolvedTheme, setResolvedTheme] = useState(() => {
    const saved = localStorage.getItem('bps_theme_mode') || localStorage.getItem('bps_theme') || 'system';
    if (saved === 'dark') return 'dark';
    if (saved === 'light') return 'light';
    return getSystemTheme();
  });

  useEffect(() => {
    let effective = themeMode;
    if (themeMode === 'system') {
      effective = getSystemTheme();
    }
    setResolvedTheme(effective);
    document.documentElement.setAttribute('data-theme', effective);
    localStorage.setItem('bps_theme_mode', themeMode);
    localStorage.setItem('bps_theme', effective);

    // Listen to OS preference changes when in system mode
    if (themeMode === 'system' && window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = (e) => {
        const next = e.matches ? 'dark' : 'light';
        setResolvedTheme(next);
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('bps_theme', next);
      };
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [themeMode]);

  const toggleTheme = () => {
    setThemeMode(prev => {
      if (prev === 'light') return 'dark';
      if (prev === 'dark') return 'system';
      return 'light';
    });
  };

  return (
    <ThemeContext.Provider value={{
      theme: resolvedTheme,
      resolvedTheme,
      themeMode,
      setThemeMode,
      toggleTheme
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

