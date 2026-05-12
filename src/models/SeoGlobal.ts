import mongoose, { Schema, Document } from 'mongoose';

export interface ISeoGlobal extends Document {
  titleTemplate: { en: string; ar: string };
  defaultDescription: { en: string; ar: string };
  defaultOgImage: string;
  twitterCard: string;
  canonicalBase: string;
  additionalMeta: any;
  createdAt: Date;
  updatedAt: Date;
}

const SeoGlobalSchema = new Schema<ISeoGlobal>(
  {
    titleTemplate: {
      en: { type: String, trim: true },
      ar: { type: String, trim: true },
    },
    defaultDescription: {
      en: { type: String },
      ar: { type: String },
    },
    defaultOgImage: { type: String, trim: true },
    twitterCard: { type: String, default: 'summary_large_image', trim: true },
    canonicalBase: { type: String, trim: true },
    additionalMeta: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

const SeoGlobal = mongoose.models.SeoGlobal || mongoose.model<ISeoGlobal>('SeoGlobal', SeoGlobalSchema);
export default SeoGlobal;
