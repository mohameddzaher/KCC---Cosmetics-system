'use client';

/**
 * The option library — the master lists the whole quiz is built from.
 *
 * Every product config picks a subset of these; until this screen existed the
 * subsets were editable but the lists themselves were not, so adding an oil or
 * renaming an active meant opening the database.
 *
 * Two kinds of list live here, and the difference is real rather than cosmetic:
 *
 *  • Ingredient-style lists (oils, actives, colours, fragrances) are free. An
 *    option is just a key and two labels, so anything can be added.
 *  • Packaging lists drive the 3D studio, which draws each shape from code. A
 *    value it cannot draw would silently fall back to the plain bottle, so only
 *    drawable shapes are offered for those.
 */

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Boxes, FlaskConical, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { SortableList } from '@/components/admin/SortableList';
import {
  AutoGrid,
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorNote,
  Field,
  Modal,
  PageHeader,
  Select,
  Spinner,
  TextInput,
  Toggle,
  ArabicInput,
} from '@/components/admin/ui';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  BOTTLES,
  CAPS,
  FINISHES,
  LABELS,
  PACK_COLORS,
} from '@/components/order/sample-quiz/widgets/packaging/shapes';

interface SubNote {
  value: string;
  labelEn: string;
  labelAr?: string;
}
interface Opt {
  value: string;
  labelEn: string;
  labelAr?: string;
  meta?: Record<string, unknown>;
}
interface Master {
  categoryKey: string;
  defaultTitleEn: string;
  defaultTitleAr?: string;
  widget: string;
  options: Opt[];
  active: boolean;
}

type Drawable = { value: string; labelEn: string; labelAr?: string };

/** Values the packaging studio can actually render, by category. */
const DRAWABLE: Record<string, Drawable[]> = {
  'product-packaging': BOTTLES.map((b) => ({ value: b.value, labelEn: b.labelEn, labelAr: b.labelAr })),
  'package-cap': CAPS.map((c) => ({ value: c.value, labelEn: c.labelEn, labelAr: c.labelAr })),
  'package-label': LABELS.map((l) => ({ value: l.value, labelEn: l.labelEn, labelAr: l.labelAr })),
  'package-finish': FINISHES.map((f) => ({ value: f.value, labelEn: f.labelEn, labelAr: f.labelAr })),
  'package-color': PACK_COLORS.map((c) => ({ value: c.value, labelEn: c.labelEn, labelAr: c.labelAr })),
};

/** Icon names the quiz's icon grid knows how to draw. */
const ICONS = [
  'pump', 'gel-pump', 'jar', 'bottle', 'tube', 'spray', 'roll-on',
  'dropper', 'vial', 'serum-pump', 'glass-ampoule', 'pvc-ampoule',
  'opaque', 'translucent', 'transparent',
];

