'use client';

import { useState, useEffect } from 'react';
import { useQuiz } from '@/lib/sample-quiz/QuizContext';
import ProgressBar from './ProgressBar';
import SectionIntro from './SectionIntro';
import PersonalizationStep from './steps/PersonalizationStep';
import BriefStep from './steps/BriefStep';
import CategoryStep from './steps/CategoryStep';
import SpecsStep from './steps/SpecsStep';
import ReviewStep from './steps/ReviewStep';
import ThankYouStep from './steps/ThankYouStep';

/**
 * Master quiz state machine. Owns all sub-step indices and calculates progress.
 *
 * Flow (per user feedback — Category before Brief so hair-specific questions
 * only fire when relevant):
 *
 *   personalization
 *   → category-intro → category L1 → L2 → L3
 *   → brief-intro → brief Q1..QN
 *   → specs-intro → specs S1..SN (fragrance has 1–3 sub-steps)
 *   → review
 *   → thankyou
 */

type Stage =
  | 'personalization'
  | 'category-intro'
  | 'category'
  | 'brief-intro'
  | 'brief'
  | 'specs-intro'
  | 'specs'
  | 'review'
  | 'thankyou';

const STAGE_ORDER: Stage[] = [
  'personalization',
  'brief-intro', 'brief',
  'category-intro', 'category',
  'specs-intro', 'specs',
  'review', 'thankyou',
];

const NAV_STORAGE_KEY = 'kcc-quiz-nav-v2';

interface NavSnapshot {
  stage: Stage;
  categoryLevel: 1 | 2 | 3;
  briefIndex: number;
  specIndex: number;
  fragSubStep: 0 | 1 | 2;
}

const DEFAULT_NAV: NavSnapshot = {
  stage: 'personalization',
  categoryLevel: 1,
  briefIndex: 0,
  specIndex: 0,
  fragSubStep: 0,
};

function readNavFromStorage(): NavSnapshot {
  if (typeof window === 'undefined') return DEFAULT_NAV;
  try {
    const raw = window.localStorage.getItem(NAV_STORAGE_KEY);
    if (!raw) return DEFAULT_NAV;
    const parsed = JSON.parse(raw) as Partial<NavSnapshot>;
    // Don't restore to thankyou — that's a one-time success screen
    if (parsed.stage === 'thankyou') return DEFAULT_NAV;
    return { ...DEFAULT_NAV, ...parsed };
  } catch {
    return DEFAULT_NAV;
  }
}

