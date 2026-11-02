import type { MongooseQueryMiddleware, Query, Schema } from 'mongoose';
import { currentAudit, recordAudit, type AuditSubject } from './context';
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

/** Who created a row is already the actor; naming them again says nothing. */
const NOT_SUBJECTS = /^(byId|authorId|createdBy|staffResponderId)$/;

/**
 * Every field of this schema that points at another record, read from the
 * schema itself. Nothing to maintain per model, and a reference added next year
 * is picked up without anyone touching this.
 */
export function refPathsOf(schema: Schema, prefix = ''): Record<string, string> {
  const out: Record<string, string> = {};
  schema.eachPath((name, type) => {
    const path = prefix ? `${prefix}.${name}` : name;
    const t = type as unknown as {
      options?: { ref?: unknown };
      caster?: { options?: { ref?: unknown } };
      embeddedSchemaType?: { options?: { ref?: unknown } };
      schema?: Schema;
    };
    const ref = t.options?.ref ?? t.caster?.options?.ref ?? t.embeddedSchemaType?.options?.ref;
    if (typeof ref === 'string') out[path] = ref;
    if (t.schema) Object.assign(out, refPathsOf(t.schema, `${path}.$`));
  });
  return out;
}

function valueAt(doc: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((v, k) => (v && typeof v === 'object' ? (v as Record<string, unknown>)[k] : undefined), doc);
}

function subjectsOf(doc: unknown, refs: Record<string, string>): AuditSubject[] {
  const out: AuditSubject[] = [];
  for (const [field, model] of Object.entries(refs)) {
    if (field.includes('$') || NOT_SUBJECTS.test(field.split('.').pop() as string)) continue;
    const v = valueAt(doc, field);
    for (const id of (Array.isArray(v) ? v : [v]).slice(0, 10)) {
      if (id) out.push({ field, model, id: String(id) });
    }
  }
  return out;
}

function record(entity: string, before: Lean | null, after: Lean | null, refs: Record<string, string>) {
  const { changes, truncated } = diffDocuments(before, after);
  if (before && after && changes.length === 0) return;
  const doc = after || before;
  recordAudit({
    action: !before ? 'create' : !after ? 'delete' : 'update',
    entity,
    entityId: String(doc?._id),
    entityLabel: labelOf(doc),
    entityRole: entity === 'User' ? (doc?.role as string | undefined) : undefined,
    subjects: subjectsOf(doc, refs),
    refPaths: refs,
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

/** Paths a schema keeps out of queries by default; the trail still wants them. */
function hiddenPathsOf(schema: Schema): string[] {
  const out: string[] = [];
  schema.eachPath((path, type) => {
    if ((type as unknown as { options?: { select?: boolean } }).options?.select === false) out.push(path);
  });
  return out;
}

export function auditTrail(schema: Schema) {
  const refs = refPathsOf(schema);
  const hidden = hiddenPathsOf(schema);
  const withHidden = hidden.map((p) => `+${p}`).join(' ');

  /* ---- save(), and so create() ---- */
  schema.pre('save', async function () {
    if (!currentAudit()) return;
    const model = this.constructor as unknown as { findById(id: unknown): { select(s: string): { lean(): Promise<Lean | null> } } };
    this.$locals.auditBefore = this.isNew ? null : await model.findById(this._id).select(withHidden).lean();
  });

  schema.post('save', function (doc) {
    if (!currentAudit()) return;
    const after = doc.toObject({ depopulate: true, flattenMaps: true }) as Lean;
    const before = (doc.$locals.auditBefore as Lean) || null;
    // A document loaded without a hidden path did not touch it; comparing it
    // against the stored value would report it removed.
    if (before) for (const p of hidden) if (!doc.isSelected(p)) delete before[p];
    record((doc.constructor as unknown as { modelName: string }).modelName, before, after, refs);
  });

  /* ---- insertMany ---- */
  schema.post('insertMany', function (result: unknown) {
    if (!currentAudit()) return;
    const docs = result as Array<{ toObject?: () => Lean }>;
    const entity = (this as unknown as { modelName: string }).modelName;
    for (const d of docs) record(entity, null, (d.toObject ? d.toObject() : d) as Lean, refs);
  });

  /* ---- everything written through a query, doc.deleteOne() included ---- */
  schema.pre(QUERY_WRITES, { document: false, query: true }, async function (this: AuditedQuery) {
    if (!currentAudit()) return;
    const rows = (await this.model.find(this.getFilter()).select(withHidden).limit(BULK_CAP + 1).lean()) as unknown as Lean[];
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
      const created = (await model.findOne(this.getFilter()).select(withHidden).lean()) as unknown as Lean | null;
      if (created) record(entity, null, created, refs);
      return;
    }

    const now = (await model.find({ _id: { $in: before.map((b) => b._id) } }).select(withHidden).lean()) as unknown as Lean[];
    const afterById = new Map(now.map((d) => [String(d._id), d]));
    for (const b of before) record(entity, b, afterById.get(String(b._id)) || null, refs);
  });
}
