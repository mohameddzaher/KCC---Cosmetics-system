'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle, CalendarClock, CheckCircle2, ClipboardList, CreditCard, FileText, Handshake,
  MessageSquare, Phone, ShoppingBag, StickyNote, UserPlus, Users,
} from 'lucide-react';
import { Badge, Button, Card, ErrorNote, Field, Modal, SectionTitle, Spinner, TextInput } from '@/components/admin/ui';
import ExportButton from '@/components/admin/ExportButton';
import { usePermission } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useApi } from '@/lib/useApi';
import { formatCurrency } from '@/lib/money';
import { valueText } from '@/lib/audit/describe';
import { statusLabel } from '@/lib/orderWorkflow';

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * One client, the same on the CRM account and on the customer page: where they
 * are on the road, the numbers, and everything that has happened, by anyone in
 * any department, in one line.
 */

const ROAD: Array<{ key: string; en: string; ar: string }> = [
  { key: 'target', en: 'Target', ar: 'مستهدف' },
  { key: 'contacted', en: 'Contacted', ar: 'تم التواصل' },
  { key: 'met', en: 'Met', ar: 'تمت المقابلة' },
  { key: 'requested', en: 'Requested', ar: 'قدّم طلبًا' },
  { key: 'quoted', en: 'Quoted', ar: 'عرض سعر' },
  { key: 'paid', en: 'Paid', ar: 'دفع' },
  { key: 'delivered', en: 'Delivered', ar: 'تم التسليم' },
  { key: 'repeat', en: 'Repeat client', ar: 'عميل متكرر' },
];

const KINDS: Array<{ key: string; en: string; ar: string; icon: typeof Phone }> = [
  { key: 'meeting', en: 'Visits & meetings', ar: 'الزيارات والاجتماعات', icon: Users },
  { key: 'contact', en: 'Calls & messages', ar: 'المكالمات والرسائل', icon: Phone },
  { key: 'request', en: 'Requests', ar: 'الطلبات الواردة', icon: MessageSquare },
  { key: 'order', en: 'Orders', ar: 'الطلبات', icon: ShoppingBag },
  { key: 'followup', en: 'Follow-ups', ar: 'المتابعات', icon: ClipboardList },
  { key: 'money', en: 'Money', ar: 'الحسابات', icon: CreditCard },
  { key: 'complaint', en: 'Complaints & feedback', ar: 'الشكاوى والآراء', icon: AlertTriangle },
  { key: 'note', en: 'Notes', ar: 'الملاحظات', icon: StickyNote },
];

function Tile({ label, value, tone }: { label: string; value: string | number; tone?: string }) {
  return (
    <div className="rounded-lg bg-surface-2 p-3">
      <p className={`text-base font-bold ${tone || 'text-fg'}`}>{value}</p>
      <p className="text-[11px] text-fg-muted">{label}</p>
    </div>
  );
}

