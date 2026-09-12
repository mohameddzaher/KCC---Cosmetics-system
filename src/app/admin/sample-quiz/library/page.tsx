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
import { Boxes, FlaskConical, Layers, Pencil, Plus, Search, Settings2, Trash2 } from 'lucide-react';
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

/**
 * Values the packaging studio can actually render, by category.
 *
 * Colour is deliberately absent: a colour is pure data, so the studio paints
 * whatever hex is saved here and a new one needs no code. Only shapes, closures,
 * label styles and finishes are drawn in code.
 */
const DRAWABLE: Record<string, Drawable[]> = {
  'product-packaging': BOTTLES.map((b) => ({ value: b.value, labelEn: b.labelEn, labelAr: b.labelAr })),
  'package-cap': CAPS.map((c) => ({ value: c.value, labelEn: c.labelEn, labelAr: c.labelAr })),
  'package-label': LABELS.map((l) => ({ value: l.value, labelEn: l.labelEn, labelAr: l.labelAr })),
  'package-finish': FINISHES.map((f) => ({ value: f.value, labelEn: f.labelEn, labelAr: f.labelAr })),
};

/** Icon names the quiz's icon grid knows how to draw. */
const ICONS = [
  'pump', 'gel-pump', 'jar', 'bottle', 'tube', 'spray', 'roll-on',
  'dropper', 'vial', 'serum-pump', 'glass-ampoule', 'pvc-ampoule',
  'opaque', 'translucent', 'transparent',
];

/**
 * What a widget key means, in words.
 *
 * `chips-multi` is a name for the code, not for the person choosing it. The key
 * is still what gets stored — only the reading changes.
 */
function widgetName(widget: string, tx: (en: string) => string): string {
  switch (widget) {
    case 'chips-multi':
      return tx('Pick several from a list');
    case 'chips-single':
      return tx('Pick one from a list');
    case 'color-swatches':
      return tx('Colour swatches');
    case 'icon-cards':
      return tx('Cards with an icon');
    case 'visual-cards':
      return tx('Cards with a picture');
    case 'fragrance-flow':
      return tx('Fragrance: family, then notes');
    default:
      return widget;
  }
}

