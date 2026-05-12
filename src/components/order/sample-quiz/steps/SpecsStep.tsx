'use client';

import { useEffect, useState, useMemo } from 'react';
import StepShell from '../StepShell';
import CTAButton from '../CTAButton';
import ChipMulti from '../widgets/ChipMulti';
import ColorSwatchGrid from '../widgets/ColorSwatchGrid';
import IconCardGrid from '../widgets/IconCardGrid';
import VisualCardGrid from '../widgets/VisualCardGrid';
import AddNoteToggle from '../widgets/AddNoteToggle';
import FragranceFlow from './FragranceFlow';
import { useQuiz } from '@/lib/sample-quiz/QuizContext';
import type { SpecCategoryKey } from '@/models/SpecOptionMaster';

interface SpecMasterOption {
  value: string;
  labelEn: string;
  meta?: Record<string, unknown>;
}
interface SpecMaster {
  categoryKey: SpecCategoryKey;
  defaultTitleEn: string;
  defaultSubtitleEn?: string;
  widget: 'chips-multi' | 'color-swatches' | 'icon-cards' | 'visual-cards' | 'fragrance-flow';
  options: SpecMasterOption[];
}

interface ProductSpec {
  specKey: SpecCategoryKey;
  enabled: boolean;
  titleEn?: string;
  titleAr?: string;
  subtitleEn?: string;
  subtitleAr?: string;
  maxSelect: number;
  isRequired: boolean;
  sortOrder: number;
  allowedOptions: string[];
}
interface ProductConfig {
  productKey: string;
  specs: ProductSpec[];
}

interface Props {
  specIndex: number;
  setSpecIndex: (n: number) => void;
  fragSubStep: 0 | 1 | 2;
  setFragSubStep: (n: 0 | 1 | 2) => void;
  onComplete: () => void;
  onBack: () => void;
}

