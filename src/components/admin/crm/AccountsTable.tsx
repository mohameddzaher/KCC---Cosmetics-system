'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Download, Phone, Plus, Printer, Search } from 'lucide-react';
import {
  Badge, Button, Card, DataTable, EmptyState, ErrorNote, Select, Spinner, Td, Th, TextInput,
} from '@/components/admin/ui';
import { useLanguage } from '@/contexts/LanguageContext';
import { downloadFile } from '@/lib/download';
import { CRM_CATEGORIES, CRM_CITIES } from '@/lib/crmVocab';
import { STEP_ORDER } from '@/lib/crmProgress';
import LogActionModal, { type LogTarget } from './LogActionModal';

/**
 * A filtered list of accounts, with the action that moves them.
 *
 * The upcoming and current screens are this component with a different stage —
 * one list, one query, so the two can never tell different stories about the
 * same company.
 */

export interface AccountRow {
  _id: string;
  name: string;
  nameAr?: string;
  category?: string;
  city?: string;
  segment?: string;
  brands?: string[];
  keyPerson?: { name?: string; position?: string; phone?: string };
  stage: string;
  ownerName?: string;
  ownerId?: { name?: string } | string;
  steps?: Record<string, unknown>;
  visitCount?: number;
  meetingCount?: number;
  activityCount?: number;
  lastActionAt?: string;
}

