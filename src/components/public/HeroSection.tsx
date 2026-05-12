'use client';

import { useRef } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ChevronDown, Sparkles } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export default function HeroSection() {
  const { t } = useLanguage();
  const sectionRef = useRef<HTMLElement>(null);

  return (
    <section
      ref={sectionRef}
      className="relative min-h-screen flex items-center justify-center overflow-hidden bg-espresso-950"
    >
      {/* Background image */}
      <div className="absolute inset-0">
        <img
          src="https://images.unsplash.com/photo-1631729371254-42c2892f0e6e?w=1920&q=80"
          alt="Luxury cosmetics background"
          className="w-full h-full object-cover scale-105"
        />
      </div>
      {/* Warm romantic overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-espresso-950/85 via-espresso-900/80 to-espresso-950/95" />
      <div className="absolute inset-0 bg-gradient-to-tr from-kcc-rose-dark/15 via-transparent to-kcc-beige/10" />

      {/* Animated rose & champagne orbs */}
      <motion.div
        className="absolute top-1/4 -start-32 w-[28rem] h-[28rem] rounded-full bg-kcc-rose/20 blur-[140px]"
        animate={{
          x: [0, 60, 0],
          y: [0, -40, 0],
          scale: [1, 1.2, 1],
        }}
        transition={{
          duration: 9,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
      <motion.div
        className="absolute bottom-1/4 -end-32 w-[22rem] h-[22rem] rounded-full bg-kcc-beige/18 blur-[120px]"
        animate={{
          x: [0, -50, 0],
          y: [0, 50, 0],
          scale: [1, 1.15, 1],
        }}
        transition={{
          duration: 11,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[560px] h-[560px] rounded-full bg-kcc-gold/10 blur-[160px]"
        animate={{
          scale: [1, 1.3, 1],
          opacity: [0.3, 0.6, 0.3],
        }}
        transition={{
          duration: 12,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* Floating decorative pearls */}
      <motion.div
        className="absolute top-[15%] end-[20%] w-3 h-3 rounded-full bg-kcc-rose/50 shadow-rose"
        animate={{
          y: [0, -30, 0],
          opacity: [0.4, 0.85, 0.4],
        }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute top-[35%] start-[15%] w-2 h-2 rounded-full bg-kcc-beige/55"
        animate={{
          y: [0, 20, 0],
          opacity: [0.4, 0.8, 0.4],
        }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
      />
      <motion.div
        className="absolute bottom-[30%] end-[10%] w-4 h-4 rounded-full bg-kcc-gold/35"
        animate={{
          y: [0, -25, 0],
          x: [0, 15, 0],
          opacity: [0.3, 0.65, 0.3],
        }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
      />
      <motion.div
        className="absolute top-[60%] start-[25%] w-2.5 h-2.5 rounded-full bg-kcc-rose-light/45"
        animate={{
          y: [0, 18, 0],
          x: [0, -10, 0],
          opacity: [0.3, 0.7, 0.3],
        }}
        transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
      />
      <motion.div
        className="absolute top-[20%] start-[40%] w-1.5 h-1.5 rounded-full bg-kcc-rose/55"
        animate={{
          y: [0, -15, 0],
          opacity: [0.4, 0.8, 0.4],
        }}
        transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut', delay: 3 }}
      />
      <motion.div
        className="absolute bottom-[20%] start-[60%] w-3 h-3 rounded-full bg-kcc-beige/30"
        animate={{
          y: [0, 22, 0],
          opacity: [0.2, 0.55, 0.2],
        }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut', delay: 1.5 }}
      />

      {/* Content */}
      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Overline */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mb-6"
        >
          <span className="inline-flex items-center gap-2 px-5 py-2 text-[11px] font-medium uppercase tracking-[0.28em] chip-on-dark-rose rounded-full">
            <Sparkles size={12} className="text-kcc-rose-light" />
            {t('hero.subtitle')}
          </span>
        </motion.div>

        {/* Main Title */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.4 }}
          className="text-6xl sm:text-7xl lg:text-8xl font-black tracking-tight mb-5"
        >
          <span className="text-kcc-green drop-shadow-[0_4px_24px_rgba(45,106,79,0.45)]">K</span>
          <span className="text-cream-50 drop-shadow-[0_4px_24px_rgba(255,246,241,0.25)]">CC</span>
        </motion.h1>

        {/* Decorative divider */}
        <motion.div
          initial={{ opacity: 0, scaleX: 0 }}
          animate={{ opacity: 1, scaleX: 1 }}
          transition={{ duration: 0.8, delay: 0.55 }}
          className="flex items-center justify-center gap-3 mb-6"
        >
          <span className="h-px w-10 bg-gradient-to-r from-transparent to-kcc-rose/60" />
          <span className="w-1.5 h-1.5 rotate-45 bg-kcc-beige" />
          <span className="h-px w-10 bg-gradient-to-l from-transparent to-kcc-rose/60" />
        </motion.div>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.65 }}
          className="text-base sm:text-lg lg:text-xl font-light text-cream-100 mb-3 font-serif italic"
        >
          {t('hero.subtitle')}
        </motion.p>

        {/* Description */}
        <motion.p
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.8 }}
          className="max-w-xl mx-auto text-sm text-cream-200/85 leading-relaxed mb-8"
        >
          {t('hero.description')}
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 1.0 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <Link
            href="/order/sample"
            className="group relative inline-flex items-center gap-2 px-8 py-3.5 btn-luxe font-semibold rounded-xl transition-all duration-300"
          >
            {t('hero.requestSample')}
            <span className="inline-block transition-transform duration-300 group-hover:translate-x-1 rtl:group-hover:-translate-x-1">
              &rarr;
            </span>
          </Link>
          <Link
            href="/order/bulk"
            className="inline-flex items-center gap-2 px-8 py-3.5 border border-kcc-rose-light/50 text-kcc-rose-light hover:bg-kcc-rose/10 hover:border-kcc-rose-light/80 font-semibold rounded-xl transition-all duration-300"
          >
            {t('hero.placeBulkOrder')}
          </Link>
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 1.5 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
      >
        <span className="text-[10px] uppercase tracking-[0.25em] text-cream-200/50">
          {t('hero.scroll')}
        </span>
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
        >
          <ChevronDown size={20} className="text-kcc-rose/70" />
        </motion.div>
      </motion.div>

      {/* Soft transition to next section */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-b from-transparent to-cream-100 pointer-events-none" />
    </section>
  );
}
