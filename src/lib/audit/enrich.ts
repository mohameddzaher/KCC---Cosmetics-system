import mongoose from 'mongoose';
// Imported for their side effect: a route that never touched these still needs
// them registered for their names to be looked up.
import '@/models/User';
import '@/models/Order';
import '@/models/CrmAccount';
import '@/models/InventoryItem';
import '@/models/ProductCode';
import '@/models/PromoCode';
import '@/models/Invoice';
import type { AuditEvent } from './context';
import { labelOf } from './diff';

/**
 * Turning ids into names, once, at the moment of the event.
 *
 * Read later, a renamed customer would rewrite history and a deleted one would
 * leave a bare id. Stored here, the log says what was true when it happened.
 */

const LABEL_FIELDS = 'orderNumber invoiceNumber name nameEn titleEn title code email label product role';

/** `/api/crm/accounts/...` to the record it is about, for a request that changed nothing. */
const ROUTE_MODELS: Array<[RegExp, string]> = [
  [/^\/api\/crm\/accounts/, 'CrmAccount'],
  [/^\/api\/crm\/catalogue/, 'ProductCode'],
  [/^\/api\/orders/, 'Order'],
  [/^\/api\/customers/, 'User'],
  [/^\/api\/users/, 'User'],
  [/^\/api\/inventory/, 'InventoryItem'],
  [/^\/api\/promos/, 'PromoCode'],
  [/^\/api\/accounting\/invoices/, 'Invoice'],
  [/^\/api\/accounting\/payments/, 'Payment'],
  [/^\/api\/accounting\/expenses/, 'Expense'],
  [/^\/api\/categories/, 'Category'],
  [/^\/api\/referrals/, 'Referral'],
];

const VERBS: Record<string, string> = { POST: 'create', PUT: 'update', PATCH: 'update', DELETE: 'delete' };

export function targetOfRequest(
  method: string,
  fullPath: string,
  options: { action?: string; entity?: string }
): AuditEvent {
  const path = fullPath.split('?')[0];
  const model = ROUTE_MODELS.find(([rx]) => rx.test(path))?.[1];
  const parts = path.split('/').filter(Boolean).slice(1);
  return {
    action: options.action || VERBS[method] || 'request',
    entity: options.entity || model || parts.filter((p) => !/^[0-9a-f]{24}$/i.test(p)).join('/') || 'api',
    entityId: path.match(/\/([0-9a-f]{24})(?:\/|$)/i)?.[1],
  };
}

async function namesOf(model: string, ids: string[]) {
  const Model = mongoose.models[model];
  if (!Model) return new Map<string, Record<string, unknown>>();
  const docs = (await Model.find({ _id: { $in: ids } }).select(LABEL_FIELDS).lean()) as unknown as Array<Record<string, unknown>>;
  return new Map(docs.map((d) => [String(d._id), d]));
}

/** Change the events in place. Never throws: a missing name is not worth losing a row. */
export async function enrich(events: AuditEvent[]) {
  try {
    const wanted = new Map<string, Set<string>>();
    const want = (model: string, id: unknown) => {
      if (typeof id !== 'string' || !/^[0-9a-f]{24}$/i.test(id)) return;
      if (!wanted.has(model)) wanted.set(model, new Set());
      wanted.get(model)?.add(id);
    };
    const refOf = (e: AuditEvent, field: string) => e.refPaths?.[field.replace(/\.\d+(?=\.|$)/g, '.$')];

    for (const e of events) {
      for (const s of e.subjects || []) want(s.model, s.id);
      for (const c of e.changes || []) {
        const model = refOf(e, c.field);
        if (!model) continue;
        for (const v of [c.from, c.to].flat()) want(model, v);
      }
      if (e.entityId && !e.entityLabel && mongoose.models[e.entity]) want(e.entity, e.entityId);
    }

    const found = new Map(
      await Promise.all([...wanted].map(async ([m, ids]) => [m, await namesOf(m, [...ids])] as const))
    );
    const nameOf = (model: string, id: unknown) => labelOf(found.get(model)?.get(String(id)));
    const names = (model: string, v: unknown) =>
      (Array.isArray(v) ? v : [v]).map((x) => nameOf(model, x) || '').filter(Boolean).join('، ') || undefined;

    for (const e of events) {
      e.subjects = (e.subjects || [])
        .map((s) => ({ ...s, label: nameOf(s.model, s.id), role: found.get(s.model)?.get(s.id)?.role as string | undefined }))
        // An id with no name behind it would only be noise on the screen.
        .filter((s) => s.label);
      for (const c of e.changes || []) {
        const model = refOf(e, c.field);
        if (!model) continue;
        c.fromLabel = names(model, c.from);
        c.toLabel = names(model, c.to);
      }
      if (e.entityId && !e.entityLabel) {
        const doc = found.get(e.entity)?.get(e.entityId);
        e.entityLabel = labelOf(doc);
        if (e.entity === 'User') e.entityRole = doc?.role as string | undefined;
      }
    }
  } catch (err) {
    console.error('[audit] could not resolve names', err);
  }
}
