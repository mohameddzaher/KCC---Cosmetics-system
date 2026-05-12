import mongoose, { Schema, Document } from 'mongoose';

export interface ICertificate extends Document {
  title: { en: string; ar: string };
  description: { en: string; ar: string };
  imageUrl: string;
  issuer: { en: string; ar: string };
  issuedDate: Date;
  order: number;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CertificateSchema = new Schema<ICertificate>(
  {
    title: {
      en: { type: String, required: true, trim: true },
      ar: { type: String, required: true, trim: true },
    },
    description: {
      en: { type: String },
      ar: { type: String },
    },
    imageUrl: { type: String, trim: true },
    issuer: {
      en: { type: String, trim: true },
      ar: { type: String, trim: true },
    },
    issuedDate: { type: Date },
    order: { type: Number, default: 0 },
    enabled: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const Certificate = mongoose.models.Certificate || mongoose.model<ICertificate>('Certificate', CertificateSchema);
export default Certificate;
