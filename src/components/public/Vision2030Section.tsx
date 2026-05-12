'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Building2, Leaf, ShieldCheck, Sparkles, BriefcaseBusiness, Cpu } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

type VisionFeature = {
  key: string;
  title: string;
  description: string;
};

type VisionContent = {
  badge: string;
  title: string;
  subtitle: string;
  description: string;
  ctaPrimary: string;
  ctaSecondary: string;
  pillars: VisionFeature[];
  highlights: Array<{ label: string; value: string }>;
};

type CmsItem = {
  fields?: {
    en?: Partial<VisionContent>;
    ar?: Partial<VisionContent>;
  };
};

const defaultContent: Record<'en' | 'ar', VisionContent> = {
  en: {
    badge: 'KCC x Saudi Vision 2030',
    title: 'Aligned With Vision 2030, Built for National Impact',
    subtitle: 'Innovation, local manufacturing, quality excellence, sustainability, and job creation.',
    description:
      'KCC is fully aligned with Saudi Vision 2030 by strengthening local cosmetic manufacturing, accelerating innovation, advancing quality standards, and enabling a more sustainable industrial future with measurable national value.',
    ctaPrimary: 'Start Your Project',
    ctaSecondary: 'Talk to Our Team',
    pillars: [
      {
        key: 'innovation',
        title: 'Innovation Driven',
        description: 'Advanced R&D and product development designed for GCC market needs and future-ready categories.',
      },
      {
        key: 'manufacturing',
        title: 'Local Manufacturing',
        description: 'Saudi-based production that supports in-Kingdom value chains and industrial self-reliance.',
      },
      {
        key: 'quality',
        title: 'Quality Leadership',
        description: 'GMP and regulatory-first operations that protect consumers and elevate product confidence.',
      },
      {
        key: 'sustainability',
        title: 'Sustainable Growth',
        description: 'Responsible manufacturing practices that reduce waste and improve long-term environmental performance.',
      },
      {
        key: 'jobs',
        title: 'Job Creation',
        description: 'Expanding skilled opportunities for Saudi talent across technical, operational, and commercial teams.',
      },
      {
        key: 'digital',
        title: 'Digital Transformation',
        description: 'Smart systems and data-led operations to improve speed, precision, and customer outcomes.',
      },
    ],
    highlights: [
      { label: 'Vision-Linked Programs', value: '6+' },
      { label: 'Saudi-Led Production', value: '100%' },
      { label: 'Quality Focus', value: 'GMP + SFDA' },
      { label: 'Sustainability Track', value: 'Active' },
    ],
  },
  ar: {
    badge: 'KCC × رؤية السعودية 2030',
    title: 'متوافقون مع رؤية 2030 ونقود أثراً وطنياً ملموساً',
    subtitle: 'ابتكار، تصنيع محلي، جودة عالية، استدامة، وتوليد وظائف نوعية.',
    description:
      'تعمل KCC بتوافق كامل مع رؤية السعودية 2030 من خلال تعزيز التصنيع المحلي لمستحضرات التجميل، وتسريع الابتكار، ورفع معايير الجودة، ودعم مستقبل صناعي أكثر استدامة بقيمة وطنية واضحة.',
    ctaPrimary: 'ابدأ مشروعك',
    ctaSecondary: 'تواصل مع فريقنا',
    pillars: [
      {
        key: 'innovation',
        title: 'ابتكار مستمر',
        description: 'بحث وتطوير متقدم لتقديم منتجات تلائم احتياجات السوق الخليجي والاتجاهات المستقبلية.',
      },
      {
        key: 'manufacturing',
        title: 'تصنيع محلي',
        description: 'إنتاج داخل المملكة يدعم سلاسل القيمة المحلية ويعزز الاكتفاء الصناعي.',
      },
      {
        key: 'quality',
        title: 'ريادة في الجودة',
        description: 'عمليات قائمة على معايير GMP والامتثال التنظيمي لضمان الثقة وسلامة المستهلك.',
      },
      {
        key: 'sustainability',
        title: 'نمو مستدام',
        description: 'ممارسات تصنيع مسؤولة تقلل الهدر وتدعم الأداء البيئي طويل المدى.',
      },
      {
        key: 'jobs',
        title: 'توليد وظائف',
        description: 'توسيع الفرص النوعية للكفاءات السعودية في الجوانب التقنية والتشغيلية والتجارية.',
      },
      {
        key: 'digital',
        title: 'تحول رقمي',
        description: 'أنظمة ذكية وتشغيل قائم على البيانات لرفع الكفاءة ودقة التنفيذ.',
      },
    ],
    highlights: [
      { label: 'مبادرات مرتبطة بالرؤية', value: '+6' },
      { label: 'تصنيع بقيادة سعودية', value: '100%' },
      { label: 'تركيز الجودة', value: 'GMP + SFDA' },
      { label: 'مسار الاستدامة', value: 'نشط' },
    ],
  },
};

