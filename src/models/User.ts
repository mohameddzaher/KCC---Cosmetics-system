import mongoose, { Schema, Document, Types } from 'mongoose';

export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'STAFF' | 'CUSTOMER';
export type CustomerStage = 'lead' | 'prospect' | 'active' | 'vip' | 'inactive' | 'churned';

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  company?: string;
  phone?: string;
  whatsapp?: string;
  website?: string;
  country?: string;
  city?: string;
  address?: string;
  referralCode: string;
  referralBalance: number;
  languagePref: 'en' | 'ar';
  isActive: boolean;
  // CRM fields (only meaningful for CUSTOMER role)
  stage: CustomerStage;
  tags: string[];
  source?: string;
  accountManagerId?: Types.ObjectId;
  lastContactedAt?: Date;
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
    whatsapp: { type: String, trim: true },
    website: { type: String, trim: true },
    country: { type: String, trim: true },
    city: { type: String, trim: true },
    address: { type: String, trim: true },
    referralCode: { type: String, unique: true },
    referralBalance: { type: Number, default: 0 },
    languagePref: { type: String, enum: ['en', 'ar'], default: 'en' },
    isActive: { type: Boolean, default: true },
    stage: {
      type: String,
      enum: ['lead', 'prospect', 'active', 'vip', 'inactive', 'churned'],
      default: 'lead',
    },
    tags: { type: [String], default: [] },
    source: { type: String, trim: true },
    accountManagerId: { type: Schema.Types.ObjectId, ref: 'User' },
    lastContactedAt: { type: Date },
  },
  { timestamps: true }
);

UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ referralCode: 1 }, { unique: true });
UserSchema.index({ role: 1 });
UserSchema.index({ accountManagerId: 1 });
UserSchema.index({ stage: 1 });

const User = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
export default User;
