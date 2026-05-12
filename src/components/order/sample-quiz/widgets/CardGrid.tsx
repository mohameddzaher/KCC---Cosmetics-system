'use client';

import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

interface CardGridProps {
  options: Array<{ value: string; label: string; description?: string; imageUrl?: string }>;
  value: string;
  onChange: (value: string) => void;
  variant?: 'cards' | 'image-cards';
  cols?: 2 | 3;
}

/**
 * Big cards — uniform aspect ratio, centered content.
 * For variant="image-cards" the imageUrl fills the top half (used by hair type).
 */
export default function CardGrid({ options, value, onChange, variant = 'cards', cols = 2 }: CardGridProps) {
  const isImage = variant === 'image-cards';
  const grid =
    cols === 2
      ? 'grid-cols-1 sm:grid-cols-2 max-w-3xl'
      : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 max-w-4xl';

  return (
    <div className={`grid ${grid} gap-4 mx-auto`}>
      {options.map((opt) => {
        const active = value === opt.value;
        const showImage = isImage && opt.imageUrl;

        return (
          <motion.button
            key={opt.value}
            type="button"
            whileHover={{ y: -3 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onChange(opt.value)}
            className={`group relative text-start rounded-2xl border-2 overflow-hidden transition-all duration-300 ${
              showImage ? 'flex flex-col' : 'min-h-[140px]'
            } ${
              active
                ? 'border-espresso-900 shadow-soft-lg'
                : 'border-cream-300 hover:border-ink-700 shadow-soft'
            }`}
          >
            {showImage && (
              <div className="relative h-48 overflow-hidden bg-cream-200">
                <img
                  src={opt.imageUrl}
                  alt={opt.label}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-cream-50/30 via-transparent to-transparent" />
                {active && (
                  <span className="absolute top-3 end-3 w-8 h-8 rounded-full bg-espresso-900 text-cream-50 flex items-center justify-center shadow-soft-lg">
                    <Check size={14} strokeWidth={3} />
                  </span>
                )}
              </div>
            )}

            <div className={`p-5 flex-1 flex flex-col justify-center ${active ? 'bg-cream-50' : 'bg-white'} ${showImage ? '' : 'min-h-[140px]'}`}>
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-serif text-xl text-ink-800 leading-snug">{opt.label}</h3>
                {!showImage && active && (
                  <span className="shrink-0 w-7 h-7 rounded-full bg-espresso-900 text-cream-50 flex items-center justify-center">
                    <Check size={14} strokeWidth={3} />
                  </span>
                )}
              </div>
              {opt.description && (
                <p className="mt-2 text-sm text-cream-800 leading-relaxed">{opt.description}</p>
              )}
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}
