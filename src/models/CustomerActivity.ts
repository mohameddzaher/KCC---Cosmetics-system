import mongoose, { Schema, Document, Types } from 'mongoose';

export type ActivityType =
  | 'note'
  | 'call'
  | 'email'
  | 'whatsapp'
  | 'meeting'
  | 'task'
  | 'stage_change'
  | 'assignment'
  | 'system';

export interface ICustomerActivity extends Document {
  customerId: Types.ObjectId;
  type: ActivityType;
  body: string;
  // For tasks / follow-ups
  dueDate?: Date;
  done?: boolean;
  // Who logged it
  authorId?: Types.ObjectId;
  authorName?: string;
  // Optional structured metadata (e.g. { from: 'lead', to: 'active' })
  meta?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const CustomerActivitySchema = new Schema<ICustomerActivity>(
  {
    customerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: {
      type: String,
      enum: ['note', 'call', 'email', 'whatsapp', 'meeting', 'task', 'stage_change', 'assignment', 'system'],
      default: 'note',
    },
    body: { type: String, required: true, trim: true },
    dueDate: { type: Date },
    done: { type: Boolean, default: false },
    authorId: { type: Schema.Types.ObjectId, ref: 'User' },
    authorName: { type: String, trim: true },
    meta: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

CustomerActivitySchema.index({ customerId: 1, createdAt: -1 });
CustomerActivitySchema.index({ type: 1 });
CustomerActivitySchema.index({ dueDate: 1, done: 1 });

const CustomerActivity =
  mongoose.models.CustomerActivity ||
  mongoose.model<ICustomerActivity>('CustomerActivity', CustomerActivitySchema);
export default CustomerActivity;
