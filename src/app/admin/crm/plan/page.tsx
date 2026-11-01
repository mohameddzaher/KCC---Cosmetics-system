'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  CalendarDays, Check, ChevronLeft, ChevronRight, Circle, Download, Plus,
  Printer, Search, Trash2,
} from 'lucide-react';
import {
  AutoGrid, Badge, Button, Card, ErrorNote, Modal, PageHeader, SectionTitle,
  Select, Spinner, TextInput,
} from '@/components/admin/ui';
import { useLanguage } from '@/contexts/LanguageContext';
import { downloadFile } from '@/lib/download';

/**
 * The journey plan — which accounts a rep intends to call on, and whether he
 * did.
 *
 * Whether a planned call happened is read from the visit history, not from a
 * box anybody ticks here: a plan that could mark itself done would be the one
 * version of events a rep could write without leaving his desk. The same
 * reading shows calls that were never planned, which is the other half of the
 * question a manager is asking.
 */

interface PlanItem {
  accountId: { _id: string; name: string; nameAr?: string; category?: string; city?: string } | string;
  note?: string;
  visited: boolean;
}
interface Plan {
  _id: string;
  date: string;
  ownerId: { _id: string; name: string; region?: string } | string;
  ownerName?: string;
  items: PlanItem[];
  planned: number;
  kept: number;
  adherencePct: number | null;
}
interface Payload {
  from: string;
  to: string;
  plans: Plan[];
  reps: Array<{ _id: string; name: string; region?: string }>;
  canPlanForOthers: boolean;
  summary: { planned: number; kept: number; adherencePct: number | null; unplannedVisits: number };
}

const DAYS_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAYS_AR = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

function sundayOf(d: Date): Date {
  const s = new Date(d);
  s.setHours(0, 0, 0, 0);
  s.setDate(s.getDate() - s.getDay());
  return s;
}
const iso = (d: Date) => d.toISOString().slice(0, 10);

