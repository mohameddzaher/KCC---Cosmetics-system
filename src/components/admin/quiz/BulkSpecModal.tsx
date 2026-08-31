'use client';

/**
 * Configure the spec questions for a whole main category or a whole
 * sub-family in one pass.
 *
 * Saving writes the configuration onto every product underneath the scope, so
 * the newest save is always the one in force — no hidden inherited layer. The
 * modal says up front how many products it will overwrite, and warns when the
 * products currently differ from each other.
 */

import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Layers, Save } from 'lucide-react';
import { Button, ErrorNote, Modal, Spinner } from '@/components/admin/ui';
import { useLanguage } from '@/contexts/LanguageContext';
import SpecConfigEditor, {
  type ProductSpec, type SpecMaster,
} from './SpecConfigEditor';

export default function BulkSpecModal({
  open,
  scope,
  scopeKey,
  scopeLabel,
  onClose,
  onSaved,
}: {
  open: boolean;
  scope: 'main' | 'sub';
  scopeKey: string;
  scopeLabel: string;
  onClose: () => void;
  onSaved: (updated: number) => void;
}) {
  const { t, tx } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [specs, setSpecs] = useState<ProductSpec[]>([]);
  const [masters, setMasters] = useState<SpecMaster[]>([]);
  const [productCount, setProductCount] = useState(0);
  const [uniform, setUniform] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({ scope, scopeKey });
      const res = await fetch(`/api/sample-quiz/product-config/bulk?${qs}`, { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t('admin.saveFailed'));
      setSpecs(Array.isArray(data.specs) ? data.specs : []);
      setMasters(Array.isArray(data.masters) ? data.masters : []);
      setProductCount(data.productCount ?? 0);
      setUniform(!!data.uniform);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('admin.saveFailed'));
    } finally {
      setLoading(false);
    }
  }, [scope, scopeKey, t]);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  function patchSpec(specKey: string, patch: Partial<ProductSpec>) {
    setSpecs((prev) => prev.map((s) => (s.specKey === specKey ? { ...s, ...patch } : s)));
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/sample-quiz/product-config/bulk', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope, scopeKey, specs }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t('admin.saveFailed'));
      onSaved(data.matched ?? 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('admin.saveFailed'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="full"
      title={`${t('admin.bulkConfigure')} — ${scopeLabel}`}
      subtitle={t('admin.bulkConfigureCount', { count: productCount })}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t('ui.cancel')}
          </Button>
          <Button onClick={save} loading={saving} icon={Save} disabled={loading || specs.length === 0}>
            {t('admin.bulkApply', { count: productCount })}
          </Button>
        </>
      }
    >
      {error && (
        <div className="mb-4">
          <ErrorNote>{error}</ErrorNote>
        </div>
      )}

      <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-warn bg-warn-soft px-4 py-3 text-sm text-warn-soft-fg">
        <AlertTriangle size={16} className="mt-0.5 shrink-0" />
        <div className="min-w-0">
          <p className="font-medium">{t('admin.bulkOverwriteTitle', { count: productCount })}</p>
          <p className="mt-0.5 text-xs leading-relaxed">
            {uniform ? t('admin.bulkOverwriteUniform') : t('admin.bulkOverwriteMixed')}
          </p>
        </div>
      </div>

      {loading ? (
        <Spinner />
      ) : specs.length === 0 ? (
        <p className="py-8 text-center text-sm text-fg-muted">{tx('No matches')}</p>
      ) : (
        <>
          <p className="mb-3 flex items-center gap-1.5 text-xs text-fg-muted">
            <Layers size={13} />
            {t('admin.bulkScopeHint')}
          </p>
          <SpecConfigEditor
            specs={specs}
            masters={masters}
            onChange={patchSpec}
            onReorder={(next) => setSpecs(next.map((s, i) => ({ ...s, sortOrder: i })))}
          />
        </>
      )}
    </Modal>
  );
}
