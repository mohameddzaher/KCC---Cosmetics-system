'use client';

import Link from 'next/link';
import { Clock, Download, Wallet } from 'lucide-react';
import {
  AutoGrid, Badge, Button, DataTable, EmptyState, ErrorNote, PageHeader, PageSkeleton, SectionTitle, Td, Th,
} from '@/components/admin/ui';
import RequirePermission from '@/components/admin/RequirePermission';
import { Stat, useMoney } from '@/components/admin/accounting/shared';
import { useLanguage } from '@/contexts/LanguageContext';
import { useApi } from '@/lib/useApi';
import { downloadFile } from '@/lib/download';
import { AGING_BUCKETS, type AgingBucket } from '@/lib/invoiceStatus';

/* eslint-disable @typescript-eslint/no-explicit-any */

function Receivables() {
  const { tx } = useLanguage();
  const { money, date } = useMoney();
  const { data: d, ready, error } = useApi<any>('/api/accounting/receivables');

  const labels: Record<AgingBucket, string> = {
    current: tx('Not yet due'), d1_30: tx('1-30 days late'), d31_60: tx('31-60 days late'),
    d61_90: tx('61-90 days late'), d90plus: tx('Over 90 days late'),
  };

  if (!ready) return <PageSkeleton tiles={5} rows={8} />;
  if (error && !d) return <ErrorNote>{error}</ErrorNote>;

  return (
    <div className="space-y-5">
      <PageHeader
        title={tx('Receivables')}
        subtitle={tx('Who owes the company money, and for how long.')}
        backHref="/admin/accounting"
        backLabel={tx('Accounting')}
        actions={<Button variant="outline" icon={Download} onClick={() => downloadFile('/api/accounting/export?what=receivables')}>{tx('Export to Excel')}</Button>}
      />

      <AutoGrid min="14rem">
        <Stat icon={Wallet} label={tx('Still owed to us')} value={money(d.total)} />
        {AGING_BUCKETS.map((b) => (
          <Stat key={b} icon={Clock} tone={b === 'current' ? 'text-fg-muted' : 'text-warn-soft-fg'} label={labels[b]} value={money(d.buckets[b])} />
        ))}
      </AutoGrid>

      {d.customers.length === 0 ? (
        <EmptyState icon={Wallet} title={tx('Nobody owes anything')} />
      ) : (
        <>
          <div>
            <SectionTitle title={tx('By customer')} />
            <DataTable>
              <thead>
                <tr>
                  <Th>{tx('Customer')}</Th><Th align="end">{tx('Invoices')}</Th>
                  {AGING_BUCKETS.map((b) => <Th key={b} align="end">{labels[b]}</Th>)}
                  <Th align="end">{tx('Balance')}</Th>
                </tr>
              </thead>
              <tbody>
                {d.customers.map((c: any) => (
                  <tr key={c.id} className="border-t border-line hover:bg-surface-2/60">
                    <Td>
                      <Link href={`/admin/customers/${c.id}`} className="font-semibold text-fg hover:underline">{c.company || c.name}</Link>
                      {c.phone && <a href={`tel:${c.phone}`} dir="ltr" className="block text-[11px] text-fg-subtle hover:underline">{c.phone}</a>}
                    </Td>
                    <Td align="end">{c.invoices}</Td>
                    {AGING_BUCKETS.map((b) => <Td key={b} align="end" className="text-fg-muted">{c.buckets[b] ? money(c.buckets[b]) : '—'}</Td>)}
                    <Td align="end" className="font-semibold">{money(c.balance)}</Td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
          </div>

          <div>
            <SectionTitle title={tx('Open invoices')} />
            <DataTable>
              <thead><tr><Th>{tx('Invoice #')}</Th><Th>{tx('Order')}</Th><Th>{tx('Customer')}</Th><Th>{tx('Due Date')}</Th><Th>{tx('Age')}</Th><Th align="end">{tx('Balance')}</Th></tr></thead>
              <tbody>
                {d.invoices.map((i: any) => (
                  <tr key={i._id} className="border-t border-line hover:bg-surface-2/60">
                    <Td><Link href={`/admin/accounting/invoices/${i._id}`} className="font-semibold text-fg hover:underline">{i.invoiceNumber}</Link></Td>
                    <Td>{i.orderId ? <Link href={`/admin/orders/${i.orderId}`} className="text-fg-muted hover:underline">{i.orderNumber}</Link> : '—'}</Td>
                    <Td className="text-fg-muted">{i.customer}</Td>
                    <Td className="text-fg-muted">{date(i.dueDate)}</Td>
                    <Td><Badge tone={i.bucket === 'current' ? 'neutral' : 'warn'}>{labels[i.bucket as AgingBucket]}</Badge></Td>
                    <Td align="end" className="font-semibold">{money(i.balance)}</Td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
          </div>
        </>
      )}
    </div>
  );
}

export default function ReceivablesPage() {
  return <RequirePermission permission="accounting.view"><Receivables /></RequirePermission>;
}
