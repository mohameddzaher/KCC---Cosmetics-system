import mongoose, { Schema, Document, Types } from 'mongoose';
import { auditTrail } from '@/lib/audit/plugin';

/**
 * A rep's journey plan — which accounts he intends to call on, which day.
 *
 * One document per rep per day, because that is how the plan is made and how it
 * is checked: "what are you doing Tuesday" and "did Tuesday happen".
 *
 * Nothing here records that a visit took place. Whether a planned call actually
 * happened is read from the activity history at the moment the plan is shown,
 * so a plan can never claim a visit the CRM has no record of — and a rep who
 * visits someone unplanned still has that visit counted everywhere else.
 */

export interface ICrmVisitPlan extends Document {
  ownerId: Types.ObjectId;
  ownerName?: string;
  /** Midnight of the planned day, so a day is one key. */
  date: Date;
  items: Array<{
    accountId: Types.ObjectId;
    /** Why this account, this week — written by whoever planned it. */
    note?: string;
  }>;
  notes?: string;
  /** The manager who set it, when it was not the rep himself. */
  createdByName?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CrmVisitPlanSchema = new Schema<ICrmVisitPlan>(
  {
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    ownerName: { type: String, trim: true },
    date: { type: Date, required: true },
    items: {
      type: [
        new Schema(
          {
            accountId: { type: Schema.Types.ObjectId, ref: 'CrmAccount', required: true },
            note: { type: String, trim: true },
          },
          { _id: false }
        ),
      ],
      default: [],
    },
    notes: { type: String, trim: true },
    createdByName: { type: String, trim: true },
  },
  { timestamps: true }
);

/** One plan per rep per day. */
CrmVisitPlanSchema.index({ ownerId: 1, date: 1 }, { unique: true });
CrmVisitPlanSchema.index({ date: 1 });

CrmVisitPlanSchema.plugin(auditTrail);

const CrmVisitPlan =
  mongoose.models.CrmVisitPlan ||
  mongoose.model<ICrmVisitPlan>('CrmVisitPlan', CrmVisitPlanSchema);
export default CrmVisitPlan;
