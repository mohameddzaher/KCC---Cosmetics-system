'use client';

import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import OptionGrid from './OptionGrid';

interface ColorSwatchGridProps {
  options: Array<{ value: string; label: string; meta?: { hex?: string } }>;
  selected: string[];
  onChange: (next: string[]) => void;
  maxSelect?: number;
}

export default function ColorSwatchGrid({ options, selected, onChange, maxSelect = 1 }: ColorSwatchGridProps) {
  function toggle(v: string) {
    if (selected.includes(v)) {
      onChange(selected.filter((s) => s !== v));
    } else {
      if (maxSelect === 1) {
        onChange([v]);
      } else if (selected.length < maxSelect) {
        onChange([...selected, v]);
      }
    }
  }

  return (
    <OptionGrid min="7rem" gap="1.25rem">
      {options.map((opt) => {
        const active = selected.includes(opt.value);
        const hex = opt.meta?.hex || '#FFFFFF';
        const isWhite = hex.toUpperCase() === '#FFFFFF';
        return (
          <motion.button
            key={opt.value}
            type="button"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            aria-pressed={active}
            onClick={() => toggle(opt.value)}
            className="group flex flex-col items-center gap-2"
          >
            <div
              className={`relative w-20 h-20 rounded-full transition-all duration-300 shadow-soft ${
                active
                  ? 'ring-[3px] ring-fg ring-offset-4 ring-offset-cream-100'
                  : isWhite
                  ? 'ring-1 ring-cream-400'
                  : ''
              }`}
              style={{ backgroundColor: hex }}
            >
              {active && (
                <span className="absolute inset-0 flex items-center justify-center">
                  <span className="w-7 h-7 rounded-full bg-surface/95 flex items-center justify-center shadow-soft">
                    <Check size={14} strokeWidth={3} className="text-fg" />
                  </span>
                </span>
              )}
            </div>
            <span
              className={`text-xs tracking-wide ${
                active ? 'text-ink-800 font-semibold' : 'text-cream-800'
              }`}
            >
              {opt.label}
            </span>
          </motion.button>
        );
      })}
    </OptionGrid>
  );
}
