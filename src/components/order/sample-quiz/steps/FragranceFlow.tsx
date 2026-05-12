'use client';

import { useMemo } from 'react';
import StepShell from '../StepShell';
import CTAButton from '../CTAButton';
import ChipSingle from '../widgets/ChipSingle';
import ChipMulti from '../widgets/ChipMulti';
import { useQuiz } from '@/lib/sample-quiz/QuizContext';

interface FragranceMaster {
  options: Array<{
    value: string;
    labelEn: string;
    meta?: { subNotes?: Array<{ value: string; labelEn: string }> };
  }>;
}

interface Props {
  master: FragranceMaster;
  allowedFamilies: string[]; // restrict by per-product config
  config: { titleEn?: string; subtitleEn?: string; isRequired?: boolean; maxSelectNotes?: number };
  // sub-step controlled by parent
  fragSubStep: 0 | 1 | 2;
  setFragSubStep: (n: 0 | 1 | 2) => void;
  onComplete: () => void;
  onBack: () => void;
}

const intensityOptions = [
  { value: 'light', label: 'Light' },
  { value: 'medium', label: 'Medium' },
  { value: 'strong', label: 'Strong' },
  { value: 'long-lasting', label: 'Long-lasting' },
];

export default function FragranceFlow({ master, allowedFamilies, config, fragSubStep, setFragSubStep, onComplete, onBack }: Props) {
  const { state, dispatch } = useQuiz();

  const visibleFamilies = useMemo(() => {
    if (!allowedFamilies || allowedFamilies.length === 0) return master.options;
    return master.options.filter((f) => allowedFamilies.includes(f.value));
  }, [master, allowedFamilies]);

  const family = master.options.find((f) => f.value === state.fragrance.family);
  const subNotes = family?.meta?.subNotes || [];
  const hasSubNotes = subNotes.length > 0;

  // Sub-step 0: Family
  if (fragSubStep === 0) {
    return (
      <StepShell
        stepKey="fragrance-family"
        eyebrow={config.titleEn || 'Fragrance'}
        title="Choose a scent family"
        subtitle={config.subtitleEn || "Pick the mood — we'll layer in the notes next."}
        footer={
          <div className="flex items-center justify-between gap-4">
            <CTAButton
              label="Next"
              disabled={!state.fragrance.family}
              onClick={() => {
                if (hasSubNotes) setFragSubStep(1);
                else setFragSubStep(2);
              }}
            />
            <button type="button" onClick={onBack} className="text-xs uppercase tracking-[0.22em] text-cream-700 hover:text-ink-700">
              Back
            </button>
          </div>
        }
      >
        <ChipSingle
          options={visibleFamilies.map((f) => ({ value: f.value, label: f.labelEn }))}
          value={state.fragrance.family}
          onChange={(v) => dispatch({ type: 'SET_FRAGRANCE', patch: { family: v, notes: [] } })}
        />
      </StepShell>
    );
  }

  // Sub-step 1: Sub-notes
  if (fragSubStep === 1 && hasSubNotes) {
    return (
      <StepShell
        stepKey="fragrance-notes"
        eyebrow={family?.labelEn || 'Notes'}
        title="Pick your notes"
        subtitle="Layer them — pick everything that resonates."
        footer={
          <div className="flex items-center justify-between gap-4">
            <CTAButton
              label="Next"
              onClick={() => setFragSubStep(2)}
              disabled={state.fragrance.notes.length === 0}
            />
            <button type="button" onClick={() => setFragSubStep(0)} className="text-xs uppercase tracking-[0.22em] text-cream-700 hover:text-ink-700">
              Back
            </button>
          </div>
        }
      >
        <ChipMulti
          options={subNotes.map((n) => ({ value: n.value, label: n.labelEn }))}
          selected={state.fragrance.notes}
          onChange={(v) => dispatch({ type: 'SET_FRAGRANCE', patch: { notes: v } })}
          maxSelect={config.maxSelectNotes}
        />
      </StepShell>
    );
  }

  // Sub-step 2: Intensity
  return (
    <StepShell
      stepKey="fragrance-intensity"
      eyebrow="Intensity"
      title="How strong should it be?"
      subtitle="The lasting power and the punch of the fragrance."
      footer={
        <div className="flex items-center justify-between gap-4">
          <CTAButton
            label="Continue"
            disabled={!state.fragrance.intensity}
            onClick={onComplete}
          />
          <button
            type="button"
            onClick={() => setFragSubStep(hasSubNotes ? 1 : 0)}
            className="text-xs uppercase tracking-[0.22em] text-cream-700 hover:text-ink-700"
          >
            Back
          </button>
        </div>
      }
    >
      <ChipSingle
        options={intensityOptions}
        value={state.fragrance.intensity}
        onChange={(v) => dispatch({ type: 'SET_FRAGRANCE', patch: { intensity: v as 'light' | 'medium' | 'strong' | 'long-lasting' } })}
      />
    </StepShell>
  );
}
