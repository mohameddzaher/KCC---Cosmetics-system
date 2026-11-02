'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { CreditCard, Download, Plus } from 'lucide-react';
import {
  AutoGrid, Button, Card, DataTable, EmptyState, ErrorNote, Field, Modal, PageHeader, PageSkeleton, Select, Td, Th,
} from '@/components/admin/ui';
import RequirePermission from '@/components/admin/RequirePermission';
import { PaymentBadge, PaymentModal, PeriodPicker, Stat, thisMonth, useMoney } from '@/components/admin/accounting/shared';
import { usePermission } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useApi } from '@/lib/useApi';
import { downloadFile } from '@/lib/download';
import { balanceOf, PAYMENT_METHODS, PAYMENT_STATUS_META } from '@/lib/invoiceStatus';

/* eslint-disable @typescript-eslint/no-explicit-any */

function Payments() {
  const { tx, locale } = useLanguage();
  const { money, date } = useMoney();
  const { can } = usePermission();
  const [period, setPeriod] = useState(thisMonth);
  const [status, setStatus] = useState('all');
  const [method, setMethod] = useState('all');
  const [choosing, setChoosing] = useState(false);
  const [invoice, setInvoice] = useState<any>(null);

  const url = `/api/accounting/payments?from=${period.from}&to=${period.to}&status=${status}&method=${method}`;
  const { data, ready, error, reload } = useApi<any[]>(url);
  const open = useApi<any[]>(choosing ? '/api/accounting/invoices?status=open' : null);
  const rows = useMemo(() => data ?? [], [data]);
  const received = rows.filter((p) => p.status === 'completed').reduce((n, p) => n + p.amount, 0);
  const pending = rows.filter((p) => p.status === 'pending').reduce((n, p) => n + p.amount, 0);

  if (!ready) return <PageSkeleton tiles={2} rows={10} />;

  return (
    <div>
      <PageHeader
        title={tx('Payments')}
        subtitle={tx('Money received against invoices. Each one updates its invoice and its order.')}
        backHref="/admin/accounting"
        backLabel={tx('Accounting')}
        actions={
          <>
            <Button variant="outline" icon={Download} onClick={() => downloadFile(`/api/accounting/export?what=payments&from=${period.from}&to=${period.to}`)}>{tx('Export to Excel')}</Button>
            {can('accounting.manage') && <Button icon={Plus} onClick={() => setChoosing(true)}>{tx('Record Payment')}</Button>}
          </>
        }
      />
      {error && <div className="mb-4"><ErrorNote>{error}</ErrorNote></div>}

      <AutoGrid min="16rem" className="mb-4">
        <Stat icon={CreditCard} tone="text-ok-soft-fg" label={tx('Money received')} value={money(received)} />
        <Stat icon={CreditCard} tone="text-warn-soft-fg" label={tx('Pending')} value={money(pending)} />
      </AutoGrid>

      <Card className="mb-4 flex flex-wrap items-end gap-3">
        <PeriodPicker from={period.from} to={period.to} onChange={(from, to) => setPeriod({ from, to })} />
        <Select aria-label={tx('Status')} value={status} onChange={(e) => setStatus(e.target.value)} className="!w-auto">
          <option value="all">{tx('All statuses')}</option>
          {Object.entries(PAYMENT_STATUS_META).map(([k, m]) => <option key={k} value={k}>{m[locale]}</option>)}
        </Select>
        <Select aria-label={tx('Method')} value={method} onChange={(e) => setMethod(e.target.value)} className="!w-auto">
          <option value="all">{tx('All methods')}</option>
          {Object.entries(PAYMENT_METHODS).map(([k, m]) => <option key={k} value={k}>{m[locale]}</option>)}
        </Select>
      </Card>

      {rows.length === 0 ? (
        <EmptyState icon={CreditCard} title={tx('No payments found')} />
      ) : (
        <DataTable>
          <thead>
            <tr><Th>{tx('Date')}</Th><Th>{tx('Invoice')}</Th><Th>{tx('Customer')}</Th><Th>{tx('Method')}</Th><Th>{tx('Reference')}</Th><Th>{tx('Status')}</Th><Th align="end">{tx('Amount')}</Th></tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p._id} className="border-t border-line hover:bg-surface-2/60">
                <Td className="text-fg-muted">{date(p.paidAt || p.createdAt)}</Td>
                <Td>{p.invoiceId ? <Link href={`/admin/accounting/invoices/${p.invoiceId._id}`} className="font-semibold text-fg hover:underline">{p.invoiceId.invoiceNumber}</Link> : '—'}</Td>
                <Td>{p.userId ? <Link href={`/admin/customers/${p.userId._id}`} className="text-fg-muted hover:underline">{p.userId.company || p.userId.name}</Link> : '—'}</Td>
                <Td className="text-fg-muted">{PAYMENT_METHODS[p.method]?.[locale] ?? p.method}</Td>
                <Td className="text-fg-muted">{p.reference || '—'}</Td>
                <Td><PaymentBadge status={p.status} /></Td>
                <Td align="end" className="font-semibold">{money(p.amount)}</Td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      )}

      <Modal open={choosing} onClose={() => setChoosing(false)} size="md" title={tx('Record Payment')} subtitle={tx('Choose the invoice this money is for.')}>
        <Field label={tx('Invoice')}>
          <Select value="" onChange={(e) => { setInvoice(open.data?.find((i) => i._id === e.target.value)); setChoosing(false); }}>
            <option value="">{tx('Select an invoice…')}</option>
            {open.data?.map((i) => (
              <option key={i._id} value={i._id}>{i.invoiceNumber} — {i.userId?.company || i.userId?.name} — {money(balanceOf(i))}</option>
            ))}
          </Select>
        </Field>
      </Modal>
      <PaymentModal invoice={invoice} onClose={() => setInvoice(null)} onSaved={reload} />
    </div>
  );
}

export default function PaymentsPage() {
  return <RequirePermission permission="accounting.view"><Payments /></RequirePermission>;
}
