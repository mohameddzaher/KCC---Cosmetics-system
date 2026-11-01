'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight, Download, History, Search, ShieldX, X } from 'lucide-react';
import {
  AutoGrid, Badge, Button, Card, DataTable, EmptyState, ErrorNote, Field, PageHeader,
  PageSkeleton, Select, Spinner, Td, TextInput, Th,
} from '@/components/admin/ui';
import RequirePermission from '@/components/admin/RequirePermission';
import { ACTION_KEYS, AuditDetail, OutcomeBadge, useAuditWords, type AuditRow } from '@/components/admin/audit';
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
  const [entityId, setEntityId] = useState(params.get('entityId') || '');
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
    if (entityId) p.set('entityId', entityId);
    if (action !== 'all') p.set('action', action);
    if (outcome !== 'all') p.set('outcome', outcome);
    if (from) p.set('from', from);
    if (to) p.set('to', to);
    return p;
  }, [q, userId, entity, entityId, action, outcome, from, to]);

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
    setQ(''); setUserId('all'); setEntity('all'); setEntityId('');
    setAction('all'); setOutcome('all'); setFrom(''); setTo(''); setPage(1);
  }

  if (!ready) return <PageSkeleton tiles={3} rows={10} />;

  const items = data?.items ?? [];
  const pages = data?.pages ?? 1;

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
                placeholder={tx('Record, person, field, IP…')}
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
            <Select value={entity} onChange={(e) => { filter(setEntity)(e.target.value); setEntityId(''); }}>
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
        {entityId && (
          <p className="mt-3 text-xs text-fg-muted">
            {tx('Showing the history of one record.')}{' '}
            <button type="button" className="underline" onClick={() => filter(setEntityId)('')}>{tx('Show all')}</button>
          </p>
        )}
      </Card>

      {items.length === 0 ? (
        <EmptyState icon={History} title={tx('Nothing matches these filters')} />
      ) : (
        <DataTable>
          <thead>
            <tr>
              <Th>{tx('When')}</Th>
              <Th>{tx('Who')}</Th>
              <Th>{tx('Action')}</Th>
              <Th>{tx('Record')}</Th>
              <Th>{tx('What changed')}</Th>
              <Th>{tx('Result')}</Th>
              <Th>IP</Th>
            </tr>
          </thead>
          <tbody>
            {items.map((r) => {
              const a = words.action(r.action);
              return (
                <tr key={r._id} onClick={() => setOpen(r._id)} className="cursor-pointer border-t border-line hover:bg-surface-2">
                  <Td className="whitespace-nowrap text-xs text-fg-muted">{words.when(r.createdAt)}</Td>
                  <Td>
                    <p className="font-medium text-fg">{r.actorName || tx('Visitor (not signed in)')}</p>
                    {r.actorEmail && <p className="text-[11px] text-fg-subtle">{r.actorEmail}</p>}
                  </Td>
                  <Td><Badge tone={a.tone}>{a.label}</Badge></Td>
                  <Td>
                    <p className="text-fg">{words.entity(r.entity)}</p>
                    {r.entityLabel && <p className="max-w-[14rem] truncate text-[11px] text-fg-subtle">{r.entityLabel}</p>}
                  </Td>
                  <Td>
                    {r.changes && r.changes.length > 0 ? (
                      <p dir="ltr" className="max-w-[18rem] truncate text-start font-mono text-[11px] text-fg-muted">
                        {r.changes.slice(0, 4).map((c) => c.field).join(', ')}
                        {r.changes.length > 4 && ` +${r.changes.length - 4}`}
                      </p>
                    ) : (
                      <span className="text-fg-subtle">{r.error ? <span className="text-danger-soft-fg">{r.error}</span> : '—'}</span>
                    )}
                  </Td>
                  <Td><OutcomeBadge outcome={r.outcome} /></Td>
                  <Td className="whitespace-nowrap font-mono text-[11px] text-fg-muted">{r.ip || '—'}</Td>
                </tr>
              );
            })}
          </tbody>
        </DataTable>
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
        onHistory={(e, id) => { setEntity(e); setEntityId(id); setPage(1); setOpen(null); }}
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
