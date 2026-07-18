import mongoose, { Schema, Document } from 'mongoose';

export interface ITestimonial extends Document {
  name: { en: string; ar: string };
  company: { en: string; ar: string };
  content: { en: string; ar: string };
  avatar: string;
  rating: number;
  order: number;
  enabled: boolean;
  status: 'pending' | 'approved';
  email?: string;
  createdAt: Date;
  updatedAt: Date;
}

const TestimonialSchema = new Schema<ITestimonial>(
  {
    name: {
      en: { type: String, required: true, trim: true },
      ar: { type: String, default: '', trim: true },
    },
    company: {
      en: { type: String, trim: true },
      ar: { type: String, trim: true },
    },
    content: {
      en: { type: String, required: true },
      ar: { type: String, default: '' },
    },
    avatar: { type: String, trim: true },
    rating: { type: Number, min: 1, max: 5, required: true, default: 5 },
    order: { type: Number, default: 0 },
    enabled: { type: Boolean, default: true },
    // User-submitted reviews start as pending + disabled until an admin approves.
    status: { type: String, enum: ['pending', 'approved'], default: 'approved' },
    email: { type: String, trim: true },
  },
  { timestamps: true }
);
TestimonialSchema.index({ status: 1, enabled: 1 });

const Testimonial = mongoose.models.Testimonial || mongoose.model<ITestimonial>('Testimonial', TestimonialSchema);
export default Testimonial;
