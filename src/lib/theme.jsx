import React, { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext({ theme: 'light', setTheme: () => {} });

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    try {
      const stored = localStorage.getItem('theme');
      if (stored === 'light' || stored === 'dark') return stored;
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
    } catch (e) {}
    return 'light';
  });

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    html.setAttribute('data-theme', theme);
    // Also toggle helper classes for legacy CSS on both html and body
    html.classList.remove('light', 'dark');
    html.classList.add(theme);
    body.classList.remove('light', 'dark');
    body.classList.add(theme);
    try { localStorage.setItem('theme', theme); } catch (e) {}
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
