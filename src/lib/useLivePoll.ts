'use client';

import { useEffect, useRef } from 'react';

/**
 * Calls `callback` on an interval to keep admin views live, and immediately
 * when the tab/window regains focus. Pauses while the tab is hidden to avoid
 * wasteful requests. The callback should be a stable (useCallback) reference.
 */
export function useLivePoll(callback: () => void, intervalMs = 15000, enabled = true) {
  const cbRef = useRef(callback);
  cbRef.current = callback;

  useEffect(() => {
    if (!enabled) return;

    const tick = () => {
      if (document.visibilityState === 'visible') cbRef.current();
    };

    const intervalId = window.setInterval(tick, intervalMs);

    const onFocus = () => cbRef.current();
    const onVisibility = () => {
      if (document.visibilityState === 'visible') cbRef.current();
    };

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [intervalMs, enabled]);
}
