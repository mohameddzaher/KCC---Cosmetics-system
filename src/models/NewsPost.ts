import mongoose, { Schema, Document } from 'mongoose';

export interface INewsPost extends Document {
  title: { en: string; ar: string };
  content: { en: string; ar: string };
  excerpt: { en: string; ar: string };
  slug: string;
  imageUrl: string;
  author: string;
  tags: string[];
  status: 'draft' | 'published';
  publishedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const NewsPostSchema = new Schema<INewsPost>(
  {
    title: {
      en: { type: String, required: true, trim: true },
      ar: { type: String, required: true, trim: true },
    },
    content: {
      en: { type: String, required: true },
      ar: { type: String, required: true },
    },
    excerpt: {
      en: { type: String, trim: true },
      ar: { type: String, trim: true },
    },
    slug: { type: String, required: true, unique: true, trim: true },
    imageUrl: { type: String, trim: true },
    author: { type: String, trim: true },
    tags: [{ type: String, trim: true }],
    status: { type: String, enum: ['draft', 'published'], default: 'draft' },
    publishedAt: { type: Date },
  },
  { timestamps: true }
);

NewsPostSchema.index({ slug: 1 }, { unique: true });
NewsPostSchema.index({ status: 1 });
NewsPostSchema.index({ publishedAt: -1 });

const NewsPost = mongoose.models.NewsPost || mongoose.model<INewsPost>('NewsPost', NewsPostSchema);
export default NewsPost;
