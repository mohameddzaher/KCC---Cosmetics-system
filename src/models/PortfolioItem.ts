import mongoose, { Schema, Document } from 'mongoose';

export interface IPortfolioItem extends Document {
  title: { en: string; ar: string };
  description: { en: string; ar: string };
  category: { en: string; ar: string };
  imageUrl: string;
  client: string;
  slug: string;
  tags: string[];
  enabled: boolean;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

const PortfolioItemSchema = new Schema<IPortfolioItem>(
  {
    title: {
      en: { type: String, required: true, trim: true },
      ar: { type: String, required: true, trim: true },
    },
    description: {
      en: { type: String },
      ar: { type: String },
    },
    category: {
      en: { type: String, trim: true },
      ar: { type: String, trim: true },
    },
    imageUrl: { type: String, trim: true },
    client: { type: String, trim: true },
    slug: { type: String, required: true, unique: true, trim: true },
    tags: [{ type: String, trim: true }],
    enabled: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

PortfolioItemSchema.index({ slug: 1 }, { unique: true });

const PortfolioItem = mongoose.models.PortfolioItem || mongoose.model<IPortfolioItem>('PortfolioItem', PortfolioItemSchema);
export default PortfolioItem;
