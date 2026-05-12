'use client';

import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

interface ChipMultiProps {
  options: Array<{ value: string; label: string; description?: string }>;
  selected: string[];
  onChange: (next: string[]) => void;
  maxSelect?: number;
  showCounter?: boolean;
}

/**
 * Uniform multi-select cards — square-ish, same height, centered.
 */
export default function ChipMulti({ options, selected, onChange, maxSelect, showCounter = true }: ChipMultiProps) {
  function toggle(v: string) {
    if (selected.includes(v)) {
      onChange(selected.filter((s) => s !== v));
    } else {
      if (maxSelect && selected.length >= maxSelect) return;
      onChange([...selected, v]);
    }
  }

  const cols =
    options.length <= 4 ? 'grid-cols-2 sm:grid-cols-4 max-w-4xl' :
    options.length <= 6 ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 max-w-3xl' :
    options.length <= 9 ? 'grid-cols-2 sm:grid-cols-3 max-w-3xl' :
    'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 max-w-5xl';

  return (
    <div className="mx-auto max-w-5xl">
      {showCounter && maxSelect && (
        <div className="flex items-center gap-3 mb-5 justify-center">
          <span className="text-xs text-cream-700">
            <span className="font-mono tabular-nums text-kcc-rose-dark font-semibold">
              {selected.length}
            </span>
            <span className="ms-1.5">of {maxSelect} selected</span>
          </span>
        </div>
      )}
      <div className={`grid ${cols} gap-3 mx-auto`}>
        {options.map((opt) => {
          const active = selected.includes(opt.value);
          const limitReached = !!maxSelect && selected.length >= maxSelect && !active;
          return (
            <motion.button
              key={opt.value}
              type="button"
              whileHover={!limitReached ? { y: -2 } : undefined}
              whileTap={!limitReached ? { scale: 0.97 } : undefined}
              onClick={() => toggle(opt.value)}
              disabled={limitReached}
              className={`relative flex flex-col items-center justify-center text-center px-5 py-6 rounded-2xl border-2 min-h-[80px] transition-all duration-300 ${
                active
                  ? 'bg-espresso-900 text-cream-50 border-espresso-900 shadow-soft-lg'
                  : limitReached
                  ? 'bg-cream-100 text-cream-600 border-cream-200 cursor-not-allowed'
                  : 'bg-white text-ink-800 border-cream-300 hover:border-ink-700 shadow-soft'
              }`}
            >
              {active && (
                <span className="absolute top-2.5 end-2.5 w-5 h-5 rounded-full bg-kcc-rose-light text-espresso-900 flex items-center justify-center">
                  <Check size={11} strokeWidth={3} />
                </span>
              )}
              <span className={`text-sm font-medium leading-tight ${active ? 'font-semibold' : ''}`}>
                {opt.label}
              </span>
              {opt.description && (
                <span className={`mt-1 text-xs ${active ? 'text-cream-200' : 'text-cream-700'}`}>
                  {opt.description}
                </span>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
