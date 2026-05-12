import { NextResponse } from 'next/server';
import { getAllCategories } from '@/lib/categories';

export const dynamic = 'force-static';

/**
 * GET /api/sample-quiz/categories
 *
 * Returns the full category tree from src/data/categories.json.
 * Static — categories are content, not configuration.
 */
export function GET() {
  return NextResponse.json({ categories: getAllCategories() });
}
