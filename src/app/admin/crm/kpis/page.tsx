'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Download, Gauge, Printer, Target } from 'lucide-react';
import {
  AutoGrid, Badge, Button, Card, DataTable, ErrorNote, SectionTitle, Select,
  Spinner, Td, Th,
} from '@/components/admin/ui';
import { useLanguage } from '@/contexts/LanguageContext';
import { downloadCsv } from '@/lib/exportCsv';

/**
 * Each rep against the targets the business set for itself.
 *
 * A rep who logged nothing is listed with zeros rather than left out: the
 * question management asks of this screen is as often "who has not been out
 * this week" as "who has".
 *
 * Attainment is drawn as one bar per person in a single hue — longer is more —
 * with the target marked on it. No second colour is needed to say "target",
 * and none is spent on decoration.
 */

interface Person {
  id: string;
  name: string;
  role: string;
  actions: number;
  visits: number;
  meetings: number;
  calls: number;
  sampleRequests: number;
  accountsSeen: number;
  activeDays: number;
  visitsPerDay: number;
  dailyTarget: { min: number; max: number };
  weeklyClientTarget: { min: number; max: number };
  dailyAttainmentPct: number;
  weeklyClientAttainmentPct: number | null;
  mix: Array<{ key: string; labelEn: string; labelAr: string; targetPct: number; visits: number; actualPct: number }>;
  accountsOwned: Record<string, number>;
  checklist?: Array<{ key: string; labelEn: string; labelAr: string; done: number; pct: number }>;
}

interface Kpi {
  period: string;
  from: string;
  daysElapsed: number;
  targets: { dailyVisits: { min: number; max: number }; weeklyClients: { min: number; max: number }; sectorMix: Array<{ key: string; labelEn: string; labelAr: string; sharePct: number }> };
  team: { visits: number; actions: number; accountsSeen: number };
  people: Person[];
}

