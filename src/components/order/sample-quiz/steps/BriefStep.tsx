'use client';

import { useEffect, useState } from 'react';
import StepShell from '../StepShell';
import CTAButton from '../CTAButton';
import ChipSingle from '../widgets/ChipSingle';
import ChipMulti from '../widgets/ChipMulti';
import CardGrid from '../widgets/CardGrid';
import HeroIngredientWidget from '../widgets/HeroIngredientWidget';
import AddNoteToggle from '../widgets/AddNoteToggle';
import { useQuiz } from '@/lib/sample-quiz/QuizContext';
import type { HeroIngredientAnswer } from '@/lib/sample-quiz/types';

interface BriefOption {
  value: string;
  labelEn: string;
  description?: string;
  imageUrl?: string;
}
interface BriefQuestionDoc {
  _id: string;
  questionKey: string;
  order: number;
  widget: string;
  titleEn: string;
  subtitleEn?: string;
  helperEn?: string;
  options: BriefOption[];
  maxSelect?: number;
  required: boolean;
  active: boolean;
  allowNote: boolean;
  conditions?: Array<{ questionKey: string; value: string | string[] }>;
}

interface Props {
  briefIndex: number;          // controlled by parent — which sub-step inside the brief
  setBriefIndex: (n: number) => void;
  onComplete: () => void;
  onBack: () => void;
}

const EMPTY_HERO: HeroIngredientAnswer = {
  enabled: false,
  ingredients: [],
  needsRDHelp: false,
  excludedIngredients: '',
};

/**
 * Phase 2 — Brief
 * Renders the dynamic list of brief questions one at a time.
 * Filtered by `conditions` against current state.
 */
