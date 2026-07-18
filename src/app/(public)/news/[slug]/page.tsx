'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Calendar, User, Share2, Facebook, Twitter, Linkedin } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface NewsPost {
  slug: string;
  title: string;
  content: string;
  excerpt: string;
  date: string;
  author: string;
  category: string;
}

const demoArticles: Record<string, NewsPost> = {
  'kcc-expands-production-capacity': {
    slug: 'kcc-expands-production-capacity',
    title: 'KCC Expands Production Capacity with New Facility',
    excerpt: 'KCC announces the opening of a new state-of-the-art manufacturing facility in Riyadh.',
    content: `KCC is proud to announce the opening of our newest manufacturing facility in Riyadh's Industrial City. This expansion represents a significant milestone in our journey to become the leading cosmetics manufacturer in the MENA region.

The new facility spans over 5,000 square meters and features state-of-the-art equipment for emulsion production, filling, and packaging. With this addition, our total production capacity increases by 40%, allowing us to serve more clients and handle larger orders efficiently.

Key features of the new facility include:

- Advanced automated production lines capable of handling multiple product formats simultaneously
- Clean room environments meeting ISO Class 7 standards for sensitive formulations
- Expanded R&D laboratory with cutting-edge analytical instruments
- Dedicated quality control area with stability testing chambers
- Energy-efficient design with solar panels and water recycling systems

"This expansion reflects our commitment to meeting the growing demand for high-quality cosmetics manufacturing in the region," said our CEO. "We're not just adding capacity; we're raising the bar for manufacturing excellence."

The facility is expected to be fully operational by Q1 2025, and we are already accepting orders for the expanded production lines.`,
    date: '2024-12-15',
    author: 'KCC Communications Team',
    category: 'Company News',
  },
  'iso-22716-certification': {
    slug: 'iso-22716-certification',
    title: 'KCC Achieves ISO 22716 GMP Certification',
    excerpt: 'Our commitment to quality recognized with ISO 22716 certification.',
    content: `We are thrilled to announce that KCC has successfully achieved ISO 22716 Good Manufacturing Practices (GMP) certification for cosmetics manufacturing. This internationally recognized standard demonstrates our unwavering commitment to quality and safety.

ISO 22716 provides comprehensive guidelines for the production, control, storage, and shipment of cosmetic products. Achieving this certification involved a rigorous audit process that evaluated every aspect of our manufacturing operations.

This certification covers:

- Personnel competency and training programs
- Premises and equipment maintenance standards
- Raw materials and packaging component controls
- Production process documentation and validation
- Quality control laboratory procedures
- Finished product testing and release protocols

The certification audit was conducted by an accredited international certification body, and our facilities achieved compliance across all evaluation criteria without any major non-conformities.

This achievement positions KCC as one of the few cosmetics manufacturers in Saudi Arabia to hold this prestigious certification, providing our clients with additional assurance of product quality and regulatory compliance.`,
    date: '2024-11-20',
    author: 'Quality Assurance Department',
    category: 'Certification',
  },
};

