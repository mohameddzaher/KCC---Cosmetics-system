'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle, Check, Download, Lightbulb, MessageSquareWarning, Printer, Search,
} from 'lucide-react';
import {
  AutoGrid, Badge, Button, Card, DataTable, EmptyState, ErrorNote, Field, Modal,
  PageHeader, SectionTitle, Select, Spinner, Td, TextArea, TextInput, Th,
} from '@/components/admin/ui';
import { useLanguage } from '@/contexts/LanguageContext';
import { downloadFile } from '@/lib/download';
import { CRM_CATEGORIES } from '@/lib/crmVocab';

/**
 * What accounts have told us: complaints, and suggestions.
 *
 * Kept as one screen because they arrive the same way — a rep hears something
 * on a visit and logs it — and because the question management asks of both is
 * the same: what came in, and what was done about it.
 *
 * A complaint is never edited away. Marking it handled writes the outcome
 * beside it, so the record of what was said survives the fix.
 */

interface Row {
  _id: string;
  type: string;
  body?: string;
  outcome?: string;
  at: string;
  done?: boolean;
  byName?: string;
  accountId?: {
    _id: string; name: string; nameAr?: string;
    category?: string; city?: string; stage?: string; ownerName?: string;
  };
  meta?: { handledBy?: string; handledAt?: string };
}