export default function SpecsStep({ specIndex, setSpecIndex, fragSubStep, setFragSubStep, onComplete, onBack }: Props) {
  const { state, dispatch } = useQuiz();
  const [config, setConfig] = useState<ProductConfig | null>(null);
  const [masters, setMasters] = useState<SpecMaster[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!state.category.productKey) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([
      fetch(`/api/sample-quiz/product-config/${encodeURIComponent(state.category.productKey)}`, { cache: 'no-store' }),
      fetch('/api/sample-quiz/spec-options', { cache: 'no-store' }),
    ])
      .then(async ([cRes, sRes]) => {
        if (!cRes.ok) throw new Error('No spec config for this product');
        const cfg = await cRes.json();
        const sm = await sRes.json();
        if (cancelled) return;
        setConfig(cfg);
        setMasters(Array.isArray(sm.categories) ? sm.categories : []);
        setLoading(false);
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setError(err.message);
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [state.category.productKey]);

  const enabledSpecs = useMemo(() => {
    if (!config) return [];
    return [...config.specs].filter((s) => s.enabled).sort((a, b) => a.sortOrder - b.sortOrder);
  }, [config]);

  if (loading) {
    return <div className="min-h-[60vh] flex items-center justify-center text-cream-700 text-sm tracking-widest uppercase">Personalizing your specs…</div>;
  }
  if (error || !config || enabledSpecs.length === 0) {
    // No specs configured for this product → skip directly
    onComplete();
    return null;
  }

  const currentSpec = enabledSpecs[Math.min(specIndex, enabledSpecs.length - 1)];
  const master = masters.find((m) => m.categoryKey === currentSpec.specKey);

  if (!master) {
    return <div className="min-h-[60vh] flex items-center justify-center text-cream-700">Master options unavailable.</div>;
  }

  // Filter master options by allowedOptions list
  const visibleOptions =
    currentSpec.allowedOptions.length > 0
      ? master.options.filter((o) => currentSpec.allowedOptions.includes(o.value))
      : master.options;

  const note = state.questionNotes[`spec_${currentSpec.specKey}`] || '';

  function nextSpec() {
    if (specIndex < enabledSpecs.length - 1) {
      setSpecIndex(specIndex + 1);
      setFragSubStep(0);
    } else {
      onComplete();
    }
  }

  function backSpec() {
    if (specIndex === 0) {
      onBack();
    } else {
      setSpecIndex(specIndex - 1);
      setFragSubStep(0);
    }
  }

  // ── Special: fragrance-flow widget ──
  if (master.widget === 'fragrance-flow') {
    return (
      <FragranceFlow
        master={{ options: master.options as FragranceMasterOption[] }}
        allowedFamilies={currentSpec.allowedOptions}
        config={{
          titleEn: currentSpec.titleEn || master.defaultTitleEn,
          subtitleEn: currentSpec.subtitleEn || master.defaultSubtitleEn,
          isRequired: currentSpec.isRequired,
          maxSelectNotes: currentSpec.maxSelect,
        }}
        fragSubStep={fragSubStep}
        setFragSubStep={setFragSubStep}
        onComplete={nextSpec}
        onBack={backSpec}
      />
    );
  }

  // ── Standard widgets ──
  const currentAnswer = state.specs[currentSpec.specKey] || { selected: [], note: '' };
  const isAnswered = !currentSpec.isRequired || currentAnswer.selected.length > 0;

  let widget: React.ReactNode = null;
  const opts = visibleOptions.map((o) => ({ value: o.value, label: o.labelEn, meta: o.meta }));

  if (master.widget === 'chips-multi') {
    widget = (
      <ChipMulti
        options={opts}
        selected={currentAnswer.selected}
        onChange={(v) =>
          dispatch({ type: 'SET_SPEC', key: currentSpec.specKey, value: { ...currentAnswer, selected: v } })
        }
        maxSelect={currentSpec.maxSelect}
      />
    );
  } else if (master.widget === 'color-swatches') {
    widget = (
      <ColorSwatchGrid
        options={opts}
        selected={currentAnswer.selected}
        onChange={(v) =>
          dispatch({ type: 'SET_SPEC', key: currentSpec.specKey, value: { ...currentAnswer, selected: v } })
        }
        maxSelect={currentSpec.maxSelect}
      />
    );
  } else if (master.widget === 'icon-cards') {
    widget = (
      <IconCardGrid
        options={opts}
        selected={currentAnswer.selected}
        onChange={(v) =>
          dispatch({ type: 'SET_SPEC', key: currentSpec.specKey, value: { ...currentAnswer, selected: v } })
        }
        maxSelect={currentSpec.maxSelect}
      />
    );
  } else if (master.widget === 'visual-cards') {
    widget = (
      <VisualCardGrid
        options={opts}
        selected={currentAnswer.selected}
        onChange={(v) =>
          dispatch({ type: 'SET_SPEC', key: currentSpec.specKey, value: { ...currentAnswer, selected: v } })
        }
        maxSelect={currentSpec.maxSelect}
      />
    );
  }

  return (
    <StepShell
      stepKey={`spec-${currentSpec.specKey}`}
      eyebrow={`Spec ${specIndex + 1} of ${enabledSpecs.length}`}
      title={currentSpec.titleEn || master.defaultTitleEn}
      subtitle={currentSpec.subtitleEn || master.defaultSubtitleEn}
      footer={
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <CTAButton
              label={specIndex === enabledSpecs.length - 1 ? 'Continue' : 'Next'}
              disabled={!isAnswered}
              onClick={nextSpec}
            />
            {!currentSpec.isRequired && (
              <button
                type="button"
                onClick={nextSpec}
                className="text-xs uppercase tracking-[0.22em] text-cream-700 hover:text-ink-700"
              >
                Skip this question
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={backSpec}
            className="text-xs uppercase tracking-[0.22em] text-cream-700 hover:text-ink-700"
          >
            Back
          </button>
        </div>
      }
    >
      {widget}
      <AddNoteToggle
        value={note}
        onChange={(v) => dispatch({ type: 'SET_NOTE', key: `spec_${currentSpec.specKey}`, note: v })}
      />
    </StepShell>
  );
}

// Local minimal shape for FragranceFlow to consume
type FragranceMasterOption = {
  value: string;
  labelEn: string;
  meta?: { subNotes?: Array<{ value: string; labelEn: string }> };
};
