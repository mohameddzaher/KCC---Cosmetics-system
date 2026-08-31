'use client';

import type { ReactNode } from 'react';

/**
 * The one layout every option widget uses.
 *
 * Flex-wrap rather than CSS grid, on purpose. A grid shares one track
 * definition across every row, so a leftover item on the last row is pinned to
 * column one — which looked wrong under a centred question. Flex wrapping with
 * `justify-content: center` centres each row independently, including a
 * partial last row.
 *
 * Items still behave like a grid within a row: they share a common basis and
 * grow to fill it, capped by `max` so a lone item never stretches across the
 * whole page.
 */
export default function OptionGrid({
  children,
  min = '11rem',
  max,
  gap = '0.625rem',
  className = '',
}: {
  children: ReactNode;
  /** Smallest a tile may get before the row wraps. */
  min?: string;
  /** Largest a tile may grow to. Defaults to a little over `min`. */
  max?: string;
  gap?: string;
  className?: string;
}) {
  return (
    <div
      className={`option-grid flex w-full flex-wrap justify-center ${className}`}
      style={{
        gap,
        ['--opt-min' as string]: min,
        ['--opt-max' as string]: max ?? `calc(${min} * 1.3)`,
      }}
    >
      {children}
    </div>
  );
}

/** Shared "n of m selected" counter above a multi-select grid. */
export function SelectionCounter({ text }: { text: string }) {
  return <p className="mb-4 text-center text-xs font-medium tracking-wide text-cream-700">{text}</p>;
}
