import { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/seo';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const staticPages: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}`, lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: `${SITE_URL}/about`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${SITE_URL}/production`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${SITE_URL}/certificates`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${SITE_URL}/factories`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${SITE_URL}/portfolio`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${SITE_URL}/news`, lastModified: now, changeFrequency: 'daily', priority: 0.8 },
    { url: `${SITE_URL}/contact`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${SITE_URL}/order`, lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${SITE_URL}/order/sample`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${SITE_URL}/order/bulk`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${SITE_URL}/policies`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${SITE_URL}/ai-assistant`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
  ];

  // Dynamic news posts — read the DB directly (robust, no self-fetch at build time)
  let newsPosts: MetadataRoute.Sitemap = [];
  try {
    const { default: connectDB } = await import('@/lib/db');
    const { default: NewsPost } = await import('@/models/NewsPost');
    await connectDB();
    const posts: any[] = await NewsPost.find({ status: 'published' })
      .select('slug updatedAt createdAt')
      .lean();
    newsPosts = posts
      .filter((p) => p.slug)
      .map((post) => ({
        url: `${SITE_URL}/news/${post.slug}`,
        lastModified: new Date(post.updatedAt || post.createdAt || now),
        changeFrequency: 'weekly',
        priority: 0.6,
      }));
  } catch {
    // silently fall back to static pages only
  }

  return [...staticPages, ...newsPosts];
}
