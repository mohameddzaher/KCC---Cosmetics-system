import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IPayment extends Document {
  invoiceId: Types.ObjectId;
  userId: Types.ObjectId;
  amount: number;
  method: 'cash' | 'card' | 'bank_transfer';
  reference: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  paidAt: Date;
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema = new Schema<IPayment>(
  {
    invoiceId: { type: Schema.Types.ObjectId, ref: 'Invoice', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true },
    method: { type: String, enum: ['cash', 'card', 'bank_transfer'], required: true },
    reference: { type: String, trim: true },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'refunded'],
      default: 'pending',
    },
    paidAt: { type: Date, default: Date.now },
    notes: { type: String },
  },
  { timestamps: true }
);

PaymentSchema.index({ invoiceId: 1 });
PaymentSchema.index({ userId: 1 });

const Payment = mongoose.models.Payment || mongoose.model<IPayment>('Payment', PaymentSchema);
export default Payment;
