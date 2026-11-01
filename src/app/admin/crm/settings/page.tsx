'use client';

import { useCallback, useEffect, useState } from 'react';
import { GripVertical, Plus, Trash2 } from 'lucide-react';
import { SortableList } from '@/components/admin/SortableList';
import {
  ArabicInput, Button, Card, ErrorNote, Field, PageHeader, SaveButton,
  SectionTitle, PageSkeleton, TextInput, Toggle,
} from '@/components/admin/ui';
import { useLanguage } from '@/contexts/LanguageContext';
import { useApi } from '@/lib/useApi';
import { CRM_CATEGORIES } from '@/lib/crmVocab';

/**
 * How the team is asked to work — owned by the commercial manager.
 *
 * The visit checklist here is what a rep sees as tick-boxes while logging a
 * visit, so changing it changes the next call rather than requiring a release.
 * The targets are the ones the KPI screen measures everybody against, which is
 * why they are data: a number nobody can correct is a number nobody trusts.
 */

interface Item {
  key: string;
  order: number;
  labelEn: string;
  labelAr: string;
  required: boolean;
}

interface Targets {
  dailyVisits: { min: number; max: number };
  weeklyClients: { min: number; max: number };
  visitsPerAccountWeekly: number;
  visitsPerAccountMonthly: number;
  visitChecklist: Item[];
  sectorMix: Array<{ key: string; labelEn: string; labelAr: string; sharePct: number; categories: string[] }>;
}

const slug = (s: string) =>
  s.toLowerCase().replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-').slice(0, 40);