function slug(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/** The swatch hex for a colour option — authored for the product, code for the pack. */
function swatchOf(cat: Master, opt: Opt): string | null {
  if (cat.widget !== 'color-swatches') return null;
  if (cat.categoryKey === 'package-color') {
    return PACK_COLORS.find((c) => c.value === opt.value)?.hex || null;
  }
  return typeof opt.meta?.hex === 'string' ? (opt.meta.hex as string) : null;
}

type Draft = {
  value: string;
  labelEn: string;
  labelAr: string;
  hex: string;
  icon: string;
  subNotes: SubNote[];
  attach: boolean;
};

const EMPTY_DRAFT: Draft = {
  value: '',
  labelEn: '',
  labelAr: '',
  hex: '#CCCCCC',
  icon: '',
  subNotes: [],
  attach: true,
};

function LibraryInner() {
  const { t, tx, pick } = useLanguage();
  const router = useRouter();
  const params = useSearchParams();
  const selectedKey = params.get('category') || '';

  const [masters, setMasters] = useState<Master[]>([]);
  const [usage, setUsage] = useState<Record<string, Record<string, number>>>({});
  const [productTotals, setProductTotals] = useState<Record<string, number>>({});
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [search, setSearch] = useState('');
  const [arabicOnly, setArabicOnly] = useState(false);

  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Opt | null>(null);
  const [removing, setRemoving] = useState<Opt | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/sample-quiz/spec-options?all=true&usage=true', { cache: 'no-store' });
      if (!r.ok) throw new Error('Could not load the option library');
      const d = await r.json();
      setMasters(Array.isArray(d.categories) ? d.categories : []);
      setUsage(d.usage || {});
      setProductTotals(d.productTotals || {});
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Load failed');
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const cat = useMemo(
    () => masters.find((m) => m.categoryKey === selectedKey) || null,
    [masters, selectedKey]
  );

  const drawable = cat ? DRAWABLE[cat.categoryKey] : undefined;
  const remainingDrawable = useMemo(() => {
    if (!cat || !drawable) return [];
    const have = new Set(cat.options.map((o) => o.value));
    return drawable.filter((d) => !have.has(d.value));
  }, [cat, drawable]);

  const filtered = useMemo(() => {
    if (!cat) return [];
    const q = search.trim().toLowerCase();
    return cat.options.filter((o) => {
      if (arabicOnly && o.labelAr) return false;
      if (!q) return true;
      return (
        o.labelEn.toLowerCase().includes(q) ||
        (o.labelAr || '').includes(search.trim()) ||
        o.value.includes(q)
      );
    });
  }, [cat, search, arabicOnly]);

  /* Reordering a filtered view would only reorder what is visible, so the drag
     handle is offered on the full list only. */
  const canDrag = !search.trim() && !arabicOnly;

  function goto(key: string) {
    router.push(`/admin/sample-quiz/library?category=${encodeURIComponent(key)}`);
    setSearch('');
    setArabicOnly(false);
  }

  async function send(init: RequestInit & { url?: string }) {
    setBusy(true);
    setError(null);
    try {
      const r = await fetch(init.url || '/api/sample-quiz/spec-options', init);
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.error || 'Save failed');
      }
      await load();
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
      return false;
    } finally {
      setBusy(false);
    }
  }

  function metaFromDraft(): Record<string, unknown> | undefined {
    if (!cat) return undefined;
    if (cat.widget === 'color-swatches' && cat.categoryKey !== 'package-color') {
      return { hex: draft.hex };
    }
    if (cat.widget === 'icon-cards' && draft.icon) return { icon: draft.icon };
    if (cat.widget === 'fragrance-flow') {
      const notes = draft.subNotes
        .filter((n) => n.labelEn.trim())
        .map((n) => ({
          value: n.value || slug(n.labelEn),
          labelEn: n.labelEn.trim(),
          ...(n.labelAr?.trim() ? { labelAr: n.labelAr.trim() } : {}),
        }));
      return { subNotes: notes };
    }
    return undefined;
  }

  async function submitAdd() {
    if (!cat || !draft.labelEn.trim()) return;
    const ok = await send({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        categoryKey: cat.categoryKey,
        value: draft.value || undefined,
        labelEn: draft.labelEn.trim(),
        labelAr: draft.labelAr.trim(),
        meta: metaFromDraft(),
        attachToProducts: draft.attach,
      }),
    });
    if (ok) {
      setAdding(false);
      setDraft(EMPTY_DRAFT);
    }
  }

  async function submitEdit() {
    if (!cat || !editing) return;
    const ok = await send({
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        categoryKey: cat.categoryKey,
        option: {
          value: editing.value,
          labelEn: draft.labelEn.trim(),
          labelAr: draft.labelAr.trim(),
          meta: metaFromDraft(),
        },
      }),
    });
    if (ok) setEditing(null);
  }

  async function submitRemove() {
    if (!cat || !removing) return;
    const ok = await send({
      method: 'DELETE',
      url: `/api/sample-quiz/spec-options?categoryKey=${encodeURIComponent(
        cat.categoryKey
      )}&value=${encodeURIComponent(removing.value)}`,
    });
    if (ok) setRemoving(null);
  }

  async function reorder(next: Opt[]) {
    if (!cat) return;
    // Show the new order straight away; the save confirms it.
    setMasters((ms) =>
      ms.map((m) => (m.categoryKey === cat.categoryKey ? { ...m, options: next } : m))
    );
    await send({
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ categoryKey: cat.categoryKey, order: next.map((o) => o.value) }),
    });
  }

  function openAdd() {
    const first = remainingDrawable[0];
    setDraft({
      ...EMPTY_DRAFT,
      ...(first ? { value: first.value, labelEn: first.labelEn, labelAr: first.labelAr || '' } : {}),
    });
    setAdding(true);
  }

  function openEdit(opt: Opt) {
    const notes = Array.isArray(opt.meta?.subNotes) ? (opt.meta.subNotes as SubNote[]) : [];
    setDraft({
      value: opt.value,
      labelEn: opt.labelEn,
      labelAr: opt.labelAr || '',
      hex: typeof opt.meta?.hex === 'string' ? (opt.meta.hex as string) : '#CCCCCC',
      icon: typeof opt.meta?.icon === 'string' ? (opt.meta.icon as string) : '',
      subNotes: notes.map((n) => ({ ...n })),
      attach: true,
    });
    setEditing(opt);
  }

  if (!ready) return <Spinner />;

  return (
    <div>
      <PageHeader
        title={t('admin.optionLibrary')}
        subtitle={t('admin.optionLibraryDesc')}
        backHref="/admin/sample-quiz"
        backLabel={t('admin.quizTitle')}
      />

      {error && (
        <div className="mb-4">
          <ErrorNote>{error}</ErrorNote>
        </div>
      )}

      {/* ---------------------- The lists ---------------------- */}
      <AutoGrid min="13rem" gap="0.75rem" className="mb-5">
        {masters.map((m) => {
          const active = cat?.categoryKey === m.categoryKey;
          const noAr = m.options.filter((o) => !o.labelAr).length;
          return (
            <button
              key={m.categoryKey}
              type="button"
              onClick={() => goto(m.categoryKey)}
              aria-pressed={active}
              className={`rounded-xl border p-3.5 text-start transition-colors ${
                active
                  ? 'border-brand bg-brand-soft text-brand-soft-fg'
                  : 'border-line bg-surface hover:border-brand'
              }`}
            >
              <p className="truncate text-sm font-semibold text-fg">
                {pick(m.defaultTitleEn, m.defaultTitleAr)}
              </p>
              <p className="mt-1 text-xs text-fg-muted">
                {m.options.length} {tx('options')}
                {DRAWABLE[m.categoryKey] ? (
                  <span className="ms-1.5 inline-flex items-center gap-1 align-middle text-fg-subtle">
                    <Boxes size={11} />
                  </span>
                ) : null}
              </p>
              {noAr > 0 && (
                <span className="mt-2 inline-block">
                  <Badge tone="warn">
                    {noAr} · {tx('No Arabic name')}
                  </Badge>
                </span>
              )}
            </button>
          );
        })}
      </AutoGrid>

      {/* ---------------------- The chosen list ---------------------- */}
      {!cat ? (
        <EmptyState
          icon={FlaskConical}
          title={tx('Pick a list to edit')}
          hint={t('admin.optionLibraryDesc')}
        />
      ) : (
        <Card padded={false}>
          <div className="flex flex-wrap items-end justify-between gap-3 border-b border-line p-4 sm:p-5">
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-fg">
                {pick(cat.defaultTitleEn, cat.defaultTitleAr)}
              </h2>
              <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-fg-muted">
                <span className="font-mono">{cat.categoryKey}</span>
                <Badge tone="info">{cat.widget}</Badge>
                <span>
                  {cat.options.length} {tx('options')}
                </span>
                <span className="text-fg-subtle">·</span>
                <span>{tx('Reaches the customer quiz immediately')}</span>
              </p>
            </div>
            <Button
              icon={Plus}
              onClick={openAdd}
              disabled={!!drawable && remainingDrawable.length === 0}
            >
              {tx('Add option')}
            </Button>
          </div>

          {drawable && (
            <p className="flex items-start gap-2 border-b border-line bg-surface-2 px-4 py-3 text-xs leading-relaxed text-fg-muted sm:px-5">
              <Boxes size={14} className="mt-0.5 shrink-0" />
              <span>
                {tx(
                  'This list feeds the 3D packaging studio, which draws each shape in code, so only shapes it can draw are offered.'
                )}
                {remainingDrawable.length === 0 && ` ${tx('Every shape it can draw is already in this list.')}`}
              </span>
            </p>
          )}

          <div className="flex flex-wrap items-center gap-3 border-b border-line p-4 sm:p-5">
            <div className="relative min-w-0 flex-1 sm:max-w-xs">
              <Search size={13} className="absolute start-3 top-1/2 -translate-y-1/2 text-fg-subtle" />
              <TextInput
                className="ps-10 text-sm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={tx('Search this list…')}
                aria-label={tx('Search this list…')}
              />
            </div>
            <div className="w-48 shrink-0">
              <Toggle
                label={tx('Missing Arabic only')}
                value={arabicOnly}
                onChange={setArabicOnly}
              />
            </div>
          </div>

          <div className="p-3 sm:p-4">
            {filtered.length === 0 ? (
              <p className="py-8 text-center text-sm text-fg-subtle">
                {cat.options.length === 0 ? tx('Nothing in this list yet') : tx('No matches')}
              </p>
            ) : canDrag ? (
              <SortableList
                items={filtered}
                onReorder={reorder}
                getKey={(o) => o.value}
                className="space-y-2"
                renderItem={(opt, _i, handle) => (
                  <OptionRow
                    cat={cat}
                    opt={opt}
                    handle={handle}
                    used={usage[cat.categoryKey]?.[opt.value] || 0}
                    total={productTotals[cat.categoryKey] || 0}
                    onEdit={() => openEdit(opt)}
                    onRemove={() => setRemoving(opt)}
                  />
                )}
              />
            ) : (
              <div className="space-y-2">
                {filtered.map((opt) => (
                  <OptionRow
                    key={opt.value}
                    cat={cat}
                    opt={opt}
                    used={usage[cat.categoryKey]?.[opt.value] || 0}
                    total={productTotals[cat.categoryKey] || 0}
                    onEdit={() => openEdit(opt)}
                    onRemove={() => setRemoving(opt)}
                  />
                ))}
              </div>
            )}
          </div>
        </Card>
      )}

      {/* ---------------------- Add ---------------------- */}
      <Modal
        open={adding}
        onClose={() => setAdding(false)}
        title={tx('Add option')}
        subtitle={cat ? pick(cat.defaultTitleEn, cat.defaultTitleAr) : undefined}
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setAdding(false)}>
              {tx('Cancel')}
            </Button>
            <Button onClick={submitAdd} loading={busy} disabled={!draft.labelEn.trim()}>
              {tx('Save')}
            </Button>
          </>
        }
      >
        {cat && (
          <div className="space-y-4">
            {drawable ? (
              <Field label={tx('Pick a shape')} required>
                <Select
                  value={draft.value}
                  onChange={(e) => {
                    const d = remainingDrawable.find((x) => x.value === e.target.value);
                    setDraft((s) => ({
                      ...s,
                      value: e.target.value,
                      labelEn: d?.labelEn || s.labelEn,
                      labelAr: d?.labelAr || s.labelAr,
                    }));
                  }}
                >
                  {remainingDrawable.map((d) => (
                    <option key={d.value} value={d.value}>
                      {d.labelEn}
                    </option>
                  ))}
                </Select>
              </Field>
            ) : null}

            <DraftFields cat={cat} draft={draft} setDraft={setDraft} />

            <div className="rounded-xl border border-line bg-surface-2 p-3.5">
              <Toggle
                label={tx('Offer it on every product that already uses this list')}
                hint={tx('Leave this on, or the option exists in the library but no product offers it.')}
                value={draft.attach}
                onChange={(v) => setDraft((s) => ({ ...s, attach: v }))}
              />
            </div>
          </div>
        )}
      </Modal>

      {/* ---------------------- Edit ---------------------- */}
      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={tx('Edit option')}
        subtitle={cat ? pick(cat.defaultTitleEn, cat.defaultTitleAr) : undefined}
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditing(null)}>
              {tx('Cancel')}
            </Button>
            <Button onClick={submitEdit} loading={busy} disabled={!draft.labelEn.trim()}>
              {tx('Save')}
            </Button>
          </>
        }
      >
        {cat && editing && (
          <div className="space-y-4">
            <DraftFields cat={cat} draft={draft} setDraft={setDraft} />
            <Field
              label={tx('Saved key')}
              hint={tx('Generated from the English name. It is stored in every order, so it cannot be changed later.')}
            >
              <TextInput value={editing.value} readOnly disabled className="font-mono text-xs" />
            </Field>
          </div>
        )}
      </Modal>

      {/* ---------------------- Remove ---------------------- */}
      <Modal
        open={!!removing}
        onClose={() => setRemoving(null)}
        title={tx('Remove from the library')}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setRemoving(null)}>
              {tx('Cancel')}
            </Button>
            <Button variant="danger" onClick={submitRemove} loading={busy}>
              {tx('Remove')}
            </Button>
          </>
        }
      >
        {cat && removing && (
          <div className="space-y-3">
            <p className="text-sm text-fg">{pick(removing.labelEn, removing.labelAr)}</p>
            <p className="text-sm text-fg-muted">
              {(usage[cat.categoryKey]?.[removing.value] || 0) > 0
                ? `${usage[cat.categoryKey][removing.value]} ${tx('products')}`
                : tx('Offered by no product yet')}
            </p>
            <p className="text-xs leading-relaxed text-fg-muted">
              {tx('Removing it only stops it being offered from now on — orders already placed keep what the customer chose.')}
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
}

/** The label and meta fields, shared by the add and edit forms. */
function DraftFields({
  cat,
  draft,
  setDraft,
}: {
  cat: Master;
  draft: Draft;
  setDraft: React.Dispatch<React.SetStateAction<Draft>>;
}) {
  const { tx } = useLanguage();
  const isPackColor = cat.categoryKey === 'package-color';

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={tx('English name')} required>
          <TextInput
            value={draft.labelEn}
            onChange={(e) => setDraft((s) => ({ ...s, labelEn: e.target.value }))}
          />
        </Field>
        <Field label={tx('Arabic name')}>
          <ArabicInput
            value={draft.labelAr}
            onChange={(e) => setDraft((s) => ({ ...s, labelAr: e.target.value }))}
          />
        </Field>
      </div>

      {cat.widget === 'color-swatches' && !isPackColor && (
        <Field label={tx('Colour')}>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={draft.hex}
              onChange={(e) => setDraft((s) => ({ ...s, hex: e.target.value }))}
              aria-label={tx('Colour')}
              className="h-10 w-14 shrink-0 cursor-pointer rounded-lg border border-line bg-surface p-1"
            />
            <TextInput
              value={draft.hex}
              onChange={(e) => setDraft((s) => ({ ...s, hex: e.target.value }))}
              className="font-mono text-sm"
            />
          </div>
        </Field>
      )}

      {cat.widget === 'color-swatches' && isPackColor && (
        <p className="text-xs leading-relaxed text-fg-muted">
          {tx('The colour the 3D studio paints comes from the packaging library, not from here.')}
        </p>
      )}

      {cat.widget === 'icon-cards' && (
        <Field label={tx('Icon')}>
          <Select
            value={draft.icon}
            onChange={(e) => setDraft((s) => ({ ...s, icon: e.target.value }))}
          >
            <option value="">—</option>
            {ICONS.map((i) => (
              <option key={i} value={i}>
                {i}
              </option>
            ))}
          </Select>
        </Field>
      )}

      {cat.widget === 'fragrance-flow' && (
        <Field label={tx('Sub-notes')}>
          <div className="space-y-2">
            {draft.subNotes.map((n, i) => (
              <div key={i} className="flex flex-wrap items-center gap-2">
                <TextInput
                  className="min-w-0 flex-1 text-sm"
                  value={n.labelEn}
                  placeholder={tx('English name')}
                  onChange={(e) =>
                    setDraft((s) => ({
                      ...s,
                      subNotes: s.subNotes.map((x, j) =>
                        j === i ? { ...x, labelEn: e.target.value } : x
                      ),
                    }))
                  }
                />
                <ArabicInput
                  className="min-w-0 flex-1 text-sm"
                  value={n.labelAr || ''}
                  placeholder={tx('Arabic name')}
                  onChange={(e) =>
                    setDraft((s) => ({
                      ...s,
                      subNotes: s.subNotes.map((x, j) =>
                        j === i ? { ...x, labelAr: e.target.value } : x
                      ),
                    }))
                  }
                />
                <Button
                  variant="ghost"
                  size="sm"
                  icon={Trash2}
                  aria-label={tx('Remove')}
                  onClick={() =>
                    setDraft((s) => ({ ...s, subNotes: s.subNotes.filter((_, j) => j !== i) }))
                  }
                />
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              icon={Plus}
              onClick={() =>
                setDraft((s) => ({
                  ...s,
                  subNotes: [...s.subNotes, { value: '', labelEn: '', labelAr: '' }],
                }))
              }
            >
              {tx('Add sub-note')}
            </Button>
          </div>
        </Field>
      )}
    </>
  );
}

function OptionRow({
  cat,
  opt,
  handle,
  used,
  total,
  onEdit,
  onRemove,
}: {
  cat: Master;
  opt: Opt;
  handle?: React.ReactNode;
  used: number;
  total: number;
  onEdit: () => void;
  onRemove: () => void;
}) {
  const { tx, pick } = useLanguage();
  const hex = swatchOf(cat, opt);
  const notes = Array.isArray(opt.meta?.subNotes) ? (opt.meta.subNotes as SubNote[]).length : 0;

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-surface px-2 py-2 sm:gap-3 sm:px-3">
      {handle ? <span className="shrink-0 text-fg-subtle">{handle}</span> : <span className="w-1" />}

      {hex && (
        <span
          className="h-7 w-7 shrink-0 rounded-full border border-line"
          style={{ background: hex }}
          aria-hidden
        />
      )}

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-fg">{pick(opt.labelEn, opt.labelAr)}</p>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-fg-subtle">
          <span className="font-mono">{opt.value}</span>
          {!opt.labelAr && <Badge tone="warn">{tx('No Arabic name')}</Badge>}
          {notes > 0 && (
            <span>
              {notes} {tx('Sub-notes')}
            </span>
          )}
        </p>
      </div>

      <span className="shrink-0 text-[11px] text-fg-muted">
        {used > 0 ? (
          <>
            {used}
            {total > 0 && <span className="text-fg-subtle">/{total}</span>} {tx('products')}
          </>
        ) : (
          <Badge tone="neutral">{tx('Offered by no product yet')}</Badge>
        )}
      </span>

      <div className="flex shrink-0 items-center gap-1">
        <Button variant="ghost" size="sm" icon={Pencil} onClick={onEdit} aria-label={tx('Edit')} />
        <Button variant="ghost" size="sm" icon={Trash2} onClick={onRemove} aria-label={tx('Delete')} />
      </div>
    </div>
  );
}

export default function OptionLibraryPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <LibraryInner />
    </Suspense>
  );
}
