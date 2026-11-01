'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, ChevronDown, Clock3, ExternalLink, Globe, History, Monitor, User as UserIcon } from 'lucide-react';
import { Badge, Button, Card, ErrorNote, Modal, SectionTitle, Spinner } from '@/components/admin/ui';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePermission } from '@/contexts/AuthContext';
import { useApi } from '@/lib/useApi';
import { roleLabel } from '@/lib/roles';
import {
  describe, deviceText, entityName, fieldLabel, headlineChanges, recordHref, subjectTitle, valueText,
} from '@/lib/audit/describe';

/**
 * Reading the audit log: the shared vocabulary, the detail of one entry, and the
 * short history shown on a record's own page.
 */

export interface AuditChange { field: string; from?: unknown; to?: unknown; fromLabel?: string; toLabel?: string }

export interface AuditSubject { field: string; model: string; id: string; label?: string; role?: string }

export interface AuditRow {
  _id: string;
  actorName?: string;
  actorEmail?: string;
  actorRole?: string;
  action: string;
  entity: string;
  entityId?: string;
  entityLabel?: string;
  entityRole?: string;
  subjects?: AuditSubject[];
  changes?: AuditChange[];
  truncated?: boolean;
  outcome?: string;
  error?: string;
  method?: string;
  path?: string;
  status?: number;
  durationMs?: number;
  ip?: string;
  userAgent?: string;
  body?: unknown;
  details?: unknown;
  createdAt: string;
  related?: Array<{ _id: string; action: string; entity: string; entityLabel?: string; entityId?: string }>;
  userId?: string;
}

type Tone = 'neutral' | 'brand' | 'accent' | 'ok' | 'warn' | 'danger' | 'info';

const ACTIONS: Record<string, { en: string; ar: string; tone: Tone }> = {
  create: { en: 'Created', ar: 'إضافة', tone: 'ok' },
  update: { en: 'Changed', ar: 'تعديل', tone: 'info' },
  delete: { en: 'Deleted', ar: 'حذف', tone: 'danger' },
  login: { en: 'Signed in', ar: 'تسجيل دخول', tone: 'brand' },
  login_failed: { en: 'Failed sign-in', ar: 'محاولة دخول فاشلة', tone: 'warn' },
  logout: { en: 'Signed out', ar: 'تسجيل خروج', tone: 'neutral' },
  export: { en: 'Exported', ar: 'تصدير', tone: 'accent' },
  upload: { en: 'Uploaded', ar: 'رفع ملف', tone: 'accent' },
  request: { en: 'Request', ar: 'طلب', tone: 'neutral' },
  'role.permissions.update': { en: 'Permissions changed', ar: 'تعديل الصلاحيات', tone: 'warn' },
  'role.permissions.reset': { en: 'Permissions reset', ar: 'إعادة ضبط الصلاحيات', tone: 'warn' },
};

export const ACTION_KEYS = ['create', 'update', 'delete', 'login', 'login_failed', 'logout', 'export', 'upload'];

