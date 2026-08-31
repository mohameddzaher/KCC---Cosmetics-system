import mongoose, { Schema, Document, Types } from 'mongoose';

/**
 * OrderFeedback — what the customer thought once the order actually arrived.
 *
 * This is the last link in the workflow: request → production → delivery →
 * feedback. It is deliberately a separate collection rather than a field on
 * the order, so a customer can be asked again on a later order and so the
 * ratings can be aggregated across accounts without touching order documents.
 *
 * One feedback per order (unique index) — re-submitting updates it.
 */

export const FEEDBACK_ASPECTS = [
  'formulaQuality',
  'packaging',
  'communication',
  'timing',
  'valueForMoney',
] as const;

export type FeedbackAspect = (typeof FEEDBACK_ASPECTS)[number];

export interface IOrderFeedback extends Document {
  orderId: Types.ObjectId;
  userId: Types.ObjectId;
  /** Overall score, 1–5. */
  rating: number;
  /** Per-aspect scores, 1–5. Any subset. */
  aspects: Partial<Record<FeedbackAspect, number>>;
  comment?: string;
  /** Would they order this again / move it to bulk? */
  wouldReorder?: boolean;
  /** Customer opted to let KCC publish this as a testimonial. */
  allowPublish: boolean;
  /** Internal reply from the account manager. */
  staffResponse?: string;
  staffResponderId?: Types.ObjectId;
  respondedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const OrderFeedbackSchema = new Schema<IOrderFeedback>(
  {
    orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    aspects: {
      type: Map,
      of: Number,
      default: {},
    },
    comment: { type: String, trim: true, maxlength: 4000 },
    wouldReorder: { type: Boolean },
    allowPublish: { type: Boolean, default: false },
    staffResponse: { type: String, trim: true, maxlength: 4000 },
    staffResponderId: { type: Schema.Types.ObjectId, ref: 'User' },
    respondedAt: { type: Date },
  },
  { timestamps: true }
);

OrderFeedbackSchema.index({ orderId: 1 }, { unique: true });
OrderFeedbackSchema.index({ userId: 1, createdAt: -1 });
OrderFeedbackSchema.index({ rating: 1 });

const OrderFeedback =
  mongoose.models.OrderFeedback ||
  mongoose.model<IOrderFeedback>('OrderFeedback', OrderFeedbackSchema);

export default OrderFeedback;
