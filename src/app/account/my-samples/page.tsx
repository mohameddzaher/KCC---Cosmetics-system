'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Package, Calendar, Truck, Beaker, Eye, Hash, RefreshCw, Search } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { statusLabel, trackerIndex, TRACKER_STAGES } from '@/lib/orderWorkflow';

interface SampleOrder {
  _id?: string;
  id?: string;
  orderNumber: string;
  productType?: string;
  size?: string;
  containerType?: string;
  status: string;
  date?: string;
  createdAt?: string;
  skinType?: string;
  primaryGoal?: string;
  type?: string;
  surveyData?: {
    productType?: string;
    skinType?: string;
    primaryGoal?: string;
    size?: string;
    containerType?: string;
    texturePreference?: string;
  };
}


const statusColors: Record<string, string> = {
  Submitted: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  'Under Review': 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  Approved: 'bg-green-500/10 text-green-400 border-green-500/20',
  'Quotation Sent': 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  'Awaiting Payment': 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  'In Production': 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  Shipped: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  Delivered: 'bg-kcc-green/10 text-kcc-green border-kcc-green/20',
  Closed: 'bg-surface-3/10 text-fg-muted border-line-strong/20',
};

function getSampleId(sample: SampleOrder): string {
  return sample._id || sample.id || '';
}

function getProductType(sample: SampleOrder): string {
  return sample.surveyData?.productType || sample.productType || '-';
}

function getSkinType(sample: SampleOrder): string {
  return sample.surveyData?.skinType || sample.skinType || '';
}

function getPrimaryGoal(sample: SampleOrder): string {
  return sample.surveyData?.primaryGoal || sample.primaryGoal || '';
}

function getSize(sample: SampleOrder): string {
  return sample.surveyData?.size || sample.size || '';
}

function getContainerType(sample: SampleOrder): string {
  return sample.surveyData?.containerType || sample.containerType || '';
}

function getDate(sample: SampleOrder): string {
  return sample.createdAt || sample.date || '';
}

/** Which of the six customer-facing stages a status falls into. */
function trackerKey(status: string): string {
  const i = trackerIndex(status);
  return i < 0 ? 'stopped' : TRACKER_STAGES[i].key;
}

const STAGE_FILTERS: Array<{ key: string; label: (l: string) => string }> = [
  { key: 'all', label: (l) => (l === 'ar' ? 'الكل' : 'All') },
  ...TRACKER_STAGES.map((s) => ({
    key: s.key,
    label: (l: string) => (l === 'ar' ? s.labelAr : s.labelEn),
  })),
  { key: 'stopped', label: (l: string) => (l === 'ar' ? 'متوقف' : 'On hold') },
];