export default function JourneyPlanPage() {
  const { t, tx, pick, locale } = useLanguage();
  const ar = locale === 'ar';

  const [weekStart, setWeekStart] = useState(() => sundayOf(new Date()));
  const [rep, setRep] = useState('all');
  const [d, setD] = useState<Payload | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  /** Which day is having an account added to it. */
  const [adding, setAdding] = useState<{ date: string; ownerId: string } | null>(null);
  const [q, setQ] = useState('');
  const [found, setFound] = useState<Array<{ _id: string; name: string; nameAr?: string; city?: string; stage: string }>>([]);

  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => new Date(weekStart.getTime() + i * 86400000)),
    [weekStart]
  );

  const load = useCallback(async () => {
    try {
      const p = new URLSearchParams({ from: iso(weekStart), to: iso(days[6]) });
      if (rep !== 'all') p.set('owner', rep);
      const r = await fetch(`/api/crm/plan?${p}`, { cache: 'no-store' });
      if (!r.ok) throw new Error((await r.json()).error || 'Could not load the plan');
      setD(await r.json());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Load failed');
    } finally {
      setReady(true);
    }
  }, [weekStart, days, rep]);

  useEffect(() => {
    load();
  }, [load]);

  const search = useCallback(async (term: string) => {
    if (!term.trim()) return setFound([]);
    const r = await fetch(`/api/crm/accounts?q=${encodeURIComponent(term)}&stage=all&limit=12`, { cache: 'no-store' });
    if (!r.ok) return setFound([]);
    const j = await r.json();
    setFound(j.items || []);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => search(q), 250);
    return () => clearTimeout(timer);
  }, [q, search]);

  function planFor(date: Date, ownerId?: string): Plan | undefined {
    const key = iso(date);
    return d?.plans.find(
      (p) =>
        iso(new Date(p.date)) === key &&
        (!ownerId || String((p.ownerId as { _id?: string })?._id || p.ownerId) === ownerId)
    );
  }

  async function savePlan(date: string, ownerId: string, items: Array<{ accountId: string; note?: string }>) {
    setSaving(true);
    setError(null);
    try {
      const r = await fetch('/api/crm/plan', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, ownerId, items }),
      });
      if (!r.ok) throw new Error((await r.json()).error || 'Save failed');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  function itemsOf(plan: Plan | undefined): Array<{ accountId: string; note?: string }> {
    return (plan?.items || []).map((i) => ({
      accountId: String((i.accountId as { _id?: string })?._id || i.accountId),
      note: i.note,
    }));
  }

  if (!ready) return <Spinner />;
  if (error && !d) return <ErrorNote>{error}</ErrorNote>;
  if (!d) return null;

  /** When one rep is selected the week is his; otherwise it is the team's. */
  const single = rep !== 'all' ? rep : d.canPlanForOthers ? '' : d.reps[0]?._id || '';

  const exportWeek = (format?: 'pdf') => {
    const p = new URLSearchParams({ what: 'plan', from: iso(weekStart), to: iso(days[6]) });
    if (rep !== 'all') p.set('owner', rep);
    if (format) p.set('format', 'pdf');
    downloadFile(`/api/crm/export?${p}`).catch((e) => setError(e.message));
  };

  return (
    <div>
      <PageHeader
        title={t('admin.crmPlan')}
        subtitle={t('admin.crmPlanDesc')}
        backHref="/admin/crm"
        backLabel={t('admin.crmTitle')}
        actions={
          <>
            <Button variant="outline" icon={Download} onClick={() => exportWeek()}>{tx('Export to Excel')}</Button>
            <Button variant="outline" icon={Printer} onClick={() => exportWeek('pdf')}>{tx('PDF report')}</Button>
          </>
        }
      />

      {error && <div className="mb-4"><ErrorNote>{error}</ErrorNote></div>}

      <Card className="mb-5">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              icon={ChevronLeft}
              aria-label={tx('Previous week')}
              onClick={() => setWeekStart(new Date(weekStart.getTime() - 7 * 86400000))}
            />
            <Button variant="outline" size="sm" onClick={() => setWeekStart(sundayOf(new Date()))}>
              {tx('This week')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              icon={ChevronRight}
              aria-label={tx('Next week')}
              onClick={() => setWeekStart(new Date(weekStart.getTime() + 7 * 86400000))}
            />
          </div>
          <p className="inline-flex items-center gap-1.5 text-sm text-fg">
            <CalendarDays size={14} className="text-fg-subtle" />
            {new Date(weekStart).toLocaleDateString(ar ? 'ar-SA' : 'en-GB', { day: 'numeric', month: 'short' })}
            {' — '}
            {days[6].toLocaleDateString(ar ? 'ar-SA' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
          </p>

          {d.canPlanForOthers && (
            <div className="w-56">
              <Select value={rep} onChange={(e) => setRep(e.target.value)} aria-label={tx('Rep')}>
                <option value="all">{tx('The whole team')}</option>
                {d.reps.map((r) => (
                  <option key={r._id} value={r._id}>{r.name}{r.region ? ` — ${r.region}` : ''}</option>
                ))}
              </Select>
            </div>
          )}
        </div>
      </Card>

      <AutoGrid min="12rem" gap="0.75rem" className="mb-5">
        <Stat label={tx('Planned calls')} value={d.summary.planned} />
        <Stat label={tx('Actually made')} value={d.summary.kept} />
        <Stat
          label={tx('Plan kept')}
          value={d.summary.adherencePct === null ? '—' : `${d.summary.adherencePct}%`}
        />
        <Stat
          label={tx('Visits nobody planned')}
          value={d.summary.unplannedVisits}
          note={tx('made, but not on a plan')}
        />
      </AutoGrid>

      <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
        {days.map((day) => {
          const key = iso(day);
          const dayPlans = d.plans.filter((p) => iso(new Date(p.date)) === key);
          const isToday = key === iso(new Date());
          return (
            <Card key={key} className={isToday ? 'border-brand' : ''}>
              <SectionTitle
                title={`${(ar ? DAYS_AR : DAYS_EN)[day.getDay()]} · ${day.getDate()}/${day.getMonth() + 1}`}
                actions={
                  single ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={Plus}
                      aria-label={tx('Add an account')}
                      onClick={() => { setAdding({ date: key, ownerId: single }); setQ(''); setFound([]); }}
                    />
                  ) : undefined
                }
              />

              {dayPlans.length === 0 ? (
                <p className="py-3 text-xs text-fg-subtle">{tx('Nothing planned.')}</p>
              ) : (
                dayPlans.map((plan) => {
                  const ownerId = String((plan.ownerId as { _id?: string })?._id || plan.ownerId);
                  return (
                    <div key={plan._id} className="mb-3 last:mb-0">
                      {rep === 'all' && (
                        <p className="mb-1.5 flex items-center justify-between gap-2 text-[11px] font-medium text-fg-muted">
                          <span>{plan.ownerName || (plan.ownerId as { name?: string })?.name}</span>
                          {plan.adherencePct !== null && (
                            <Badge tone={plan.adherencePct >= 80 ? 'ok' : plan.adherencePct >= 50 ? 'warn' : 'danger'}>
                              {plan.kept}/{plan.planned}
                            </Badge>
                          )}
                        </p>
                      )}
                      <ul className="space-y-1">
                        {plan.items.map((i) => {
                          const acc = i.accountId as { _id: string; name: string; nameAr?: string; city?: string };
                          return (
                            <li key={acc?._id || String(i.accountId)} className="flex items-center gap-2 text-sm">
                              {i.visited ? (
                                <Check size={13} className="shrink-0 text-ok" />
                              ) : (
                                <Circle size={13} className="shrink-0 text-fg-subtle" />
                              )}
                              <Link
                                href={`/admin/crm/accounts/${acc?._id}`}
                                className={`min-w-0 flex-1 truncate ${i.visited ? 'text-fg' : 'text-fg-muted'} hover:text-brand`}
                              >
                                {acc ? pick(acc.name, acc.nameAr) : '—'}
                              </Link>
                              <Button
                                variant="ghost"
                                size="sm"
                                icon={Trash2}
                                aria-label={tx('Remove')}
                                onClick={() =>
                                  savePlan(
                                    key,
                                    ownerId,
                                    itemsOf(plan).filter((x) => x.accountId !== String(acc?._id))
                                  )
                                }
                              />
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  );
                })
              )}
            </Card>
          );
        })}
      </div>

      {/* ---------------- adding an account to a day ---------------- */}
      <Modal
        open={!!adding}
        onClose={() => setAdding(null)}
        title={tx('Add an account to the plan')}
        subtitle={adding?.date}
        size="md"
        footer={<Button variant="ghost" onClick={() => setAdding(null)}>{tx('Close')}</Button>}
      >
        <div className="space-y-3">
          <div className="relative">
            <Search size={13} className="absolute start-3 top-1/2 -translate-y-1/2 text-fg-subtle" />
            <TextInput
              className="ps-10"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={tx('Search a company, a brand or a person…')}
              aria-label={tx('Search a company, a brand or a person…')}
              autoFocus
            />
          </div>
          <ul className="max-h-72 space-y-1 overflow-y-auto">
            {found.map((a) => (
              <li key={a._id}>
                <button
                  type="button"
                  disabled={saving}
                  onClick={async () => {
                    if (!adding) return;
                    const plan = planFor(new Date(adding.date), adding.ownerId);
                    const next = itemsOf(plan);
                    if (!next.some((x) => x.accountId === a._id)) next.push({ accountId: a._id });
                    await savePlan(adding.date, adding.ownerId, next);
                    setAdding(null);
                  }}
                  className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-start text-sm hover:bg-surface-2 disabled:opacity-50"
                >
                  <span className="min-w-0 truncate text-fg">{pick(a.name, a.nameAr)}</span>
                  <Badge tone="neutral">{a.stage}</Badge>
                </button>
              </li>
            ))}
            {q && found.length === 0 && (
              <li className="py-3 text-center text-sm text-fg-subtle">{tx('No matches')}</li>
            )}
          </ul>
        </div>
      </Modal>
    </div>
  );
}

function Stat({ label, value, note }: { label: string; value: number | string; note?: string }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-4">
      <p className="text-2xl font-bold text-fg">{value}</p>
      <p className="mt-0.5 text-[11px] font-medium leading-snug text-fg">{label}</p>
      {note && <p className="mt-0.5 text-[11px] leading-snug text-fg-subtle">{note}</p>}
    </div>
  );
}
