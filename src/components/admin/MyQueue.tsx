'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, CheckCircle2, Inbox } from 'lucide-react';
import { Badge, Card, SectionTitle } from '@/components/admin/ui';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { ROLE_QUEUE, statusBadgeClass, statusLabel } from '@/lib/orderWorkflow';
import type { Role } from '@/lib/roles';

interface Row {
  _id: string;
  orderNumber: string;
  status: string;
  type: string;
  createdAt: string;
  customerInfo?: { companyName?: string; personName?: string };
}

/**
 * "What is waiting on me right now."
 *
 * Each operational role has a set of statuses where the ball is in their court
 * (see ROLE_QUEUE). This surfaces exactly those orders at the top of the
 * dashboard so an account manager, factory lead or dispatcher opens the panel
 * and immediately sees their own work rather than a company-wide summary.
 */
export default function MyQueue() {
  const { user } = useAuth();
  const { t, locale } = useLanguage();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const queue = user ? ROLE_QUEUE[user.role as Role] : undefined;

  const load = useCallback(async () => {
    if (!queue || queue.length === 0) {
      setLoading(false);
      return;
    }
    try {
      const res = await fetch('/api/orders?limit=200', { cache: 'no-store' });
      const data = await res.json();
      const all: Row[] = Array.isArray(data.orders) ? data.orders : [];
      setRows(all.filter((o) => (queue as string[]).includes(o.status)));
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [queue]);

  useEffect(() => {
    load();
  }, [load]);

  if (!queue || queue.length === 0) return null;

  return (
    <Card>
      <SectionTitle
        title={t('admin.myQueue')}
        hint={t('admin.needsYourAction')}
        actions={<Badge tone={rows.length ? 'warn' : 'ok'}>{rows.length}</Badge>}
      />

      {loading ? (
        <p className="text-xs text-fg-muted">{t('admin.loading')}</p>
      ) : rows.length === 0 ? (
        <p className="flex items-center gap-2 text-sm text-fg-muted">
          <CheckCircle2 size={15} className="text-ok" />
          {t('admin.myQueueEmpty')}
        </p>
      ) : (
        <ul
          className="grid gap-2"
          style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(20rem, 100%), 1fr))' }}
        >
          {rows.slice(0, 12).map((o) => (
            <li key={o._id}>
              <Link
                href={`/admin/orders/${o._id}`}
                className="group flex items-center justify-between gap-3 rounded-xl border border-line bg-surface-2 px-3.5 py-2.5 transition-colors hover:border-brand"
              >
                <span className="min-w-0">
                  <span className="block truncate font-mono text-sm font-semibold text-fg">
                    {o.orderNumber}
                  </span>
                  <span className="block truncate text-xs text-fg-muted">
                    {o.customerInfo?.companyName || o.customerInfo?.personName || '—'}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  <span className={`badge ${statusBadgeClass(o.status)}`}>
                    {statusLabel(o.status, locale)}
                  </span>
                  <ArrowRight
                    size={14}
                    className="rtl-flip text-fg-subtle transition-transform group-hover:translate-x-0.5"
                  />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {rows.length > 12 && (
        <Link
          href="/admin/orders"
          className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-brand hover:underline"
        >
          <Inbox size={12} />
          {t('admin.viewAllOrders')}
        </Link>
      )}
    </Card>
  );
}
