'use client';

import CTAButton from './CTAButton';
import { useLanguage } from '@/contexts/LanguageContext';

/**
 * The action row under every quiz step.
 *
 * One component so all four step types (question, spec, category, fragrance)
 * are laid out identically: the primary action centred on the page's axis,
 * with the secondary links directly beneath it. Previously each step pinned
 * "Next" hard left and "Back" hard right, which fought the centred heading
 * above it.
 */
export default function StepFooter({
  nextLabel,
  onNext,
  nextDisabled,
  onBack,
  onSkip,
  skipLabel,
}: {
  nextLabel: string;
  onNext: () => void;
  nextDisabled?: boolean;
  onBack?: () => void;
  onSkip?: () => void;
  skipLabel?: string;
}) {
  const { t } = useLanguage();

  return (
    <div className="flex flex-col items-center gap-4">
      <CTAButton label={nextLabel} disabled={nextDisabled} onClick={onNext} />

      {(onBack || onSkip) && (
        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="text-xs uppercase tracking-[0.2em] text-cream-700 transition-colors hover:text-ink-700"
            >
              {t('quiz.back')}
            </button>
          )}
          {onBack && onSkip && <span className="text-cream-500">·</span>}
          {onSkip && (
            <button
              type="button"
              onClick={onSkip}
              className="text-xs uppercase tracking-[0.2em] text-cream-700 transition-colors hover:text-ink-700"
            >
              {skipLabel ?? t('quiz.skip')}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
