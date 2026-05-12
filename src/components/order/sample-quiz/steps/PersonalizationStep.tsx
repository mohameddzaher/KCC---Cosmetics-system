'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import BottlePreview from '../BottlePreview';
import CTAButton from '../CTAButton';
import { useQuiz } from '@/lib/sample-quiz/QuizContext';

interface Props {
  onNext: () => void;
}

/**
 * Phase 1 — Personalization
 *
 * Split-screen layout:
 *   left  → bottle preview with live name overlay
 *   right → eyebrow + headline + serif input + CTA
 */
export default function PersonalizationStep({ onNext }: Props) {
  const { state, dispatch } = useQuiz();
  const [recentlyEnabled, setRecentlyEnabled] = useState(false);

  // Pulse the CTA briefly when name first becomes valid
  useEffect(() => {
    if (state.customerName.trim().length >= 1) {
      setRecentlyEnabled(true);
      const t = setTimeout(() => setRecentlyEnabled(false), 2400);
      return () => clearTimeout(t);
    }
  }, [state.customerName]);

  function handleSubmit() {
    if (state.customerName.trim().length === 0) return;
    onNext();
  }

  return (
    <div className="min-h-[calc(100vh-220px)] grid grid-cols-1 lg:grid-cols-2">
      {/* LEFT — bottle preview */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
        className="relative flex items-center justify-center px-6 sm:px-10 py-16 bg-gradient-to-br from-cream-100 via-blush-50 to-cream-50"
      >
        {/* Decorative blobs */}
        <div className="absolute top-12 start-10 w-72 h-72 rounded-full bg-kcc-rose-light/45 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-12 end-10 w-72 h-72 rounded-full bg-kcc-beige-light/45 blur-[110px] pointer-events-none" />

        <BottlePreview name={state.customerName} placeholder="your name" />
      </motion.div>

      {/* RIGHT — input */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="flex items-center px-6 sm:px-12 py-16 bg-cream-50"
      >
        <div className="max-w-md w-full">
          <p className="text-[11px] font-medium uppercase tracking-[0.32em] text-kcc-rose-dark mb-5">
            First things first
          </p>
          <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl leading-[1.05] text-ink-800 mb-5">
            What name should we<br />put on your sample?
          </h1>
          <p className="text-base text-cream-800 leading-relaxed mb-10">
            We&apos;ll personalize your sample with your name (or your brand name). Watch it appear on the bottle as you type.
          </p>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmit();
            }}
          >
            <div className="relative mb-8">
              <input
                type="text"
                autoFocus
                value={state.customerName}
                onChange={(e) => dispatch({ type: 'SET_NAME', name: e.target.value })}
                placeholder="Your name or brand"
                maxLength={32}
                className="w-full bg-transparent border-0 border-b-2 border-cream-400 focus:border-ink-800 outline-none px-0 py-3 text-2xl font-serif text-ink-800 placeholder:text-cream-600 transition-colors"
              />
              <span className="absolute end-0 bottom-3 text-[11px] font-mono text-cream-700">
                {state.customerName.length}/32
              </span>
            </div>

            <CTAButton
              type="submit"
              label="Continue"
              disabled={state.customerName.trim().length === 0}
              pulse={recentlyEnabled}
              onClick={handleSubmit}
            />
          </form>

          <p className="mt-10 text-xs text-cream-700">
            Tip: Your name appears in the review screen and on every screen with your bottle preview.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
