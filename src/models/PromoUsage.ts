import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IPromoUsage extends Document {
  promoCodeId: Types.ObjectId;
  userId: Types.ObjectId;
  orderId: Types.ObjectId;
  discountAmount: number;
  usedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PromoUsageSchema = new Schema<IPromoUsage>(
  {
    promoCodeId: { type: Schema.Types.ObjectId, ref: 'PromoCode', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
    discountAmount: { type: Number, required: true },
    usedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const PromoUsage = mongoose.models.PromoUsage || mongoose.model<IPromoUsage>('PromoUsage', PromoUsageSchema);
export default PromoUsage;
