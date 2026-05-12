import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import ProductSpecConfig from '@/models/ProductSpecConfig';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/sample-quiz/product-config/[productKey]
 *
 * Public — returns the spec configuration for a specific product
 * (level-3 item). The customer quiz uses this to render Phase 4
 * dynamically.
 *
 * No caching — admin edits go live instantly.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ productKey: string }> }) {
  try {
    await connectDB();
    const { productKey } = await params;
    const config = await ProductSpecConfig.findOne({ productKey, active: true }).lean();
    if (!config) return NextResponse.json({ error: 'Not configured' }, { status: 404 });
    return NextResponse.json(config, {
      headers: { 'Cache-Control': 'no-store, max-age=0' },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

async function requireAdmin() {
  const session = await getSession();
  if (!session || !['SUPER_ADMIN', 'ADMIN'].includes(session.role)) return null;
  return session;
}

/**
 * PUT /api/sample-quiz/product-config/[productKey]
 *
 * Admin — upsert the configuration for a product.
 */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ productKey: string }> }) {
  try {
    if (!(await requireAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    await connectDB();
    const { productKey } = await params;
    const body = await req.json();
    const config = await ProductSpecConfig.findOneAndUpdate(
      { productKey },
      { ...body, productKey },
      { new: true, upsert: true, runValidators: true }
    );
    return NextResponse.json(config);
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
