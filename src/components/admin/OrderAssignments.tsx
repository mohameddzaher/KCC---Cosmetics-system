'use client';

import { useCallback, useEffect, useState } from 'react';
import { UserCog } from 'lucide-react';
import {
  Button, Card, ErrorNote, Field, SectionTitle, Select, TextInput,
} from '@/components/admin/ui';
import { useLanguage } from '@/contexts/LanguageContext';
import { ASSIGNABLE_ROLES, roleLabel, type Role } from '@/lib/roles';

interface StaffOption {
  _id: string;
  name: string;
  email: string;
  role: Role;
}

interface Assignments {
  accountManagerId?: string | { _id: string; name?: string };
  factoryUserId?: string | { _id: string; name?: string };
  logisticsUserId?: string | { _id: string; name?: string };
  courierName?: string;
  courierPhone?: string;
  trackingNumber?: string;
}

const idOf = (v: Assignments[keyof Assignments]): string =>
  typeof v === 'string' ? v : v && typeof v === 'object' && '_id' in v ? v._id : '';

/**
 * Who owns each leg of this order: the account manager, the production owner,
 * the dispatch owner, and the delivery rep actually carrying the box.
 */
export default function OrderAssignments({
  orderId,
  assignments,
  onSaved,
}: {
  orderId: string;
  assignments: Assignments;
  onSaved?: () => void;
}) {
  const { t, locale } = useLanguage();
  const [staff, setStaff] = useState<StaffOption[]>([]);
  const [form, setForm] = useState({
    accountManagerId: idOf(assignments.accountManagerId),
    factoryUserId: idOf(assignments.factoryUserId),
    logisticsUserId: idOf(assignments.logisticsUserId),
    courierName: assignments.courierName || '',
    courierPhone: assignments.courierPhone || '',
    trackingNumber: assignments.trackingNumber || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch('/api/users', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setStaff(Array.isArray(d) ? d : []))
      .catch(() => setStaff([]));
  }, []);

  const optionsFor = useCallback(
    (roles: Role[]) => staff.filter((s) => roles.includes(s.role)),
    [staff]
  );

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignments: form }),
      });
      if (!res.ok) throw new Error((await res.json()).error || t('admin.saveFailed'));
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      onSaved?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : t('admin.saveFailed'));
    } finally {
      setSaving(false);
    }
  }

  const picker = (
    label: string,
    key: 'accountManagerId' | 'factoryUserId' | 'logisticsUserId',
    roles: Role[]
  ) => (
    <Field label={label}>
      <Select value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })}>
        <option value="">{t('admin.unassigned')}</option>
        {optionsFor(roles).map((s) => (
          <option key={s._id} value={s._id}>
            {s.name} — {roleLabel(s.role, locale)}
          </option>
        ))}
      </Select>
    </Field>
  );

  return (
    <Card>
      <SectionTitle
        title={t('admin.assignedTo')}
        actions={
          <Button size="sm" variant="outline" onClick={save} loading={saving} icon={UserCog}>
            {saved ? t('admin.saved') : t('ui.save')}
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {picker(t('admin.accountManager'), 'accountManagerId', ASSIGNABLE_ROLES.accountManager)}
        {picker(t('admin.factoryOwner'), 'factoryUserId', ASSIGNABLE_ROLES.factory)}
        {picker(t('admin.dispatchOwner'), 'logisticsUserId', ASSIGNABLE_ROLES.courierDesk)}

        <Field label={t('admin.courierName')}>
          <TextInput
            value={form.courierName}
            onChange={(e) => setForm({ ...form, courierName: e.target.value })}
          />
        </Field>
        <Field label={t('admin.courierPhone')}>
          <TextInput
            value={form.courierPhone}
            onChange={(e) => setForm({ ...form, courierPhone: e.target.value })}
          />
        </Field>
        <Field label={t('admin.trackingNumber')}>
          <TextInput
            value={form.trackingNumber}
            onChange={(e) => setForm({ ...form, trackingNumber: e.target.value })}
          />
        </Field>
      </div>

      {error && (
        <div className="mt-3">
          <ErrorNote>{error}</ErrorNote>
        </div>
      )}
    </Card>
  );
}
