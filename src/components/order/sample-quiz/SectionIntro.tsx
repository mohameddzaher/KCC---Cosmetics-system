'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { useEffect } from 'react';
import CTAButton from './CTAButton';

interface SectionIntroProps {
  eyebrow: string;
  headline: string;
  description: string;
  imageUrl: string;
  imageAlt?: string;
  onNext: () => void;
  onBack?: () => void;
  backLabel?: string;
  ctaLabel?: string;
  stepKey: string;
}

/**
 * Divider screen between phases.
 *
 * The image is a bounded panel, not a full-bleed hero: it used to be sized off
 * the viewport, which on a laptop pushed the copy and the button below the
 * fold and made every intro feel oversized. Now the whole screen fits inside
 * one viewport height at every breakpoint, with the image capped.
 */
export default function SectionIntro({
  eyebrow,
  headline,
  description,
  imageUrl,
  imageAlt = '',
  onNext,
  onBack,
  backLabel,
  ctaLabel = 'Begin',
  stepKey,
}: SectionIntroProps) {
  const reduce = useReducedMotion();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [stepKey]);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
      <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-12">
        {/* Copy first in the DOM so it reads first on a phone. */}
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="order-2 lg:order-1"
        >
          <p className="mb-4 text-[11px] font-medium uppercase tracking-[0.3em] text-kcc-rose-dark">
            {eyebrow}
          </p>
          <h2 className="font-serif text-3xl leading-[1.08] text-ink-800 sm:text-4xl lg:text-5xl">
            {headline}
          </h2>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-cream-800 sm:text-lg">
            {description}
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <CTAButton label={ctaLabel} onClick={onNext} />
            {onBack && backLabel && (
              <button
                type="button"
                onClick={onBack}
                className="text-xs uppercase tracking-[0.2em] text-cream-700 transition-colors hover:text-ink-700"
              >
                {backLabel}
              </button>
            )}
          </div>
        </motion.div>

        {/* Image panel — capped height so it never dominates the screen. */}
        <motion.div
          initial={reduce ? false : { opacity: 0, scale: 1.02 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          className="order-1 lg:order-2"
        >
          <div className="relative overflow-hidden rounded-3xl border border-cream-300 shadow-soft-lg">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt={imageAlt}
              loading="eager"
              className="h-48 w-full object-cover sm:h-64 lg:h-[26rem]"
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-cream-50/25 via-transparent to-transparent" />
          </div>
        </motion.div>
      </div>
    </div>
  );
}
