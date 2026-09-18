import React, { useCallback, useEffect, useState } from 'react';
import { type ThemeName, themes, DEFAULT_THEME } from './theme';
import { ThemeContext, type ThemeContextValue } from './useTheme';

const STORAGE_KEY = 'ui_theme';

function readStoredTheme(): ThemeName {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'liquid-glass' || stored === 'deep-space') return stored;
  } catch {
    // ignore
  }
  return DEFAULT_THEME;
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [themeName, setThemeName] = useState<ThemeName>(readStoredTheme);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, themeName);
    } catch {
      // ignore
    }
  }, [themeName]);

  const setTheme = useCallback((name: ThemeName) => setThemeName(name), []);
  const toggleTheme = useCallback(
    () =>
      setThemeName((prev) =>
        prev === 'liquid-glass' ? 'deep-space' : 'liquid-glass'
      ),
    []
  );

  const value: ThemeContextValue = {
    theme: themes[themeName],
    themeName,
    setTheme,
    toggleTheme,
  };

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
};
