import type { Metadata } from 'next';
import connectDB from '@/lib/db';
import SeoPage from '@/models/SeoPage';
import { buildMetadata } from '@/lib/seo';

interface Fallback {
  title: string;
  description: string;
  path: string;
  image?: string;
  type?: 'website' | 'article';
}

/**
 * Resolves a page's metadata from the admin-managed SeoPage collection,
 * falling back to sensible static copy. This is what makes the /admin/seo
 * panel actually control what search engines see.
 */
export async function getPageMetadata(pageKey: string, fallback: Fallback): Promise<Metadata> {
  let title = fallback.title;
  let description = fallback.description;
  let image = fallback.image;
  let keywords: string[] | undefined;
  let noIndex = false;

  try {
    await connectDB();
    const doc: any = await SeoPage.findOne({ page: pageKey }).lean();
    if (doc) {
      title = doc.ogTitle?.en || doc.title?.en || title;
      description = doc.ogDescription?.en || doc.description?.en || description;
      image = doc.ogImage || image;
      if (doc.keywords?.en) keywords = String(doc.keywords.en).split(',').map((s: string) => s.trim()).filter(Boolean);
      if (typeof doc.robots === 'string' && doc.robots.includes('noindex')) noIndex = true;
    }
  } catch {
    // DB unavailable at build/runtime → static fallback still ships valid tags.
  }

  return buildMetadata({
    title,
    description,
    path: fallback.path,
    image,
    keywords,
    noIndex,
    type: fallback.type,
  });
}
