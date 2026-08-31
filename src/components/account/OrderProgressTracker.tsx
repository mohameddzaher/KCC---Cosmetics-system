'use client';

import { motion, useReducedMotion } from 'framer-motion';
import {
  BadgeCheck, Check, ClipboardCheck, FileSignature, Factory, PackageCheck, Radio, Truck,
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  statusBadgeClass, statusLabel, statusMeta, TRACKER_STAGES, trackerIndex,
} from '@/lib/orderWorkflow';

const STAGE_ICONS = {
  intake: ClipboardCheck,
  review: BadgeCheck,
  commercial: FileSignature,
  production: Factory,
  dispatch: Truck,
  done: PackageCheck,
} as const;

/**
 * Customer-facing order tracker.
 *
 * Reads the same workflow definition the staff side uses, so a status the
 * factory or dispatch desk sets shows up here immediately — including the
 * newer steps (quality check, ready to ship, out for delivery) that the old
 * hardcoded eight-step list silently failed to match.
 */
export default function OrderProgressTracker({
  status,
  updatedAt,
}: {
  status: string;
  updatedAt?: string;
}) {
  const { t, locale, tx } = useLanguage();
  const reduce = useReducedMotion();

  const meta = statusMeta(status);
  const idx = trackerIndex(status);
  const halted = idx < 0;
  const safeIndex = halted ? 0 : idx;
  const percent = Math.round(((safeIndex + 1) / TRACKER_STAGES.length) * 100);

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 }}
      className="overflow-hidden rounded-3xl border border-line bg-surface p-4 shadow-soft sm:p-6"
    >
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-fg">
            {tx('Order Status / Delivery Progress')}
          </h3>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-fg-subtle">
            <Radio size={11} className="text-ok" />
            {updatedAt
              ? new Date(updatedAt).toLocaleString(locale === 'ar' ? 'ar-EG' : 'en-GB', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : tx('Auto-updating')}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <span className={`badge ${statusBadgeClass(status)}`}>{statusLabel(status, locale)}</span>
          {!halted && <span className="font-mono text-xs text-fg-muted">{percent}%</span>}
        </div>
      </div>

      <p className="mb-5 text-sm text-fg-muted">
        {locale === 'ar' ? meta.customerAr : meta.customerEn}
      </p>

      {halted ? (
        <div className="rounded-2xl border border-warn bg-warn-soft px-4 py-3 text-sm text-warn-soft-fg">
          {locale === 'ar' ? meta.customerAr : meta.customerEn}
        </div>
      ) : (
        <>
          {/* Rail — horizontal on wide screens, vertical on a phone. */}
          <ol className="hidden items-start gap-1 sm:flex">
            {TRACKER_STAGES.map((stage, i) => {
              const Icon = STAGE_ICONS[stage.key as keyof typeof STAGE_ICONS] ?? ClipboardCheck;
              const done = i < safeIndex;
              const current = i === safeIndex;
              return (
                <li key={stage.key} className="flex min-w-0 flex-1 flex-col items-center gap-2">
                  <div className="flex w-full items-center">
                    <span
                      className={`h-0.5 flex-1 ${i === 0 ? 'opacity-0' : done || current ? 'bg-brand' : 'bg-line'}`}
                    />
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                        done
                          ? 'border-brand bg-brand text-brand-fg'
                          : current
                          ? 'border-brand bg-brand-soft text-brand-soft-fg ring-4 ring-brand/15'
                          : 'border-line bg-surface text-fg-subtle'
                      }`}
                    >
                      {done ? <Check size={15} strokeWidth={3} /> : <Icon size={15} />}
                    </span>
                    <span
                      className={`h-0.5 flex-1 ${
                        i === TRACKER_STAGES.length - 1 ? 'opacity-0' : done ? 'bg-brand' : 'bg-line'
                      }`}
                    />
                  </div>
                  <span
                    className={`text-center text-[11px] leading-tight ${
                      current ? 'font-semibold text-fg' : done ? 'text-fg-muted' : 'text-fg-subtle'
                    }`}
                  >
                    {locale === 'ar' ? stage.labelAr : stage.labelEn}
                  </span>
                </li>
              );
            })}
          </ol>

          <ol className="space-y-3 sm:hidden">
            {TRACKER_STAGES.map((stage, i) => {
              const Icon = STAGE_ICONS[stage.key as keyof typeof STAGE_ICONS] ?? ClipboardCheck;
              const done = i < safeIndex;
              const current = i === safeIndex;
              return (
                <li key={stage.key} className="flex items-center gap-3">
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 ${
                      done
                        ? 'border-brand bg-brand text-brand-fg'
                        : current
                        ? 'border-brand bg-brand-soft text-brand-soft-fg'
                        : 'border-line bg-surface text-fg-subtle'
                    }`}
                  >
                    {done ? <Check size={14} strokeWidth={3} /> : <Icon size={14} />}
                  </span>
                  <span
                    className={`text-sm ${current ? 'font-semibold text-fg' : done ? 'text-fg-muted' : 'text-fg-subtle'}`}
                  >
                    {locale === 'ar' ? stage.labelAr : stage.labelEn}
                  </span>
                </li>
              );
            })}
          </ol>
        </>
      )}

      {status === 'Closed' && (
        <p className="mt-5 rounded-2xl border border-line bg-surface-2 px-4 py-3 text-sm text-fg-muted">
          {tx('This order lifecycle has been finalized and closed.')}
        </p>
      )}

      <p className="sr-only">{t('admin.orderStatus')}</p>
    </motion.div>
  );
}
