'use client';

import { keepPreviousData, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { useCallback, useEffect } from 'react';

/**
 * Reading an admin endpoint without making anyone wait for it twice.
 *
 * Each CRM screen used to start empty, fetch, and show a spinner until the
 * answer came — on every visit, even to a page seen a moment ago. On the current
 * server every request costs about half a second, so moving around the CRM felt
 * like loading a new site each time. This shows the last answer at once and
 * refreshes it underneath; the wait only exists the first time.
 *
 * Kept in sessionStorage so a reload is instant too. That is customer data, so
 * it goes when the tab closes or the person signs out, rather than sitting in
 * localStorage on a shared office machine.
 */

const STORAGE_KEY = 'kcc-api-cache';
const MAX_BYTES = 3_000_000;
/** Only the CRM's reads. Nothing about money or the audit log is stored. */
const KEEP = '/api/crm/';

let activeClient: QueryClient | null = null;

async function fetchJson<T>(url: string): Promise<T> {
  const r = await fetch(url, { cache: 'no-store' });
  if (!r.ok) {
    const body = await r.json().catch(() => null);
    throw new Error(body?.error || 'Could not load this page');
  }
  return r.json();
}

function apiKey(url: string) {
  return ['api', url];
}

/** Called once, when the query client is created. */
export function keepApiCache(client: QueryClient) {
  activeClient = client;
  if (typeof window === 'undefined') return;

  try {
    const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '[]') as Array<[string, unknown, number]>;
    for (const [url, data, at] of saved) client.setQueryData(apiKey(url), data, { updatedAt: at });
  } catch {
    /* an unreadable cache is an empty one */
  }

  let timer: number | undefined;
  client.getQueryCache().subscribe(() => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      const rows = client.getQueryCache().getAll().flatMap((q) => {
        const url = q.queryKey[1];
        return q.queryKey[0] === 'api' && typeof url === 'string' && url.startsWith(KEEP) && q.state.data !== undefined
          ? [[url, q.state.data, q.state.dataUpdatedAt]]
          : [];
      });
      try {
        const text = JSON.stringify(rows);
        if (text.length < MAX_BYTES) sessionStorage.setItem(STORAGE_KEY, text);
      } catch {
        /* storage full: the in-memory cache still works */
      }
    }, 500);
  });
}

/** One person's data must not be shown to the next. */
export function clearApiCache() {
  activeClient?.clear();
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* nothing stored */
  }
}

export function useApi<T>(url: string | null, options: { poll?: number } = {}) {
  const query = useQuery<T, Error>({
    queryKey: apiKey(url || ''),
    queryFn: () => fetchJson<T>(url as string),
    enabled: !!url,
    // Show what is known, always ask again: the screen is never empty and never
    // stale for longer than one request.
    staleTime: 0,
    // Changing a filter keeps the current rows up until the new ones land.
    placeholderData: keepPreviousData,
    // Every screen built on this follows changes made elsewhere: quietly every
    // 30 s while the tab is visible (React Query pauses in the background),
    // and at once on coming back to the tab.
    refetchInterval: options.poll ?? 30000,
    refetchOnWindowFocus: true,
    retry: 1,
  });

  const { refetch } = query;
  const client = useQueryClient();
  return {
    data: query.data,
    /** False only until the very first answer, so this is when to show a skeleton. */
    ready: query.data !== undefined || query.isError,
    /** A failed refresh leaves the old data up; this says so. */
    error: query.error?.message ?? null,
    fetching: query.isFetching,
    reload: useCallback(async () => { await refetch(); }, [refetch]),
    /** Change the copy on hand now, for a drag that should not wait for the server. */
    patch: (update: (current: T | undefined) => T) => client.setQueryData<T>(apiKey(url || ''), update),
  };
}

/** Fetch ahead of a visit. Skipped when the copy on hand is under 30 seconds old. */
export function prefetchApi(client: QueryClient, url: string) {
  return client.prefetchQuery({ queryKey: apiKey(url), queryFn: () => fetchJson(url), staleTime: 30_000 }).catch(() => {});
}

/** The request each sidebar link's page opens with, so it can be fetched first. */
export const CRM_FIRST_REQUEST: Record<string, string> = {
  '/admin/crm': '/api/crm/dashboard',
  '/admin/crm/upcoming': '/api/crm/accounts?stage=upcoming&sort=recent&limit=200',
  '/admin/crm/current': '/api/crm/accounts?stage=current&sort=recent&limit=200',
  '/admin/crm/kpis': '/api/crm/kpis?period=week',
};

/** Warm the main CRM pages once the current one is idle, one at a time. */
export function useCrmWarmup(client: QueryClient, enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    const run = async () => {
      for (const url of Object.values(CRM_FIRST_REQUEST)) await prefetchApi(client, url);
    };
    const id = window.setTimeout(run, 1500);
    return () => window.clearTimeout(id);
  }, [client, enabled]);
}
