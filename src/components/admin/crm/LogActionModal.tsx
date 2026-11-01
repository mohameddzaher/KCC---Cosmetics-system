'use client';

import { useCallback, useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { Button, ErrorNote, Field, Modal, Select, TextArea, TextInput } from '@/components/admin/ui';
import { useLanguage } from '@/contexts/LanguageContext';

/**
 * Recording what happened with an account — the one action that moves the CRM.
 *
 * Deliberately the same dialog wherever it is opened from: the upcoming list,
 * the current list, or the account's own page. The server decides what the
 * action means, so an account visited from the upcoming list leaves that list
 * without this screen having to know the rule.
 */

/** Grouped so the six process steps read as a process, not as a flat list. */
const GROUPS: Array<{ labelEn: string; labelAr: string; types: Array<[string, string, string]> }> = [
  {
    labelEn: 'Contact',
    labelAr: 'تواصل',
    types: [
      ['visit', 'Visit', 'زيارة'],
      ['meeting', 'Meeting', 'اجتماع'],
      ['call', 'Phone call', 'مكالمة'],
      ['whatsapp', 'WhatsApp', 'واتساب'],
      ['email', 'Email', 'بريد إلكتروني'],
    ],
  },
  {
    labelEn: 'Sales process',
    labelAr: 'خطوات البيع',
    types: [
      ['intro', 'KCC introduced', 'تم التعريف بـKCC'],
      ['account_info', 'Account information gathered', 'جمع بيانات الحساب'],
      ['key_person', 'Key person identified', 'تحديد الشخص المسؤول'],
      ['feedback', 'Feedback recorded', 'تسجيل رد الحساب'],
      ['commercial', 'Commercial discussion', 'مناقشة تجارية'],
    ],
  },
  {
    labelEn: 'Requests',
    labelAr: 'طلبات',
    types: [
      ['sample_request', 'Asked for a sample', 'طلب عيّنة'],
      ['pricing_request', 'Asked for pricing', 'طلب أسعار'],
    ],
  },
  {
    labelEn: 'What they told us',
    labelAr: 'ما قالوه لنا',
    types: [
      ['complaint', 'Complaint', 'شكوى'],
      ['suggestion', 'Suggestion', 'اقتراح'],
    ],
  },
  {
    labelEn: 'Other',
    labelAr: 'أخرى',
    types: [
      ['note', 'Note', 'ملاحظة'],
      ['task', 'Follow-up task', 'مهمة متابعة'],
    ],
  },
];

const INTEREST: Array<[string, string, string]> = [
  ['interested', 'Interested', 'مهتم'],
  ['moderate', 'Moderately interested', 'اهتمام متوسط'],
  ['not_interested', 'Not interested', 'غير مهتم'],
];

export interface LogTarget {
  _id: string;
  name: string;
  nameAr?: string;
  stage?: string;
}

export default function LogActionModal({
  account,
  onClose,
  onLogged,
}: {
  account: LogTarget | null;
  onClose: () => void;
  /** Called with the stage the account moved to, when it moved. */
  onLogged: (movedTo: string | null) => void;
}) {
  const { tx, pick, locale } = useLanguage();
  const ar = locale === 'ar';

  const [type, setType] = useState('visit');
  const [body, setBody] = useState('');
  const [interest, setInterest] = useState('');
  const [at, setAt] = useState(() => new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * The call structure the commercial manager set. Fetched rather than
   * hardcoded: he changes it from the CRM settings screen and the reps see the
   * new version on their next visit, with no deploy in between.
   */
  const [checklist, setChecklist] = useState<
    Array<{ key: string; labelEn: string; labelAr: string; required?: boolean }>
  >([]);
  const [ticked, setTicked] = useState<string[]>([]);

  const loadChecklist = useCallback(async () => {
    try {
      const r = await fetch('/api/crm/targets', { cache: 'no-store' });
      if (!r.ok) return;
      const d = await r.json();
      setChecklist(Array.isArray(d.visitChecklist) ? d.visitChecklist : []);
    } catch {
      setChecklist([]);
    }
  }, []);

  useEffect(() => {
    if (account) {
      loadChecklist();
      setTicked([]);
    }
  }, [account, loadChecklist]);

  async function submit() {
    if (!account) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/crm/accounts/${account._id}/activities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          body: body.trim() || undefined,
          interest: type === 'feedback' && interest ? interest : undefined,
          // A date only, so a visit entered the next morning still lands on the
          // day it happened.
          at: at ? new Date(`${at}T12:00:00`).toISOString() : undefined,
          dueDate: type === 'task' && dueDate ? dueDate : undefined,
          checklist: showChecklist && ticked.length > 0 ? ticked : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not log this');
      setBody('');
      setInterest('');
      onLogged(data.movedTo || null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setBusy(false);
    }
  }

  const willMove = account?.stage === 'upcoming' || account?.stage === 'hold';
  const isEngagement = !['note', 'task'].includes(type);
  /** The call structure applies to a call, not to a note or a phone follow-up. */
  const showChecklist = (type === 'visit' || type === 'meeting') && checklist.length > 0;
  const missingRequired = showChecklist
    ? checklist.filter((c) => c.required && !ticked.includes(c.key))
    : [];

  return (
    <Modal
      open={!!account}
      onClose={onClose}
      title={tx('Log an action')}
      subtitle={account ? pick(account.name, account.nameAr) : undefined}
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {tx('Cancel')}
          </Button>
          <Button onClick={submit} loading={busy} icon={Check}>
            {tx('Save')}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {error && <ErrorNote>{error}</ErrorNote>}

        <Field label={tx('What happened')} required>
          <Select value={type} onChange={(e) => setType(e.target.value)}>
            {GROUPS.map((g) => (
              <optgroup key={g.labelEn} label={ar ? g.labelAr : g.labelEn}>
                {g.types.map(([key, en, arLabel]) => (
                  <option key={key} value={key}>
                    {ar ? arLabel : en}
                  </option>
                ))}
              </optgroup>
            ))}
          </Select>
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={tx('When')} hint={tx('Yesterday is fine; a future date is not.')}>
            <TextInput
              type="date"
              value={at}
              max={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setAt(e.target.value)}
            />
          </Field>
          {type === 'task' && (
            <Field label={tx('Due')}>
              <TextInput type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </Field>
          )}
          {type === 'feedback' && (
            <Field label={tx('How interested are they')}>
              <Select value={interest} onChange={(e) => setInterest(e.target.value)}>
                <option value="">—</option>
                {INTEREST.map(([key, en, arLabel]) => (
                  <option key={key} value={key}>
                    {ar ? arLabel : en}
                  </option>
                ))}
              </Select>
            </Field>
          )}
        </div>

        {showChecklist && (
          <Field
            label={tx('What you covered on this visit')}
            hint={tx('Set by the commercial manager. Tick what you actually did.')}
          >
            <ul className="space-y-1.5 rounded-xl border border-line bg-surface-2 p-3">
              {checklist.map((c) => {
                const on = ticked.includes(c.key);
                return (
                  <li key={c.key}>
                    <label className="flex cursor-pointer items-center gap-2.5 text-sm">
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={() =>
                          setTicked((prev) =>
                            on ? prev.filter((k) => k !== c.key) : [...prev, c.key]
                          )
                        }
                        className="accent-accent"
                      />
                      <span className={on ? 'text-fg' : 'text-fg-muted'}>
                        {pick(c.labelEn, c.labelAr)}
                      </span>
                      {c.required && <span className="text-xs text-danger">*</span>}
                    </label>
                  </li>
                );
              })}
            </ul>
            {missingRequired.length > 0 && (
              <p className="mt-2 text-xs text-warn">
                {tx('Not everything expected on a visit is ticked — saved anyway, and it will show as a gap.')}
              </p>
            )}
          </Field>
        )}

        <Field label={tx('What was said')}>
          <TextArea
            rows={4}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={tx('Who you saw, what they asked for, what happens next.')}
          />
        </Field>

        {willMove && isEngagement && (
          <p className="rounded-xl bg-brand-soft px-3.5 py-2.5 text-xs leading-relaxed text-brand-soft-fg">
            {tx('Saving this moves the account out of the upcoming list and into the ones being worked.')}
          </p>
        )}
      </div>
    </Modal>
  );
}
