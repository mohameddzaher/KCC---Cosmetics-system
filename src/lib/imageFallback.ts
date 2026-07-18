import type { SyntheticEvent } from 'react';

/** A safe, always-available fallback image for broken/missing card images. */
export const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=1000&q=80';

/** Swap a broken <img> to the fallback (guards against an infinite loop). */
export function onImgError(e: SyntheticEvent<HTMLImageElement>) {
  const el = e.currentTarget;
  if (el.dataset.fallbackApplied) return;
  el.dataset.fallbackApplied = 'true';
  el.src = FALLBACK_IMAGE;
}
