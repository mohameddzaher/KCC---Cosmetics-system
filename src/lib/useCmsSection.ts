'use client';

import { useEffect, useMemo, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

/**
 * Read one CMS section, in the reader's language.
 *
 * The CMS Manager had sections for the homepage hero, the numbers and the
 * process steps, and they were saved and published — but the components that
 * render those sections never read them, so editing them changed nothing on
 * the site. This is the missing link.
 *
 * Whatever the admin has filled in is layered over the component's own
 * defaults, one field at a time. So a half-filled section is fine: the fields
 * they wrote are used, the rest stay as shipped, and the page never renders
 * blank because someone cleared a box.
 */
export function useCmsSection<T extends Record<string, unknown>>(
  type: string,
  defaults: Record<'en' | 'ar', T>
): { content: T; ready: boolean } {
  const { locale } = useLanguage();
  const [state, setState] = useState<{
    fields: { en?: Partial<T>; ar?: Partial<T> } | null;
    ready: boolean;
  }>({ fields: null, ready: false });

  useEffect(() => {
    let alive = true;
    fetch(`/api/cms?type=${encodeURIComponent(type)}&enabled=true`, { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!alive) return;
        const list = Array.isArray(data) ? data : data?.sections || data?.items || [];
        const first = list[0];
        setState({ fields: first?.fields || null, ready: true });
      })
      .catch(() => {
        /* The page keeps its built-in copy — never blank because a fetch failed. */
        if (alive) setState({ fields: null, ready: true });
      });
    return () => {
      alive = false;
    };
  }, [type]);

  const fields = state.fields;

  /*
   * `ready` matters for any section whose SHAPE can change, not just its
   * wording. The process strip ships with six steps and the CMS holds four,
   * so rendering the defaults first and swapping made two steps appear and
   * vanish again mid-animation. A section like that waits; one that only
   * swaps text does not have to.
   */
  const content = useMemo(() => {
    const lang: 'en' | 'ar' = locale === 'ar' ? 'ar' : 'en';
    const base = defaults[lang];
    const custom = (fields?.[lang] || {}) as Partial<T>;

    const merged = { ...base };
    for (const [key, value] of Object.entries(custom)) {
      // An empty string or an empty list means "not filled in", not "erase it".
      const isEmpty =
        value == null || value === '' || (Array.isArray(value) && value.length === 0);
      if (!isEmpty) (merged as Record<string, unknown>)[key] = value;
    }
    return merged;
    // `defaults` is a module constant at every call site.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fields, locale]);

  return { content, ready: state.ready };
}
