'use client';

import { Check } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import OptionGrid, { SelectionCounter } from './OptionGrid';

interface ChipMultiProps {
  options: Array<{ value: string; label: string; description?: string }>;
  selected: string[];
  onChange: (next: string[]) => void;
  maxSelect?: number;
  showCounter?: boolean;
}

/**
 * Multi-select tiles. The grid auto-fills, so a long option list (14 actives,
 * say) spreads across the full width instead of forming a tall 4-wide column.
 */
export default function ChipMulti({
  options,
  selected,
  onChange,
  maxSelect,
  showCounter = true,
}: ChipMultiProps) {
  const { t } = useLanguage();

  function toggle(v: string) {
    if (selected.includes(v)) {
      onChange(selected.filter((s) => s !== v));
    } else {
      if (maxSelect && selected.length >= maxSelect) return;
      onChange([...selected, v]);
    }
  }

  // Descriptive options need more room than bare labels.
  const hasDescriptions = options.some((o) => o.description);
  const min = hasDescriptions ? '15rem' : '10.5rem';

  return (
    <div className="w-full">
      {showCounter && (
        <SelectionCounter
          text={
            maxSelect
              ? t('quiz.selectedOf', { count: selected.length, max: maxSelect })
              : t('quiz.selectedCount', { count: selected.length })
          }
        />
      )}

      <OptionGrid min={min}>
        {options.map((opt) => {
          const active = selected.includes(opt.value);
          const limitReached = !!maxSelect && selected.length >= maxSelect && !active;
          return (
            <button
              key={opt.value}
              type="button"
              aria-pressed={active}
              onClick={() => toggle(opt.value)}
              disabled={limitReached}
              className={`relative flex min-h-[4.25rem] flex-col items-center justify-center gap-1 rounded-xl border-2 px-4 py-4 text-center transition-all duration-200 ${
                active
                  ? 'border-fg bg-surface-inverse text-fg-inverse shadow-soft-lg'
                  : limitReached
                  ? 'cursor-not-allowed border-cream-200 bg-cream-100 text-cream-600'
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
    </div>
  );
}
