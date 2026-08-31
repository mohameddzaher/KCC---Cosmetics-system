'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

export type ThemePref = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'kcc-theme';

interface ThemeContextValue {
  /** What the user picked — may be 'system'. */
  theme: ThemePref;
  /** What is actually painted right now — always 'light' or 'dark'. */
  resolved: ResolvedTheme;
  setTheme: (t: ThemePref) => void;
  /** Convenience flip between light and dark (leaves 'system' behind). */
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function systemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(resolved: ResolvedTheme) {
  const root = document.documentElement;
  root.setAttribute('data-theme', resolved);
  root.style.colorScheme = resolved;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', resolved === 'dark' ? '#1B1B24' : '#F4F1ED');
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Server render and first client render must agree. The inline boot script in
  // the document head has already stamped data-theme, so there is no flash; we
  // just read it back on mount.
  const [theme, setThemeState] = useState<ThemePref>('light');
  const [resolved, setResolved] = useState<ResolvedTheme>('light');

  useEffect(() => {
    let saved: ThemePref = 'light';
    try {
      const raw = localStorage.getItem(THEME_STORAGE_KEY);
      if (raw === 'light' || raw === 'dark' || raw === 'system') saved = raw;
    } catch {
      /* private mode — fall back to light */
    }
    const next = saved === 'system' ? systemTheme() : saved;
    setThemeState(saved);
    setResolved(next);
    applyTheme(next);
    document.documentElement.classList.remove('theme-booting');
  }, []);

  // Follow the OS only while the preference is literally 'system'.
  useEffect(() => {
    if (theme !== 'system' || typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      const next = systemTheme();
      setResolved(next);
      applyTheme(next);
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [theme]);

  const setTheme = useCallback((t: ThemePref) => {
    const next = t === 'system' ? systemTheme() : t;
    setThemeState(t);
    setResolved(next);
    applyTheme(next);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, t);
    } catch {
      /* ignore */
    }
  }, []);

  const toggle = useCallback(() => {
    setTheme(resolved === 'dark' ? 'light' : 'dark');
  }, [resolved, setTheme]);

  return (
    <ThemeContext.Provider value={{ theme, resolved, setTheme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}

/**
 * Runs before first paint so the correct theme is stamped on <html> and the
 * user never sees a light flash on a dark-mode reload.
 * Injected verbatim into the document head by the root layout.
 */
export const THEME_BOOT_SCRIPT = `(function(){try{
var k='${THEME_STORAGE_KEY}';var p=localStorage.getItem(k)||'light';
var r=p==='system'?(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):(p==='dark'?'dark':'light');
var e=document.documentElement;e.setAttribute('data-theme',r);e.style.colorScheme=r;e.classList.add('theme-booting');
var l=localStorage.getItem('kcc-locale');if(l==='ar'||l==='en'){e.lang=l;e.dir=l==='ar'?'rtl':'ltr';}
}catch(err){document.documentElement.setAttribute('data-theme','light');}})();`;
