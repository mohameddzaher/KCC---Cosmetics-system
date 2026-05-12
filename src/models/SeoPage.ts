import mongoose, { Schema, Document } from 'mongoose';

export interface ISeoPage extends Document {
  page: string;
  title: { en: string; ar: string };
  description: { en: string; ar: string };
  keywords: { en: string; ar: string };
  ogTitle: { en: string; ar: string };
  ogDescription: { en: string; ar: string };
  ogImage: string;
  canonical: string;
  robots: string;
  schemaJsonLd: any;
  createdAt: Date;
  updatedAt: Date;
}

const SeoPageSchema = new Schema<ISeoPage>(
  {
    page: { type: String, required: true, unique: true, trim: true },
    title: {
      en: { type: String, trim: true },
      ar: { type: String, trim: true },
    },
    description: {
      en: { type: String },
      ar: { type: String },
    },
    keywords: {
      en: { type: String },
      ar: { type: String },
    },
    ogTitle: {
      en: { type: String, trim: true },
      ar: { type: String, trim: true },
    },
    ogDescription: {
      en: { type: String },
      ar: { type: String },
    },
    ogImage: { type: String, trim: true },
    canonical: { type: String, trim: true },
    robots: { type: String, default: 'index,follow', trim: true },
    schemaJsonLd: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

SeoPageSchema.index({ page: 1 }, { unique: true });

const SeoPage = mongoose.models.SeoPage || mongoose.model<ISeoPage>('SeoPage', SeoPageSchema);
export default SeoPage;
