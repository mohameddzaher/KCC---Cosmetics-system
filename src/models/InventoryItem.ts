import mongoose, { Schema, Document } from 'mongoose';

export interface IInventoryItem extends Document {
  sku: string;
  name: { en: string; ar: string };
  description: { en: string; ar: string };
  category: string;
  currentStock: number;
  lowStockThreshold: number;
  unit: string;
  costPerUnit: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const InventoryItemSchema = new Schema<IInventoryItem>(
  {
    sku: { type: String, required: true, unique: true, trim: true },
    name: {
      en: { type: String, required: true, trim: true },
      ar: { type: String, required: true, trim: true },
    },
    description: {
      en: { type: String },
      ar: { type: String },
    },
    category: { type: String, trim: true },
    currentStock: { type: Number, default: 0 },
    lowStockThreshold: { type: Number, default: 10 },
    unit: { type: String, default: 'pcs', trim: true },
    costPerUnit: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

InventoryItemSchema.index({ sku: 1 }, { unique: true });

const InventoryItem = mongoose.models.InventoryItem || mongoose.model<IInventoryItem>('InventoryItem', InventoryItemSchema);
export default InventoryItem;