function slug(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/** The swatch hex — the saved one, which is also the one that gets painted. */
function swatchOf(cat: Master, opt: Opt): string | null {
  if (cat.widget !== 'color-swatches') return null;
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

  /** Which option's product membership is open. */
  const [offersFor, setOffersFor] = useState<Opt | null>(null);
  /** The library itself: renaming it, or creating a new one. */
  const [editingList, setEditingList] = useState(false);
  const [newList, setNewList] = useState(false);
  const [deletingList, setDeletingList] = useState(false);
  const [listDraft, setListDraft] = useState({
    titleEn: '',
    titleAr: '',
    subtitleEn: '',
    subtitleAr: '',
    active: true,
    widget: 'chips-multi',
    attach: false,
  });

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

  /** The shape being added, when this list is one the studio draws in code. */
  const picked = drawable ? remainingDrawable.find((d) => d.value === draft.value) : undefined;

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
    if (cat.widget === 'color-swatches') {
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
    // Only the shape key is pre-chosen. The names stay empty on purpose: what a
    // customer reads has to be what the admin wrote, not a copy of a label that
    // also lives in the code and would disagree with it the moment it is edited.
    const first = remainingDrawable[0];
    setDraft({ ...EMPTY_DRAFT, ...(first ? { value: first.value } : {}) });
    setAdding(true);
  }

  function openEditList() {
    if (!cat) return;
    setListDraft({
      titleEn: cat.defaultTitleEn || '',
      titleAr: cat.defaultTitleAr || '',
      subtitleEn: '',
      subtitleAr: '',
      active: cat.active,
      widget: cat.widget,
      attach: false,
    });
    setEditingList(true);
  }

  async function submitEditList() {
    if (!cat) return;
    const ok = await send({
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        categoryKey: cat.categoryKey,
        defaultTitleEn: listDraft.titleEn.trim(),
        defaultTitleAr: listDraft.titleAr.trim(),
        active: listDraft.active,
      }),
    });
    if (ok) setEditingList(false);
  }

  async function submitNewList() {
    if (!listDraft.titleEn.trim()) return;
    const ok = await send({
      url: '/api/sample-quiz/spec-options/categories',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        defaultTitleEn: listDraft.titleEn.trim(),
        defaultTitleAr: listDraft.titleAr.trim(),
        widget: listDraft.widget,
        attachToProducts: listDraft.attach,
      }),
    });
    if (ok) setNewList(false);
  }

  async function submitDeleteList() {
    if (!cat) return;
    const ok = await send({
      url: `/api/sample-quiz/spec-options/categories?categoryKey=${encodeURIComponent(cat.categoryKey)}`,
      method: 'DELETE',
    });
    if (ok) {
      setDeletingList(false);
      router.push('/admin/sample-quiz/library');
    }
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
        actions={
          <Button
            variant="outline"
            icon={Layers}
            onClick={() => {
              setListDraft({
                titleEn: '',
                titleAr: '',
                subtitleEn: '',
                subtitleAr: '',
                active: true,
                widget: 'chips-multi',
                attach: false,
              });
              setNewList(true);
            }}
          >
            {tx('New list')}
          </Button>
        }
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
                <Badge tone="info">{widgetName(cat.widget, tx)}</Badge>
                <span>
                  {cat.options.length} {tx('options')}
                </span>
                <span className="text-fg-subtle">·</span>
                <span>{tx('Reaches the customer quiz immediately')}</span>
                {!cat.active && <Badge tone="warn">{tx('Inactive')}</Badge>}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" icon={Settings2} onClick={openEditList}>
                {tx('Edit list')}
              </Button>
              {cat.options.length === 0 && (
                <Button variant="ghost" icon={Trash2} onClick={() => setDeletingList(true)}>
                  {tx('Delete list')}
                </Button>
              )}
              <Button
                icon={Plus}
                onClick={openAdd}
                disabled={!!drawable && remainingDrawable.length === 0}
              >
                {tx('Add option')}
              </Button>
            </div>
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
                    onOffers={() => setOffersFor(opt)}
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
                    onOffers={() => setOffersFor(opt)}
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
              <Field
                label={tx('Pick a shape')}
                hint={tx('Type the name customers will see. The shape list only supplies the 3D shape.')}
                required
              >
                <Select
                  value={draft.value}
                  onChange={(e) => setDraft((s) => ({ ...s, value: e.target.value }))}
                >
                  {remainingDrawable.map((d) => (
                    <option key={d.value} value={d.value}>
                      {d.labelEn}
                    </option>
                  ))}
                </Select>
              </Field>
            ) : null}

            <DraftFields
              cat={cat}
              draft={draft}
              setDraft={setDraft}
              placeholderEn={picked?.labelEn}
              placeholderAr={picked?.labelAr}
            />

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

      {/* ---------------- Which products offer this option ---------------- */}
      {cat && offersFor && (
        <OffersModal
          categoryKey={cat.categoryKey}
          option={offersFor}
          onClose={() => setOffersFor(null)}
          onSaved={() => {
            setOffersFor(null);
            load();
          }}
        />
      )}

      {/* ---------------- The library itself ---------------- */}
      <Modal
        open={editingList}
        onClose={() => setEditingList(false)}
        title={tx('Edit list')}
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditingList(false)}>
              {tx('Cancel')}
            </Button>
            <Button onClick={submitEditList} loading={busy} disabled={!listDraft.titleEn.trim()}>
              {tx('Save')}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t('admin.questionEn')} required>
              <TextInput
                value={listDraft.titleEn}
                onChange={(e) => setListDraft((s) => ({ ...s, titleEn: e.target.value }))}
              />
            </Field>
            <Field label={t('admin.questionAr')}>
              <ArabicInput
                value={listDraft.titleAr}
                onChange={(e) => setListDraft((s) => ({ ...s, titleAr: e.target.value }))}
              />
            </Field>
          </div>
          <div className="rounded-xl border border-line bg-surface-2 p-3.5">
            <Toggle
              label={tx('Active')}
              value={listDraft.active}
              onChange={(v) => setListDraft((s) => ({ ...s, active: v }))}
            />
          </div>
          {cat && cat.options.length > 0 && (
            <p className="text-xs leading-relaxed text-fg-muted">
              {tx('Only an empty list can be deleted. Switch it off instead to retire it.')}
            </p>
          )}
        </div>
      </Modal>

      <Modal
        open={newList}
        onClose={() => setNewList(false)}
        title={tx('New list')}
        subtitle={tx('A new list of answers you fill with options, then use on any product.')}
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setNewList(false)}>
              {tx('Cancel')}
            </Button>
            <Button onClick={submitNewList} loading={busy} disabled={!listDraft.titleEn.trim()}>
              {tx('Save')}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t('admin.questionEn')} required>
              <TextInput
                value={listDraft.titleEn}
                onChange={(e) => setListDraft((s) => ({ ...s, titleEn: e.target.value }))}
              />
            </Field>
            <Field label={t('admin.questionAr')}>
              <ArabicInput
                value={listDraft.titleAr}
                onChange={(e) => setListDraft((s) => ({ ...s, titleAr: e.target.value }))}
              />
            </Field>
          </div>
          <Field
            label={tx('How it is answered')}
            hint={tx('How the customer picks from this list.')}
          >
            <Select
              value={listDraft.widget}
              onChange={(e) => setListDraft((s) => ({ ...s, widget: e.target.value }))}
            >
              {['chips-multi', 'chips-single', 'color-swatches', 'icon-cards', 'visual-cards'].map((w) => (
                <option key={w} value={w}>
                  {widgetName(w, tx)}
                </option>
              ))}
            </Select>
          </Field>
          <div className="rounded-xl border border-line bg-surface-2 p-3.5">
            <Toggle
              label={tx('Add this question to every product now')}
              hint={tx('It arrives switched off on each product, so no customer sees an empty question while you fill the list. Turn it on per product from the product screen when it is ready. Leave this off to add the question to a few products yourself instead.')}
              value={listDraft.attach}
              onChange={(v) => setListDraft((s) => ({ ...s, attach: v }))}
            />
          </div>
        </div>
      </Modal>

      <Modal
        open={deletingList}
        onClose={() => setDeletingList(false)}
        title={tx('Delete list')}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeletingList(false)}>
              {tx('Cancel')}
            </Button>
            <Button variant="danger" onClick={submitDeleteList} loading={busy}>
              {tx('Delete')}
            </Button>
          </>
        }
      >
        {cat && <p className="text-sm text-fg">{pick(cat.defaultTitleEn, cat.defaultTitleAr)}</p>}
      </Modal>
    </div>
  );
}

