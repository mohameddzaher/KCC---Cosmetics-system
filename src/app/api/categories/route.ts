import { NextRequest, NextResponse } from 'next/server';
import slugify from 'slugify';
import connectDB from '@/lib/db';
import Category from '@/models/Category';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const ADMIN_ROLES = ['SUPER_ADMIN', 'ADMIN'];

// GET /api/categories -> full tree (public; used by admin + as quiz source)
export async function GET() {
  try {
    await connectDB();
    const categories = await Category.find().sort({ order: 1, name: 1 });
    return NextResponse.json(categories);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch categories' }, { status: 500 });
  }
}

// POST /api/categories -> create a new main category
export async function POST(req: NextRequest) {
  try {
    const user = await getSession();
    if (!user || !ADMIN_ROLES.includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    await connectDB();

    const body = await req.json();
    if (!body.name || !String(body.name).trim()) {
      return NextResponse.json({ error: 'Category name is required' }, { status: 400 });
    }
    const slug = (body.slug && String(body.slug).trim())
      ? slugify(String(body.slug), { lower: true, strict: true })
      : slugify(String(body.name), { lower: true, strict: true });

    const clash = await Category.findOne({ slug });
    if (clash) {
      return NextResponse.json({ error: 'A category with this slug already exists' }, { status: 409 });
    }

    const last = await Category.findOne().sort({ order: -1 });
    const category = await Category.create({
      name: body.name,
      slug,
      order: body.order ?? ((last?.order ?? 0) + 1),
      active: body.active ?? true,
      subcategories: [],
    });
    return NextResponse.json(category, { status: 201 });
  } catch (error: any) {
    if (error.code === 11000) {
      return NextResponse.json({ error: 'Slug already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message || 'Failed to create category' }, { status: 500 });
  }
}
