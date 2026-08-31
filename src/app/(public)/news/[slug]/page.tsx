'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, Calendar, User, Share2, Facebook, Twitter, Linkedin } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { onImgError } from '@/lib/imageFallback';

interface NewsPost {
  /** The post's own cover image. */
  image?: string;
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
  const { tx, locale } = useLanguage();
  const params = useParams();
  const slug = params.slug as string;
  const [article, setArticle] = useState<NewsPost | null>(null);
  const [loading, setLoading] = useState(true);
  const reduce = useReducedMotion();

  /* Real share targets. These were three buttons with no handler. */
  const shareUrl = typeof window === 'undefined' ? '' : window.location.href;
  const shareText = article?.title || '';
  const shareLinks = [
    {
      key: 'x',
      Icon: Twitter,
      label: 'X / Twitter',
      href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`,
    },
    {
      key: 'linkedin',
      Icon: Linkedin,
      label: 'LinkedIn',
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`,
    },
    {
      key: 'facebook',
      Icon: Facebook,
      label: 'Facebook',
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
    },
  ];

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
              category: (Array.isArray(found.tags) && found.tags[0]) || '',
              image: found.imageUrl || '',
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
          <h1 className="mb-3 font-serif text-3xl text-ink-800">{tx('Article not found')}</h1>
          <p className="mb-7 text-cream-800">{tx('That article does not exist, or it has been taken down.')}</p>
          <Link href="/news" className="btn btn-primary btn-sm">
            <ArrowLeft size={14} className="rtl-flip" />
            {tx('Back to all news')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <article className="min-h-screen bg-cream-100">
      {/* Header */}
      <header className="relative overflow-hidden pb-10 pt-10 lg:pb-14 lg:pt-16">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-cream-100 to-cream-50" />
        <div className="pointer-events-none absolute -top-24 start-1/4 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-kcc-rose-light/35 blur-[140px]" />

        <div className="page-shell relative z-10">
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mx-auto max-w-3xl text-center"
          >
            {/* One translated phrase, not "back" glued to a page name — that
                came out as "رجوع to الأخبار" in Arabic. */}
            <Link
              href="/news"
              className="mb-8 inline-flex items-center gap-2 text-sm text-cream-700 transition-colors hover:text-ink-700"
            >
              <ArrowLeft size={16} className="rtl-flip" />
              {tx('Back to all news')}
            </Link>

            {article.category && (
              <p className="mb-4 text-[11px] font-medium uppercase tracking-[0.3em] text-kcc-rose-dark">
                {article.category}
              </p>
            )}

            <h1 className="font-serif text-3xl leading-[1.12] text-ink-800 sm:text-4xl lg:text-[2.75rem]">
              {article.title}
            </h1>

            <div className="mx-auto mt-6 h-px w-14 bg-gradient-to-r from-transparent via-kcc-rose-dark/50 to-transparent" />

            {article.excerpt && (
              <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-cream-800">
                {article.excerpt}
              </p>
            )}

            <div className="mt-7 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-cream-700">
              <span className="flex items-center gap-2">
                <Calendar size={14} />
                {article.date
                  ? new Date(article.date).toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-GB', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })
                  : ''}
              </span>
              <span className="flex items-center gap-2">
                <User size={14} />
                {article.author}
              </span>
            </div>
          </motion.div>
        </div>
      </header>

      <div className="page-shell pb-20">
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.12 }}
          className="mx-auto max-w-3xl"
        >
          {/* The post's own cover. It used to be picked by a hardcoded switch
              on the slug, so every post added since fell through to a stock
              default that had nothing to do with it. */}
          {article.image && (
            <figure className="relative mb-12 aspect-[16/9] overflow-hidden rounded-3xl border border-cream-300 shadow-soft-lg">
              <img
                src={article.image}
                onError={onImgError}
                alt={article.title}
                className="h-full w-full object-cover"
              />
            </figure>
          )}

          {/* Body. The measure stays narrow on purpose — a 90rem-wide line of
              body copy is unreadable however much screen there is. */}
          <div className="text-[17px] leading-[1.85] text-cream-800">
            {article.content.split('\n\n').map((paragraph, i) => {
              if (paragraph.startsWith('- ')) {
                return (
                  <ul key={i} className="my-7 space-y-2.5">
                    {paragraph.split('\n').map((item, j) => (
                      <li key={j} className="flex items-start gap-3">
                        <span className="mt-[0.7em] h-1.5 w-1.5 shrink-0 rounded-full bg-kcc-rose-dark" />
                        <span>{item.replace(/^- /, '')}</span>
                      </li>
                    ))}
                  </ul>
                );
              }
              return (
                <p key={i} className="mb-6">
                  {paragraph}
                </p>
              );
            })}
          </div>

          {/* Share — real links, not decorative buttons. */}
          <div className="mt-14 border-t border-cream-300 pt-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <span className="flex items-center gap-2 text-sm text-cream-700">
                <Share2 size={16} />
                {tx('Share this article')}
              </span>
              <div className="flex items-center gap-2">
                {shareLinks.map(({ key, Icon, href, label }) => (
                  <a
                    key={key}
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={label}
                    title={label}
                    className="rounded-lg border border-cream-300 bg-surface p-2.5 text-cream-700 transition-colors hover:border-kcc-rose-dark/40 hover:text-kcc-rose-dark"
                  >
                    <Icon size={16} />
                  </a>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-12 text-center">
            <Link href="/news" className="btn btn-outline btn-sm">
              <ArrowLeft size={14} className="rtl-flip" />
              {tx('Back to all news')}
            </Link>
          </div>
        </motion.div>
      </div>
    </article>
  );
}