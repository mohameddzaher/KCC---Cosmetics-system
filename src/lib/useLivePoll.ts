'use client';

import { useEffect, useEffectEvent } from 'react';

/**
 * Calls `callback` on an interval to keep admin views live, and immediately
 * when the tab/window regains focus. Pauses while the tab is hidden to avoid
 * wasteful requests. The callback should be a stable (useCallback) reference.
 */
export function useLivePoll(callback: () => void, intervalMs = 15000, enabled = true) {
  // Always the latest callback, without restarting the timer when it changes.
  const run = useEffectEvent(() => callback());

  useEffect(() => {
    if (!enabled) return;

    const tick = () => {
      if (document.visibilityState === 'visible') run();
    };

    const intervalId = window.setInterval(tick, intervalMs);

    const onFocus = () => run();
    const onVisibility = () => {
      if (document.visibilityState === 'visible') run();
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
