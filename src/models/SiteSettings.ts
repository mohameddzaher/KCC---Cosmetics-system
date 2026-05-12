import mongoose, { Schema, Document } from 'mongoose';

export interface ISiteSettings extends Document {
  key: string;
  general: {
    siteName: { en: string; ar: string };
    contactEmail: string;
    contactPhone: string;
    contactAddress: { en: string; ar: string };
    companyName: { en: string; ar: string };
    socialMedia: {
      instagram: string;
      twitter: string;
      linkedin: string;
      facebook: string;
    };
  };
  referral: {
    enabled: boolean;
    creditAmount: number;
    minOrderForCredit: number;
    maxCreditsPerUser: number;
    expirationDays: number;
  };
  notifications: {
    emailNewOrder: boolean;
    emailOrderStatusChange: boolean;
    emailLowStock: boolean;
    emailNewCustomer: boolean;
    emailPaymentReceived: boolean;
    emailDailyReport: boolean;
    emailWeeklyReport: boolean;
    recipientEmails: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const SiteSettingsSchema = new Schema<ISiteSettings>(
  {
    key: { type: String, required: true, unique: true, default: 'main' },
    general: {
      siteName: {
        en: { type: String, default: '' },
        ar: { type: String, default: '' },
      },
      contactEmail: { type: String, default: '' },
      contactPhone: { type: String, default: '' },
      contactAddress: {
        en: { type: String, default: '' },
        ar: { type: String, default: '' },
      },
      companyName: {
        en: { type: String, default: '' },
        ar: { type: String, default: '' },
      },
      socialMedia: {
        instagram: { type: String, default: '' },
        twitter: { type: String, default: '' },
        linkedin: { type: String, default: '' },
        facebook: { type: String, default: '' },
      },
    },
    referral: {
      enabled: { type: Boolean, default: true },
      creditAmount: { type: Number, default: 50 },
      minOrderForCredit: { type: Number, default: 100 },
      maxCreditsPerUser: { type: Number, default: 500 },
      expirationDays: { type: Number, default: 365 },
    },
    notifications: {
      emailNewOrder: { type: Boolean, default: true },
      emailOrderStatusChange: { type: Boolean, default: true },
      emailLowStock: { type: Boolean, default: true },
      emailNewCustomer: { type: Boolean, default: false },
      emailPaymentReceived: { type: Boolean, default: true },
      emailDailyReport: { type: Boolean, default: true },
      emailWeeklyReport: { type: Boolean, default: false },
      recipientEmails: { type: String, default: '' },
    },
  },
  { timestamps: true }
);

SiteSettingsSchema.index({ key: 1 }, { unique: true });

const SiteSettings =
  mongoose.models.SiteSettings ||
  mongoose.model<ISiteSettings>('SiteSettings', SiteSettingsSchema);
export default SiteSettings;
