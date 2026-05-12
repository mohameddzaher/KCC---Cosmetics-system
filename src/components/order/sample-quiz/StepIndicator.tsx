'use client';

import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

export interface StepIndicatorPhase {
  key: string;
  label: string;
}

interface StepIndicatorProps {
  phases: StepIndicatorPhase[];
  currentIndex: number;          // 0-based
  className?: string;
}

/**
 * Horizontal step rail — dots connected by a progress line, current step highlighted.
 * Sits below the percentage progress bar in QuizShell.
 */
export default function StepIndicator({ phases, currentIndex, className = '' }: StepIndicatorProps) {
  if (phases.length === 0) return null;

  return (
    <div className={`max-w-2xl mx-auto px-4 ${className}`}>
      <div className="relative flex items-center justify-between">
        {/* Connecting line (background) */}
        <div className="absolute top-3 start-[12px] end-[12px] h-px bg-cream-300 -z-0" />
        {/* Active progress line */}
        <motion.div
          className="absolute top-3 start-[12px] h-px bg-gradient-to-r from-espresso-900 via-kcc-rose-dark to-kcc-beige-dark"
          initial={false}
          animate={{
            width: phases.length > 1
              ? `calc(${(currentIndex / (phases.length - 1)) * 100}% - ${currentIndex === phases.length - 1 ? 24 : 0}px)`
              : '0%',
          }}
          transition={{ type: 'spring', stiffness: 90, damping: 22 }}
        />

        {phases.map((p, idx) => {
          const isDone = idx < currentIndex;
          const isCurrent = idx === currentIndex;
          return (
            <div key={p.key} className="relative z-10 flex flex-col items-center gap-1.5">
              <motion.div
                animate={{
                  scale: isCurrent ? 1.15 : 1,
                  backgroundColor: isDone || isCurrent ? '#160E07' : '#FFFFFF',
                }}
                transition={{ type: 'spring', stiffness: 200, damping: 18 }}
                className={`w-6 h-6 rounded-full flex items-center justify-center border-2 ${
                  isCurrent
                    ? 'border-espresso-900 shadow-soft-lg ring-4 ring-kcc-rose-light/40'
                    : isDone
                    ? 'border-espresso-900'
                    : 'border-cream-400'
                }`}
              >
                {isDone ? (
                  <Check size={11} strokeWidth={3} className="text-cream-50" />
                ) : (
                  <span
                    className={`text-[10px] font-mono font-semibold ${
                      isCurrent ? 'text-cream-50' : 'text-cream-700'
                    }`}
                  >
                    {idx + 1}
                  </span>
                )}
              </motion.div>
              <span
                className={`text-[9px] uppercase tracking-[0.18em] font-medium whitespace-nowrap transition-colors ${
                  isCurrent ? 'text-ink-800' : isDone ? 'text-cream-700' : 'text-cream-600'
                }`}
              >
                {p.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
