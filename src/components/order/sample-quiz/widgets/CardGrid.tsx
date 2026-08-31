'use client';

import { Check } from 'lucide-react';
import OptionGrid from './OptionGrid';

interface CardGridProps {
  options: Array<{ value: string; label: string; description?: string; imageUrl?: string }>;
  value: string;
  onChange: (value: string) => void;
  variant?: 'cards' | 'image-cards';
}

/**
 * Large single-select cards. Auto-filling grid: two up on a laptop, four on a
 * conference display, one on a phone — without any hardcoded column counts.
 */
export default function CardGrid({ options, value, onChange, variant = 'cards' }: CardGridProps) {
  const isImage = variant === 'image-cards';

  return (
    <OptionGrid min={isImage ? '17rem' : '19rem'} gap="1rem">
      {options.map((opt) => {
        const active = value === opt.value;
        const showImage = isImage && opt.imageUrl;

        return (
          <button
            key={opt.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(opt.value)}
            className={`group relative flex flex-col overflow-hidden rounded-2xl border-2 text-start transition-all duration-200 hover:-translate-y-0.5 ${
              active
                ? 'border-fg shadow-soft-lg'
                : 'border-cream-300 shadow-soft hover:border-ink-700'
            }`}
          >
            {showImage && (
              <span className="relative block aspect-[4/3] w-full overflow-hidden bg-cream-200">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={opt.imageUrl}
                  alt=""
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                {active && (
                  <span className="absolute end-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-surface-inverse text-fg-inverse shadow-soft-lg">
                    <Check size={14} strokeWidth={3} />
                  </span>
                )}
              </span>
            )}

            <span
              className={`flex min-h-[7rem] flex-1 flex-col justify-center p-5 ${
                active ? 'bg-cream-50' : 'bg-surface'
              }`}
            >
              <span className="flex items-start justify-between gap-3">
                <span className="font-serif text-xl leading-snug text-ink-800">{opt.label}</span>
                {!showImage && active && (
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-inverse text-fg-inverse">
                    <Check size={14} strokeWidth={3} />
                  </span>
                )}
              </span>
              {opt.description && (
                <span className="mt-2 text-sm leading-relaxed text-cream-800">{opt.description}</span>
              )}
            </span>
          </button>
        );
      })}
    </OptionGrid>
  );
}
