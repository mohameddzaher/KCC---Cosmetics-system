'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Download, Pencil, Plus, Receipt, Trash2 } from 'lucide-react';
import {
  AutoGrid, Button, Card, DataTable, EmptyState, ErrorNote, Field, Modal, PageHeader, PageSkeleton,
  Select, Td, TextInput, Th,
} from '@/components/admin/ui';
import RequirePermission from '@/components/admin/RequirePermission';
import { PeriodPicker, Stat, thisMonth, useMoney } from '@/components/admin/accounting/shared';
import { usePermission } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useApi } from '@/lib/useApi';
import { downloadFile } from '@/lib/download';
import { EXPENSE_CATEGORIES, expenseCategoryLabel } from '@/lib/invoiceStatus';
import { VAT_RATE } from '@/lib/orderTotals';

/* eslint-disable @typescript-eslint/no-explicit-any */

const blank = { category: 'raw_materials', description: '', amount: '', vatAmount: '', date: '', vendor: '', reference: '', orderId: '' };

function Expenses() {
  const { tx, locale } = useLanguage();
  const { money, date } = useMoney();
  const { can } = usePermission();
  const manage = can('accounting.manage');
  const [period, setPeriod] = useState(thisMonth);
  const [category, setCategory] = useState('all');
  const [editing, setEditing] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const url = `/api/accounting/expenses?startDate=${period.from}&endDate=${period.to}${category !== 'all' ? `&category=${category}` : ''}`;
  const { data, ready, error, reload } = useApi<any[]>(url);
  const orders = useApi<any>(editing ? '/api/orders?limit=200' : null);
  const rows = data ?? [];
  const total = rows.reduce((n, e) => n + e.amount, 0);
  const vat = rows.reduce((n, e) => n + (e.vatAmount || 0), 0);

  const set = (patch: Record<string, string>) => setEditing((e: any) => ({ ...e, ...patch }));

  function open(e?: any) {
    setFormError(null);
    setEditing(e ? {
      _id: e._id, category: e.category, description: e.description?.en || e.description?.ar || '',
      amount: String(e.amount), vatAmount: String(e.vatAmount || ''), date: String(e.date).slice(0, 10),
      vendor: e.vendor || '', reference: e.reference || '', orderId: e.orderId?._id || '',
    } : { ...blank, date: new Date().toISOString().slice(0, 10) });
  }

  async function save() {
    setSaving(true);
    setFormError(null);
    try {
      const r = await fetch(editing._id ? `/api/accounting/expenses/${editing._id}` : '/api/accounting/expenses', {
        method: editing._id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...editing,
          description: { en: editing.description, ar: editing.description },
          amount: Number(editing.amount),
          vatAmount: Number(editing.vatAmount) || 0,
        }),
      });
      if (!r.ok) throw new Error((await r.json()).error || 'Could not save');
      setEditing(null);
      await reload();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!confirm(tx('Delete this expense?'))) return;
    await fetch(`/api/accounting/expenses/${id}`, { method: 'DELETE' });
    await reload();
  }

  if (!ready) return <PageSkeleton tiles={2} rows={10} />;

  return (
    <div>
      <PageHeader
        title={tx('Expenses')}
        subtitle={tx('What the business spends, by category, with the VAT it can reclaim.')}
        backHref="/admin/accounting"
        backLabel={tx('Accounting')}
        actions={
          <>
            <Button variant="outline" icon={Download} onClick={() => downloadFile(`/api/accounting/export?what=expenses&from=${period.from}&to=${period.to}&category=${category}`)}>{tx('Export to Excel')}</Button>
            {manage && <Button icon={Plus} onClick={() => open()}>{tx('New Expense')}</Button>}
          </>
        }
      />
      {error && <div className="mb-4"><ErrorNote>{error}</ErrorNote></div>}

      <AutoGrid min="16rem" className="mb-4">
        <Stat icon={Receipt} tone="text-warn-soft-fg" label={tx('Total spent')} value={money(total)} note={`${rows.length} ${tx('expenses')}`} />
        <Stat icon={Receipt} label={tx('VAT paid')} value={money(vat)} />
      </AutoGrid>

      <Card className="mb-4 flex flex-wrap items-end gap-3">
        <PeriodPicker from={period.from} to={period.to} onChange={(from, to) => setPeriod({ from, to })} />
        <Select aria-label={tx('Category')} value={category} onChange={(e) => setCategory(e.target.value)} className="!w-auto">
          <option value="all">{tx('All categories')}</option>
          {EXPENSE_CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c[locale]}</option>)}
        </Select>
      </Card>

      {rows.length === 0 ? (
        <EmptyState icon={Receipt} title={tx('No expenses found')} />
      ) : (
        <DataTable>
          <thead>
            <tr><Th>{tx('Date')}</Th><Th>{tx('Category')}</Th><Th>{tx('Description')}</Th><Th>{tx('Vendor')}</Th><Th>{tx('Order')}</Th><Th align="end">{tx('VAT')}</Th><Th align="end">{tx('Amount')}</Th>{manage && <Th />}</tr>
          </thead>
          <tbody>
            {rows.map((e) => (
              <tr key={e._id} className="border-t border-line hover:bg-surface-2/60">
                <Td className="text-fg-muted">{date(e.date)}</Td>
                <Td>{expenseCategoryLabel(e.category, locale)}</Td>
                <Td className="text-fg-muted">{e.description?.en || e.description?.ar || '—'}</Td>
                <Td className="text-fg-muted">{e.vendor || '—'}</Td>
                <Td>{e.orderId ? <Link href={`/admin/orders/${e.orderId._id}`} className="text-fg-muted hover:underline">{e.orderId.orderNumber}</Link> : '—'}</Td>
                <Td align="end" className="text-fg-muted">{money(e.vatAmount)}</Td>
                <Td align="end" className="font-semibold">{money(e.amount)}</Td>
                {manage && (
                  <Td align="end">
                    <div className="flex justify-end gap-1">
                      <button type="button" onClick={() => open(e)} title={tx('Edit details')} className="rounded-lg p-1.5 text-fg-muted hover:bg-surface-2 hover:text-fg"><Pencil size={14} /></button>
                      <button type="button" onClick={() => remove(e._id)} title={tx('Delete expense')} className="rounded-lg p-1.5 text-fg-muted hover:bg-surface-2 hover:text-danger"><Trash2 size={14} /></button>
                    </div>
                  </Td>
                )}
              </tr>
            ))}
          </tbody>
        </DataTable>
      )}

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        size="md"
        title={editing?._id ? tx('Edit details') : tx('New Expense')}
        footer={<><Button variant="ghost" onClick={() => setEditing(null)}>{tx('Cancel')}</Button><Button onClick={save} loading={saving}>{tx('Save')}</Button></>}
      >
        {editing && (
          <div className="space-y-4">
            {formError && <ErrorNote>{tx(formError)}</ErrorNote>}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={tx('Category')} required>
                <Select value={editing.category} onChange={(e) => set({ category: e.target.value })}>
                  {EXPENSE_CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c[locale]}</option>)}
                </Select>
              </Field>
              <Field label={tx('Date')}><TextInput type="date" value={editing.date} onChange={(e) => set({ date: e.target.value })} /></Field>
              <Field label={tx('Amount')} required hint={tx('Including VAT')}>
                <TextInput type="number" min="0" step="0.01" value={editing.amount} onChange={(e) => set({ amount: e.target.value })} />
              </Field>
              <Field label={tx('VAT')} hint={tx('Leave empty if the supplier charged none')}>
                <div className="flex gap-2">
                  <TextInput type="number" min="0" step="0.01" value={editing.vatAmount} onChange={(e) => set({ vatAmount: e.target.value })} />
                  <Button
                    variant="outline"
                    onClick={() => set({ vatAmount: ((Number(editing.amount) * VAT_RATE) / (1 + VAT_RATE)).toFixed(2) })}
                  >15%</Button>
                </div>
              </Field>
              <Field label={tx('Vendor')}><TextInput value={editing.vendor} onChange={(e) => set({ vendor: e.target.value })} /></Field>
              <Field label={tx('Reference')}><TextInput value={editing.reference} onChange={(e) => set({ reference: e.target.value })} /></Field>
            </div>
            <Field label={tx('Description')}><TextInput value={editing.description} onChange={(e) => set({ description: e.target.value })} /></Field>
            <Field label={tx('Order')} hint={tx('If this cost belongs to one order')}>
              <Select value={editing.orderId} onChange={(e) => set({ orderId: e.target.value })}>
                <option value="">{tx('Not tied to an order')}</option>
                {(orders.data?.orders || []).map((o: any) => <option key={o._id} value={o._id}>{o.orderNumber}</option>)}
              </Select>
            </Field>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default function ExpensesPage() {
  return <RequirePermission permission="accounting.view"><Expenses /></RequirePermission>;
}
