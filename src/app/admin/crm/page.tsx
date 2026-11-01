'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle, ArrowRight, Boxes, Building2, ClipboardList, Download,
  FlaskConical, Layers, Printer, Tag, TrendingUp, Users2,
} from 'lucide-react';
import {
  AutoGrid, Badge, Button, Card, ErrorNote, SectionTitle, Select, Spinner,
} from '@/components/admin/ui';
import { useLanguage } from '@/contexts/LanguageContext';
import { downloadFile } from '@/lib/download';

/**
 * The CRM dashboard.
 *
 * Two populations, kept apart on purpose. The **target list** is the 83 accounts
 * the business committed to working — every share and percentage here is taken
 * over those. The **prospect pool** is the wider SFDA list behind it; it is
 * counted, and deliberately left out of the shares, because "what share of our
 * accounts are distributors" should describe a decision the business made and
 * not whatever the regulator happened to publish.
 *
 * Every figure is read from the accounts and their history rather than stored,
 * and every figure links to the rows behind it. Magnitude is drawn in one hue:
 * longer is more, no legend to decode, nothing a colour-blind reader can
 * misread. The only two-series chart (target against actual) carries a legend.
 */

interface Dash {
  totals: {
    targets: number; targetsWorked: number; targetsNotStarted: number;
    prospects: number; accounts: number;
    upcoming: number; current: number; hold: number; won: number; lost: number;
    withOrders: number;
  };
  activity: {
    today: number; week: number; month: number;
    byType: Record<string, number>; undated: number;
  };
  byCategory: Array<{
    key: string; labelEn: string; labelAr: string;
    total: number; current: number; upcoming: number; worked: number; sharePct: number;
  }>;
  byCity: Array<{
    key: string; labelEn: string; labelAr: string;
    total: number; current: number; sharePct: number;
  }>;
  funnel: Array<{ key: string; accounts: number }>;
  reach: Array<{ meetings: number; accounts: number }>;
  requests: { samples: number; sampleAccounts: number; pricing: number; pricingAccounts: number };
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

const TYPE_LABELS: Record<string, [string, string]> = {
  visit: ['Visit', 'زيارة'], meeting: ['Meeting', 'اجتماع'], call: ['Call', 'مكالمة'],
  whatsapp: ['WhatsApp', 'واتساب'], email: ['Email', 'بريد'],
  intro: ['KCC introduced', 'تعريف بـKCC'], account_info: ['Account info', 'بيانات الحساب'],
  key_person: ['Key person', 'الشخص المسؤول'], feedback: ['Feedback', 'رد الحساب'],
  commercial: ['Commercial', 'تجاري'], sample_request: ['Sample requested', 'طلب عيّنة'],
  pricing_request: ['Pricing requested', 'طلب أسعار'], complaint: ['Complaint', 'شكوى'],
  suggestion: ['Suggestion', 'اقتراح'], note: ['Note', 'ملاحظة'], task: ['Task', 'مهمة'],
  stage_change: ['Stage change', 'تغيير المرحلة'], assignment: ['Assignment', 'تعيين'],
  system: ['System', 'النظام'],
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

  const label = (map: Record<string, [string, string]>, key: string) =>
    map[key] ? (ar ? map[key][1] : map[key][0]) : key.replace(/_/g, ' ');

  const maxCat = useMemo(() => Math.max(1, ...(d?.byCategory || []).map((c) => c.total)), [d]);
  const maxCity = useMemo(() => Math.max(1, ...(d?.byCity || []).map((c) => c.total)), [d]);
  const maxFunnel = useMemo(() => Math.max(1, ...(d?.funnel || []).map((f) => f.accounts)), [d]);
  const maxReach = useMemo(() => Math.max(1, ...(d?.reach || []).map((r) => r.accounts)), [d]);
  const maxTrend = useMemo(() => Math.max(1, ...(d?.trend || []).map((x) => x.n)), [d]);

  const exportBook = (format?: 'pdf') =>
    downloadFile(`/api/crm/export?what=accounts&list=target${format ? '&format=pdf' : ''}`).catch((e) =>
      setError(e.message)
    );

  if (!ready) return <Spinner />;
  if (error && !d) return <ErrorNote>{error}</ErrorNote>;
  if (!d) return null;

  const dailyTarget = d.targets?.dailyVisits?.min || 4;
  const actions = d.activity[period === 'today' ? 'today' : period];
  const requestAccounts = d.requests.sampleAccounts + d.requests.pricingAccounts;

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-bold leading-tight text-fg sm:text-2xl">{t('admin.crmTitle')}</h1>
          <p className="mt-1 max-w-3xl text-sm text-fg-muted">{t('admin.crmDesc')}</p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2 print:hidden">
          <Button variant="outline" icon={Download} onClick={() => exportBook()}>
            {tx('Export to Excel')}
          </Button>
          <Button variant="outline" icon={Printer} onClick={() => exportBook('pdf')}>
            {tx('PDF report')}
          </Button>
        </div>
      </div>

      {error && <div className="mb-4"><ErrorNote>{error}</ErrorNote></div>}

      {/* ------------------------- the target list ------------------------- */}
      <AutoGrid min="12rem" gap="0.75rem" className="mb-3">
        <Tile
          label={tx('Target accounts')}
          value={d.totals.targets}
          note={tx('the list we committed to')}
          icon={Building2}
          href="/admin/crm/current?stage=all&list=target"
        />
        <Tile
          label={tx('Started')}
          value={d.totals.targetsWorked}
          note={pct(d.totals.targetsWorked, d.totals.targets)}
          icon={TrendingUp}
          href="/admin/crm/current?list=target"
          tone="brand"
        />
        <Tile
          label={tx('Not started yet')}
          value={d.totals.targetsNotStarted}
          note={pct(d.totals.targetsNotStarted, d.totals.targets)}
          icon={ClipboardList}
          href="/admin/crm/upcoming?list=target"
        />
        <Tile label={tx('On hold')} value={d.totals.hold} icon={AlertTriangle} tone="warn" />
        <Tile
          label={tx('Asked us for something')}
          value={requestAccounts}
          note={`${d.requests.samples} ${tx('sample requests')} · ${d.requests.pricing} ${tx('pricing')}`}
          icon={FlaskConical}
          tone="ok"
        />
      </AutoGrid>

      {/* The pool is counted, and kept out of the shares below. */}
      <Card className="mb-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-fg-muted">
            <Layers size={13} className="me-1.5 inline text-fg-subtle" />
            {tx('Behind the list there is a prospect pool of')}{' '}
            <strong className="text-fg">{d.totals.prospects}</strong>{' '}
            {tx('companies. It is deliberately left out of every share below — those describe the list the business chose, not the register it came from.')}
          </p>
          <Link
            href="/admin/crm/upcoming?list=pool"
            className="shrink-0 text-xs font-medium text-brand hover:underline"
          >
            {tx('Open the pool')} <ArrowRight size={11} className="rtl-flip inline" />
          </Link>
        </div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
        <div className="space-y-5">
          {/* ------------------------- the sector split ------------------------- */}
          <Card>
            <SectionTitle
              title={tx('Share of the target list, by sector')}
              hint={tx('Of the accounts we committed to work. Click a sector to open it.')}
            />
            <ul className="space-y-2.5">
              {d.byCategory.map((c) => (
                <li key={c.key}>
                  <Link
                    href={`/admin/crm/current?stage=all&list=target&category=${c.key}`}
                    className="group flex items-center gap-3"
                    title={`${c.total} ${tx('accounts')} · ${c.worked} ${tx('worked')}`}
                  >
                    <span className="w-40 shrink-0 truncate text-sm text-fg group-hover:text-brand">
                      {ar ? c.labelAr : c.labelEn}
                    </span>
                    <span className="relative h-5 min-w-0 flex-1 overflow-hidden rounded-md bg-surface-3">
                      <span
                        className="block h-full rounded-e-[4px] bg-brand"
                        style={{ width: `${(c.total / maxCat) * 100}%` }}
                      />
                      <span className="absolute inset-y-0 start-2 flex items-center text-[11px] font-semibold text-fg-inverse mix-blend-difference">
                        {c.sharePct}%
                      </span>
                    </span>
                    <span className="w-24 shrink-0 text-end font-mono text-xs text-fg-muted">
                      {c.total}
                      <span className="text-fg-subtle"> / {c.worked}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            <p className="mt-2.5 text-[11px] text-fg-subtle">
              {tx('The second figure is how many of them have been started.')}
            </p>
          </Card>

          {/* ------------------------- how far we got ------------------------- */}
          <Card>
            <SectionTitle
              title={tx('How far we got with each account')}
              hint={tx('Meetings held, from the sheet and from everything logged since.')}
            />
            <ul className="space-y-2.5">
              {d.reach.map((r) => (
                <li key={r.meetings} className="flex items-center gap-3">
                  <span className="w-40 shrink-0 text-sm text-fg">
                    {r.meetings === 0
                      ? tx('No meeting yet')
                      : r.meetings === 3
                        ? tx('Three meetings or more')
                        : `${r.meetings} ${r.meetings === 1 ? tx('meeting') : tx('meetings')}`}
                  </span>
                  <span className="h-5 min-w-0 flex-1 overflow-hidden rounded-md bg-surface-3">
                    <span
                      className="block h-full rounded-e-[4px] bg-brand"
                      style={{ width: `${(r.accounts / maxReach) * 100}%` }}
                    />
                  </span>
                  <span className="w-24 shrink-0 text-end font-mono text-xs text-fg-muted">
                    {r.accounts}
                    <span className="text-fg-subtle"> · {pct(r.accounts, d.totals.targets)}</span>
                  </span>
                </li>
              ))}
            </ul>
          </Card>

          {/* ------------------------- work recorded ------------------------- */}
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
            <div className="mb-4 flex flex-wrap items-end gap-6">
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
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 9)
                    .map(([k, n]) => (
                      <Badge key={k} tone="neutral">
                        {label(TYPE_LABELS, k)} {n}
                      </Badge>
                    ))}
                </div>
              </div>
            </div>

            {/* Four weeks, one bar a day. */}
            {d.trend.length > 0 ? (
              <div>
                <p className="mb-1.5 text-[11px] text-fg-subtle">{tx('The last four weeks')}</p>
                <div className="flex h-20 items-end gap-0.5">
                  {d.trend.map((x) => (
                    <span
                      key={x._id}
                      title={`${x._id} · ${x.n} ${tx('actions')} · ${x.visits} ${tx('visits')}`}
                      className="min-w-0 flex-1 rounded-t-[3px] bg-brand transition-colors hover:bg-brand-hover"
                      style={{ height: `${Math.max(3, (x.n / maxTrend) * 100)}%` }}
                    />
                  ))}
                </div>
                <p className="mt-1 flex justify-between text-[10px] text-fg-subtle">
                  <span>{d.trend[0]?._id}</span>
                  <span>{d.trend[d.trend.length - 1]?._id}</span>
                </p>
              </div>
            ) : (
              <p className="rounded-lg bg-surface-2 px-3 py-2 text-[11px] leading-relaxed text-fg-muted">
                {tx('Nothing has been logged in the last four weeks, so there is no trend to draw yet.')}
              </p>
            )}

            {d.activity.undated > 0 && (
              <p className="mt-3 rounded-lg bg-surface-2 px-3 py-2 text-[11px] leading-relaxed text-fg-muted">
                {tx('Plus')} {d.activity.undated}{' '}
                {tx('meetings carried over from the sales sheet, which recorded that they happened but not when — they are in each account history and are left out of every figure measured over time.')}
              </p>
            )}
          </Card>

          {/* ------------------------- the six steps ------------------------- */}
          <Card>
            <SectionTitle
              title={tx('How far accounts get')}
              hint={tx('How many accounts have reached each step of the process.')}
            />
            <ul className="space-y-2.5">
              {d.funnel.map((f, i) => (
                <li key={f.key} className="flex items-center gap-3">
                  <span className="w-44 shrink-0 truncate text-sm text-fg">
                    {i + 1}. {label(STEP_LABELS, f.key)}
                  </span>
                  <span className="h-2.5 min-w-0 flex-1 overflow-hidden rounded-full bg-surface-3">
                    <span
                      className="block h-full rounded-e-[4px] bg-brand"
                      style={{ width: `${(f.accounts / maxFunnel) * 100}%` }}
                    />
                  </span>
                  <span className="w-20 shrink-0 text-end font-mono text-xs text-fg-muted">
                    {f.accounts}
                    <span className="text-fg-subtle"> · {pct(f.accounts, d.totals.targets)}</span>
                  </span>
                </li>
              ))}
            </ul>
          </Card>

          {/* ------------------------- the visit mix ------------------------- */}
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
                  <span className="h-2.5 w-0.5 bg-fg" />
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

        {/* ------------------------- right column ------------------------- */}
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
            <SectionTitle
              title={tx('Share by city')}
              hint={tx('Of the target list. Click a city to open it.')}
            />
            <ul className="space-y-2">
              {d.byCity.slice(0, 10).map((c) => (
                <li key={c.key}>
                  <Link
                    href={`/admin/crm/current?stage=all&list=target&city=${c.key}`}
                    className="group flex items-center gap-2.5"
                    title={`${c.total} ${tx('accounts')}`}
                  >
                    <span className="w-24 shrink-0 truncate text-xs text-fg group-hover:text-brand">
                      {ar ? c.labelAr : c.labelEn}
                    </span>
                    <span className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-surface-3">
                      <span
                        className="block h-full rounded-e-[4px] bg-brand"
                        style={{ width: `${(c.total / maxCity) * 100}%` }}
                      />
                    </span>
                    <span className="w-16 shrink-0 text-end font-mono text-[11px] text-fg-muted">
                      {c.total} · {c.sharePct}%
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <SectionTitle
              title={tx('What accounts asked for')}
              hint={tx('Counted from the history, so a request made on a visit shows here too.')}
            />
            <dl className="space-y-2.5 text-sm">
              <Figure
                label={tx('Sample requests')}
                value={d.requests.samples}
                note={`${d.requests.sampleAccounts} ${tx('accounts')}`}
              />
              <Figure
                label={tx('Pricing requests')}
                value={d.requests.pricing}
                note={`${d.requests.pricingAccounts} ${tx('accounts')}`}
              />
              <Figure
                label={tx('Ordered')}
                value={d.totals.withOrders}
                note={tx('accounts with an order')}
              />
            </dl>
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

          {/* ------------------------- the log ------------------------- */}
          <Card>
            <SectionTitle
              title={tx('Activity log')}
              hint={tx('Everything logged, newest first.')}
              actions={
                <Link href="/admin/crm/feedback" className="text-xs font-medium text-brand hover:underline">
                  {tx('Complaints')}
                </Link>
              }
            />
            {d.recent.length === 0 ? (
              <p className="text-sm text-fg-subtle">{tx('Nothing recorded yet.')}</p>
            ) : (
              <ol className="relative space-y-2.5 border-s border-line ps-3.5">
                {d.recent.map((ev) => (
                  <li key={ev._id} className="relative">
                    <span className="absolute -start-[1.19rem] top-2 h-1.5 w-1.5 rounded-full bg-brand" />
                    <Link
                      href={ev.accountId?._id ? `/admin/crm/accounts/${ev.accountId._id}` : '/admin/crm'}
                      className="group block"
                    >
                      <p className="flex flex-wrap items-center gap-1.5 text-xs">
                        <Badge tone={ev.type === 'complaint' ? 'danger' : 'brand'}>
                          {label(TYPE_LABELS, ev.type)}
                        </Badge>
                        <span className="min-w-0 truncate font-medium text-fg group-hover:text-brand">
                          {ev.accountId ? pick(ev.accountId.name, ev.accountId.nameAr) : '—'}
                        </span>
                      </p>
                      {ev.body && (
                        <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-fg-muted">{ev.body}</p>
                      )}
                      <p className="mt-0.5 text-[10px] text-fg-subtle">
                        {ev.byName || '—'}
                        {' · '}
                        {/* The sheet recorded that these happened, never when. */}
                        {ev.backfilled
                          ? tx('From the sheet — date unknown')
                          : new Date(ev.at).toLocaleDateString(ar ? 'ar-SA' : 'en-GB', {
                              day: 'numeric', month: 'short',
                            })}
                      </p>
                    </Link>
                  </li>
                ))}
              </ol>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

/** A share, written the way a reader expects to see one. */
function pct(part: number, whole: number): string {
  if (!whole) return '—';
  return `${Math.round((part / whole) * 100)}%`;
}

function Tile({
  label, value, note, icon: Icon, href, tone = 'neutral',
}: {
  label: string; value: number; note?: string; icon: React.ElementType;
  href?: string; tone?: 'neutral' | 'brand' | 'ok' | 'warn';
}) {
  const ring =
    tone === 'brand' ? 'border-brand' : tone === 'ok' ? 'border-ok' : tone === 'warn' ? 'border-warn' : 'border-line';
  const inner = (
    <div className={`h-full rounded-xl border ${ring} bg-surface p-4 transition-colors hover:border-brand`}>
      <div className="mb-2 flex items-start justify-between gap-2">
        <Icon size={15} className="text-fg-subtle" />
        {href && <ArrowRight size={12} className="rtl-flip text-fg-subtle" />}
      </div>
      <p className="text-2xl font-bold leading-none text-fg">{value}</p>
      <p className="mt-1 text-[11px] font-medium leading-snug text-fg">{label}</p>
      {note && <p className="mt-0.5 text-[11px] leading-snug text-fg-subtle">{note}</p>}
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

function Figure({ label, value, note }: { label: string; value: number; note: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-line/30 pb-2.5 last:border-b-0 last:pb-0">
      <dt className="text-xs text-fg-muted">{label}</dt>
      <dd className="text-end">
        <span className="text-sm font-semibold text-fg">{value}</span>
        <span className="ms-1.5 text-[11px] text-fg-subtle">{note}</span>
      </dd>
    </div>
  );
}