export function useAuditWords() {
  const { locale } = useLanguage();
  const ar = locale === 'ar';
  return {
    action: (key: string) => {
      const m = ACTIONS[key];
      return { label: m ? (ar ? m.ar : m.en) : key.replace(/_/g, ' '), tone: m?.tone ?? ('neutral' as Tone) };
    },
    entity: (key: string) => entityName(key, locale),
    time: (d: string) =>
      new Date(d).toLocaleTimeString(ar ? 'ar-EG' : 'en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    day: (d: string) =>
      new Date(d).toLocaleDateString(ar ? 'ar-EG' : 'en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
    when: (d: string) =>
      new Date(d).toLocaleString(ar ? 'ar-EG' : 'en-GB', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
      }),
  };
}

export function OutcomeBadge({ outcome }: { outcome?: string }) {
  const { tx } = useLanguage();
  if (outcome === 'denied') return <Badge tone="danger">{tx('Denied')}</Badge>;
  if (outcome === 'failed') return <Badge tone="warn">{tx('Failed')}</Badge>;
  return <Badge tone="ok">{tx('Success')}</Badge>;
}

/** For a list of plain values, what was added and removed reads better than two lists. */
function ListChange({ from, to }: { from: unknown[]; to: unknown[] }) {
  const { tx } = useLanguage();
  const added = to.filter((x) => !from.includes(x));
  const removed = from.filter((x) => !to.includes(x));
  return (
    <div className="space-y-1">
      {added.length > 0 && <p className="text-ok-soft-fg"><b>{tx('Added')}:</b> {added.map(String).join('، ')}</p>}
      {removed.length > 0 && <p className="text-danger-soft-fg"><b>{tx('Removed')}:</b> {removed.map(String).join('، ')}</p>}
      {added.length === 0 && removed.length === 0 && <p className="text-fg-muted">{tx('Order changed')}</p>}
    </div>
  );
}

export function ChangesTable({ changes, action }: { changes: AuditChange[]; action: string }) {
  const { tx, locale } = useLanguage();
  return (
    <div className="scroll-thin overflow-x-auto rounded-lg border border-line">
      <table className="w-full min-w-[32rem] text-xs">
        <thead className="bg-surface-2 text-fg-muted">
          <tr>
            <th className="px-3 py-2 text-start font-semibold">{tx('Field')}</th>
            {action !== 'create' && <th className="px-3 py-2 text-start font-semibold">{tx('Before')}</th>}
            {action !== 'delete' && <th className="px-3 py-2 text-start font-semibold">{tx('After')}</th>}
          </tr>
        </thead>
        <tbody>
          {changes.map((c) => {
            const lists = !c.toLabel && !c.fromLabel && (Array.isArray(c.from) || Array.isArray(c.to));
            return (
              <tr key={c.field} className="border-t border-line align-top">
                <td className="px-3 py-2">
                  <p className="font-medium text-fg">{fieldLabel(c.field, locale)}</p>
                  <p dir="ltr" className="text-start font-mono text-[10px] text-fg-subtle">{c.field}</p>
                </td>
                {lists && action === 'update' ? (
                  <td colSpan={2} className="px-3 py-2">
                    <ListChange from={(c.from as unknown[]) || []} to={(c.to as unknown[]) || []} />
                  </td>
                ) : (
                  <>
                    {action !== 'create' && <td className="max-w-xs break-words px-3 py-2 text-danger-soft-fg">{valueText(c.field, c.from, locale, c.fromLabel)}</td>}
                    {action !== 'delete' && <td className="max-w-xs break-words px-3 py-2 text-ok-soft-fg">{valueText(c.field, c.to, locale, c.toLabel)}</td>}
                  </>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** The record an entry is about, as a link when it has a page. */
function RecordName({ row, text }: { row: AuditRow; text?: string }) {
  if (!text) return null;
  const href = recordHref(row.entity, row.entityId, row.entityRole);
  if (!href || row.action === 'delete') return <b className="font-semibold text-fg">{text}</b>;
  return (
    <Link href={href} onClick={(e) => e.stopPropagation()} className="font-semibold text-fg underline decoration-line underline-offset-2 hover:decoration-fg">
      {text}
    </Link>
  );
}

function SubjectChip({ s, onFocus }: { s: AuditSubject; onFocus?: (s: AuditSubject) => void }) {
  const { tx, locale } = useLanguage();
  const href = recordHref(s.model, s.id, s.role);
  return (
    <span className="inline-flex max-w-full items-center gap-1 rounded-full bg-surface-2 px-2.5 py-0.5 text-[11px]">
      <button
        type="button"
        title={tx('Everything concerning this')}
        onClick={(e) => { e.stopPropagation(); onFocus?.(s); }}
        className="min-w-0 truncate text-fg-muted hover:text-fg"
      >
        {subjectTitle(s, locale)}: <b className="font-semibold text-fg">{s.label}</b>
      </button>
      {href && (
        <Link href={href} onClick={(e) => e.stopPropagation()} aria-label={tx('Open')} className="shrink-0 text-fg-subtle hover:text-fg">
          <ExternalLink size={11} />
        </Link>
      )}
    </span>
  );
}

const SHOWN_CHANGES = 4;

/** One thing that happened, in a sentence: who, what, to whom, and each value that moved. */
export function AuditEntry({
  row, onOpen, onFocus, onActor,
}: {
  row: AuditRow;
  onOpen: (id: string) => void;
  onFocus?: (s: AuditSubject) => void;
  onActor?: (row: AuditRow) => void;
}) {
  const { tx, locale } = useLanguage();
  const words = useAuditWords();
  const { what, target, note } = describe(row, locale);
  const lines = row.action === 'update' ? headlineChanges(row.changes) : [];
  const created = row.action === 'create' || row.action === 'delete' ? headlineChanges(row.changes).length : 0;
  const actor = row.actorName || tx('Visitor (not signed in)');

  return (
    <li>
      <div
        role="button"
        tabIndex={0}
        onClick={() => onOpen(row._id)}
        onKeyDown={(e) => e.key === 'Enter' && onOpen(row._id)}
        className="flex w-full cursor-pointer gap-3 px-4 py-3 text-start hover:bg-surface-2/60 focus:bg-surface-2/60 focus:outline-none"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-soft text-sm font-bold text-brand-soft-fg">
          {actor.charAt(0).toUpperCase()}
        </span>

        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <button
              type="button"
              disabled={!onActor || !row.userId}
              onClick={(e) => { e.stopPropagation(); onActor?.(row); }}
              className="text-sm font-semibold text-fg enabled:hover:underline"
            >
              {actor}
            </button>
            {row.actorRole && <span className="text-[11px] text-fg-muted">{roleLabel(row.actorRole, locale)}</span>}
            <span className="ms-auto whitespace-nowrap text-[11px] text-fg-subtle" title={words.when(row.createdAt)}>{words.time(row.createdAt)}</span>
          </div>

          <p className="text-sm text-fg-muted">
            {what} <RecordName row={row} text={target} />
            {note && <span className="text-fg-subtle"> · {note}</span>}
          </p>

          {lines.length > 0 && (
            <ul className="space-y-0.5 border-s-2 border-line ps-3">
              {lines.slice(0, SHOWN_CHANGES).map((c) => (
                <li key={c.field} className="break-words text-xs text-fg-muted">
                  <span className="font-medium text-fg">{fieldLabel(c.field, locale)}:</span>{' '}
                  {c.from === null || c.from === undefined || c.from === '' ? (
                    <span className="text-ok-soft-fg">{valueText(c.field, c.to, locale, c.toLabel)}</span>
                  ) : (
                    <>
                      <span className="text-danger-soft-fg line-through decoration-1">{valueText(c.field, c.from, locale, c.fromLabel)}</span>
                      <ArrowRight size={11} className="rtl-flip mx-1 inline text-fg-subtle" />
                      <span className="text-ok-soft-fg">{valueText(c.field, c.to, locale, c.toLabel)}</span>
                    </>
                  )}
                </li>
              ))}
              {lines.length > SHOWN_CHANGES && (
                <li className="text-[11px] text-fg-subtle">+{lines.length - SHOWN_CHANGES} {tx('more fields')}</li>
              )}
            </ul>
          )}
          {created > 0 && <p className="text-[11px] text-fg-subtle">{created} {tx('fields recorded')}</p>}

          {row.error && <p className="text-xs text-danger-soft-fg">{tx(row.error)}</p>}

          {(!!row.subjects?.length || row.outcome === 'denied' || row.outcome === 'failed') && (
            <div className="flex flex-wrap items-center gap-1.5">
              {(row.outcome === 'denied' || row.outcome === 'failed') && <OutcomeBadge outcome={row.outcome} />}
              {row.subjects?.map((s) => <SubjectChip key={`${s.field}${s.id}`} s={s} onFocus={onFocus} />)}
            </div>
          )}
        </div>
      </div>
    </li>
  );
}

function Fact({ icon: Icon, label, children }: { icon: typeof Globe; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 rounded-lg bg-surface-2 p-2.5">
      <Icon size={14} className="mt-0.5 shrink-0 text-fg-muted" />
      <div className="min-w-0">
        <p className="text-[11px] text-fg-muted">{label}</p>
        <div className="break-words text-xs text-fg">{children}</div>
      </div>
    </div>
  );
}

export function AuditDetail({
  id, onClose, onOpen, onHistory,
}: {
  id: string | null;
  onClose: () => void;
  onOpen: (id: string) => void;
  /** Filter the log to this record, on the screen that has filters. */
  onHistory?: (id: string, label?: string) => void;
}) {
  const { tx, locale } = useLanguage();
  const words = useAuditWords();
  const [row, setRow] = useState<AuditRow | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let live = true;
    fetch(`/api/audit/${id}`, { cache: 'no-store' })
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || 'Could not load this entry');
        if (live) { setRow(d); setError(null); }
      })
      .catch((e) => { if (live) setError(e.message); });
    return () => { live = false; setRow(null); };
  }, [id]);

  const sentence = row ? describe(row, locale) : null;

  return (
    <Modal
      open={!!id}
      onClose={onClose}
      size="xl"
      title={sentence ? [sentence.what, sentence.target].filter(Boolean).join(' ') : tx('Entry details')}
      subtitle={sentence?.note}
      footer={<Button variant="ghost" onClick={onClose}>{tx('Close')}</Button>}
    >
      {error && <ErrorNote>{error}</ErrorNote>}
      {!row && !error && <Spinner />}
      {row && (
        <div className="space-y-5">
          <div className="grid gap-2 sm:grid-cols-2">
            <Fact icon={UserIcon} label={tx('Who')}>
              {row.actorName || tx('Visitor (not signed in)')}
              {row.actorEmail && <span className="text-fg-muted"> · {row.actorEmail}</span>}
              {row.actorRole && <span className="text-fg-muted"> · {roleLabel(row.actorRole, locale)}</span>}
            </Fact>
            <Fact icon={Clock3} label={tx('When')}>{words.when(row.createdAt)}</Fact>
            <Fact icon={Globe} label={tx('From')}>{row.ip || '—'}</Fact>
            <Fact icon={Monitor} label={tx('Device')}>
              <span title={row.userAgent}>{deviceText(row.userAgent, locale)}</span>
            </Fact>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <OutcomeBadge outcome={row.outcome} />
            {row.status && <Badge>HTTP {row.status}</Badge>}
            {row.durationMs !== undefined && <Badge>{row.durationMs} ms</Badge>}
            {onHistory && row.entityId && (
              <Button variant="outline" icon={History} onClick={() => onHistory(row.entityId as string, row.entityLabel)}>
                {tx('Full history of this record')}
              </Button>
            )}
          </div>

          {row.error && <ErrorNote>{tx(row.error)}</ErrorNote>}

          {!!row.subjects?.length && (
            <div>
              <SectionTitle title={tx('Concerning')} />
              <div className="flex flex-wrap gap-1.5">
                {row.subjects.map((s) => <SubjectChip key={`${s.field}${s.id}`} s={s} onFocus={onHistory ? (x) => onHistory(x.id, x.label) : undefined} />)}
              </div>
            </div>
          )}

          {row.changes && row.changes.length > 0 && (
            <div>
              <SectionTitle title={tx('What changed')} />
              <ChangesTable changes={row.changes} action={row.action} />
              {row.truncated && <p className="mt-2 text-xs text-fg-muted">{tx('More fields changed than one entry keeps.')}</p>}
            </div>
          )}

          {row.related && row.related.length > 0 && (
            <div>
              <SectionTitle title={tx('Done in the same action')} />
              <ul className="space-y-1">
                {row.related.map((r) => (
                  <li key={r._id}>
                    <button type="button" onClick={() => onOpen(r._id)} className="flex items-center gap-2 text-xs text-fg-muted hover:text-fg">
                      <ArrowRight size={12} className="rtl-flip" />
                      {[describe(r, locale).what, describe(r, locale).target].filter(Boolean).join(' ')}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {row.details !== undefined && row.details !== null && (
            <div>
              <SectionTitle title={tx('Details')} />
              <pre dir="ltr" className="scroll-thin max-h-48 overflow-auto rounded-lg bg-surface-2 p-3 text-[11px] text-fg">{JSON.stringify(row.details, null, 2)}</pre>
            </div>
          )}

          {row.method && (
            <details className="group rounded-lg border border-line p-3">
              <summary className="flex cursor-pointer list-none items-center gap-2 text-xs font-semibold text-fg-muted">
                <ChevronDown size={13} className="transition-transform group-open:rotate-180" />
                {tx('Technical details')}
              </summary>
              <p dir="ltr" className="mb-2 mt-3 break-all text-start font-mono text-[11px] text-fg-muted">{row.method} {row.path}</p>
              {row.body !== undefined && row.body !== null && (
                <pre dir="ltr" className="scroll-thin max-h-60 overflow-auto rounded-lg bg-surface-2 p-3 text-start text-[11px] text-fg">{JSON.stringify(row.body, null, 2)}</pre>
              )}
            </details>
          )}
        </div>
      )}
    </Modal>
  );
}

/** Everything concerning this record, on its own page. Hidden without audit.view. */
export function AuditTrail({ entityId }: { entityId: string }) {
  const { can } = usePermission();
  const allowed = can('audit.view');
  const { tx } = useLanguage();
  const [open, setOpen] = useState<string | null>(null);
  const { data, ready } = useApi<{ items: AuditRow[]; total: number }>(
    allowed ? `/api/audit?subject=${entityId}&limit=30` : null
  );

  if (!allowed) return null;

  return (
    <Card>
      <div className="mb-2 flex items-center justify-between gap-3">
        <SectionTitle title={tx('Change history')} />
        {!!data?.total && (
          <Link href={`/admin/audit?subject=${entityId}`} className="inline-flex items-center gap-1 text-xs text-fg-muted hover:text-fg">
            <History size={13} /> {data.total} {tx('entries')}
          </Link>
        )}
      </div>
      {!ready && <Spinner />}
      {ready && !data?.items.length && <p className="text-sm text-fg-muted">{tx('Nothing has been recorded for this yet.')}</p>}
      <ul className="-mx-5 divide-y divide-line">
        {data?.items.map((r) => <AuditEntry key={r._id} row={r} onOpen={setOpen} />)}
      </ul>
      <AuditDetail id={open} onClose={() => setOpen(null)} onOpen={setOpen} />
    </Card>
  );
}