export default function CrmFeedbackPage() {
  const { t, tx, pick, locale } = useLanguage();
  const ar = locale === 'ar';

  const [rows, setRows] = useState<Row[]>([]);
  const [byType, setByType] = useState<Record<string, { total: number; handled: number }>>({});
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [type, setType] = useState('complaint,suggestion');
  const [handled, setHandled] = useState('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [q, setQ] = useState('');
  const [resolving, setResolving] = useState<Row | null>(null);
  const [outcome, setOutcome] = useState('');

  const load = useCallback(async () => {
    try {
      const p = new URLSearchParams({ type, limit: '500' });
      if (handled !== 'all') p.set('handled', handled);
      if (from) p.set('from', from);
      if (to) p.set('to', to);
      if (q.trim()) p.set('q', q.trim());

      const r = await fetch(`/api/crm/activities?${p}`, { cache: 'no-store' });
      if (!r.ok) throw new Error((await r.json()).error || 'Could not load');
      const d = await r.json();
      setRows(d.items || []);
      setByType(d.byType || {});
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Load failed');
    } finally {
      setReady(true);
    }
  }, [type, handled, from, to, q]);

  useEffect(() => {
    const timer = setTimeout(load, q ? 250 : 0);
    return () => clearTimeout(timer);
  }, [load, q]);

  async function markHandled() {
    if (!resolving) return;
    setSaving(true);
    try {
      await fetch(`/api/crm/activities/${resolving._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ done: true, outcome }),
      });
      setResolving(null);
      setOutcome('');
      await load();
    } finally {
      setSaving(false);
    }
  }

  const complaints = byType.complaint || { total: 0, handled: 0 };
  const suggestions = byType.suggestion || { total: 0, handled: 0 };
  const openComplaints = complaints.total - complaints.handled;
  const accountsAffected = new Set(rows.map((r) => r.accountId?._id).filter(Boolean)).size;

  const exportRows = () => {
    const p = new URLSearchParams({ what: 'feedback', type });
    if (handled !== 'all') p.set('handled', handled);
    if (from) p.set('from', from);
    if (to) p.set('to', to);
    downloadFile(`/api/crm/export?${p}`).catch((e) => setError(e.message));
  };

  if (!ready) return <Spinner />;
  if (error && rows.length === 0) return <ErrorNote>{error}</ErrorNote>;

  return (
    <div>
      <PageHeader
        title={t('admin.crmFeedback')}
        subtitle={t('admin.crmFeedbackDesc')}
        backHref="/admin/crm"
        backLabel={t('admin.crmTitle')}
        actions={
          <>
            <Button variant="outline" icon={Download} onClick={exportRows}>{tx('Export to Excel')}</Button>
            <Button variant="outline" icon={Printer} onClick={() => window.print()}>{tx('Print / PDF')}</Button>
          </>
        }
      />

      {error && <div className="mb-4"><ErrorNote>{error}</ErrorNote></div>}

      <AutoGrid min="13rem" gap="0.75rem" className="mb-5">
        <Tile
          icon={MessageSquareWarning}
          value={complaints.total}
          label={tx('Complaints')}
          note={`${complaints.handled} ${tx('handled')}`}
          tone={openComplaints > 0 ? 'warn' : 'ok'}
        />
        <Tile
          icon={AlertTriangle}
          value={openComplaints}
          label={tx('Still open')}
          note={tx('waiting on us')}
          tone={openComplaints > 0 ? 'danger' : 'ok'}
        />
        <Tile
          icon={Lightbulb}
          value={suggestions.total}
          label={tx('Suggestions')}
          note={`${suggestions.handled} ${tx('acted on')}`}
        />
        <Tile
          icon={MessageSquareWarning}
          value={accountsAffected}
          label={tx('Accounts in this view')}
          note={tx('that told us something')}
        />
      </AutoGrid>

      <Card className="mb-4 print:hidden">
        <div className="flex flex-wrap items-end gap-3">
          <div className="relative min-w-0 flex-1 sm:max-w-xs">
            <Search size={13} className="absolute start-3 top-1/2 -translate-y-1/2 text-fg-subtle" />
            <TextInput
              className="ps-10 text-sm"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={tx('Search what was said, or an account…')}
              aria-label={tx('Search what was said, or an account…')}
            />
          </div>
          <div className="w-44">
            <label className="field-label" htmlFor="fb-type">{tx('Type')}</label>
            <Select id="fb-type" value={type} onChange={(e) => setType(e.target.value)}>
              <option value="complaint,suggestion">{tx('Complaints and suggestions')}</option>
              <option value="complaint">{tx('Complaints only')}</option>
              <option value="suggestion">{tx('Suggestions only')}</option>
            </Select>
          </div>
          <div className="w-40">
            <label className="field-label" htmlFor="fb-handled">{tx('Handled')}</label>
            <Select id="fb-handled" value={handled} onChange={(e) => setHandled(e.target.value)}>
              <option value="all">{tx('Handled or not')}</option>
              <option value="no">{tx('Still open')}</option>
              <option value="yes">{tx('Handled')}</option>
            </Select>
          </div>
          <div className="w-36">
            <label className="field-label" htmlFor="fb-from">{tx('From')}</label>
            <TextInput id="fb-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="w-36">
            <label className="field-label" htmlFor="fb-to">{tx('To')}</label>
            <TextInput id="fb-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <p className="ms-auto pb-2.5 text-xs text-fg-muted">{rows.length} {tx('entries')}</p>
        </div>
      </Card>

      {rows.length === 0 ? (
        <EmptyState
          title={tx('Nothing has been raised')}
          hint={tx('A rep logs a complaint or a suggestion from the account page, and it appears here.')}
        />
      ) : (
        <DataTable>
          <thead>
            <tr>
              <Th>{tx('Type')}</Th>
              <Th>{tx('Account')}</Th>
              <Th>{tx('What they said')}</Th>
              <Th>{tx('Logged by')}</Th>
              <Th align="center">{tx('When')}</Th>
              <Th align="center">{tx('Handled')}</Th>
              <Th align="end">{tx('Actions')}</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const cat = CRM_CATEGORIES.find((c) => c.key === r.accountId?.category);
              return (
                <tr key={r._id} className="hover:bg-surface-2/40">
                  <Td>
                    <Badge tone={r.type === 'complaint' ? 'danger' : 'info'}>
                      {r.type === 'complaint' ? tx('Complaint') : tx('Suggestion')}
                    </Badge>
                  </Td>
                  <Td>
                    {r.accountId ? (
                      <Link
                        href={`/admin/crm/accounts/${r.accountId._id}`}
                        className="font-medium text-fg hover:text-brand"
                      >
                        {pick(r.accountId.name, r.accountId.nameAr)}
                      </Link>
                    ) : (
                      <span className="text-fg-subtle">—</span>
                    )}
                    <p className="mt-0.5 text-[11px] text-fg-subtle">
                      {cat ? (ar ? cat.labelAr : cat.labelEn) : r.accountId?.category || ''}
                      {r.accountId?.ownerName ? ` · ${r.accountId.ownerName}` : ''}
                    </p>
                  </Td>
                  <Td>
                    <p className="max-w-md text-sm text-fg">{r.body || '—'}</p>
                    {r.outcome && (
                      <p className="mt-1 max-w-md rounded-lg bg-surface-2 px-2.5 py-1.5 text-xs text-fg-muted">
                        {tx('Outcome')}: {r.outcome}
                      </p>
                    )}
                  </Td>
                  <Td><span className="text-xs text-fg-muted">{r.byName || '—'}</span></Td>
                  <Td align="center">
                    <span className="text-xs text-fg-muted">
                      {new Date(r.at).toLocaleDateString(ar ? 'ar-SA' : 'en-GB', {
                        day: 'numeric', month: 'short', year: 'numeric',
                      })}
                    </span>
                  </Td>
                  <Td align="center">
                    {r.done ? (
                      <Badge tone="ok">{tx('Handled')}</Badge>
                    ) : (
                      <Badge tone="warn">{tx('Open')}</Badge>
                    )}
                  </Td>
                  <Td align="end">
                    {!r.done && (
                      <Button
                        variant="outline"
                        size="sm"
                        icon={Check}
                        onClick={() => { setResolving(r); setOutcome(''); }}
                      >
                        {tx('Mark handled')}
                      </Button>
                    )}
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </DataTable>
      )}

      <Modal
        open={!!resolving}
        onClose={() => setResolving(null)}
        title={tx('Mark handled')}
        subtitle={resolving?.accountId ? pick(resolving.accountId.name, resolving.accountId.nameAr) : undefined}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setResolving(null)}>{tx('Cancel')}</Button>
            <Button onClick={markHandled} loading={saving}>{tx('Save')}</Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="rounded-lg bg-surface-2 px-3 py-2 text-sm text-fg-muted">{resolving?.body}</p>
          <Field
            label={tx('What was done about it')}
            hint={tx('Written beside what they said, not instead of it.')}
          >
            <TextArea rows={4} value={outcome} onChange={(e) => setOutcome(e.target.value)} autoFocus />
          </Field>
        </div>
      </Modal>
    </div>
  );
}

function Tile({
  icon: Icon, value, label, note, tone = 'neutral',
}: {
  icon: React.ElementType; value: number; label: string; note: string;
  tone?: 'neutral' | 'ok' | 'warn' | 'danger';
}) {
  const ring =
    tone === 'ok' ? 'border-ok' : tone === 'warn' ? 'border-warn' : tone === 'danger' ? 'border-danger' : 'border-line';
  return (
    <div className={`rounded-xl border ${ring} bg-surface p-4`}>
      <Icon size={15} className="mb-2 text-fg-subtle" />
      <p className="text-2xl font-bold text-fg">{value}</p>
      <p className="mt-0.5 text-[11px] font-medium leading-snug text-fg">{label}</p>
      <p className="mt-0.5 text-[11px] leading-snug text-fg-subtle">{note}</p>
    </div>
  );
}
