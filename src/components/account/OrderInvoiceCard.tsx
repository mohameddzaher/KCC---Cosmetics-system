'use client';

import Link from 'next/link';
import { FileText } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatCurrency } from '@/lib/money';
import { balanceOf, displayStatus, INVOICE_STATUS_META } from '@/lib/invoiceStatus';

/** The customer's invoice, on their order: what is due, by when, and the document. */
export default function OrderInvoiceCard({
  invoice,
}: {
  invoice?: { _id: string; invoiceNumber: string; status: string; total: number; amountPaid?: number; dueDate?: string } | null;
}) {
  const { tx, locale } = useLanguage();
  if (!invoice) return null;
  const meta = INVOICE_STATUS_META[displayStatus(invoice)];
  return (
    <div className="rounded-xl border border-line bg-surface p-5">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-fg"><FileText size={16} className="text-kcc-green" />{tx('Your invoice')}</h2>
      <dl className="space-y-1.5 text-sm">
        <div className="flex justify-between"><dt className="text-fg-muted">{tx('Invoice #')}</dt><dd className="text-fg">{invoice.invoiceNumber}</dd></div>
        <div className="flex justify-between"><dt className="text-fg-muted">{tx('Status')}</dt><dd className="text-fg">{meta[locale]}</dd></div>
        <div className="flex justify-between"><dt className="text-fg-muted">{tx('Total')}</dt><dd className="text-fg">{formatCurrency(invoice.total, locale)}</dd></div>
        <div className="flex justify-between font-semibold"><dt className="text-fg">{tx('Balance')}</dt><dd className="text-fg">{formatCurrency(balanceOf(invoice), locale)}</dd></div>
      </dl>
      <Link href={`/account/invoices/${invoice._id}`} className="mt-3 inline-block text-sm font-medium text-kcc-green hover:underline">{tx('View invoice')}</Link>
    </div>
  );
}
