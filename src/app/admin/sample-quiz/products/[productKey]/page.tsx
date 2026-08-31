'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, Save, Copy, Loader2, AlertCircle, CheckCircle,
  Eye, ExternalLink,
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import SpecConfigEditor from '@/components/admin/quiz/SpecConfigEditor';

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
  const { tx } = useLanguage();
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

  if (loading) return <div className="p-8 flex items-center gap-2 text-fg-muted"><Loader2 size={16} className="animate-spin" />{tx('Loading…')}</div>;
  if (error || !config) return <div className="p-8 flex items-center gap-2 text-red-300"><AlertCircle size={16} /> {error || 'Not found'}</div>;

  const sortedSpecs = [...config.specs].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div className="w-full">
      {/* Breadcrumb — every level above is clickable, not just an arrow. */}
      <nav className="mb-3 flex flex-wrap items-center gap-1.5 text-xs text-fg-muted">
        <Link href="/admin/sample-quiz" className="inline-flex items-center gap-1 hover:text-fg">
          <ArrowLeft size={13} className="rtl-flip" />
          {tx('Sample Quiz')}
        </Link>
        <span className="text-fg-subtle">/</span>
        <Link href="/admin/sample-quiz/products" className="hover:text-fg">
          {tx('Product Spec Configs')}
        </Link>
        <span className="text-fg-subtle">/</span>
        <Link
          href={`/admin/sample-quiz/products?open=${encodeURIComponent(config.mainSlug)}`}
          className="capitalize hover:text-fg"
        >
          {config.mainSlug.replace(/-/g, ' ')}
        </Link>
        <span className="text-fg-subtle">/</span>
        <span className="capitalize text-fg">{config.subSlug.replace(/-/g, ' ')}</span>
      </nav>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-fg sm:text-3xl">{config.itemName}</h1>
          <p className="mt-1 text-sm text-fg-muted">
            {sortedSpecs.filter((s) => s.enabled).length} of {sortedSpecs.length} spec categories enabled.
          </p>
          <p className="mt-1 truncate font-mono text-[11px] text-fg-subtle">{decodedKey}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setCopyOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 border border-line text-fg-muted hover:text-fg hover:border-line-strong rounded-lg text-sm"
          >
            <Copy size={14} />{tx('Copy from another')}</button>
          <Link
            href={`/order/sample`}
            target="_blank"
            className="inline-flex items-center gap-2 px-4 py-2.5 border border-line text-fg-muted hover:text-fg hover:border-line-strong rounded-lg text-sm"
          >
            <Eye size={14} />{tx('Preview quiz')}<ExternalLink size={12} />
          </Link>
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-accent hover:bg-accent-hover text-accent-fg rounded-lg text-sm font-medium disabled:opacity-50"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Save
          </button>
        </div>
      </div>

      {savedAt && (
        <div className="mb-6 p-3 rounded-lg border border-kcc-green/30 bg-kcc-green/10 text-kcc-green text-sm flex items-center gap-2">
          <CheckCircle size={16} />{tx('Saved · live on the quiz now.')}</div>
      )}

      {/* Spec cards — same editor the bulk (category / sub-family) modal uses. */}
      <SpecConfigEditor
        specs={sortedSpecs}
        masters={masters}
        onChange={updateSpec}
        onReorder={reorderSpecs}
      />

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
// CopyFromModal — bulk action: clone specs from another product
// ──────────────────────────────────────────────────────────
function CopyFromModal({
  currentKey, onClose, onCopy,
}: {
  currentKey: string;
  onClose: () => void;
  onCopy: (srcSpecs: ProductSpec[]) => void;
}) {
  const { tx } = useLanguage();
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
      className="modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl max-h-[80vh] bg-surface border border-line rounded-2xl flex flex-col"
      >
        <div className="px-5 py-4 border-b border-line">
          <h2 className="text-lg font-semibold text-fg">{tx('Copy config from another product')}</h2>
          <p className="text-xs text-fg-muted mt-1">{tx('Replaces the current product&apos;s spec configuration with the chosen one.')}</p>
        </div>
        <div className="px-5 py-3 border-b border-line">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={tx('Search product name…')}
            className="w-full px-3 py-2 bg-bg border border-line rounded-lg text-sm text-fg focus:outline-none focus:border-brand"
          />
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
          {loading && <p className="text-center text-fg-muted py-4">{tx('Loading…')}</p>}
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
                className="w-full text-start flex items-center justify-between p-3 rounded-lg hover:bg-surface-2 transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-sm text-fg truncate">{c.itemName}</p>
                  <p className="text-[11px] text-fg-subtle truncate">{c.mainSlug} · {c.subSlug}</p>
                </div>
                <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 bg-surface-3 rounded-full text-fg-muted font-mono">
                  {enabled}/{c.specs.length} on
                </span>
              </button>
            );
          })}
          {!loading && filtered.length === 0 && (
            <p className="text-center text-fg-muted py-4">{tx('No products match.')}</p>
          )}
        </div>
        <div className="px-5 py-3 border-t border-line flex justify-end">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-fg-muted hover:text-fg">{tx('Cancel')}</button>
        </div>
      </div>
    </div>
  );
}
