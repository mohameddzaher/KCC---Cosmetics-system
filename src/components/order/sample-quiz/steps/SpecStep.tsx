'use client';

import QuizShell from '../QuizShell';
import StepFooter from '../StepFooter';
import ChipMulti from '../widgets/ChipMulti';
import ColorSwatchGrid from '../widgets/ColorSwatchGrid';
import IconCardGrid from '../widgets/IconCardGrid';
import VisualCardGrid from '../widgets/VisualCardGrid';
import AddNoteToggle from '../widgets/AddNoteToggle';
import FragranceFlow from './FragranceFlow';
import PackagingStudio from '../widgets/packaging/PackagingStudio';
import { useQuiz } from '@/lib/sample-quiz/QuizContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { PACKAGING_PART_KEYS } from '@/lib/sample-quiz/flow';
import type { PackagingParts, ProductSpecDoc, SpecMasterDoc } from '@/lib/sample-quiz/flow';

/**
 * Renders ONE technical spec. The `product-packaging` spec gets the packaging
 * studio instead of a flat option list, because "which bottle" is a visual
 * decision, not a checkbox.
 */
export default function SpecStep({
  spec,
  master,
  parts,
  indexInGroup,
  groupSize,
  onNext,
  onBack,
  editingFromReview,
}: {
  spec: ProductSpecDoc;
  master: SpecMasterDoc;
  /** Admin config for the packaging studio's cap/label/finish/colour tabs. */
  parts?: PackagingParts;
  indexInGroup: number;
  groupSize: number;
  onNext: () => void;
  onBack: () => void;
  editingFromReview: boolean;
}) {
  const { state, dispatch } = useQuiz();
  const { t, pick } = useLanguage();

  const title = pick(spec.titleEn || master.defaultTitleEn, spec.titleAr || master.defaultTitleAr);
  const subtitle = pick(
    spec.subtitleEn || master.defaultSubtitleEn,
    spec.subtitleAr || master.defaultSubtitleAr
  );

  const visibleOptions =
    spec.allowedOptions.length > 0
      ? master.options.filter((o) => spec.allowedOptions.includes(o.value))
      : master.options;

  const opts = visibleOptions.map((o) => ({
    value: o.value,
    label: pick(o.labelEn, o.labelAr),
    meta: o.meta as never,
  }));

  const answer = state.specs[spec.specKey] || { selected: [], note: '' };
  const noteKey = `spec_${spec.specKey}`;
  const note = state.questionNotes[noteKey] || '';

  /* --- Fragrance keeps its own multi-part sub-flow --- */
  if (master.widget === 'fragrance-flow') {
    return (
      <FragranceFlow
        master={{ options: master.options as never }}
        allowedFamilies={spec.allowedOptions}
        config={{
          titleEn: title,
          subtitleEn: subtitle,
          isRequired: spec.isRequired,
          maxSelectNotes: spec.maxSelect,
        }}
        onComplete={onNext}
        onBack={onBack}
        editingFromReview={editingFromReview}
      />
    );
  }

  const isPackaging = spec.specKey === 'product-packaging';
  const answered = isPackaging
    ? !spec.isRequired || !!state.packaging.bottle
    : !spec.isRequired || answer.selected.length > 0;

  function setSelected(next: string[]) {
    dispatch({ type: 'SET_SPEC', key: spec.specKey, value: { ...answer, selected: next } });
  }

  let widget: React.ReactNode = null;

  if (isPackaging) {
    widget = (
      <PackagingStudio
        value={state.packaging}
        customerName={state.customerName}
        restrictBottles={spec.allowedOptions}
        parts={parts}
        onChange={(patch) => {
          dispatch({ type: 'SET_PACKAGING', patch });
          // Mirror each part into its own spec answer. The studio is one screen,
          // but cap / label / finish / colour are separate specs in the admin
          // panel, so the saved order has to read back the same way.
          if (patch.bottle) setSelected([patch.bottle]);
          for (const [specKey, part] of Object.entries(PACKAGING_PART_KEYS)) {
            const v = patch[part];
            if (!v) continue;
            dispatch({
              type: 'SET_SPEC',
              key: specKey,
              value: { ...(state.specs[specKey] || { note: '' }), selected: [v] },
            });
          }
        }}
      />
    );
  } else if (master.widget === 'chips-multi') {
    widget = (
      <ChipMulti
        options={opts}
        selected={answer.selected}
        onChange={setSelected}
        maxSelect={spec.maxSelect}
      />
    );
  } else if (master.widget === 'color-swatches') {
    widget = (
      <ColorSwatchGrid
        options={opts}
        selected={answer.selected}
        onChange={setSelected}
        maxSelect={spec.maxSelect}
      />
    );
  } else if (master.widget === 'icon-cards') {
    widget = (
      <IconCardGrid
        options={opts}
        selected={answer.selected}
        onChange={setSelected}
        maxSelect={spec.maxSelect}
      />
    );
  } else if (master.widget === 'visual-cards') {
    widget = (
      <VisualCardGrid
        options={opts}
        selected={answer.selected}
        onChange={setSelected}
        maxSelect={spec.maxSelect}
      />
    );
  }

  const nextLabel = editingFromReview
    ? t('quiz.saveAndReturn')
    : indexInGroup === groupSize - 1
    ? t('quiz.continue')
    : t('quiz.next');

  return (
    <QuizShell
      stepKey={`spec-${spec.specKey}`}
      eyebrow={t('quiz.specOf', { current: indexInGroup + 1, total: groupSize })}
      title={isPackaging ? t('quiz.packaging.title') : title}
      subtitle={isPackaging ? t('quiz.packaging.subtitle') : subtitle}
      // A long ingredient list deserves the whole screen; a 3-option list does not.
      width={isPackaging || visibleOptions.length > 12 ? 'full' : 'wide'}
      footer={
        <StepFooter
          nextLabel={nextLabel}
          onNext={onNext}
          nextDisabled={!answered}
          onBack={onBack}
          onSkip={!spec.isRequired && !editingFromReview ? onNext : undefined}
        />
      }
    >
      {widget}
      <AddNoteToggle
        value={note}
        onChange={(v) => dispatch({ type: 'SET_NOTE', key: noteKey, note: v })}
      />
    </QuizShell>
  );
}
