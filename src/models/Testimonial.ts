import mongoose, { Schema, Document } from 'mongoose';

export interface ITestimonial extends Document {
  name: { en: string; ar: string };
  company: { en: string; ar: string };
  content: { en: string; ar: string };
  avatar: string;
  rating: number;
  order: number;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const TestimonialSchema = new Schema<ITestimonial>(
  {
    name: {
      en: { type: String, required: true, trim: true },
      ar: { type: String, required: true, trim: true },
    },
    company: {
      en: { type: String, trim: true },
      ar: { type: String, trim: true },
    },
    content: {
      en: { type: String, required: true },
      ar: { type: String, required: true },
    },
    avatar: { type: String, trim: true },
    rating: { type: Number, min: 1, max: 5, required: true },
    order: { type: Number, default: 0 },
    enabled: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const Testimonial = mongoose.models.Testimonial || mongoose.model<ITestimonial>('Testimonial', TestimonialSchema);
export default Testimonial;
