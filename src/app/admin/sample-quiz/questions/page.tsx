'use client';

import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Pencil, Trash2, X, Eye, EyeOff, Check, Loader2,
} from 'lucide-react';
import { SortableList } from '@/components/admin/SortableList';

interface BriefOption {
  value: string;
  labelEn: string;
  labelAr?: string;
  description?: string;
  imageUrl?: string;
}

interface BriefQuestion {
  _id?: string;
  questionKey: string;
  order: number;
  widget: 'cards' | 'image-cards' | 'chips-single' | 'chips-multi' | 'yes-no' | 'text' | 'textarea' | 'hero-ingredient';
  titleEn: string;
  titleAr?: string;
  subtitleEn?: string;
  subtitleAr?: string;
  options: BriefOption[];
  maxSelect?: number;
  required: boolean;
  active: boolean;
  allowNote: boolean;
}

const WIDGET_CHOICES: Array<{ value: BriefQuestion['widget']; label: string; helper: string }> = [
  { value: 'chips-single', label: 'Pick one — small chips', helper: 'Best for short lists like Yes/No, age groups, gender' },
  { value: 'chips-multi', label: 'Pick several — small chips', helper: 'Multi-select, e.g. concerns or claims' },
  { value: 'cards', label: 'Pick one — large cards', helper: 'Best when each option needs a description' },
  { value: 'image-cards', label: 'Pick one — cards with image', helper: 'For visual choices like hair type' },
  { value: 'yes-no', label: 'Yes / No toggle', helper: 'Simple binary choice' },
  { value: 'text', label: 'Short text field', helper: 'Free-text single line' },
  { value: 'textarea', label: 'Long text field', helper: 'Multi-line free text' },
  { value: 'hero-ingredient', label: 'Hero Ingredient (special)', helper: 'Special widget for the "Hero ingredient" sub-flow' },
];

const EMPTY: BriefQuestion = {
  questionKey: '',
  order: 0,
  widget: 'chips-single',
  titleEn: '',
  options: [],
  required: true,
  active: true,
  allowNote: true,
};

