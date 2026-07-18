'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, Calendar } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface NewsItem {
  id: string;
  date: string;
  title: { en: string; ar: string };
  excerpt: { en: string; ar: string };
  image: string;
}

const newsItems: NewsItem[] = [
  {
    id: '1',
    date: '2025-12-15',
    title: {
      en: 'KCC Expands Production Capacity with New Facility',
      ar: 'KCC توسع قدراتها الإنتاجية بمنشأة جديدة',
    },
    excerpt: {
      en: 'Our new state-of-the-art manufacturing facility increases production capacity by 40%, enabling us to serve more brands across the MENA region.',
      ar: 'منشأتنا الجديدة الحديثة تزيد الطاقة الإنتاجية بنسبة 40٪، مما يمكننا من خدمة المزيد من العلامات التجارية في منطقة الشرق الأوسط.',
    },
    image: 'https://images.pexels.com/photos/3861969/pexels-photo-3861969.jpeg?auto=compress&cs=tinysrgb&w=1200',
  },
  {
    id: '2',
    date: '2025-11-28',
    title: {
      en: 'International Quality Certification Renewed',
      ar: 'تجديد شهادة الجودة الدولية',
    },
    excerpt: {
      en: 'KCC successfully renewed its ISO 22716 and GMP certifications, reaffirming our commitment to the highest quality standards in cosmetics manufacturing.',
      ar: 'جددت KCC بنجاح شهادات ISO 22716 و GMP، مؤكدة التزامها بأعلى معايير الجودة في تصنيع مستحضرات التجميل.',
    },
    image: 'https://images.unsplash.com/photo-1579154204601-01588f351e67?w=800&q=80',
  },
  {
    id: '3',
    date: '2025-10-10',
    title: {
      en: 'KCC Partners with Leading Skincare Innovators',
      ar: 'KCC تتعاون مع رواد الابتكار في العناية بالبشرة',
    },
    excerpt: {
      en: 'A new strategic partnership bringing cutting-edge skincare ingredients and formulation technologies to the Saudi Arabian market.',
      ar: 'شراكة استراتيجية جديدة تجلب أحدث مكونات وتقنيات تركيب العناية بالبشرة إلى السوق السعودي.',
    },
    image: 'https://images.pexels.com/photos/7755654/pexels-photo-7755654.jpeg?auto=compress&cs=tinysrgb&w=1200',
  },
];

function formatDate(dateStr: string, locale: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: 'easeOut' as const },
  },
};

export default function NewsSection() {
  const { t, locale } = useLanguage();

  return (
    <section className="relative py-12 lg:py-16 bg-cream-100 overflow-hidden">
      {/* Background */}
      <div className="absolute bottom-0 start-0 w-96 h-96 bg-kcc-rose-light/40 rounded-full blur-[200px]" />
      <div className="absolute top-0 end-0 w-72 h-72 bg-kcc-beige-light/30 rounded-full blur-[150px]" />
      <div className="absolute inset-0 dot-pattern opacity-40 pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <span className="inline-block px-4 py-1.5 mb-4 text-[11px] uppercase tracking-[0.25em] chip-rose rounded-full font-medium">
            {locale === 'ar' ? 'آخر التحديثات' : 'Latest Updates'}
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold mb-3">
            <span className="gradient-text">{t('sections.news')}</span>
          </h2>
          <p className="text-cream-700 text-base sm:text-lg max-w-2xl mx-auto">
            {t('sections.newsSubtitle')}
          </p>
        </motion.div>

        {/* News Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8"
        >
          {newsItems.map((item, idx) => {
            const cardClass = idx % 2 === 0 ? 'glass-card-blush' : 'glass-card-champagne';
            const hoverBorder = idx % 2 === 0 ? 'hover:border-kcc-rose/45' : 'hover:border-kcc-beige/55';
            return (
              <motion.div
                key={item.id}
                variants={cardVariants}
                className={`group ${cardClass} ${hoverBorder} overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-soft-lg`}
              >
                {/* Image */}
                <div className="relative h-48 overflow-hidden">
                  <img
                    src={item.image}
                    alt={locale === 'ar' ? item.title.ar : item.title.en}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-cream-50/95 via-cream-50/30 to-transparent" />

                  {/* Date badge */}
                  <div className="absolute bottom-4 start-4 flex items-center gap-1.5 px-3 py-1.5 bg-white/90 rounded-lg text-xs text-ink-600 backdrop-blur-sm shadow-soft">
                    <Calendar size={12} className="text-kcc-rose-dark" />
                    <span>{formatDate(item.date, locale)}</span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-ink-700 mb-3 line-clamp-2 group-hover:text-kcc-rose-dark transition-colors duration-200">
                    {locale === 'ar' ? item.title.ar : item.title.en}
                  </h3>
                  <p className="text-sm text-cream-700 leading-relaxed line-clamp-3 mb-4">
                    {locale === 'ar' ? item.excerpt.ar : item.excerpt.en}
                  </p>
                  <span className="inline-flex items-center gap-1.5 text-sm font-medium text-kcc-rose-dark group-hover:gap-2.5 transition-all duration-200">
                    {t('common.readMore')}
                    <ArrowRight size={14} className="rtl:rotate-180" />
                  </span>
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        {/* View All Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-center mt-12"
        >
          <Link
            href="/news"
            className="inline-flex items-center gap-2 px-8 py-3.5 btn-luxe-outline rounded-xl font-medium transition-all duration-300"
          >
            {t('common.viewAll')}
            <ArrowRight size={16} className="rtl:rotate-180" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
