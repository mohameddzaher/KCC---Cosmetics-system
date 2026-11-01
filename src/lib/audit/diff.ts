import type { AuditChange } from './context';

/**
 * Turning two versions of a document into the exact fields that differ.
 *
 * Pure, and free of Mongoose, so it can be tested without a database and so
 * nothing about it depends on how the write was made.
 */

export const MASK = '••••••••';

/** Never stored, from either side of a change. That it changed is still recorded. */
const SENSITIVE = /(password|passwd|pass$|secret|token|otp$|api_?key|private_?key|credential)/i;

/** Bookkeeping a person reading the log would only have to skip over. */
const IGNORED = new Set(['updatedAt', 'createdAt', '__v', 'nameKey', 'matchKeys', 'lastLogin', 'lastLoginAt']);

const MAX_VALUE = 2000;
export const MAX_CHANGES = 200;

export function isSensitive(field: string): boolean {
  const last = field.split('.').filter((s) => !/^\d+$/.test(s)).pop() || field;
  return SENSITIVE.test(last);
}

function isObjectId(v: unknown): v is { toHexString(): string } {
  return typeof (v as { toHexString?: unknown })?.toHexString === 'function';
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  if (v === null || typeof v !== 'object') return false;
  const proto = Object.getPrototypeOf(v);
  return proto === Object.prototype || proto === null;
}

function scalar(v: unknown): unknown {
  if (v instanceof Date) return v.toISOString();
  if (isObjectId(v)) return v.toHexString();
  if (Buffer.isBuffer(v)) return `<${v.length} bytes>`;
  if (typeof v === 'string' && v.length > MAX_VALUE) return `${v.slice(0, MAX_VALUE)}…`;
  return v;
}

/**
 * Every leaf of a document, keyed by dotted path. An array of objects is walked
 * by index so that one line added to an order's history reads as that line, not
 * as the whole history replaced; an array of plain values is kept whole so the
 * screen can say which were added and removed.
 */
export function flatten(value: unknown, prefix = '', out: Record<string, unknown> = {}): Record<string, unknown> {
  if (Array.isArray(value)) {
    if (value.length > 0 && value.every((x) => isPlainObject(x))) {
      value.forEach((x, i) => flatten(x, `${prefix}.${i}`, out));
    } else if (value.length > 0) {
      out[prefix] = value.map(scalar);
    } else {
      out[prefix] = [];
    }
    return out;
  }
  if (isPlainObject(value)) {
    for (const [k, v] of Object.entries(value)) {
      // A subdocument's own id says nothing about what changed in it.
      if (k === '_id' && prefix) continue;
      flatten(v, prefix ? `${prefix}.${k}` : k, out);
    }
    return out;
  }
  if (prefix) out[prefix] = scalar(value);
  return out;
}

function ignored(field: string): boolean {
  return IGNORED.has(field.split('.')[0]) || field === '_id';
}

function isEmpty(v: unknown): boolean {
  return v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0);
}

function same(a: unknown, b: unknown): boolean {
  if (isEmpty(a) && isEmpty(b)) return true;
  return JSON.stringify(a) === JSON.stringify(b);
}

function masked(field: string, from: unknown, to: unknown): AuditChange {
  if (!isSensitive(field)) return { field, from, to };
  return { field, from: isEmpty(from) ? null : MASK, to: isEmpty(to) ? null : MASK };
}

/** What changed between two versions, secrets hidden. */
export function diffDocuments(
  before: unknown,
  after: unknown
): { changes: AuditChange[]; truncated: boolean } {
  const a = flatten(before ?? {});
  const b = flatten(after ?? {});
  const fields = [...new Set([...Object.keys(a), ...Object.keys(b)])].filter((f) => !ignored(f)).sort();

  const changes: AuditChange[] = [];
  for (const field of fields) {
    if (same(a[field], b[field])) continue;
    changes.push(masked(field, a[field] ?? null, b[field] ?? null));
  }
  return { changes: changes.slice(0, MAX_CHANGES), truncated: changes.length > MAX_CHANGES };
}

/** A request body, safe to keep: no secrets, and no unbounded size. */
export function redactBody(value: unknown, depth = 0): unknown {
  if (depth > 6) return '…';
  if (Array.isArray(value)) {
    const kept = value.slice(0, 50).map((v) => redactBody(v, depth + 1));
    return value.length > 50 ? [...kept, `… ${value.length - 50} more`] : kept;
  }
  if (isPlainObject(value)) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = SENSITIVE.test(k) && !isEmpty(v) ? MASK : redactBody(v, depth + 1);
    }
    return out;
  }
  // A base64 upload inside JSON would otherwise fill the row.
  if (typeof value === 'string' && value.length > MAX_VALUE) return `${value.slice(0, 200)}… (${value.length} chars)`;
  return value;
}

const LABEL_FIELDS = [
  'orderNumber', 'invoiceNumber', 'name', 'nameEn', 'titleEn', 'title',
  'code', 'email', 'label', 'labelEn', 'slug', 'key', 'role', 'productKey', 'questionKey',
  'product', 'description', 'category', 'type',
];

/** The word a person would use for this document. */
export function labelOf(doc: unknown): string | undefined {
  if (!doc || typeof doc !== 'object') return undefined;
  const d = doc as Record<string, unknown>;
  for (const k of LABEL_FIELDS) {
    if (typeof d[k] === 'string' && d[k]) return (d[k] as string).slice(0, 160);
  }
  return undefined;
}
