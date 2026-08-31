'use client';

import { Check } from 'lucide-react';
import OptionGrid from './OptionGrid';

interface ChipSingleProps {
  options: Array<{ value: string; label: string; description?: string }>;
  value: string;
  onChange: (value: string) => void;
}

/**
 * Single-select tiles. Auto-filling grid so short option lists stay compact and
 * long ones use the full width instead of running down the page.
 */
export default function ChipSingle({ options, value, onChange }: ChipSingleProps) {
  const hasDesc = options.some((o) => o.description);
  const min = hasDesc ? '15rem' : options.length <= 3 ? '12rem' : '10.5rem';

  return (
    <OptionGrid min={min}>
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(opt.value)}
            className={`relative flex flex-col items-center justify-center gap-1.5 rounded-xl border-2 px-5 py-5 text-center transition-all duration-200 ${
              hasDesc ? 'min-h-[6.5rem]' : 'min-h-[4.25rem]'
            } ${
              active
                ? 'border-fg bg-surface-inverse text-fg-inverse shadow-soft-lg'
                : 'border-cream-300 bg-surface text-ink-800 shadow-soft hover:-translate-y-0.5 hover:border-ink-700'
            }`}
          >
            {active && (
              <span className="absolute end-2 top-2 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-kcc-rose-light p-0.5 text-fg">
                <Check size={11} strokeWidth={3} />
              </span>
            )}
            <span className={`text-sm leading-snug ${active ? 'font-semibold' : 'font-medium'}`}>
              {opt.label}
            </span>
            {opt.description && (
              <span className={`text-xs leading-snug ${active ? 'text-cream-200' : 'text-cream-700'}`}>
                {opt.description}
              </span>
            )}
          </button>
        );
      })}
    </OptionGrid>
  );
}