export default function BriefStep({ briefIndex, setBriefIndex, onComplete, onBack }: Props) {
  const { state, dispatch } = useQuiz();
  const [questions, setQuestions] = useState<BriefQuestionDoc[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/sample-quiz/brief-questions', { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        setQuestions(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
    return () => { cancelled = true; };
  }, []);

  // Filter active + matching conditions.
  // The in-brief productCategory answer is the source of truth for `_categoryMain`
  // — leftover state.category.mainSlug from a prior session is ignored so a
  // returning customer always sees the full set until they re-pick a category.
  const visibleQuestions = questions.filter((q) => {
    if (!q.active) return false;
    if (!q.conditions || q.conditions.length === 0) return true;
    return q.conditions.every((c) => {
      if (c.questionKey === '_categoryMain') {
        const briefPick = state.briefAnswers.productCategory;
        if (typeof briefPick !== 'string' || !briefPick) return true; // not picked yet → show
        const target = Array.isArray(c.value) ? c.value : [c.value];
        return target.includes(briefPick);
      }
      const ans = state.briefAnswers[c.questionKey];
      const target = Array.isArray(c.value) ? c.value : [c.value];
      if (typeof ans === 'string') return target.includes(ans);
      if (Array.isArray(ans)) return ans.some((a) => target.includes(a));
      return false;
    });
  });

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-pulse text-cream-700 text-sm tracking-widest uppercase">Loading questions…</div>
      </div>
    );
  }

  if (visibleQuestions.length === 0) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <p className="text-cream-700">No active questions configured.</p>
      </div>
    );
  }

  const q = visibleQuestions[Math.min(briefIndex, visibleQuestions.length - 1)];
  const answer = state.briefAnswers[q.questionKey];
  const note = state.questionNotes[q.questionKey] || '';

  // Validity rule for "Next" button
  const isAnswered = (() => {
    if (!q.required) return true;
    if (q.widget === 'hero-ingredient') return true; // optional sub-flow
    if (q.widget === 'chips-multi') return Array.isArray(answer) && answer.length > 0;
    return typeof answer === 'string' && answer.length > 0;
  })();

  function next() {
    if (briefIndex < visibleQuestions.length - 1) {
      setBriefIndex(briefIndex + 1);
    } else {
      onComplete();
    }
  }

  function back() {
    if (briefIndex === 0) onBack();
    else setBriefIndex(briefIndex - 1);
  }

  // Render widget
  let widget: React.ReactNode = null;
  const optionsForWidget = q.options.map((o) => ({
    value: o.value,
    label: o.labelEn,
    description: o.description,
    imageUrl: o.imageUrl,
    meta: undefined,
  }));

  if (q.widget === 'cards') {
    widget = (
      <CardGrid
        options={optionsForWidget}
        value={typeof answer === 'string' ? answer : ''}
        onChange={(v) => dispatch({ type: 'SET_BRIEF', key: q.questionKey, value: v })}
        cols={2}
      />
    );
  } else if (q.widget === 'image-cards') {
    widget = (
      <CardGrid
        variant="image-cards"
        options={optionsForWidget}
        value={typeof answer === 'string' ? answer : ''}
        onChange={(v) => dispatch({ type: 'SET_BRIEF', key: q.questionKey, value: v })}
        cols={3}
      />
    );
  } else if (q.widget === 'chips-single' || q.widget === 'yes-no') {
    widget = (
      <ChipSingle
        options={optionsForWidget}
        value={typeof answer === 'string' ? answer : ''}
        onChange={(v) => dispatch({ type: 'SET_BRIEF', key: q.questionKey, value: v })}
      />
    );
  } else if (q.widget === 'chips-multi') {
    widget = (
      <ChipMulti
        options={optionsForWidget}
        selected={Array.isArray(answer) ? answer : []}
        onChange={(v) => dispatch({ type: 'SET_BRIEF', key: q.questionKey, value: v })}
        maxSelect={q.maxSelect}
      />
    );
  } else if (q.widget === 'hero-ingredient') {
    const heroVal: HeroIngredientAnswer =
      answer && typeof answer === 'object' && !Array.isArray(answer)
        ? (answer as HeroIngredientAnswer)
        : EMPTY_HERO;
    widget = (
      <HeroIngredientWidget
        value={heroVal}
        onChange={(v) => dispatch({ type: 'SET_BRIEF', key: q.questionKey, value: v })}
      />
    );
  } else if (q.widget === 'text') {
    widget = (
      <input
        type="text"
        value={typeof answer === 'string' ? answer : ''}
        onChange={(e) => dispatch({ type: 'SET_BRIEF', key: q.questionKey, value: e.target.value })}
        placeholder="Type your answer…"
        className="w-full bg-transparent border-0 border-b-2 border-cream-400 focus:border-ink-800 outline-none px-0 py-3 text-2xl font-serif text-ink-800 placeholder:text-cream-600"
      />
    );
  } else if (q.widget === 'textarea') {
    widget = (
      <textarea
        rows={5}
        value={typeof answer === 'string' ? answer : ''}
        onChange={(e) => dispatch({ type: 'SET_BRIEF', key: q.questionKey, value: e.target.value })}
        placeholder="Tell us more…"
        className="w-full px-5 py-4 bg-white border border-cream-300 rounded-2xl text-ink-800 placeholder:text-cream-700 focus:outline-none focus:border-ink-800 resize-none"
      />
    );
  }

  return (
    <StepShell
      stepKey={`brief-${q.questionKey}`}
      eyebrow={`Question ${briefIndex + 1} of ${visibleQuestions.length}`}
      title={q.titleEn}
      subtitle={q.subtitleEn}
      helper={q.helperEn}
      footer={
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <CTAButton
              label={briefIndex === visibleQuestions.length - 1 ? 'Continue' : 'Next'}
              disabled={!isAnswered}
              onClick={next}
            />
            {!q.required && (
              <button
                type="button"
                onClick={next}
                className="text-xs uppercase tracking-[0.22em] text-cream-700 hover:text-ink-700 transition-colors"
              >
                Skip
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={back}
            className="text-xs uppercase tracking-[0.22em] text-cream-700 hover:text-ink-700 transition-colors"
          >
            Back
          </button>
        </div>
      }
    >
      {widget}

      {q.allowNote && (
        <AddNoteToggle
          value={note}
          onChange={(v) => dispatch({ type: 'SET_NOTE', key: q.questionKey, note: v })}
        />
      )}
    </StepShell>
  );
}

// Expose the visible-questions helper for parent progress calculation
export function useBriefVisibleCount() {
  // (Helper consumed indirectly — parent computes progress from briefIndex.)
}
