import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import SiteSettings from '@/models/SiteSettings';

export const dynamic = 'force-dynamic';

/**
 * Public, read-only view of the display-safe site settings (contact info,
 * emails, phones, address, social links). Consumed by the footer, contact
 * page, etc. Never exposes referral/notification config.
 */
export async function GET() {
  try {
    await connectDB();
    const settings: any = await SiteSettings.findOne({ key: 'main' }).lean();
    const g = settings?.general || {};
    return NextResponse.json({
      companyName: g.companyName || { en: '', ar: '' },
      siteName: g.siteName || { en: '', ar: '' },
      contactEmail: g.contactEmail || '',
      contactPhone: g.contactPhone || '',
      whatsapp: g.whatsapp || '',
      contactAddress: g.contactAddress || { en: '', ar: '' },
      emails: g.emails || {},
      phones: g.phones || {},
      socialMedia: g.socialMedia || {},
    });
  } catch {
    return NextResponse.json({
      companyName: { en: '', ar: '' }, siteName: { en: '', ar: '' },
      contactEmail: '', contactPhone: '', whatsapp: '',
      contactAddress: { en: '', ar: '' }, emails: {}, phones: {}, socialMedia: {},
    });
  }
}