/** camelCase the title to make a stable internal key */
function autoKey(title: string, existingKeys: string[]): string {
  const camel = (title || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(Boolean)
    .map((w, i) => (i === 0 ? w : w[0].toUpperCase() + w.slice(1)))
    .join('');
  if (!camel) return 'question';
  if (!existingKeys.includes(camel)) return camel;
  let i = 2;
  while (existingKeys.includes(`${camel}${i}`)) i++;
  return `${camel}${i}`;
}

/** kebab-case the option label for a stable value */
function autoOptionValue(label: string, existingValues: string[]): string {
  const slug = (label || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  if (!slug) return `opt-${existingValues.length + 1}`;
  if (!existingValues.includes(slug)) return slug;
  let i = 2;
  while (existingValues.includes(`${slug}-${i}`)) i++;
  return `${slug}-${i}`;
}

export default function BriefQuestionsAdminPage() {
  const [questions, setQuestions] = useState<BriefQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<BriefQuestion | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const res = await fetch('/api/sample-quiz/brief-questions?includeInactive=true', { cache: 'no-store' });
    const data = await res.json();
    setQuestions(Array.isArray(data) ? data : []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const sorted = useMemo(() => [...questions].sort((a, b) => a.order - b.order), [questions]);

  // Drag-and-drop reorder: optimistically apply locally, then persist in one call.
  async function handleReorder(next: BriefQuestion[]) {
    setQuestions(next.map((q, i) => ({ ...q, order: i })));
    const ids = next.map((q) => q._id).filter(Boolean) as string[];
    if (ids.length === 0) return;
    try {
      const res = await fetch('/api/sample-quiz/brief-questions/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });
      if (!res.ok) throw new Error('Reorder failed');
    } catch {
      // Reload to fall back to authoritative server state.
      await load();
    }
  }

  async function saveQuestion(q: BriefQuestion) {
    setSaving(true);
    setError(null);

    // Auto-fill keys & values for new questions / new options
    const otherKeys = questions.filter((x) => x._id !== q._id).map((x) => x.questionKey);
    const finalKey = q.questionKey || autoKey(q.titleEn, otherKeys);

    const filledOptions = q.options.map((opt, idx) => {
      if (opt.value) return opt;
      const existing = q.options.slice(0, idx).map((o) => o.value).filter(Boolean);
      return { ...opt, value: autoOptionValue(opt.labelEn, existing) };
    });

    const finalQ = { ...q, questionKey: finalKey, options: filledOptions };

    try {
      const url = q._id
        ? `/api/sample-quiz/brief-questions/${q._id}`
        : '/api/sample-quiz/brief-questions';
      const res = await fetch(url, {
        method: q._id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(finalQ),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Save failed');
      }
      setEditing(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function deleteQuestion(id: string) {
    if (!confirm('Delete this question? This cannot be undone.')) return;
    await fetch(`/api/sample-quiz/brief-questions/${id}`, { method: 'DELETE' });
    await load();
  }

  async function toggleActive(q: BriefQuestion) {
    await fetch(`/api/sample-quiz/brief-questions/${q._id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...q, active: !q.active }),
    });
    await load();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-dark-50 mb-1">Brief Questions</h1>
          <p className="text-sm text-dark-400">
            Drag a row by its handle to reorder. Click a row to edit. Toggle the eye to hide a question.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setEditing({ ...EMPTY, order: questions.length })}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-kcc-rose hover:bg-kcc-rose-dark text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Plus size={16} />
          Add a question
        </button>
      </div>

      {loading ? (
        <div className="flex items-center gap-3 text-dark-400 p-8">
          <Loader2 size={16} className="animate-spin" />
          Loading questions…
        </div>
      ) : sorted.length === 0 ? (
        <div className="p-8 text-center text-dark-400 border border-dashed border-dark-700 rounded-xl">
          No questions yet. Click <em>Add a question</em> to start.
        </div>
      ) : (
        <SortableList
          items={sorted}
          onReorder={handleReorder}
          getKey={(q) => q._id || q.questionKey}
          className="space-y-2"
          renderItem={(q, idx, dragHandle) => {
            const widgetLabel = WIDGET_CHOICES.find((w) => w.value === q.widget)?.label || q.widget;
            return (
              <div
                className={`flex items-stretch gap-3 rounded-xl border overflow-hidden transition-colors ${
                  q.active ? 'border-dark-700 bg-dark-900' : 'border-dark-800 bg-dark-900/40 opacity-70'
                }`}
              >
                {/* Drag handle + position */}
                <div className="flex flex-col items-center justify-center px-2 py-3 bg-dark-950 border-e border-dark-800 min-w-[56px]">
                  {dragHandle}
                  <span className="text-xs font-mono font-bold text-dark-300 mt-1">
                    #{idx + 1}
                  </span>
                </div>

                {/* Body */}
                <button
                  type="button"
                  onClick={() => setEditing(q)}
                  className="flex-1 text-start py-3 px-1 hover:bg-dark-800/40 transition-colors min-w-0"
                >
                  <p className="font-medium text-dark-50 truncate mb-1">{q.titleEn || '— untitled —'}</p>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-kcc-rose/15 text-kcc-rose">
                      {widgetLabel}
                    </span>
                    {q.required && (
                      <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-kcc-beige/15 text-kcc-beige">
                        Required
                      </span>
                    )}
                    {q.maxSelect && (
                      <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-dark-800 text-dark-300">
                        Max {q.maxSelect}
                      </span>
                    )}
                    <span className="text-[10px] text-dark-500">
                      {q.options.length} option{q.options.length === 1 ? '' : 's'}
                    </span>
                  </div>
                </button>

                {/* Actions */}
                <div className="flex items-center gap-1 px-2 border-s border-dark-800">
                  <button
                    type="button"
                    onClick={() => toggleActive(q)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-2 text-xs text-dark-400 hover:text-dark-50 hover:bg-dark-800 rounded-lg transition-colors"
                    title={q.active ? 'Hide from quiz' : 'Show on quiz'}
                  >
                    {q.active ? <Eye size={14} /> : <EyeOff size={14} />}
                    <span className="hidden sm:inline">{q.active ? 'Visible' : 'Hidden'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditing(q)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-2 text-xs text-dark-300 hover:text-kcc-rose hover:bg-dark-800 rounded-lg transition-colors"
                  >
                    <Pencil size={14} />
                    <span className="hidden sm:inline">Edit</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteQuestion(q._id!)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-2 text-xs text-dark-400 hover:text-red-400 hover:bg-dark-800 rounded-lg transition-colors"
                  >
                    <Trash2 size={14} />
                    <span className="hidden sm:inline">Delete</span>
                  </button>
                </div>
              </div>
            );
          }}
        />
      )}

      <AnimatePresence>
        {editing && (
          <QuestionEditor
            initial={editing}
            onClose={() => setEditing(null)}
            onSave={saveQuestion}
            saving={saving}
            error={error}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// Editor modal — simplified, no jargon
// ──────────────────────────────────────────────────────────
// Editable option carries a client-only stable id used by DnD; stripped before save.
type EditableOption = BriefOption & { __rid: string };

function rid() {
  return Math.random().toString(36).slice(2, 10);
}

function QuestionEditor({
  initial, onClose, onSave, saving, error,
}: {
  initial: BriefQuestion;
  onClose: () => void;
  onSave: (q: BriefQuestion) => void;
  saving: boolean;
  error: string | null;
}) {
  const [q, setQ] = useState<Omit<BriefQuestion, 'options'> & { options: EditableOption[] }>(() => ({
    ...initial,
    options: initial.options.map((o) => ({ ...o, __rid: rid() })),
  }));

  function update<K extends keyof typeof q>(key: K, value: (typeof q)[K]) {
    setQ((prev) => ({ ...prev, [key]: value }));
  }

  function addOption() {
    update('options', [...q.options, { value: '', labelEn: '', __rid: rid() }]);
  }
  function updateOption(idx: number, patch: Partial<BriefOption>) {
    const next = [...q.options];
    next[idx] = { ...next[idx], ...patch };
    update('options', next);
  }
  function removeOption(idx: number) {
    update('options', q.options.filter((_, i) => i !== idx));
  }

  const widgetMeta = WIDGET_CHOICES.find((w) => w.value === q.widget);
  const showOptions = !['text', 'textarea'].includes(q.widget);
  const showMaxSelect = q.widget === 'chips-multi';

  function handleSave() {
    if (!q.titleEn.trim()) return;
    // Strip the client-only __rid before persisting.
    const cleanOptions: BriefOption[] = q.options.map((opt) => {
      const { __rid, ...rest } = opt;
      void __rid;
      return rest;
    });
    onSave({ ...q, options: cleanOptions });
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.96, y: 8 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.96, y: 8 }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-dark-900 border border-dark-700 rounded-2xl"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-dark-900/95 border-b border-dark-800 backdrop-blur">
          <h2 className="text-lg font-semibold text-dark-50">
            {initial._id ? 'Edit question' : 'New question'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close editor"
            title="Close"
            className="p-2 text-dark-400 hover:text-dark-50"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* The question itself */}
          <Field label="Question (English)" required>
            <input
              type="text"
              autoFocus
              value={q.titleEn}
              onChange={(e) => update('titleEn', e.target.value)}
              placeholder="What's your hair type?"
              className="w-full px-3 py-2.5 bg-dark-950 border border-dark-700 rounded-lg text-sm text-dark-50 focus:outline-none focus:border-kcc-rose"
            />
          </Field>

          <Field label="Question (Arabic — optional)">
            <input
              type="text"
              value={q.titleAr || ''}
              onChange={(e) => update('titleAr', e.target.value)}
              placeholder="ما هو نوع شعرك؟"
              dir="rtl"
              className="w-full px-3 py-2.5 bg-dark-950 border border-dark-700 rounded-lg text-sm text-dark-50 focus:outline-none focus:border-kcc-rose"
            />
          </Field>

          <Field label="Helper text under the question (English)" hint="Optional — explain what the customer should think about.">
            <textarea
              rows={2}
              value={q.subtitleEn || ''}
              onChange={(e) => update('subtitleEn', e.target.value)}
              placeholder="Tell us what fits your daily routine."
              aria-label="Helper text in English"
              className="w-full px-3 py-2.5 bg-dark-950 border border-dark-700 rounded-lg text-sm text-dark-50 focus:outline-none focus:border-kcc-rose resize-none"
            />
          </Field>

          <Field label="Helper text (Arabic)" hint="Optional.">
            <textarea
              rows={2}
              value={q.subtitleAr || ''}
              onChange={(e) => update('subtitleAr', e.target.value)}
              dir="rtl"
              placeholder="نص اختياري للمساعدة"
              aria-label="Helper text in Arabic"
              className="w-full px-3 py-2.5 bg-dark-950 border border-dark-700 rounded-lg text-sm text-dark-50 focus:outline-none focus:border-kcc-rose resize-none"
            />
          </Field>

          {/* Widget picker */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-dark-300 mb-2">
              How should the customer answer? <span className="text-kcc-rose">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {WIDGET_CHOICES.map((c) => {
                const active = q.widget === c.value;
                return (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => update('widget', c.value)}
                    className={`text-start p-3 rounded-lg border transition-all ${
                      active
                        ? 'bg-kcc-rose/15 border-kcc-rose/50 text-dark-50'
                        : 'bg-dark-950 border-dark-700 text-dark-300 hover:border-dark-500'
                    }`}
                  >
                    <p className="text-sm font-medium leading-tight mb-0.5">{c.label}</p>
                    <p className="text-[11px] text-dark-500">{c.helper}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Toggles */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-xl bg-dark-950 border border-dark-800">
            <ToggleField
              label="Required"
              hint="Customer must answer to continue"
              value={q.required}
              onChange={(v) => update('required', v)}
            />
            <ToggleField
              label="Show on quiz"
              hint="Off = hidden but not deleted"
              value={q.active}
              onChange={(v) => update('active', v)}
            />
            <ToggleField
              label="Allow note"
              hint="Customer can add a free-text note"
              value={q.allowNote}
              onChange={(v) => update('allowNote', v)}
            />
          </div>

          {showMaxSelect && (
            <Field label="Maximum number of choices" hint="The customer can pick at most this many.">
              <input
                type="number"
                min={1}
                value={q.maxSelect || ''}
                onChange={(e) => update('maxSelect', e.target.value ? parseInt(e.target.value) : undefined)}
                placeholder="e.g. 3"
                className="w-32 px-3 py-2 bg-dark-950 border border-dark-700 rounded-lg text-sm text-dark-50 focus:outline-none focus:border-kcc-rose"
              />
            </Field>
          )}

          {/* Options */}
          {showOptions && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-sm font-semibold text-dark-50">Choices</h3>
                  <p className="text-xs text-dark-500">
                    {widgetMeta?.value === 'image-cards'
                      ? 'Each choice can include an image URL.'
                      : widgetMeta?.value === 'cards'
                      ? 'Each choice has a title plus a short description.'
                      : 'Add the options the customer will see.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={addOption}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs bg-kcc-rose hover:bg-kcc-rose-dark text-white rounded-lg"
                >
                  <Plus size={12} /> Add choice
                </button>
              </div>
              {q.options.length === 0 ? (
                <div className="p-4 text-center text-xs text-dark-500 border border-dashed border-dark-700 rounded-lg">
                  No choices yet. Click <em>Add choice</em> above.
                </div>
              ) : (
                <SortableList
                  items={q.options}
                  onReorder={(next) => update('options', next)}
                  getKey={(opt) => opt.__rid}
                  className="space-y-2"
                  renderItem={(opt, idx, dragHandle) => (
                    <div className="rounded-xl bg-dark-950 border border-dark-800 p-3">
                      <div className="flex items-start gap-2">
                        <div className="flex flex-col items-center pt-1">
                          {dragHandle}
                        </div>
                        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <input
                            type="text"
                            value={opt.labelEn}
                            onChange={(e) => updateOption(idx, { labelEn: e.target.value })}
                            placeholder="Choice (English) *"
                            className="px-3 py-2 bg-dark-900 border border-dark-700 rounded-lg text-sm text-dark-50 focus:outline-none focus:border-kcc-rose"
                          />
                          <input
                            type="text"
                            value={opt.labelAr || ''}
                            onChange={(e) => updateOption(idx, { labelAr: e.target.value })}
                            placeholder="الخيار بالعربي"
                            dir="rtl"
                            className="px-3 py-2 bg-dark-900 border border-dark-700 rounded-lg text-sm text-dark-50 focus:outline-none focus:border-kcc-rose"
                          />
                          {q.widget === 'cards' && (
                            <input
                              type="text"
                              value={opt.description || ''}
                              onChange={(e) => updateOption(idx, { description: e.target.value })}
                              placeholder="Short description shown under the title"
                              className="sm:col-span-2 px-3 py-2 bg-dark-900 border border-dark-700 rounded-lg text-sm text-dark-50 focus:outline-none focus:border-kcc-rose"
                            />
                          )}
                          {q.widget === 'image-cards' && (
                            <input
                              type="text"
                              value={opt.imageUrl || ''}
                              onChange={(e) => updateOption(idx, { imageUrl: e.target.value })}
                              placeholder="Image URL (https://…)"
                              className="sm:col-span-2 px-3 py-2 bg-dark-900 border border-dark-700 rounded-lg text-sm text-dark-50 focus:outline-none focus:border-kcc-rose"
                            />
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => removeOption(idx)}
                          className="p-2 text-dark-500 hover:text-red-400"
                          title="Remove choice"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  )}
                />
              )}
            </div>
          )}

          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
              {error}
            </div>
          )}
        </div>

        <div className="sticky bottom-0 z-10 flex items-center justify-end gap-3 px-6 py-4 bg-dark-900/95 border-t border-dark-800 backdrop-blur">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-dark-400 hover:text-dark-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !q.titleEn.trim()}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-kcc-rose hover:bg-kcc-rose-dark text-white rounded-lg text-sm font-medium disabled:opacity-50"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            Save question
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function Field({ label, hint, required, children }: { label: string; hint?: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold uppercase tracking-wider text-dark-300 mb-1.5">
        {label} {required && <span className="text-kcc-rose">*</span>}
      </span>
      {hint && <span className="block text-[11px] text-dark-500 mb-1.5">{hint}</span>}
      {children}
    </label>
  );
}

function ToggleField({ label, hint, value, onChange }: { label: string; hint?: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!value)} className="flex items-start gap-2.5 text-start group">
      <span
        className={`relative inline-flex h-5 w-9 mt-0.5 items-center rounded-full transition-colors flex-shrink-0 ${
          value ? 'bg-kcc-rose' : 'bg-dark-700'
        }`}
      >
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${value ? 'translate-x-4' : 'translate-x-0.5'}`} />
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-medium text-dark-200 leading-tight">{label}</span>
        {hint && <span className="block text-[11px] text-dark-500 mt-0.5 leading-tight">{hint}</span>}
      </span>
    </button>
  );
}
