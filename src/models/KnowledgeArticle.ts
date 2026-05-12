import mongoose, { Schema, Document } from 'mongoose';

export interface IKnowledgeArticle extends Document {
  question: { en: string; ar: string };
  answer: { en: string; ar: string };
  category: string;
  keywords: string[];
  order: number;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const KnowledgeArticleSchema = new Schema<IKnowledgeArticle>(
  {
    question: {
      en: { type: String, required: true },
      ar: { type: String, required: true },
    },
    answer: {
      en: { type: String, required: true },
      ar: { type: String, required: true },
    },
    category: { type: String, trim: true },
    keywords: [{ type: String, trim: true }],
    order: { type: Number, default: 0 },
    enabled: { type: Boolean, default: true },
  },
  { timestamps: true }
);

KnowledgeArticleSchema.index({ keywords: 1 });
KnowledgeArticleSchema.index({ category: 1 });

const KnowledgeArticle = mongoose.models.KnowledgeArticle || mongoose.model<IKnowledgeArticle>('KnowledgeArticle', KnowledgeArticleSchema);
export default KnowledgeArticle;
