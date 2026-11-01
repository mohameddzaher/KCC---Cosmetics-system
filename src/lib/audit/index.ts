import { randomUUID } from 'node:crypto';
import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import AuditLog from '@/models/AuditLog';
import { clientIp } from '@/lib/rateLimit';
import { auditStorage, type AuditEvent, type AuditStore } from './context';
import { enrich, targetOfRequest } from './enrich';
import { redactBody } from './diff';

export { recordAudit, setAuditActor } from './context';

/**
 * The wrapper every route that changes something goes through.
 *
 * It opens the context the session and the model hooks fill in, then writes the
 * result once the handler has answered. The write is awaited because a
 * serverless host may freeze the process the moment the response leaves, and a
 * log that loses rows under load is worse than 50ms. It can never fail the
 * request: the action has already happened, and telling the person it did not
 * would be untrue.
 */

export interface AuditOptions {
  /** For a read worth recording, such as an export. Writes need no label. */
  action?: string;
  entity?: string;
}

function outcomeOf(status: number) {
  if (status === 401 || status === 403) return 'denied' as const;
  return status >= 400 ? ('failed' as const) : ('success' as const);
}

async function readBody(req: NextRequest): Promise<unknown> {
  if (req.method === 'GET' || req.method === 'HEAD') return undefined;
  const type = req.headers.get('content-type') || '';
  // An upload is described by the handler; the bytes do not belong in a log.
  if (!type.includes('application/json')) return undefined;
  try {
    const text = await req.clone().text();
    return text ? redactBody(JSON.parse(text)) : undefined;
  } catch {
    return undefined;
  }
}

async function errorOf(res: Response): Promise<string | undefined> {
  if (res.status < 400) return undefined;
  try {
    const body = await res.clone().json();
    return typeof body?.error === 'string' ? body.error.slice(0, 500) : undefined;
  } catch {
    return undefined;
  }
}

async function write(store: AuditStore, events: AuditEvent[], result: {
  status: number; error?: string; body?: unknown;
}) {
  const { actor } = store;
  const durationMs = Date.now() - store.startedAt;
  await enrich(events);
  const rows = events.map(({ refPaths: _used, ...e }, i) => ({
    ...e,
    userId: actor?.id,
    actorName: actor?.name,
    actorEmail: actor?.email,
    actorRole: actor?.role,
    outcome: outcomeOf(result.status),
    error: result.error,
    requestId: store.requestId,
    method: store.method,
    path: store.path,
    status: result.status,
    durationMs,
    // Once per request: a visit that moved a stage is one body, not two.
    body: i === 0 ? result.body : undefined,
    ip: store.ip,
    userAgent: store.userAgent,
  }));
  try {
    await connectDB();
    await AuditLog.insertMany(rows, { ordered: false });
  } catch (e) {
    console.error('[audit] could not record', store.method, store.path, e);
  }
}

export function audited<C extends unknown[]>(
  handler: (req: NextRequest, ...rest: C) => Promise<Response>,
  options: AuditOptions = {}
) {
  return async (req: NextRequest, ...rest: C): Promise<Response> => {
    const url = new URL(req.url);
    const store: AuditStore = {
      requestId: randomUUID(),
      ip: clientIp(req),
      userAgent: req.headers.get('user-agent')?.slice(0, 400) || undefined,
      method: req.method,
      path: url.pathname + url.search,
      startedAt: Date.now(),
      events: [],
      flushed: false,
    };

    return auditStorage.run(store, async () => {
      const body = await readBody(req);
      let status = 500;
      let error: string | undefined;
      try {
        const res = await handler(req, ...rest);
        status = res.status;
        error = await errorOf(res);
        return res;
      } catch (e) {
        error = e instanceof Error ? e.message.slice(0, 500) : 'Unhandled error';
        throw e;
      } finally {
        // Nothing changed: refused, failed, or a save with nothing new in it.
        // Still say what it was aimed at.
        const events: AuditEvent[] = store.events.length > 0
          ? store.events
          : [targetOfRequest(store.method, store.path, options)];
        store.flushed = true;
        store.lateFlush = (late) => write(store, late, { status });
        await write(store, events, { status, error, body });
      }
    });
  };
}
