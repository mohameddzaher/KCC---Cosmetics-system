'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, CreditCard, Gift, Loader2, Receipt, Tag } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatCurrency } from '@/lib/money';

/**
 * The price of a sample, and the two things a customer can do about it.
 *
 * A sample is priced after its brief has been read, so until the quotation is
 * sent there is nothing here but a line explaining that — better than an empty
 * payment card that looks broken.
 *
 * Neither the discount nor the total is calculated here. The code is sent to
 * the server, which re-checks who may use it and what it takes off and returns
 * the figures; this screen only shows them. A total a page worked out for itself
 * is a total a page can be talked into getting wrong.
 */

interface Props {
  // The page holds the order as loose JSON from the API.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  order: any;
  onChanged: () => void;
}

export default function QuotationCard({ order, onChanged }: Props) {
  const { t, locale } = useLanguage();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState<null | 'promo' | 'credit'>(null);
  const [error, setError] = useState<string | null>(null);

  const totals = order?.totals || {};
  const quote = order?.quote || {};
  const priced = Number(totals.subtotal) > 0;
  const paid = order?.paymentStatus === 'paid';
  const appliedCode: string | undefined = order?.promoCodeId?.code;
  const credit = Number(order?.creditApplied) || 0;
  const balance = Number(order?.userId?.referralBalance) || 0;
  const money = (n: number) => formatCurrency(n, locale === 'ar' ? 'ar' : 'en');

  async function send(patch: Record<string, unknown>, which: 'promo' | 'credit') {
    setBusy(which);
    setError(null);
    try {
      const res = await fetch(`/api/orders/${order._id}/discounts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t('samples.quoteApply'));
      setCode('');
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setBusy(null);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6 overflow-hidden rounded-2xl border border-line bg-surface/50"
    >
      <div className="flex items-center gap-2 border-b border-line bg-surface-2/20 px-5 py-3.5">
        <Receipt size={16} className="shrink-0 text-kcc-green" />
        <h3 className="text-sm font-semibold uppercase tracking-wider text-fg">
          {t('samples.quoteSection')}
        </h3>
      </div>

      {!priced ? (
        <p className="px-5 py-5 text-sm leading-relaxed text-fg-muted">
          {t('samples.quoteWaiting')}
        </p>
      ) : (
        <div className="px-5 py-4">
          {/* ---------------- what was quoted ---------------- */}
          <div className="flex items-baseline justify-between gap-4 border-b border-line/30 py-2.5">
            <span className="text-sm text-fg-muted">{t('samples.quotePrice')}</span>
            <span className="text-sm font-medium text-fg">{money(totals.subtotal)}</span>
          </div>

          {quote.notes && (
            <div className="border-b border-line/30 py-2.5">
              <p className="mb-1 text-xs text-fg-muted">{t('samples.quoteCovers')}</p>
              <p className="whitespace-pre-line text-sm text-fg">{quote.notes}</p>
            </div>
          )}

          {quote.validUntil && (
            <div className="flex items-center justify-between gap-4 border-b border-line/30 py-2.5">
              <span className="text-sm text-fg-muted">{t('samples.quoteValidUntil')}</span>
              <span className="text-sm text-fg">
                {new Date(quote.validUntil).toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-GB', {
                  day: 'numeric', month: 'short', year: 'numeric',
                })}
              </span>
            </div>
          )}

          {/* ---------------- promo code ---------------- */}
          {!paid && (
            <div className="border-b border-line/30 py-3.5">
              <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-fg-muted">
                <Tag size={12} />
                {t('samples.promoCode')}
              </p>
              {appliedCode ? (
                <div className="flex flex-wrap items-center gap-2">
                  <code className="rounded bg-kcc-green/10 px-2 py-0.5 text-xs font-bold text-kcc-green">
                    {appliedCode}
                  </code>
                  <button
                    type="button"
                    onClick={() => send({ promoCode: null }, 'promo')}
                    disabled={busy !== null}
                    className="text-xs font-medium text-fg-muted underline hover:text-fg disabled:opacity-50"
                  >
                    {t('samples.quoteRemove')}
                  </button>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  <input
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder={t('samples.quotePromoPlaceholder')}
                    dir="ltr"
                    className="min-w-0 flex-1 rounded-xl border border-line bg-surface-2 px-3 py-2 font-mono text-sm text-fg placeholder:text-fg-subtle focus:border-kcc-green focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => code.trim() && send({ promoCode: code.trim() }, 'promo')}
                    disabled={busy !== null || !code.trim()}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-surface-2 px-4 py-2 text-sm font-medium text-fg transition-colors hover:bg-surface-3 disabled:opacity-50"
                  >
                    {busy === 'promo' ? <Loader2 size={14} className="animate-spin" /> : null}
                    {t('samples.quoteApply')}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ---------------- referral credit ---------------- */}
          {!paid && (credit > 0 || balance > 0) && (
            <div className="border-b border-line/30 py-3.5">
              <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-fg-muted">
                <Gift size={12} />
                {t('samples.quoteCredit')}
              </p>
              {credit > 0 ? (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-kcc-green">
                    {t('samples.quoteCreditApplied')}: {money(credit)}
                  </span>
                  <button
                    type="button"
                    onClick={() => send({ useCredit: false }, 'credit')}
                    disabled={busy !== null}
                    className="text-xs font-medium text-fg-muted underline hover:text-fg disabled:opacity-50"
                  >
                    {t('samples.quoteCreditStop')}
                  </button>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-sm text-fg-muted">
                    {t('samples.quoteCreditAvailable', { amount: money(balance) })}
                  </span>
                  <button
                    type="button"
                    onClick={() => send({ useCredit: true }, 'credit')}
                    disabled={busy !== null}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-surface-2 px-4 py-2 text-sm font-medium text-fg transition-colors hover:bg-surface-3 disabled:opacity-50"
                  >
                    {busy === 'credit' ? <Loader2 size={14} className="animate-spin" /> : null}
                    {t('samples.quoteCreditUse')}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ---------------- what is owed ---------------- */}
          {Number(totals.discount) > 0 && (
            <div className="flex items-center justify-between gap-4 border-b border-line/30 py-2.5">
              <span className="text-sm text-fg-muted">{t('samples.quoteDiscount')}</span>
              <span className="text-sm font-medium text-red-400">−{money(totals.discount)}</span>
            </div>
          )}
          <div className="flex items-center justify-between gap-4 border-b border-line/30 py-2.5">
            <span className="text-sm text-fg-muted">{t('samples.quoteVat')}</span>
            <span className="text-sm text-fg">{money(totals.tax)}</span>
          </div>
          <div className="flex items-center justify-between gap-4 py-3">
            <span className="text-sm font-semibold text-fg">{t('samples.quoteTotal')}</span>
            <span className="text-lg font-bold text-kcc-green">{money(totals.total)}</span>
          </div>

          {error && (
            <p className="mb-3 flex items-start gap-1.5 text-sm text-red-400">
              <AlertCircle size={14} className="mt-0.5 shrink-0" />
              {error}
            </p>
          )}

          {/* ---------------- paying ---------------- */}
          {paid ? (
            <p className="rounded-xl bg-kcc-green/10 px-4 py-3 text-sm font-medium text-kcc-green">
              {t('samples.quotePaid')}
            </p>
          ) : (
            <>
              <button
                type="button"
                disabled
                title={t('samples.quotePayPending')}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-6 py-3 font-semibold text-brand-fg opacity-50 sm:w-auto"
              >
                <CreditCard size={18} />
                {t('samples.quotePay')}
              </button>
              <p className="mt-2.5 text-xs leading-relaxed text-fg-subtle">
                {t('samples.quotePayPending')}
              </p>
            </>
          )}
        </div>
      )}
    </motion.div>
  );
}