export default function MySamplesPage() {
  const { t, tx, locale } = useLanguage();
  const { user } = useAuth();
  const [samples, setSamples] = useState<SampleOrder[]>([]);
  const [stage, setStage] = useState<string>('all');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchSamples = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/orders?type=sample');
        if (res.ok) {
          const data = await res.json();
          // Show exactly what the customer has, including nothing. This page
          // used to fall back to four invented samples, whose links went
          // nowhere because they were never real orders.
          setSamples(Array.isArray(data.orders) ? data.orders : []);
        }
      } catch {
        setSamples([]);
      } finally {
        setLoading(false);
      }
    };
    fetchSamples();
  }, []);

  /* Only attributes that actually say something. The old line printed
     "| all | " for a sample whose skin type was simply "all". */
  const attributesOf = (s: SampleOrder): string[] =>
    [getContainerType(s), getSize(s), getSkinType(s), getPrimaryGoal(s)]
      .map((v) => (v || '').trim())
      .filter((v) => v && v.toLowerCase() !== 'all' && v !== '-');

  const filtered = samples.filter((s) => {
    if (stage !== 'all' && trackerKey(s.status) !== stage) return false;
    const needle = query.trim().toLowerCase();
    if (!needle) return true;
    return [s.orderNumber, getProductType(s), ...attributesOf(s)]
      .join(' ')
      .toLowerCase()
      .includes(needle);
  });

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl text-fg">{t('samples.title')}</h1>
          <p className="mt-1 text-sm text-fg-muted">{t('samples.subtitle')}</p>
        </div>
        <Link
          href="/order/sample"
          className="flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-brand-fg transition-colors hover:bg-brand-hover"
        >
          <Beaker size={16} />
          {t('samples.newSample')}
        </Link>
      </div>

      {/* A stage filter that doubles as a count. Ten samples in one column told
          you nothing about where any of them were. */}
      {!loading && samples.length > 0 && (
        <div className="mb-5 flex flex-wrap items-center gap-2">
          <div className="scroll-thin -mx-1 flex gap-2 overflow-x-auto px-1 py-0.5">
            {STAGE_FILTERS.map((f) => {
              const count =
                f.key === 'all'
                  ? samples.length
                  : samples.filter((s) => trackerKey(s.status) === f.key).length;
              if (count === 0 && f.key !== 'all') return null;
              const active = stage === f.key;
              return (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setStage(f.key)}
                  className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
                    active
                      ? 'border-brand bg-brand text-brand-fg'
                      : 'border-line bg-surface text-fg-muted hover:text-fg'
                  }`}
                >
                  {f.label(locale)} <span className="opacity-70">{count}</span>
                </button>
              );
            })}
          </div>

          <div className="relative ms-auto min-w-[12rem] flex-1 sm:max-w-xs">
            <Search size={14} className="absolute start-3 top-1/2 -translate-y-1/2 text-fg-subtle" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={tx('Search by product or order number')}
              aria-label={tx('Search by product or order number')}
              className="w-full rounded-xl border border-line bg-surface py-2 pe-3 ps-9 text-sm text-fg outline-none transition-colors placeholder:text-fg-subtle focus:border-brand"
            />
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-t-2 border-kcc-green" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line py-20 text-center">
          <Package size={44} className="mx-auto mb-4 text-fg-subtle" />
          <p className="mb-4 text-fg-muted">
            {samples.length === 0 ? t('samples.noSamples') : tx('No matches')}
          </p>
          {samples.length === 0 && (
            <Link href="/order/sample" className="text-sm font-medium text-kcc-green hover:underline">
              {t('samples.requestFirst')}
            </Link>
          )}
        </div>
      ) : (
        /* A grid, not a column. Ten samples used to be ten full-width rows and
           a very long scroll; they now fill the width the account area has. */
        <div
          className="grid items-stretch gap-4"
          style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(21rem, 100%), 1fr))' }}
        >
          {filtered.map((sample, i) => {
            const sampleId = getSampleId(sample);
            const dateStr = getDate(sample);
            const attributes = attributesOf(sample);

            return (
              <motion.article
                key={sampleId}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i, 8) * 0.04 }}
                className="flex min-w-0 flex-col rounded-2xl border border-line bg-surface p-5 transition-colors hover:border-line-strong"
              >
                <div className="mb-3 flex items-start justify-between gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-kcc-green/10 text-kcc-green">
                    <Package size={20} />
                  </span>
                  <span
                    className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${
                      statusColors[sample.status] || 'border-line-strong bg-surface-3 text-fg-muted'
                    }`}
                  >
                    {statusLabel(sample.status, locale)}
                  </span>
                </div>

                <h3 className="truncate font-semibold capitalize text-fg">{getProductType(sample)}</h3>

                {attributes.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {attributes.map((a) => (
                      <span
                        key={a}
                        className="rounded-md bg-surface-2 px-2 py-0.5 text-[11px] capitalize text-fg-muted"
                      >
                        {a}
                      </span>
                    ))}
                  </div>
                )}

                <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-fg-subtle">
                  <span className="flex items-center gap-1 font-mono">
                    <Hash size={10} />
                    {sample.orderNumber}
                  </span>
                  {dateStr && (
                    <span className="flex items-center gap-1">
                      <Calendar size={10} />
                      {new Date(dateStr).toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-GB', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  )}
                </div>

                {/* mt-auto so every card's actions sit on the same line. */}
                <div className="mt-auto grid grid-cols-3 gap-2 pt-5">
                  <Link
                    href={`/account/my-samples/${sampleId}`}
                    className="flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border border-line px-2 py-2 text-[11px] font-medium text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg"
                  >
                    <Eye size={13} />
                    {t('samples.viewDetails')}
                  </Link>
                  <Link
                    href={`/order/sample?from=${sampleId}`}
                    title={t('order.orderAgainHint')}
                    className="flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg bg-brand px-2 py-2 text-[11px] font-medium text-brand-fg transition-colors hover:bg-brand-hover"
                  >
                    <RefreshCw size={13} />
                    {t('order.orderAgainShort')}
                  </Link>
                  <Link
                    href={`/order/bulk?fromSample=${sampleId}`}
                    className="flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border border-line px-2 py-2 text-[11px] font-medium text-fg transition-colors hover:bg-surface-2"
                  >
                    <Truck size={13} />
                    {t('order.reorderAsBulk')}
                  </Link>
                </div>
              </motion.article>
            );
          })}
        </div>
      )}
    </div>
  );
}
