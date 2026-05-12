import mongoose, { Schema, Document } from 'mongoose';

export interface IService extends Document {
  title: { en: string; ar: string };
  description: { en: string; ar: string };
  icon: string;
  image: string;
  order: number;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ServiceSchema = new Schema<IService>(
  {
    title: {
      en: { type: String, required: true, trim: true },
      ar: { type: String, required: true, trim: true },
    },
    description: {
      en: { type: String, required: true },
      ar: { type: String, required: true },
    },
    icon: { type: String, trim: true },
    image: { type: String, trim: true },
    order: { type: Number, default: 0 },
    enabled: { type: Boolean, default: true },
  },
  { timestamps: true }
);

ServiceSchema.index({ order: 1 });

const Service = mongoose.models.Service || mongoose.model<IService>('Service', ServiceSchema);
export default Service;
