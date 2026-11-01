import mongoose, { Schema, Document } from 'mongoose';
import { auditTrail } from '@/lib/audit/plugin';

export interface IClientLogo extends Document {
  name: string;
  logoUrl: string;
  website: string;
  order: number;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ClientLogoSchema = new Schema<IClientLogo>(
  {
    name: { type: String, required: true, trim: true },
    logoUrl: { type: String, required: true, trim: true },
    website: { type: String, trim: true },
    order: { type: Number, default: 0 },
    enabled: { type: Boolean, default: true },
  },
  { timestamps: true }
);

ClientLogoSchema.plugin(auditTrail);

const ClientLogo = mongoose.models.ClientLogo || mongoose.model<IClientLogo>('ClientLogo', ClientLogoSchema);
export default ClientLogo;