export default function NewsArticlePage() {
  const { t, locale } = useLanguage();
  const params = useParams();
  const slug = params.slug as string;
  const [article, setArticle] = useState<NewsPost | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const pick = (v: any) => (typeof v === 'object' && v ? (v[locale] || v.en || '') : (v || ''));
    (async () => {
      try {
        const res = await fetch('/api/content/news', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          const found = Array.isArray(data) ? data.find((n: any) => n.slug === slug) : null;
          if (found && !cancelled) {
            setArticle({
              slug: found.slug,
              title: pick(found.title),
              content: pick(found.content),
              excerpt: pick(found.excerpt),
              date: found.publishedAt || found.createdAt || '',
              author: found.author || 'KCC Team',
              category: (Array.isArray(found.tags) && found.tags[0]) || 'News',
            });
            setLoading(false);
            return;
          }
        }
      } catch {
        // fall through to demo/not-found
      }
      if (cancelled) return;
      // Demo fallback (for the seeded demo slugs), otherwise mark as not found.
      setArticle(demoArticles[slug] || null);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [slug, locale]);

  if (loading) {
    return (
      <div className="min-h-screen bg-cream-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-kcc-green" />
      </div>
    );
  }

  if (!article) {
    return (
      <div className="min-h-screen bg-cream-100 flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-ink-700 mb-3">{locale === 'ar' ? 'المقال غير موجود' : 'Article not found'}</h1>
          <p className="text-cream-700 mb-6">{locale === 'ar' ? 'المقال اللي بتدور عليه مش موجود أو اتشال.' : "The article you're looking for doesn't exist or was removed."}</p>
          <Link href="/news" className="inline-flex items-center gap-2 px-5 py-2.5 bg-kcc-green hover:bg-kcc-green-light text-white rounded-xl transition-colors">
            <ArrowLeft size={16} /> {t('news.title')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream-100">
      {/* Hero */}
      <section className="relative pt-8 pb-20 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-cream-100 to-cream-50" />
        <div className="absolute top-1/4 -left-32 w-80 h-80 rounded-full bg-kcc-rose-light/40 blur-[120px]" />

        <div className="relative z-10 max-w-3xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            {/* Back button */}
            <Link
              href="/news"
              className="inline-flex items-center gap-2 text-sm text-cream-700 hover:text-ink-700 transition-colors mb-8"
            >
              <ArrowLeft size={16} />
              {t('common.back')} to {t('news.title')}
            </Link>

            {/* Category */}
            <span className="inline-block text-xs font-medium text-kcc-green bg-kcc-green/10 px-3 py-1 rounded-full mb-4">
              {article.category}
            </span>

            {/* Title */}
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-ink-700 mb-6 leading-tight">
              {article.title}
            </h1>

            {/* Meta */}
            <div className="flex items-center gap-6 text-sm text-cream-700">
              <span className="flex items-center gap-2">
                <Calendar size={14} />
                {new Date(article.date).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
              <span className="flex items-center gap-2">
                <User size={14} />
                {article.author}
              </span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Content */}
      <section className="py-12 px-4">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            {/* Article featured image */}
            <div className="aspect-video rounded-2xl overflow-hidden border border-cream-400 mb-10 relative">
              <img
                src={
                  slug === 'kcc-expands-production-capacity'
                    ? 'https://images.pexels.com/photos/3861969/pexels-photo-3861969.jpeg?auto=compress&cs=tinysrgb&w=1600'
                    : slug === 'kcc-partners-with-leading-skincare-innovators'
                    ? 'https://images.pexels.com/photos/7755654/pexels-photo-7755654.jpeg?auto=compress&cs=tinysrgb&w=1600'
                    : slug === 'iso-22716-certification'
                    ? 'https://images.unsplash.com/photo-1579154204601-01588f351e67?w=1200&q=80'
                    : 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=1200&q=80'
                }
                alt={article.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-cream-50/30 to-transparent" />
            </div>

            {/* Article body */}
            <div className="prose prose-invert prose-lg max-w-none">
              {article.content.split('\n\n').map((paragraph, i) => {
                if (paragraph.startsWith('- ')) {
                  const items = paragraph.split('\n');
                  return (
                    <ul key={i} className="space-y-2 my-6">
                      {items.map((item, j) => (
                        <li key={j} className="text-cream-800 leading-relaxed flex items-start gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-kcc-green mt-2.5 shrink-0" />
                          <span>{item.replace(/^- /, '')}</span>
                        </li>
                      ))}
                    </ul>
                  );
                }
                return (
                  <p key={i} className="text-cream-800 leading-relaxed mb-6">
                    {paragraph}
                  </p>
                );
              })}
            </div>

            {/* Share buttons placeholder */}
            <div className="mt-12 pt-8 border-t border-cream-300">
              <div className="flex items-center gap-4">
                <span className="text-sm text-cream-700 flex items-center gap-2">
                  <Share2 size={16} />
                  Share this article
                </span>
                <div className="flex items-center gap-2">
                  {[Facebook, Twitter, Linkedin].map((Icon, i) => (
                    <button
                      key={i}
                      className="p-2 rounded-lg bg-cream-200 text-cream-700 hover:text-kcc-green hover:bg-cream-300 transition-colors"
                    >
                      <Icon size={16} />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
