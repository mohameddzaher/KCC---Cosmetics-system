import mongoose, { Schema, Document, Types } from 'mongoose';
import { auditTrail } from '@/lib/audit/plugin';
import { ACTIVE_INVOICE_STATUSES, INVOICE_STATUSES, type InvoiceStatus } from '@/lib/invoiceStatus';

interface IInvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface IInvoice extends Document {
  invoiceNumber: string;
  orderId: Types.ObjectId;
  userId: Types.ObjectId;
  items: IInvoiceItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  /** Written only by settleInvoice(), from the payments. Never typed in. */
  amountPaid: number;
  status: InvoiceStatus;
  /** When it stopped being a draft: the date it counts as a sale. */
  issuedAt?: Date;
  dueDate: Date;
  paidAt: Date;
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

const InvoiceItemSchema = new Schema(
  {
    description: { type: String, required: true },
    quantity: { type: Number, required: true },
    unitPrice: { type: Number, required: true },
    total: { type: Number, required: true },
  },
  { _id: false }
);

const InvoiceSchema = new Schema<IInvoice>(
  {
    invoiceNumber: { type: String, required: true, unique: true, trim: true },
    orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    items: [InvoiceItemSchema],
    subtotal: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    amountPaid: { type: Number, default: 0 },
    status: { type: String, enum: INVOICE_STATUSES as unknown as string[], default: 'draft' },
    issuedAt: { type: Date },
    dueDate: { type: Date },
    paidAt: { type: Date },
    notes: { type: String },
  },
  { timestamps: true }
);

InvoiceSchema.index({ invoiceNumber: 1 }, { unique: true });
InvoiceSchema.index({ userId: 1 });
InvoiceSchema.index({ status: 1 });
// One live invoice per order, enforced by the database: an order moved to
// "Awaiting Payment" twice at the same moment must not bill the customer twice.
InvoiceSchema.index(
  { orderId: 1 },
  { unique: true, partialFilterExpression: { status: { $in: ACTIVE_INVOICE_STATUSES } } }
);

InvoiceSchema.plugin(auditTrail);

const Invoice = mongoose.models.Invoice || mongoose.model<IInvoice>('Invoice', InvoiceSchema);
export default Invoice;