const pillarIcons = [Sparkles, Building2, ShieldCheck, Leaf, BriefcaseBusiness, Cpu];

export default function Vision2030Section() {
  const { locale, t } = useLanguage();
  const [cmsItem, setCmsItem] = useState<CmsItem | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/cms?type=vision2030&enabled=true', { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setCmsItem(data[0]);
        }
      } catch {
        // keep default content
      }
    };
    load();
  }, []);

  const content = useMemo(() => {
    const lang = locale === 'ar' ? 'ar' : 'en';
    const fallback = defaultContent[lang];
    const custom = cmsItem?.fields?.[lang] || {};

    return {
      ...fallback,
      ...custom,
      pillars: Array.isArray(custom.pillars) && custom.pillars.length > 0 ? custom.pillars : fallback.pillars,
      highlights: Array.isArray(custom.highlights) && custom.highlights.length > 0 ? custom.highlights : fallback.highlights,
    } as VisionContent;
  }, [cmsItem, locale]);

  return (
    <section className="relative py-14 lg:py-20 bg-cream-100 overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-0 w-[420px] h-[420px] -translate-y-1/2 rounded-full bg-kcc-rose-light/40 blur-[140px]" />
        <div className="absolute top-10 right-10 w-[300px] h-[300px] rounded-full bg-kcc-beige-light/35 blur-[120px]" />
        <div className="absolute inset-0 dot-pattern opacity-50" />
        <div className="absolute inset-0 diagonal-lines opacity-60" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-10 lg:mb-14"
        >
          <span className="inline-flex items-center gap-2 px-4 py-1.5 text-xs uppercase tracking-[0.2em] chip-rose rounded-full mb-5 font-medium">
            <Sparkles size={12} />
            {content.badge}
          </span>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-ink-700 max-w-4xl leading-tight mb-4">
            {content.title}
          </h2>
          <p className="text-cream-800 text-base sm:text-lg max-w-3xl mb-4">{content.subtitle}</p>
          <p className="text-cream-700 text-sm sm:text-base max-w-3xl leading-relaxed">{content.description}</p>
        </motion.div>

        <div className="grid xl:grid-cols-[1.35fr_1fr] gap-6 lg:gap-8 mb-8">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {content.pillars.map((pillar, index) => {
              const Icon = pillarIcons[index % pillarIcons.length];
              return (
                <motion.article
                  key={pillar.key || `${pillar.title}-${index}`}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.35, delay: index * 0.04 }}
                  className="group relative overflow-hidden rounded-2xl border border-cream-300 bg-white/80 p-5 hover:border-kcc-rose-dark/40 hover:bg-white hover:-translate-y-1 hover:shadow-soft transition-all duration-300"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-kcc-rose-light/0 via-transparent to-kcc-beige-light/0 group-hover:from-kcc-rose-light/55 group-hover:to-kcc-beige-light/55 transition-all duration-500" />
                  <div className="relative z-10">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-kcc-rose-light to-kcc-beige-light text-kcc-rose-dark flex items-center justify-center mb-3 shadow-soft">
                      <Icon size={18} />
                    </div>
                    <h3 className="text-sm font-semibold text-ink-700 mb-1.5">{pillar.title}</h3>
                    <p className="text-xs text-cream-700 leading-relaxed">{pillar.description}</p>
                  </div>
                </motion.article>
              );
            })}
          </div>

          <motion.aside
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45 }}
            className="rounded-3xl border border-kcc-beige/40 bg-gradient-to-br from-white to-cream-200 p-6 lg:p-7 shadow-soft"
          >
            <p className="text-[11px] uppercase tracking-[0.2em] text-kcc-beige-dark mb-5 font-semibold">{t('sections.strategicOutcomes')}</p>
            <div className="space-y-4 mb-7">
              {content.highlights.map((item, index) => (
                <div key={`${item.label}-${index}`} className="flex items-end justify-between border-b border-cream-300 pb-3">
                  <span className="text-sm text-cream-700">{item.label}</span>
                  <span className="text-xl font-bold gradient-text-champagne">{item.value}</span>
                </div>
              ))}
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <a
                href="/order"
                className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl btn-luxe text-sm font-semibold"
              >
                {content.ctaPrimary}
              </a>
              <a
                href="/contact"
                className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl btn-luxe-outline text-sm font-semibold"
              >
                {content.ctaSecondary}
              </a>
            </div>
          </motion.aside>
        </div>
      </div>
    </section>
  );
}
