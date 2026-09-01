'use client';

/**
 * Placeholder cards shown while a content list is still loading.
 *
 * The point is that it holds the page's height and rhythm without asserting
 * anything: nobody reads a skeleton and then watches it turn into different
 * words, which is what invented demo content did.
 */
export default function ContentSkeleton({
  count = 6,
  className = 'grid gap-6 sm:grid-cols-2 lg:grid-cols-3',
  height = 'h-72',
}: {
  count?: number;
  className?: string;
  height?: string;
}) {
  return (
    <div className={className} aria-hidden data-skeleton>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          data-skeleton
          className={`${height} animate-pulse rounded-2xl border border-cream-300 bg-cream-200/50`}
          style={{ animationDelay: `${i * 90}ms` }}
        />
      ))}
    </div>
  );
}
