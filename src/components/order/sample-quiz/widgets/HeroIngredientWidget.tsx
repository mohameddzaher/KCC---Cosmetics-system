'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import ChipSingle from './ChipSingle';
import { useLanguage } from '@/contexts/LanguageContext';
import type { HeroIngredientAnswer } from '@/lib/sample-quiz/types';

interface HeroIngredientWidgetProps {
  value: HeroIngredientAnswer;
  onChange: (next: HeroIngredientAnswer) => void;
}

/**
 * Q10 Hero Ingredient
 * - Yes/No first.
 * - If Yes: 2 ingredient inputs + "Need KCC R&D help?" toggle + exclude textarea.
 */
export default function HeroIngredientWidget({ value, onChange }: HeroIngredientWidgetProps) {
  const { t } = useLanguage();
  const [ing1, setIng1] = useState(value.ingredients[0] || '');
  const [ing2, setIng2] = useState(value.ingredients[1] || '');

  const yesNoOptions = [
    { value: 'yes', label: t('quiz.hero.yes') },
    { value: 'no', label: t('quiz.hero.no') },
  ];
  const helpOptions = [
    { value: 'yes', label: t('quiz.yes') },
    { value: 'no', label: t('quiz.no') },
  ];

  function updateEnabled(v: string) {
    const enabled = v === 'yes';
    onChange({ ...value, enabled });
  }

  function updateIngredient(idx: 0 | 1, val: string) {
    if (idx === 0) setIng1(val);
    else setIng2(val);
    const next = [...value.ingredients];
    next[idx] = val;
    onChange({ ...value, ingredients: next.filter((s) => s.trim()) });
  }

  return (
    <div className="space-y-8">
      <ChipSingle
        options={yesNoOptions}
        value={value.enabled ? 'yes' : value.enabled === false ? 'no' : ''}
        onChange={updateEnabled}
      />

      <AnimatePresence>
        {value.enabled && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="pt-4 space-y-6 border-t border-cream-300">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-700 mb-3">
                  {t('quiz.hero.pickUpToTwo')}
                </p>
                <div className="grid sm:grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={ing1}
                    onChange={(e) => updateIngredient(0, e.target.value)}
                    placeholder={`${t('quiz.hero.ingredientPlaceholder')} 1`}
                    className="px-4 py-3 bg-surface border border-cream-300 rounded-2xl text-sm text-ink-700 placeholder:text-cream-700 focus:outline-none focus:border-ink-700 transition-colors"
                  />
                  <input
                    type="text"
                    value={ing2}
                    onChange={(e) => updateIngredient(1, e.target.value)}
                    placeholder={`${t('quiz.hero.ingredientPlaceholder')} 2`}
                    className="px-4 py-3 bg-surface border border-cream-300 rounded-2xl text-sm text-ink-700 placeholder:text-cream-700 focus:outline-none focus:border-ink-700 transition-colors"
                  />
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-700 mb-3">
                  {t('quiz.hero.needHelp')}
                </p>
                <ChipSingle
                  options={helpOptions}
                  value={value.needsRDHelp ? 'yes' : 'no'}
                  onChange={(v) => onChange({ ...value, needsRDHelp: v === 'yes' })}
                />
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-700 mb-3">
                  {t('quiz.hero.excludeLabel')}
                </p>
                <textarea
                  rows={3}
                  value={value.excludedIngredients}
                  onChange={(e) => onChange({ ...value, excludedIngredients: e.target.value })}
                  placeholder={t('quiz.hero.excludePlaceholder')}
                  className="w-full px-4 py-3 bg-surface border border-cream-300 rounded-2xl text-sm text-ink-700 placeholder:text-cream-700 focus:outline-none focus:border-ink-700 transition-colors resize-none"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
