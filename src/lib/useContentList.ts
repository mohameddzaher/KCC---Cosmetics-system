'use client';

import { useEffect, useState } from 'react';

/**
 * Fetch a published content list without flashing placeholder copy first.
 *
 * Three pages did the same thing: seed state with a hardcoded demo list, fetch
 * the real one, and swap. On every load you saw invented products, factories
 * and headlines for a moment and then the real ones — which looks like the
 * site is correcting itself in front of the visitor.
 *
 * The rule here, and it is the only rule worth having:
 *
 *   still loading      -> render nothing yet (`ready` is false)
 *   loaded with data   -> render the data
 *   loaded and empty   -> render the shipped fallback
 *
 * The fallback is a genuine empty state, never a stand-in for content that is
 * on its way.
 */
export function useContentList<T>(
  endpoint: string,
  map: (raw: Record<string, unknown>, index: number) => T,
  fallback: T[]
): { items: T[]; ready: boolean } {
  const [state, setState] = useState<{ items: T[]; ready: boolean }>({
    items: [],
    ready: false,
  });

  useEffect(() => {
    let alive = true;
    fetch(endpoint, { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!alive) return;
        const raw = Array.isArray(data) ? data : data?.items || [];
        setState({
          items: raw.length > 0 ? raw.map(map) : fallback,
          ready: true,
        });
      })
      .catch(() => {
        // Offline or the API is down: the shipped copy is better than a blank
        // page, and by now nothing else has been shown.
        if (alive) setState({ items: fallback, ready: true });
      });
    return () => {
      alive = false;
    };
    // `map` and `fallback` are module constants at every call site.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint]);

  return state;
}