function KpisInner() {
  const { t, tx, locale } = useLanguage();
  const ar = locale === 'ar';
  const params = useSearchParams();
  const focus = params.get('rep') || '';

  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('week');
  const [d, setD] = useState<Kpi | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch(`/api/crm/kpis?period=${period}`, { cache: 'no-store' });
      if (!r.ok) throw new Error((await r.json()).error || 'Could not load the KPIs');
      setD(await r.json());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Load failed');
    } finally {
      setReady(true);
    }
  }, [period]);

  useEffect(() => {
    load();
  }, [load]);

  if (!ready) return <Spinner />;
  if (error && !d) return <ErrorNote>{error}</ErrorNote>;
  if (!d) return null;

  const people = focus ? d.people.filter((p) => p.id === focus) : d.people;

  const exportRows = () =>
    downloadCsv(`crm-kpis-${period}-${new Date().toISOString().slice(0, 10)}.csv`, people.map((p) => ({
      [ar ? 'الموظف' : 'Rep']: p.name,
      [ar ? 'الدور' : 'Role']: p.role,
      [ar ? 'زيارات' : 'Visits']: p.visits,
      [ar ? 'اجتماعات' : 'Meetings']: p.meetings,
      [ar ? 'مكالمات' : 'Calls']: p.calls,
      [ar ? 'طلبات عيّنات' : 'Sample requests']: p.sampleRequests,
      [ar ? 'حسابات تمّت زيارتها' : 'Accounts seen']: p.accountsSeen,
      [ar ? 'أيام عمل' : 'Active days']: p.activeDays,
      [ar ? 'زيارات/يوم' : 'Visits per day']: p.visitsPerDay,
      [ar ? 'المستهدف اليومي' : 'Daily target']: `${p.dailyTarget.min}-${p.dailyTarget.max}`,
      [ar ? 'التحقيق %' : 'Attainment %']: p.dailyAttainmentPct,
    })), {
      totalsFor: [
        ar ? 'زيارات' : 'Visits', ar ? 'اجتماعات' : 'Meetings', ar ? 'مكالمات' : 'Calls',
        ar ? 'طلبات عيّنات' : 'Sample requests', ar ? 'حسابات تمّت زيارتها' : 'Accounts seen',
      ],
    });

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <Link
            href="/admin/crm"
            className="mb-2 inline-block text-xs font-medium text-fg-muted hover:text-fg print:hidden"
          >
            ← {t('admin.crmTitle')}
          </Link>
          <h1 className="text-xl font-bold leading-tight text-fg sm:text-2xl">{t('admin.crmKpis')}</h1>
          <p className="mt-1 max-w-3xl text-sm text-fg-muted">{t('admin.crmKpisDesc')}</p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2 print:hidden">
          <Select
            value={period}
            onChange={(e) => setPeriod(e.target.value as typeof period)}
            className="w-auto text-sm"
            aria-label={tx('Period')}
          >
            <option value="day">{tx('Today')}</option>
            <option value="week">{tx('This week')}</option>
            <option value="month">{tx('This month')}</option>
          </Select>
          <Button variant="outline" icon={Download} onClick={exportRows}>{tx('Export to Excel')}</Button>
          <Button variant="outline" icon={Printer} onClick={() => window.print()}>{tx('Print / PDF')}</Button>
        </div>
      </div>

      {focus && (
        <p className="mb-4 print:hidden">
          <Link href="/admin/crm/kpis" className="text-xs font-medium text-brand hover:underline">
            {tx('Showing one person — show everyone')}
          </Link>
        </p>
      )}

      <AutoGrid min="12rem" gap="0.75rem" className="mb-5">
        <Stat label={tx('Visits logged')} value={d.team.visits} icon={Gauge} />
        <Stat label={tx('Accounts seen')} value={d.team.accountsSeen} icon={Target} />
        <Stat label={tx('All actions')} value={d.team.actions} icon={Gauge} />
        <Stat
          label={tx('Daily target per rep')}
          value={`${d.targets.dailyVisits.min}–${d.targets.dailyVisits.max}`}
          icon={Target}
        />
      </AutoGrid>

      <Card padded={false} className="mb-5">
        <div className="border-b border-line p-4 sm:p-5">
          <SectionTitle
            title={tx('Against target')}
            hint={tx('The bar is visits a day; the mark on it is the target. Everyone with a visit target is listed, including anyone who logged nothing.')}
          />
        </div>
        <div className="space-y-3 p-4 sm:p-5">
          {people.map((p) => {
            const pct = Math.min(140, p.dailyAttainmentPct);
            return (
              <div key={p.id}>
                <p className="mb-1 flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span className="font-medium text-fg">{p.name}</span>
                  <span className="font-mono text-xs text-fg-muted">
                    {p.visitsPerDay}/{tx('day')} · {p.visits} {tx('visits')} · {p.accountsSeen} {tx('accounts')}
                  </span>
                </p>
                <span className="relative block h-3 overflow-hidden rounded-full bg-surface-3">
                  <span
                    className="absolute inset-y-0 start-0 rounded-e-[4px] bg-brand"
                    style={{ width: `${Math.max(2, (pct / 140) * 100)}%` }}
                  />
                  <span
                    className="absolute inset-y-0 w-0.5 bg-fg"
                    style={{ insetInlineStart: `${(100 / 140) * 100}%` }}
                    aria-hidden
                  />
                </span>
              </div>
            );
          })}
        </div>
      </Card>

      <DataTable>
        <thead>
          <tr>
            <Th>{tx('Rep')}</Th>
            <Th align="center">{tx('Visits')}</Th>
            <Th align="center">{tx('Meetings')}</Th>
            <Th align="center">{tx('Calls')}</Th>
            <Th align="center">{tx('Samples asked')}</Th>
            <Th align="center">{tx('Accounts seen')}</Th>
            <Th align="center">{tx('Active days')}</Th>
            <Th align="center">{tx('Per day')}</Th>
            <Th align="center">{tx('Attainment')}</Th>
            <Th align="center">{tx('Owns')}</Th>
          </tr>
        </thead>
        <tbody>
          {people.map((p) => (
            <tr key={p.id} className="hover:bg-surface-2/40">
              <Td>
                <Link href={`/admin/crm/kpis?rep=${p.id}`} className="font-medium text-fg hover:text-brand">
                  {p.name}
                </Link>
                <span className="mt-0.5 block text-[11px] text-fg-subtle">{p.role}</span>
              </Td>
              <Td align="center">{p.visits}</Td>
              <Td align="center">{p.meetings}</Td>
              <Td align="center">{p.calls}</Td>
              <Td align="center">{p.sampleRequests}</Td>
              <Td align="center">{p.accountsSeen}</Td>
              <Td align="center">{p.activeDays}</Td>
              <Td align="center" className="font-mono text-xs">{p.visitsPerDay}</Td>
              <Td align="center">
                <Badge
                  tone={p.dailyAttainmentPct >= 100 ? 'ok' : p.dailyAttainmentPct >= 60 ? 'warn' : 'danger'}
                >
                  {p.dailyAttainmentPct}%
                </Badge>
              </Td>
              <Td align="center" className="text-xs text-fg-muted">
                {Object.entries(p.accountsOwned).map(([s, n]) => `${s} ${n}`).join(' · ') || '—'}
              </Td>
            </tr>
          ))}
        </tbody>
      </DataTable>

      {/* --------- the sector split, per person, against the plan --------- */}
      {people.some((p) => p.mix.length > 0) && (
        <Card className="mt-5">
          <SectionTitle
            title={tx('Visit mix against the plan')}
            hint={tx('What share of each rep’s visits went to each kind of account.')}
          />
          <div className="space-y-4">
            {people.filter((p) => p.visits > 0).map((p) => (
              <div key={p.id}>
                <p className="mb-1.5 text-sm font-medium text-fg">{p.name}</p>
                <ul className="space-y-1.5">
                  {p.mix.map((m) => (
                    <li key={m.key} className="flex items-center gap-3">
                      <span className="w-40 shrink-0 truncate text-xs text-fg-muted">
                        {ar ? m.labelAr : m.labelEn}
                      </span>
                      <span className="relative h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-surface-3">
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
                      <span className="w-20 shrink-0 text-end font-mono text-[11px] text-fg-muted">
                        {m.actualPct}% / {m.targetPct}%
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function Stat({ label, value, icon: Icon }: { label: string; value: number | string; icon: React.ElementType }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-4">
      <Icon size={16} className="mb-2 text-fg-subtle" />
      <p className="text-2xl font-bold text-fg">{value}</p>
      <p className="mt-0.5 text-[11px] leading-snug text-fg-muted">{label}</p>
    </div>
  );
}

export default function CrmKpisPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <KpisInner />
    </Suspense>
  );
}