/**
 * The product membership of one option.
 *
 * Answers "who offers this?" and lets it be changed per product, which is what
 * the bulk attach toggle leaves open. Products with no list of their own offer
 * everything, so they arrive ticked and unticking them writes their list out.
 */
function OffersModal({
  categoryKey,
  option,
  onClose,
  onSaved,
}: {
  categoryKey: string;
  option: Opt;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { tx, pick } = useLanguage();
  const [rows, setRows] = useState<
    Array<{
      productKey: string;
      itemName: string;
      mainSlug: string;
      subSlug: string;
      specEnabled: boolean;
      offersAll: boolean;
      offers: boolean;
    }>
  >([]);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(
      `/api/sample-quiz/spec-options/offers?categoryKey=${encodeURIComponent(
        categoryKey
      )}&value=${encodeURIComponent(option.value)}`,
      { cache: 'no-store' }
    )
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('Could not load the product list'))))
      .then((d) => {
        if (cancelled) return;
        const list = Array.isArray(d.products) ? d.products : [];
        setRows(list);
        setPicked(new Set(list.filter((p: { offers: boolean }) => p.offers).map((p: { productKey: string }) => p.productKey)));
      })
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : 'Load failed'))
      .finally(() => !cancelled && setReady(true));
    return () => {
      cancelled = true;
    };
  }, [categoryKey, option.value]);

  const groups = useMemo(() => {
    const by = new Map<string, typeof rows>();
    for (const r of rows) {
      const list = by.get(r.mainSlug) || [];
      list.push(r);
      by.set(r.mainSlug, list);
    }
    return [...by.entries()];
  }, [rows]);

  function toggle(key: string) {
    setPicked((s) => {
      const next = new Set(s);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function setGroup(keys: string[], on: boolean) {
    setPicked((s) => {
      const next = new Set(s);
      for (const k of keys) (on ? next.add(k) : next.delete(k));
      return next;
    });
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const attach = rows.filter((r) => picked.has(r.productKey) && !r.offers).map((r) => r.productKey);
      const detach = rows.filter((r) => !picked.has(r.productKey) && r.offers).map((r) => r.productKey);
      const res = await fetch('/api/sample-quiz/spec-options/offers', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categoryKey, value: option.value, attach, detach }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || 'Save failed');
      }
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={tx('Where it is offered')}
      subtitle={pick(option.labelEn, option.labelAr)}
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {tx('Cancel')}
          </Button>
          <Button onClick={save} loading={saving} disabled={!ready}>
            {tx('Save')}
          </Button>
        </>
      }
    >
      {!ready ? (
        <Spinner />
      ) : (
        <div className="space-y-4">
          {error && <ErrorNote>{error}</ErrorNote>}

          <p className="text-xs leading-relaxed text-fg-muted">
            {tx('A product with no list of its own offers every option, so it is ticked here. Unticking it writes out the full list for that product, minus this one.')}
          </p>

          {rows.length === 0 ? (
            <p className="py-6 text-center text-sm text-fg-subtle">
              {tx('No product carries this list yet')}
            </p>
          ) : (
            groups.map(([main, list]) => {
              const keys = list.map((r) => r.productKey);
              const on = keys.filter((k) => picked.has(k)).length;
              return (
                <div key={main} className="rounded-xl border border-line">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-bg-subtle px-3 py-2">
                    <p className="text-xs font-semibold capitalize text-fg">
                      {main.replace(/-/g, ' ')}
                      <span className="ms-2 font-normal text-fg-muted">
                        {on}/{keys.length}
                      </span>
                    </p>
                    <div className="flex items-center gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() => setGroup(keys, true)}
                        className="font-medium text-brand hover:underline"
                      >
                        {tx('All')}
                      </button>
                      <span className="text-fg-subtle">·</span>
                      <button
                        type="button"
                        onClick={() => setGroup(keys, false)}
                        className="font-medium text-fg-muted hover:text-fg hover:underline"
                      >
                        {tx('None')}
                      </button>
                    </div>
                  </div>
                  <div className="divide-y divide-line">
                    {list.map((r) => (
                      <label
                        key={r.productKey}
                        className="flex cursor-pointer items-center gap-2.5 px-3 py-2 text-sm hover:bg-surface-2"
                      >
                        <input
                          type="checkbox"
                          checked={picked.has(r.productKey)}
                          onChange={() => toggle(r.productKey)}
                          className="accent-accent"
                        />
                        <span className="min-w-0 flex-1 truncate text-fg">{r.itemName}</span>
                        {r.offersAll && <Badge tone="info">{tx('Offers everything')}</Badge>}
                        {!r.specEnabled && <Badge tone="neutral">{tx('Question switched off')}</Badge>}
                      </label>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </Modal>
  );
}

/** The label and meta fields, shared by the add and edit forms. */
function DraftFields({
  cat,
  draft,
  setDraft,
  placeholderEn,
  placeholderAr,
}: {
  cat: Master;
  draft: Draft;
  setDraft: React.Dispatch<React.SetStateAction<Draft>>;
  /** Shown as a hint only — never saved unless the admin types it. */
  placeholderEn?: string;
  placeholderAr?: string;
}) {
  const { tx } = useLanguage();

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={tx('English name')} required>
          <TextInput
            value={draft.labelEn}
            placeholder={placeholderEn}
            onChange={(e) => setDraft((s) => ({ ...s, labelEn: e.target.value }))}
          />
        </Field>
        <Field label={tx('Arabic name')}>
          <ArabicInput
            value={draft.labelAr}
            placeholder={placeholderAr}
            onChange={(e) => setDraft((s) => ({ ...s, labelAr: e.target.value }))}
          />
        </Field>
      </div>

      {cat.widget === 'color-swatches' && (
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
  onOffers,
}: {
  cat: Master;
  opt: Opt;
  handle?: React.ReactNode;
  used: number;
  total: number;
  onEdit: () => void;
  onRemove: () => void;
  onOffers: () => void;
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

      {/* The count is the way in to changing it, so it is the button. */}
      <button
        type="button"
        onClick={onOffers}
        title={tx('Where it is offered')}
        className="shrink-0 rounded-lg px-2 py-1 text-[11px] text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg"
      >
        {used > 0 ? (
          <>
            {used}
            {total > 0 && <span className="text-fg-subtle">/{total}</span>} {tx('products')}
          </>
        ) : (
          <Badge tone="neutral">{tx('Offered by no product yet')}</Badge>
        )}
      </button>

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
