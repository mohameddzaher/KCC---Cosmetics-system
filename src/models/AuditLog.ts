import mongoose, { Schema, Document, Types, type MongooseQueryMiddleware } from 'mongoose';

/**
 * Who did what, when, from where, and exactly what it changed.
 *
 * One row per thing that happened: one document changed, one login, one export.
 * Rows from the same request share `requestId`, so logging a visit reads as the
 * visit and the stage move it caused, together.
 *
 * `actorName`, `actorEmail` and `actorRole` are copied rather than looked up:
 * this has to go on saying who did it after that person is renamed, promoted or
 * deleted.
 *
 * Rows written before these fields existed have only userId, action, entity,
 * entityId and details. The schema keeps those names so they stay readable.
 */

export type AuditOutcome = 'success' | 'denied' | 'failed';

export interface IAuditLog extends Document {
  /** Absent for a visitor who was not signed in. */
  userId?: Types.ObjectId;
  actorName?: string;
  actorEmail?: string;
  actorRole?: string;

  /** create, update, delete, login, login_failed, logout, export, upload… */
  action: string;
  entity: string;
  entityId?: string;
  entityLabel?: string;
  changes?: Array<{ field: string; from?: unknown; to?: unknown }>;
  truncated?: boolean;
  details?: unknown;

  outcome: AuditOutcome;
  error?: string;

  requestId?: string;
  method?: string;
  path?: string;
  status?: number;
  durationMs?: number;
  /** The request as it arrived, secrets removed. Useful above all when it failed. */
  body?: unknown;
  ip?: string;
  userAgent?: string;

  createdAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    actorName: { type: String, trim: true },
    actorEmail: { type: String, trim: true },
    actorRole: { type: String, trim: true },

    action: { type: String, required: true, trim: true },
    entity: { type: String, required: true, trim: true },
    entityId: { type: String, trim: true },
    entityLabel: { type: String, trim: true },
    changes: { type: [{ _id: false, field: String, from: Schema.Types.Mixed, to: Schema.Types.Mixed }], default: undefined },
    truncated: { type: Boolean },
    details: { type: Schema.Types.Mixed },

    outcome: { type: String, default: 'success' },
    error: { type: String },

    requestId: { type: String },
    method: { type: String },
    path: { type: String },
    status: { type: Number },
    durationMs: { type: Number },
    body: { type: Schema.Types.Mixed },
    ip: { type: String, trim: true },
    userAgent: { type: String },

    createdAt: { type: Date, default: Date.now },
  },
  { versionKey: false, minimize: false }
);

AuditLogSchema.index({ createdAt: -1 });
AuditLogSchema.index({ userId: 1, createdAt: -1 });
AuditLogSchema.index({ entity: 1, entityId: 1, createdAt: -1 });
AuditLogSchema.index({ action: 1, createdAt: -1 });
AuditLogSchema.index({ outcome: 1, createdAt: -1 });
AuditLogSchema.index({ requestId: 1 });

/** A record that can be edited proves nothing, so the model refuses to. */
function refuse() {
  throw new Error('Audit records cannot be changed or deleted');
}
AuditLogSchema.pre(
  ['updateOne', 'updateMany', 'replaceOne', 'findOneAndUpdate', 'findOneAndReplace', 'findOneAndDelete', 'deleteOne', 'deleteMany'] as MongooseQueryMiddleware[],
  { document: false, query: true },
  refuse
);
AuditLogSchema.pre('save', function () {
  if (!this.isNew) refuse();
});

const AuditLog = mongoose.models.AuditLog || mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);
export default AuditLog;
