'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Beaker, FlaskConical, ShieldCheck, Package, Truck, FileCheck, Factory } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

const ICONS: Record<string, LucideIcon> = {
  Beaker, FlaskConical, ShieldCheck, Package, Truck, FileCheck, Factory,
};

const services = [
  {
    icon: Beaker,
    title: { en: 'Private Label Manufacturing', ar: 'تصنيع العلامة الخاصة' },
    description: {
      en: 'Full-service private label production for your cosmetics brand with end-to-end manufacturing capabilities.',
      ar: 'إنتاج كامل بالعلامة الخاصة لعلامتك التجارية لمستحضرات التجميل مع قدرات تصنيع شاملة.',
    },
    image: 'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=800&q=80',
    accent: 'rose' as const,
  },
  {
    icon: FlaskConical,
    title: { en: 'Custom Formulation', ar: 'تركيبات مخصصة' },
    description: {
      en: 'Bespoke formulations crafted by expert chemists to match your unique product vision and market needs.',
      ar: 'تركيبات مخصصة من قبل كيميائيين خبراء لتتناسب مع رؤيتك الفريدة واحتياجات السوق.',
    },
    image: 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=800&q=80',
    accent: 'champagne' as const,
  },
  {
    icon: ShieldCheck,
    title: { en: 'Quality Testing', ar: 'اختبارات الجودة' },
    description: {
      en: 'Rigorous quality control and stability testing to ensure every product meets international safety standards.',
      ar: 'رقابة صارمة على الجودة واختبارات الثبات لضمان مطابقة كل منتج للمعايير الدولية.',
    },
    image: 'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=800&q=80',
    accent: 'rose' as const,
  },
  {
    icon: Package,
    title: { en: 'Packaging Solutions', ar: 'حلول التغليف' },
    description: {
      en: 'Comprehensive packaging design and sourcing to create a premium shelf presence for your products.',
      ar: 'تصميم وتوفير تغليف شامل لإنشاء حضور متميز لمنتجاتك على الرفوف.',
    },
    image: 'https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=800&q=80',
    accent: 'champagne' as const,
  },
  {
    icon: Truck,
    title: { en: 'Logistics & Export', ar: 'الخدمات اللوجستية والتصدير' },
    description: {
      en: 'Seamless logistics and export services to deliver your products to markets across the MENA region and beyond.',
      ar: 'خدمات لوجستية وتصدير سلسة لإيصال منتجاتك إلى الأسواق في منطقة الشرق الأوسط وخارجها.',
    },
    image: 'https://images.unsplash.com/photo-1581093450021-4a7360e9a6b5?w=800&q=80',
    accent: 'rose' as const,
  },
  {
    icon: FileCheck,
    title: { en: 'Regulatory Compliance', ar: 'الامتثال التنظيمي' },
    description: {
      en: 'Expert guidance through SFDA, GCC, and international regulatory requirements for smooth market entry.',
      ar: 'إرشاد متخصص عبر متطلبات هيئة الغذاء والدواء ودول الخليج والمتطلبات الدولية لدخول سلس للسوق.',
    },
    image: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&q=80',
    accent: 'champagne' as const,
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
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

export default function ServicesSection() {
  const { t, locale } = useLanguage();
  const [items, setItems] = useState(services);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/content/services', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (cancelled || !Array.isArray(data) || data.length === 0) return;
        setItems(
          data.map((s: any, i: number) => ({
            icon: ICONS[s.icon] || Beaker,
            title: s.title || { en: '', ar: '' },
            description: s.description || { en: '', ar: '' },
            image: s.image || services[i % services.length].image,
            accent: (i % 2 === 0 ? 'rose' : 'champagne') as 'rose' | 'champagne',
          }))
        );
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  return (
    <section className="relative py-12 lg:py-16 bg-cream-50 overflow-hidden">
      {/* Background subtle glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-kcc-rose-light/40 rounded-full blur-[200px]" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-kcc-beige-light/30 rounded-full blur-[180px]" />
      <div className="absolute inset-0 dot-pattern opacity-50 pointer-events-none" />

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
            {locale === 'ar' ? 'خدماتنا الفاخرة' : 'Our Luxe Services'}
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold mb-3">
            <span className="gradient-text">{t('sections.services')}</span>
          </h2>
          <p className="text-cream-700 text-base sm:text-lg max-w-2xl mx-auto">
            {t('sections.servicesSubtitle')}
          </p>
        </motion.div>

        {/* Services Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8"
        >
          {items.map((service, index) => {
            const Icon = service.icon;
            const cardClass = service.accent === 'rose' ? 'glass-card-blush' : 'glass-card-champagne';
            const iconBg = service.accent === 'rose'
              ? 'bg-gradient-to-br from-kcc-rose to-kcc-rose-dark'
              : 'bg-gradient-to-br from-kcc-beige to-kcc-beige-dark';
            const hoverBorder = service.accent === 'rose'
              ? 'hover:border-kcc-rose/45'
              : 'hover:border-kcc-beige/55';
            return (
              <motion.div
                key={index}
                variants={cardVariants}
                className={`${cardClass} ${hoverBorder} overflow-hidden group transition-all duration-300 hover:-translate-y-1 hover:shadow-soft-lg`}
              >
                {/* Service Image */}
                <div className="relative h-44 sm:h-48 overflow-hidden">
                  <img
                    src={service.image}
                    alt={locale === 'ar' ? service.title.ar : service.title.en}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-cream-50/95 via-cream-50/30 to-transparent" />
                  {/* Icon overlay */}
                  <div className={`absolute bottom-3 start-3 w-12 h-12 rounded-2xl ${iconBg} backdrop-blur-sm flex items-center justify-center shadow-soft-lg`}>
                    <Icon size={20} className="text-white" />
                  </div>
                </div>

                <div className="p-6 lg:p-7">
                  {/* Title */}
                  <h3 className="text-lg font-semibold text-ink-700 mb-3 group-hover:text-kcc-green transition-colors">
                    {locale === 'ar' ? service.title.ar : service.title.en}
                  </h3>

                  {/* Description */}
                  <p className="text-sm text-cream-700 leading-relaxed">
                    {locale === 'ar' ? service.description.ar : service.description.en}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
