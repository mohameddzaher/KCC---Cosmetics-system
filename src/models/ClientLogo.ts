import mongoose, { Schema, Document } from 'mongoose';

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

const ClientLogo = mongoose.models.ClientLogo || mongoose.model<IClientLogo>('ClientLogo', ClientLogoSchema);
export default ClientLogo;
