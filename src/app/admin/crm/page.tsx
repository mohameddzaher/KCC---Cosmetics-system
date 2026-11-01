'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle, ArrowRight, Building2, CalendarCheck, ClipboardList, Download,
  Gauge, Printer, Target, TrendingUp, Users2,
} from 'lucide-react';
import {
  AutoGrid, Badge, Button, Card, ErrorNote, SectionTitle, Select, Spinner,
} from '@/components/admin/ui';
import { useLanguage } from '@/contexts/LanguageContext';
import { downloadCsv } from '@/lib/exportCsv';

/**
 * The CRM dashboard — every figure read from the accounts and their history.
 *
 * Nothing here is stored as a number: the upcoming tile IS a count of accounts
 * in the upcoming stage, so the dashboard and the lists can never tell
 * different stories. Each figure links to the rows behind it, because a number
 * management cannot open is a number they have to trust blindly.
 *
 * Magnitude is drawn in a single hue, deliberately. A dashboard of six coloured
 * palettes reads as decoration; one hue, longer bar = more, needs no legend and
 * cannot be misread by a colour-blind reader.
 */

interface Dash {
  totals: Record<string, number>;
  activity: { today: number; week: number; month: number; byType: Record<string, number>; undated: number };
  byCategory: Array<{ key: string; labelEn: string; labelAr: string; total: number; current: number; upcoming: number; worked: number }>;
  byCity: Array<{ key: string; labelEn: string; labelAr: string; total: number; current: number }>;
  funnel: Array<{ key: string; accounts: number }>;
  mix: Array<{ key: string; labelEn: string; labelAr: string; targetPct: number; actualPct: number; accounts: number }>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  recent: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  attention: any[];
  reps: Array<{ id: string; name: string; actions: number; visits: number; accounts: number }>;
  trend: Array<{ _id: string; n: number; visits: number }>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  targets: any;
  generatedAt: string;
}

const STEP_LABELS: Record<string, [string, string]> = {
  scheduled: ['Meeting scheduled', 'تحديد موعد'],
  introduced: ['KCC introduced', 'التعريف بـKCC'],
  accountInfo: ['Account information', 'بيانات الحساب'],
  keyPerson: ['Key person', 'الشخص المسؤول'],
  feedback: ['Feedback', 'رد الحساب'],
  commercial: ['Commercial', 'الجزء التجاري'],
};

