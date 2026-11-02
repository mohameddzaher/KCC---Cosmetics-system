'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Ban, CreditCard, Printer, Send, Trash2 } from 'lucide-react';
import {
  Badge, Button, Card, DataTable, ErrorNote, PageHeader, PageSkeleton, SectionTitle, Td, Th,
} from '@/components/admin/ui';
import RequirePermission from '@/components/admin/RequirePermission';
import { AuditTrail } from '@/components/admin/audit';
import { InvoiceBadge, PaymentBadge, PaymentModal, useMoney } from '@/components/admin/accounting/shared';
import { usePermission } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useApi } from '@/lib/useApi';
import { balanceOf, PAYMENT_METHODS } from '@/lib/invoiceStatus';
import { statusLabel } from '@/lib/orderWorkflow';

/* eslint-disable @typescript-eslint/no-explicit-any */

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between gap-6 py-1 text-sm ${strong ? 'border-t border-line pt-2 font-bold text-fg' : 'text-fg-muted'}`}>
      <span>{label}</span><span>{value}</span>
    </div>
  );
}

function InvoiceDetail() {
  const { id } = useParams<{ id: string }>();
  const { tx, locale, pick } = useLanguage();
  const { money, date } = useMoney();
  const { can } = usePermission();
  const router = useRouter();
  const manage = can('accounting.manage');
  const { data, ready, error, reload } = useApi<any>(`/api/accounting/invoices/${id}`);
  const [paying, setPaying] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  if (!ready) return <PageSkeleton rows={8} />;
  if (!data) return <ErrorNote>{error}</ErrorNote>;

  const { invoice: inv, payments, seller } = data;
  const owed = balanceOf(inv);
  const order = inv.orderId;
  const customer = inv.userId;
  const open = inv.status === 'sent' || inv.status === 'partial';

  async function act(body: Record<string, unknown>) {
    setActionError(null);
    const r = await fetch(`/api/accounting/invoices/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    if (!r.ok) setActionError((await r.json()).error);
    await reload();
  }

  async function remove() {
    if (!confirm(tx('Delete this draft?'))) return;
    const r = await fetch(`/api/accounting/invoices/${id}`, { method: 'DELETE' });
    if (r.ok) router.push('/admin/accounting/invoices');
    else setActionError((await r.json()).error);
  }

  async function refund(paymentId: string) {
    if (!confirm(tx('Mark this payment as refunded? The invoice balance goes back up.'))) return;
    await fetch(`/api/accounting/payments/${paymentId}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'refunded' }),
    });
    await reload();
  }

  return (
    <div className="space-y-4">
      <div className="print:hidden">
        <PageHeader
          title={inv.invoiceNumber}
          backHref="/admin/accounting/invoices"
          backLabel={tx('Invoices')}
          actions={
            <>
              <Button variant="outline" icon={Printer} onClick={() => window.print()}>{tx('Print / PDF')}</Button>
              {manage && inv.status === 'draft' && <Button variant="outline" icon={Trash2} onClick={remove}>{tx('Delete')}</Button>}
              {manage && inv.status === 'draft' && <Button icon={Send} onClick={() => act({ status: 'sent' })}>{tx('Issue invoice')}</Button>}
              {manage && open && !(inv.amountPaid > 0) && <Button variant="outline" icon={Ban} onClick={() => confirm(tx('Cancel this invoice?')) && act({ status: 'cancelled' })}>{tx('Cancel invoice')}</Button>}
              {manage && open && owed > 0 && <Button icon={CreditCard} onClick={() => setPaying(true)}>{tx('Record Payment')}</Button>}
            </>
          }
        />
        {(actionError) && <div className="mb-3"><ErrorNote>{tx(actionError)}</ErrorNote></div>}
        {inv.status === 'paid' && order?.status === 'Awaiting Payment' && (
          <div className="mb-3 rounded-xl border border-line bg-brand-soft px-4 py-2.5 text-sm text-brand-soft-fg">
            {tx('This invoice is paid in full.')}{' '}
            <Link href={`/admin/orders/${order._id}`} className="font-semibold underline">{tx('Confirm payment on the order')}</Link>
          </div>
        )}
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]">
        {/* The document itself: this is what prints. */}
        <Card className="print:border-0 print:p-0">
          <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-lg font-bold text-fg">{pick(seller?.companyName?.en, seller?.companyName?.ar) || 'KCC'}</p>
              {pick(seller?.contactAddress?.en, seller?.contactAddress?.ar) && <p className="text-xs text-fg-muted">{pick(seller.contactAddress.en, seller.contactAddress.ar)}</p>}
              {seller?.vatNumber && <p className="text-xs text-fg-muted">{tx('VAT no.')} {seller.vatNumber}</p>}
              {seller?.crNumber && <p className="text-xs text-fg-muted">{tx('CR no.')} {seller.crNumber}</p>}
            </div>
            <div className="text-end">
              <p className="text-lg font-bold text-fg">{tx('Tax invoice')}</p>
              <p className="text-sm text-fg-muted">{inv.invoiceNumber}</p>
              <div className="mt-1"><InvoiceBadge invoice={inv} /></div>
            </div>
          </div>

          <div className="mb-6 grid gap-4 text-sm sm:grid-cols-3">
            <div>
              <p className="text-xs text-fg-muted">{tx('Bill to')}</p>
              {customer ? <Link href={`/admin/customers/${customer._id}`} className="font-semibold text-fg hover:underline">{customer.company || customer.name}</Link> : '—'}
              {customer?.company && <p className="text-xs text-fg-muted">{customer.name}</p>}
              <p className="text-xs text-fg-muted">{customer?.email}</p>
            </div>
            <div>
              <p className="text-xs text-fg-muted">{tx('Order')}</p>
              {order ? <Link href={`/admin/orders/${order._id}`} className="font-semibold text-fg hover:underline">{order.orderNumber}</Link> : '—'}
              {order && <p className="text-xs text-fg-muted">{statusLabel(order.status, locale)}</p>}
            </div>
            <div>
              <p className="text-xs text-fg-muted">{tx('Issued')} / {tx('Due Date')}</p>
              <p className="font-semibold text-fg">{date(inv.issuedAt)}</p>
              <p className="text-xs text-fg-muted">{date(inv.dueDate)}</p>
            </div>
          </div>

          <DataTable>
            <thead><tr><Th>{tx('Description')}</Th><Th align="end">{tx('Qty')}</Th><Th align="end">{tx('Price')}</Th><Th align="end">{tx('Total')}</Th></tr></thead>
            <tbody>
              {inv.items.map((it: any, i: number) => (
                <tr key={i} className="border-t border-line">
                  <Td>{it.description}</Td><Td align="end">{it.quantity}</Td><Td align="end">{money(it.unitPrice)}</Td><Td align="end">{money(it.total)}</Td>
                </tr>
              ))}
            </tbody>
          </DataTable>

          <div className="ms-auto mt-4 max-w-xs">
            <Row label={tx('Subtotal')} value={money(inv.subtotal)} />
            {inv.discount > 0 && <Row label={tx('Discount')} value={`− ${money(inv.discount)}`} />}
            <Row label={`${tx('VAT')} 15%`} value={money(inv.tax)} />
            <Row label={tx('Total')} value={money(inv.total)} strong />
            <Row label={tx('Paid')} value={money(inv.amountPaid)} />
            <Row label={tx('Balance')} value={money(owed)} strong />
          </div>
          {inv.notes && <p className="mt-4 text-xs text-fg-muted">{inv.notes}</p>}
        </Card>

        <div className="space-y-4 print:hidden">
          <Card>
            <SectionTitle title={tx('Payments')} />
            {payments.length === 0 ? (
              <p className="text-sm text-fg-muted">{tx('No payments found')}</p>
            ) : (
              <ul className="divide-y divide-line">
                {payments.map((p: any) => (
                  <li key={p._id} className="space-y-1 py-2 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-fg">{money(p.amount)}</span>
                      <PaymentBadge status={p.status} />
                    </div>
                    <p className="text-xs text-fg-muted">{PAYMENT_METHODS[p.method]?.[locale] ?? p.method} · {date(p.paidAt || p.createdAt)}{p.reference && ` · ${p.reference}`}</p>
                    {manage && p.status === 'completed' && (
                      <button type="button" onClick={() => refund(p._id)} className="text-xs text-fg-subtle underline hover:text-fg">{tx('Mark refunded')}</button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Card>
          {inv.status === 'cancelled' && <Badge>{tx('This invoice is cancelled and no longer counts.')}</Badge>}
        </div>
      </div>

      <div className="print:hidden"><AuditTrail entityId={id} /></div>
      <PaymentModal invoice={paying ? inv : null} onClose={() => setPaying(false)} onSaved={reload} />
    </div>
  );
}

export default function InvoicePage() {
  return <RequirePermission permission="accounting.view"><InvoiceDetail /></RequirePermission>;
}
