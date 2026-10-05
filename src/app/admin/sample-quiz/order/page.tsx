'use client';

/**
 * The order the quiz asks its spec questions in — one screen for all products.
 *
 * The order was always admin-owned, but only one product (or one category) at a
 * time, so "ask the fragrance before the packaging" meant opening 208 screens.
 * Saving here writes the sequence onto every product, which is how the quiz
 * reads it, so the change is live for the next customer.
 */

import { useCallback, useEffect, useState } from 'react';
import { Boxes, GripVertical } from 'lucide-react';
import { SortableList } from '@/components/admin/SortableList';
import {
  Badge,
  Card,
  ErrorNote,
  PageHeader,
  SaveButton,
  Spinner,
} from '@/components/admin/ui';
import { useLanguage } from '@/contexts/LanguageContext';

interface Step {
  specKey: string;
  titleEn: string;
  titleAr?: string;
  products: number;
  enabled: number;
  carriesParts: boolean;
}

export default function StepOrderPage() {
  const { t, tx, pick } = useLanguage();
  const [steps, setSteps] = useState<Step[]>([]);
  const [parts, setParts] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/sample-quiz/step-order', { cache: 'no-store' });
      if (!r.ok) throw new Error('Could not load the step order');
      const d = await r.json();
      setSteps(Array.isArray(d.steps) ? d.steps : []);
      setParts(Array.isArray(d.parts) ? d.parts : []);
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

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const r = await fetch('/api/sample-quiz/step-order', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order: steps.map((s) => s.specKey) }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.error || 'Save failed');
      }
      setDirty(false);
      setSavedAt(Date.now());
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  if (!ready) return <Spinner />;

  return (
    <div>
      <PageHeader
        title={t('admin.stepOrder')}
        subtitle={t('admin.stepOrderDesc')}
        backHref="/admin/sample-quiz"
        backLabel={t('admin.quizTitle')}
        actions={<SaveButton onClick={save} saving={saving} disabled={!dirty} />}
      />

      {error && (
        <div className="mb-4">
          <ErrorNote>{error}</ErrorNote>
        </div>
      )}

      <Card padded={false}>
        <div className="border-b border-line p-4 sm:p-5">
          <p className="text-sm text-fg-muted">{tx('Drag a step to change where it is asked.')}</p>
          <p className="mt-1 text-xs text-fg-subtle">
            {tx('Reaches the customer quiz immediately')}
            {savedAt && <span className="ms-2 text-brand">· {t('admin.saved')}</span>}
          </p>
        </div>

        <div className="p-3 sm:p-4">
          <SortableList
            items={steps}
            onReorder={(next) => {
              setSteps(next);
              setDirty(true);
            }}
            getKey={(s) => s.specKey}
            className="space-y-2"
            renderItem={(step, idx, handle) => (
              <div className="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-surface px-2 py-2.5 sm:gap-3 sm:px-3">
                <span className="shrink-0 text-fg-subtle">{handle}</span>
                <span className="w-6 shrink-0 text-center font-mono text-xs text-fg-subtle">
                  {idx + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-fg">
                    {pick(step.titleEn, step.titleAr)}
                  </p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-fg-subtle">
                    <span className="font-mono">{step.specKey}</span>
                    <span>
                      {step.enabled}/{step.products} {tx('products')}
                    </span>
                  </p>
                  {step.carriesParts && parts.length > 0 && (
                    <p className="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-2.5 py-1 text-[11px] text-fg-muted">
                      <Boxes size={12} className="shrink-0" />
                      {tx('The cap, label, finish and pack colour are tabs inside this step, so they move with it.')}
                    </p>
                  )}
                </div>
                {step.enabled === 0 && <Badge tone="neutral">{tx('Inactive')}</Badge>}
              </div>
            )}
          />

          <p className="mt-3 flex items-center gap-1.5 text-[11px] text-fg-subtle">
            <GripVertical size={12} />
            {t('admin.reorderHint')}
          </p>
        </div>
      </Card>
    </div>
  );
}
