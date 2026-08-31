'use client';

import { useEffect, useMemo, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  Baby, Brush, Droplets, FlaskConical, Hand, Heart, Scissors, Smile, Sparkles, Sun, Search,
} from 'lucide-react';
import QuizShell from '../QuizShell';
import StepFooter from '../StepFooter';
import OptionGrid from '../widgets/OptionGrid';
import { useQuiz } from '@/lib/sample-quiz/QuizContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { makeProductKey } from '@/lib/categories';

interface SubCat { name: string; nameAr?: string; slug: string; items: string[]; itemsAr?: string[] }
interface MainCat { id: number; name: string; nameAr?: string; slug: string; subcategories: SubCat[] }

const mainIcons: Record<string, LucideIcon> = {
  'hair-care': Scissors,
  'skin-care': Sparkles,
  'body-care': Hand,
  'sun-care': Sun,
  'baby-care': Baby,
  makeup: Brush,
  fragrance: FlaskConical,
  hygiene: Droplets,
  massage: Heart,
  'oral-care': Smile,
};

/**
 * One level of the product tree per step (category → family → product).
 * Selecting a value auto-advances, so the customer never has to hunt for a
 * "Continue" button below a long grid.
 */
export default function CategoryStep({
  level,
  onNext,
  onBack,
  busy = false,
  editingFromReview,
}: {
  level: 1 | 2 | 3;
  onNext: () => void;
  onBack: () => void;
  /** This level's own questions are still loading — hold Continue. */
  busy?: boolean;
  editingFromReview: boolean;
}) {
  const { state, dispatch } = useQuiz();
  const { t, pick } = useLanguage();
  const [cats, setCats] = useState<MainCat[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetch('/api/sample-quiz/categories', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => setCats(Array.isArray(d.categories) ? d.categories : []))
      .catch(() => setCats([]))
      .finally(() => setLoading(false));
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
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-sm uppercase tracking-widest text-cream-700">
        {t('quiz.loading')}
      </div>
    );
  }

  const nextLabel = editingFromReview ? t('quiz.saveAndReturn') : t('quiz.continue');

  const footer = (disabled: boolean, onContinue: () => void) => (
    <StepFooter
      nextLabel={nextLabel}
      nextDisabled={disabled || busy}
      onNext={onContinue}
      onBack={onBack}
    />
  );

  /* ---------------- Level 1 — main category ---------------- */
  if (level === 1) {
    return (
      <QuizShell
        stepKey="cat-1"
        eyebrow={t('quiz.categoryEyebrow')}
        title={t('quiz.pickCategory')}
        subtitle={t('quiz.categoryBody')}
        width="wide"
        footer={footer(!state.category.mainSlug, onNext)}
      >
        <OptionGrid min="10rem" gap="0.75rem">
          {cats.map((c) => {
            const active = state.category.mainSlug === c.slug;
            const Icon = mainIcons[c.slug] || Sparkles;
            return (
              <button
                key={c.slug}
                type="button"
                aria-pressed={active}
                onClick={() => {
                  if (state.category.mainSlug !== c.slug) {
                    dispatch({ type: 'RESET_CATEGORY_ANSWERS' });
                  }
                  dispatch({
                    type: 'SET_CATEGORY',
                    payload: {
                      mainSlug: c.slug,
                      mainName: pick(c.name, c.nameAr),
                      subSlug: undefined,
                      subName: undefined,
                      itemName: undefined,
                      productKey: undefined,
                    },
                  });
                }}
                className={`flex min-h-[8.5rem] flex-col items-center justify-center gap-3 rounded-2xl border-2 p-4 transition-all duration-200 hover:-translate-y-0.5 ${
                  active
                    ? 'border-fg bg-surface-inverse text-fg-inverse shadow-soft-lg'
                    : 'border-cream-300 bg-surface text-ink-700 shadow-soft hover:border-ink-700'
                }`}
              >
                <Icon
                  size={30}
                  strokeWidth={1.4}
                  className={active ? 'text-kcc-rose-light' : 'text-kcc-rose-dark'}
                />
                <span className="text-center text-sm font-medium leading-tight">
                  {pick(c.name, c.nameAr)}
                </span>
              </button>
            );
          })}
        </OptionGrid>
      </QuizShell>
    );
  }

  /* ---------------- Level 2 — family ---------------- */
  if (level === 2) {
    if (!currentMain) {
      return (
        <QuizShell stepKey="cat-2-empty" title={t('quiz.pickSubCategory')} footer={footer(true, onNext)}>
          <p className="text-cream-700">{t('quiz.noMatches')}</p>
        </QuizShell>
      );
    }
    return (
      <QuizShell
        stepKey="cat-2"
        eyebrow={pick(currentMain.name, currentMain.nameAr)}
        title={t('quiz.pickSubCategory')}
        width="wide"
        footer={footer(!state.category.subSlug, () => {
          if (!currentSub) return;
          if (currentSub.items.length === 0) {
            // No level-3 list — synthesise the product key and move on.
            dispatch({
              type: 'SET_CATEGORY',
              payload: {
                itemName: pick(currentSub.name, currentSub.nameAr),
                productKey: makeProductKey(currentMain.slug, currentSub.slug, currentSub.name),
              },
            });
          }
          onNext();
        })}
      >
        <OptionGrid min="12rem" gap="0.625rem">
          {currentMain.subcategories.map((s) => {
            const active = state.category.subSlug === s.slug;
            return (
              <button
                key={s.slug}
                type="button"
                aria-pressed={active}
                onClick={() =>
                  dispatch({
                    type: 'SET_CATEGORY',
                    payload: {
                      subSlug: s.slug,
                      subName: pick(s.name, s.nameAr),
                      itemName: undefined,
                      productKey: undefined,
                    },
                  })
                }
                className={`flex min-h-[3.75rem] items-center justify-between gap-2 rounded-xl border-2 px-4 py-3 text-start text-sm font-medium transition-all ${
                  active
                    ? 'border-fg bg-surface-inverse text-fg-inverse'
                    : 'border-cream-300 bg-surface text-ink-700 hover:border-ink-700'
                }`}
              >
                <span className="min-w-0 leading-snug">{pick(s.name, s.nameAr)}</span>
                {s.items.length > 0 && (
                  <span
                    className={`inline-flex h-5 min-w-[20px] shrink-0 items-center justify-center rounded-full px-1.5 text-[10px] ${
                      active ? 'bg-cream-50/20 text-cream-50' : 'bg-cream-200 text-cream-700'
                    }`}
                  >
                    {s.items.length}
                  </span>
                )}
              </button>
            );
          })}
        </OptionGrid>
      </QuizShell>
    );
  }

  /* ---------------- Level 3 — exact product ---------------- */
  if (!currentMain || !currentSub) {
    return (
      <QuizShell stepKey="cat-3-empty" title={t('quiz.pickProduct')} footer={footer(true, onNext)}>
        <p className="text-cream-700">{t('quiz.noMatches')}</p>
      </QuizShell>
    );
  }

  const items = currentSub.items
    .map((name, i) => ({ name, nameAr: currentSub.itemsAr?.[i] }))
    .filter((it) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return it.name.toLowerCase().includes(q) || (it.nameAr || '').includes(search);
    });

  return (
    <QuizShell
      stepKey="cat-3"
      eyebrow={`${pick(currentMain.name, currentMain.nameAr)} → ${pick(currentSub.name, currentSub.nameAr)}`}
      title={t('quiz.pickProduct')}
      width="wide"
      footer={footer(!state.category.itemName, onNext)}
    >
      {currentSub.items.length > 8 && (
        <div className="relative mb-5 max-w-md">
          <Search size={15} className="absolute start-4 top-1/2 -translate-y-1/2 text-cream-600" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('quiz.searchProducts')}
            className="w-full rounded-full border border-cream-300 bg-surface py-2.5 pe-4 ps-11 text-sm text-ink-800 placeholder:text-cream-600 focus:border-ink-700 focus:outline-none"
          />
        </div>
      )}

      {items.length === 0 ? (
        <p className="text-cream-700">{t('quiz.noMatches')}</p>
      ) : (
        <OptionGrid min="14rem" gap="0.625rem">
          {items.map((it) => {
            const productKey = makeProductKey(currentMain.slug, currentSub.slug, it.name);
            const active = state.category.productKey === productKey;
            return (
              <button
                key={it.name}
                type="button"
                aria-pressed={active}
                onClick={() => {
                  if (state.category.productKey !== productKey) {
                    dispatch({ type: 'RESET_CATEGORY_ANSWERS' });
                  }
                  dispatch({
                    type: 'SET_CATEGORY',
                    payload: { itemName: pick(it.name, it.nameAr), productKey },
                  });
                }}
                className={`min-h-[4.5rem] rounded-2xl border-2 p-4 text-start transition-all hover:-translate-y-0.5 ${
                  active
                    ? 'border-fg bg-surface-inverse text-fg-inverse shadow-soft-lg'
                    : 'border-cream-300 bg-surface text-ink-700 shadow-soft hover:border-ink-700'
                }`}
              >
                <span className="font-serif text-base leading-snug">{pick(it.name, it.nameAr)}</span>
              </button>
            );
          })}
        </OptionGrid>
      )}
    </QuizShell>
  );
}
