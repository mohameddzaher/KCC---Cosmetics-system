import { NextRequest, NextResponse } from 'next/server';

/**
 * Lightweight in-memory rate limiter. Best-effort: it works well on a single
 * long-lived Node instance (Render) and still blunts bursts on serverless.
 * For hard multi-instance guarantees, back this with Redis (Upstash) later.
 */
type Bucket = { count: number; resetAt: number };
const store = new Map<string, Bucket>();

// Opportunistic cleanup so the map can't grow unbounded.
function sweep(now: number) {
  if (store.size < 5000) return;
  for (const [k, b] of store) if (b.resetAt < now) store.delete(k);
}

export function clientIp(req: NextRequest): string {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  return req.headers.get('x-real-ip') || req.headers.get('x-nf-client-connection-ip') || 'unknown';
}

/**
 * Returns a 429 NextResponse if the caller has exceeded `limit` requests within
 * `windowMs` for the given bucket, otherwise null.
 */
export function rateLimit(
  req: NextRequest,
  bucket: string,
  limit: number,
  windowMs: number
): NextResponse | null {
  const now = Date.now();
  sweep(now);
  const key = `${bucket}:${clientIp(req)}`;
  const existing = store.get(key);

  if (!existing || existing.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return null;
  }

  existing.count += 1;
  if (existing.count > limit) {
    const retry = Math.ceil((existing.resetAt - now) / 1000);
    return NextResponse.json(
      { error: 'Too many requests. Please try again shortly.' },
      { status: 429, headers: { 'Retry-After': String(retry) } }
    );
  }
  return null;
}
