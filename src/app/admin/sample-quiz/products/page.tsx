'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, ArrowRight, Loader2, AlertCircle, CheckCircle, ChevronRight, ChevronDown, Folder, FolderOpen, Package,
} from 'lucide-react';

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

export default function ProductConfigListPage() {
  const [configs, setConfigs] = useState<ProductConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [openMains, setOpenMains] = useState<Set<string>>(new Set());
  const [openSubs, setOpenSubs] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch('/api/sample-quiz/product-config', { cache: 'no-store' })
      .then(async (r) => {
        if (!r.ok) throw new Error('Failed to load configs');
        const d = await r.json();
        setConfigs(Array.isArray(d.configs) ? d.configs : []);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

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
    <div className="max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-dark-50 mb-1">Product Spec Configs</h1>
        <p className="text-sm text-dark-400">
          Browse by category. Click a main category to expand its sub-families, then a sub-family to see the products inside. Click any product to configure its spec questions.
        </p>
      </div>

      {/* Search */}
      <div className="relative mb-6 max-w-xl">
        <Search size={14} className="absolute start-3 top-1/2 -translate-y-1/2 text-dark-500 pointer-events-none" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search products by name…"
          className="w-full ps-9 pe-4 py-2.5 bg-dark-900 border border-dark-700 rounded-lg text-sm text-dark-50 placeholder:text-dark-500 focus:outline-none focus:border-kcc-rose"
        />
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-dark-400 p-8">
          <Loader2 size={16} className="animate-spin" />
          Loading product configs…
        </div>
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
            <p className="text-center text-dark-400 py-8">No products match your search.</p>
          )}

          {filtered.map((main) => {
            const isMainOpen = openMains.has(main.mainSlug);
            return (
              <div
                key={main.mainSlug}
                className="rounded-xl border border-dark-700 bg-dark-900 overflow-hidden"
              >
                {/* Main category row */}
                <button
                  type="button"
                  onClick={() => toggleMain(main.mainSlug)}
                  aria-expanded={isMainOpen ? 'true' : 'false'}
                  className="w-full flex items-center gap-3 p-4 hover:bg-dark-800/40 transition-colors text-start"
                >
                  <span className="text-dark-500 transition-transform" aria-hidden="true">
                    {isMainOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} className="rtl:rotate-180" />}
                  </span>
                  <span className="w-9 h-9 rounded-lg bg-kcc-rose/15 text-kcc-rose flex items-center justify-center flex-shrink-0">
                    {isMainOpen ? <FolderOpen size={16} /> : <Folder size={16} />}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-dark-50">{main.mainName}</p>
                    <p className="text-[11px] text-dark-500">
                      {main.subs.size} sub-{main.subs.size === 1 ? 'family' : 'families'} · {main.totalProducts} product{main.totalProducts === 1 ? '' : 's'}
                    </p>
                  </div>
                  <span className="hidden sm:flex items-center gap-1.5 text-[10px] uppercase tracking-wider px-2 py-1 rounded-full bg-dark-800 text-dark-300 font-mono">
                    {main.totalEnabled}/{main.totalProducts} fully configured
                  </span>
                </button>

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
                      <div className="border-t border-dark-800 ps-4 pe-2 py-2 bg-dark-950/40 space-y-1">
                        {Array.from(main.subs.values()).map((sub) => {
                          const subKey = `${main.mainSlug}/${sub.subSlug}`;
                          const isSubOpen = openSubs.has(subKey);
                          return (
                            <div key={sub.subSlug} className="rounded-lg overflow-hidden">
                              <button
                                type="button"
                                onClick={() => toggleSub(subKey)}
                                aria-expanded={isSubOpen ? 'true' : 'false'}
                                className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-dark-800 rounded-lg transition-colors text-start"
                              >
                                <span className="text-dark-500" aria-hidden="true">
                                  {isSubOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} className="rtl:rotate-180" />}
                                </span>
                                <span className="w-7 h-7 rounded-md bg-kcc-beige/15 text-kcc-beige flex items-center justify-center flex-shrink-0">
                                  {isSubOpen ? <FolderOpen size={13} /> : <Folder size={13} />}
                                </span>
                                <div className="flex-1 min-w-0">
                                  <p className="text-[13px] font-medium text-dark-100">{sub.subName}</p>
                                </div>
                                <span className="text-[10px] text-dark-500 font-mono">
                                  {sub.configs.length}
                                </span>
                              </button>

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
                                            <Package size={12} className="text-dark-500 flex-shrink-0" aria-hidden="true" />
                                            <span className="flex-1 text-dark-200 group-hover:text-dark-50 truncate">{c.itemName}</span>
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
                                            <ArrowRight size={12} className="text-dark-500 group-hover:text-kcc-rose flex-shrink-0 rtl:rotate-180" aria-hidden="true" />
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

      {/* Legend */}
      {!loading && !error && filtered.length > 0 && (
        <div className="mt-8 p-4 rounded-xl border border-dark-700 bg-dark-900/60 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
          <span className="text-dark-400 font-semibold uppercase tracking-wider">Legend:</span>
          <span className="inline-flex items-center gap-1.5">
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-kcc-green/15 text-kcc-green">7/7</span>
            <span className="text-dark-300">All specs enabled</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-kcc-beige/15 text-kcc-beige">3/7</span>
            <span className="text-dark-300">Partially configured</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-red-500/15 text-red-300">0/7</span>
            <span className="text-dark-300">Nothing enabled — customer sees no specs</span>
          </span>
        </div>
      )}
    </div>
  );
}
