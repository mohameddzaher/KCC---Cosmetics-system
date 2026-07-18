import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { getSession } from '@/lib/auth';
import Service from '@/models/Service';
import Testimonial from '@/models/Testimonial';
import Certificate from '@/models/Certificate';
import Factory from '@/models/Factory';
import PortfolioItem from '@/models/PortfolioItem';
import FAQ from '@/models/FAQ';
import NewsPost from '@/models/NewsPost';

export const dynamic = 'force-dynamic';

const ADMIN_ROLES = ['SUPER_ADMIN', 'ADMIN'];

const MODELS: Record<string, any> = {
  services: Service,
  testimonials: Testimonial,
  certificates: Certificate,
  factories: Factory,
  portfolio: PortfolioItem,
  faqs: FAQ,
  news: NewsPost,
};

function resolve(type: string) {
  return MODELS[type] || null;
}

// GET /api/content/[type] -> public list (enabled/published only)
export async function GET(req: NextRequest, context: { params: Promise<{ type: string }> }) {
  try {
    const { type } = await context.params;
    const Model = resolve(type);
    if (!Model) return NextResponse.json({ error: 'Unknown content type' }, { status: 404 });

    await connectDB();
    const { searchParams } = new URL(req.url);
    const all = searchParams.get('all') === 'true';

    // Admins may request everything (incl. disabled) for management screens.
    let includeAll = false;
    if (all) {
      const user = await getSession();
      includeAll = !!user && ADMIN_ROLES.includes(user.role);
    }

    const filter: Record<string, unknown> = {};
    if (!includeAll) {
      if (type === 'news') filter.status = 'published';
      else filter.enabled = true;
    }

    const sort = type === 'news' ? { publishedAt: -1, createdAt: -1 } : { order: 1, createdAt: -1 };
    const items = await Model.find(filter).sort(sort as any);
    return NextResponse.json(items);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch content' }, { status: 500 });
  }
}

// POST /api/content/[type] -> create (admin only)
export async function POST(req: NextRequest, context: { params: Promise<{ type: string }> }) {
  try {
    const user = await getSession();
    if (!user || !ADMIN_ROLES.includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const { type } = await context.params;
    const Model = resolve(type);
    if (!Model) return NextResponse.json({ error: 'Unknown content type' }, { status: 404 });

    await connectDB();
    const body = await req.json();
    const created = await Model.create(body);
    return NextResponse.json(created, { status: 201 });
  } catch (error: any) {
    if (error.code === 11000) {
      return NextResponse.json({ error: 'A record with that unique field already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message || 'Failed to create' }, { status: 500 });
  }
}