export default function ClientHub({ customerId, accountId }: { customerId?: string; accountId?: string }) {
  const { tx, locale } = useLanguage();
  const { can } = usePermission();
  const query = customerId ? `customerId=${customerId}` : `accountId=${accountId}`;
  const { data: d, ready, error, reload } = useApi<any>(`/api/client-profile?${query}`);
  const [kind, setKind] = useState('all');
  const [converting, setConverting] = useState(false);
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [convertError, setConvertError] = useState<string | null>(null);

  const shown = useMemo(() => (d?.events || []).filter((e: any) => kind === 'all' || e.kind === kind), [d, kind]);
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const e of d?.events || []) c[e.kind] = (c[e.kind] || 0) + 1;
    return c;
  }, [d]);

  if (!ready) return <Card><Spinner /></Card>;
  if (!d) return error ? <ErrorNote>{error}</ErrorNote> : null;

  const when = (x: string) => new Date(x).toLocaleString(locale === 'ar' ? 'ar-EG' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  const at = d.stages.length;

  async function convert() {
    setSaving(true);
    setConvertError(null);
    const r = await fetch(`/api/crm/accounts/${d.account._id}/convert`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }),
    });
    setSaving(false);
    if (!r.ok) { setConvertError((await r.json()).error); return; }
    setConverting(false);
    await reload();
  }

  return (
    <Card className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <SectionTitle title={tx('Client file')} />
          <p className="-mt-2 text-xs text-fg-muted">
            {d.account?.owner && <>{tx('Owner')}: <b className="text-fg">{d.account.owner}</b> · </>}
            {d.account && <>{tx('CRM stage')}: <b className="text-fg">{valueText('stage', d.account.stage, locale)}</b></>}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 print:hidden">
          {d.account && customerId && <Link href={`/admin/crm/accounts/${d.account._id}`} className="btn btn-outline">{tx('Open CRM account')}</Link>}
          {d.customer && !customerId && <Link href={`/admin/customers/${d.customer._id}`} className="btn btn-outline">{tx('Open customer')}</Link>}
          {d.account && !d.customer && can('crm.edit') && can('customers.edit') && (
            <Button variant="outline" icon={UserPlus} onClick={() => setConverting(true)}>{tx('Make a client')}</Button>
          )}
          <ExportButton what="client" extra={{ customerId, accountId }} shown={shown.map((e: any) => e.id)} total={d.events.length} />
        </div>
      </div>

      {/* The road */}
      <ol className="flex flex-wrap gap-y-2">
        {ROAD.map((s, i) => {
          const done = d.stages.includes(s.key);
          return (
            <li key={s.key} className="flex items-center">
              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ${done ? 'bg-brand-soft text-brand-soft-fg' : 'bg-surface-2 text-fg-subtle'}`}>
                {done && <CheckCircle2 size={11} />}{s[locale]}
              </span>
              {i < ROAD.length - 1 && <span className={`mx-1 h-px w-3 ${i + 1 < at ? 'bg-brand' : 'bg-line'}`} />}
            </li>
          );
        })}
      </ol>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <Tile label={tx('Visits & meetings')} value={d.stats.meetings} />
        <Tile label={tx('Calls & messages')} value={d.stats.contacts} />
        <Tile label={tx('Orders')} value={d.stats.orders} />
        <Tile label={tx('Open follow-ups')} value={d.stats.openTasks} tone={d.stats.overdueTasks ? 'text-danger' : undefined} />
        <Tile label={tx('Open complaints')} value={d.stats.openComplaints} tone={d.stats.openComplaints ? 'text-danger' : undefined} />
        {d.money
          ? <Tile label={tx('Balance')} value={formatCurrency(d.money.balance, locale)} />
          : <Tile label={tx('Last contact')} value={d.stats.lastContact ? new Date(d.stats.lastContact).toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-GB') : '—'} />}
      </div>

      {d.orders.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold text-fg-muted">{tx('Orders')}</p>
          <ul className="divide-y divide-line rounded-lg border border-line">
            {d.orders.map((o: any) => (
              <li key={o._id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
                <Link href={`/admin/orders/${o._id}`} className="font-medium text-fg hover:underline">{o.orderNumber}</Link>
                <span className="flex items-center gap-2"><Badge>{statusLabel(o.status, locale)}</Badge>{o.total > 0 && <span className="text-xs text-fg-muted">{formatCurrency(o.total, locale)}</span>}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Everything */}
      <div>
        <div className="mb-3 flex flex-wrap gap-1.5 print:hidden">
          <button type="button" onClick={() => setKind('all')} className={`rounded-lg border px-2.5 py-1 text-xs font-medium ${kind === 'all' ? 'border-brand bg-brand-soft text-brand-soft-fg' : 'border-line text-fg-muted'}`}>
            {tx('All')} ({d.events.length})
          </button>
          {KINDS.filter((k) => counts[k.key]).map((k) => (
            <button key={k.key} type="button" onClick={() => setKind(k.key)} className={`rounded-lg border px-2.5 py-1 text-xs font-medium ${kind === k.key ? 'border-brand bg-brand-soft text-brand-soft-fg' : 'border-line text-fg-muted'}`}>
              {k[locale]} ({counts[k.key]})
            </button>
          ))}
        </div>
        {shown.length === 0 ? (
          <p className="text-sm text-fg-muted">{tx('Nothing recorded yet.')}</p>
        ) : (
          <ul className="divide-y divide-line">
            {shown.map((e: any) => {
              const Icon = KINDS.find((k) => k.key === e.kind)?.icon || FileText;
              const body = <span className={e.kind === 'followup' && e.done ? 'text-fg-subtle line-through' : 'text-fg'}>{e.text}</span>;
              return (
                <li key={e.id} className="flex gap-3 py-2.5 text-sm">
                  <Icon size={15} className="mt-0.5 shrink-0 text-fg-muted" />
                  <div className="min-w-0 flex-1">
                    <p className="break-words">{e.href ? <Link href={e.href} className="hover:underline">{body}</Link> : body}</p>
                    <p className="text-[11px] text-fg-subtle">
                      {valueText('', e.type, locale)}{e.by && ` · ${e.by}`} · {when(e.at)}
                      {e.dueDate && !e.done && <span className="ms-1 inline-flex items-center gap-0.5"><CalendarClock size={10} />{new Date(e.dueDate).toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-GB')}</span>}
                    </p>
                  </div>
                  {e.amount !== undefined && <span className="shrink-0 text-xs font-semibold text-fg">{formatCurrency(e.amount, locale)}</span>}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <Modal
        open={converting}
        onClose={() => setConverting(false)}
        size="sm"
        title={tx('Make a client')}
        subtitle={tx('Creates their customer record. They cannot sign in until an admin sets a password.')}
        footer={<><Button variant="ghost" onClick={() => setConverting(false)}>{tx('Cancel')}</Button><Button icon={Handshake} onClick={convert} loading={saving}>{tx('Save')}</Button></>}
      >
        {convertError && <div className="mb-3"><ErrorNote>{tx(convertError)}</ErrorNote></div>}
        <Field label={tx('Email')} required><TextInput type="email" dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
      </Modal>
    </Card>
  );
}
