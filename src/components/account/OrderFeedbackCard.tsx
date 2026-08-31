'use client';

import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, MessageSquareQuote, Star } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

const ASPECTS = ['formulaQuality', 'packaging', 'communication', 'timing', 'valueForMoney'] as const;
type Aspect = (typeof ASPECTS)[number];

interface Feedback {
  rating: number;
  aspects?: Partial<Record<Aspect, number>>;
  comment?: string;
  wouldReorder?: boolean;
  allowPublish?: boolean;
  staffResponse?: string;
  createdAt?: string;
}

/**
 * Closes the loop: once an order is delivered the customer is asked how it
 * went, and any reply from their account manager appears right underneath.
 *
 * Renders nothing until the order is actually delivered, so it never nags a
 * customer whose sample is still in production.
 */
export default function OrderFeedbackCard({ orderId }: { orderId: string }) {
  const { t, locale } = useLanguage();
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [canSubmit, setCanSubmit] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [rating, setRating] = useState(0);
  const [aspects, setAspects] = useState<Partial<Record<Aspect, number>>>({});
  const [comment, setComment] = useState('');
  const [wouldReorder, setWouldReorder] = useState<boolean | undefined>(undefined);
  const [allowPublish, setAllowPublish] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/orders/${orderId}/feedback`, { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      setFeedback(data.feedback);
      setCanSubmit(!!data.canSubmit);
      if (data.feedback) {
        setRating(data.feedback.rating || 0);
        setAspects(data.feedback.aspects || {});
        setComment(data.feedback.comment || '');
        setWouldReorder(data.feedback.wouldReorder);
        setAllowPublish(!!data.feedback.allowPublish);
      }
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    load();
  }, [load]);

  async function submit() {
    if (!rating) {
      setError(t('feedback.ratingRequired'));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/orders/${orderId}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, aspects, comment, wouldReorder, allowPublish }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t('feedback.failed'));
      setEditing(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : t('feedback.failed'));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return null;
  // Not delivered yet and nothing recorded — nothing to show.
  if (!canSubmit && !feedback) return null;

  const showForm = editing || (canSubmit && !feedback);

  return (
    <section className="rounded-3xl border border-line bg-surface p-5 sm:p-6">
      <header className="mb-4 flex items-start gap-2.5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent-soft-fg">
          <MessageSquareQuote size={17} />
        </span>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-fg">{t('feedback.title')}</h3>
          <p className="mt-0.5 text-xs text-fg-muted">
            {showForm ? t('feedback.subtitle') : t('feedback.thanks')}
          </p>
        </div>
      </header>

      {showForm ? (
        <div className="space-y-5">
          <div>
            <p className="field-label">{t('feedback.overall')}</p>
            <StarRow value={rating} onChange={setRating} size={26} />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {ASPECTS.map((a) => (
              <div key={a} className="flex items-center justify-between gap-3 rounded-xl bg-surface-2 px-3 py-2.5">
                <span className="text-xs text-fg-muted">{t(`feedback.aspect.${a}`)}</span>
                <StarRow
                  value={aspects[a] || 0}
                  onChange={(v) => setAspects({ ...aspects, [a]: v })}
                  size={16}
                />
              </div>
            ))}
          </div>

          <div>
            <label htmlFor="fb-comment" className="field-label">
              {t('feedback.comment')}
            </label>
            <textarea
              id="fb-comment"
              rows={4}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={t('feedback.commentPlaceholder')}
              className="field resize-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <span className="text-xs text-fg-muted">{t('feedback.wouldReorder')}</span>
            {[true, false].map((v) => (
              <button
                key={String(v)}
                type="button"
                onClick={() => setWouldReorder(v)}
                className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
                  wouldReorder === v
                    ? 'border-brand bg-brand-soft text-brand-soft-fg'
                    : 'border-line text-fg-muted hover:border-line-strong'
                }`}
              >
                {v ? t('ui.yes') : t('ui.no')}
              </button>
            ))}
          </div>

          <label className="flex items-start gap-2 text-xs text-fg-muted">
            <input
              type="checkbox"
              checked={allowPublish}
              onChange={(e) => setAllowPublish(e.target.checked)}
              className="mt-0.5 accent-brand"
            />
            {t('feedback.allowPublish')}
          </label>

          {error && <p className="text-xs text-danger">{error}</p>}

          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={submit} disabled={saving} className="btn btn-primary btn-sm">
              {saving ? t('admin.saving') : t('feedback.submit')}
            </button>
            {feedback && (
              <button type="button" onClick={() => setEditing(false)} className="btn btn-ghost btn-sm">
                {t('ui.cancel')}
              </button>
            )}
          </div>
        </div>
      ) : (
        feedback && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <StarRow value={feedback.rating} readOnly size={20} />
              <span className="text-sm font-semibold text-fg">{feedback.rating}/5</span>
              {feedback.createdAt && (
                <span className="text-xs text-fg-subtle">
                  {new Date(feedback.createdAt).toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-GB')}
                </span>
              )}
            </div>

            {feedback.comment && (
              <blockquote className="rounded-2xl border-s-2 border-accent bg-surface-2 px-4 py-3 text-sm leading-relaxed text-fg">
                {feedback.comment}
              </blockquote>
            )}

            {feedback.staffResponse && (
              <div className="rounded-2xl bg-brand-soft px-4 py-3">
                <p className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-brand-soft-fg">
                  <CheckCircle2 size={12} />
                  {t('feedback.staffReply')}
                </p>
                <p className="text-sm leading-relaxed text-fg">{feedback.staffResponse}</p>
              </div>
            )}

            {canSubmit && (
              <button type="button" onClick={() => setEditing(true)} className="btn btn-outline btn-sm">
                {t('feedback.edit')}
              </button>
            )}
          </div>
        )
      )}
    </section>
  );
}

function StarRow({
  value,
  onChange,
  size = 20,
  readOnly = false,
}: {
  value: number;
  onChange?: (v: number) => void;
  size?: number;
  readOnly?: boolean;
}) {
  const { t } = useLanguage();
  return (
    <div className="flex items-center gap-1" role={readOnly ? 'img' : 'radiogroup'} aria-label={t('feedback.overall')}>
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = n <= value;
        const Cmp = readOnly ? 'span' : 'button';
        return (
          <Cmp
            key={n}
            {...(readOnly
              ? {}
              : {
                  type: 'button' as const,
                  role: 'radio',
                  'aria-checked': value === n,
                  'aria-label': `${n}`,
                  onClick: () => onChange?.(n),
                })}
            className={readOnly ? '' : 'transition-transform hover:scale-110'}
          >
            <Star
              size={size}
              className={filled ? 'fill-kcc-gold text-kcc-gold' : 'text-line-strong'}
              strokeWidth={1.5}
            />
          </Cmp>
        );
      })}
    </div>
  );
}
