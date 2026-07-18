'use client';

import { useEffect, useState } from 'react';
import { X, Plus, Trash2, Loader2 } from 'lucide-react';

type Kind = 'invoices' | 'payments' | 'expenses';

interface Props {
  kind: Kind;
  invoices: any[];
  onClose: () => void;
  onCreated: () => void;
}

const input =
  'w-full px-3 py-2 text-sm bg-dark-950 border border-dark-700 rounded-lg text-dark-100 focus:border-kcc-green focus:outline-none';
const label = 'block text-xs font-medium text-dark-400 mb-1.5';

export default function AccountingCreateForm({ kind, invoices, onClose, onCreated }: Props) {
  const [saving, setSaving] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);

  // Invoice state
  const [orderId, setOrderId] = useState('');
  const [items, setItems] = useState([{ description: '', quantity: 1, unitPrice: 0 }]);
  const [taxRate, setTaxRate] = useState(15);
  const [discount, setDiscount] = useState(0);
  const [dueDate, setDueDate] = useState('');
  const [invStatus, setInvStatus] = useState('draft');

  // Payment state
  const [invoiceId, setInvoiceId] = useState('');
  const [payAmount, setPayAmount] = useState(0);
  const [payMethod, setPayMethod] = useState('bank_transfer');
  const [payStatus, setPayStatus] = useState('completed');
  const [payRef, setPayRef] = useState('');

  // Expense state
  const [exp, setExp] = useState({ category: '', description: '', amount: 0, date: '', vendor: '', reference: '', notes: '' });

  useEffect(() => {
    if (kind === 'invoices') {
      fetch('/api/orders?limit=200', { cache: 'no-store' })
        .then((r) => (r.ok ? r.json() : { orders: [] }))
        .then((d) => setOrders(Array.isArray(d.orders) ? d.orders : []))
        .catch(() => setOrders([]));
    }
  }, [kind]);

  const subtotal = items.reduce((s, it) => s + (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0), 0);
  const tax = Number(((subtotal * taxRate) / 100).toFixed(2));
  const total = Math.max(0, subtotal + tax - (Number(discount) || 0));

  const selectedInvoice = invoices.find((i) => i._id === invoiceId);

  const submit = async () => {
    setSaving(true);
    try {
      let url = `/api/accounting/${kind}`;
      let payload: any = {};

      if (kind === 'invoices') {
        const order = orders.find((o) => o._id === orderId);
        if (!order) { alert('Select an order'); setSaving(false); return; }
        const userId = order.userId?._id || order.userId;
        payload = {
          orderId, userId,
          items: items.filter((it) => it.description.trim()),
          subtotal, tax, discount: Number(discount) || 0, total,
          dueDate: dueDate || undefined, status: invStatus,
        };
        if (!payload.items.length) { alert('Add at least one line item'); setSaving(false); return; }
      } else if (kind === 'payments') {
        if (!selectedInvoice) { alert('Select an invoice'); setSaving(false); return; }
        payload = {
          invoiceId,
          userId: selectedInvoice.userId?._id || selectedInvoice.userId,
          amount: Number(payAmount) || selectedInvoice.total,
          method: payMethod, status: payStatus, reference: payRef,
        };
      } else {
        if (!exp.category || !exp.amount) { alert('Category and amount are required'); setSaving(false); return; }
        payload = {
          category: exp.category,
          description: { en: exp.description, ar: '' },
          amount: Number(exp.amount), date: exp.date || new Date().toISOString(),
          vendor: exp.vendor, reference: exp.reference, notes: exp.notes,
        };
      }

      const res = await fetch(url, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) { const e = await res.json(); alert(e.error || 'Failed to create'); return; }
      onCreated();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const title = kind === 'invoices' ? 'New Invoice' : kind === 'payments' ? 'Record Payment' : 'New Expense';

  return (
    <div className="bg-dark-900 border border-dark-800 rounded-xl p-5 mb-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-dark-100">{title}</h3>
        <button type="button" onClick={onClose} className="text-dark-400 hover:text-dark-50" aria-label="Close"><X size={18} /></button>
      </div>

      {kind === 'invoices' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className={label}>Order</label>
              <select value={orderId} onChange={(e) => setOrderId(e.target.value)} title="Order" className={input}>
                <option value="">Select an order…</option>
                {orders.map((o) => (
                  <option key={o._id} value={o._id}>{o.orderNumber} — {o.userId?.name || o.customerInfo?.personName || 'Customer'}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={label}>Status</label>
              <select value={invStatus} onChange={(e) => setInvStatus(e.target.value)} title="Status" className={input}>
                {['draft', 'sent', 'paid', 'overdue', 'cancelled'].map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className={label}>Line Items</label>
            <div className="space-y-2">
              {items.map((it, i) => (
                <div key={i} className="flex gap-2">
                  <input aria-label="Description" placeholder="Description" value={it.description}
                    onChange={(e) => setItems((p) => p.map((x, j) => j === i ? { ...x, description: e.target.value } : x))}
                    className={`${input} flex-1`} />
                  <input aria-label="Qty" type="number" placeholder="Qty" value={it.quantity}
                    onChange={(e) => setItems((p) => p.map((x, j) => j === i ? { ...x, quantity: Number(e.target.value) } : x))}
                    className={`${input} w-20`} />
                  <input aria-label="Unit price" type="number" placeholder="Price" value={it.unitPrice}
                    onChange={(e) => setItems((p) => p.map((x, j) => j === i ? { ...x, unitPrice: Number(e.target.value) } : x))}
                    className={`${input} w-28`} />
                  <button type="button" onClick={() => setItems((p) => p.filter((_, j) => j !== i))}
                    className="p-2 text-dark-400 hover:text-red-400" title="Remove"><Trash2 size={15} /></button>
                </div>
              ))}
            </div>
            <button type="button" onClick={() => setItems((p) => [...p, { description: '', quantity: 1, unitPrice: 0 }])}
              className="mt-2 inline-flex items-center gap-1 text-xs text-kcc-green hover:text-kcc-green-light"><Plus size={13} /> Add item</button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div><label className={label}>Tax %</label>
              <input type="number" aria-label="Tax rate" value={taxRate} onChange={(e) => setTaxRate(Number(e.target.value))} className={input} /></div>
            <div><label className={label}>Discount ($)</label>
              <input type="number" aria-label="Discount" value={discount} onChange={(e) => setDiscount(Number(e.target.value))} className={input} /></div>
            <div><label className={label}>Due Date</label>
              <input type="date" aria-label="Due date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={input} /></div>
            <div className="flex flex-col justify-end">
              <span className="text-xs text-dark-400">Total</span>
              <span className="text-lg font-bold text-dark-50">${total.toLocaleString()}</span>
            </div>
          </div>
        </div>
      )}

      {kind === 'payments' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-3">
            <label className={label}>Invoice</label>
            <select value={invoiceId} onChange={(e) => { setInvoiceId(e.target.value); const inv = invoices.find((i) => i._id === e.target.value); if (inv) setPayAmount(inv.total); }} title="Invoice" className={input}>
              <option value="">Select an invoice…</option>
              {invoices.map((inv) => (
                <option key={inv._id} value={inv._id}>{inv.invoiceNumber} — ${inv.total} ({inv.userId?.name || 'Customer'})</option>
              ))}
            </select>
          </div>
          <div><label className={label}>Amount ($)</label>
            <input type="number" aria-label="Amount" value={payAmount} onChange={(e) => setPayAmount(Number(e.target.value))} className={input} /></div>
          <div><label className={label}>Method</label>
            <select value={payMethod} onChange={(e) => setPayMethod(e.target.value)} title="Method" className={input}>
              {['bank_transfer', 'card', 'cash'].map((m) => <option key={m} value={m}>{m}</option>)}
            </select></div>
          <div><label className={label}>Status</label>
            <select value={payStatus} onChange={(e) => setPayStatus(e.target.value)} title="Status" className={input}>
              {['completed', 'pending', 'failed', 'refunded'].map((s) => <option key={s} value={s}>{s}</option>)}
            </select></div>
          <div className="md:col-span-3"><label className={label}>Reference</label>
            <input aria-label="Reference" placeholder="Transaction reference" value={payRef} onChange={(e) => setPayRef(e.target.value)} className={input} /></div>
        </div>
      )}

      {kind === 'expenses' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div><label className={label}>Category</label>
            <input aria-label="Category" placeholder="e.g. Raw materials" value={exp.category} onChange={(e) => setExp((p) => ({ ...p, category: e.target.value }))} className={input} /></div>
          <div className="md:col-span-2"><label className={label}>Description</label>
            <input aria-label="Description" value={exp.description} onChange={(e) => setExp((p) => ({ ...p, description: e.target.value }))} className={input} /></div>
          <div><label className={label}>Amount ($)</label>
            <input type="number" aria-label="Amount" value={exp.amount} onChange={(e) => setExp((p) => ({ ...p, amount: Number(e.target.value) }))} className={input} /></div>
          <div><label className={label}>Date</label>
            <input type="date" aria-label="Date" value={exp.date} onChange={(e) => setExp((p) => ({ ...p, date: e.target.value }))} className={input} /></div>
          <div><label className={label}>Vendor</label>
            <input aria-label="Vendor" value={exp.vendor} onChange={(e) => setExp((p) => ({ ...p, vendor: e.target.value }))} className={input} /></div>
          <div className="md:col-span-3"><label className={label}>Reference / Notes</label>
            <input aria-label="Reference" value={exp.reference} onChange={(e) => setExp((p) => ({ ...p, reference: e.target.value }))} className={input} /></div>
        </div>
      )}

      <div className="flex justify-end gap-3 mt-5">
        <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-dark-400 border border-dark-700 rounded-lg hover:text-dark-50">Cancel</button>
        <button type="button" onClick={submit} disabled={saving}
          className="px-4 py-2 text-sm font-medium text-dark-950 bg-kcc-green hover:bg-kcc-green-light rounded-lg transition-colors disabled:opacity-50">
          {saving ? <Loader2 size={14} className="animate-spin inline mr-1" /> : null}Create
        </button>
      </div>
    </div>
  );
}
