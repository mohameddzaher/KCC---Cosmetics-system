'use client';

import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useEffect, useRef, type ReactNode } from 'react';

interface QuizShellProps {
  stepKey: string;
  eyebrow?: string;
  title: string;
  subtitle?: string;
  helper?: string;
  children: ReactNode;
  footer?: ReactNode;
  /** Wider canvas for option grids that should span the screen. */
  width?: 'narrow' | 'wide' | 'full';
  /**
   * Centre the heading, subtitle and footer. On by default: a question reads
   * better as a centred statement than as a left-hugging paragraph. Section
   * intros opt out — they are editorial split layouts.
   */
  align?: 'center' | 'start';
}

const WIDTH = {
  narrow: 'max-w-3xl',
  wide: 'max-w-6xl',
  full: 'max-w-[100rem]',
};

/**
 * Wraps one quiz step.
 *
 * Owns the single most-complained-about behaviour: every time the step
 * changes the page jumps back to the top, so answering a question near the
 * bottom of a long list never leaves you stranded below the next question.
 */
export default function QuizShell({
  stepKey,
  eyebrow,
  title,
  subtitle,
  helper,
  children,
  footer,
  width = 'wide',
  align = 'center',
}: QuizShellProps) {
  const centred = align === 'center';
  const reduce = useReducedMotion();
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    // `auto` (not `smooth`): a smooth scroll racing the step transition is what
    // made the old flow feel like it "drops you halfway down the page".
    window.scrollTo({ top: 0, behavior: 'auto' });
    // Move focus to the heading so screen-reader and keyboard users also land
    // at the top of the new question.
    headingRef.current?.focus({ preventScroll: true });
  }, [stepKey]);

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={stepKey}
        initial={reduce ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={reduce ? undefined : { opacity: 0, y: -8 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        className="w-full"
      >
        <div
          className={`mx-auto w-full px-4 sm:px-6 lg:px-8 ${WIDTH[width]} ${
            centred ? 'text-center' : ''
          }`}
        >
          {eyebrow && (
            <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.28em] text-kcc-rose-dark">
              {eyebrow}
            </p>
          )}

          <h1
            ref={headingRef}
            tabIndex={-1}
            className="font-serif text-3xl leading-[1.1] tracking-tight text-ink-800 outline-none sm:text-4xl lg:text-[2.75rem]"
          >
            {title}
          </h1>

          {subtitle && (
            <p
              className={`mt-4 max-w-3xl text-base leading-relaxed text-cream-800 sm:text-lg ${
                centred ? 'mx-auto' : ''
              }`}
            >
              {subtitle}
            </p>
          )}
          {helper && (
            <p className={`mt-2 max-w-3xl text-sm text-cream-700 ${centred ? 'mx-auto' : ''}`}>
              {helper}
            </p>
          )}

          {/* The answer area keeps its own natural alignment — a left-aligned
              card grid inside a centred header is what reads best. */}
          <div className={`mt-7 sm:mt-9 ${centred ? 'text-start' : ''}`}>{children}</div>

          {footer && <div className="mt-9 sm:mt-10">{footer}</div>}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
