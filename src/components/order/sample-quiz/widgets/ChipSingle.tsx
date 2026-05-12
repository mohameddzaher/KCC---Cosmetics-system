'use client';

import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

interface ChipSingleProps {
  options: Array<{ value: string; label: string; description?: string }>;
  value: string;
  onChange: (value: string) => void;
}

/**
 * Uniform pill cards — same height, same padding, centered text.
 * Auto-grid: 2 cols on mobile, 3–4 on desktop based on count.
 */
export default function ChipSingle({ options, value, onChange }: ChipSingleProps) {
  const cols =
    options.length <= 2 ? 'grid-cols-2 max-w-2xl' :
    options.length === 3 ? 'grid-cols-2 sm:grid-cols-3 max-w-3xl' :
    options.length <= 4 ? 'grid-cols-2 lg:grid-cols-4 max-w-4xl' :
    'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 max-w-5xl';

  const hasDesc = options.some((o) => o.description);

  return (
    <div className={`grid ${cols} gap-3 mx-auto`}>
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <motion.button
            key={opt.value}
            type="button"
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onChange(opt.value)}
            className={`relative flex flex-col items-center justify-center text-center px-5 py-6 rounded-2xl border-2 transition-all duration-300 ${
              hasDesc ? 'min-h-[120px]' : 'min-h-[80px]'
            } ${
              active
                ? 'bg-espresso-900 text-cream-50 border-espresso-900 shadow-soft-lg'
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
              <span className={`mt-1.5 text-xs leading-snug ${active ? 'text-cream-200' : 'text-cream-700'}`}>
                {opt.description}
              </span>
            )}
          </motion.button>
        );
      })}
    </div>
  );
}
