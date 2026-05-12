import mongoose, { Schema, Document } from 'mongoose';

export interface IFactory extends Document {
  name: { en: string; ar: string };
  description: { en: string; ar: string };
  location: { en: string; ar: string };
  capacity: { en: string; ar: string };
  imageUrl: string;
  features: Array<{ en: string; ar: string }>;
  order: number;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const FactorySchema = new Schema<IFactory>(
  {
    name: {
      en: { type: String, required: true, trim: true },
      ar: { type: String, required: true, trim: true },
    },
    description: {
      en: { type: String },
      ar: { type: String },
    },
    location: {
      en: { type: String, trim: true },
      ar: { type: String, trim: true },
    },
    capacity: {
      en: { type: String, trim: true },
      ar: { type: String, trim: true },
    },
    imageUrl: { type: String, trim: true },
    features: [
      {
        en: { type: String },
        ar: { type: String },
      },
    ],
    order: { type: Number, default: 0 },
    enabled: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const Factory = mongoose.models.Factory || mongoose.model<IFactory>('Factory', FactorySchema);
export default Factory;
