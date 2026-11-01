import type { MongooseQueryMiddleware, Query, Schema } from 'mongoose';
import { currentAudit, recordAudit } from './context';
import { diffDocuments, labelOf } from './diff';

/**
 * Records what every write actually did, at the only level that cannot be
 * forgotten: the model.
 *
 * A route that logged its own changes would log what it meant to do, and only
 * if someone remembered. This reads the document before and after, so the row
 * says what really changed — including writes made in passing, like the stage
 * move a logged visit causes or the activities removed with a customer.
 *
 * Applied per schema, and only active inside an audited request. Seed and import
 * scripts run outside one and write thousands of rows; recording each would
 * bury the log and slow them for no reader.
 */

/** Past this, one write is reported as a count rather than row by row. */
const BULK_CAP = 300;

type Lean = Record<string, unknown> & { _id: unknown };

function record(entity: string, before: Lean | null, after: Lean | null) {
  const { changes, truncated } = diffDocuments(before, after);
  if (before && after && changes.length === 0) return;
  const doc = after || before;
  recordAudit({
    action: !before ? 'create' : !after ? 'delete' : 'update',
    entity,
    entityId: String(doc?._id),
    entityLabel: labelOf(doc),
    changes,
    truncated,
  });
}

const QUERY_WRITES = [
  'updateOne', 'updateMany', 'replaceOne',
  'findOneAndUpdate', 'findOneAndReplace', 'findOneAndDelete',
  'deleteOne', 'deleteMany',
] as MongooseQueryMiddleware[];

type AuditedQuery = Query<unknown, unknown> & { op?: string; $auditBefore?: Lean[]; $auditCapped?: boolean };

export function auditTrail(schema: Schema) {
  /* ---- save(), and so create() ---- */
  schema.pre('save', async function () {
    if (!currentAudit()) return;
    const model = this.constructor as unknown as { findById(id: unknown): { lean(): Promise<Lean | null> } };
    this.$locals.auditBefore = this.isNew ? null : await model.findById(this._id).lean();
  });

  schema.post('save', function (doc) {
    if (!currentAudit()) return;
    const after = doc.toObject({ depopulate: true, flattenMaps: true }) as Lean;
    record((doc.constructor as unknown as { modelName: string }).modelName, (doc.$locals.auditBefore as Lean) || null, after);
  });

  /* ---- insertMany ---- */
  schema.post('insertMany', function (result: unknown) {
    if (!currentAudit()) return;
    const docs = result as Array<{ toObject?: () => Lean }>;
    const entity = (this as unknown as { modelName: string }).modelName;
    for (const d of docs) record(entity, null, (d.toObject ? d.toObject() : d) as Lean);
  });

  /* ---- everything written through a query, doc.deleteOne() included ---- */
  schema.pre(QUERY_WRITES, { document: false, query: true }, async function (this: AuditedQuery) {
    if (!currentAudit()) return;
    const rows = (await this.model.find(this.getFilter()).limit(BULK_CAP + 1).lean()) as unknown as Lean[];
    this.$auditCapped = rows.length > BULK_CAP;
    this.$auditBefore = rows.slice(0, BULK_CAP);
  });

  schema.post(QUERY_WRITES, { document: false, query: true }, async function (this: AuditedQuery) {
    if (!currentAudit() || !this.$auditBefore) return;
    const model = this.model;
    const entity = model.modelName;
    const before = this.$auditBefore;

    if (this.$auditCapped) {
      recordAudit({
        action: this.op?.startsWith('delete') ? 'delete' : 'update',
        entity,
        entityLabel: `More than ${BULK_CAP} documents`,
        details: { filter: JSON.stringify(this.getFilter()).slice(0, 1000), update: JSON.stringify(this.getUpdate() ?? null).slice(0, 2000) },
      });
      return;
    }

    if (before.length === 0) {
      // Nothing matched, so only an upsert can have written anything.
      if (!(this.getOptions() as { upsert?: boolean }).upsert) return;
      const created = (await model.findOne(this.getFilter()).lean()) as unknown as Lean | null;
      if (created) record(entity, null, created);
      return;
    }

    const now = (await model.find({ _id: { $in: before.map((b) => b._id) } }).lean()) as unknown as Lean[];
    const afterById = new Map(now.map((d) => [String(d._id), d]));
    for (const b of before) record(entity, b, afterById.get(String(b._id)) || null);
  });
}