export default function AccountsTable({
  stage,
  emptyTitle,
  emptyHint,
}: {
  stage: 'upcoming' | 'current' | 'hold' | 'won' | 'lost' | 'all';
  emptyTitle: string;
  emptyHint?: string;
}) {
  const { tx, pick, locale } = useLanguage();
  const ar = locale === 'ar';

  const [items, setItems] = useState<AccountRow[]>([]);
  const [total, setTotal] = useState(0);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  const [q, setQ] = useState('');
  const [category, setCategory] = useState('all');
  const [city, setCity] = useState('all');
  const [sort, setSort] = useState('recent');
  const [logging, setLogging] = useState<LogTarget | null>(null);

  /** The filters in force, shared by the list and its export. */
  const query = useCallback(() => {
    const p = new URLSearchParams({ stage, sort, limit: '200' });
    if (q.trim()) p.set('q', q.trim());
    if (category !== 'all') p.set('category', category);
    if (city !== 'all') p.set('city', city);
    return p;
  }, [stage, sort, q, category, city]);

  const load = useCallback(async () => {
    try {
      const p = query();

      const r = await fetch(`/api/crm/accounts?${p}`, { cache: 'no-store' });
      if (!r.ok) throw new Error('Could not load the accounts');
      const d = await r.json();
      setItems(Array.isArray(d.items) ? d.items : []);
      setTotal(d.total || 0);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Load failed');
    } finally {
      setReady(true);
    }
  }, [query]);

  useEffect(() => {
    const t = setTimeout(load, q ? 250 : 0);
    return () => clearTimeout(t);
  }, [load, q]);

  const cities = useMemo(
    () => CRM_CITIES.filter((c) => c.key !== 'other').concat(CRM_CITIES.filter((c) => c.key === 'other')),
    []
  );

  if (!ready) return <Spinner />;

  return (
    <div>
      {error && (
        <div className="mb-4">
          <ErrorNote>{error}</ErrorNote>
        </div>
      )}
      {flash && (
        <div className="mb-4 rounded-xl border border-line bg-brand-soft px-4 py-2.5 text-sm text-brand-soft-fg">
          {flash}
        </div>
      )}

      <Card className="mb-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="relative min-w-0 flex-1 sm:max-w-xs">
            <Search size={13} className="absolute start-3 top-1/2 -translate-y-1/2 text-fg-subtle" />
            <TextInput
              className="ps-10 text-sm"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={tx('Search a company, a brand or a person…')}
              aria-label={tx('Search a company, a brand or a person…')}
            />
          </div>
          <div className="w-44">
            <label className="field-label" htmlFor="crm-cat">{tx('Sector')}</label>
            <Select id="crm-cat" value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="all">{tx('All sectors')}</option>
              {CRM_CATEGORIES.map((c) => (
                <option key={c.key} value={c.key}>{ar ? c.labelAr : c.labelEn}</option>
              ))}
            </Select>
          </div>
          <div className="w-40">
            <label className="field-label" htmlFor="crm-city">{tx('City')}</label>
            <Select id="crm-city" value={city} onChange={(e) => setCity(e.target.value)}>
              <option value="all">{tx('All cities')}</option>
              {cities.map((c) => (
                <option key={c.key} value={c.key}>{ar ? c.labelAr : c.labelEn}</option>
              ))}
            </Select>
          </div>
          <div className="w-40">
            <label className="field-label" htmlFor="crm-sort">{tx('Sort')}</label>
            <Select id="crm-sort" value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="recent">{tx('Most recent action')}</option>
              <option value="name">{tx('Name')}</option>
              <option value="progress">{tx('Most worked')}</option>
            </Select>
          </div>
          <div className="ms-auto flex flex-wrap items-center gap-2 pb-1 print:hidden">
            <p className="text-xs text-fg-muted">
              {total} {tx('accounts')}
            </p>
            <Button
              variant="outline"
              size="sm"
              icon={Download}
              onClick={() => {
                const p = query();
                p.set('what', 'accounts');
                p.delete('limit');
                p.delete('sort');
                downloadFile(`/api/crm/export?${p}`).catch((e) => setError(e.message));
              }}
            >
              {tx('Export to Excel')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              icon={Printer}
              onClick={() => {
                const p = query();
                p.set('what', 'accounts');
                p.set('format', 'pdf');
                p.delete('limit');
                p.delete('sort');
                downloadFile(`/api/crm/export?${p}`).catch((e) => setError(e.message));
              }}
            >
              {tx('PDF report')}
            </Button>
          </div>
        </div>
      </Card>

      {items.length === 0 ? (
        <EmptyState title={emptyTitle} hint={emptyHint} />
      ) : (
        <DataTable>
          <thead>
            <tr>
              <Th>{tx('Company')}</Th>
              <Th>{tx('Sector')}</Th>
              <Th>{tx('City')}</Th>
              <Th>{tx('Key person')}</Th>
              <Th align="center">{tx('Progress')}</Th>
              <Th align="center">{tx('Last action')}</Th>
              <Th align="end">{tx('Actions')}</Th>
            </tr>
          </thead>
          <tbody>
            {items.map((a) => {
              const done = STEP_ORDER.filter((k) => a.steps?.[k]).length;
              const cat = CRM_CATEGORIES.find((c) => c.key === a.category);
              const cty = CRM_CITIES.find((c) => c.key === a.city);
              return (
                <tr key={a._id} className="hover:bg-surface-2/40">
                  <Td>
                    <Link
                      href={`/admin/crm/accounts/${a._id}`}
                      className="font-medium text-fg hover:text-brand"
                    >
                      {pick(a.name, a.nameAr)}
                    </Link>
                    {a.brands && a.brands.length > 0 && (
                      <p className="mt-0.5 truncate text-[11px] text-fg-subtle">
                        {a.brands.slice(0, 3).join(' · ')}
                      </p>
                    )}
                  </Td>
                  <Td>
                    <span className="text-xs text-fg-muted">
                      {cat ? (ar ? cat.labelAr : cat.labelEn) : a.category || '—'}
                    </span>
                  </Td>
                  <Td>
                    <span className="text-xs text-fg-muted">
                      {cty ? (ar ? cty.labelAr : cty.labelEn) : a.city || '—'}
                    </span>
                  </Td>
                  <Td>
                    {a.keyPerson?.name || a.keyPerson?.phone ? (
                      <div className="text-xs">
                        <p className="text-fg">{a.keyPerson?.name || '—'}</p>
                        {a.keyPerson?.phone && (
                          <a
                            href={`tel:${a.keyPerson.phone}`}
                            dir="ltr"
                            className="mt-0.5 inline-flex items-center gap-1 text-fg-subtle hover:text-brand"
                          >
                            <Phone size={10} />
                            {a.keyPerson.phone}
                          </a>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-fg-subtle">—</span>
                    )}
                  </Td>
                  <Td align="center">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="h-1.5 w-16 overflow-hidden rounded-full bg-surface-3">
                        <span
                          className="block h-full rounded-full bg-brand"
                          style={{ width: `${(done / STEP_ORDER.length) * 100}%` }}
                        />
                      </span>
                      <span className="font-mono text-[11px] text-fg-subtle">
                        {done}/{STEP_ORDER.length}
                      </span>
                    </span>
                  </Td>
                  <Td align="center">
                    {a.lastActionAt ? (
                      <span className="text-xs text-fg-muted">
                        {new Date(a.lastActionAt).toLocaleDateString(ar ? 'ar-SA' : 'en-GB', {
                          day: 'numeric', month: 'short',
                        })}
                      </span>
                    ) : (
                      <Badge tone="neutral">{tx('Not yet worked')}</Badge>
                    )}
                  </Td>
                  <Td align="end">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => setLogging({ _id: a._id, name: a.name, nameAr: a.nameAr, stage: a.stage })}
                        className="btn btn-outline btn-sm"
                      >
                        <Plus size={13} />
                        {tx('Log')}
                      </button>
                      <Link href={`/admin/crm/accounts/${a._id}`} className="btn btn-ghost btn-sm">
                        {tx('Open')}
                        <ArrowRight size={13} className="rtl-flip" />
                      </Link>
                    </div>
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </DataTable>
      )}

      <LogActionModal
        account={logging}
        onClose={() => setLogging(null)}
        onLogged={(movedTo) => {
          setLogging(null);
          // Say where it went, because the row is about to vanish from this list.
          setFlash(movedTo ? tx('Logged — the account moved to the ones being worked.') : tx('Logged.'));
          load();
          setTimeout(() => setFlash(null), 6000);
        }}
      />
    </div>
  );
}
