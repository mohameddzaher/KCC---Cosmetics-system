'use client';

import { useMemo, useState } from 'react';
import QuizShell from '../QuizShell';
import StepFooter from '../StepFooter';
import ChipSingle from '../widgets/ChipSingle';
import ChipMulti from '../widgets/ChipMulti';
import { useQuiz } from '@/lib/sample-quiz/QuizContext';
import { useLanguage } from '@/contexts/LanguageContext';

interface FragranceMaster {
  options: Array<{
    value: string;
    labelEn: string;
    labelAr?: string;
    meta?: { subNotes?: Array<{ value: string; labelEn: string; labelAr?: string }> };
  }>;
}

/** The fragrance-intensity library — the admin's list of how strong. */
interface IntensityMaster {
  options: Array<{ value: string; labelEn: string; labelAr?: string }>;
}

interface Props {
  master: FragranceMaster;
  intensityMaster?: IntensityMaster;
  allowedFamilies: string[];
  config: { titleEn?: string; subtitleEn?: string; isRequired?: boolean; maxSelectNotes?: number };
  onComplete: () => void;
  onBack: () => void;
  editingFromReview?: boolean;
}

/**
 * Fragrance is one step in the flow but three questions inside it — family,
 * notes, intensity. It owns that sub-index itself so the outer flow stays a
 * flat list.
 */
export default function FragranceFlow({
  master,
  intensityMaster,
  allowedFamilies,
  config,
  onComplete,
  onBack,
  editingFromReview = false,
}: Props) {
  const { state, dispatch } = useQuiz();
  const { t, pick } = useLanguage();
  const [sub, setSub] = useState<0 | 1 | 2>(0);

  const visibleFamilies = useMemo(() => {
    if (!allowedFamilies || allowedFamilies.length === 0) return master.options;
    return master.options.filter((f) => allowedFamilies.includes(f.value));
  }, [master, allowedFamilies]);

  const family = master.options.find((f) => f.value === state.fragrance.family);
  const subNotes = family?.meta?.subNotes || [];
  const hasSubNotes = subNotes.length > 0;

  /**
   * Intensity is a library like every other spec, so the admin's list is the
   * list. The four steps below survive only as a fallback for a database with
   * no fragrance-intensity library at all — they are not a second source of
   * truth competing with what the admin edits.
   */
  const intensityOptions = intensityMaster?.options?.length
    ? intensityMaster.options.map((o) => ({ value: o.value, label: pick(o.labelEn, o.labelAr) }))
    : [
        { value: 'light', label: t('quiz.fragrance.light') },
        { value: 'medium', label: t('quiz.fragrance.medium') },
        { value: 'strong', label: t('quiz.fragrance.strong') },
        { value: 'long-lasting', label: t('quiz.fragrance.longLasting') },
      ];

  if (sub === 0) {
    return (
      <QuizShell
        stepKey="fragrance-family"
        eyebrow={config.titleEn || t('quiz.fragrance.family')}
        title={t('quiz.fragrance.family')}
        subtitle={config.subtitleEn}
        footer={
          <StepFooter
            nextLabel={t('quiz.next')}
            nextDisabled={!state.fragrance.family}
            onNext={() => setSub(hasSubNotes ? 1 : 2)}
            onBack={onBack}
          />
        }
      >
        <ChipSingle
          options={visibleFamilies.map((f) => ({ value: f.value, label: pick(f.labelEn, f.labelAr) }))}
          value={state.fragrance.family}
          onChange={(v) => dispatch({ type: 'SET_FRAGRANCE', patch: { family: v, notes: [] } })}
        />
      </QuizShell>
    );
  }

  if (sub === 1 && hasSubNotes) {
    return (
      <QuizShell
        stepKey="fragrance-notes"
        eyebrow={pick(family?.labelEn, family?.labelAr)}
        title={t('quiz.fragrance.notes')}
        footer={
          <StepFooter
            nextLabel={t('quiz.next')}
            nextDisabled={state.fragrance.notes.length === 0}
            onNext={() => setSub(2)}
            onBack={() => setSub(0)}
          />
        }
      >
        <ChipMulti
          options={subNotes.map((n) => ({ value: n.value, label: pick(n.labelEn, n.labelAr) }))}
          selected={state.fragrance.notes}
          onChange={(v) => dispatch({ type: 'SET_FRAGRANCE', patch: { notes: v } })}
          maxSelect={config.maxSelectNotes}
        />
      </QuizShell>
    );
  }

  return (
    <QuizShell
      stepKey="fragrance-intensity"
      eyebrow={pick(family?.labelEn, family?.labelAr)}
      title={t('quiz.fragrance.intensity')}
      footer={
        <StepFooter
          nextLabel={editingFromReview ? t('quiz.saveAndReturn') : t('quiz.continue')}
          nextDisabled={!!config.isRequired && !state.fragrance.intensity}
          onNext={onComplete}
          onBack={() => setSub(hasSubNotes ? 1 : 0)}
        />
      }
    >
      <ChipSingle
        options={intensityOptions}
        value={state.fragrance.intensity}
        onChange={(v) =>
          dispatch({
            type: 'SET_FRAGRANCE',
            patch: { intensity: v },
          })
        }
      />
    </QuizShell>
  );
}
