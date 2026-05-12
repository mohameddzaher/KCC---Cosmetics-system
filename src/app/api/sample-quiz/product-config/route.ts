import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import ProductSpecConfig from '@/models/ProductSpecConfig';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/sample-quiz/product-config
 *
 * Admin — list all product configs (used by admin landing page).
 */
export async function GET() {
  try {
    const session = await getSession();
    if (!session || !['SUPER_ADMIN', 'ADMIN'].includes(session.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    await connectDB();
    const configs = await ProductSpecConfig.find({}).sort({ mainSlug: 1, subSlug: 1, itemName: 1 }).lean();
    return NextResponse.json({ configs });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
