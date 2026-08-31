'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, ArrowRight, Loader2, AlertCircle, CheckCircle, ChevronRight, ChevronDown,
  Folder, FolderOpen, Package, SlidersHorizontal,
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { PageHeader } from '@/components/admin/ui';
import BulkSpecModal from '@/components/admin/quiz/BulkSpecModal';

interface ProductSpec {
  specKey: string;
  enabled: boolean;
  isRequired: boolean;
  allowedOptions: string[];
}
interface ProductConfig {
  _id?: string;
  productKey: string;
  mainSlug: string;
  subSlug: string;
  itemName: string;
  specs: ProductSpec[];
  active: boolean;
}

interface MainGroup {
  mainSlug: string;
  mainName: string;
  subs: Map<string, { subSlug: string; subName: string; configs: ProductConfig[] }>;
  totalProducts: number;
  totalEnabled: number;
}

const MAIN_NAME_LABELS: Record<string, string> = {
  'hair-care': 'Hair Care',
  'skin-care': 'Skin Care',
  'body-care': 'Body Care',
  'sun-care': 'Sun Care',
  'baby-care': 'Baby Care',
  'makeup': 'Makeup',
  'fragrance': 'Fragrance',
  'hygiene': 'Hygiene',
  'massage': 'Massage',
  'oral-care': 'Oral Care',
};

