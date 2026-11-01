import { Types } from 'mongoose';
import { escapeRegex } from '@/lib/api-helpers';

/** The log's filters, shared by the screen and its export so the two agree. */
export function auditFilter(p: URLSearchParams): Record<string, unknown> {
  const filter: Record<string, unknown> = {};

  const userId = p.get('userId');
  if (userId && Types.ObjectId.isValid(userId)) filter.userId = new Types.ObjectId(userId);

  for (const key of ['entity', 'entityId', 'action', 'outcome', 'requestId']) {
    const v = p.get(key);
    if (v && v !== 'all') filter[key] = v;
  }

  const from = p.get('from');
  const to = p.get('to');
  const range: Record<string, Date> = {};
  if (from && !Number.isNaN(Date.parse(from))) range.$gte = new Date(`${from}T00:00:00`);
  if (to && !Number.isNaN(Date.parse(to))) range.$lte = new Date(`${to}T23:59:59.999`);
  if (Object.keys(range).length > 0) filter.createdAt = range;

  const all: Array<Record<string, unknown>> = [];

  // Everything concerning one record: changes to it, and to anything pointing at it.
  const subject = p.get('subject');
  if (subject) all.push({ $or: [{ entityId: subject }, { 'subjects.id': subject }] });

  const q = (p.get('q') || '').trim();
  if (q) {
    const rx = new RegExp(escapeRegex(q), 'i');
    all.push({
      $or: [
        { entityLabel: rx }, { actorName: rx }, { actorEmail: rx },
        { path: rx }, { entityId: rx }, { ip: rx },
        { 'subjects.label': rx }, { 'changes.field': rx },
        { 'changes.fromLabel': rx }, { 'changes.toLabel': rx },
      ],
    });
  }
  if (all.length > 0) filter.$and = all;
  return filter;
}

/** Rows from before the log named people carry only their id. */
export function withActor<T extends Record<string, unknown>>(row: T) {
  const legacy = row.userId as { _id?: unknown; name?: string; email?: string; role?: string } | undefined;
  const populated = legacy && typeof legacy === 'object' && 'name' in legacy;
  return {
    ...row,
    userId: populated ? String(legacy._id) : row.userId,
    actorName: row.actorName || (populated ? legacy.name : undefined),
    actorEmail: row.actorEmail || (populated ? legacy.email : undefined),
    actorRole: row.actorRole || (populated ? legacy.role : undefined),
  };
}
