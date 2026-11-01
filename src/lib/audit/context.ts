import { AsyncLocalStorage } from 'node:async_hooks';

/**
 * What one request has done so far.
 *
 * The request wrapper opens this, the session fills in who is asking, and the
 * model hooks add to it as documents change — none of them have to be handed
 * it. That is what lets a route record nothing about auditing and still be
 * audited in full.
 */

export interface AuditActor {
  id?: string;
  name?: string;
  email?: string;
  role?: string;
}

export interface AuditChange {
  field: string;
  from?: unknown;
  to?: unknown;
  /** The name behind an id, as it was at the time. */
  fromLabel?: string;
  toLabel?: string;
}

/** Someone or something this event concerns, beyond the record itself. */
export interface AuditSubject {
  field: string;
  model: string;
  id: string;
  label?: string;
  role?: string;
}

export interface AuditEvent {
  action: string;
  entity: string;
  entityId?: string;
  entityLabel?: string;
  /** Set for a User, because a customer and a member of staff open different pages. */
  entityRole?: string;
  subjects?: AuditSubject[];
  /** Which changed fields hold ids, and of what. Used up before the row is saved. */
  refPaths?: Record<string, string>;
  changes?: AuditChange[];
  /** More changes happened than one row keeps. */
  truncated?: boolean;
  details?: unknown;
}

export interface AuditStore {
  requestId: string;
  actor?: AuditActor;
  ip?: string;
  userAgent?: string;
  method: string;
  path: string;
  startedAt: number;
  events: AuditEvent[];
  /** A write that outlives its response is saved on its own rather than lost. */
  flushed: boolean;
  lateFlush?: (events: AuditEvent[]) => Promise<void>;
}

/*
 * On globalThis, for the reason rolePermissions.ts ran into: Next gives each
 * route its own copy of this module, but Mongoose is shared, so a model's hooks
 * belong to whichever route compiled it first. A module-level store would be a
 * different store from the one the current route opened, and the hooks would
 * quietly record nothing.
 */
const KEY = Symbol.for('kcc.audit.storage');
type WithStorage = typeof globalThis & { [KEY]?: AsyncLocalStorage<AuditStore> };
const holder = globalThis as WithStorage;

export const auditStorage: AsyncLocalStorage<AuditStore> =
  holder[KEY] || (holder[KEY] = new AsyncLocalStorage<AuditStore>());

export function currentAudit(): AuditStore | undefined {
  return auditStorage.getStore();
}

/** Called by the session, so every audited request knows who is asking. */
export function setAuditActor(actor: AuditActor | null | undefined) {
  const store = currentAudit();
  if (store && actor) store.actor = actor;
}

/** Record something that is not a document change: a login, an export, a file. */
export function recordAudit(event: AuditEvent) {
  const store = currentAudit();
  if (!store) return;
  store.events.push(event);
  if (store.flushed) void store.lateFlush?.([event]);
}
