'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Download, FileText, Plus, Search } from 'lucide-react';
import {
  Button, Card, DataTable, EmptyState, ErrorNote, Field, Modal, PageHeader, PageSkeleton,
  Select, Spinner, Td, TextInput, Th,
} from '@/components/admin/ui';
import RequirePermission from '@/components/admin/RequirePermission';
import { InvoiceBadge, useMoney } from '@/components/admin/accounting/shared';
import { usePermission } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useApi } from '@/lib/useApi';
import { downloadFile } from '@/lib/download';
import { balanceOf, INVOICE_STATUS_META } from '@/lib/invoiceStatus';

/* eslint-disable @typescript-eslint/no-explicit-any */

const STATUS_FILTERS = ['all', 'open', 'overdue', 'draft', 'sent', 'partial', 'paid', 'cancelled'] as const;

function NewInvoice({ open, orderId, onClose }: { open: boolean; orderId?: string | null; onClose: () => void }) {
  const { tx } = useLanguage();
  const { money } = useMoney();
  const router = useRouter();
  const { data } = useApi<any>(open ? '/api/orders?limit=200' : null);
  const orders = useMemo(() => (data?.orders || []).filter((o: any) => (o.totals?.total || 0) > 0), [data]);
  const [picked, setPicked] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [issue, setIssue] = useState('sent');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const selected = picked || orderId || '';
  const order = orders.find((o: any) => o._id === selected);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const r = await fetch('/api/accounting/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: selected, dueDate: dueDate || undefined, status: issue }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'Could not create the invoice');
      router.push(`/admin/accounting/invoices/${j._id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title={tx('New Invoice')}
      subtitle={tx('An invoice is raised from an order, at the price on the order.')}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>{tx('Cancel')}</Button>
          <Button onClick={save} loading={saving} disabled={!selected}>{tx('Save')}</Button>
        </>
      }
    >
      <div className="space-y-4">
        {error && <ErrorNote>{tx(error)}</ErrorNote>}
        <Field label={tx('Order')} required>
          <Select value={selected} onChange={(e) => setPicked(e.target.value)}>
            <option value="">{tx('Select an order…')}</option>
            {orders.map((o: any) => (
              <option key={o._id} value={o._id}>
                {o.orderNumber} — {o.customerInfo?.companyName || o.userId?.name || ''} — {money(o.totals?.total)}
              </option>
            ))}
          </Select>
        </Field>
        {order && (
          <div className="grid grid-cols-3 gap-2 rounded-lg bg-surface-2 p-3 text-xs text-fg-muted">
            <div>{tx('Before VAT')}<p className="font-semibold text-fg">{money((order.totals?.subtotal || 0) - (order.totals?.discount || 0))}</p></div>
            <div>{tx('VAT')}<p className="font-semibold text-fg">{money(order.totals?.tax)}</p></div>
            <div>{tx('Total')}<p className="font-semibold text-fg">{money(order.totals?.total)}</p></div>
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={tx('Due Date')} hint={tx('14 days from today if left empty')}>
            <TextInput type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </Field>
          <Field label={tx('Status')}>
            <Select value={issue} onChange={(e) => setIssue(e.target.value)}>
              <option value="sent">{tx('Issue now')}</option>
              <option value="draft">{tx('Keep as draft')}</option>
            </Select>
          </Field>
        </div>
      </div>
    </Modal>
  );
}

function Invoices() {
  const { tx, locale } = useLanguage();
  const { money, date } = useMoney();
  const { can } = usePermission();
  const params = useSearchParams();
  const [status, setStatus] = useState(params.get('status') || 'all');
  const [q, setQ] = useState('');
  const [creating, setCreating] = useState(!!params.get('new'));
  const [url, setUrl] = useState(`/api/accounting/invoices?status=${status}`);

  useEffect(() => {
    const t = setTimeout(() => setUrl(`/api/accounting/invoices?status=${status}${q.trim() ? `&q=${encodeURIComponent(q.trim())}` : ''}`), q ? 250 : 0);
    return () => clearTimeout(t);
  }, [status, q]);

  const { data, ready, error } = useApi<any[]>(url);
  const rows = data ?? [];
  const label = (s: string) =>
    s === 'all' ? tx('All') : s === 'open' ? tx('Unpaid') : INVOICE_STATUS_META[s as keyof typeof INVOICE_STATUS_META]?.[locale] ?? s;

  if (!ready) return <PageSkeleton rows={10} />;

  return (
    <div>
      <PageHeader
        title={tx('Invoices')}
        subtitle={tx('Every invoice, what has been paid against it, and what is left.')}
        backHref="/admin/accounting"
        backLabel={tx('Accounting')}
        actions={
          <>
            <Button variant="outline" icon={Download} onClick={() => downloadFile(`/api/accounting/export?what=invoices&status=${status}`)}>{tx('Export to Excel')}</Button>
            {can('accounting.manage') && <Button icon={Plus} onClick={() => setCreating(true)}>{tx('New Invoice')}</Button>}
          </>
        }
      />
      {error && <div className="mb-4"><ErrorNote>{error}</ErrorNote></div>}

      <Card className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-48 flex-1 sm:max-w-xs">
          <Search size={13} className="absolute start-3 top-1/2 -translate-y-1/2 text-fg-subtle" />
          <TextInput value={q} onChange={(e) => setQ(e.target.value)} placeholder={tx('Invoice #')} className="ps-10 text-sm" />
        </div>
        {STATUS_FILTERS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatus(s)}
            className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${
              status === s ? 'border-brand bg-brand-soft text-brand-soft-fg' : 'border-line text-fg-muted hover:text-fg'
            }`}
          >
            {label(s)}
          </button>
        ))}
      </Card>

      {rows.length === 0 ? (
        <EmptyState icon={FileText} title={tx('No invoices found')} hint={tx('An invoice appears when an order reaches Awaiting Payment, or raise one from an order here.')} />
      ) : (
        <DataTable>
          <thead>
            <tr>
              <Th>{tx('Invoice #')}</Th><Th>{tx('Order')}</Th><Th>{tx('Customer')}</Th><Th>{tx('Due Date')}</Th>
              <Th>{tx('Status')}</Th><Th align="end">{tx('Total')}</Th><Th align="end">{tx('Balance')}</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((inv) => (
              <tr key={inv._id} className="border-t border-line hover:bg-surface-2/60">
                <Td><Link href={`/admin/accounting/invoices/${inv._id}`} className="font-semibold text-fg hover:underline">{inv.invoiceNumber}</Link></Td>
                <Td>{inv.orderId ? <Link href={`/admin/orders/${inv.orderId._id}`} className="text-fg-muted hover:underline">{inv.orderId.orderNumber}</Link> : '—'}</Td>
                <Td>{inv.userId ? <Link href={`/admin/customers/${inv.userId._id}`} className="text-fg-muted hover:underline">{inv.userId.company || inv.userId.name}</Link> : '—'}</Td>
                <Td className="text-fg-muted">{date(inv.dueDate)}</Td>
                <Td><InvoiceBadge invoice={inv} /></Td>
                <Td align="end">{money(inv.total)}</Td>
                <Td align="end" className="font-semibold">{money(inv.status === 'cancelled' ? 0 : balanceOf(inv))}</Td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      )}

      <NewInvoice open={creating} orderId={params.get('new')} onClose={() => setCreating(false)} />
    </div>
  );
}

export default function InvoicesPage() {
  return (
    <RequirePermission permission="accounting.view">
      <Suspense fallback={<Spinner />}><Invoices /></Suspense>
    </RequirePermission>
  );
}