export default function QuizOrchestrator() {
  const { state } = useQuiz();

  // Lazy initial state — read from localStorage once on mount
  const initialNav = readNavFromStorage();
  const [stage, setStage] = useState<Stage>(initialNav.stage);
  const [categoryLevel, setCategoryLevel] = useState<1 | 2 | 3>(initialNav.categoryLevel);
  const [briefIndex, setBriefIndex] = useState(initialNav.briefIndex);
  const [specIndex, setSpecIndex] = useState(initialNav.specIndex);
  const [fragSubStep, setFragSubStep] = useState<0 | 1 | 2>(initialNav.fragSubStep);
  const [briefCount, setBriefCount] = useState(12);

  // Persist navigation snapshot on every change.
  // Drop entry once submitted so a fresh visit starts at the personalization step.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      if (state.submitted || stage === 'thankyou') {
        window.localStorage.removeItem(NAV_STORAGE_KEY);
      } else {
        window.localStorage.setItem(
          NAV_STORAGE_KEY,
          JSON.stringify({ stage, categoryLevel, briefIndex, specIndex, fragSubStep })
        );
      }
    } catch {
      // Quota / private mode — silently ignore
    }
  }, [stage, categoryLevel, briefIndex, specIndex, fragSubStep, state.submitted]);

  // Track total brief questions so progress is accurate
  useEffect(() => {
    fetch('/api/sample-quiz/brief-questions', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => Array.isArray(d) && setBriefCount(d.length));
  }, []);

  // Sync to thank-you when submission arrives
  useEffect(() => {
    if (state.submitted) setStage('thankyou');
  }, [state.submitted]);

  // ── Progress calc ──
  const stageWeight: Record<Stage, number> = {
    'personalization': 0.05,
    'brief-intro': 0.10,
    'brief': 0.40,
    'category-intro': 0.55,
    'category': 0.65,
    'specs-intro': 0.70,
    'specs': 0.90,
    'review': 0.97,
    'thankyou': 1,
  };
  let progress = stageWeight[stage] * 100;
  if (stage === 'brief' && briefCount > 0) {
    const stageStart = stageWeight['brief'] * 100;
    const stageEnd = stageWeight['category-intro'] * 100;
    progress = stageStart + ((briefIndex) / briefCount) * (stageEnd - stageStart);
  }

  // ── Navigation helpers ──
  function gotoNextStage() {
    const idx = STAGE_ORDER.indexOf(stage);
    if (idx < STAGE_ORDER.length - 1) setStage(STAGE_ORDER[idx + 1]);
  }
  function gotoPrevStage() {
    const idx = STAGE_ORDER.indexOf(stage);
    if (idx > 0) setStage(STAGE_ORDER[idx - 1]);
  }

  // Back-arrow handler — context aware
  function handleTopBack() {
    if (stage === 'category' && categoryLevel > 1) {
      setCategoryLevel((categoryLevel - 1) as 1 | 2 | 3);
      return;
    }
    if (stage === 'brief' && briefIndex > 0) {
      setBriefIndex(briefIndex - 1);
      return;
    }
    if (stage === 'specs' && specIndex > 0) {
      setSpecIndex(specIndex - 1);
      setFragSubStep(0);
      return;
    }
    gotoPrevStage();
  }

  // Hide back arrow on personalization + thankyou
  const showBack = !['personalization', 'thankyou'].includes(stage);

  // Step rail phases — shown above the questions on every step except thankyou
  const railPhases = [
    { key: 'personalization', label: 'You' },
    { key: 'brief', label: 'Brief' },
    { key: 'category', label: 'Product' },
    { key: 'specs', label: 'Specs' },
    { key: 'review', label: 'Review' },
  ];
  const railIndex = (() => {
    if (stage === 'personalization') return 0;
    if (stage === 'brief-intro' || stage === 'brief') return 1;
    if (stage === 'category-intro' || stage === 'category') return 2;
    if (stage === 'specs-intro' || stage === 'specs') return 3;
    if (stage === 'review') return 4;
    return 4;
  })();
  const showRail = stage !== 'thankyou';

  return (
    <div className="min-h-screen bg-cream-50">
      <ProgressBar
        percent={progress}
        onBack={showBack ? handleTopBack : undefined}
        phases={showRail ? railPhases : undefined}
        currentPhaseIndex={railIndex}
      />

      <main className="pt-[140px] pb-24 min-h-screen">
        {stage === 'personalization' && (
          <PersonalizationStep onNext={gotoNextStage} />
        )}

        {stage === 'category-intro' && (
          <SectionIntro
            eyebrow="Step 03"
            headline="Now, the product."
            description="Tell us what we're crafting. Pick your category, then your sub-family, then the exact product."
            imageUrl="https://images.unsplash.com/photo-1556228720-195a672e8a03?w=1200&q=80"
            imageAlt="Cosmetics flatlay"
            onNext={() => { setCategoryLevel(1); gotoNextStage(); }}
            ctaLabel="Pick your product"
          />
        )}

        {stage === 'category' && (
          <CategoryStep
            level={categoryLevel}
            setLevel={setCategoryLevel}
            onComplete={gotoNextStage}
            onBack={gotoPrevStage}
          />
        )}

        {stage === 'brief-intro' && (
          <SectionIntro
            eyebrow="Step 02"
            headline="The creative brief."
            description="A few quick questions so our R&D team can match your vision exactly. Most people finish in under 3 minutes."
            imageUrl="https://images.unsplash.com/photo-1631729371254-42c2892f0e6e?w=1200&q=85&auto=format&fit=crop"
            imageAlt="Beauty inspiration"
            onNext={() => { setBriefIndex(0); gotoNextStage(); }}
            ctaLabel="Begin the brief"
          />
        )}

        {stage === 'brief' && (
          <BriefStep
            briefIndex={briefIndex}
            setBriefIndex={setBriefIndex}
            onComplete={gotoNextStage}
            onBack={gotoPrevStage}
          />
        )}

        {stage === 'specs-intro' && (
          <SectionIntro
            eyebrow="Step 04"
            headline="The technical specs."
            description="Now let's dial in the science — actives, packaging, color, scent. This is where your formula gets its DNA."
            imageUrl="https://images.unsplash.com/photo-1556228453-efd6c1ff04f6?w=1200&q=80"
            imageAlt="Cosmetic lab"
            onNext={() => { setSpecIndex(0); setFragSubStep(0); gotoNextStage(); }}
            ctaLabel="Customize specs"
          />
        )}

        {stage === 'specs' && (
          <SpecsStep
            specIndex={specIndex}
            setSpecIndex={setSpecIndex}
            fragSubStep={fragSubStep}
            setFragSubStep={setFragSubStep}
            onComplete={gotoNextStage}
            onBack={gotoPrevStage}
          />
        )}

        {stage === 'review' && (
          <ReviewStep
            onEditPersonalization={() => setStage('personalization')}
            onEditBrief={() => { setBriefIndex(0); setStage('brief'); }}
            onEditCategory={() => { setCategoryLevel(1); setStage('category'); }}
            onEditSpecs={() => { setSpecIndex(0); setFragSubStep(0); setStage('specs'); }}
            onBack={gotoPrevStage}
          />
        )}

        {stage === 'thankyou' && <ThankYouStep />}
      </main>
    </div>
  );
}
