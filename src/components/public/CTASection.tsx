'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

/**
 * Closing call to action.
 *
 * Deliberately quieter than before: one warm espresso ground, a single
 * champagne hairline, no rotating rings or grid pattern. The eye should land
 * on the headline and the two buttons and nothing else — which is what makes
 * it read as premium rather than busy.
 */
export default function CTASection() {
  const { t } = useLanguage();
  const reduce = useReducedMotion();

  const rise = (delay = 0) => ({
    initial: reduce ? false : { opacity: 0, y: 18 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: '-80px' },
    transition: { duration: 0.55, delay },
  });

  return (
    <section className="relative overflow-hidden bg-espresso-900 py-12 lg:py-16">
      {/* Two very soft warm fields — no hard shapes. */}
      <div className="pointer-events-none absolute -top-32 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-kcc-rose-dark/12 blur-[170px]" />
      <div className="pointer-events-none absolute -bottom-40 end-0 h-[420px] w-[420px] rounded-full bg-kcc-beige/10 blur-[160px]" />

      <div className="relative z-10 mx-auto w-full max-w-3xl px-4 text-center sm:px-6">
        <motion.p
          {...rise()}
          className="mb-5 text-[10px] font-medium uppercase tracking-[0.34em] text-kcc-beige"
        >
          {t('hero.subtitle')}
        </motion.p>

        <motion.h2
          {...rise(0.08)}
          className="font-serif text-3xl leading-[1.1] text-on-dark sm:text-4xl lg:text-5xl"
        >
          {t('sections.cta')}
        </motion.h2>

        {/* A single champagne rule instead of a coloured gradient headline. */}
        <motion.div
          {...rise(0.14)}
          className="mx-auto mt-6 h-px w-16 bg-gradient-to-r from-transparent via-kcc-beige/70 to-transparent"
        />

        <motion.p
          {...rise(0.2)}
          className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-on-dark-soft"
        >
          {t('sections.ctaSubtitle')}
        </motion.p>

        <motion.div
          {...rise(0.28)}
          className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row"
        >
          <Link
            href="/order/sample"
            className="group inline-flex w-full items-center justify-center gap-2 rounded-full bg-on-dark px-7 py-3.5 text-sm font-semibold text-espresso-900 transition-all hover:bg-white sm:w-auto"
          >
            {t('hero.requestSample')}
            <ArrowRight
              size={16}
              className="rtl-flip transition-transform duration-300 group-hover:translate-x-0.5"
            />
          </Link>
          <Link
            href="/contact"
            className="inline-flex w-full items-center justify-center rounded-full border border-white/25 px-7 py-3.5 text-sm font-semibold text-on-dark-soft transition-all hover:border-kcc-beige/60 hover:text-on-dark sm:w-auto"
          >
            {t('contact.title')}
          </Link>
        </motion.div>

        <motion.p
          {...rise(0.36)}
          className="mt-9 text-[10px] uppercase tracking-[0.26em] text-on-dark-faint"
        >
          {t('sections.ctaTrustBadges')}
        </motion.p>
      </div>
    </section>
  );
}
