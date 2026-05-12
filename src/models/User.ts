import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'STAFF' | 'CUSTOMER';
  company?: string;
  phone?: string;
  country?: string;
  city?: string;
  address?: string;
  referralCode: string;
  referralBalance: number;
  languagePref: 'en' | 'ar';
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: ['SUPER_ADMIN', 'ADMIN', 'STAFF', 'CUSTOMER'],
      default: 'CUSTOMER',
    },
    company: { type: String, trim: true },
    phone: { type: String, trim: true },
    country: { type: String, trim: true },
    city: { type: String, trim: true },
    address: { type: String, trim: true },
    referralCode: { type: String, unique: true },
    referralBalance: { type: Number, default: 0 },
    languagePref: { type: String, enum: ['en', 'ar'], default: 'en' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ referralCode: 1 }, { unique: true });

const User = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
export default User;
