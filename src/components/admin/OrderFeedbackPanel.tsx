'use client';

import { useCallback, useEffect, useState } from 'react';
import { MessageSquareQuote, Send, Star } from 'lucide-react';
import { Button, Card, ErrorNote, SectionTitle, TextArea } from '@/components/admin/ui';
import { useLanguage } from '@/contexts/LanguageContext';

const ASPECTS = ['formulaQuality', 'packaging', 'communication', 'timing', 'valueForMoney'] as const;

interface Feedback {
  rating: number;
  aspects?: Record<string, number>;
  comment?: string;
  wouldReorder?: boolean;
  allowPublish?: boolean;
  staffResponse?: string;
  respondedAt?: string;
  createdAt?: string;
}

/**
 * The customer's verdict on a delivered order, and the account manager's reply.
 *
 * Renders nothing until feedback exists, so it does not clutter an order that
 * has not shipped yet.
 */
export default function OrderFeedbackPanel({ orderId }: { orderId: string }) {
  const { t, locale } = useLanguage();
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [reply, setReply] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/orders/${orderId}/feedback`, { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      setFeedback(data.feedback);
      setReply(data.feedback?.staffResponse || '');
    } catch {
      /* nothing to show */
    }
  }, [orderId]);

  useEffect(() => {
    load();
  }, [load]);

  async function send() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/orders/${orderId}/feedback`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staffResponse: reply }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t('admin.saveFailed'));
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : t('admin.saveFailed'));
    } finally {
      setSaving(false);
    }
  }

  if (!feedback) return null;

  const tone =
    feedback.rating >= 4 ? 'text-ok' : feedback.rating >= 3 ? 'text-warn' : 'text-danger';

  return (
    <Card>
      <SectionTitle
        title={t('feedback.title')}
        hint={
          feedback.createdAt
            ? new Date(feedback.createdAt).toLocaleString(locale === 'ar' ? 'ar-EG' : 'en-GB')
            : undefined
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <span className="flex items-center gap-0.5">
          {[1, 2, 3, 4, 5].map((n) => (
            <Star
              key={n}
              size={18}
              strokeWidth={1.5}
              className={n <= feedback.rating ? 'fill-kcc-gold text-kcc-gold' : 'text-line-strong'}
            />
          ))}
        </span>
        <span className={`text-lg font-bold ${tone}`}>{feedback.rating}/5</span>
        {feedback.wouldReorder !== undefined && (
          <span className={`badge ${feedback.wouldReorder ? 'badge-ok' : 'badge-warn'}`}>
            {t('feedback.wouldReorder')} {feedback.wouldReorder ? t('ui.yes') : t('ui.no')}
          </span>
        )}
        {feedback.allowPublish && <span className="badge badge-accent">{t('feedback.publishable')}</span>}
      </div>

      {feedback.aspects && Object.keys(feedback.aspects).length > 0 && (
        <div
          className="mb-4 grid gap-2"
          style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(12rem, 100%), 1fr))' }}
        >
          {ASPECTS.filter((a) => feedback.aspects?.[a]).map((a) => (
            <div key={a} className="flex items-center justify-between gap-2 rounded-lg bg-surface-2 px-3 py-2">
              <span className="text-xs text-fg-muted">{t(`feedback.aspect.${a}`)}</span>
              <span className="font-mono text-xs font-semibold text-fg">{feedback.aspects![a]}/5</span>
            </div>
          ))}
        </div>
      )}

      {feedback.comment && (
        <blockquote className="mb-4 flex gap-2.5 rounded-xl border-s-2 border-accent bg-surface-2 px-4 py-3 text-sm leading-relaxed text-fg">
          <MessageSquareQuote size={15} className="mt-0.5 shrink-0 text-accent" />
          <span className="min-w-0">{feedback.comment}</span>
        </blockquote>
      )}

      <div>
        <label htmlFor="fb-reply" className="field-label">
          {t('feedback.staffReply')}
        </label>
        <TextArea
          id="fb-reply"
          rows={3}
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          placeholder={t('feedback.staffReplyPlaceholder')}
        />
        <div className="mt-2 flex items-center gap-2">
          <Button size="sm" icon={Send} onClick={send} loading={saving} disabled={!reply.trim()}>
            {feedback.staffResponse ? t('ui.update') : t('ui.send')}
          </Button>
          {feedback.respondedAt && (
            <span className="text-[11px] text-fg-subtle">
              {new Date(feedback.respondedAt).toLocaleString(locale === 'ar' ? 'ar-EG' : 'en-GB')}
            </span>
          )}
        </div>
        {error && (
          <div className="mt-2">
            <ErrorNote>{error}</ErrorNote>
          </div>
        )}
      </div>
    </Card>
  );
}