function prettifySub(slug: string): string {
  return slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

interface BulkTarget {
  scope: 'main' | 'sub';
  scopeKey: string;
  label: string;
}

export default function ProductConfigListPage() {
  const { t, tx } = useLanguage();
  const [bulk, setBulk] = useState<BulkTarget | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [configs, setConfigs] = useState<ProductConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [openMains, setOpenMains] = useState<Set<string>>(new Set());
  const [openSubs, setOpenSubs] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/sample-quiz/product-config', { cache: 'no-store' });
      if (!r.ok) throw new Error('Failed to load configs');
      const d = await r.json();
      setConfigs(Array.isArray(d.configs) ? d.configs : []);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load configs');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Build the hierarchical tree
  const grouped = useMemo<MainGroup[]>(() => {
    const map = new Map<string, MainGroup>();
    for (const c of configs) {
      if (!map.has(c.mainSlug)) {
        map.set(c.mainSlug, {
          mainSlug: c.mainSlug,
          mainName: MAIN_NAME_LABELS[c.mainSlug] || prettifySub(c.mainSlug),
          subs: new Map(),
          totalProducts: 0,
          totalEnabled: 0,
        });
      }
      const main = map.get(c.mainSlug)!;
      if (!main.subs.has(c.subSlug)) {
        main.subs.set(c.subSlug, {
          subSlug: c.subSlug,
          subName: prettifySub(c.subSlug),
          configs: [],
        });
      }
      main.subs.get(c.subSlug)!.configs.push(c);
      main.totalProducts++;
      if (c.specs.filter((s) => s.enabled).length === c.specs.length) {
        main.totalEnabled++;
      }
    }
    return Array.from(map.values()).sort((a, b) => a.mainName.localeCompare(b.mainName));
  }, [configs]);

  // Filter by search query — keep tree shape
  const filtered = useMemo<MainGroup[]>(() => {
    if (!search.trim()) return grouped;
    const q = search.toLowerCase();
    return grouped
      .map((main) => {
        const subsArr = Array.from(main.subs.values());
        const matchingSubs = subsArr
          .map((sub) => ({
            ...sub,
            configs: sub.configs.filter((c) =>
              c.itemName.toLowerCase().includes(q) ||
              sub.subName.toLowerCase().includes(q) ||
              main.mainName.toLowerCase().includes(q)
            ),
          }))
          .filter((sub) => sub.configs.length > 0);
        if (matchingSubs.length === 0) return null;
        const subsMap = new Map<string, typeof matchingSubs[number]>();
        matchingSubs.forEach((s) => subsMap.set(s.subSlug, s));
        return {
          ...main,
          subs: subsMap,
          totalProducts: matchingSubs.reduce((sum, s) => sum + s.configs.length, 0),
        };
      })
      .filter((x): x is MainGroup => x !== null);
  }, [grouped, search]);

  // Auto-expand on search
  useEffect(() => {
    if (!search.trim()) return;
    setOpenMains(new Set(filtered.map((m) => m.mainSlug)));
    const subKeys = filtered.flatMap((m) => Array.from(m.subs.keys()).map((s) => `${m.mainSlug}/${s}`));
    setOpenSubs(new Set(subKeys));
  }, [search, filtered]);

  function toggleMain(slug: string) {
    const next = new Set(openMains);
    if (next.has(slug)) next.delete(slug); else next.add(slug);
    setOpenMains(next);
  }

  function toggleSub(key: string) {
    const next = new Set(openSubs);
    if (next.has(key)) next.delete(key); else next.add(key);
    setOpenSubs(next);
  }

  return (
    <div className="w-full">
      <PageHeader
        title={tx('Product Spec Configs')}
        subtitle={t('admin.productConfigsDesc')}
        backHref="/admin/sample-quiz"
        backLabel={tx('Sample Quiz')}
      />

      {flash && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-ok bg-ok-soft px-4 py-3 text-sm text-ok-soft-fg">
          <CheckCircle size={16} />
          {flash}
        </div>
      )}

      {/* Search */}
      <div className="relative mb-6 max-w-xl">
        <Search size={14} className="absolute start-3 top-1/2 -translate-y-1/2 text-fg-subtle pointer-events-none" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={tx('Search products by name…')}
          className="w-full ps-9 pe-4 py-2.5 bg-surface border border-line rounded-lg text-sm text-fg placeholder:text-fg-subtle focus:outline-none focus:border-kcc-rose"
        />
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-fg-muted p-8">
          <Loader2 size={16} className="animate-spin" />{tx('Loading product configs…')}</div>
      )}
      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-300 text-sm">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {!loading && !error && (
        <div className="space-y-2">
          {filtered.length === 0 && (
            <p className="text-center text-fg-muted py-8">{tx('No products match your search.')}</p>
          )}

          {filtered.map((main) => {
            const isMainOpen = openMains.has(main.mainSlug);
            return (
              <div
                key={main.mainSlug}
                className="rounded-xl border border-line bg-surface overflow-hidden"
              >
                {/* Main category row */}
                <div className="flex items-center gap-2 pe-3">
                <button
                  type="button"
                  onClick={() => toggleMain(main.mainSlug)}
                  aria-expanded={isMainOpen ? 'true' : 'false'}
                  className="flex min-w-0 flex-1 items-center gap-3 p-4 text-start transition-colors hover:bg-surface-2/40"
                >
                  <span className="text-fg-subtle transition-transform" aria-hidden="true">
                    {isMainOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} className="rtl:rotate-180" />}
                  </span>
                  <span className="w-9 h-9 rounded-lg bg-kcc-rose/15 text-kcc-rose flex items-center justify-center flex-shrink-0">
                    {isMainOpen ? <FolderOpen size={16} /> : <Folder size={16} />}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-fg">{main.mainName}</p>
                    <p className="text-[11px] text-fg-subtle">
                      {t('admin.subFamiliesCount', {
                        subs: main.subs.size,
                        products: main.totalProducts,
                      })}
                    </p>
                  </div>
                  <span className="hidden shrink-0 items-center gap-1.5 rounded-full bg-surface-2 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-fg-muted sm:flex">
                    {t('admin.fullyConfigured', {
                      done: main.totalEnabled,
                      total: main.totalProducts,
                    })}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setBulk({ scope: 'main', scopeKey: main.mainSlug, label: main.mainName })
                  }
                  title={t('admin.configureThisLevel')}
                  className="btn btn-outline btn-sm shrink-0"
                >
                  <SlidersHorizontal size={13} />
                  <span className="hidden sm:inline">{t('admin.bulkConfigure')}</span>
                </button>
                </div>

                {/* Sub-families */}
                <AnimatePresence initial={false}>
                  {isMainOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.22 }}
                      className="overflow-hidden"
                    >
                      <div className="border-t border-line ps-4 pe-2 py-2 bg-bg/40 space-y-1">
                        {Array.from(main.subs.values()).map((sub) => {
                          const subKey = `${main.mainSlug}/${sub.subSlug}`;
                          const isSubOpen = openSubs.has(subKey);
                          return (
                            <div key={sub.subSlug} className="overflow-hidden rounded-lg">
                              <div className="flex items-center gap-2 pe-1">
                              <button
                                type="button"
                                onClick={() => toggleSub(subKey)}
                                aria-expanded={isSubOpen ? 'true' : 'false'}
                                className="flex min-w-0 flex-1 items-center gap-3 rounded-lg px-3 py-2.5 text-start transition-colors hover:bg-surface-2"
                              >
                                <span className="text-fg-subtle" aria-hidden="true">
                                  {isSubOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} className="rtl:rotate-180" />}
                                </span>
                                <span className="w-7 h-7 rounded-md bg-kcc-beige/15 text-kcc-beige flex items-center justify-center flex-shrink-0">
                                  {isSubOpen ? <FolderOpen size={13} /> : <Folder size={13} />}
                                </span>
                                <div className="flex-1 min-w-0">
                                  <p className="text-[13px] font-medium text-fg">{sub.subName}</p>
                                </div>
                                <span className="shrink-0 font-mono text-[10px] text-fg-subtle">
                                  {sub.configs.length}
                                </span>
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  setBulk({
                                    scope: 'sub',
                                    scopeKey: `${main.mainSlug}__${sub.subSlug}`,
                                    label: `${main.mainName} → ${sub.subName}`,
                                  })
                                }
                                title={t('admin.configureThisLevel')}
                                className="btn btn-ghost btn-sm shrink-0"
                              >
                                <SlidersHorizontal size={12} />
                                <span className="hidden md:inline">{t('admin.bulkConfigure')}</span>
                              </button>
                              </div>

                              {/* Items under sub */}
                              <AnimatePresence initial={false}>
                                {isSubOpen && (
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="overflow-hidden"
                                  >
                                    <div className="ps-9 pe-1 py-1 space-y-0.5">
                                      {sub.configs.map((c) => {
                                        const enabled = c.specs.filter((s) => s.enabled).length;
                                        const total = c.specs.length;
                                        const isFull = enabled === total;
                                        const isEmpty = enabled === 0;
                                        return (
                                          <Link
                                            key={c.productKey}
                                            href={`/admin/sample-quiz/products/${encodeURIComponent(c.productKey)}`}
                                            className="group flex items-center gap-3 px-3 py-2 rounded-md text-[13px] hover:bg-kcc-rose/10 transition-colors"
                                          >
                                            <Package size={12} className="text-fg-subtle flex-shrink-0" aria-hidden="true" />
                                            <span className="flex-1 text-fg group-hover:text-fg truncate">{c.itemName}</span>
                                            <span
                                              className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                                                isFull
                                                  ? 'bg-kcc-green/15 text-kcc-green'
                                                  : isEmpty
                                                  ? 'bg-red-500/15 text-red-300'
                                                  : 'bg-kcc-beige/15 text-kcc-beige'
                                              }`}
                                            >
                                              {enabled}/{total}
                                            </span>
                                            {isFull && <CheckCircle size={12} className="text-kcc-green flex-shrink-0" aria-hidden="true" />}
                                            <ArrowRight size={12} className="text-fg-subtle group-hover:text-kcc-rose flex-shrink-0 rtl:rotate-180" aria-hidden="true" />
                                          </Link>
                                        );
                                      })}
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}

      {bulk && (
        <BulkSpecModal
          open
          scope={bulk.scope}
          scopeKey={bulk.scopeKey}
          scopeLabel={bulk.label}
          onClose={() => setBulk(null)}
          onSaved={(updated) => {
            setBulk(null);
            setFlash(t('admin.bulkSaved', { count: updated }));
            setTimeout(() => setFlash(null), 5000);
            load();
          }}
        />
      )}

      {/* Legend */}
      {!loading && !error && filtered.length > 0 && (
        <div className="mt-8 p-4 rounded-xl border border-line bg-surface/60 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
          <span className="text-fg-muted font-semibold uppercase tracking-wider">{tx('Legend:')}</span>
          <span className="inline-flex items-center gap-1.5">
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-kcc-green/15 text-kcc-green">7/7</span>
            <span className="text-fg-muted">{tx('All specs enabled')}</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-kcc-beige/15 text-kcc-beige">3/7</span>
            <span className="text-fg-muted">{tx('Partially configured')}</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-red-500/15 text-red-300">0/7</span>
            <span className="text-fg-muted">{tx('Nothing enabled — customer sees no specs')}</span>
          </span>
        </div>
      )}
    </div>
  );
}
