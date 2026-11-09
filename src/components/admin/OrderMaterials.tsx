'use client';

import { useLivePoll } from '@/lib/useLivePoll';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, Boxes, Copy, Plus, Save, Trash2 } from 'lucide-react';
import { Button, Card, ErrorNote, SectionTitle, Select, TextInput } from '@/components/admin/ui';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePermission } from '@/contexts/AuthContext';
import { formatCurrency } from '@/lib/money';

interface Line {
  itemId: string;
  sku: string;
  name: { en: string; ar: string };
  unit: string;
  quantity: number;
  consumed: number;
  inStock: number;
  low: boolean;
  short: boolean;
  cost?: number;
  unitCost?: number;
}

interface Shortage { itemId: string; sku: string; name: { en: string; ar: string }; unit: string; needed: number; available: number }

interface Data {
  orderNumber: string;
  consumedAt: string | null;
  lines: Line[];
  shortages: Shortage[];
  movements: Array<{ _id: string; type: string; quantity: number; at: string; sku?: string; name?: { en: string; ar: string }; unit?: string; by?: string }>;
  money?: { cost: number; estimate: number; net: number; margin: number | null };
}

interface StoreItem { _id: string; sku: string; name: { en: string; ar: string }; unit: string; currentStock: number; isActive?: boolean }

/**
 * What this order takes from the store. Before production it is a plan the
 * factory can shape; "Start production" takes it off the shelves, and any
 * later change takes or returns only the difference.
 */
