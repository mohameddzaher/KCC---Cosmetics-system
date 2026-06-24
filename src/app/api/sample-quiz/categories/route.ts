import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Category from '@/models/Category';
import { getAllCategories } from '@/lib/categories';

export const dynamic = 'force-dynamic';

/**
 * GET /api/sample-quiz/categories
 *
 * Live category tree from the DB (admin-editable). Falls back to the static
 * categories.json if the collection hasn't been seeded yet. force-dynamic +
 * the client's cache:'no-store' means admin edits show on the site instantly.
 */
export async function GET() {
  try {
    await connectDB();
    const cats = await Category.find({ active: true }).sort({ order: 1, name: 1 });

    if (cats.length > 0) {
      const categories = cats.map((c: any, i: number) => ({
        id: c.order ?? i + 1,
        name: c.name,
        slug: c.slug,
        level: 1,
        subcategories: [...c.subcategories]
          .sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0))
          .map((s: any) => ({
            name: s.name,
            slug: s.slug,
            level: 2,
            items: s.items || [],
          })),
      }));
      return NextResponse.json({ categories });
    }

    // Fallback: static file (pre-migration)
    return NextResponse.json({ categories: getAllCategories() });
  } catch {
    return NextResponse.json({ categories: getAllCategories() });
  }
}
