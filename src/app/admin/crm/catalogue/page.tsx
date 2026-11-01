'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Beaker, CircleDollarSign, Download, FlaskConical, Pencil, Plus, Printer,
  Search, Tag, Trash2,
} from 'lucide-react';
import {
  ArabicTextArea, AutoGrid, Badge, Button, Card, DataTable, EmptyState, ErrorNote,
  Field, Modal, PageHeader, SectionTitle, Select, Spinner, Td, TextArea, TextInput, Th,
} from '@/components/admin/ui';
import { useLanguage } from '@/contexts/LanguageContext';
import { downloadFile } from '@/lib/download';

/**
 * The code catalogue — what the sales team quotes from.
 *
 * Read as analysis first and a table second: the question asked of this sheet
 * is rarely "what is row 14", it is "how much of the range is costed", "where
 * do we sit against the benchmark", "which category is still in development".
 * So the figures come first and the rows are underneath them.
 *
 * The summary recomputes on the filters, so narrowing to Hair Care answers
 * those questions for Hair Care.
 */

interface Item {
  _id: string;
  category: string;
  product: string;
  sizeCode?: string;
  code?: string;
  status?: string;
  volume?: number;
  benchmarkIntl?: string;
  rspSaudi?: number;
  benchmarkEgypt?: string;
  benchmarkSaudi?: string;
  package?: string;
  form?: string;
  ingredients?: string;
  priceEccEgp?: number;
  bonnSar?: number;
  alKamalUae?: number;
  cost?: number;
  rsp?: number;
  costRatio?: number;
  kccRecommendedSar?: number;
  notes?: string;
}

interface Payload {
  items: Item[];
  facets: { categories: string[]; statuses: string[]; packages: string[]; forms: string[] };
  summary: {
    total: number; confirmed: number; inDevelopment: number;
    withCost: number; withoutCost: number; withPrice: number;
    avgCostRatio: number | null; avgCost: number | null;
    avgKcc: number | null; avgBenchmark: number | null;
  };
  byCategory: Array<{ _id: string; n: number; confirmed: number; avgCostRatio: number | null }>;
}

const BLANK: Partial<Item> = { category: '', product: '', status: '' };

