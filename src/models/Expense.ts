import mongoose, { Schema, Document, Types } from 'mongoose';
import { auditTrail } from '@/lib/audit/plugin';

export interface IExpense extends Document {
  category: string;
  description: { en: string; ar: string };
  amount: number;
  date: Date;
  vendor: string;
  reference: string;
  /** VAT paid on this expense, included in `amount`. What the VAT report reclaims. */
  vatAmount: number;
  /** The order this cost belongs to, when it belongs to one. */
  orderId?: Types.ObjectId;
  createdBy: Types.ObjectId;
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

const ExpenseSchema = new Schema<IExpense>(
  {
    category: { type: String, required: true, trim: true },
    description: {
      en: { type: String },
      ar: { type: String },
    },
    amount: { type: Number, required: true },
    date: { type: Date, required: true },
    vendor: { type: String, trim: true },
    reference: { type: String, trim: true },
    vatAmount: { type: Number, default: 0 },
    orderId: { type: Schema.Types.ObjectId, ref: 'Order' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    notes: { type: String },
  },
  { timestamps: true }
);

ExpenseSchema.index({ category: 1 });
ExpenseSchema.index({ date: -1 });

ExpenseSchema.plugin(auditTrail);

const Expense = mongoose.models.Expense || mongoose.model<IExpense>('Expense', ExpenseSchema);
export default Expense;
