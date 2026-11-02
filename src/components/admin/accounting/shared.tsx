'use client';

import { useEffect, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Badge, Button, Card, ErrorNote, Field, Modal, Select, TextInput } from '@/components/admin/ui';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatCurrency } from '@/lib/money';
import {
  balanceOf, displayStatus, INVOICE_STATUS_META, PAYMENT_METHODS, PAYMENT_STATUS_META,
} from '@/lib/invoiceStatus';

/** What the accounts pages share: how money, dates and statuses look. */

export function useMoney() {
  const { locale } = useLanguage();
  return {
    money: (n?: number | null) => formatCurrency(n, locale),
    date: (d?: string | Date | null) =>
      d ? new Date(d).toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—',
    month: (key: string) => {
      const [y, m] = key.split('-').map(Number);
      return new Date(y, m - 1, 1).toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-GB', { month: 'short' });
    },
  };
}

export function Stat({
  label, value, note, icon: Icon, tone = 'text-fg-muted',
}: {
  label: string; value: string; note?: string; icon: LucideIcon; tone?: string;
}) {
  return (
    <Card className="flex items-start gap-3">
      <Icon size={20} className={`mt-0.5 shrink-0 ${tone}`} />
      <div className="min-w-0">
        <p className="break-words text-lg font-bold leading-snug text-fg">{value}</p>
        <p className="text-xs text-fg-muted">{label}</p>
        {note && <p className="mt-0.5 text-[11px] text-fg-subtle">{note}</p>}
      </div>
    </Card>
  );
}

export function InvoiceBadge({ invoice }: { invoice: { status: string; dueDate?: string | null } }) {
  const { locale } = useLanguage();
  const m = INVOICE_STATUS_META[displayStatus(invoice)] ?? INVOICE_STATUS_META.draft;
  return <Badge tone={m.tone}>{m[locale]}</Badge>;
}

export function PaymentBadge({ status }: { status: string }) {
  const { locale } = useLanguage();
  const m = PAYMENT_STATUS_META[status] ?? PAYMENT_STATUS_META.pending;
  return <Badge tone={m.tone}>{m[locale]}</Badge>;
}

/** One from/to pair, the same on every page that has a period. */
export function PeriodPicker({
  from, to, onChange,
}: { from: string; to: string; onChange: (from: string, to: string) => void }) {
  const { tx } = useLanguage();
  const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const now = new Date();
  const presets: Array<[string, Date, Date]> = [
    [tx('This month'), new Date(now.getFullYear(), now.getMonth(), 1), new Date(now.getFullYear(), now.getMonth() + 1, 0)],
    [tx('Last month'), new Date(now.getFullYear(), now.getMonth() - 1, 1), new Date(now.getFullYear(), now.getMonth(), 0)],
    [tx('This quarter'), new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1), new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3 + 3, 0)],
    [tx('This year'), new Date(now.getFullYear(), 0, 1), new Date(now.getFullYear(), 11, 31)],
  ];
  return (
    <div className="flex flex-wrap items-end gap-2">
      {presets.map(([label, a, b]) => (
        <button
          key={label}
          type="button"
          onClick={() => onChange(iso(a), iso(b))}
          className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${
            from === iso(a) && to === iso(b) ? 'border-brand bg-brand-soft text-brand-soft-fg' : 'border-line text-fg-muted hover:text-fg'
          }`}
        >
          {label}
        </button>
      ))}
      <TextInput type="date" aria-label={tx('From date')} value={from} onChange={(e) => onChange(e.target.value, to)} className="!w-auto text-sm" />
      <TextInput type="date" aria-label={tx('To date')} value={to} onChange={(e) => onChange(from, e.target.value)} className="!w-auto text-sm" />
    </div>
  );
}

export function thisMonth() {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const ym = `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
  return { from: `${ym}-01`, to: `${ym}-${pad(last)}` };
}

/** Sales against costs, month by month. Colours are validated; see --chart-1 in globals.css. */
export function MonthlyChart({ months }: { months: Array<{ key: string; sales: number; expenses: number }> }) {
  const { tx } = useLanguage();
  const { money, month } = useMoney();
  const data = months.map((m) => ({ ...m, label: month(m.key) }));
  return (
    <div className="h-72" role="img" aria-label={tx('Sales and expenses by month')}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} barGap={2} barCategoryGap="28%">
          <CartesianGrid vertical={false} stroke="var(--line)" />
          <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: 'var(--line)' }} tick={{ fill: 'var(--fg-muted)', fontSize: 11 }} />
          <YAxis width={56} tickLine={false} axisLine={false} tick={{ fill: 'var(--fg-muted)', fontSize: 11 }} tickFormatter={(v) => (v >= 1000 ? `${v / 1000}k` : String(v))} />
          <Tooltip
            cursor={{ fill: 'var(--surface-2)' }}
            contentStyle={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 8, fontSize: 12, color: 'var(--fg)' }}
            formatter={(value) => money(Number(value))}
          />
          <Legend iconType="circle" iconSize={8} itemSorter={null} wrapperStyle={{ fontSize: 12, color: 'var(--fg-muted)' }} />
          <Bar dataKey="sales" name={tx('Sales')} fill="var(--chart-1)" radius={[4, 4, 0, 0]} maxBarSize={20} />
          <Bar dataKey="expenses" name={tx('Expenses')} fill="var(--chart-2)" radius={[4, 4, 0, 0]} maxBarSize={20} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Recording money against an invoice. Opens with whatever is still owed. */
export function PaymentModal({
  invoice, onClose, onSaved,
}: {
  invoice: { _id: string; invoiceNumber: string; total: number; amountPaid?: number } | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { tx, locale } = useLanguage();
  const { money } = useMoney();
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('bank_transfer');
  const [reference, setReference] = useState('');
  const [paidAt, setPaidAt] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const owed = invoice ? balanceOf(invoice) : 0;

  useEffect(() => {
    if (invoice) { setAmount(String(balanceOf(invoice))); setReference(''); setPaidAt(''); setError(null); }
  }, [invoice]);

  async function save() {
    if (!invoice) return;
    setSaving(true);
    setError(null);
    try {
      const r = await fetch('/api/accounting/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceId: invoice._id, amount: Number(amount), method, reference, paidAt: paidAt || undefined }),
      });
      if (!r.ok) throw new Error((await r.json()).error || 'Could not record the payment');
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={!!invoice}
      onClose={onClose}
      size="md"
      title={tx('Record Payment')}
      subtitle={invoice ? `${invoice.invoiceNumber} · ${tx('Balance')} ${money(owed)}` : undefined}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>{tx('Cancel')}</Button>
          <Button onClick={save} loading={saving}>{tx('Save')}</Button>
        </>
      }
    >
      <div className="space-y-4">
        {error && <ErrorNote>{tx(error)}</ErrorNote>}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={tx('Amount')} required>
            <TextInput type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </Field>
          <Field label={tx('Method')}>
            <Select value={method} onChange={(e) => setMethod(e.target.value)}>
              {Object.entries(PAYMENT_METHODS).map(([k, m]) => <option key={k} value={k}>{m[locale]}</option>)}
            </Select>
          </Field>
          <Field label={tx('Date received')}>
            <TextInput type="date" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} />
          </Field>
          <Field label={tx('Reference')}>
            <TextInput value={reference} onChange={(e) => setReference(e.target.value)} placeholder={tx('Transaction reference')} />
          </Field>
        </div>
      </div>
    </Modal>
  );
}
