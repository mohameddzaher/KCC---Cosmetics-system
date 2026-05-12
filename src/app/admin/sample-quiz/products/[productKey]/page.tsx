'use client';

import { use, useEffect, useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, Save, Copy, Loader2, AlertCircle, CheckCircle,
  Search, Eye, ExternalLink,
} from 'lucide-react';
import { SortableList } from '@/components/admin/SortableList';

interface SpecOption {
  value: string;
  labelEn: string;
  labelAr?: string;
  meta?: Record<string, unknown>;
}
interface SpecMaster {
  categoryKey: string;
  defaultTitleEn: string;
  defaultTitleAr?: string;
  defaultSubtitleEn?: string;
  defaultSubtitleAr?: string;
  widget: string;
  options: SpecOption[];
}
interface ProductSpec {
  specKey: string;
  enabled: boolean;
  titleEn?: string;
  titleAr?: string;
  subtitleEn?: string;
  subtitleAr?: string;
  maxSelect: number;
  isRequired: boolean;
  sortOrder: number;
  allowedOptions: string[];
}
interface ProductConfig {
  productKey: string;
  mainSlug: string;
  subSlug: string;
  itemName: string;
  specs: ProductSpec[];
  active: boolean;
}

export default function PerProductConfigPage({ params }: { params: Promise<{ productKey: string }> }) {
  const { productKey } = use(params);
  const decodedKey = decodeURIComponent(productKey);

  const [config, setConfig] = useState<ProductConfig | null>(null);
  const [masters, setMasters] = useState<SpecMaster[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copyOpen, setCopyOpen] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch(`/api/sample-quiz/product-config/${encodeURIComponent(decodedKey)}`, { cache: 'no-store' }),
      fetch('/api/sample-quiz/spec-options', { cache: 'no-store' }),
    ])
      .then(async ([cRes, mRes]) => {
        if (!cRes.ok) throw new Error('Could not load config');
        const c = await cRes.json();
        const m = await mRes.json();
        setConfig(c);
        setMasters(Array.isArray(m.categories) ? m.categories : []);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Load failed'))
      .finally(() => setLoading(false));
  }, [decodedKey]);

  function updateSpec(specKey: string, patch: Partial<ProductSpec>) {
    if (!config) return;
    setConfig({
      ...config,
      specs: config.specs.map((s) => (s.specKey === specKey ? { ...s, ...patch } : s)),
    });
  }

  function reorderSpecs(next: ProductSpec[]) {
    if (!config) return;
    setConfig({
      ...config,
      specs: next.map((s, i) => ({ ...s, sortOrder: i })),
    });
  }

  async function save() {
    if (!config) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/sample-quiz/product-config/${encodeURIComponent(decodedKey)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Save failed');
      }
      setSavedAt(Date.now());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="p-8 flex items-center gap-2 text-dark-400"><Loader2 size={16} className="animate-spin" /> Loading…</div>;
  if (error || !config) return <div className="p-8 flex items-center gap-2 text-red-300"><AlertCircle size={16} /> {error || 'Not found'}</div>;

  const sortedSpecs = [...config.specs].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div className="max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        <Link href="/admin/sample-quiz/products" className="p-2 text-dark-400 hover:text-dark-50 hover:bg-dark-800 rounded-lg">
          <ArrowLeft size={16} />
        </Link>
        <div className="text-xs font-mono text-dark-500 truncate">{decodedKey}</div>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-[0.28em] text-kcc-beige mb-1">
            {config.mainSlug.replace('-', ' ')} → {config.subSlug.replace('-', ' ')}
          </p>
          <h1 className="text-3xl font-bold text-dark-50">{config.itemName}</h1>
          <p className="text-sm text-dark-400 mt-1">
            {sortedSpecs.filter((s) => s.enabled).length} of {sortedSpecs.length} spec categories enabled.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setCopyOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 border border-dark-700 text-dark-300 hover:text-dark-50 hover:border-dark-500 rounded-lg text-sm"
          >
            <Copy size={14} /> Copy from another
          </button>
          <Link
            href={`/order/sample`}
            target="_blank"
            className="inline-flex items-center gap-2 px-4 py-2.5 border border-dark-700 text-dark-300 hover:text-dark-50 hover:border-dark-500 rounded-lg text-sm"
          >
            <Eye size={14} /> Preview quiz
            <ExternalLink size={12} />
          </Link>
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-kcc-rose hover:bg-kcc-rose-dark text-white rounded-lg text-sm font-medium disabled:opacity-50"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Save
          </button>
        </div>
      </div>

      {savedAt && (
        <div className="mb-6 p-3 rounded-lg border border-kcc-green/30 bg-kcc-green/10 text-kcc-green text-sm flex items-center gap-2">
          <CheckCircle size={16} /> Saved · live on the quiz now.
        </div>
      )}

      {/* Spec cards */}
      <SortableList
        items={sortedSpecs}
        onReorder={reorderSpecs}
        getKey={(s) => s.specKey}
        className="space-y-4"
        renderItem={(spec, _idx, dragHandle) => {
          const master = masters.find((m) => m.categoryKey === spec.specKey);
          if (!master) return null;
          return (
            <SpecBlock
              spec={spec}
              master={master}
              dragHandle={dragHandle}
              onChange={(patch) => updateSpec(spec.specKey, patch)}
            />
          );
        }}
      />
      <p className="text-xs text-dark-500 mt-4">
        Drag a card by its handle to reorder. Don&apos;t forget to <strong className="text-dark-300">Save</strong> when you&apos;re done.
      </p>

      {copyOpen && (
        <CopyFromModal
          currentKey={decodedKey}
          onClose={() => setCopyOpen(false)}
          onCopy={(srcSpecs) => {
            // Replace specs config (preserve enabled/required defaults from source)
            setConfig({ ...config, specs: srcSpecs.map((s, i) => ({ ...s, sortOrder: i })) });
            setCopyOpen(false);
          }}
        />
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// SpecBlock — one card per spec category
// ──────────────────────────────────────────────────────────
function SpecBlock({
  spec, master, dragHandle, onChange,
}: {
  spec: ProductSpec;
  master: SpecMaster;
  dragHandle: ReactNode;
  onChange: (patch: Partial<ProductSpec>) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [optSearch, setOptSearch] = useState('');

  const filteredOpts = useMemo(() => {
    if (!optSearch) return master.options;
    return master.options.filter((o) => o.labelEn.toLowerCase().includes(optSearch.toLowerCase()));
  }, [master.options, optSearch]);

  const allowedSet = new Set(spec.allowedOptions);

  function toggleOption(value: string) {
    if (allowedSet.has(value)) {
      onChange({ allowedOptions: spec.allowedOptions.filter((v) => v !== value) });
    } else {
      onChange({ allowedOptions: [...spec.allowedOptions, value] });
    }
  }

  function selectAll() {
    onChange({ allowedOptions: master.options.map((o) => o.value) });
  }
  function selectNone() {
    onChange({ allowedOptions: [] });
  }

  return (
    <div className={`rounded-xl border ${spec.enabled ? 'border-dark-700' : 'border-dark-800 opacity-60'} bg-dark-900 overflow-hidden`}>
      <div className="flex items-center gap-3 p-4">
        {/* Drag handle */}
        {dragHandle}

        {/* Title */}
        <div className="flex-1 min-w-0">
          <p className="text-[10px] uppercase tracking-[0.22em] text-kcc-beige font-medium mb-0.5">
            {spec.specKey}
          </p>
          <p className="text-sm text-dark-50 truncate">{spec.titleEn || master.defaultTitleEn}</p>
          <p className="text-xs text-dark-500 mt-0.5">
            {spec.allowedOptions.length}/{master.options.length} options · max {spec.maxSelect} · {spec.isRequired ? 'required' : 'optional'}
          </p>
        </div>

        {/* Toggles */}
        <div className="flex items-center gap-3">
          <Toggle label="Enabled" value={spec.enabled} onChange={(v) => onChange({ enabled: v })} />
          <Toggle label="Required" value={spec.isRequired} onChange={(v) => onChange({ isRequired: v })} />
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="px-3 py-1.5 text-xs border border-dark-700 hover:border-dark-500 text-dark-300 hover:text-dark-50 rounded-lg"
          >
            {expanded ? 'Collapse' : 'Configure'}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-dark-800 p-5 space-y-5 bg-dark-950/40">
          {/* Custom title/subtitle */}
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label={`Title — leave blank to use default: "${master.defaultTitleEn}"`}>
              <input
                type="text"
                value={spec.titleEn || ''}
                onChange={(e) => onChange({ titleEn: e.target.value })}
                placeholder={master.defaultTitleEn}
                className="w-full px-3 py-2 bg-dark-900 border border-dark-700 rounded-lg text-sm text-dark-50 focus:outline-none focus:border-kcc-rose"
              />
            </Field>
            <Field label="Title (Arabic)">
              <input
                type="text"
                value={spec.titleAr || ''}
                onChange={(e) => onChange({ titleAr: e.target.value })}
                dir="rtl"
                placeholder={master.defaultTitleAr || ''}
                className="w-full px-3 py-2 bg-dark-900 border border-dark-700 rounded-lg text-sm text-dark-50 focus:outline-none focus:border-kcc-rose"
              />
            </Field>
            <Field label="Subtitle (English)">
              <textarea
                rows={2}
                value={spec.subtitleEn || ''}
                onChange={(e) => onChange({ subtitleEn: e.target.value })}
                placeholder={master.defaultSubtitleEn || ''}
                className="w-full px-3 py-2 bg-dark-900 border border-dark-700 rounded-lg text-sm text-dark-50 focus:outline-none focus:border-kcc-rose resize-none"
              />
            </Field>
            <Field label="Subtitle (Arabic)">
              <textarea
                rows={2}
                value={spec.subtitleAr || ''}
                onChange={(e) => onChange({ subtitleAr: e.target.value })}
                dir="rtl"
                placeholder={master.defaultSubtitleAr || ''}
                className="w-full px-3 py-2 bg-dark-900 border border-dark-700 rounded-lg text-sm text-dark-50 focus:outline-none focus:border-kcc-rose resize-none"
              />
            </Field>
            <Field label="Max select">
              <input
                type="number"
                min={1}
                value={spec.maxSelect}
                onChange={(e) => onChange({ maxSelect: parseInt(e.target.value) || 1 })}
                className="w-full px-3 py-2 bg-dark-900 border border-dark-700 rounded-lg text-sm text-dark-50 focus:outline-none focus:border-kcc-rose"
              />
            </Field>
          </div>

          {/* Allowed options */}
          <div>
            <div className="flex items-center justify-between mb-3 gap-3">
              <h4 className="text-sm font-semibold text-dark-50">
                Allowed options
                <span className="ms-2 text-xs text-dark-500 font-normal">{spec.allowedOptions.length}/{master.options.length} selected</span>
              </h4>
              <div className="flex items-center gap-2">
                <button type="button" onClick={selectAll} className="text-xs text-kcc-rose hover:text-kcc-rose-dark">All</button>
                <span className="text-dark-600">·</span>
                <button type="button" onClick={selectNone} className="text-xs text-dark-400 hover:text-dark-200">None</button>
              </div>
            </div>
            <div className="relative mb-3">
              <Search size={13} className="absolute start-3 top-1/2 -translate-y-1/2 text-dark-500" />
              <input
                type="text"
                value={optSearch}
                onChange={(e) => setOptSearch(e.target.value)}
                placeholder="Search options…"
                className="w-full ps-9 pe-3 py-2 bg-dark-900 border border-dark-700 rounded-lg text-xs text-dark-50 placeholder:text-dark-500 focus:outline-none focus:border-kcc-rose"
              />
            </div>
            <div className="max-h-72 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5 p-1 bg-dark-900 border border-dark-800 rounded-lg">
              {filteredOpts.map((opt) => {
                const checked = allowedSet.has(opt.value);
                return (
                  <label
                    key={opt.value}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer text-xs transition-colors ${
                      checked ? 'bg-kcc-rose/15 text-kcc-rose' : 'text-dark-300 hover:bg-dark-800'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleOption(opt.value)}
                      className="accent-kcc-rose"
                    />
                    <span className="truncate">{opt.labelEn}</span>
                  </label>
                );
              })}
              {filteredOpts.length === 0 && (
                <p className="col-span-full text-center text-xs text-dark-500 py-4">No matches</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="inline-flex items-center gap-2 cursor-pointer text-xs text-dark-300">
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${value ? 'bg-kcc-rose' : 'bg-dark-700'}`}
      >
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${value ? 'translate-x-4' : 'translate-x-0.5'}`} />
      </button>
      <span>{label}</span>
    </label>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-dark-400 mb-1.5">{label}</span>
      {children}
    </label>
  );
}

// ──────────────────────────────────────────────────────────
// CopyFromModal — bulk action: clone specs from another product
// ──────────────────────────────────────────────────────────
function CopyFromModal({
  currentKey, onClose, onCopy,
}: {
  currentKey: string;
  onClose: () => void;
  onCopy: (srcSpecs: ProductSpec[]) => void;
}) {
  const [configs, setConfigs] = useState<Array<{ productKey: string; itemName: string; mainSlug: string; subSlug: string; specs: ProductSpec[] }>>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetch('/api/sample-quiz/product-config', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => {
        setConfigs(Array.isArray(d.configs) ? d.configs.filter((c: { productKey: string }) => c.productKey !== currentKey) : []);
        setLoading(false);
      });
  }, [currentKey]);

  const filtered = configs.filter((c) =>
    !search ||
    c.itemName.toLowerCase().includes(search.toLowerCase()) ||
    c.subSlug.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl max-h-[80vh] bg-dark-900 border border-dark-700 rounded-2xl flex flex-col"
      >
        <div className="px-5 py-4 border-b border-dark-800">
          <h2 className="text-lg font-semibold text-dark-50">Copy config from another product</h2>
          <p className="text-xs text-dark-400 mt-1">Replaces the current product&apos;s spec configuration with the chosen one.</p>
        </div>
        <div className="px-5 py-3 border-b border-dark-800">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search product name…"
            className="w-full px-3 py-2 bg-dark-950 border border-dark-700 rounded-lg text-sm text-dark-50 focus:outline-none focus:border-kcc-rose"
          />
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
          {loading && <p className="text-center text-dark-400 py-4">Loading…</p>}
          {!loading && filtered.map((c) => {
            const enabled = c.specs.filter((s) => s.enabled).length;
            return (
              <button
                key={c.productKey}
                type="button"
                onClick={() => {
                  if (confirm(`Replace current config with the one from "${c.itemName}"?`)) {
                    onCopy(c.specs);
                  }
                }}
                className="w-full text-start flex items-center justify-between p-3 rounded-lg hover:bg-dark-800 transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-sm text-dark-50 truncate">{c.itemName}</p>
                  <p className="text-[11px] text-dark-500 truncate">{c.mainSlug} · {c.subSlug}</p>
                </div>
                <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 bg-dark-700 rounded-full text-dark-300 font-mono">
                  {enabled}/{c.specs.length} on
                </span>
              </button>
            );
          })}
          {!loading && filtered.length === 0 && (
            <p className="text-center text-dark-400 py-4">No products match.</p>
          )}
        </div>
        <div className="px-5 py-3 border-t border-dark-800 flex justify-end">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-dark-300 hover:text-dark-50">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
