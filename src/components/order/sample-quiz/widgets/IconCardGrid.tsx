'use client';

import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import { Check } from 'lucide-react';
import {
  Droplet, Box, FlaskConical, Wind, CircleDot, Pipette, TestTube2,
  Beaker, GlassWater, Hexagon
} from 'lucide-react';

const iconMap: Record<string, LucideIcon> = {
  'gel-pump': Droplet,
  'jar': Box,
  'bottle': FlaskConical,
  'tube': TestTube2,
  'spray': Wind,
  'roll-on': CircleDot,
  'dropper': Pipette,
  'vial': TestTube2,
  'serum-pump': Pipette,
  'glass-ampoule': GlassWater,
  'pvc-ampoule': Beaker,
  'opaque': Hexagon,
  'translucent': Hexagon,
  'transparent': Hexagon,
};

interface IconCardGridProps {
  options: Array<{ value: string; label: string; meta?: { icon?: string; description?: string } }>;
  selected: string[];
  onChange: (next: string[]) => void;
  maxSelect?: number;
}

export default function IconCardGrid({ options, selected, onChange, maxSelect = 1 }: IconCardGridProps) {
  function toggle(v: string) {
    if (selected.includes(v)) {
      onChange(selected.filter((s) => s !== v));
    } else {
      if (maxSelect === 1) onChange([v]);
      else if (selected.length < maxSelect) onChange([...selected, v]);
    }
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
      {options.map((opt) => {
        const active = selected.includes(opt.value);
        const Icon = iconMap[opt.meta?.icon || opt.value] || Box;
        return (
          <motion.button
            key={opt.value}
            type="button"
            whileTap={{ scale: 0.97 }}
            onClick={() => toggle(opt.value)}
            className={`relative aspect-square flex flex-col items-center justify-center gap-2 p-3 rounded-2xl border-2 transition-all duration-300 ${
              active
                ? 'bg-espresso-900 border-espresso-900 text-cream-50 shadow-soft-lg'
                : 'bg-white border-cream-300 text-ink-700 hover:border-ink-700 shadow-soft'
            }`}
          >
            {active && (
              <span className="absolute top-2 end-2 w-5 h-5 rounded-full bg-cream-50 text-espresso-900 flex items-center justify-center">
                <Check size={11} strokeWidth={3} />
              </span>
            )}
            <Icon size={32} className={active ? 'text-kcc-rose-light' : 'text-kcc-rose-dark'} strokeWidth={1.4} />
            <span className="text-xs font-medium tracking-wide text-center leading-tight">
              {opt.label}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}
