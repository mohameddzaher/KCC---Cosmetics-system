'use client';
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { Locale, defaultLocale, getDictionary } from '@/i18n/dictionaries';

interface LanguageContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
  dir: 'ltr' | 'rtl';
  dict: ReturnType<typeof getDictionary>;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(defaultLocale);
  const [dict, setDict] = useState(getDictionary(defaultLocale));

  useEffect(() => {
    const saved = localStorage.getItem('kcc-locale') as Locale;
    if (saved && (saved === 'en' || saved === 'ar')) {
      setLocaleState(saved);
      setDict(getDictionary(saved));
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr';
  }, [locale]);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    setDict(getDictionary(newLocale));
    localStorage.setItem('kcc-locale', newLocale);
    document.documentElement.lang = newLocale;
    document.documentElement.dir = newLocale === 'ar' ? 'rtl' : 'ltr';
  }, []);

  const t = useCallback((key: string): string => {
    const keys = key.split('.');
    let current: any = dict;
    for (const k of keys) {
      if (current && typeof current === 'object' && k in current) {
        current = current[k];
      } else {
        return key;
      }
    }
    return typeof current === 'string' ? current : key;
  }, [dict]);

  const dir = locale === 'ar' ? 'rtl' : 'ltr';

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t, dir, dict }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within LanguageProvider');
  return context;
}

// Helper to get bilingual field value
export function getLocalizedField(field: { en?: string; ar?: string } | undefined, locale: Locale): string {
  if (!field) return '';
  return field[locale] || field.en || '';
}
