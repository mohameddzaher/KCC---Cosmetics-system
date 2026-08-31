'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Loader2, Plus, Trash2, Save, ChevronRight, ChevronDown,
  Folder, FolderOpen, Package, X, Layers, AlertCircle, Check,
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface Sub { name: string; slug?: string; items: string[]; order?: number }
interface Cat { _id: string; name: string; slug: string; active: boolean; order: number; subcategories: Sub[] }

export default function CategoriesAdminPage() {
  const { tx } = useLanguage();
  const [cats, setCats] = useState<Cat[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [newMain, setNewMain] = useState('');
  const [creating, setCreating] = useState(false);
  // per-sub "add item" drafts and per-cat "add sub" drafts
  const [itemDraft, setItemDraft] = useState<Record<string, string>>({});
  const [subDraft, setSubDraft] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/categories', { cache: 'no-store' });
      const data = res.ok ? await res.json() : [];
      setCats(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggle = (id: string) => {
    setOpen((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const patchCat = (idx: number, patch: Partial<Cat>) =>
    setCats((prev) => prev.map((c, i) => (i === idx ? { ...c, ...patch } : c)));

  const patchSub = (ci: number, si: number, patch: Partial<Sub>) =>
    setCats((prev) => prev.map((c, i) => i !== ci ? c : {
      ...c, subcategories: c.subcategories.map((s, j) => (j === si ? { ...s, ...patch } : s)),
    }));

  const addSub = (ci: number, key: string) => {
    const name = (subDraft[key] || '').trim();
    if (!name) return;
    setCats((prev) => prev.map((c, i) => i !== ci ? c : {
      ...c, subcategories: [...c.subcategories, { name, items: [], order: c.subcategories.length }],
    }));
    setSubDraft((d) => ({ ...d, [key]: '' }));
  };

  const deleteSub = (ci: number, si: number) =>
    setCats((prev) => prev.map((c, i) => i !== ci ? c : {
      ...c, subcategories: c.subcategories.filter((_, j) => j !== si),
    }));

  const addItem = (ci: number, si: number, key: string) => {
    const item = (itemDraft[key] || '').trim();
    if (!item) return;
    setCats((prev) => prev.map((c, i) => i !== ci ? c : {
      ...c, subcategories: c.subcategories.map((s, j) => j !== si ? s : { ...s, items: [...s.items, item] }),
    }));
    setItemDraft((d) => ({ ...d, [key]: '' }));
  };

  const deleteItem = (ci: number, si: number, ii: number) =>
    setCats((prev) => prev.map((c, i) => i !== ci ? c : {
      ...c, subcategories: c.subcategories.map((s, j) => j !== si ? s : { ...s, items: s.items.filter((_, k) => k !== ii) }),
    }));

  const saveCat = async (idx: number) => {
    const cat = cats[idx];
    setSavingId(cat._id);
    setSavedId(null);
    try {
      const res = await fetch(`/api/categories/${cat._id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: cat.name, active: cat.active, subcategories: cat.subcategories }),
      });
      if (!res.ok) { const e = await res.json(); alert(e.error || 'Failed to save'); return; }
      setSavedId(cat._id);
      setTimeout(() => setSavedId(null), 2500);
      load();
    } finally {
      setSavingId(null);
    }
  };

  const createMain = async () => {
    if (!newMain.trim()) return;
    setCreating(true);
    try {
      const res = await fetch('/api/categories', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newMain.trim() }),
      });
      if (!res.ok) { const e = await res.json(); alert(e.error || 'Failed to create'); return; }
      setNewMain('');
      load();
    } finally {
      setCreating(false);
    }
  };

  const deleteMain = async (cat: Cat) => {
    if (!confirm(`Delete "${cat.name}" and ALL its products' spec configs? This cannot be undone.`)) return;
    const res = await fetch(`/api/categories/${cat._id}`, { method: 'DELETE' });
    if (res.ok) load();
    else { const e = await res.json(); alert(e.error || 'Failed to delete'); }
  };

  const inputCls = 'px-2.5 py-1.5 text-sm bg-bg border border-line rounded-lg text-fg focus:border-kcc-green focus:outline-none';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-fg mb-1 flex items-center gap-2">
          <Layers size={22} className="text-kcc-green" />{tx('Product Categories')}</h1>
        <p className="text-sm text-fg-muted">
          Manage the full product taxonomy. Changes save to the database and appear in the customer sample-quiz instantly.
          Adding a product auto-creates its spec config; removing one cleans it up.
        </p>
      </div>

      {/* Add main category */}
      <div className="flex items-center gap-2">
        <input
          value={newMain}
          onChange={(e) => setNewMain(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') createMain(); }}
          placeholder={tx('New main category name (e.g. Hair Care)')}
          className={`${inputCls} flex-1`}
        />
        <button type="button" onClick={createMain} disabled={creating}
          className="flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-brand-fg bg-brand hover:bg-brand-hover rounded-lg transition-colors disabled:opacity-50">
          {creating ? <Loader2 size={15} className="animate-spin" /> : <Plus size={16} />} Add Category
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40"><Loader2 className="animate-spin text-kcc-green" size={24} /></div>
      ) : cats.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-40 text-fg-muted">
          <Layers size={30} className="mb-2" /><p>{tx('No categories yet')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {cats.map((cat, ci) => {
            const isOpen = open.has(cat._id);
            return (
              <div key={cat._id} className="rounded-xl border border-line bg-surface overflow-hidden">
                {/* Main header */}
                <div className="flex items-center gap-2 p-3">
                  <button type="button" onClick={() => toggle(cat._id)} className="text-fg-subtle hover:text-fg" aria-label={tx('Expand')}>
                    {isOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                  </button>
                  <span className="w-8 h-8 rounded-lg bg-kcc-green/15 text-kcc-green flex items-center justify-center shrink-0">
                    {isOpen ? <FolderOpen size={15} /> : <Folder size={15} />}
                  </span>
                  <input
                    value={cat.name}
                    onChange={(e) => patchCat(ci, { name: e.target.value })}
                    aria-label={tx('Category name')}
                    className={`${inputCls} flex-1 font-semibold`}
                  />
                  <span className="text-[11px] text-fg-subtle font-mono hidden sm:inline">
                    {cat.subcategories.length} subs · {cat.subcategories.reduce((n, s) => n + s.items.length, 0)} products
                  </span>
                  <label className="flex items-center gap-1.5 text-xs text-fg-muted cursor-pointer">
                    <input type="checkbox" checked={cat.active} onChange={(e) => patchCat(ci, { active: e.target.checked })}
                      className="w-4 h-4 rounded border-line bg-bg text-kcc-green" />{tx('Active')}</label>
                  <button type="button" onClick={() => saveCat(ci)} disabled={savingId === cat._id}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-brand-fg bg-brand hover:bg-brand-hover rounded-lg disabled:opacity-50">
                    {savingId === cat._id ? <Loader2 size={13} className="animate-spin" /> : savedId === cat._id ? <Check size={13} /> : <Save size={13} />}
                    {savedId === cat._id ? 'Saved' : 'Save'}
                  </button>
                  <button type="button" onClick={() => deleteMain(cat)} title={tx('Delete category')}
                    className="p-1.5 text-fg-muted hover:text-red-400 hover:bg-surface-2 rounded-lg"><Trash2 size={15} /></button>
                </div>

                {/* Subcategories */}
                {isOpen && (
                  <div className="border-t border-line bg-bg/40 p-3 space-y-2">
                    {cat.subcategories.map((sub, si) => {
                      const subKey = `${cat._id}:${si}`;
                      return (
                        <div key={si} className="rounded-lg border border-line bg-surface p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="w-6 h-6 rounded-md bg-kcc-beige/15 text-kcc-beige flex items-center justify-center shrink-0">
                              <Folder size={12} />
                            </span>
                            <input
                              value={sub.name}
                              onChange={(e) => patchSub(ci, si, { name: e.target.value })}
                              aria-label={tx('Sub-family name')}
                              className={`${inputCls} flex-1`}
                            />
                            <span className="text-[10px] text-fg-subtle font-mono">{sub.items.length} items</span>
                            <button type="button" onClick={() => deleteSub(ci, si)} title={tx('Delete sub-family')}
                              className="p-1.5 text-fg-muted hover:text-red-400 hover:bg-surface-2 rounded-lg"><Trash2 size={14} /></button>
                          </div>
                          {/* Items */}
                          <div className="ps-8 flex flex-wrap gap-1.5 mb-2">
                            {sub.items.map((it, ii) => (
                              <span key={ii} className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-surface-2 text-fg">
                                <Package size={10} className="text-fg-subtle" />{it}
                                <button type="button" onClick={() => deleteItem(ci, si, ii)} className="text-fg-subtle hover:text-red-400"><X size={11} /></button>
                              </span>
                            ))}
                            {sub.items.length === 0 && <span className="text-xs text-fg-subtle">{tx('No products yet')}</span>}
                          </div>
                          <div className="ps-8 flex items-center gap-2">
                            <input
                              value={itemDraft[subKey] || ''}
                              onChange={(e) => setItemDraft((d) => ({ ...d, [subKey]: e.target.value }))}
                              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addItem(ci, si, subKey); } }}
                              placeholder={tx('Add product name…')}
                              aria-label={tx('Add product')}
                              className={`${inputCls} flex-1`}
                            />
                            <button type="button" onClick={() => addItem(ci, si, subKey)} title={tx('Add product')}
                              className="px-2.5 py-1.5 text-fg-muted border border-line rounded-lg hover:text-kcc-green hover:border-kcc-green/40"><Plus size={14} /></button>
                          </div>
                        </div>
                      );
                    })}

                    {/* Add sub-family */}
                    <div className="flex items-center gap-2 pt-1">
                      <input
                        value={subDraft[cat._id] || ''}
                        onChange={(e) => setSubDraft((d) => ({ ...d, [cat._id]: e.target.value }))}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSub(ci, cat._id); } }}
                        placeholder={tx('Add sub-family (e.g. Shampoo)…')}
                        aria-label={tx('Add sub-family')}
                        className={`${inputCls} flex-1`}
                      />
                      <button type="button" onClick={() => addSub(ci, cat._id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-fg-muted border border-line rounded-lg hover:text-kcc-green hover:border-kcc-green/40">
                        <Plus size={14} />{tx('Sub-family')}</button>
                    </div>

                    <div className="flex items-start gap-2 text-[11px] text-fg-subtle pt-1">
                      <AlertCircle size={13} className="mt-0.5 shrink-0" />
                      <span>{tx('Remember to press')}<strong className="text-fg-muted">{tx('Save')}</strong> on this category to apply changes to the live quiz. Renaming a product resets its spec config.</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
