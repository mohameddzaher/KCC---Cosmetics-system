import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IReferral extends Document {
  referrerId: Types.ObjectId;
  referredId: Types.ObjectId;
  referralCode: string;
  status: 'pending' | 'credited';
  creditAmount: number;
  creditedAt: Date;
  orderId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ReferralSchema = new Schema<IReferral>(
  {
    referrerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    referredId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    referralCode: { type: String, required: true, trim: true },
    status: { type: String, enum: ['pending', 'credited'], default: 'pending' },
    creditAmount: { type: Number, default: 0 },
    creditedAt: { type: Date },
    orderId: { type: Schema.Types.ObjectId, ref: 'Order' },
  },
  { timestamps: true }
);

const Referral = mongoose.models.Referral || mongoose.model<IReferral>('Referral', ReferralSchema);
export default Referral;
