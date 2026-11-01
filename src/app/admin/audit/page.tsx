'use client';

import { Fragment, Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight, Download, History, Search, ShieldX, X } from 'lucide-react';
import {
  AutoGrid, Button, Card, EmptyState, ErrorNote, Field, PageHeader,
  PageSkeleton, Select, Spinner, TextInput,
} from '@/components/admin/ui';
import RequirePermission from '@/components/admin/RequirePermission';
import { ACTION_KEYS, AuditDetail, AuditEntry, useAuditWords, type AuditRow } from '@/components/admin/audit';
import { useLanguage } from '@/contexts/LanguageContext';
import { downloadFile } from '@/lib/download';
import { useApi } from '@/lib/useApi';

/**
 * Who did what in the system. Read-only by design: nothing on this screen, and
 * no route behind it, can change an entry.
 */

interface Payload {
  items: AuditRow[];
  total: number;
  pages: number;
  entities: string[];
  actors: Array<{ id: string; name: string }>;
  lastDay: Record<string, number>;
}

const PAGE_SIZE = 50;

function AuditInner() {
  const { t, tx } = useLanguage();
  const words = useAuditWords();
  const params = useSearchParams();

  const [q, setQ] = useState('');
  const [userId, setUserId] = useState('all');
  const [entity, setEntity] = useState(params.get('entity') || 'all');
  /** One record, followed through everything that touched it. */
  const [focus, setFocus] = useState<{ id: string; label?: string } | null>(
    params.get('subject') ? { id: params.get('subject') as string } : null
  );
  const [action, setAction] = useState('all');
  const [outcome, setOutcome] = useState('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  const filters = useMemo(() => {
    const p = new URLSearchParams();
    if (q.trim()) p.set('q', q.trim());
    if (userId !== 'all') p.set('userId', userId);
    if (entity !== 'all') p.set('entity', entity);
    if (focus) p.set('subject', focus.id);
    if (action !== 'all') p.set('action', action);
    if (outcome !== 'all') p.set('outcome', outcome);
    if (from) p.set('from', from);
    if (to) p.set('to', to);
    return p;
  }, [q, userId, entity, focus, action, outcome, from, to]);

  const makeUrl = () => {
    const p = new URLSearchParams(filters);
    p.set('page', String(page));
    p.set('limit', String(PAGE_SIZE));
    return `/api/audit?${p}`;
  };
  const [url, setUrl] = useState(makeUrl);
  useEffect(() => {
    const timer = setTimeout(() => setUrl(makeUrl()), q ? 300 : 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, page]);

  const { data, ready, error, fetching } = useApi<Payload>(url, { poll: 30000 });

  /** Any new filter starts again from the newest rows. */
  function filter<T>(set: (v: T) => void) {
    return (v: T) => { set(v); setPage(1); };
  }

  function clearFilters() {
    setQ(''); setUserId('all'); setEntity('all'); setFocus(null);
    setAction('all'); setOutcome('all'); setFrom(''); setTo(''); setPage(1);
  }

  if (!ready) return <PageSkeleton tiles={3} rows={10} />;

  const items = data?.items ?? [];
  const pages = data?.pages ?? 1;
  const person = data?.actors.find((a) => a.id === userId);

  /** Newest first, broken by the person's own calendar day. */
  const days = [...items.reduce((m, r) => {
    const key = new Date(r.createdAt).toDateString();
    m.set(key, [...(m.get(key) || []), r]);
    return m;
  }, new Map<string, AuditRow[]>())];

  return (
    <div>
      <PageHeader
        title={t('admin.audit')}
        subtitle={tx('Every change made in the system: who made it, when, from where, and exactly what it changed.')}
        actions={
          <Button
            variant="outline"
            icon={Download}
            onClick={() => {
              setExportError(null);
              downloadFile(`/api/audit/export?${filters}`, 'kcc-audit-log.xlsx').catch((e) => setExportError(e.message));
            }}
          >
            {tx('Export to Excel')}
          </Button>
        }
      />

      {(error || exportError) && <div className="mb-4"><ErrorNote>{exportError || error}</ErrorNote></div>}

      <AutoGrid min="12rem" className="mb-4">
        {[
          { label: tx('Succeeded, last 24 hours'), n: data?.lastDay.success, icon: CheckCircle2, tone: 'text-ok-soft-fg', set: 'success' },
          { label: tx('Denied, last 24 hours'), n: data?.lastDay.denied, icon: ShieldX, tone: 'text-danger-soft-fg', set: 'denied' },
          { label: tx('Failed, last 24 hours'), n: data?.lastDay.failed, icon: AlertTriangle, tone: 'text-warn-soft-fg', set: 'failed' },
        ].map((s) => (
          <button key={s.set} type="button" onClick={() => filter(setOutcome)(s.set)} className="text-start">
            <Card className="flex items-center gap-3">
              <s.icon size={20} className={s.tone} />
              <div>
                <p className="text-xl font-bold text-fg">{s.n ?? 0}</p>
                <p className="text-xs text-fg-muted">{s.label}</p>
              </div>
            </Card>
          </button>
        ))}
      </AutoGrid>

      <Card className="mb-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label={tx('Search')}>
            <div className="relative">
              <Search size={13} className="absolute start-3 top-1/2 -translate-y-1/2 text-fg-subtle" />
              <TextInput
                value={q}
                onChange={(e) => filter(setQ)(e.target.value)}
                placeholder={tx('Customer, order, product, person, IP…')}
                className="ps-10 text-sm"
              />
            </div>
          </Field>
          <Field label={tx('Who')}>
            <Select value={userId} onChange={(e) => filter(setUserId)(e.target.value)}>
              <option value="all">{tx('Everyone')}</option>
              {data?.actors.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </Select>
          </Field>
          <Field label={tx('Action')}>
            <Select value={action} onChange={(e) => filter(setAction)(e.target.value)}>
              <option value="all">{tx('All actions')}</option>
              {ACTION_KEYS.map((a) => <option key={a} value={a}>{words.action(a).label}</option>)}
            </Select>
          </Field>
          <Field label={tx('Record type')}>
            <Select value={entity} onChange={(e) => filter(setEntity)(e.target.value)}>
              <option value="all">{tx('All types')}</option>
              {data?.entities.map((e) => <option key={e} value={e}>{words.entity(e)}</option>)}
            </Select>
          </Field>
          <Field label={tx('Result')}>
            <Select value={outcome} onChange={(e) => filter(setOutcome)(e.target.value)}>
              <option value="all">{tx('All results')}</option>
              <option value="success">{tx('Success')}</option>
              <option value="denied">{tx('Denied')}</option>
              <option value="failed">{tx('Failed')}</option>
            </Select>
          </Field>
          <Field label={tx('From date')}>
            <TextInput type="date" value={from} onChange={(e) => filter(setFrom)(e.target.value)} />
          </Field>
          <Field label={tx('To date')}>
            <TextInput type="date" value={to} onChange={(e) => filter(setTo)(e.target.value)} />
          </Field>
          <div className="flex items-end">
            <Button variant="ghost" icon={X} onClick={clearFilters}>{tx('Clear filters')}</Button>
          </div>
        </div>
        {(focus || person) && (
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3 text-xs text-fg-muted">
            {person && <span>{tx('Everything done by')} <b className="text-fg">{person.name}</b></span>}
            {focus && <span>{tx('Everything concerning')} <b className="text-fg">{focus.label || tx('this record')}</b></span>}
            <button type="button" className="underline" onClick={clearFilters}>{tx('Show all')}</button>
          </div>
        )}
      </Card>

      {items.length === 0 ? (
        <EmptyState icon={History} title={tx('Nothing matches these filters')} />
      ) : (
        <div className="overflow-hidden rounded-xl border border-line bg-surface">
          {days.map(([day, rows]) => (
            <Fragment key={day}>
              <div className="flex items-center justify-between border-b border-line bg-surface-2 px-4 py-2 text-xs font-semibold text-fg-muted">
                <span>{words.day(rows[0].createdAt)}</span>
                <span className="font-normal">{rows.length}</span>
              </div>
              <ul className="divide-y divide-line">
                {rows.map((r) => (
                  <AuditEntry
                    key={r._id}
                    row={r}
                    onOpen={setOpen}
                    onFocus={(s) => { setFocus({ id: s.id, label: s.label }); setPage(1); }}
                    onActor={(row) => { if (row.userId) filter(setUserId)(String(row.userId)); }}
                  />
                ))}
              </ul>
            </Fragment>
          ))}
        </div>
      )}

      <div className="mt-4 flex items-center justify-between gap-3 text-sm text-fg-muted">
        <span>{data?.total ?? 0} {tx('entries')}{fetching && ' …'}</span>
        <div className="flex items-center gap-2">
          <Button variant="outline" icon={ChevronLeft} disabled={page <= 1} onClick={() => setPage(page - 1)}>{tx('Previous')}</Button>
          <span>{page} / {Math.max(pages, 1)}</span>
          <Button variant="outline" icon={ChevronRight} disabled={page >= pages} onClick={() => setPage(page + 1)}>{tx('Next')}</Button>
        </div>
      </div>

      <AuditDetail
        id={open}
        onClose={() => setOpen(null)}
        onOpen={setOpen}
        onHistory={(id, label) => { setFocus({ id, label }); setPage(1); setOpen(null); }}
      />
    </div>
  );
}

export default function AuditPage() {
  return (
    <RequirePermission permission="audit.view">
      <Suspense fallback={<Spinner />}>
        <AuditInner />
      </Suspense>
    </RequirePermission>
  );
}
