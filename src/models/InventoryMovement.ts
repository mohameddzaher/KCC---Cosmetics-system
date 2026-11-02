import mongoose, { Schema, Document, Types } from 'mongoose';
import { auditTrail } from '@/lib/audit/plugin';

export interface IInventoryMovement extends Document {
  itemId: Types.ObjectId;
  type: 'IN' | 'OUT' | 'ADJUSTMENT';
  quantity: number;
  previousStock: number;
  newStock: number;
  reason: string;
  reference: {
    type: string;
    id: string;
  };
  /** What one unit was worth at the time: the purchase price coming in, the average cost going out. */
  unitCost?: number;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const InventoryMovementSchema = new Schema<IInventoryMovement>(
  {
    itemId: { type: Schema.Types.ObjectId, ref: 'InventoryItem', required: true },
    type: { type: String, enum: ['IN', 'OUT', 'ADJUSTMENT'], required: true },
    quantity: { type: Number, required: true },
    previousStock: { type: Number, required: true },
    newStock: { type: Number, required: true },
    reason: { type: String, trim: true },
    reference: {
      type: { type: String, enum: ['order', 'purchase', 'adjustment'] },
      id: { type: String },
    },
    unitCost: { type: Number },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

InventoryMovementSchema.index({ itemId: 1 });
InventoryMovementSchema.index({ type: 1 });
InventoryMovementSchema.index({ createdAt: -1 });
InventoryMovementSchema.index({ 'reference.type': 1, 'reference.id': 1 });

InventoryMovementSchema.plugin(auditTrail);

const InventoryMovement = mongoose.models.InventoryMovement || mongoose.model<IInventoryMovement>('InventoryMovement', InventoryMovementSchema);
export default InventoryMovement;
