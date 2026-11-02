'use client';

import { useParams } from 'next/navigation';
import { Loader2, Printer } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useApi } from '@/lib/useApi';
import { formatCurrency } from '@/lib/money';
import { balanceOf, displayStatus, INVOICE_STATUS_META, PAYMENT_METHODS } from '@/lib/invoiceStatus';

/* eslint-disable @typescript-eslint/no-explicit-any */

/** A customer's own tax invoice, ready to print or save as a PDF. */
export default function CustomerInvoicePage() {
  const { id } = useParams<{ id: string }>();
  const { tx, locale, pick } = useLanguage();
  const { data, ready, error } = useApi<any>(`/api/account/invoices/${id}`);
  const money = (n?: number) => formatCurrency(n, locale);
  const date = (d?: string) => (d ? new Date(d).toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '—');

  if (!ready) return <div className="flex h-64 items-center justify-center"><Loader2 className="animate-spin text-kcc-green" size={24} /></div>;
  if (!data) return <p className="p-8 text-center text-fg-muted">{error && tx('This invoice could not be found.')}</p>;

  const { invoice: inv, payments, seller, qr } = data;
  const line = 'flex justify-between gap-6 py-1 text-sm';

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex justify-end print:hidden">
        <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm text-fg hover:bg-surface-2">
          <Printer size={15} />{tx('Print / PDF')}
        </button>
      </div>
      <div className="rounded-xl border border-line bg-surface p-6 print:border-0 print:p-0">
        <div className="mb-6 flex flex-wrap justify-between gap-4">
          <div>
            <p className="text-lg font-bold text-fg">{pick(seller?.companyName?.en, seller?.companyName?.ar) || 'KCC'}</p>
            {seller?.vatNumber && <p className="text-xs text-fg-muted">{tx('VAT no.')} {seller.vatNumber}</p>}
            {seller?.crNumber && <p className="text-xs text-fg-muted">{tx('CR no.')} {seller.crNumber}</p>}
          </div>
          <div className="text-end">
            <p className="text-lg font-bold text-fg">{tx('Tax invoice')}</p>
            <p className="text-sm text-fg-muted">{inv.invoiceNumber}</p>
            <p className="text-xs text-fg-muted">{INVOICE_STATUS_META[displayStatus(inv)][locale]}</p>
          </div>
        </div>
        <div className="mb-6 grid gap-4 text-sm sm:grid-cols-3">
          <div><p className="text-xs text-fg-muted">{tx('Bill to')}</p><p className="font-semibold text-fg">{inv.userId?.company || inv.userId?.name}</p></div>
          <div><p className="text-xs text-fg-muted">{tx('Order')}</p><p className="font-semibold text-fg">{inv.orderId?.orderNumber}</p></div>
          <div><p className="text-xs text-fg-muted">{tx('Issued')} / {tx('Due Date')}</p><p className="font-semibold text-fg">{date(inv.issuedAt)}</p><p className="text-xs text-fg-muted">{date(inv.dueDate)}</p></div>
        </div>
        <table className="mb-4 w-full text-sm">
          <thead><tr className="border-b border-line text-xs text-fg-muted"><th className="py-2 text-start">{tx('Description')}</th><th className="py-2 text-end">{tx('Qty')}</th><th className="py-2 text-end">{tx('Price')}</th><th className="py-2 text-end">{tx('Total')}</th></tr></thead>
          <tbody>
            {inv.items.map((it: any, i: number) => (
              <tr key={i} className="border-b border-line text-fg"><td className="py-2">{it.description}</td><td className="py-2 text-end">{it.quantity}</td><td className="py-2 text-end">{money(it.unitPrice)}</td><td className="py-2 text-end">{money(it.total)}</td></tr>
            ))}
          </tbody>
        </table>
        <div className="ms-auto max-w-xs">
          <div className={`${line} text-fg-muted`}><span>{tx('Subtotal')}</span><span>{money(inv.subtotal)}</span></div>
          {inv.discount > 0 && <div className={`${line} text-fg-muted`}><span>{tx('Discount')}</span><span>− {money(inv.discount)}</span></div>}
          <div className={`${line} text-fg-muted`}><span>{tx('VAT')} 15%</span><span>{money(inv.tax)}</span></div>
          <div className={`${line} border-t border-line font-bold text-fg`}><span>{tx('Total')}</span><span>{money(inv.total)}</span></div>
          <div className={`${line} text-fg-muted`}><span>{tx('Paid')}</span><span>{money(inv.amountPaid)}</span></div>
          <div className={`${line} border-t border-line font-bold text-fg`}><span>{tx('Balance')}</span><span>{money(balanceOf(inv))}</span></div>
        </div>
        {payments.length > 0 && (
          <ul className="mt-4 space-y-1 text-xs text-fg-muted">
            {payments.map((p: any) => <li key={p._id}>{date(p.paidAt)} · {PAYMENT_METHODS[p.method]?.[locale] ?? p.method} · {money(p.amount)}{p.status === 'refunded' && ` (${tx('Refunded')})`}</li>)}
          </ul>
        )}
        {qr && <div className="mt-4 h-28 w-28" dangerouslySetInnerHTML={{ __html: qr }} />}
      </div>
    </div>
  );
}
