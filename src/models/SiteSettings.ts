import mongoose, { Schema, Document } from 'mongoose';

export interface ISiteSettings extends Document {
  key: string;
  general: {
    siteName: { en: string; ar: string };
    contactEmail: string;
    contactPhone: string;
    whatsapp: string;
    contactAddress: { en: string; ar: string };
    companyName: { en: string; ar: string };
    emails: {
      info: string;
      sales: string;
      support: string;
      hr: string;
      careers: string;
    };
    phones: {
      primary: string;
      secondary: string;
    };
    socialMedia: {
      instagram: string;
      twitter: string;
      linkedin: string;
      facebook: string;
      youtube: string;
      tiktok: string;
      snapchat: string;
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
      whatsapp: { type: String, default: '' },
      contactAddress: {
        en: { type: String, default: '' },
        ar: { type: String, default: '' },
      },
      companyName: {
        en: { type: String, default: '' },
        ar: { type: String, default: '' },
      },
      emails: {
        info: { type: String, default: '' },
        sales: { type: String, default: '' },
        support: { type: String, default: '' },
        hr: { type: String, default: '' },
        careers: { type: String, default: '' },
      },
      phones: {
        primary: { type: String, default: '' },
        secondary: { type: String, default: '' },
      },
      socialMedia: {
        instagram: { type: String, default: '' },
        twitter: { type: String, default: '' },
        linkedin: { type: String, default: '' },
        facebook: { type: String, default: '' },
        youtube: { type: String, default: '' },
        tiktok: { type: String, default: '' },
        snapchat: { type: String, default: '' },
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
