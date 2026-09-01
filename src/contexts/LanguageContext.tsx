'use client';
import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import { Locale, defaultLocale, getDictionary } from '@/i18n/dictionaries';
import { translateString } from '@/i18n/strings';

type Vars = Record<string, string | number>;

interface LanguageContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  /**
   * Translate a dot-path key. Supports `{name}` placeholders:
   *   t('quiz.questionOf', { current: 2, total: 9 })
   * Returns the key itself when missing so the gap is obvious on screen.
   */
  t: (key: string, vars?: Vars) => string;
  /**
   * The list form of `t`, for dictionary entries that are arrays of strings —
   * bullet lists that must stay in step across both languages.
   * Returns an empty array when the key is missing or is not a list.
   */
  tArr: (key: string) => string[];
  /** Pick the right half of a bilingual `{ en, ar }` field from the database. */
  tf: (field: { en?: string; ar?: string } | undefined | null, fallback?: string) => string;
  /** Pick between two parallel fields, e.g. titleEn / titleAr. */
  pick: (en: string | undefined | null, ar: string | undefined | null) => string;
  /**
   * Translate by English source string (admin chrome). Falls back to the
   * English text when no translation exists, so a gap is visible, not fatal.
   */
  tx: (en: string) => string;
  dir: 'ltr' | 'rtl';
  isRTL: boolean;
  dict: ReturnType<typeof getDictionary>;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const STORAGE_KEY = 'kcc-locale';

function interpolate(template: string, vars?: Vars): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
}

export function LanguageProvider({
  children,
  initialLocale,
}: {
  children: React.ReactNode;
  /** Resolved from the cookie on the server so the first render is correct. */
  initialLocale?: Locale;
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale || defaultLocale);

  /*
   * The cookie is the source of truth and the server has already applied it,
   * so there is normally nothing to do here. This only covers a visitor whose
   * choice predates the cookie: read it once from storage, adopt it, and write
   * the cookie so every later request is right from the server.
   */
  useEffect(() => {
    if (initialLocale) return;
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as Locale | null;
      if (saved === 'en' || saved === 'ar') {
        setLocaleState(saved);
        document.cookie = `${STORAGE_KEY}=${saved}; path=/; max-age=31536000; samesite=lax`;
      }
    } catch {
      /* private mode — stay on the default */
    }
  }, [initialLocale]);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr';
  }, [locale]);

  const dict = useMemo(() => getDictionary(locale), [locale]);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    try {
      localStorage.setItem(STORAGE_KEY, newLocale);
      // The cookie is what the server reads on the next request.
      document.cookie = `${STORAGE_KEY}=${newLocale}; path=/; max-age=31536000; samesite=lax`;
    } catch {
      /* ignore */
    }
    document.documentElement.lang = newLocale;
    document.documentElement.dir = newLocale === 'ar' ? 'rtl' : 'ltr';
  }, []);

  const t = useCallback(
    (key: string, vars?: Vars): string => {
      const keys = key.split('.');
      let current: unknown = dict;
      for (const k of keys) {
        if (current && typeof current === 'object' && k in (current as object)) {
          current = (current as Record<string, unknown>)[k];
        } else {
          if (process.env.NODE_ENV === 'development') {
            console.warn(`[i18n] missing key "${key}" for locale "${locale}"`);
          }
          return key;
        }
      }
      return typeof current === 'string' ? interpolate(current, vars) : key;
    },
    [dict, locale]
  );

  /**
   * The list form of `t`. A few dictionary entries are arrays — bullet lists
   * that have to stay in step between the two languages — and `t` returns the
   * key for anything that is not a string.
   */
  const tArr = useCallback(
    (key: string): string[] => {
      const keys = key.split('.');
      let current: unknown = dict;
      for (const k of keys) {
        if (current && typeof current === 'object' && k in (current as object)) {
          current = (current as Record<string, unknown>)[k];
        } else {
          if (process.env.NODE_ENV === 'development') {
            console.warn(`[i18n] missing list "${key}" for locale "${locale}"`);
          }
          return [];
        }
      }
      return Array.isArray(current) ? current.filter((x): x is string => typeof x === 'string') : [];
    },
    [dict, locale]
  );

  const tf = useCallback(
    (field: { en?: string; ar?: string } | undefined | null, fallback = ''): string => {
      if (!field) return fallback;
      return field[locale] || field.en || field.ar || fallback;
    },
    [locale]
  );

  const pick = useCallback(
    (en: string | undefined | null, ar: string | undefined | null): string => {
      if (locale === 'ar') return ar || en || '';
      return en || ar || '';
    },
    [locale]
  );

  const tx = useCallback((en: string) => translateString(en, locale), [locale]);

  const dir: 'ltr' | 'rtl' = locale === 'ar' ? 'rtl' : 'ltr';

  const value = useMemo(
    () => ({ locale, setLocale, t, tArr, tf, pick, tx, dir, isRTL: locale === 'ar', dict }),
    [locale, setLocale, t, tArr, tf, pick, tx, dir, dict]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within LanguageProvider');
  return context;
}

// Helper to get bilingual field value outside of React.
export function getLocalizedField(field: { en?: string; ar?: string } | undefined, locale: Locale): string {
  if (!field) return '';
  return field[locale] || field.en || '';
}
