import mongoose, { Schema, Document } from 'mongoose';

export interface IFAQ extends Document {
  question: { en: string; ar: string };
  answer: { en: string; ar: string };
  category: string;
  order: number;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const FAQSchema = new Schema<IFAQ>(
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
    order: { type: Number, default: 0 },
    enabled: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const FAQ = mongoose.models.FAQ || mongoose.model<IFAQ>('FAQ', FAQSchema);
export default FAQ;
