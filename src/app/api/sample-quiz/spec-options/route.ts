import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import SpecOptionMaster from '@/models/SpecOptionMaster';

export const dynamic = 'force-dynamic';

/**
 * GET /api/sample-quiz/spec-options
 *
 * Returns the master library of every spec option in every category.
 * The customer quiz uses this to look up labels/icons/colors when
 * rendering options selected by the per-product config.
 */
export async function GET() {
  try {
    await connectDB();
    const masters = await SpecOptionMaster.find({ active: true }).lean();
    return NextResponse.json(
      { categories: masters },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
