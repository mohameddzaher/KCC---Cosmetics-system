'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Pipette } from 'lucide-react';
import OptionGrid from './OptionGrid';

/**
 * Colour picker for a spec whose answers are colours.
 *
 * Two things beyond a plain swatch list:
 *
 *  • A custom shade. The curated list covers the common asks, but a brand
 *    usually arrives with an exact colour in mind, so the last tile opens a
 *    colour wheel and a code field. It is stored as `custom:#RRGGBB` — the
 *    prefix is what tells every reader (review screen, order record, factory)
 *    that this was specified rather than chosen off the list.
 *  • Transparent. A clear product has no hex at all, so it is drawn as a
 *    chequerboard instead of a colour, the way design tools show "no fill".
 */

export const CUSTOM_PREFIX = 'custom:';

/** The chequerboard that reads as "clear" rather than "white". */
const CLEAR_BG =
  'repeating-conic-gradient(var(--clear-a, #e9e2d9) 0% 25%, var(--clear-b, #fbf8f4) 0% 50%) 50% / 1.1rem 1.1rem';

/** The wheel on the custom tile before a shade is chosen. */
const WHEEL_BG =
  'conic-gradient(#e03131, #fb923c, #f9d75a, #52b788, #5da9e9, #a77ac4, #d6336c, #e03131)';

function isCustom(v: string): boolean {
  return v.startsWith(CUSTOM_PREFIX);
}

/** A 6-digit hex, or null when the text is not one yet. */
function normaliseHex(input: string): string | null {
  const raw = input.trim().replace(/^#/, '');
  if (!/^[0-9a-fA-F]{6}$/.test(raw)) return null;
  return `#${raw.toUpperCase()}`;
}

interface ColorSwatchGridProps {
  options: Array<{ value: string; label: string; meta?: { hex?: string } }>;
  selected: string[];
  onChange: (next: string[]) => void;
  maxSelect?: number;
  /** Offer a free colour choice alongside the list. */
  allowCustom?: boolean;
  customLabel?: string;
  customHint?: string;
  codeLabel?: string;
}

export default function ColorSwatchGrid({
  options,
  selected,
  onChange,
  maxSelect = 1,
  allowCustom = false,
  customLabel = 'Custom shade',
  customHint,
  codeLabel = 'Colour code',
}: ColorSwatchGridProps) {
  const chosenCustom = selected.find(isCustom);
  const chosenHex = chosenCustom ? chosenCustom.slice(CUSTOM_PREFIX.length) : '';

  // What the code field shows while it is being typed — which is not yet a
  // valid colour, so it cannot be the answer until it parses.
  const [draft, setDraft] = useState(chosenHex || '#C9A84C');

  useEffect(() => {
    if (chosenHex) setDraft(chosenHex);
  }, [chosenHex]);

  function toggle(v: string) {
    if (selected.includes(v)) {
      onChange(selected.filter((s) => s !== v));
    } else if (maxSelect === 1) {
      onChange([v]);
    } else if (selected.length < maxSelect) {
      onChange([...selected, v]);
    }
  }

  /** Choosing a shade replaces any previous custom one rather than stacking. */
  function setCustom(hex: string) {
    const value = `${CUSTOM_PREFIX}${hex.toUpperCase()}`;
    const withoutCustom = selected.filter((s) => !isCustom(s));
    if (maxSelect === 1) {
      onChange([value]);
      return;
    }
    if (withoutCustom.length < maxSelect) onChange([...withoutCustom, value]);
    else onChange([...withoutCustom.slice(0, maxSelect - 1), value]);
  }

  return (
    <div>
      <OptionGrid min="7rem" gap="1.25rem">
        {options.map((opt) => {
          const active = selected.includes(opt.value);
          const hex = opt.meta?.hex || '#FFFFFF';
          const clear = hex.toLowerCase() === 'transparent';
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
                className={`relative h-20 w-20 rounded-full shadow-soft transition-all duration-300 ${
                  active
                    ? 'ring-[3px] ring-fg ring-offset-4 ring-offset-cream-100'
                    : isWhite || clear
                      ? 'ring-1 ring-cream-400'
                      : ''
                }`}
                style={clear ? { background: CLEAR_BG } : { backgroundColor: hex }}
              >
                {active && (
                  <span className="absolute inset-0 flex items-center justify-center">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-surface/95 shadow-soft">
                      <Check size={14} strokeWidth={3} className="text-fg" />
                    </span>
                  </span>
                )}
              </div>
              <span
                className={`text-xs tracking-wide ${
                  active ? 'font-semibold text-ink-800' : 'text-cream-800'
                }`}
              >
                {opt.label}
              </span>
            </motion.button>
          );
        })}

        {allowCustom && (
          <motion.button
            type="button"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            aria-pressed={!!chosenCustom}
            onClick={() => setCustom(normaliseHex(draft) || '#C9A84C')}
            className="group flex flex-col items-center gap-2"
          >
            <div
              className={`relative h-20 w-20 rounded-full shadow-soft transition-all duration-300 ${
                chosenCustom ? 'ring-[3px] ring-fg ring-offset-4 ring-offset-cream-100' : ''
              }`}
              style={chosenCustom ? { backgroundColor: chosenHex } : { background: WHEEL_BG }}
            >
              <span className="absolute inset-0 flex items-center justify-center">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-surface/95 shadow-soft">
                  {chosenCustom ? (
                    <Check size={14} strokeWidth={3} className="text-fg" />
                  ) : (
                    <Pipette size={13} className="text-fg" />
                  )}
                </span>
              </span>
            </div>
            <span
              className={`text-xs tracking-wide ${
                chosenCustom ? 'font-semibold text-ink-800' : 'text-cream-800'
              }`}
            >
              {chosenCustom ? chosenHex : customLabel}
            </span>
          </motion.button>
        )}
      </OptionGrid>

      {allowCustom && (
        <div className="mt-6 rounded-2xl border border-cream-300 bg-cream-50 p-4 sm:p-5">
          <div className="flex flex-wrap items-end gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium tracking-wide text-cream-800">{customLabel}</span>
              <input
                type="color"
                value={normaliseHex(draft) || '#C9A84C'}
                onChange={(e) => {
                  setDraft(e.target.value);
                  setCustom(e.target.value);
                }}
                aria-label={customLabel}
                className="h-11 w-20 cursor-pointer rounded-xl border border-cream-400 bg-surface p-1"
              />
            </label>

            <label className="flex min-w-0 flex-1 flex-col gap-1.5">
              <span className="text-xs font-medium tracking-wide text-cream-800">{codeLabel}</span>
              <input
                type="text"
                inputMode="text"
                dir="ltr"
                value={draft}
                placeholder="#C9A84C"
                onChange={(e) => {
                  setDraft(e.target.value);
                  const hex = normaliseHex(e.target.value);
                  // Only a complete code becomes the answer; half-typed text
                  // must not overwrite what the customer already chose.
                  if (hex) setCustom(hex);
                }}
                aria-label={codeLabel}
                className="h-11 w-full rounded-xl border border-cream-400 bg-surface px-3 font-mono text-sm text-ink-800 placeholder:text-cream-700"
              />
            </label>
          </div>
          {customHint && <p className="mt-3 text-xs leading-relaxed text-cream-800">{customHint}</p>}
        </div>
      )}
    </div>
  );
}