export default function CrmSettingsPage() {
  const { t, tx, pick } = useLanguage();
  const [d, setD] = useState<Targets | null>(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saved, setSaved] = useState(false);
  const [actionError, setError] = useState<string | null>(null);

  const { data, ready, error: loadError, reload: load } = useApi<Partial<Targets>>('/api/crm/targets');
  const error = actionError || loadError;

  // A form holds its own copy. An answer arriving mid-edit must not overwrite
  // what is being typed, so it only lands while nothing is unsaved.
  useEffect(() => {
    if (!data || dirty) return;
    setD({
      dailyVisits: data.dailyVisits || { min: 4, max: 5 },
      weeklyClients: data.weeklyClients || { min: 20, max: 25 },
      visitsPerAccountWeekly: data.visitsPerAccountWeekly ?? 1,
      visitsPerAccountMonthly: data.visitsPerAccountMonthly ?? 4,
      visitChecklist: (data.visitChecklist || []).slice().sort((a: Item, b: Item) => a.order - b.order),
      sectorMix: data.sectorMix || [],
    });
  }, [data, dirty]);

  function patch(next: Partial<Targets>) {
    setD((prev) => (prev ? { ...prev, ...next } : prev));
    setDirty(true);
    setSaved(false);
  }

  async function save() {
    if (!d) return;
    setSaving(true);
    setError(null);
    try {
      const r = await fetch('/api/crm/targets', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...d,
          visitChecklist: d.visitChecklist.map((c, i) => ({ ...c, order: i + 1 })),
        }),
      });
      if (!r.ok) throw new Error((await r.json()).error || 'Save failed');
      setDirty(false);
      setSaved(true);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  if (!ready) return <PageSkeleton rows={8} />;
  if (error && !d) return <ErrorNote>{error}</ErrorNote>;
  if (!d) return null;

  const mixTotal = d.sectorMix.reduce((n, g) => n + (Number(g.sharePct) || 0), 0);

  return (
    <div>
      <PageHeader
        title={t('admin.crmSettings')}
        subtitle={t('admin.crmSettingsDesc')}
        backHref="/admin/crm"
        backLabel={t('admin.crmTitle')}
        actions={<SaveButton onClick={save} saving={saving} disabled={!dirty} />}
      />

      {error && <div className="mb-4"><ErrorNote>{error}</ErrorNote></div>}
      {saved && (
        <p className="mb-4 rounded-xl border border-line bg-brand-soft px-4 py-2.5 text-sm text-brand-soft-fg">
          {tx('Saved — the reps see this on their next visit.')}
        </p>
      )}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
        {/* ---------------------- the call structure ---------------------- */}
        <Card padded={false}>
          <div className="border-b border-line p-4 sm:p-5">
            <SectionTitle
              title={tx('What a rep does on a visit')}
              hint={tx('These appear as tick-boxes while a visit is being logged, in the order below.')}
              actions={
                <Button
                  variant="outline"
                  size="sm"
                  icon={Plus}
                  onClick={() =>
                    patch({
                      visitChecklist: [
                        ...d.visitChecklist,
                        {
                          key: `step-${Date.now().toString(36)}`,
                          order: d.visitChecklist.length + 1,
                          labelEn: '',
                          labelAr: '',
                          required: false,
                        },
                      ],
                    })
                  }
                >
                  {tx('Add a step')}
                </Button>
              }
            />
          </div>

          <div className="p-3 sm:p-4">
            {d.visitChecklist.length === 0 ? (
              <p className="py-6 text-center text-sm text-fg-subtle">
                {tx('No steps yet. Add the first thing a rep should do.')}
              </p>
            ) : (
              <SortableList
                items={d.visitChecklist}
                onReorder={(next) => patch({ visitChecklist: next })}
                getKey={(c) => c.key}
                className="space-y-2"
                renderItem={(item, idx, handle) => (
                  <div className="rounded-xl border border-line bg-surface p-2.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="shrink-0 text-fg-subtle">{handle}</span>
                      <span className="w-5 shrink-0 text-center font-mono text-xs text-fg-subtle">
                        {idx + 1}
                      </span>
                      <TextInput
                        className="min-w-0 flex-1 text-sm"
                        value={item.labelEn}
                        placeholder={tx('In English')}
                        onChange={(e) =>
                          patch({
                            visitChecklist: d.visitChecklist.map((c) =>
                              c.key === item.key
                                ? {
                                    ...c,
                                    labelEn: e.target.value,
                                    // A step typed from scratch gets a key from
                                    // its English text, once.
                                    key: c.key.startsWith('step-') && e.target.value
                                      ? slug(e.target.value) || c.key
                                      : c.key,
                                  }
                                : c
                            ),
                          })
                        }
                      />
                      <ArabicInput
                        className="min-w-0 flex-1 text-sm"
                        value={item.labelAr}
                        placeholder={tx('In Arabic')}
                        onChange={(e) =>
                          patch({
                            visitChecklist: d.visitChecklist.map((c) =>
                              c.key === item.key ? { ...c, labelAr: e.target.value } : c
                            ),
                          })
                        }
                      />
                      <div className="w-32 shrink-0">
                        <Toggle
                          label={tx('Expected')}
                          value={item.required}
                          onChange={(v) =>
                            patch({
                              visitChecklist: d.visitChecklist.map((c) =>
                                c.key === item.key ? { ...c, required: v } : c
                              ),
                            })
                          }
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={Trash2}
                        aria-label={tx('Remove')}
                        onClick={() =>
                          patch({ visitChecklist: d.visitChecklist.filter((c) => c.key !== item.key) })
                        }
                      />
                    </div>
                  </div>
                )}
              />
            )}
            <p className="mt-3 flex items-center gap-1.5 text-[11px] text-fg-subtle">
              <GripVertical size={12} />
              {t('admin.reorderHint')}
            </p>
          </div>
        </Card>

        {/* ---------------------- the numbers ---------------------- */}
        <div className="space-y-5">
          <Card>
            <SectionTitle
              title={tx('Visit targets')}
              hint={tx('What the KPI screen measures everyone against.')}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={tx('Visits a day, from')}>
                <TextInput
                  type="number"
                  min={0}
                  value={d.dailyVisits.min}
                  onChange={(e) =>
                    patch({ dailyVisits: { ...d.dailyVisits, min: Number(e.target.value) || 0 } })
                  }
                />
              </Field>
              <Field label={tx('to')}>
                <TextInput
                  type="number"
                  min={0}
                  value={d.dailyVisits.max}
                  onChange={(e) =>
                    patch({ dailyVisits: { ...d.dailyVisits, max: Number(e.target.value) || 0 } })
                  }
                />
              </Field>
              <Field label={tx('Clients a week, from')}>
                <TextInput
                  type="number"
                  min={0}
                  value={d.weeklyClients.min}
                  onChange={(e) =>
                    patch({ weeklyClients: { ...d.weeklyClients, min: Number(e.target.value) || 0 } })
                  }
                />
              </Field>
              <Field label={tx('to')}>
                <TextInput
                  type="number"
                  min={0}
                  value={d.weeklyClients.max}
                  onChange={(e) =>
                    patch({ weeklyClients: { ...d.weeklyClients, max: Number(e.target.value) || 0 } })
                  }
                />
              </Field>
              <Field label={tx('Visits per account, weekly')}>
                <TextInput
                  type="number"
                  min={0}
                  value={d.visitsPerAccountWeekly}
                  onChange={(e) => patch({ visitsPerAccountWeekly: Number(e.target.value) || 0 })}
                />
              </Field>
              <Field label={tx('Monthly')}>
                <TextInput
                  type="number"
                  min={0}
                  value={d.visitsPerAccountMonthly}
                  onChange={(e) => patch({ visitsPerAccountMonthly: Number(e.target.value) || 0 })}
                />
              </Field>
            </div>
          </Card>

          <Card>
            <SectionTitle
              title={tx('How visits should be split')}
              hint={tx('The share of visits each kind of account should get.')}
              actions={
                <span className={`badge ${mixTotal === 100 ? 'badge-ok' : 'badge-warn'}`}>
                  {mixTotal}%
                </span>
              }
            />
            <ul className="space-y-3">
              {d.sectorMix.map((g) => (
                <li key={g.key}>
                  <div className="flex items-center gap-3">
                    <span className="min-w-0 flex-1 truncate text-sm text-fg">
                      {pick(g.labelEn, g.labelAr)}
                    </span>
                    <div className="w-24 shrink-0">
                      <TextInput
                        type="number"
                        min={0}
                        max={100}
                        value={g.sharePct}
                        aria-label={pick(g.labelEn, g.labelAr)}
                        onChange={(e) =>
                          patch({
                            sectorMix: d.sectorMix.map((x) =>
                              x.key === g.key ? { ...x, sharePct: Number(e.target.value) || 0 } : x
                            ),
                          })
                        }
                      />
                    </div>
                  </div>
                  <p className="mt-1 text-[11px] text-fg-subtle">
                    {g.categories
                      .map((c) => {
                        const m = CRM_CATEGORIES.find((x) => x.key === c || x.labelEn === c);
                        return m ? pick(m.labelEn, m.labelAr) : c;
                      })
                      .join(' · ')}
                  </p>
                </li>
              ))}
            </ul>
            {mixTotal !== 100 && (
              <p className="mt-3 text-xs text-warn">
                {tx('The shares do not add up to 100% — the KPI screen will still compare against them as entered.')}
              </p>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