export default function OrderMaterials({ orderId, status, onChanged }: { orderId: string; status: string; onChanged?: () => void }) {
  const { tx, locale } = useLanguage();
  const { can } = usePermission();
  const canEdit = can('inventory.manage');

  const [data, setData] = useState<Data | null>(null);
  const [store, setStore] = useState<StoreItem[]>([]);
  const [draft, setDraft] = useState<Array<{ itemId: string; quantity: string }>>([]);
  const [editing, setEditing] = useState(false);
  const [copyFrom, setCopyFrom] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shortages, setShortages] = useState<Shortage[]>([]);

  const load = useCallback(async () => {
    const res = await fetch(`/api/orders/${orderId}/materials`, { cache: 'no-store' });
    if (!res.ok) return;
    const d = (await res.json()) as Data;
    setData(d);
    setShortages(d.shortages || []);
  }, [orderId]);

  useEffect(() => { load(); }, [load, status]);
  // Stock levels move under the list; never while the list is being edited.
  useLivePoll(load, 8000, !editing);

  useEffect(() => {
    if (!editing || store.length) return;
    fetch('/api/inventory', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setStore(Array.isArray(d) ? d.filter((i: StoreItem) => i.isActive !== false) : []))
      .catch(() => setStore([]));
  }, [editing, store.length]);

  const name = (n?: { en: string; ar: string }) => (n ? n[locale] || n.en : '—');
  const consumed = Boolean(data?.consumedAt);

  function startEdit() {
    setDraft((data?.lines || []).map((l) => ({ itemId: l.itemId, quantity: String(l.quantity) })));
    setError(null);
    setEditing(true);
  }

  async function copy() {
    if (!copyFrom.trim()) return;
    setError(null);
    const res = await fetch(`/api/orders/${orderId}/materials?copyFrom=${encodeURIComponent(copyFrom.trim())}`, { cache: 'no-store' });
    const d = await res.json();
    if (!res.ok) { setError(tx(d.error || 'Not found')); return; }
    if (!d.lines?.length) { setError(tx('That order has no materials listed.')); return; }
    setDraft(d.lines.map((l: { itemId: string; quantity: number }) => ({ itemId: l.itemId, quantity: String(l.quantity) })));
  }

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const lines = draft.filter((l) => l.itemId).map((l) => ({ itemId: l.itemId, quantity: Number(l.quantity) }));
      const res = await fetch(`/api/orders/${orderId}/materials`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lines }),
      });
      const d = await res.json();
      if (!res.ok) {
        setShortages(d.shortages || []);
        throw new Error(tx(d.error || 'Could not save'));
      }
      setData(d);
      setShortages(d.shortages || []);
      setEditing(false);
      onChanged?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : tx('Could not save'));
    } finally {
      setBusy(false);
    }
  }

  const storeById = useMemo(() => new Map(store.map((i) => [i._id, i])), [store]);

  if (!data) return null;

  return (
    <Card>
      <SectionTitle
        title={tx('Materials')}
        hint={consumed
          ? tx('Taken from the store when production started. Changes here take or return the difference.')
          : tx('A plan until production starts. Starting production takes these from the store.')}
        actions={canEdit && !editing ? (
          <Button size="sm" variant="outline" icon={Boxes} onClick={startEdit}>
            {data.lines.length ? tx('Edit materials') : tx('Add materials')}
          </Button>
        ) : undefined}
      />

      {shortages.length > 0 && (
        <div className="mb-3 rounded-lg border border-red-500/30 bg-red-500/5 p-3 text-sm">
          <p className="mb-1 flex items-center gap-2 font-semibold text-red-500">
            <AlertTriangle size={15} /> {tx('Not enough in the store to start production')}
          </p>
          <ul className="space-y-0.5 text-fg-muted">
            {shortages.map((s) => (
              <li key={s.itemId}>
                {name(s.name)} ({s.sku}): {tx('needs')} {s.needed} {s.unit}, {tx('in stock')} {s.available}
              </li>
            ))}
          </ul>
          <Link href="/admin/inventory" className="mt-1 inline-block text-xs font-semibold text-fg hover:underline">{tx('Open inventory')}</Link>
        </div>
      )}

      {!editing && (
        data.lines.length === 0 ? (
          <p className="text-sm text-fg-muted">{tx('No materials listed yet.')}</p>
        ) : (
          <div className="scroll-thin overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-xs text-fg-subtle">
                  <th className="py-2 text-start font-medium">{tx('Item')}</th>
                  <th className="py-2 text-end font-medium">{tx('Needed')}</th>
                  <th className="py-2 text-end font-medium">{tx('Taken')}</th>
                  <th className="py-2 text-end font-medium">{tx('In stock')}</th>
                  {data.money && <th className="py-2 text-end font-medium">{tx('Cost')}</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {data.lines.map((l) => (
                  <tr key={l.itemId}>
                    <td className="py-2">
                      <p className="text-fg">{name(l.name)}</p>
                      <p className="text-xs text-fg-subtle">{l.sku}</p>
                    </td>
                    <td className="py-2 text-end text-fg">{l.quantity} <span className="text-xs text-fg-subtle">{l.unit}</span></td>
                    <td className="py-2 text-end text-fg-muted">{l.consumed}</td>
                    <td className={`py-2 text-end ${l.short ? 'font-semibold text-red-500' : l.low ? 'text-amber-600' : 'text-fg-muted'}`}>
                      {l.inStock}
                      {(l.short || l.low) && <AlertTriangle size={12} className="ms-1 inline" />}
                    </td>
                    {data.money && (
                      <td className="py-2 text-end text-fg-muted">
                        {formatCurrency(consumed ? l.cost : (l.unitCost || 0) * l.quantity, locale)}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {editing && (
        <div className="space-y-2">
          {draft.map((row, i) => {
            const item = storeById.get(row.itemId);
            return (
              <div key={i} className="flex flex-wrap items-center gap-2">
                <Select
                  value={row.itemId}
                  onChange={(e) => setDraft((d) => d.map((r, j) => (j === i ? { ...r, itemId: e.target.value } : r)))}
                  className="min-w-0 flex-1"
                  aria-label={tx('Item')}
                >
                  <option value="">{tx('Select item...')}</option>
                  {store.map((s) => (
                    <option key={s._id} value={s._id}>{s.sku} · {name(s.name)} ({s.currentStock} {s.unit})</option>
                  ))}
                </Select>
                <TextInput
                  type="number" min="0" step="any" className="w-28"
                  value={row.quantity}
                  onChange={(e) => setDraft((d) => d.map((r, j) => (j === i ? { ...r, quantity: e.target.value } : r)))}
                  aria-label={tx('Quantity')}
                />
                <span className="w-10 text-xs text-fg-subtle">{item?.unit}</span>
                <button type="button" className="p-1.5 text-fg-muted hover:text-red-500" title={tx('Remove')}
                  onClick={() => setDraft((d) => d.filter((_, j) => j !== i))}>
                  <Trash2 size={15} />
                </button>
              </div>
            );
          })}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Button size="sm" variant="outline" icon={Plus} onClick={() => setDraft((d) => [...d, { itemId: '', quantity: '' }])}>
              {tx('Add line')}
            </Button>
            <TextInput className="w-40" placeholder={tx('Order number')} value={copyFrom} onChange={(e) => setCopyFrom(e.target.value)} />
            <Button size="sm" variant="outline" icon={Copy} onClick={copy}>{tx('Copy from order')}</Button>
          </div>
          {consumed && (
            <p className="text-xs text-amber-700 dark:text-amber-400">
              {tx('Production has started: saving takes any increase from the store and returns any decrease.')}
            </p>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button size="sm" variant="outline" onClick={() => { setEditing(false); setError(null); }}>{tx('Cancel')}</Button>
            <Button size="sm" icon={Save} loading={busy} onClick={save}>{tx('Save')}</Button>
          </div>
        </div>
      )}

      {error && <div className="mt-3"><ErrorNote>{error}</ErrorNote></div>}

      {data.money && data.lines.length > 0 && (
        <div className="mt-4 grid grid-cols-1 gap-2 border-t border-line pt-3 text-sm sm:grid-cols-3">
          <div>
            <p className="text-xs text-fg-muted">{consumed ? tx('Materials cost') : tx('Estimated materials cost')}</p>
            <p className="font-semibold text-fg">{formatCurrency(consumed ? data.money.cost : data.money.estimate, locale)}</p>
          </div>
          <div>
            <p className="text-xs text-fg-muted">{tx('Sale before VAT')}</p>
            <p className="font-semibold text-fg">{data.money.net > 0 ? formatCurrency(data.money.net, locale) : '—'}</p>
          </div>
          <div>
            <p className="text-xs text-fg-muted">{tx('Margin after materials')}</p>
            <p className={`font-semibold ${data.money.margin !== null && data.money.margin < 0 ? 'text-red-500' : 'text-fg'}`}>
              {data.money.margin === null ? '—' : formatCurrency(data.money.margin, locale)}
            </p>
          </div>
        </div>
      )}

      {data.movements.length > 0 && (
        <details className="mt-3 text-sm">
          <summary className="cursor-pointer text-xs font-semibold text-fg-muted">{tx('Store movements for this order')} ({data.movements.length})</summary>
          <ul className="mt-2 space-y-1 text-xs text-fg-muted">
            {data.movements.map((m) => (
              <li key={m._id} className="flex flex-wrap gap-x-2">
                <span className={m.type === 'OUT' ? 'text-red-500' : 'text-green-600'}>{m.type === 'OUT' ? '−' : '+'}{m.quantity} {m.unit}</span>
                <span className="text-fg">{name(m.name)}</span>
                <span>{m.by || '—'}</span>
                <span>{new Date(m.at).toLocaleString(locale === 'ar' ? 'ar-EG' : 'en-GB')}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </Card>
  );
}
