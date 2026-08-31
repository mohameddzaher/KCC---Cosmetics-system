'use client';

import { useEffect } from 'react';
import { useQuiz } from '@/lib/sample-quiz/QuizContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { SECTIONS, useQuizFlow } from '@/lib/sample-quiz/flow';
import ProgressBar from './ProgressBar';
import SectionIntro from './SectionIntro';
import PersonalizationStep from './steps/PersonalizationStep';
import CategoryStep from './steps/CategoryStep';
import QuestionStep from './steps/QuestionStep';
import SpecStep from './steps/SpecStep';
import ReviewStep from './steps/ReviewStep';
import ThankYouStep from './steps/ThankYouStep';

const INTRO_IMAGES = {
  brief: 'https://images.unsplash.com/photo-1631729371254-42c2892f0e6e?w=1200&q=85&auto=format&fit=crop',
  category: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=1200&q=80',
  specs: 'https://images.unsplash.com/photo-1556228453-efd6c1ff04f6?w=1200&q=80',
};

/**
 * Renders whichever step the flow says is current.
 *
 * All the sequencing lives in `useQuizFlow` — this component only maps a step
 * to a component. That is what makes "edit one answer and come straight back"
 * a one-line call instead of a special case per phase.
 */
export default function QuizOrchestrator() {
  const { state } = useQuiz();
  const { t } = useLanguage();
  const flow = useQuizFlow(state);

  // The submission screen is terminal and outside the step list.
  const submitted = !!state.submitted;

  useEffect(() => {
    if (submitted) window.scrollTo({ top: 0, behavior: 'auto' });
  }, [submitted]);

  if (submitted) {
    return (
      <div className="min-h-screen bg-cream-50">
        <ProgressBar percent={100} />
        <main className="min-h-screen pb-24 pt-[8.5rem]">
          <ThankYouStep />
        </main>
      </div>
    );
  }

  const { step, percent, sectionIndex, goNext, goBack, editFromReview, isEditingFromReview, canGoBack } = flow;

  const railPhases = SECTIONS.map((s) => ({ key: s, label: t(`quiz.sections.${s}`) }));

  // Only the very first load blocks the screen. Fetching a category's own
  // questions used to replace the whole step with a spinner the moment you
  // clicked a category — which read as the page reloading. Those now load in
  // the background; the Continue button waits instead (see `busy` below).
  const loading = flow.data.loadingGeneral;

  /** Background work that should hold "Continue" but not blank the step. */
  const busy =
    (!!state.category.mainSlug && flow.data.loadingScoped) ||
    (!!state.category.productKey && flow.data.loadingSpecs);

  return (
    <div className="min-h-screen bg-cream-50">
      <ProgressBar
        percent={percent}
        onBack={canGoBack ? goBack : undefined}
        phases={step?.kind === 'review' || step ? railPhases : undefined}
        currentPhaseIndex={sectionIndex}
      />

      <main className="min-h-screen pb-24 pt-[8.5rem] sm:pt-[9.5rem]">
        {!step || (loading && step.kind !== 'personalization') ? (
          <div className="flex min-h-[50vh] items-center justify-center text-sm uppercase tracking-widest text-cream-700">
            {t('quiz.loading')}
          </div>
        ) : step.kind === 'personalization' ? (
          <PersonalizationStep onNext={goNext} editingFromReview={isEditingFromReview} />
        ) : step.kind === 'intro' ? (
          <SectionIntro
            stepKey={step.id}
            eyebrow={t(`quiz.${step.intro}Eyebrow`)}
            headline={t(`quiz.${step.intro}Title`)}
            description={t(`quiz.${step.intro}Body`)}
            ctaLabel={t(`quiz.${step.intro}Cta`)}
            imageUrl={INTRO_IMAGES[step.intro]}
            onNext={goNext}
            onBack={canGoBack ? goBack : undefined}
            backLabel={t('quiz.back')}
          />
        ) : step.kind === 'category' ? (
          <CategoryStep
            level={step.level}
            onNext={goNext}
            onBack={goBack}
            busy={busy}
            editingFromReview={isEditingFromReview}
          />
        ) : step.kind === 'question' ? (
          <QuestionStep
            question={step.question}
            indexInGroup={step.indexInGroup}
            groupSize={step.groupSize}
            isLastOfGroup={step.indexInGroup === step.groupSize - 1}
            onNext={goNext}
            onBack={goBack}
            editingFromReview={isEditingFromReview}
          />
        ) : step.kind === 'spec' ? (
          <SpecStep
            spec={step.spec}
            master={step.master}
            parts={step.parts}
            indexInGroup={step.indexInGroup}
            groupSize={step.groupSize}
            onNext={goNext}
            onBack={goBack}
            editingFromReview={isEditingFromReview}
          />
        ) : (
          <ReviewStep steps={flow.steps} onEditStep={editFromReview} onBack={goBack} />
        )}
      </main>
    </div>
  );
}
