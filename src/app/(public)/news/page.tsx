'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Calendar, ArrowRight } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface NewsItem {
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  category: string;
  imageUrl?: string;
}

const newsImages: Record<string, string> = {
  'kcc-expands-production-capacity': 'https://images.pexels.com/photos/3861969/pexels-photo-3861969.jpeg?auto=compress&cs=tinysrgb&w=1200',
  'iso-22716-certification': 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=800&q=80',
  'sustainable-packaging-initiative': 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=800&q=80',
  'beauty-world-middle-east-2024': 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=800&q=80',
  'advanced-skincare-formulations': 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=800&q=80',
  'partnership-with-sfda': 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=800&q=80',
};

const demoNews: NewsItem[] = [
  {
    slug: 'kcc-expands-production-capacity',
    title: 'KCC Expands Production Capacity with New Facility',
    excerpt: 'KCC announces the opening of a new state-of-the-art manufacturing facility in Riyadh, increasing production capacity by 40%.',
    date: '2024-12-15',
    category: 'Company News',
  },
  {
    slug: 'iso-22716-certification',
    title: 'KCC Achieves ISO 22716 GMP Certification',
    excerpt: 'Our commitment to quality has been recognized with the prestigious ISO 22716 Good Manufacturing Practices certification.',
    date: '2024-11-20',
    category: 'Certification',
  },
  {
    slug: 'sustainable-packaging-initiative',
    title: 'Launching Our Sustainable Packaging Initiative',
    excerpt: 'KCC introduces eco-friendly packaging options for all product lines, supporting environmental sustainability goals.',
    date: '2024-10-08',
    category: 'Sustainability',
  },
  {
    slug: 'beauty-world-middle-east-2024',
    title: 'KCC at Beautyworld Middle East 2024',
    excerpt: 'Visit our booth at Beautyworld Middle East to discover our latest innovations in cosmetics manufacturing.',
    date: '2024-09-15',
    category: 'Events',
  },
  {
    slug: 'advanced-skincare-formulations',
    title: 'New Advanced Skincare Formulation Line',
    excerpt: 'Our R&D team has developed cutting-edge formulations featuring peptide complexes and advanced active ingredients.',
    date: '2024-08-22',
    category: 'Innovation',
  },
  {
    slug: 'partnership-with-sfda',
    title: 'KCC Partners with SFDA for Regulatory Excellence',
    excerpt: 'Strategic partnership with the Saudi Food & Drug Authority to streamline product registration and compliance processes.',
    date: '2024-07-10',
    category: 'Regulatory',
  },
];

export default function NewsPage() {
  const { t } = useLanguage();
  const [news, setNews] = useState<NewsItem[]>(demoNews);

  // Attempt to fetch real data, fall back to demo
  useEffect(() => {
    const fetchNews = async () => {
      try {
        const res = await fetch('/api/cms?type=news');
        if (res.ok) {
          const data = await res.json();
          if (data.items && data.items.length > 0) {
            setNews(data.items);
          }
        }
      } catch {
        // Use demo data
      }
    };
    fetchNews();
  }, []);

  return (
    <div className="min-h-screen bg-cream-100">
      {/* Hero */}
      <section className="relative pt-8 pb-20 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-cream-100 to-cream-50" />
        <div className="absolute top-1/4 -right-32 w-80 h-80 rounded-full bg-kcc-rose-light/40 blur-[120px]" />

        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h1 className="text-4xl sm:text-5xl font-bold text-ink-700 mb-4">{t('news.title')}</h1>
            <p className="text-lg text-cream-800">{t('news.subtitle')}</p>
          </motion.div>
        </div>
      </section>

      {/* News Grid */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {news.map((item, i) => (
              <motion.div
                key={item.slug}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <Link
                  href={`/news/${item.slug}`}
                  className="group block bg-white border border-cream-300 shadow-soft rounded-2xl overflow-hidden hover:border-cream-400 transition-all duration-300"
                >
                  {/* News image */}
                  <div className="aspect-video overflow-hidden relative">
                    <img
                      src={newsImages[item.slug] || 'https://images.unsplash.com/photo-1512496015851-a90fb38ba796?w=800&q=80'}
                      alt={item.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-cream-50/70 to-transparent" />
                  </div>

                  <div className="p-5">
                    {/* Category & Date */}
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-xs font-medium text-kcc-green bg-kcc-green/10 px-2.5 py-1 rounded-full">
                        {item.category}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-cream-600">
                        <Calendar size={12} />
                        {new Date(item.date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                    </div>

                    {/* Title */}
                    <h3 className="text-lg font-semibold text-ink-700 mb-2 group-hover:text-kcc-green transition-colors line-clamp-2">
                      {item.title}
                    </h3>

                    {/* Excerpt */}
                    <p className="text-sm text-cream-700 leading-relaxed line-clamp-3 mb-4">
                      {item.excerpt}
                    </p>

                    {/* Read More */}
                    <span className="inline-flex items-center gap-1.5 text-sm font-medium text-kcc-green group-hover:gap-2.5 transition-all">
                      {t('common.readMore')}
                      <ArrowRight size={14} />
                    </span>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
