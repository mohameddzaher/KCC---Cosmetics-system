'use client';

import { motion } from 'framer-motion';
import { Lightbulb, Beaker, FlaskConical, ClipboardCheck, Factory, Truck } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

const steps = [
  {
    icon: Lightbulb,
    title: { en: 'Consultation', ar: 'الاستشارة' },
    description: {
      en: 'We discuss your vision, target market, and product requirements.',
      ar: 'نناقش رؤيتك والسوق المستهدف ومتطلبات المنتج.',
    },
  },
  {
    icon: Beaker,
    title: { en: 'Formulation', ar: 'التركيب' },
    description: {
      en: 'Our chemists develop a custom formula tailored to your specifications.',
      ar: 'يطور كيميائيونا تركيبة مخصصة حسب مواصفاتك.',
    },
  },
  {
    icon: FlaskConical,
    title: { en: 'Testing', ar: 'الاختبار' },
    description: {
      en: 'Rigorous stability and safety testing to ensure product quality.',
      ar: 'اختبارات صارمة للثبات والسلامة لضمان جودة المنتج.',
    },
  },
  {
    icon: ClipboardCheck,
    title: { en: 'Approval', ar: 'الموافقة' },
    description: {
      en: 'Sample review and final approval before production begins.',
      ar: 'مراجعة العينة والموافقة النهائية قبل بدء الإنتاج.',
    },
  },
  {
    icon: Factory,
    title: { en: 'Production', ar: 'الإنتاج' },
    description: {
      en: 'Full-scale manufacturing with strict quality control at every stage.',
      ar: 'تصنيع بكامل الطاقة مع رقابة صارمة على الجودة في كل مرحلة.',
    },
  },
  {
    icon: Truck,
    title: { en: 'Delivery', ar: 'التسليم' },
    description: {
      en: 'Packaged and delivered to your warehouse or directly to market.',
      ar: 'تعبئة وتسليم إلى مستودعك أو مباشرة إلى السوق.',
    },
  },
];

export default function ProcessSection() {
  const { t, locale } = useLanguage();

  return (
    <section className="relative py-12 lg:py-16 bg-cream-100 overflow-hidden">
      {/* Background accent */}
      <div className="absolute top-0 end-0 w-96 h-96 bg-kcc-rose-light/40 rounded-full blur-[200px]" />
      <div className="absolute bottom-0 start-0 w-80 h-80 bg-kcc-beige-light/35 rounded-full blur-[180px]" />
      <div className="absolute inset-0 noise-soft pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12 lg:mb-14"
        >
          <span className="inline-block px-4 py-1.5 mb-4 text-[11px] uppercase tracking-[0.25em] chip-champagne rounded-full font-medium">
            {locale === 'ar' ? 'رحلة الإبداع' : 'Crafted Journey'}
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold mb-3">
            <span className="gradient-text-rose">{t('sections.process')}</span>
          </h2>
          <p className="text-cream-700 text-base sm:text-lg max-w-2xl mx-auto">
            {t('sections.processSubtitle')}
          </p>
        </motion.div>

        {/* Desktop: Horizontal Timeline */}
        <div className="hidden lg:block">
          {/* Connecting line */}
          <div className="relative">
            <div className="absolute top-7 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-kcc-rose/40 to-transparent" />

            <div className="grid grid-cols-6 gap-4">
              {steps.map((step, index) => {
                const Icon = step.icon;
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: index * 0.12 }}
                    className="relative flex flex-col items-center text-center"
                  >
                    {/* Step number circle */}
                    <div className="relative z-10 w-14 h-14 rounded-full bg-gradient-to-br from-kcc-rose-light to-kcc-rose-dark flex items-center justify-center mb-5 shadow-rose ring-4 ring-white/70">
                      <Icon size={22} className="text-white" />
                    </div>

                    {/* Step number badge */}
                    <span className="absolute top-0 -end-1 w-5 h-5 rounded-full bg-white border border-kcc-beige/60 text-[10px] font-bold text-kcc-beige-dark flex items-center justify-center shadow-soft">
                      {index + 1}
                    </span>

                    {/* Title */}
                    <h3 className="text-sm font-semibold text-ink-700 mb-2">
                      {locale === 'ar' ? step.title.ar : step.title.en}
                    </h3>

                    {/* Description */}
                    <p className="text-xs text-cream-700 leading-relaxed px-1">
                      {locale === 'ar' ? step.description.ar : step.description.en}
                    </p>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Mobile & Tablet: Vertical Timeline */}
        <div className="lg:hidden">
          <div className="relative">
            {/* Vertical connecting line */}
            <div className="absolute start-7 top-0 bottom-0 w-[2px] bg-gradient-to-b from-kcc-rose/40 via-kcc-beige/40 to-transparent" />

            <div className="space-y-8">
              {steps.map((step, index) => {
                const Icon = step.icon;
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: locale === 'ar' ? 30 : -30 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    className="relative flex items-start gap-5"
                  >
                    {/* Step circle */}
                    <div className="relative z-10 flex-shrink-0 w-14 h-14 rounded-full bg-gradient-to-br from-kcc-rose-light to-kcc-rose-dark flex items-center justify-center shadow-rose ring-4 ring-white/70">
                      <Icon size={22} className="text-white" />
                    </div>

                    {/* Content */}
                    <div className="pt-2">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-kcc-rose-dark">
                          {locale === 'ar' ? `الخطوة ${index + 1}` : `Step ${index + 1}`}
                        </span>
                      </div>
                      <h3 className="text-base font-semibold text-ink-700 mb-1.5">
                        {locale === 'ar' ? step.title.ar : step.title.en}
                      </h3>
                      <p className="text-sm text-cream-700 leading-relaxed">
                        {locale === 'ar' ? step.description.ar : step.description.en}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
