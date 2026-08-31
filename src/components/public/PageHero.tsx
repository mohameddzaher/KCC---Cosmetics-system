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
 *
 * The headline is set in the serif, like every other headline on the site.
 * It used to be a bold sans, which made the inner pages read as a different
 * product from the homepage and the article pages.
 */
export default function PageHero({ title, subtitle, image, eyebrow }: PageHeroProps) {
  return (
    <section className="relative -mt-16 flex min-h-[340px] items-center justify-center overflow-hidden bg-espresso-950 pb-16 pt-32 sm:min-h-[400px]">
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

      <div className="page-shell relative z-10 text-center">
        <div className="mx-auto max-w-3xl">
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
          className="font-serif text-3xl leading-[1.12] text-on-dark sm:text-4xl lg:text-[2.75rem]"
        >
          {title}
        </motion.h1>

        <motion.div
          initial={{ opacity: 0, scaleX: 0 }}
          animate={{ opacity: 1, scaleX: 1 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="mx-auto my-6 h-px w-14 bg-gradient-to-r from-transparent via-kcc-beige/70 to-transparent"
        />

        {subtitle && (
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.25 }}
            className="max-w-2xl mx-auto text-base sm:text-lg text-on-dark-soft/90 leading-relaxed"
          >
            {subtitle}
          </motion.p>
        )}
        </div>
      </div>

      {/* Soft transition into the light content below */}
      {/*
        The hand-off into the light page below.

        Taller than the homepage hero's, and eased rather than held flat: these
        headers sit on photographs that are often light at the bottom, so a
        short fade left a visible hard edge where the dark band stopped.
      */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-b from-transparent via-cream-100/45 to-cream-100" />
    </section>
  );
}
