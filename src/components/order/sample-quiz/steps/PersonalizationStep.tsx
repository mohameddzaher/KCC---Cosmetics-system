'use client';

import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import BottlePreview from '../BottlePreview';
import CTAButton from '../CTAButton';
import { useQuiz } from '@/lib/sample-quiz/QuizContext';
import { useLanguage } from '@/contexts/LanguageContext';

/**
 * Phase 1 — the customer's name, which is printed on the sample bottle.
 * Split panel that collapses to a single column on a phone.
 */
export default function PersonalizationStep({
  onNext,
  editingFromReview = false,
}: {
  onNext: () => void;
  editingFromReview?: boolean;
}) {
  const { state, dispatch } = useQuiz();
  const { t } = useLanguage();
  const reduce = useReducedMotion();
  const [recentlyEnabled, setRecentlyEnabled] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, []);

  useEffect(() => {
    if (state.customerName.trim().length >= 1) {
      setRecentlyEnabled(true);
      const timer = setTimeout(() => setRecentlyEnabled(false), 2400);
      return () => clearTimeout(timer);
    }
  }, [state.customerName]);

  function handleSubmit() {
    if (state.customerName.trim().length === 0) return;
    onNext();
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
      <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-12">
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="order-2 lg:order-1"
        >
          <p className="mb-4 text-[11px] font-medium uppercase tracking-[0.3em] text-kcc-rose-dark">
            {t('quiz.welcomeEyebrow')}
          </p>
          <h1 className="font-serif text-3xl leading-[1.08] text-ink-800 sm:text-4xl lg:text-5xl">
            {t('quiz.welcomeTitle')}
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-cream-800 sm:text-lg">
            {t('quiz.welcomeSubtitle')}
          </p>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmit();
            }}
            className="mt-8"
          >
            <div className="relative max-w-md">
              <label htmlFor="quiz-name" className="sr-only">
                {t('quiz.namePlaceholder')}
              </label>
              <input
                id="quiz-name"
                type="text"
                autoFocus
                value={state.customerName}
                onChange={(e) => dispatch({ type: 'SET_NAME', name: e.target.value })}
                placeholder={t('quiz.namePlaceholder')}
                maxLength={32}
                data-focus-self
                className="w-full border-0 border-b-2 border-cream-400 bg-transparent px-0 py-3 pe-14 font-serif text-2xl text-ink-800 outline-none transition-colors placeholder:text-cream-600 focus:border-accent"
              />
              <span className="absolute bottom-3 end-0 font-mono text-[11px] text-cream-700">
                {state.customerName.length}/32
              </span>
            </div>

            <div className="mt-8">
              <CTAButton
                type="submit"
                label={editingFromReview ? t('quiz.saveAndReturn') : t('quiz.start')}
                disabled={state.customerName.trim().length === 0}
                pulse={recentlyEnabled}
              />
            </div>
          </form>
        </motion.div>

        <motion.div
          initial={reduce ? false : { opacity: 0, scale: 1.02 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          className="relative order-1 flex items-center justify-center overflow-hidden rounded-3xl border border-cream-300 bg-cream-100 px-6 py-10 shadow-soft lg:order-2 lg:py-14"
        >
          <div className="pointer-events-none absolute start-10 top-8 h-48 w-48 rounded-full bg-kcc-rose-light/45 blur-[100px]" />
          <div className="pointer-events-none absolute bottom-8 end-10 h-48 w-48 rounded-full bg-kcc-beige-light/45 blur-[90px]" />
          <BottlePreview name={state.customerName} placeholder={t('quiz.namePlaceholder')} size="md" />
        </motion.div>
      </div>
    </div>
  );
}
