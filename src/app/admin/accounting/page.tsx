'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowDownCircle, ArrowUpCircle, Clock, Download, FileWarning, Landmark, Receipt, Scale, TrendingUp } from 'lucide-react';
import {
  AutoGrid, Badge, Card, ErrorNote, PageHeader, PageSkeleton, SectionTitle,
} from '@/components/admin/ui';
import RequirePermission from '@/components/admin/RequirePermission';
import { MonthlyChart, PeriodPicker, Stat, thisMonth, useMoney } from '@/components/admin/accounting/shared';
import { useLanguage } from '@/contexts/LanguageContext';
import { useApi } from '@/lib/useApi';
import { statusLabel } from '@/lib/orderWorkflow';

/* eslint-disable @typescript-eslint/no-explicit-any */

/** The accounts at a glance, and what needs doing about them. */
function Overview() {
  const { tx, locale } = useLanguage();
  const { money, date } = useMoney();
  const [period, setPeriod] = useState(thisMonth);
  const { data: d, ready, error } = useApi<any>(`/api/accounting/summary?from=${period.from}&to=${period.to}`);

  if (!ready) return <PageSkeleton tiles={6} rows={6} />;
  if (error && !d) return <ErrorNote>{error}</ErrorNote>;

  const overdue = (d.receivables.total as number) - (d.receivables.buckets.current as number);

  return (
    <div className="space-y-5">
      <PageHeader title={tx('Accounting')} subtitle={tx('Sales, money received, costs and what is still owed.')}>
        <PeriodPicker from={period.from} to={period.to} onChange={(from, to) => setPeriod({ from, to })} />
      </PageHeader>

      <AutoGrid min="16rem">
        <Stat icon={TrendingUp} tone="text-ok-soft-fg" label={tx('Sales before VAT')} value={money(d.sales.net)} note={`${d.sales.invoices} ${tx('invoices')}`} />
        <Stat icon={ArrowDownCircle} tone="text-ok-soft-fg" label={tx('Money received')} value={money(d.collected.total)} note={`${d.collected.payments} ${tx('payments')}`} />
        <Stat icon={ArrowUpCircle} tone="text-warn-soft-fg" label={tx('Expenses before VAT')} value={money(d.expenses.net)} note={`${d.expenses.count} ${tx('expenses')}`} />
        <Stat icon={Scale} label={tx('Profit earned')} value={money(d.profit.earned)} note={tx('Sales less expenses, before VAT')} />
        <Stat icon={Clock} tone="text-warn-soft-fg" label={tx('Still owed to us')} value={money(d.receivables.total)} note={overdue > 0 ? `${money(overdue)} ${tx('overdue')}` : tx('Nothing overdue')} />
        <Stat icon={Landmark} label={tx('VAT due')} value={money(d.vat.due)} note={tx('Charged less paid')} />
      </AutoGrid>

      <Card>
        <SectionTitle title={tx('Sales and expenses by month')} />
        <MonthlyChart months={d.months} />
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <SectionTitle title={tx('Overdue invoices')} />
          {d.receivables.overdue.length === 0 ? (
            <p className="text-sm text-fg-muted">{tx('Nothing overdue')}</p>
          ) : (
            <ul className="divide-y divide-line">
              {d.receivables.overdue.map((i: any) => (
                <li key={i._id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <div className="min-w-0">
                    <Link href={`/admin/accounting/invoices/${i._id}`} className="font-medium text-fg hover:underline">{i.invoiceNumber}</Link>
                    <p className="truncate text-xs text-fg-muted">{[i.customer, `${tx('Due')} ${date(i.dueDate)}`].filter(Boolean).join(' · ')}</p>
                  </div>
                  <span className="shrink-0 font-semibold text-fg">{money(i.balance)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <SectionTitle title={tx('Priced orders with no invoice')} />
          {d.unbilled.length === 0 ? (
            <p className="text-sm text-fg-muted">{tx('Every priced order has an invoice.')}</p>
          ) : (
            <ul className="divide-y divide-line">
              {d.unbilled.slice(0, 8).map((o: any) => (
                <li key={o._id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <div className="min-w-0">
                    <Link href={`/admin/orders/${o._id}`} className="font-medium text-fg hover:underline">{o.orderNumber}</Link>
                    <p className="truncate text-xs text-fg-muted">{o.customerInfo?.companyName || o.customerInfo?.personName} · {statusLabel(o.status, locale)}</p>
                  </div>
                  <Link href={`/admin/accounting/invoices?new=${o._id}`} className="shrink-0 text-xs font-semibold text-brand hover:underline">
                    {money(o.totals?.total)} · {tx('Invoice it')}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card>
        <SectionTitle title={tx('Latest payments')} />
        {d.recent.length === 0 ? (
          <p className="text-sm text-fg-muted">{tx('No payments found')}</p>
        ) : (
          <ul className="divide-y divide-line">
            {d.recent.map((p: any) => (
              <li key={p._id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span className="min-w-0 truncate text-fg-muted">
                  {p.userId?.name} ·{' '}
                  {p.invoiceId && <Link href={`/admin/accounting/invoices/${p.invoiceId._id}`} className="hover:underline">{p.invoiceId.invoiceNumber}</Link>} · {date(p.paidAt)}
                </span>
                <Badge tone="ok">{money(p.amount)}</Badge>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

export default function AccountingOverviewPage() {
  return <RequirePermission permission="accounting.view"><Overview /></RequirePermission>;
}
