import mongoose, { Schema, Document, Types } from 'mongoose';
import { auditTrail } from '@/lib/audit/plugin';

/**
 * Everything that has happened to a target account — the history the team and
 * management both read.
 *
 * Separate from CustomerActivity on purpose: that one is keyed to a registered
 * user, and these accounts mostly have no user. The two meet on CrmAccount,
 * which carries `customerId` once a company signs up.
 *
 * Nothing here is ever edited to change a count. The account's counters and its
 * step ticks are written from these rows, so the history is the record and the
 * dashboard is a reading of it.
 */

/** What was done. The first six mirror the sales process in the KPIs sheet. */
export const CRM_ACTIVITY_TYPES = [
  'visit',            // a face-to-face call on the account
  'meeting',          // a scheduled meeting (first, second, third…)
  'call',
  'whatsapp',
  'email',
  'intro',            // KCC introduced
  'account_info',     // volume, rank, best sellers gathered
  'key_person',       // decision maker identified
  'feedback',         // their interest recorded
  'commercial',       // prices, quantities, payment discussed
  'sample_request',   // they asked for a sample (links to an order)
  'pricing_request',
  'complaint',        // something the account raised against us
  'suggestion',       // something they asked us to do differently
  'note',
  'task',
  'order_update',     // something happened to one of this account's orders
  'stage_change',
  'assignment',
  'system',
] as const;
export type CrmActivityType = (typeof CRM_ACTIVITY_TYPES)[number];

/** How the account reacted, in the words the KPIs sheet uses. */
export const CRM_INTEREST = ['interested', 'moderate', 'not_interested'] as const;

export interface ICrmActivity extends Document {
  accountId: Types.ObjectId;
  type: CrmActivityType;
  body?: string;
  /** When it happened. */
  at: Date;
  /**
   * True for a row carried over from the spreadsheet, which recorded that a
   * meeting happened but not when. Its date is the import's, not the visit's,
   * so every count over time leaves these out — otherwise the day of the import
   * would read as the most productive day the team ever had.
   */
  backfilled?: boolean;

  /**
   * Which items of the visit checklist were actually covered. Keys, not labels,
   * so renaming "Talk about KCC" does not rewrite history.
   */
  checklist?: string[];

  /** 1, 2, 3… for a meeting, so "third meeting" survives as a fact. */
  meetingIndex?: number;
  interest?: (typeof CRM_INTEREST)[number];
  outcome?: string;

  /** Tasks and follow-ups. */
  dueDate?: Date;
  done?: boolean;

  /** An order this action produced. */
  orderId?: Types.ObjectId;

  byId?: Types.ObjectId;
  byName?: string;
  byRole?: string;

  meta?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const CrmActivitySchema = new Schema<ICrmActivity>(
  {
    accountId: { type: Schema.Types.ObjectId, ref: 'CrmAccount', required: true, index: true },
    type: { type: String, required: true },
    body: { type: String, trim: true },
    at: { type: Date, default: Date.now, index: true },
    backfilled: { type: Boolean, default: false, index: true },

    checklist: { type: [String], default: undefined },
    meetingIndex: { type: Number },
    interest: { type: String },
    outcome: { type: String, trim: true },

    dueDate: { type: Date },
    done: { type: Boolean, default: false },

    orderId: { type: Schema.Types.ObjectId, ref: 'Order' },

    byId: { type: Schema.Types.ObjectId, ref: 'User' },
    byName: { type: String, trim: true },
    byRole: { type: String, trim: true },

    meta: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

CrmActivitySchema.index({ accountId: 1, at: -1 });
/** The KPI screen counts a rep's actions in a period; this is that query. */
CrmActivitySchema.index({ byId: 1, at: -1 });
CrmActivitySchema.index({ type: 1, at: -1 });
CrmActivitySchema.index({ dueDate: 1, done: 1 });

CrmActivitySchema.plugin(auditTrail);

const CrmActivity =
  mongoose.models.CrmActivity || mongoose.model<ICrmActivity>('CrmActivity', CrmActivitySchema);
export default CrmActivity;
