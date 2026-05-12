import mongoose, { Schema, Document, Types } from 'mongoose';

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
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

InventoryMovementSchema.index({ itemId: 1 });
InventoryMovementSchema.index({ type: 1 });
InventoryMovementSchema.index({ createdAt: -1 });

const InventoryMovement = mongoose.models.InventoryMovement || mongoose.model<IInventoryMovement>('InventoryMovement', InventoryMovementSchema);
export default InventoryMovement;
