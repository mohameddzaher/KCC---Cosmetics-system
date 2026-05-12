import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import SeoGlobal from '@/models/SeoGlobal';
import SeoPage from '@/models/SeoPage';
import { getSession } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const page = searchParams.get('page');

    if (page) {
      const pageSeo = await SeoPage.findOne({ page });
      if (!pageSeo) {
        return NextResponse.json({ error: 'SEO config not found for this page' }, { status: 404 });
      }
      return NextResponse.json(pageSeo);
    }

    let globalSeo = await SeoGlobal.findOne();
    if (!globalSeo) {
      globalSeo = await SeoGlobal.create({
        titleTemplate: { en: '%s | KCC', ar: '%s | KCC' },
        defaultDescription: { en: '', ar: '' },
      });
    }

    return NextResponse.json(globalSeo);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch SEO config' }, { status: 500 });
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
    const { type, page, ...seoData } = body;

    if (!type || !['global', 'page'].includes(type)) {
      return NextResponse.json({ error: 'Valid type is required: global or page' }, { status: 400 });
    }

    let result;

    if (type === 'global') {
      result = await SeoGlobal.findOneAndUpdate(
        {},
        seoData,
        { upsert: true, new: true, runValidators: true }
      );
    } else {
      if (!page) {
        return NextResponse.json({ error: 'Page slug is required for page SEO' }, { status: 400 });
      }
      result = await SeoPage.findOneAndUpdate(
        { page },
        { page, ...seoData },
        { upsert: true, new: true, runValidators: true }
      );
    }

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update SEO config' }, { status: 500 });
  }
}
