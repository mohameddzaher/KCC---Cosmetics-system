'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { ReactNode } from 'react';

interface StepShellProps {
  stepKey: string;        // unique key per step for transition keys
  eyebrow?: string;
  title: string;
  subtitle?: string;
  helper?: string;
  children: ReactNode;
  footer?: ReactNode;     // CTA row, "Skip" links, etc.
}

/**
 * StepShell — wraps the centered content area for every quiz step.
 * Smooth slide+fade between steps via AnimatePresence (parent-controlled key).
 */
export default function StepShell({ stepKey, eyebrow, title, subtitle, helper, children, footer }: StepShellProps) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={stepKey}
        initial={{ opacity: 0, x: 24 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -24 }}
        transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
        className="w-full"
      >
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          {eyebrow && (
            <p className="mb-4 text-[11px] font-medium uppercase tracking-[0.32em] text-kcc-rose-dark">
              {eyebrow}
            </p>
          )}
          <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl leading-[1.05] tracking-tight text-ink-800 mb-5">
            {title}
          </h1>
          {subtitle && (
            <p className="text-base sm:text-lg text-cream-800 leading-relaxed mb-2 max-w-2xl">
              {subtitle}
            </p>
          )}
          {helper && (
            <p className="text-sm text-cream-700 italic mb-6 max-w-2xl">{helper}</p>
          )}

          <div className="mt-8">{children}</div>

          {footer && <div className="mt-10">{footer}</div>}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
