'use client';

import { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import StepShell from '../StepShell';
import CTAButton from '../CTAButton';
import { useQuiz } from '@/lib/sample-quiz/QuizContext';
import { makeProductKey } from '@/lib/categories';
import type { LucideIcon } from 'lucide-react';
import {
  Sparkles, Sun, Baby, Brush, FlaskConical, Hand, Heart, Smile, Scissors, Droplets,
} from 'lucide-react';

interface SubCat { name: string; slug: string; level: 2; items: string[]; }
interface MainCat { id: number; name: string; slug: string; level: 1; subcategories: SubCat[]; }

const mainIcons: Record<string, LucideIcon> = {
  'hair-care': Scissors,
  'skin-care': Sparkles,
  'body-care': Hand,
  'sun-care': Sun,
  'baby-care': Baby,
  'makeup': Brush,
  'fragrance': FlaskConical,
  'hygiene': Droplets,
  'massage': Heart,
  'oral-care': Smile,
};

interface Props {
  level: 1 | 2 | 3;
  setLevel: (n: 1 | 2 | 3) => void;
  onComplete: () => void;
  onBack: () => void;
}

export default function CategoryStep({ level, setLevel, onComplete, onBack }: Props) {
  const { state, dispatch } = useQuiz();
  const [cats, setCats] = useState<MainCat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/sample-quiz/categories', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => {
        setCats(Array.isArray(d.categories) ? d.categories : []);
        setLoading(false);
      });
  }, []);

  const currentMain = useMemo(
    () => cats.find((c) => c.slug === state.category.mainSlug) || null,
    [cats, state.category.mainSlug]
  );
  const currentSub = useMemo(
    () => currentMain?.subcategories.find((s) => s.slug === state.category.subSlug) || null,
    [currentMain, state.category.subSlug]
  );

  if (loading) {
    return <div className="min-h-[60vh] flex items-center justify-center text-cream-700 text-sm uppercase tracking-widest">Loading…</div>;
  }

  // ── Level 1: Main category ──
  if (level === 1) {
    return (
      <StepShell
        stepKey="cat-l1"
        eyebrow="Step 2 — Pick your category"
        title="What are we creating today?"
        subtitle="Pick the family that best fits your vision. We'll narrow it down from there."
        footer={
          <div className="flex items-center justify-between gap-4">
            <CTAButton
              label="Continue"
              disabled={!state.category.mainSlug}
              onClick={() => setLevel(2)}
            />
            <button
              type="button"
              onClick={onBack}
              className="text-xs uppercase tracking-[0.22em] text-cream-700 hover:text-ink-700"
            >
              Back
            </button>
          </div>
        }
      >
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {cats.map((c) => {
            const active = state.category.mainSlug === c.slug;
            const Icon = mainIcons[c.slug] || Sparkles;
            return (
              <motion.button
                key={c.slug}
                type="button"
                whileHover={{ y: -3 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => {
                  dispatch({
                    type: 'SET_CATEGORY',
                    payload: {
                      mainSlug: c.slug,
                      mainName: c.name,
                      subSlug: undefined,
                      subName: undefined,
                      itemName: undefined,
                      productKey: undefined,
                    },
                  });
                }}
                className={`relative aspect-[4/5] rounded-2xl border-2 flex flex-col items-center justify-center gap-3 p-4 transition-all duration-300 ${
                  active
                    ? 'bg-espresso-900 border-espresso-900 text-cream-50 shadow-soft-lg'
                    : 'bg-white border-cream-300 text-ink-700 hover:border-ink-700 shadow-soft'
                }`}
              >
                <Icon
                  size={32}
                  strokeWidth={1.4}
                  className={active ? 'text-kcc-rose-light' : 'text-kcc-rose-dark'}
                />
                <span className="text-sm font-medium tracking-wide text-center leading-tight">
                  {c.name}
                </span>
              </motion.button>
            );
          })}
        </div>
      </StepShell>
    );
  }

  // ── Level 2: Sub-category ──
  if (level === 2) {
    if (!currentMain) {
      setLevel(1);
      return null;
    }
    return (
      <StepShell
        stepKey="cat-l2"
        eyebrow={currentMain.name}
        title="Choose a sub-category"
        subtitle={`Within ${currentMain.name}, pick the family of products you're after.`}
        footer={
          <div className="flex items-center justify-between gap-4">
            <CTAButton
              label="Continue"
              disabled={!state.category.subSlug}
              onClick={() => {
                if (!currentSub) return;
                if (currentSub.items.length === 0) {
                  // No level-3 — synthesize a productKey and skip ahead
                  dispatch({
                    type: 'SET_CATEGORY',
                    payload: {
                      itemName: currentSub.name,
                      productKey: makeProductKey(currentMain.slug, currentSub.slug, currentSub.name),
                    },
                  });
                  onComplete();
                } else {
                  setLevel(3);
                }
              }}
            />
            <button
              type="button"
              onClick={() => setLevel(1)}
              className="text-xs uppercase tracking-[0.22em] text-cream-700 hover:text-ink-700"
            >
              Back
            </button>
          </div>
        }
      >
        <div className="flex flex-wrap gap-2.5">
          {currentMain.subcategories.map((s) => {
            const active = state.category.subSlug === s.slug;
            return (
              <motion.button
                key={s.slug}
                type="button"
                whileTap={{ scale: 0.97 }}
                onClick={() =>
                  dispatch({
                    type: 'SET_CATEGORY',
                    payload: {
                      subSlug: s.slug,
                      subName: s.name,
                      itemName: undefined,
                      productKey: undefined,
                    },
                  })
                }
                className={`px-5 py-2.5 rounded-full border text-sm font-medium transition-all ${
                  active
                    ? 'bg-espresso-900 text-cream-50 border-espresso-900'
                    : 'bg-white text-ink-700 border-cream-400 hover:border-ink-700'
                }`}
              >
                {s.name}
                {s.items.length > 0 && (
                  <span
                    className={`ms-2 inline-flex items-center justify-center min-w-[20px] px-1.5 h-5 rounded-full text-[10px] ${
                      active ? 'bg-cream-50/20 text-cream-50' : 'bg-cream-200 text-cream-700'
                    }`}
                  >
                    {s.items.length}
                  </span>
                )}
              </motion.button>
            );
          })}
        </div>
      </StepShell>
    );
  }

  // ── Level 3: Product item ──
  if (!currentMain || !currentSub) {
    setLevel(2);
    return null;
  }

  return (
    <StepShell
      stepKey="cat-l3"
      eyebrow={`${currentMain.name} → ${currentSub.name}`}
      title="Pick your product"
      subtitle="The exact formula you'd like us to develop. This unlocks tailored questions next."
      footer={
        <div className="flex items-center justify-between gap-4">
          <CTAButton
            label="Continue"
            disabled={!state.category.itemName}
            onClick={onComplete}
          />
          <button
            type="button"
            onClick={() => setLevel(2)}
            className="text-xs uppercase tracking-[0.22em] text-cream-700 hover:text-ink-700"
          >
            Back
          </button>
        </div>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {currentSub.items.map((it) => {
          const productKey = makeProductKey(currentMain.slug, currentSub.slug, it);
          const active = state.category.productKey === productKey;
          return (
            <motion.button
              key={it}
              type="button"
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() =>
                dispatch({
                  type: 'SET_CATEGORY',
                  payload: { itemName: it, productKey },
                })
              }
              className={`text-start p-4 rounded-2xl border-2 transition-all ${
                active
                  ? 'bg-espresso-900 border-espresso-900 text-cream-50 shadow-soft-lg'
                  : 'bg-white border-cream-300 text-ink-700 hover:border-ink-700 shadow-soft'
              }`}
            >
              <span className="font-serif text-base leading-snug">{it}</span>
            </motion.button>
          );
        })}
      </div>
    </StepShell>
  );
}
