import mongoose, { Schema, Document } from 'mongoose';

export interface ICmsSection extends Document {
  type: string;
  slug: string;
  order: number;
  enabled: boolean;
  status: 'draft' | 'published';
  fields: {
    en: any;
    ar: any;
  };
  images: string[];
  metadata: any;
  createdAt: Date;
  updatedAt: Date;
}

const CmsSectionSchema = new Schema<ICmsSection>(
  {
    type: {
      type: String,
      required: true,
      enum: ['hero', 'services', 'stats', 'process', 'clients', 'testimonials', 'about', 'technology', 'cta', 'footer', 'vision2030', 'news'],
    },
    slug: { type: String, required: true, unique: true, trim: true },
    order: { type: Number, default: 0 },
    enabled: { type: Boolean, default: true },
    status: { type: String, enum: ['draft', 'published'], default: 'draft' },
    fields: {
      en: { type: Schema.Types.Mixed },
      ar: { type: Schema.Types.Mixed },
    },
    images: [{ type: String }],
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

CmsSectionSchema.index({ type: 1 });
CmsSectionSchema.index({ slug: 1 }, { unique: true });
CmsSectionSchema.index({ order: 1 });

const CmsSection = mongoose.models.CmsSection || mongoose.model<ICmsSection>('CmsSection', CmsSectionSchema);
export default CmsSection;
