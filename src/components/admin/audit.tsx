'use client';

import { useEffect, useState } from 'react';
import { ArrowRight, Clock3, Globe, History, Monitor, User as UserIcon } from 'lucide-react';
import { Badge, Button, Card, ErrorNote, Modal, SectionTitle, Spinner } from '@/components/admin/ui';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePermission } from '@/contexts/AuthContext';
import { useApi } from '@/lib/useApi';
import { roleLabel } from '@/lib/roles';

/**
 * Reading the audit log: the shared vocabulary, the detail of one entry, and the
 * short history shown on a record's own page.
 */

export interface AuditChange { field: string; from?: unknown; to?: unknown }

export interface AuditRow {
  _id: string;
  actorName?: string;
  actorEmail?: string;
  actorRole?: string;
  action: string;
  entity: string;
  entityId?: string;
  entityLabel?: string;
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

const ENTITIES: Record<string, [string, string]> = {
  User: ['User', 'مستخدم'], Order: ['Order', 'طلب'], Invoice: ['Invoice', 'فاتورة'],
  Payment: ['Payment', 'دفعة'], Expense: ['Expense', 'مصروف'],
  CrmAccount: ['CRM account', 'حساب CRM'], CrmActivity: ['CRM activity', 'نشاط CRM'],
  CrmTarget: ['CRM targets', 'مستهدفات CRM'], CrmVisitPlan: ['Journey plan', 'خطة الزيارات'],
  CustomerActivity: ['Customer activity', 'نشاط عميل'], ProductCode: ['Product code', 'كود منتج'],
  InventoryItem: ['Inventory item', 'صنف مخزون'], InventoryMovement: ['Stock movement', 'حركة مخزون'],
  PromoCode: ['Promo code', 'كود خصم'], Referral: ['Referral', 'إحالة'],
  RolePermission: ['Role permissions', 'صلاحيات دور'], SiteSettings: ['Site settings', 'إعدادات الموقع'],
  Session: ['Session', 'جلسة'], File: ['File', 'ملف'], Category: ['Category', 'قسم'],
  CrmReport: ['CRM report', 'تقرير CRM'], AuditLog: ['Audit log', 'سجل المراجعة'],
};

export function useAuditWords() {
  const { locale } = useLanguage();
  const ar = locale === 'ar';
  return {
    action: (key: string) => {
      const m = ACTIONS[key];
      return { label: m ? (ar ? m.ar : m.en) : key.replace(/_/g, ' '), tone: m?.tone ?? ('neutral' as Tone) };
    },
    entity: (key: string) => (ENTITIES[key] ? ENTITIES[key][ar ? 1 : 0] : key),
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

function show(v: unknown): string {
  if (v === null || v === undefined || v === '') return '—';
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (typeof v === 'object') return JSON.stringify(v);
  const text = String(v);
  return /^\d{4}-\d{2}-\d{2}T[\d:.]+Z$/.test(text) ? new Date(text).toLocaleString() : text;
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
  const { tx } = useLanguage();
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
            const lists = Array.isArray(c.from ?? []) && Array.isArray(c.to ?? []) && (Array.isArray(c.from) || Array.isArray(c.to));
            return (
              <tr key={c.field} className="border-t border-line align-top">
                <td className="px-3 py-2 font-mono text-[11px] text-fg" dir="ltr">{c.field}</td>
                {lists && action === 'update' ? (
                  <td colSpan={2} className="px-3 py-2">
                    <ListChange from={(c.from as unknown[]) || []} to={(c.to as unknown[]) || []} />
                  </td>
                ) : (
                  <>
                    {action !== 'create' && <td className="max-w-xs break-words px-3 py-2 text-danger-soft-fg">{show(c.from)}</td>}
                    {action !== 'delete' && <td className="max-w-xs break-words px-3 py-2 text-ok-soft-fg">{show(c.to)}</td>}
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
  onHistory?: (entity: string, entityId: string) => void;
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

  const action = row ? words.action(row.action) : null;

  return (
    <Modal
      open={!!id}
      onClose={onClose}
      size="xl"
      title={row ? `${action?.label} · ${words.entity(row.entity)}` : tx('Entry details')}
      subtitle={row?.entityLabel}
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
            <Fact icon={Monitor} label={tx('Device')}>{row.userAgent || '—'}</Fact>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <OutcomeBadge outcome={row.outcome} />
            {row.status && <Badge>HTTP {row.status}</Badge>}
            {row.durationMs !== undefined && <Badge>{row.durationMs} ms</Badge>}
            {onHistory && row.entityId && (
              <Button variant="outline" icon={History} onClick={() => onHistory(row.entity, row.entityId as string)}>
                {tx('Full history of this record')}
              </Button>
            )}
          </div>

          {row.error && <ErrorNote>{row.error}</ErrorNote>}

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
                      {words.action(r.action).label} · {words.entity(r.entity)} {r.entityLabel && `· ${r.entityLabel}`}
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
            <div>
              <SectionTitle title={tx('The request')} />
              <p dir="ltr" className="mb-2 break-all font-mono text-[11px] text-fg-muted">{row.method} {row.path}</p>
              {row.body !== undefined && row.body !== null && (
                <pre dir="ltr" className="scroll-thin max-h-60 overflow-auto rounded-lg bg-surface-2 p-3 text-[11px] text-fg">{JSON.stringify(row.body, null, 2)}</pre>
              )}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

/** Who has touched this record, on the record's own page. Hidden without audit.view. */
export function AuditTrail({ entity, entityId }: { entity: string; entityId: string }) {
  const { can } = usePermission();
  const allowed = can('audit.view');
  const { tx } = useLanguage();
  const words = useAuditWords();
  const [open, setOpen] = useState<string | null>(null);
  const { data, ready } = useApi<{ items: AuditRow[] }>(
    allowed ? `/api/audit?entity=${entity}&entityId=${entityId}&limit=25` : null
  );

  if (!allowed) return null;

  return (
    <Card>
      <SectionTitle title={tx('Change history')} />
      {!ready && <Spinner />}
      {ready && !data?.items.length && <p className="text-sm text-fg-muted">{tx('Nothing has been recorded for this yet.')}</p>}
      <ul className="divide-y divide-line">
        {data?.items.map((r) => {
          const a = words.action(r.action);
          return (
            <li key={r._id}>
              <button type="button" onClick={() => setOpen(r._id)} className="flex w-full flex-wrap items-center gap-2 py-2 text-start text-xs hover:bg-surface-2">
                <Badge tone={a.tone}>{a.label}</Badge>
                <span className="font-medium text-fg">{r.actorName || tx('Visitor (not signed in)')}</span>
                {r.changes && r.changes.length > 0 && (
                  <span dir="ltr" className="min-w-0 truncate font-mono text-[11px] text-fg-muted">
                    {r.changes.slice(0, 3).map((c) => c.field).join(', ')}
                    {r.changes.length > 3 && ` +${r.changes.length - 3}`}
                  </span>
                )}
                <span className="ms-auto text-fg-subtle">{words.when(r.createdAt)}</span>
              </button>
            </li>
          );
        })}
      </ul>
      <AuditDetail id={open} onClose={() => setOpen(null)} onOpen={setOpen} />
    </Card>
  );
}
