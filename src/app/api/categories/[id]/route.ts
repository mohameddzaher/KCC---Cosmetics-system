import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import slugify from 'slugify';
import connectDB from '@/lib/db';
import Category from '@/models/Category';
import { getSession } from '@/lib/auth';
import { reconcileCategoryConfigs, pruneCategoryConfigs } from '@/lib/categoryReconcile';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };
const ADMIN_ROLES = ['SUPER_ADMIN', 'ADMIN'];

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    await connectDB();
    const { id } = await context.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 });
    }
    const category = await Category.findById(id);
    if (!category) return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    return NextResponse.json(category);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

// PUT -> replace name/order/active and the full subcategories+items tree, then
// reconcile ProductSpecConfig so the quiz stays in sync. The main slug is immutable.
export async function PUT(req: NextRequest, context: RouteContext) {
  try {
    const user = await getSession();
    if (!user || !ADMIN_ROLES.includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    await connectDB();
    const { id } = await context.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 });
    }

    const category = await Category.findById(id);
    if (!category) return NextResponse.json({ error: 'Category not found' }, { status: 404 });

    const body = await req.json();

    if (body.name !== undefined) category.name = String(body.name).trim();
    if (body.order !== undefined) category.order = body.order;
    if (body.active !== undefined) category.active = body.active;

    if (Array.isArray(body.subcategories)) {
      const usedSlugs = new Set<string>();
      category.subcategories = body.subcategories.map((s: any, idx: number) => {
        const name = String(s.name || '').trim();
        // Preserve an existing sub slug; generate a unique one for new subs.
        let slug = (s.slug && String(s.slug).trim())
          ? String(s.slug).trim()
          : slugify(name || `sub-${idx}`, { lower: true, strict: true }) || `sub-${idx}`;
        while (usedSlugs.has(slug)) slug = `${slug}-${idx}`;
        usedSlugs.add(slug);
        const items = Array.isArray(s.items)
          ? s.items.map((it: any) => String(it).trim()).filter(Boolean)
          : [];
        return { name, slug, items, order: s.order ?? idx };
      });
    }

    await category.save();
    const result = await reconcileCategoryConfigs(category);

    return NextResponse.json({ category, reconcile: result });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

// DELETE -> remove the category and prune its product spec configs
export async function DELETE(req: NextRequest, context: RouteContext) {
  try {
    const user = await getSession();
    if (!user || !ADMIN_ROLES.includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    await connectDB();
    const { id } = await context.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 });
    }
    const category = await Category.findById(id);
    if (!category) return NextResponse.json({ error: 'Category not found' }, { status: 404 });

    await pruneCategoryConfigs(category.slug);
    await Category.findByIdAndDelete(id);

    return NextResponse.json({ message: 'Category deleted successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
