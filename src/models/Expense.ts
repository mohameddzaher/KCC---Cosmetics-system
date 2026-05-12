import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IExpense extends Document {
  category: string;
  description: { en: string; ar: string };
  amount: number;
  date: Date;
  vendor: string;
  reference: string;
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
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    notes: { type: String },
  },
  { timestamps: true }
);

ExpenseSchema.index({ category: 1 });
ExpenseSchema.index({ date: -1 });

const Expense = mongoose.models.Expense || mongoose.model<IExpense>('Expense', ExpenseSchema);
export default Expense;
