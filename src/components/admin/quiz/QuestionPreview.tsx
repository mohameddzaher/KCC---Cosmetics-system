'use client';

/**
 * Non-interactive miniature of how a question renders in the customer quiz.
 * Deliberately static — it exists so an admin can see the shape of what they
 * are authoring without leaving the editor.
 */

import { Check, Upload } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import type { AdminBriefQuestion } from './types';

export default function QuestionPreview({ question }: { question: AdminBriefQuestion }) {
  const { t, pick } = useLanguage();
  const title = pick(question.titleEn, question.titleAr);
  const subtitle = pick(question.subtitleEn, question.subtitleAr);
  const options = question.options || [];

  return (
    <div className="space-y-3">
      <p className="text-base font-semibold leading-snug text-fg">
        {title || t('admin.questionEn')}
        {question.required && <span className="ms-1 text-danger">*</span>}
      </p>
      {subtitle && <p className="text-xs leading-relaxed text-fg-muted">{subtitle}</p>}

      {question.widget === 'text' && (
        <div className="rounded-lg border border-line bg-surface px-3 py-2.5 text-sm text-fg-subtle">…</div>
      )}

      {question.widget === 'textarea' && (
        <div className="h-20 rounded-lg border border-line bg-surface px-3 py-2.5 text-sm text-fg-subtle">…</div>
      )}

      {(question.widget === 'chips-single' ||
        question.widget === 'chips-multi' ||
        question.widget === 'yes-no') && (
        <div className="flex flex-wrap gap-1.5">
          {options.map((o, i) => (
            <span
              key={o.value || i}
              className={`rounded-full border px-3 py-1.5 text-xs ${
                i === 0 ? 'border-brand bg-brand-soft text-brand-soft-fg' : 'border-line bg-surface text-fg'
              }`}
            >
              {pick(o.labelEn, o.labelAr) || '—'}
            </span>
          ))}
          {options.length === 0 && <Placeholder />}
        </div>
      )}

      {question.widget === 'cards' && (
        <div className="grid gap-2 sm:grid-cols-2">
          {options.map((o, i) => (
            <div
              key={o.value || i}
              className={`rounded-lg border p-2.5 ${
                i === 0 ? 'border-brand bg-brand-soft' : 'border-line bg-surface'
              }`}
            >
              <p className="text-xs font-semibold text-fg">{pick(o.labelEn, o.labelAr) || '—'}</p>
              {(o.description || o.descriptionAr) && (
                <p className="mt-0.5 text-[11px] leading-snug text-fg-muted">
                  {pick(o.description, o.descriptionAr)}
                </p>
              )}
            </div>
          ))}
          {options.length === 0 && <Placeholder />}
        </div>
      )}

      {question.widget === 'image-cards' && (
        <div className="grid grid-cols-2 gap-2">
          {options.map((o, i) => (
            <div key={o.value || i} className="overflow-hidden rounded-lg border border-line bg-surface">
              <div className="h-16 bg-surface-3">
                {o.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={o.imageUrl} alt="" className="h-full w-full object-cover" />
                )}
              </div>
              <p className="truncate px-2 py-1.5 text-[11px] font-medium text-fg">
                {pick(o.labelEn, o.labelAr) || '—'}
              </p>
            </div>
          ))}
          {options.length === 0 && <Placeholder />}
        </div>
      )}

      {question.widget === 'checkbox-list' && (
        <div className="space-y-1.5">
          {options.map((o, i) => (
            <div
              key={o.value || i}
              className="flex items-start gap-2 rounded-lg border border-line bg-surface px-2.5 py-2"
            >
              <span
                className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                  i === 0 ? 'border-brand bg-brand text-brand-fg' : 'border-line-strong'
                }`}
              >
                {i === 0 && <Check size={10} strokeWidth={3} />}
              </span>
              <span className="min-w-0">
                <span className="block text-xs font-medium text-fg">{pick(o.labelEn, o.labelAr) || '—'}</span>
                {o.allowNote && (
                  <span className="mt-1 block rounded border border-dashed border-line px-2 py-1 text-[10px] text-fg-subtle">
                    {pick(o.noteLabelEn, o.noteLabelAr) || t('ui.addNote')}
                  </span>
                )}
              </span>
            </div>
          ))}
          {options.length === 0 && <Placeholder />}
        </div>
      )}

      {question.widget === 'upload' && (
        <div className="space-y-1.5">
          {options.map((o, i) => (
            <div
              key={o.value || i}
              className="flex items-center gap-2 rounded-lg border border-dashed border-line bg-surface px-2.5 py-3"
            >
              <Upload size={14} className="shrink-0 text-fg-subtle" />
              <span className="min-w-0 text-xs text-fg">
                {pick(o.labelEn, o.labelAr) || '—'}
                {o.slotRequired && <span className="ms-1 text-danger">*</span>}
              </span>
            </div>
          ))}
          {options.length === 0 && <Placeholder />}
        </div>
      )}

      {question.widget === 'hero-ingredient' && (
        <div className="rounded-lg border border-line bg-surface p-3 text-xs text-fg-muted">
          {t('admin.widget.hero-ingredientDesc')}
        </div>
      )}

      {question.allowNote && (
        <p className="text-[11px] text-fg-subtle">+ {t('ui.addNote')}</p>
      )}
    </div>
  );
}

function Placeholder() {
  const { t } = useLanguage();
  return (
    <p className="w-full rounded-lg border border-dashed border-line px-3 py-4 text-center text-[11px] text-fg-subtle">
      {t('admin.noData')}
    </p>
  );
}
