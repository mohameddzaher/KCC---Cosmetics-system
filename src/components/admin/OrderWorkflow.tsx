'use client';

import { useCallback, useEffect, useState } from 'react';
import { ArrowRight, Clock, User as UserIcon } from 'lucide-react';
import { Button, Card, ErrorNote, Modal, SectionTitle, TextArea } from '@/components/admin/ui';
import { useLanguage } from '@/contexts/LanguageContext';
import { statusBadgeClass, statusLabel, type Transition } from '@/lib/orderWorkflow';
import { roleLabel } from '@/lib/roles';

export interface TimelineEvent {
  from?: string;
  to: string;
  byName?: string;
  byRole?: string;
  note?: string;
  at: string;
}

/**
 * The hand-off control for one order.
 *
 * It asks the server which moves the signed-in user may make, so the buttons a
 * factory operator sees ("Start production", "Send to QC") are never the ones
 * an account manager sees. The server re-checks the same rule on submit.
 */
export default function OrderWorkflow({
  orderId,
  status,
  timeline = [],
  onChanged,
  compact = false,
}: {
  orderId: string;
  status: string;
  timeline?: TimelineEvent[];
  onChanged?: (status: string, timeline: TimelineEvent[]) => void;
  compact?: boolean;
}) {
  const { t, locale } = useLanguage();
  const [transitions, setTransitions] = useState<Transition[]>([]);
  const [pending, setPending] = useState<Transition | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/orders/${orderId}/transition`, { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      setTransitions(Array.isArray(data.transitions) ? data.transitions : []);
    } catch {
      setTransitions([]);
    }
  }, [orderId]);

  useEffect(() => {
    load();
  }, [load, status]);

  async function apply(tr: Transition, withNote: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/orders/${orderId}/transition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: tr.to, note: withNote }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t('admin.saveFailed'));
      setPending(null);
      setNote('');
      onChanged?.(data.status, data.timeline || []);
      setTransitions(Array.isArray(data.transitions) ? data.transitions : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('admin.saveFailed'));
    } finally {
      setBusy(false);
    }
  }

  function start(tr: Transition) {
    if (tr.requiresNote) {
      setPending(tr);
      setNote('');
      return;
    }
    apply(tr, '');
  }

  const actionLabel = (tr: Transition) => (locale === 'ar' ? tr.actionAr : tr.actionEn);

  const buttons = (
    <div className="flex flex-wrap gap-2">
      {transitions.length === 0 ? (
        <p className="text-xs text-fg-muted">{t('admin.noTransitions')}</p>
      ) : (
        transitions.map((tr) => (
          <Button
            key={tr.to}
            size="sm"
            variant={tr.tone === 'danger' ? 'danger' : tr.tone === 'ok' ? 'primary' : 'outline'}
            onClick={() => start(tr)}
            loading={busy}
            icon={ArrowRight}
          >
            {actionLabel(tr)}
          </Button>
        ))
      )}
    </div>
  );

  if (compact) {
    return (
      <>
        {buttons}
        {error && (
          <div className="mt-2">
            <ErrorNote>{error}</ErrorNote>
          </div>
        )}
        <NoteModal
          pending={pending}
          note={note}
          setNote={setNote}
          busy={busy}
          onClose={() => setPending(null)}
          onConfirm={() => pending && apply(pending, note)}
          label={pending ? actionLabel(pending) : ''}
        />
      </>
    );
  }

  return (
    <Card>
      <SectionTitle title={t('admin.advanceOrder')} />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className={`badge ${statusBadgeClass(status)}`}>{statusLabel(status, locale)}</span>
      </div>

      {buttons}
      {error && (
        <div className="mt-3">
          <ErrorNote>{error}</ErrorNote>
        </div>
      )}

      <div className="mt-6">
        <SectionTitle title={t('admin.timeline')} />
        {timeline.length === 0 ? (
          <p className="text-xs text-fg-muted">{t('admin.timelineEmpty')}</p>
        ) : (
          <ol className="relative space-y-3 border-s border-line ps-4">
            {[...timeline].reverse().map((ev, i) => (
              <li key={`${ev.to}-${ev.at}-${i}`} className="relative">
                <span className="absolute -start-[1.32rem] top-1.5 h-2 w-2 rounded-full bg-brand" />
                <p className="flex flex-wrap items-center gap-1.5 text-sm text-fg">
                  {ev.from && (
                    <>
                      <span className="text-fg-muted">{statusLabel(ev.from, locale)}</span>
                      <ArrowRight size={11} className="rtl-flip text-fg-subtle" />
                    </>
                  )}
                  <span className={`badge ${statusBadgeClass(ev.to)}`}>{statusLabel(ev.to, locale)}</span>
                </p>
                <p className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-fg-muted">
                  <span className="inline-flex items-center gap-1">
                    <UserIcon size={10} />
                    {ev.byName || '—'}
                    {ev.byRole && ` · ${roleLabel(ev.byRole, locale)}`}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Clock size={10} />
                    {new Date(ev.at).toLocaleString(locale === 'ar' ? 'ar-EG' : 'en-GB')}
                  </span>
                </p>
                {ev.note && (
                  <p className="mt-1 rounded-lg bg-surface-2 px-2.5 py-1.5 text-xs text-fg-muted">{ev.note}</p>
                )}
              </li>
            ))}
          </ol>
        )}
      </div>

      <NoteModal
        pending={pending}
        note={note}
        setNote={setNote}
        busy={busy}
        onClose={() => setPending(null)}
        onConfirm={() => pending && apply(pending, note)}
        label={pending ? actionLabel(pending) : ''}
      />
    </Card>
  );
}

function NoteModal({
  pending, note, setNote, busy, onClose, onConfirm, label,
}: {
  pending: Transition | null;
  note: string;
  setNote: (v: string) => void;
  busy: boolean;
  onClose: () => void;
  onConfirm: () => void;
  label: string;
}) {
  const { t } = useLanguage();
  return (
    <Modal
      open={!!pending}
      onClose={onClose}
      size="sm"
      title={label}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t('ui.cancel')}
          </Button>
          <Button onClick={onConfirm} loading={busy} disabled={!note.trim()}>
            {t('ui.confirm')}
          </Button>
        </>
      }
    >
      <label className="field-label">{t('admin.transitionNote')}</label>
      <TextArea rows={4} value={note} onChange={(e) => setNote(e.target.value)} autoFocus />
      {!note.trim() && <p className="mt-2 text-xs text-danger">{t('admin.transitionNoteRequired')}</p>}
    </Modal>
  );
}
