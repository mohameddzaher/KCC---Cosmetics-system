'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft } from 'lucide-react';
import { useState, useEffect } from 'react';
import StepIndicator, { type StepIndicatorPhase } from './StepIndicator';

interface ProgressBarProps {
  percent: number;
  onBack?: () => void;
  rightLabel?: string;
  phases?: StepIndicatorPhase[];   // step rail phases
  currentPhaseIndex?: number;      // current 0-based index
}

const milestones = [25, 50, 75];
const milestoneCopy = ['Looking good ✨', 'Halfway there', 'Almost done'];

export default function ProgressBar({ percent, onBack, rightLabel, phases, currentPhaseIndex = 0 }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, percent));
  const [milestoneText, setMilestoneText] = useState<string | null>(null);

  useEffect(() => {
    const idx = milestones.findIndex((m) => Math.abs(clamped - m) < 1.5);
    if (idx >= 0) {
      setMilestoneText(milestoneCopy[idx]);
      const t = setTimeout(() => setMilestoneText(null), 1400);
      return () => clearTimeout(t);
    }
  }, [clamped]);

  return (
    <div className="fixed top-16 inset-x-0 z-30 bg-cream-50/92 backdrop-blur-xl border-b border-cream-300">
      {/* Top row: back + milestone + percentage */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 h-14 flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          disabled={!onBack}
          aria-label="Go back"
          className={`flex items-center gap-1.5 text-xs font-medium tracking-wider uppercase transition-all ${
            onBack
              ? 'text-ink-800 hover:text-kcc-rose-dark cursor-pointer'
              : 'text-cream-500 cursor-not-allowed'
          }`}
        >
          <ChevronLeft size={16} className="rtl-flip" />
          <span>Back</span>
        </button>

        <div className="absolute left-1/2 -translate-x-1/2 pointer-events-none">
          <AnimatePresence>
            {milestoneText && (
              <motion.span
                key={milestoneText}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.25 }}
                className="font-serif italic text-sm text-kcc-rose-dark"
              >
                {milestoneText}
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:block w-32 h-[3px] bg-cream-300 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-espresso-900 via-kcc-rose-dark to-kcc-beige-dark rounded-full"
              initial={false}
              animate={{ width: `${clamped}%` }}
              transition={{ type: 'spring', stiffness: 90, damping: 20 }}
            />
          </div>
          <div className="text-sm font-mono tabular-nums text-ink-800 tracking-wider font-semibold min-w-[36px] text-end">
            {rightLabel ?? `${Math.round(clamped)}%`}
          </div>
        </div>
      </div>

      {/* Step rail (only when phases provided) */}
      {phases && phases.length > 0 && (
        <div className="pb-3 pt-1">
          <StepIndicator phases={phases} currentIndex={currentPhaseIndex} />
        </div>
      )}

      {/* Mobile-only hairline at very bottom */}
      <div className="relative h-[3px] w-full bg-cream-200 overflow-hidden sm:hidden">
        <motion.div
          className="absolute inset-y-0 start-0 bg-gradient-to-r from-espresso-900 via-kcc-rose-dark to-kcc-beige-dark"
          initial={false}
          animate={{ width: `${clamped}%` }}
          transition={{ type: 'spring', stiffness: 90, damping: 20 }}
        />
      </div>
    </div>
  );
}
