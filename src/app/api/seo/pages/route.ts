import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import SeoPage from '@/models/SeoPage';
import { getSession } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const user = await getSession();
    if (!user || !['SUPER_ADMIN', 'ADMIN'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    await connectDB();

    const pages = await SeoPage.find().sort({ page: 1 });
    return NextResponse.json(pages);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch page SEO entries' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSession();
    if (!user || !['SUPER_ADMIN', 'ADMIN'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    await connectDB();

    const body = await req.json();
    const { page, ...seoData } = body;

    if (!page) {
      return NextResponse.json({ error: 'Page slug is required' }, { status: 400 });
    }

    const result = await SeoPage.findOneAndUpdate(
      { page },
      { page, ...seoData },
      { upsert: true, new: true, runValidators: true }
    );

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to create/update page SEO' }, { status: 500 });
  }
}