export default function CataloguePage() {
  const { t, tx, locale } = useLanguage();
  const ar = locale === 'ar';

  const [d, setD] = useState<Payload | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [q, setQ] = useState('');
  const [category, setCategory] = useState('all');
  const [status, setStatus] = useState('all');
  const [pack, setPack] = useState('all');
  const [costed, setCosted] = useState('all');

  const [editing, setEditing] = useState<Partial<Item> | null>(null);

  const load = useCallback(async () => {
    try {
      const p = new URLSearchParams();
      if (q.trim()) p.set('q', q.trim());
      if (category !== 'all') p.set('category', category);
      if (status !== 'all') p.set('status', status);
      if (pack !== 'all') p.set('package', pack);
      if (costed !== 'all') p.set('costed', costed);

      const r = await fetch(`/api/crm/catalogue?${p}`, { cache: 'no-store' });
      if (!r.ok) throw new Error((await r.json()).error || 'Could not load the catalogue');
      setD(await r.json());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Load failed');
    } finally {
      setReady(true);
    }
  }, [q, category, status, pack, costed]);

  useEffect(() => {
    const timer = setTimeout(load, q ? 250 : 0);
    return () => clearTimeout(timer);
  }, [load, q]);

  async function save() {
    if (!editing) return;
    setSaving(true);
    setError(null);
    try {
      const isNew = !editing._id;
      const r = await fetch(isNew ? '/api/crm/catalogue' : `/api/crm/catalogue/${editing._id}`, {
        method: isNew ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editing),
      });
      if (!r.ok) throw new Error((await r.json()).error || 'Save failed');
      setEditing(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function archive(item: Item) {
    setSaving(true);
    try {
      await fetch(`/api/crm/catalogue/${item._id}`, { method: 'DELETE' });
      setEditing(null);
      await load();
    } finally {
      setSaving(false);
    }
  }

  const maxCat = useMemo(() => Math.max(1, ...(d?.byCategory || []).map((c) => c.n)), [d]);

  /** English headers whatever the screen language: this file goes to partners. */
  const exportRows = (format?: 'pdf') => {
    const p = new URLSearchParams({ what: 'catalogue' });
    if (format) p.set('format', 'pdf');
    if (q.trim()) p.set('q', q.trim());
    if (category !== 'all') p.set('category', category);
    if (status !== 'all') p.set('status', status);
    if (pack !== 'all') p.set('package', pack);
    if (costed !== 'all') p.set('costed', costed);
    downloadFile(`/api/crm/export?${p}`).catch((e) => setError(e.message));
  };

  if (!ready) return <Spinner />;
  if (error && !d) return <ErrorNote>{error}</ErrorNote>;
  if (!d) return null;

  const s = d.summary;
  const costRatioPct = s.avgCostRatio != null ? Math.round(s.avgCostRatio * 100) : null;
  const vsBenchmark =
    s.avgKcc && s.avgBenchmark ? Math.round((s.avgKcc / s.avgBenchmark) * 100) : null;

  return (
    <div>
      <PageHeader
        title={t('admin.crmCatalogue')}
        subtitle={t('admin.crmCatalogueDesc')}
        backHref="/admin/crm"
        backLabel={t('admin.crmTitle')}
        actions={
          <>
            <Button variant="outline" icon={Download} onClick={() => exportRows()}>{tx('Export to Excel')}</Button>
            <Button variant="outline" icon={Printer} onClick={() => exportRows('pdf')}>{tx('PDF report')}</Button>
            <Button icon={Plus} onClick={() => setEditing({ ...BLANK })}>{tx('Add a product')}</Button>
          </>
        }
      />

      {error && <div className="mb-4"><ErrorNote>{error}</ErrorNote></div>}

      {/* ------------------------------ the analysis ------------------------------ */}
      <AutoGrid min="13rem" gap="0.75rem" className="mb-5">
        <Analysis
          icon={FlaskConical}
          value={`${s.confirmed}/${s.total}`}
          label={tx('Confirmed codes')}
          note={`${s.inDevelopment} ${tx('still in development')}`}
          pct={s.total ? (s.confirmed / s.total) * 100 : 0}
        />
        <Analysis
          icon={CircleDollarSign}
          value={`${s.withCost}/${s.total}`}
          label={tx('Costed')}
          note={`${s.withoutCost} ${tx('with no cost worked out')}`}
          pct={s.total ? (s.withCost / s.total) * 100 : 0}
        />
        <Analysis
          icon={Tag}
          value={costRatioPct != null ? `${costRatioPct}%` : '—'}
          label={tx('Cost as a share of shelf price')}
          note={costRatioPct != null ? `${100 - costRatioPct}% ${tx('gross margin implied')}` : tx('no costed rows in this view')}
          pct={costRatioPct ?? 0}
        />
        <Analysis
          icon={Beaker}
          value={vsBenchmark != null ? `${vsBenchmark}%` : '—'}
          label={tx('Our price against the benchmark')}
          note={
            s.avgKcc && s.avgBenchmark
              ? `${s.avgKcc} ${tx('vs')} ${s.avgBenchmark} ${tx('SAR average')}`
              : tx('not enough prices to compare')
          }
          pct={Math.min(100, vsBenchmark ?? 0)}
        />
        <Analysis
          icon={Tag}
          value={String(d.byCategory.length)}
          label={tx('Categories in this view')}
          note={`${s.withPrice} ${tx('have a recommended price')}`}
          pct={s.total ? (s.withPrice / s.total) * 100 : 0}
        />
      </AutoGrid>

      <Card className="mb-5">
        <SectionTitle
          title={tx('By category')}
          hint={tx('Bar length is the number of codes; the figure is how many are confirmed.')}
        />
        <ul className="space-y-2">
          {d.byCategory.map((c) => (
            <li key={c._id}>
              <button
                type="button"
                onClick={() => setCategory(c._id === category ? 'all' : c._id)}
                className="group flex w-full items-center gap-3 text-start"
              >
                <span className={`w-40 shrink-0 truncate text-sm ${c._id === category ? 'font-semibold text-brand' : 'text-fg group-hover:text-brand'}`}>
                  {c._id}
                </span>
                <span className="h-2.5 min-w-0 flex-1 overflow-hidden rounded-full bg-surface-3">
                  <span className="block h-full rounded-e-[4px] bg-brand" style={{ width: `${(c.n / maxCat) * 100}%` }} />
                </span>
                <span className="w-32 shrink-0 text-end font-mono text-xs text-fg-muted">
                  {c.n}
                  <span className="text-fg-subtle"> · {c.confirmed} {tx('confirmed')}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </Card>

      {/* ------------------------------ filters ------------------------------ */}
      <Card className="mb-4 print:hidden">
        <div className="flex flex-wrap items-end gap-3">
          <div className="relative min-w-0 flex-1 sm:max-w-xs">
            <Search size={13} className="absolute start-3 top-1/2 -translate-y-1/2 text-fg-subtle" />
            <TextInput
              className="ps-10 text-sm"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={tx('Search a product, a code or an ingredient…')}
              aria-label={tx('Search a product, a code or an ingredient…')}
            />
          </div>
          <Picker label={tx('Category')} value={category} onChange={setCategory} options={d.facets.categories} allLabel={tx('All categories')} />
          <Picker label={tx('Status')} value={status} onChange={setStatus} options={d.facets.statuses} allLabel={tx('Any status')} />
          <Picker label={tx('Package')} value={pack} onChange={setPack} options={d.facets.packages} allLabel={tx('Any package')} />
          <div className="w-40">
            <label className="field-label" htmlFor="cat-costed">{tx('Costing')}</label>
            <Select id="cat-costed" value={costed} onChange={(e) => setCosted(e.target.value)}>
              <option value="all">{tx('Costed or not')}</option>
              <option value="yes">{tx('Costed')}</option>
              <option value="no">{tx('Not costed')}</option>
            </Select>
          </div>
          <p className="ms-auto pb-2.5 text-xs text-fg-muted">{d.items.length} {tx('products')}</p>
        </div>
      </Card>

      {/* ------------------------------ the rows ------------------------------ */}
      {d.items.length === 0 ? (
        <EmptyState title={tx('Nothing matches these filters')} hint={tx('Clear a filter, or add a product.')} />
      ) : (
        <DataTable>
          <thead>
            <tr>
              <Th>{tx('Code')}</Th>
              <Th>{tx('Product')}</Th>
              <Th>{tx('Category')}</Th>
              <Th align="center">{tx('Volume')}</Th>
              <Th>{tx('Package')}</Th>
              <Th align="end">{tx('Cost')}</Th>
              <Th align="end">{tx('Shelf price')}</Th>
              <Th align="center">{tx('Cost share')}</Th>
              <Th align="end">{tx('KCC price')}</Th>
              <Th align="center">{tx('Status')}</Th>
              <Th align="end">{tx('Actions')}</Th>
            </tr>
          </thead>
          <tbody>
            {d.items.map((i) => (
              <tr
                key={i._id}
                onClick={() => setEditing({ ...i })}
                className="cursor-pointer hover:bg-surface-2/40"
              >
                <Td><span className="font-mono text-xs text-fg">{i.code || '—'}</span></Td>
                <Td>
                  <p className="font-medium text-fg">{i.product}</p>
                  {i.benchmarkIntl && (
                    <p className="mt-0.5 truncate text-[11px] text-fg-subtle">{tx('vs')} {i.benchmarkIntl}</p>
                  )}
                </Td>
                <Td><span className="text-xs text-fg-muted">{i.category}</span></Td>
                <Td align="center"><span className="text-xs text-fg-muted">{i.volume ? `${i.volume} ml` : '—'}</span></Td>
                <Td><span className="text-xs text-fg-muted">{i.package || '—'}</span></Td>
                <Td align="end"><span className="font-mono text-xs">{i.cost ?? '—'}</span></Td>
                <Td align="end"><span className="font-mono text-xs">{i.rsp ?? '—'}</span></Td>
                <Td align="center">
                  {i.costRatio != null ? (
                    <Badge tone={i.costRatio <= 0.15 ? 'ok' : i.costRatio <= 0.25 ? 'warn' : 'danger'}>
                      {Math.round(i.costRatio * 100)}%
                    </Badge>
                  ) : (
                    <span className="text-xs text-fg-subtle">—</span>
                  )}
                </Td>
                <Td align="end"><span className="font-mono text-xs font-semibold text-fg">{i.kccRecommendedSar ?? '—'}</span></Td>
                <Td align="center">
                  {i.status === 'Confirmed' ? (
                    <Badge tone="ok">{tx('Confirmed')}</Badge>
                  ) : (
                    <Badge tone="neutral">{tx('In development')}</Badge>
                  )}
                </Td>
                <Td align="end">
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={Pencil}
                    aria-label={tx('Edit')}
                    onClick={(e) => { e.stopPropagation(); setEditing({ ...i }); }}
                  />
                </Td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      )}

      {/* ------------------------------ editing ------------------------------ */}
      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing?._id ? tx('Edit the product') : tx('Add a product')}
        subtitle={editing?.code || undefined}
        size="xl"
        footer={
          <>
            {editing?._id && (
              <Button
                variant="danger"
                icon={Trash2}
                onClick={() => editing && archive(editing as Item)}
                loading={saving}
                className="me-auto"
              >
                {tx('Archive')}
              </Button>
            )}
            <Button variant="ghost" onClick={() => setEditing(null)}>{tx('Cancel')}</Button>
            <Button onClick={save} loading={saving} disabled={!editing?.product || !editing?.category}>
              {tx('Save')}
            </Button>
          </>
        }
      >
        {editing && (
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Txt label={tx('Code')} k="code" v={editing} set={setEditing} mono />
              <Txt label={tx('Category')} k="category" v={editing} set={setEditing} required />
              <Txt label={tx('Status')} k="status" v={editing} set={setEditing} hint={tx('Confirmed, or leave blank while in development.')} />
              <Txt label={tx('Product')} k="product" v={editing} set={setEditing} required className="sm:col-span-2" />
              <Txt label={tx('Size code')} k="sizeCode" v={editing} set={setEditing} />
              <Num label={tx('Volume (ml)')} k="volume" v={editing} set={setEditing} />
              <Txt label={tx('Package')} k="package" v={editing} set={setEditing} />
              <Txt label={tx('Form')} k="form" v={editing} set={setEditing} />
            </div>

            <SectionTitle title={tx('What it is measured against')} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Txt label={tx('International benchmark')} k="benchmarkIntl" v={editing} set={setEditing} />
              <Num label={tx('Its shelf price in Saudi (SAR)')} k="rspSaudi" v={editing} set={setEditing} />
              <Txt label={tx('Saudi benchmark brand')} k="benchmarkSaudi" v={editing} set={setEditing} />
              <Txt label={tx('Egypt benchmark')} k="benchmarkEgypt" v={editing} set={setEditing} />
            </div>

            <SectionTitle
              title={tx('Costing and price')}
              hint={tx('The cost share is worked out from the cost and the shelf price — it is not typed.')}
            />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Num label={tx('Cost (SAR)')} k="cost" v={editing} set={setEditing} />
              <Num label={tx('Shelf price (SAR)')} k="rsp" v={editing} set={setEditing} />
              <Num label={tx('KCC recommended (SAR)')} k="kccRecommendedSar" v={editing} set={setEditing} />
              <Num label={tx('ECC price (EGP)')} k="priceEccEgp" v={editing} set={setEditing} />
              <Num label={tx('Bonn factory (SAR)')} k="bonnSar" v={editing} set={setEditing} />
              <Num label={tx('Al Kamal UAE')} k="alKamalUae" v={editing} set={setEditing} />
            </div>
            {editing.cost != null && editing.rsp ? (
              <p className="rounded-xl bg-surface-2 px-3.5 py-2.5 text-xs text-fg-muted">
                {tx('Cost is')} {Math.round((Number(editing.cost) / Number(editing.rsp)) * 100)}%{' '}
                {tx('of the shelf price')}
              </p>
            ) : null}

            <SectionTitle title={tx('Formula')} />
            <Field label={tx('Ingredients')}>
              {ar ? (
                <ArabicTextArea
                  rows={4}
                  value={editing.ingredients || ''}
                  onChange={(e) => setEditing({ ...editing, ingredients: e.target.value })}
                />
              ) : (
                <TextArea
                  rows={4}
                  value={editing.ingredients || ''}
                  onChange={(e) => setEditing({ ...editing, ingredients: e.target.value })}
                />
              )}
            </Field>
            <Field label={tx('Notes')}>
              <TextArea
                rows={2}
                value={editing.notes || ''}
                onChange={(e) => setEditing({ ...editing, notes: e.target.value })}
              />
            </Field>
          </div>
        )}
      </Modal>
    </div>
  );
}

function Analysis({
  icon: Icon, value, label, note, pct,
}: {
  icon: React.ElementType; value: string; label: string; note: string; pct: number;
}) {
  return (
    <div className="rounded-xl border border-line bg-surface p-4">
      <Icon size={15} className="mb-2 text-fg-subtle" />
      <p className="text-2xl font-bold leading-none text-fg">{value}</p>
      <p className="mt-1.5 text-[11px] font-medium leading-snug text-fg">{label}</p>
      <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-surface-3">
        <span className="block h-full rounded-e-[4px] bg-brand" style={{ width: `${Math.max(2, Math.min(100, pct))}%` }} />
      </span>
      <p className="mt-1.5 text-[11px] leading-snug text-fg-subtle">{note}</p>
    </div>
  );
}

function Picker({
  label, value, onChange, options, allLabel,
}: {
  label: string; value: string; onChange: (v: string) => void; options: string[]; allLabel: string;
}) {
  const id = `pick-${label.replace(/\s/g, '')}`;
  return (
    <div className="w-40">
      <label className="field-label" htmlFor={id}>{label}</label>
      <Select id={id} value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="all">{allLabel}</option>
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </Select>
    </div>
  );
}

function Txt({
  label, k, v, set, required, mono, hint, className,
}: {
  label: string; k: keyof Item; v: Partial<Item>;
  set: (x: Partial<Item>) => void;
  required?: boolean; mono?: boolean; hint?: string; className?: string;
}) {
  return (
    <Field label={label} required={required} hint={hint} className={className}>
      <TextInput
        className={mono ? 'font-mono text-sm' : ''}
        value={(v[k] as string) || ''}
        onChange={(e) => set({ ...v, [k]: e.target.value })}
      />
    </Field>
  );
}

function Num({
  label, k, v, set,
}: {
  label: string; k: keyof Item; v: Partial<Item>; set: (x: Partial<Item>) => void;
}) {
  return (
    <Field label={label}>
      <TextInput
        type="number"
        min={0}
        step="0.01"
        inputMode="decimal"
        value={v[k] === null || v[k] === undefined ? '' : String(v[k])}
        onChange={(e) => set({ ...v, [k]: e.target.value === '' ? null : Number(e.target.value) })}
      />
    </Field>
  );
}
