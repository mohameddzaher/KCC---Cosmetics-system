import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import SiteSettings from '@/models/SiteSettings';
import { getSession } from '@/lib/auth';

const defaultSettings = {
  key: 'main',
  general: {
    siteName: { en: 'KCC - Kuwait Custom Cups', ar: 'KCC - \u0623\u0643\u0648\u0627\u0628 \u0627\u0644\u0643\u0648\u064a\u062a \u0627\u0644\u0645\u062e\u0635\u0635\u0629' },
    contactEmail: '',
    contactPhone: '',
    contactAddress: { en: '', ar: '' },
    companyName: { en: 'Kuwait Custom Cups Co.', ar: '\u0634\u0631\u0643\u0629 \u0623\u0643\u0648\u0627\u0628 \u0627\u0644\u0643\u0648\u064a\u062a \u0627\u0644\u0645\u062e\u0635\u0635\u0629' },
    socialMedia: {
      instagram: '',
      twitter: '',
      linkedin: '',
      facebook: '',
    },
  },
  referral: {
    enabled: true,
    creditAmount: 50,
    minOrderForCredit: 100,
    maxCreditsPerUser: 500,
    expirationDays: 365,
  },
  notifications: {
    emailNewOrder: true,
    emailOrderStatusChange: true,
    emailLowStock: true,
    emailNewCustomer: false,
    emailPaymentReceived: true,
    emailDailyReport: true,
    emailWeeklyReport: false,
    recipientEmails: '',
  },
};

export async function GET(req: NextRequest) {
  try {
    const user = await getSession();
    if (!user || !['SUPER_ADMIN', 'ADMIN'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    await connectDB();

    let settings = await SiteSettings.findOne({ key: 'main' });

    if (!settings) {
      settings = await SiteSettings.create(defaultSettings);
    }

    return NextResponse.json(settings);
  } catch (error: any) {
    console.error('Settings GET error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getSession();
    if (!user || !['SUPER_ADMIN', 'ADMIN'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    await connectDB();

    const body = await req.json();
    const { section, data } = body;

    if (!section || !data) {
      return NextResponse.json(
        { error: 'section and data are required' },
        { status: 400 }
      );
    }

    if (!['general', 'referral', 'notifications'].includes(section)) {
      return NextResponse.json(
        { error: 'Invalid section. Must be general, referral, or notifications' },
        { status: 400 }
      );
    }

    const updateQuery: Record<string, unknown> = {};
    updateQuery[section] = data;

    const settings = await SiteSettings.findOneAndUpdate(
      { key: 'main' },
      { $set: updateQuery },
      { new: true, upsert: true, runValidators: true }
    );

    return NextResponse.json(settings);
  } catch (error: any) {
    console.error('Settings PUT error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update settings' },
      { status: 500 }
    );
  }
}
