'use client';

import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

interface VisualCardGridProps {
  options: Array<{ value: string; label: string; meta?: { description?: string } }>;
  selected: string[];
  onChange: (next: string[]) => void;
  maxSelect?: number;
}

/**
 * Visual cards for "Package Color" — opaque/translucent/transparent.
 * Each card has a stylized bottle silhouette demonstrating the level of opacity.
 */
export default function VisualCardGrid({ options, selected, onChange, maxSelect = 1 }: VisualCardGridProps) {
  function toggle(v: string) {
    if (selected.includes(v)) onChange(selected.filter((s) => s !== v));
    else if (maxSelect === 1) onChange([v]);
    else if (selected.length < maxSelect) onChange([...selected, v]);
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {options.map((opt) => {
        const active = selected.includes(opt.value);
        const opacity =
          opt.value === 'opaque' ? 1 :
          opt.value === 'translucent' ? 0.55 :
          0.18;
        return (
          <motion.button
            key={opt.value}
            type="button"
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => toggle(opt.value)}
            className={`group relative p-6 rounded-2xl border-2 transition-all duration-300 text-start ${
              active
                ? 'border-espresso-900 bg-cream-50 shadow-soft-lg'
                : 'border-cream-300 bg-white hover:border-ink-700 shadow-soft'
            }`}
          >
            {active && (
              <span className="absolute top-3 end-3 w-7 h-7 rounded-full bg-espresso-900 text-cream-50 flex items-center justify-center">
                <Check size={14} strokeWidth={3} />
              </span>
            )}
            {/* Bottle silhouette */}
            <div className="h-32 flex items-end justify-center mb-4">
              <svg viewBox="0 0 60 100" className="h-full" aria-hidden>
                <defs>
                  <linearGradient id={`grad-${opt.value}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#D89BA3" stopOpacity={opacity * 0.8} />
                    <stop offset="100%" stopColor="#D4A574" stopOpacity={opacity} />
                  </linearGradient>
                </defs>
                {/* product fill (visible based on package opacity) */}
                <rect x="14" y="25" width="32" height="60" rx="2" fill="#D89BA3" opacity={1 - opacity * 0.85} />
                {/* package outline */}
                <path d="M22 6 L38 6 L38 18 L46 24 L46 90 Q46 96 40 96 L20 96 Q14 96 14 90 L14 24 L22 18 Z"
                      fill={`url(#grad-${opt.value})`}
                      stroke="#43301F"
                      strokeWidth="1.2" />
                <line x1="14" y1="40" x2="46" y2="40" stroke="#43301F" strokeWidth="0.6" opacity="0.4" />
              </svg>
            </div>
            <h3 className="font-serif text-xl text-ink-800 mb-1">{opt.label}</h3>
            {opt.meta?.description && (
              <p className="text-sm text-cream-800 leading-relaxed">{opt.meta.description}</p>
            )}
          </motion.button>
        );
      })}
    </div>
  );
}
