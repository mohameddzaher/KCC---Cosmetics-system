'use client';

import { motion } from 'framer-motion';
import CTAButton from './CTAButton';

interface SectionIntroProps {
  eyebrow: string;
  headline: string;
  description: string;
  imageUrl: string;
  imageAlt?: string;
  onNext: () => void;
  ctaLabel?: string;
}

/**
 * Section intro — shown before Phase 2, Phase 3, Phase 4.
 * Layout: 50/50 split — image left, copy right.
 */
export default function SectionIntro({
  eyebrow,
  headline,
  description,
  imageUrl,
  imageAlt = '',
  onNext,
  ctaLabel = 'Begin',
}: SectionIntroProps) {
  return (
    <div className="min-h-[calc(100vh-220px)] grid grid-cols-1 lg:grid-cols-2">
      {/* Image */}
      <motion.div
        initial={{ opacity: 0, scale: 1.04 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.7 }}
        className="relative overflow-hidden order-1 lg:order-1 h-72 lg:h-auto"
      >
        <img src={imageUrl} alt={imageAlt} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-tr from-cream-50/30 via-transparent to-cream-50/20" />
      </motion.div>

      {/* Copy */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.15 }}
        className="flex items-center px-6 sm:px-10 lg:px-16 py-16 bg-cream-50"
      >
        <div className="max-w-lg">
          <p className="text-[11px] font-medium uppercase tracking-[0.32em] text-kcc-rose-dark mb-5">
            {eyebrow}
          </p>
          <h2 className="font-serif text-4xl sm:text-5xl lg:text-6xl leading-[1.05] text-ink-800 mb-6">
            {headline}
          </h2>
          <p className="text-base sm:text-lg text-cream-800 leading-relaxed mb-10">
            {description}
          </p>
          <CTAButton label={ctaLabel} onClick={onNext} />
        </div>
      </motion.div>
    </div>
  );
}
