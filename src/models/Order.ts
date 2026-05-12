import mongoose, { Schema, Document, Types } from 'mongoose';

interface IAttachment {
  name: string;
  url: string;
}

interface ICustomerInfo {
  companyName?: string;
  personName?: string;
  email?: string;
  phone?: string;
  country?: string;
  city?: string;
  address?: string;
}

interface ITotals {
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
}

interface IBulkDetails {
  quantity?: number;
  pricingNotes?: string;
  deliveryTimeline?: string;
}

export interface IOrder extends Document {
  orderNumber: string;
  type: 'sample' | 'bulk';
  status: string;
  userId: Types.ObjectId;
  surveyResponseId: Types.ObjectId;
  customerInfo: ICustomerInfo;
  totals: ITotals;
  promoCodeId?: Types.ObjectId;
  referralCode?: string;
  paymentMethod: 'cash' | 'card';
  paymentStatus: 'pending' | 'paid' | 'refunded';
  internalNotes?: string;
  attachments: IAttachment[];
  surveyData?: Record<string, unknown>;
  bulkDetails?: IBulkDetails;
  convertedFromSample?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const OrderSchema = new Schema<IOrder>(
  {
    orderNumber: { type: String, required: true, unique: true, trim: true },
    type: { type: String, enum: ['sample', 'bulk'], required: true },
    status: {
      type: String,
      enum: [
        'Submitted',
        'Under Review',
        'Approved',
        'Quotation Sent',
        'Awaiting Payment',
        'In Production',
        'Shipped',
        'Delivered',
        'Closed',
      ],
      default: 'Submitted',
    },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    surveyResponseId: { type: Schema.Types.ObjectId, ref: 'SurveyResponse' },
    customerInfo: {
      companyName: { type: String, trim: true },
      personName: { type: String, trim: true },
      email: { type: String, trim: true, lowercase: true },
      phone: { type: String, trim: true },
      country: { type: String, trim: true },
      city: { type: String, trim: true },
      address: { type: String, trim: true },
    },
    totals: {
      subtotal: { type: Number, default: 0 },
      discount: { type: Number, default: 0 },
      tax: { type: Number, default: 0 },
      total: { type: Number, default: 0 },
    },
    promoCodeId: { type: Schema.Types.ObjectId, ref: 'PromoCode' },
    referralCode: { type: String, trim: true },
    paymentMethod: { type: String, enum: ['cash', 'card'] },
    paymentStatus: { type: String, enum: ['pending', 'paid', 'refunded'], default: 'pending' },
    internalNotes: { type: String },
    attachments: [
      {
        name: { type: String },
        url: { type: String },
      },
    ],
    surveyData: { type: Schema.Types.Mixed, default: {} },
    bulkDetails: {
      quantity: { type: Number },
      pricingNotes: { type: String },
      deliveryTimeline: { type: String },
    },
    convertedFromSample: { type: Schema.Types.ObjectId, ref: 'Order' },
  },
  { timestamps: true }
);

OrderSchema.index({ orderNumber: 1 }, { unique: true });
OrderSchema.index({ type: 1 });
OrderSchema.index({ status: 1 });
OrderSchema.index({ userId: 1 });

const Order = mongoose.models.Order || mongoose.model<IOrder>('Order', OrderSchema);
export default Order;
