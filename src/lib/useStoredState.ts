'use client';

import { useCallback, useMemo, useSyncExternalStore } from 'react';

/**
 * A value kept in localStorage, read without an effect.
 *
 * The server and the first client render both see `fallback`, so hydration
 * matches; React then switches to the stored value. Every component using the
 * same key stays in step, and other tabs follow through the `storage` event.
 */
const EVENT = 'kcc-stored-state';

function subscribe(onChange: () => void) {
  window.addEventListener('storage', onChange);
  window.addEventListener(EVENT, onChange);
  return () => {
    window.removeEventListener('storage', onChange);
    window.removeEventListener(EVENT, onChange);
  };
}

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function useStoredState<T>(
  key: string,
  fallback: T,
  parse: (raw: string) => T = (raw) => JSON.parse(raw) as T,
  serialize: (value: T) => string = (value) => JSON.stringify(value)
): [T, (next: T | ((prev: T) => T)) => void] {
  const raw = useSyncExternalStore(subscribe, () => read(key), () => null);

  // Parsed once per stored string, so an object value keeps its identity
  // between renders and memos that depend on it stay put.
  const value = useMemo(() => {
    if (raw === null) return fallback;
    try {
      return parse(raw);
    } catch {
      return fallback;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [raw]);

  const set = useCallback(
    (next: T | ((prev: T) => T)) => {
      const current = read(key);
      let prev = fallback;
      if (current !== null) {
        try { prev = parse(current); } catch { prev = fallback; }
      }
      const resolved = typeof next === 'function' ? (next as (p: T) => T)(prev) : next;
      try {
        localStorage.setItem(key, serialize(resolved));
      } catch {
        /* storage full or blocked: the value still changes for this page */
      }
      window.dispatchEvent(new Event(EVENT));
    },
    // fallback/parse/serialize are expected to be stable for a given key
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key]
  );

  return [value, set];
}
