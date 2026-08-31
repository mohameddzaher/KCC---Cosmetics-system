'use client';

/**
 * Manages the question set of ONE scope — the shared brief, a main category,
 * a sub-category, or a single product. Same component everywhere, so a
 * category question set behaves exactly like the general brief: add, edit,
 * delete, hide, drag to reorder, branch on an earlier answer.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Eye, EyeOff, GripVertical, ListChecks, Pencil, Plus, Trash2 } from 'lucide-react';
import { SortableList } from '@/components/admin/SortableList';
import { Badge, Button, EmptyState, ErrorNote, SectionTitle, Spinner } from '@/components/admin/ui';
import { useLanguage } from '@/contexts/LanguageContext';
import QuestionEditor from './QuestionEditor';
import { autoKey, emptyQuestion, type AdminBriefQuestion, type BriefScope } from './types';

const API = '/api/sample-quiz/brief-questions';

export default function QuestionManager({
  scope,
  scopeKey,
  title,
  hint,
  /** Questions from other scopes that a condition may reference (e.g. the general brief). */
  extraConditionSources = [],
}: {
  scope: BriefScope;
  scopeKey: string;
  title: string;
  hint?: string;
  extraConditionSources?: AdminBriefQuestion[];
}) {
  const { t, pick } = useLanguage();
  const [questions, setQuestions] = useState<AdminBriefQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<AdminBriefQuestion | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listError, setListError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setListError(null);
    try {
      const qs = new URLSearchParams({ includeInactive: 'true', scope, scopeKey });
      const res = await fetch(`${API}?${qs}`, { cache: 'no-store' });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to load');
      const data = await res.json();
      setQuestions(Array.isArray(data) ? data : []);
    } catch (e) {
      setListError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [scope, scopeKey]);

  useEffect(() => {
    load();
  }, [load]);

  const sorted = useMemo(() => [...questions].sort((a, b) => a.order - b.order), [questions]);

  async function handleReorder(next: AdminBriefQuestion[]) {
    setQuestions(next.map((q, i) => ({ ...q, order: i })));
    const ids = next.map((q) => q._id).filter(Boolean) as string[];
    if (ids.length === 0) return;
    try {
      const res = await fetch(`${API}/reorder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });
      if (!res.ok) throw new Error('reorder failed');
    } catch {
      await load(); // fall back to authoritative server order
    }
  }

  async function save(q: AdminBriefQuestion) {
    setSaving(true);
    setError(null);
    const otherKeys = questions.filter((x) => x._id !== q._id).map((x) => x.questionKey);
    const payload: AdminBriefQuestion = {
      ...q,
      scope,
      scopeKey,
      questionKey: q.questionKey || autoKey(q.titleEn, otherKeys),
    };
    try {
      const res = await fetch(q._id ? `${API}/${q._id}` : API, {
        method: q._id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error((await res.json()).error || t('admin.saveFailed'));
      setEditing(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : t('admin.saveFailed'));
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!confirm(t('admin.deleteConfirm'))) return;
    await fetch(`${API}/${id}`, { method: 'DELETE' });
    await load();
  }

  async function toggleActive(q: AdminBriefQuestion) {
    setQuestions((prev) => prev.map((x) => (x._id === q._id ? { ...x, active: !x.active } : x)));
    await fetch(`${API}/${q._id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...q, active: !q.active }),
    });
    await load();
  }

  const conditionSources = useMemo(
    () => [...extraConditionSources, ...sorted],
    [extraConditionSources, sorted]
  );

  return (
    <div>
      <SectionTitle
        title={title}
        hint={hint}
        actions={
          <Button
            size="sm"
            icon={Plus}
            onClick={() => setEditing(emptyQuestion(scope, scopeKey, questions.length))}
          >
            {t('admin.addQuestion')}
          </Button>
        }
      />

      {listError && (
        <div className="mb-3">
          <ErrorNote>{listError}</ErrorNote>
        </div>
      )}

      {loading ? (
        <Spinner />
      ) : sorted.length === 0 ? (
        <EmptyState
          icon={ListChecks}
          title={t('admin.noQuestions')}
          hint={hint}
          action={
            <Button
              size="sm"
              icon={Plus}
              onClick={() => setEditing(emptyQuestion(scope, scopeKey, 0))}
            >
              {t('admin.addQuestion')}
            </Button>
          }
        />
      ) : (
        <SortableList
          items={sorted}
          onReorder={handleReorder}
          getKey={(q) => q._id || q.questionKey}
          className="space-y-2"
          renderItem={(q, idx, handle) => (
            <div
              className={`flex items-stretch overflow-hidden rounded-xl border transition-colors ${
                q.active ? 'border-line bg-surface' : 'border-dashed border-line bg-surface-2 opacity-70'
              }`}
            >
              <div className="flex w-12 shrink-0 flex-col items-center justify-center gap-0.5 border-e border-line bg-bg-subtle py-3 text-fg-subtle">
                {handle}
                <span className="font-mono text-[10px] font-bold">{idx + 1}</span>
              </div>

              <button
                type="button"
                onClick={() => setEditing(q)}
                className="min-w-0 flex-1 px-3 py-3 text-start transition-colors hover:bg-surface-2"
              >
                <p className="truncate text-sm font-medium text-fg">
                  {pick(q.titleEn, q.titleAr) || '—'}
                </p>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  <Badge tone="accent">{t(`admin.widget.${q.widget}`)}</Badge>
                  {q.required && <Badge tone="warn">{t('admin.required')}</Badge>}
                  {q.maxSelect ? <Badge tone="info">{`≤ ${q.maxSelect}`}</Badge> : null}
                  {(q.conditions?.length ?? 0) > 0 && (
                    <Badge tone="brand">{t('admin.conditions')}</Badge>
                  )}
                  {q.options.length > 0 && (
                    <span className="text-[11px] text-fg-subtle">
                      {q.options.length} · {t('admin.choices')}
                    </span>
                  )}
                </div>
              </button>

              <div className="flex shrink-0 items-center gap-0.5 border-s border-line px-1.5">
                <IconAction
                  onClick={() => toggleActive(q)}
                  label={q.active ? t('admin.deactivate') : t('admin.activate')}
                  icon={q.active ? Eye : EyeOff}
                />
                <IconAction onClick={() => setEditing(q)} label={t('ui.edit')} icon={Pencil} />
                <IconAction
                  onClick={() => remove(q._id!)}
                  label={t('ui.delete')}
                  icon={Trash2}
                  danger
                />
              </div>
            </div>
          )}
        />
      )}

      {sorted.length > 0 && (
        <p className="mt-3 flex items-center gap-1.5 text-[11px] text-fg-subtle">
          <GripVertical size={12} /> {t('admin.reorderHint')}
        </p>
      )}

      {editing && (
        <QuestionEditor
          open
          initial={editing}
          siblings={conditionSources}
          onClose={() => {
            setEditing(null);
            setError(null);
          }}
          onSave={save}
          saving={saving}
          error={error}
        />
      )}
    </div>
  );
}

function IconAction({
  onClick,
  label,
  icon: Icon,
  danger,
}: {
  onClick: () => void;
  label: string;
  icon: React.ElementType;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={`flex h-8 w-8 items-center justify-center rounded-lg text-fg-muted transition-colors ${
        danger ? 'hover:bg-danger-soft hover:text-danger' : 'hover:bg-surface-2 hover:text-fg'
      }`}
    >
      <Icon size={15} />
    </button>
  );
}