export default function CrmDashboardPage() {
  const { t, tx, pick, locale } = useLanguage();
  const ar = locale === 'ar';
  const [d, setD] = useState<Dash | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<'today' | 'week' | 'month'>('week');

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/crm/dashboard', { cache: 'no-store' });
      if (!r.ok) throw new Error((await r.json()).error || 'Could not load the dashboard');
      setD(await r.json());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Load failed');
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const dailyTarget = d?.targets?.dailyVisits?.min || 4;
  const actions = d ? d.activity[period === 'today' ? 'today' : period] : 0;

  const maxCat = useMemo(() => Math.max(1, ...(d?.byCategory || []).map((c) => c.total)), [d]);
  const maxCity = useMemo(() => Math.max(1, ...(d?.byCity || []).map((c) => c.total)), [d]);
  const maxFunnel = useMemo(() => Math.max(1, ...(d?.funnel || []).map((f) => f.accounts)), [d]);

  if (!ready) return <Spinner />;
  if (error && !d) return <ErrorNote>{error}</ErrorNote>;
  if (!d) return null;

  const exportSummary = () => {
    const rows: Array<Record<string, string | number>> = [
      ...d.byCategory.map((c) => ({
        section: ar ? 'القطاعات' : 'Sectors',
        item: ar ? c.labelAr : c.labelEn,
        total: c.total, current: c.current, upcoming: c.upcoming, worked: c.worked,
      })),
      ...d.byCity.map((c) => ({
        section: ar ? 'المدن' : 'Cities',
        item: ar ? c.labelAr : c.labelEn,
        total: c.total, current: c.current, upcoming: '', worked: '',
      })),
      ...d.funnel.map((f) => ({
        section: ar ? 'خطوات البيع' : 'Sales steps',
        item: STEP_LABELS[f.key] ? (ar ? STEP_LABELS[f.key][1] : STEP_LABELS[f.key][0]) : f.key,
        total: f.accounts, current: '', upcoming: '', worked: '',
      })),
    ];
    downloadCsv(`crm-dashboard-${new Date().toISOString().slice(0, 10)}.csv`, rows, {
      totalsFor: ['total', 'current', 'upcoming', 'worked'],
    });
  };

  return (
    <div>
      <PageHead
        title={t('admin.crmTitle')}
        subtitle={t('admin.crmDesc')}
        onExport={exportSummary}
        exportLabel={tx('Export to Excel')}
        printLabel={tx('Print / PDF')}
      />

      {error && <div className="mb-4"><ErrorNote>{error}</ErrorNote></div>}

      {/* ----------------------------- the shape of the pipeline ----------------------------- */}
      <AutoGrid min="12rem" gap="0.75rem" className="mb-5">
        <Tile
          label={tx('Target accounts')}
          value={d.totals.accounts}
          icon={Building2}
          href="/admin/crm/current?stage=all"
        />
        <Tile
          label={tx('Upcoming — not yet worked')}
          value={d.totals.upcoming}
          icon={ClipboardList}
          href="/admin/crm/upcoming"
          tone="neutral"
        />
        <Tile
          label={tx('Being worked')}
          value={d.totals.current}
          icon={TrendingUp}
          href="/admin/crm/current"
          tone="brand"
        />
        <Tile label={tx('On hold')} value={d.totals.hold} icon={AlertTriangle} tone="warn" />
        <Tile label={tx('Ordered')} value={d.totals.withOrders} icon={CalendarCheck} tone="ok" />
      </AutoGrid>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
        <div className="space-y-5">
          {/* --------------------------- work recorded --------------------------- */}
          <Card>
            <SectionTitle
              title={tx('Work recorded')}
              hint={tx('Visits, calls, meetings and requests. Bookkeeping rows are not counted.')}
              actions={
                <Select
                  value={period}
                  onChange={(e) => setPeriod(e.target.value as typeof period)}
                  className="w-auto text-xs"
                  aria-label={tx('Period')}
                >
                  <option value="today">{tx('Today')}</option>
                  <option value="week">{tx('This week')}</option>
                  <option value="month">{tx('This month')}</option>
                </Select>
              }
            />
            <div className="flex flex-wrap items-end gap-6">
              <div>
                <p className="text-3xl font-bold text-fg">{actions}</p>
                <p className="mt-0.5 text-xs text-fg-muted">
                  {period === 'today' ? tx('Today') : period === 'week' ? tx('This week') : tx('This month')}
                </p>
              </div>
              <div className="min-w-0 flex-1">
                <p className="mb-1.5 text-xs text-fg-muted">
                  {tx('Against the target of')} {dailyTarget}
                  {tx('/day per rep')}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(d.activity.byType)
                    .filter(([k]) => !['stage_change', 'assignment', 'system'].includes(k))
                    .slice(0, 8)
                    .map(([k, n]) => (
                      <Badge key={k} tone="neutral">
                        {k.replace(/_/g, ' ')} {n}
                      </Badge>
                    ))}
                </div>
              </div>
            </div>
            {d.activity.undated > 0 && (
              <p className="mt-3 rounded-lg bg-surface-2 px-3 py-2 text-[11px] leading-relaxed text-fg-muted">
                {tx('Plus')} {d.activity.undated}{' '}
                {tx('meetings carried over from the sales sheet, which recorded that they happened but not when — they are in each account history and are left out of every figure measured over time.')}
              </p>
            )}
          </Card>

          {/* --------------------------- sectors --------------------------- */}
          <Card>
            <SectionTitle
              title={tx('By sector')}
              hint={tx('Click a sector to open the accounts in it.')}
            />
            <ul className="space-y-2.5">
              {d.byCategory.map((c) => (
                <li key={c.key}>
                  <Link
                    href={`/admin/crm/current?category=${c.key}`}
                    className="group flex items-center gap-3"
                  >
                    <span className="w-40 shrink-0 truncate text-sm text-fg group-hover:text-brand">
                      {ar ? c.labelAr : c.labelEn}
                    </span>
                    <span className="h-2.5 min-w-0 flex-1 overflow-hidden rounded-full bg-surface-3">
                      <span
                        className="block h-full rounded-e-[4px] bg-brand"
                        style={{ width: `${(c.total / maxCat) * 100}%` }}
                      />
                    </span>
                    <span className="w-28 shrink-0 text-end font-mono text-xs text-fg-muted">
                      {c.total}
                      <span className="text-fg-subtle"> · {c.worked} {tx('worked')}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>

          {/* --------------------------- the six steps --------------------------- */}
          <Card>
            <SectionTitle
              title={tx('How far accounts get')}
              hint={tx('How many accounts have reached each step of the process.')}
            />
            <ul className="space-y-2.5">
              {d.funnel.map((f, i) => (
                <li key={f.key} className="flex items-center gap-3">
                  <span className="w-44 shrink-0 truncate text-sm text-fg">
                    {i + 1}. {STEP_LABELS[f.key] ? (ar ? STEP_LABELS[f.key][1] : STEP_LABELS[f.key][0]) : f.key}
                  </span>
                  <span className="h-2.5 min-w-0 flex-1 overflow-hidden rounded-full bg-surface-3">
                    <span
                      className="block h-full rounded-e-[4px] bg-brand"
                      style={{ width: `${(f.accounts / maxFunnel) * 100}%` }}
                    />
                  </span>
                  <span className="w-12 shrink-0 text-end font-mono text-xs text-fg-muted">{f.accounts}</span>
                </li>
              ))}
            </ul>
          </Card>

          {/* --------------------------- the visit mix --------------------------- */}
          {d.mix.length > 0 && (
            <Card>
              <SectionTitle
                title={tx('Where the accounts sit, against the plan')}
                hint={tx('The sheet asks for a 60 / 30 / 10 split. This is what the list actually holds.')}
              />
              <p className="mb-3 flex items-center gap-4 text-[11px] text-fg-muted">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-sm bg-brand" />
                  {tx('Actual')}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-sm bg-surface-3 ring-1 ring-line" />
                  {tx('Target')}
                </span>
              </p>
              <ul className="space-y-3">
                {d.mix.map((m) => (
                  <li key={m.key}>
                    <p className="mb-1 flex justify-between text-xs">
                      <span className="text-fg">{ar ? m.labelAr : m.labelEn}</span>
                      <span className="font-mono text-fg-muted">
                        {m.actualPct}% / {m.targetPct}%
                      </span>
                    </p>
                    <span className="relative block h-2.5 overflow-hidden rounded-full bg-surface-3">
                      <span
                        className="absolute inset-y-0 start-0 rounded-e-[4px] bg-brand"
                        style={{ width: `${Math.min(100, m.actualPct)}%` }}
                      />
                      <span
                        className="absolute inset-y-0 w-0.5 bg-fg"
                        style={{ insetInlineStart: `${Math.min(100, m.targetPct)}%` }}
                        aria-hidden
                      />
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>

        {/* --------------------------- right column --------------------------- */}
        <div className="space-y-5">
          <Card>
            <SectionTitle
              title={tx('This week by rep')}
              actions={
                <Link href="/admin/crm/kpis" className="text-xs font-medium text-brand hover:underline">
                  {tx('All KPIs')}
                </Link>
              }
            />
            {d.reps.length === 0 ? (
              <p className="text-sm text-fg-subtle">{tx('No work logged this week yet.')}</p>
            ) : (
              <ul className="space-y-2">
                {d.reps.map((r) => (
                  <li key={r.id}>
                    <Link
                      href={`/admin/crm/kpis?rep=${r.id}`}
                      className="group flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 hover:bg-surface-2"
                    >
                      <span className="min-w-0 truncate text-sm text-fg group-hover:text-brand">{r.name}</span>
                      <span className="shrink-0 font-mono text-xs text-fg-muted">
                        {r.visits} {tx('visits')} · {r.accounts} {tx('accounts')}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <SectionTitle title={tx('By city')} hint={tx('Click a city to open its accounts.')} />
            <ul className="space-y-2">
              {d.byCity.slice(0, 8).map((c) => (
                <li key={c.key}>
                  <Link href={`/admin/crm/current?city=${c.key}`} className="group flex items-center gap-2.5">
                    <span className="w-24 shrink-0 truncate text-xs text-fg group-hover:text-brand">
                      {ar ? c.labelAr : c.labelEn}
                    </span>
                    <span className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-surface-3">
                      <span
                        className="block h-full rounded-e-[4px] bg-brand"
                        style={{ width: `${(c.total / maxCity) * 100}%` }}
                      />
                    </span>
                    <span className="w-8 shrink-0 text-end font-mono text-[11px] text-fg-muted">{c.total}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>

          {d.attention.length > 0 && (
            <Card>
              <SectionTitle
                title={tx('Going cold')}
                hint={tx('Being worked, but untouched for a fortnight.')}
              />
              <ul className="space-y-1.5">
                {d.attention.map((a) => (
                  <li key={a._id}>
                    <Link
                      href={`/admin/crm/accounts/${a._id}`}
                      className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-surface-2"
                    >
                      <span className="min-w-0 truncate text-fg">{pick(a.name, a.nameAr)}</span>
                      <span className="shrink-0 text-[11px] text-fg-subtle">
                        {a.lastActionAt
                          ? new Date(a.lastActionAt).toLocaleDateString(ar ? 'ar-SA' : 'en-GB', {
                              day: 'numeric', month: 'short',
                            })
                          : tx('never')}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <Card>
            <SectionTitle title={tx('Latest')} />
            {d.recent.length === 0 ? (
              <p className="text-sm text-fg-subtle">{tx('Nothing recorded yet.')}</p>
            ) : (
              <ul className="space-y-2">
                {d.recent.slice(0, 10).map((ev) => (
                  <li key={ev._id} className="text-xs">
                    <Link
                      href={ev.accountId?._id ? `/admin/crm/accounts/${ev.accountId._id}` : '/admin/crm'}
                      className="group block rounded-lg px-2 py-1.5 hover:bg-surface-2"
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span className="min-w-0 truncate font-medium text-fg group-hover:text-brand">
                          {ev.accountId ? pick(ev.accountId.name, ev.accountId.nameAr) : '—'}
                        </span>
                        <span className="shrink-0 text-fg-subtle">{ev.type.replace(/_/g, ' ')}</span>
                      </span>
                      <span className="mt-0.5 block text-fg-subtle">
                        {ev.byName || '—'}
                        {' · '}
                        {new Date(ev.at).toLocaleDateString(ar ? 'ar-SA' : 'en-GB', {
                          day: 'numeric', month: 'short',
                        })}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

/** The header, with the two exports management asks for. */
function PageHead({
  title, subtitle, onExport, exportLabel, printLabel,
}: {
  title: string; subtitle: string; onExport: () => void;
  exportLabel: string; printLabel: string;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3 print:mb-2">
      <div className="min-w-0 flex-1">
        <h1 className="text-xl font-bold leading-tight text-fg sm:text-2xl">{title}</h1>
        <p className="mt-1 max-w-3xl text-sm text-fg-muted">{subtitle}</p>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2 print:hidden">
        <Button variant="outline" icon={Download} onClick={onExport}>{exportLabel}</Button>
        <Button variant="outline" icon={Printer} onClick={() => window.print()}>{printLabel}</Button>
      </div>
    </div>
  );
}

function Tile({
  label, value, icon: Icon, href, tone = 'neutral',
}: {
  label: string; value: number; icon: React.ElementType; href?: string;
  tone?: 'neutral' | 'brand' | 'ok' | 'warn';
}) {
  const ring =
    tone === 'brand' ? 'border-brand' : tone === 'ok' ? 'border-ok' : tone === 'warn' ? 'border-warn' : 'border-line';
  const inner = (
    <div className={`rounded-xl border ${ring} bg-surface p-4 transition-colors hover:border-brand`}>
      <div className="mb-2 flex items-start justify-between gap-2">
        <Icon size={16} className="text-fg-subtle" />
        {href && <ArrowRight size={13} className="rtl-flip text-fg-subtle" />}
      </div>
      <p className="text-2xl font-bold text-fg">{value}</p>
      <p className="mt-0.5 text-[11px] leading-snug text-fg-muted">{label}</p>
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}
