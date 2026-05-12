'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, Sparkles } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export default function CTASection() {
  const { t } = useLanguage();

  return (
    <section className="relative py-16 lg:py-20 overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-espresso-950 via-espresso-800 to-espresso-950" />
      <div className="absolute inset-0 bg-gradient-to-tr from-kcc-rose-dark/20 via-transparent to-kcc-beige/15" />

      {/* Decorative grid pattern */}
      <div className="absolute inset-0 opacity-[0.06]">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="cta-grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#F4D5D0" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#cta-grid)" />
        </svg>
      </div>

      {/* Decorative circles */}
      <motion.div
        className="absolute -top-20 -end-20 w-80 h-80 rounded-full border border-kcc-rose-dark/45"
        animate={{ rotate: 360 }}
        transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
      />
      <motion.div
        className="absolute -bottom-24 -start-24 w-96 h-96 rounded-full border border-kcc-beige/55"
        animate={{ rotate: -360 }}
        transition={{ duration: 80, repeat: Infinity, ease: 'linear' }}
      />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-kcc-rose/15 rounded-full blur-[180px]" />
      <div className="absolute top-0 left-0 w-[400px] h-[400px] bg-kcc-gold/10 rounded-full blur-[150px]" />

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-6"
        >
          <span className="inline-flex items-center gap-2 px-5 py-2 text-[11px] uppercase tracking-[0.28em] chip-on-dark-rose rounded-full font-medium">
            <Sparkles size={12} className="text-kcc-rose-light" />
            {t('hero.subtitle')}
          </span>
        </motion.div>

        {/* Heading */}
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold mb-5"
        >
          <span className="gradient-text-light">
            {t('sections.cta')}
          </span>
        </motion.h2>

        {/* Subheading */}
        <motion.p
          initial={{ opacity: 0, y: 25 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="text-sm sm:text-base lg:text-lg text-cream-200/85 max-w-xl mx-auto mb-8 font-light"
        >
          {t('sections.ctaSubtitle')}
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <Link
            href="/order/sample"
            className="group inline-flex items-center gap-2 px-7 py-3 btn-luxe font-semibold rounded-xl"
          >
            {t('hero.requestSample')}
            <ArrowRight
              size={18}
              className="transition-transform duration-300 group-hover:translate-x-1 rtl:rotate-180 rtl:group-hover:-translate-x-1"
            />
          </Link>
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 px-7 py-3 border border-kcc-rose-light/50 text-kcc-rose-light hover:bg-kcc-rose/10 hover:border-kcc-rose-light/80 font-semibold rounded-xl transition-all duration-300"
          >
            {t('contact.title')}
          </Link>
        </motion.div>

        {/* Trust indicator */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="mt-8 text-xs text-cream-200/60 tracking-[0.2em] uppercase"
        >
          {t('sections.ctaTrustBadges')}
        </motion.p>
      </div>
    </section>
  );
}
