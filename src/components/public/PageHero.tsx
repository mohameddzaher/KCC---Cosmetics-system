'use client';

import { motion } from 'framer-motion';

interface PageHeroProps {
  title: string;
  subtitle?: string;
  image?: string;
  eyebrow?: string;
}

/**
 * Shared hero band used at the top of every inner public page so the whole
 * site reads as one system: same layout, height, type scale and treatment —
 * only the title, subtitle and background image differ per page.
 */
export default function PageHero({ title, subtitle, image, eyebrow }: PageHeroProps) {
  return (
    <section className="relative -mt-16 flex items-center justify-center overflow-hidden bg-espresso-950 min-h-[48vh] sm:min-h-[54vh] pt-28 pb-16 px-4">
      {/* Background image */}
      {image && (
        <div className="absolute inset-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image} alt="" className="w-full h-full object-cover scale-105" />
        </div>
      )}
      {/* Consistent warm overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-espresso-950/85 via-espresso-900/80 to-espresso-950/95" />
      <div className="absolute inset-0 bg-gradient-to-tr from-kcc-rose-dark/15 via-transparent to-kcc-beige/10" />

      <div className="relative z-10 max-w-3xl mx-auto text-center">
        {eyebrow && (
          <motion.span
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-block px-4 py-1.5 mb-4 text-[11px] uppercase tracking-[0.25em] chip-on-dark-rose rounded-full"
          >
            {eyebrow}
          </motion.span>
        )}
        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.05 }}
          className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-cream-50"
        >
          {title}
        </motion.h1>

        <motion.div
          initial={{ opacity: 0, scaleX: 0 }}
          animate={{ opacity: 1, scaleX: 1 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="flex items-center justify-center gap-3 my-5"
        >
          <span className="h-px w-10 bg-gradient-to-r from-transparent to-kcc-rose/60" />
          <span className="w-1.5 h-1.5 rotate-45 bg-kcc-beige" />
          <span className="h-px w-10 bg-gradient-to-l from-transparent to-kcc-rose/60" />
        </motion.div>

        {subtitle && (
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.25 }}
            className="max-w-2xl mx-auto text-base sm:text-lg text-cream-200/90 leading-relaxed"
          >
            {subtitle}
          </motion.p>
        )}
      </div>

      {/* Soft transition into the light content below */}
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-b from-transparent to-cream-100 pointer-events-none" />
    </section>
  );
}
