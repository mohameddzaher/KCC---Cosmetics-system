'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, ExternalLink, Inbox, RefreshCw } from 'lucide-react';
import {
  AutoGrid, Badge, Button, Card, EmptyState, ErrorNote, PageHeader, Spinner,
} from '@/components/admin/ui';
import OrderWorkflow, { type TimelineEvent } from '@/components/admin/OrderWorkflow';
import { useLanguage } from '@/contexts/LanguageContext';
import { ORDER_STATUSES, statusBadgeClass, statusLabel, type OrderStatus } from '@/lib/orderWorkflow';

interface OrderRow {
  _id: string;
  orderNumber: string;
  type: 'sample' | 'bulk';
  status: string;
  priority?: string;
  dueDate?: string;
  createdAt: string;
  customerInfo?: { companyName?: string; personName?: string; email?: string };
  surveyData?: { category?: { mainName?: string; subName?: string; itemName?: string } };
  assignments?: { courierName?: string; trackingNumber?: string };
  timeline?: TimelineEvent[];
}

/**
 * The work board shared by the Production Floor and the Dispatch desk.
 *
 * Orders are grouped into the columns that matter to that team, and each card
 * carries the workflow buttons the signed-in role is actually allowed to press.
 * Nothing outside the role's queue is fetched — the server scopes the list too.
 */
export default function OperationsQueue({
  title,
  subtitle,
  columns,
  emptyLabel,
  nextStop,
}: {
  title: string;
  subtitle: string;
  columns: Array<{ key: string; label: string; statuses: OrderStatus[] }>;
  emptyLabel: string;
  /** The board an order lands on once it leaves this one. */
  nextStop?: { label: string; href: string };
}) {
  const { t, locale } = useLanguage();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch('/api/orders?limit=200', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load');
      setOrders(Array.isArray(data.orders) ? data.orders : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const grouped = useMemo(
    () =>
      columns.map((col) => ({
        ...col,
        items: orders.filter((o) => (col.statuses as string[]).includes(o.status)),
      })),
    [columns, orders]
  );

  const total = grouped.reduce((n, g) => n + g.items.length, 0);

  /**
   * Where the orders this board is NOT showing have gone.
   *
   * A work board only holds an order while it is that team's problem, so it
   * empties out as soon as the job moves on — and "nothing released to
   * production yet" then reads as a bug to whoever just released one. This
   * counts the orders sitting before and after this board so the empty state
   * can say what actually happened.
   */
  const elsewhere = useMemo(() => {
    const parked = ['Rejected', 'On Hold', 'Cancelled'];
    const rank = (s: string) => ORDER_STATUSES.indexOf(s as OrderStatus);
    const mine = columns.flatMap((c) => c.statuses).map(rank).filter((i) => i >= 0);
    if (mine.length === 0) return { before: 0, after: 0, held: 0 };
    const first = Math.min(...mine);
    const last = Math.max(...mine);

    let before = 0;
    let after = 0;
    let held = 0;
    for (const o of orders) {
      const i = rank(o.status);
      if (i < 0) continue;
      if (parked.includes(o.status)) held++;
      else if (i < first) before++;
      else if (i > last) after++;
    }
    return { before, after, held };
  }, [orders, columns]);

  /** Why is this board empty? Answer in one sentence, with somewhere to go. */
  const emptyHint =
    elsewhere.after > 0
      ? t('admin.queueMovedOn', { count: elsewhere.after })
      : elsewhere.before > 0
      ? t('admin.queueUpstream', { count: elsewhere.before })
      : elsewhere.held > 0
      ? t('admin.queueHeld', { count: elsewhere.held })
      : t('admin.queueNothingYet');

  return (
    <div>
      <PageHeader
        title={title}
        subtitle={subtitle}
        actions={
          <Button variant="outline" size="sm" icon={RefreshCw} onClick={load}>
            {t('ui.refresh')}
          </Button>
        }
      />

      {error && (
        <div className="mb-4">
          <ErrorNote>{error}</ErrorNote>
        </div>
      )}

      {loading ? (
        <Spinner />
      ) : total === 0 ? (
        <EmptyState
          icon={Inbox}
          title={emptyLabel}
          hint={emptyHint}
          action={
            elsewhere.after > 0 && nextStop ? (
              <Link href={nextStop.href} className="btn btn-outline btn-sm">
                {nextStop.label}
                <ArrowRight size={14} className="rtl-flip" />
              </Link>
            ) : undefined
          }
        />
      ) : (
        <div
          className="grid items-start gap-4"
          style={{ gridTemplateColumns: `repeat(auto-fit, minmax(min(22rem, 100%), 1fr))` }}
        >
          {grouped.map((col) => (
            <section key={col.key} className="min-w-0">
              <div className="mb-2.5 flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-fg">{col.label}</h2>
                <Badge tone="neutral">{col.items.length}</Badge>
              </div>

              <div className="space-y-3">
                {col.items.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-line px-4 py-6 text-center text-xs text-fg-muted">
                    {t('admin.noData')}
                  </p>
                ) : (
                  col.items.map((o) => (
                    <Card key={o._id} className="min-w-0">
                      <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <Link
                            href={`/admin/orders/${o._id}`}
                            className="inline-flex items-center gap-1.5 font-mono text-sm font-semibold text-fg hover:text-brand"
                          >
                            {o.orderNumber}
                            <ExternalLink size={12} />
                          </Link>
                          <p className="mt-0.5 truncate text-xs text-fg-muted">
                            {o.customerInfo?.companyName || o.customerInfo?.personName || '—'}
                          </p>
                        </div>
                        <span className={`badge ${statusBadgeClass(o.status)}`}>
                          {statusLabel(o.status, locale)}
                        </span>
                      </div>

                      {o.surveyData?.category?.itemName && (
                        <p className="mb-2 truncate text-xs text-fg-muted">
                          {[o.surveyData.category.mainName, o.surveyData.category.subName, o.surveyData.category.itemName]
                            .filter(Boolean)
                            .join(' → ')}
                        </p>
                      )}

                      <div className="mb-3 flex flex-wrap gap-1.5">
                        <Badge tone={o.type === 'sample' ? 'accent' : 'info'}>
                          {o.type === 'sample' ? t('admin.sample') : t('admin.bulk')}
                        </Badge>
                        {o.priority && o.priority !== 'normal' && (
                          <Badge tone={o.priority === 'urgent' ? 'danger' : 'warn'}>
                            {t(`admin.priority${o.priority.charAt(0).toUpperCase()}${o.priority.slice(1)}`)}
                          </Badge>
                        )}
                        {o.assignments?.courierName && (
                          <Badge tone="neutral">{o.assignments.courierName}</Badge>
                        )}
                        <span className="self-center text-[11px] text-fg-subtle">
                          {new Date(o.createdAt).toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-GB')}
                        </span>
                      </div>

                      <OrderWorkflow
                        compact
                        orderId={o._id}
                        status={o.status}
                        onChanged={() => load()}
                      />
                    </Card>
                  ))
                )}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

/** Small helper so both queue pages can show headline counts identically. */
export function QueueStats({ items }: { items: Array<{ label: string; value: number }> }) {
  return (
    <AutoGrid min="12rem">
      {items.map((s) => (
        <Card key={s.label}>
          <p className="text-xs font-medium text-fg-muted">{s.label}</p>
          <p className="mt-1 text-2xl font-bold text-fg">{s.value}</p>
        </Card>
      ))}
    </AutoGrid>
  );
}
