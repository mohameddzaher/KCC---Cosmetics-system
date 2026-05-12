import mongoose, { Schema, Document } from 'mongoose';

interface IConditions {
  productType: string;
  texture: string;
  containerType: string;
  freeFrom: string[];
}

export interface IProductVisualRule extends Document {
  conditions: IConditions;
  imageUrl: string;
  label: { en: string; ar: string };
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ProductVisualRuleSchema = new Schema<IProductVisualRule>(
  {
    conditions: {
      productType: { type: String, trim: true },
      texture: { type: String, trim: true },
      containerType: { type: String, trim: true },
      freeFrom: [{ type: String, trim: true }],
    },
    imageUrl: { type: String, trim: true },
    label: {
      en: { type: String, trim: true },
      ar: { type: String, trim: true },
    },
    enabled: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const ProductVisualRule = mongoose.models.ProductVisualRule || mongoose.model<IProductVisualRule>('ProductVisualRule', ProductVisualRuleSchema);
export default ProductVisualRule;
