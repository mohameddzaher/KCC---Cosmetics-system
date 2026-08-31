'use client';

/**
 * The spec-configuration editor.
 *
 * One component, three places: a single product, a whole sub-family, or a whole
 * main category. Whatever you edit here is the same shape (`ProductSpec[]`) —
 * only the number of products it is written to differs, which is why bulk and
 * per-product editing can never drift apart.
 */

import { useMemo, useState, type ReactNode } from 'react';
import { Boxes, GripVertical, Search } from 'lucide-react';
import { SortableList } from '@/components/admin/SortableList';
import { Field, TextArea, TextInput, Toggle } from '@/components/admin/ui';
import { useLanguage } from '@/contexts/LanguageContext';

export interface SpecOption {
  value: string;
  labelEn: string;
  labelAr?: string;
  meta?: Record<string, unknown>;
}

export interface SpecMaster {
  categoryKey: string;
  defaultTitleEn: string;
  defaultTitleAr?: string;
  defaultSubtitleEn?: string;
  defaultSubtitleAr?: string;
  widget: string;
  options: SpecOption[];
}

export interface ProductSpec {
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

/**
 * Specs the customer never sees as a screen of their own — they are the tabs of
 * the 3D packaging studio. Flagged here so an admin editing "Cap & dispenser"
 * knows where their change will show up.
 */
const PACKAGING_STUDIO_KEYS = new Set([
  'product-packaging',
  'package-cap',
  'package-label',
  'package-finish',
  'package-color',
]);

export default function SpecConfigEditor({
  specs,
  masters,
  onChange,
  onReorder,
}: {
  specs: ProductSpec[];
  masters: SpecMaster[];
  onChange: (specKey: string, patch: Partial<ProductSpec>) => void;
  onReorder: (next: ProductSpec[]) => void;
}) {
  const { t, tx } = useLanguage();
  const sorted = useMemo(() => [...specs].sort((a, b) => a.sortOrder - b.sortOrder), [specs]);

  return (
    <div>
      <SortableList
        items={sorted}
        onReorder={onReorder}
        getKey={(s) => s.specKey}
        className="space-y-3"
        renderItem={(spec, _i, handle) => {
          const master = masters.find((m) => m.categoryKey === spec.specKey);
          if (!master) return null;
          return (
            <SpecBlock
              spec={spec}
              master={master}
              dragHandle={handle}
              onChange={(patch) => onChange(spec.specKey, patch)}
            />
          );
        }}
      />
      <p className="mt-3 flex items-center gap-1.5 text-[11px] text-fg-subtle">
        <GripVertical size={12} />
        {t('admin.reorderHint')} · {tx('Save')}
      </p>
    </div>
  );
}

function SpecBlock({
  spec,
  master,
  dragHandle,
  onChange,
}: {
  spec: ProductSpec;
  master: SpecMaster;
  dragHandle: ReactNode;
  onChange: (patch: Partial<ProductSpec>) => void;
}) {
  const { t, tx, pick } = useLanguage();
  const [expanded, setExpanded] = useState(false);
  const [optSearch, setOptSearch] = useState('');

  const filteredOpts = useMemo(() => {
    const q = optSearch.trim().toLowerCase();
    if (!q) return master.options;
    return master.options.filter(
      (o) => o.labelEn.toLowerCase().includes(q) || (o.labelAr || '').includes(optSearch.trim())
    );
  }, [master.options, optSearch]);

  const allowedSet = useMemo(() => new Set(spec.allowedOptions), [spec.allowedOptions]);

  return (
    <div
      className={`overflow-hidden rounded-xl border bg-surface ${
        spec.enabled ? 'border-line' : 'border-dashed border-line opacity-70'
      }`}
    >
      <div className="flex flex-wrap items-center gap-3 p-3 sm:p-4">
        <span className="shrink-0 text-fg-subtle">{dragHandle}</span>

        <div className="min-w-0 flex-1">
          <p className="mb-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-fg-subtle">
            {spec.specKey}
          </p>
          <p className="truncate text-sm font-medium text-fg">
            {pick(spec.titleEn || master.defaultTitleEn, spec.titleAr || master.defaultTitleAr)}
          </p>
          <p className="mt-0.5 text-xs text-fg-muted">
            {spec.allowedOptions.length}/{master.options.length} · {t('admin.maxSelect')} {spec.maxSelect}
            {' · '}
            {spec.isRequired ? t('admin.required') : t('admin.optional')}
          </p>
          {PACKAGING_STUDIO_KEYS.has(spec.specKey) && (
            <p className="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-2.5 py-1 text-[11px] text-fg-muted">
              <Boxes size={12} className="shrink-0" />
              {spec.specKey === 'product-packaging'
                ? tx('Shown as the 3D packaging studio')
                : tx('Shown as a tab inside the 3D packaging studio')}
            </p>
          )}
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-3">
          <div className="w-28">
            <Toggle label={tx('Enabled')} value={spec.enabled} onChange={(v) => onChange({ enabled: v })} />
          </div>
          <div className="w-28">
            <Toggle
              label={tx('Required')}
              value={spec.isRequired}
              onChange={(v) => onChange({ isRequired: v })}
            />
          </div>
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            aria-expanded={expanded}
            className="btn btn-outline btn-sm"
          >
            {expanded ? tx('Collapse') : tx('Configure')}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="space-y-5 border-t border-line bg-surface-2 p-4 sm:p-5">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <Field label={t('admin.questionEn')} hint={master.defaultTitleEn}>
              <TextInput
                value={spec.titleEn || ''}
                onChange={(e) => onChange({ titleEn: e.target.value })}
                placeholder={master.defaultTitleEn}
              />
            </Field>
            <Field label={t('admin.questionAr')} hint={master.defaultTitleAr || ''}>
              <TextInput
                dir="rtl"
                lang="ar"
                className="font-arabic"
                value={spec.titleAr || ''}
                onChange={(e) => onChange({ titleAr: e.target.value })}
                placeholder={master.defaultTitleAr || ''}
              />
            </Field>
            <Field label={t('admin.maxSelect')}>
              <TextInput
                type="number"
                min={1}
                value={spec.maxSelect}
                onChange={(e) => onChange({ maxSelect: parseInt(e.target.value, 10) || 1 })}
              />
            </Field>
            <Field label={t('admin.helperEn')} className="sm:col-span-2 xl:col-span-1">
              <TextArea
                rows={2}
                value={spec.subtitleEn || ''}
                onChange={(e) => onChange({ subtitleEn: e.target.value })}
                placeholder={master.defaultSubtitleEn || ''}
              />
            </Field>
            <Field label={t('admin.helperAr')} className="sm:col-span-2 xl:col-span-2">
              <TextArea
                rows={2}
                dir="rtl"
                lang="ar"
                className="font-arabic"
                value={spec.subtitleAr || ''}
                onChange={(e) => onChange({ subtitleAr: e.target.value })}
                placeholder={master.defaultSubtitleAr || ''}
              />
            </Field>
          </div>

          <div>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <h4 className="text-sm font-semibold text-fg">
                {tx('Allowed options')}
                <span className="ms-2 text-xs font-normal text-fg-muted">
                  {spec.allowedOptions.length}/{master.options.length}
                </span>
              </h4>
              <div className="flex items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => onChange({ allowedOptions: master.options.map((o) => o.value) })}
                  className="font-medium text-brand hover:underline"
                >
                  {t('admin.selectAll')}
                </button>
                <span className="text-fg-subtle">·</span>
                <button
                  type="button"
                  onClick={() => onChange({ allowedOptions: [] })}
                  className="font-medium text-fg-muted hover:text-fg hover:underline"
                >
                  {t('admin.selectNone')}
                </button>
              </div>
            </div>

            <div className="relative mb-3 max-w-sm">
              <Search size={13} className="absolute start-3 top-1/2 -translate-y-1/2 text-fg-subtle" />
              <TextInput
                className="ps-10 text-xs"
                value={optSearch}
                onChange={(e) => setOptSearch(e.target.value)}
                placeholder={tx('Search options…')}
                aria-label={tx('Search options…')}
              />
            </div>

            <div
              className="scroll-thin grid max-h-80 gap-1.5 overflow-y-auto rounded-xl border border-line bg-surface p-2"
              style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(13rem, 100%), 1fr))' }}
            >
              {filteredOpts.map((opt) => {
                const checked = allowedSet.has(opt.value);
                return (
                  <label
                    key={opt.value}
                    className={`flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-xs transition-colors ${
                      checked
                        ? 'bg-accent-soft font-medium text-accent-soft-fg'
                        : 'text-fg-muted hover:bg-surface-2'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() =>
                        onChange({
                          allowedOptions: checked
                            ? spec.allowedOptions.filter((v) => v !== opt.value)
                            : [...spec.allowedOptions, opt.value],
                        })
                      }
                      className="accent-accent"
                    />
                    <span className="truncate">{pick(opt.labelEn, opt.labelAr)}</span>
                  </label>
                );
              })}
              {filteredOpts.length === 0 && (
                <p className="col-span-full py-4 text-center text-xs text-fg-subtle">{tx('No matches')}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
