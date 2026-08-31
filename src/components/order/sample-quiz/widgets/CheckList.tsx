'use client';

import { Check } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import type { CheckListAnswer } from '@/lib/sample-quiz/types';
import { SelectionCounter } from './OptionGrid';

interface Option {
  value: string;
  label: string;
  description?: string;
  allowNote?: boolean;
  noteLabel?: string;
}

/**
 * Multi-select list where a chosen item can carry its own note — used by the
 * reformulation flow ("Ingredient replacement → which ingredient?") so the
 * detail lands on the right line instead of in one shared free-text box.
 *
 * Two columns on wide screens so a 9-item list does not become a long scroll.
 */
export default function CheckList({
  options,
  value,
  onChange,
  maxSelect,
}: {
  options: Option[];
  value: CheckListAnswer;
  onChange: (next: CheckListAnswer) => void;
  maxSelect?: number;
}) {
  const { t } = useLanguage();
  const selected = value?.selected ?? [];
  const notes = value?.notes ?? {};

  function toggle(v: string) {
    if (selected.includes(v)) {
      const nextNotes = { ...notes };
      delete nextNotes[v];
      onChange({ selected: selected.filter((s) => s !== v), notes: nextNotes });
      return;
    }
    if (maxSelect && selected.length >= maxSelect) return;
    onChange({ selected: [...selected, v], notes });
  }

  function setNote(v: string, note: string) {
    onChange({ selected, notes: { ...notes, [v]: note } });
  }

  return (
    <div className="w-full">
      <SelectionCounter
        text={
          maxSelect
            ? t('quiz.selectedOf', { count: selected.length, max: maxSelect })
            : t('quiz.selectedCount', { count: selected.length })
        }
      />

      <div className="grid gap-2.5 lg:grid-cols-2">
        {options.map((opt) => {
          const active = selected.includes(opt.value);
          const limitReached = !!maxSelect && selected.length >= maxSelect && !active;
          return (
            <div
              key={opt.value}
              className={`rounded-xl border-2 transition-colors ${
                active ? 'border-fg bg-cream-100' : 'border-cream-300 bg-surface'
              }`}
            >
              <button
                type="button"
                role="checkbox"
                aria-checked={active}
                disabled={limitReached}
                onClick={() => toggle(opt.value)}
                className="flex w-full items-start gap-3 px-4 py-3.5 text-start disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors ${
                    active
                      ? 'border-fg bg-surface-inverse text-fg-inverse'
                      : 'border-cream-400 bg-surface'
                  }`}
                >
                  {active && <Check size={12} strokeWidth={3} />}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium leading-snug text-ink-800">{opt.label}</span>
                  {opt.description && (
                    <span className="mt-0.5 block text-xs leading-snug text-cream-700">{opt.description}</span>
                  )}
                </span>
              </button>

              {active && opt.allowNote && (
                <div className="border-t border-cream-300 px-4 py-3">
                  <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-cream-700">
                    {opt.noteLabel || t('quiz.addNote')}
                  </label>
                  <textarea
                    rows={2}
                    value={notes[opt.value] || ''}
                    onChange={(e) => setNote(opt.value, e.target.value)}
                    placeholder={t('quiz.notePlaceholder')}
                    className="w-full resize-none rounded-lg border border-cream-300 bg-surface px-3 py-2 text-sm text-ink-800 placeholder:text-cream-600 focus:border-ink-700 focus:outline-none"
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
