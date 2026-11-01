'use client';

import { use, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Building2, Check, CheckCircle2, Circle, Clock, ExternalLink, Globe, Mail,
  MapPin, Pencil, Phone, Plus, ShoppingCart, User as UserIcon,
} from 'lucide-react';
import {
  ArabicInput, Badge, Button, Card, ErrorNote, Field, Modal, PageHeader,
  SectionTitle, Select, PageSkeleton, TextArea, TextInput,
} from '@/components/admin/ui';
import { useLanguage } from '@/contexts/LanguageContext';
import { useApi } from '@/lib/useApi';
import { AuditTrail } from '@/components/admin/audit';
import { CRM_CATEGORIES, CRM_CITIES } from '@/lib/crmVocab';
import { STEP_ORDER } from '@/lib/crmProgress';
import LogActionModal from '@/components/admin/crm/LogActionModal';

/**
 * One account: who they are, how far the process has got, and everything that
 * has happened — in the order it happened.
 *
 * The six steps are not editable here. Each is ticked by the action that
 * satisfies it, so the progress shown is a reading of the history rather than a
 * second set of boxes somebody has to keep in step with it.
 */

const STEP_LABELS: Record<string, [string, string]> = {
  scheduled: ['Meeting scheduled', 'تحديد موعد'],
  introduced: ['KCC introduced', 'التعريف بـKCC'],
  accountInfo: ['Account information', 'بيانات الحساب'],
  keyPerson: ['Key person', 'الشخص المسؤول'],
  feedback: ['Feedback', 'رد الحساب'],
  commercial: ['Commercial', 'الجزء التجاري'],
};

const TYPE_LABELS: Record<string, [string, string]> = {
  visit: ['Visit', 'زيارة'],
  meeting: ['Meeting', 'اجتماع'],
  call: ['Call', 'مكالمة'],
  whatsapp: ['WhatsApp', 'واتساب'],
  email: ['Email', 'بريد'],
  intro: ['KCC introduced', 'تعريف بـKCC'],
  account_info: ['Account info', 'بيانات الحساب'],
  key_person: ['Key person', 'الشخص المسؤول'],
  feedback: ['Feedback', 'رد الحساب'],
  commercial: ['Commercial', 'تجاري'],
  sample_request: ['Sample requested', 'طلب عيّنة'],
  pricing_request: ['Pricing requested', 'طلب أسعار'],
  note: ['Note', 'ملاحظة'],
  task: ['Task', 'مهمة'],
  stage_change: ['Stage change', 'تغيير المرحلة'],
  assignment: ['Assignment', 'تعيين'],
  system: ['System', 'النظام'],
};

const STAGE_TONES: Record<string, 'brand' | 'ok' | 'warn' | 'danger' | 'neutral'> = {
  upcoming: 'neutral', current: 'brand', hold: 'warn', won: 'ok', lost: 'danger',
};

interface Detail {
  // Loose JSON from the API.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  account: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  activities: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  orders: any[];
}

export default function CrmAccountPage({ params }: { params: Promise<{ id: string }> }) {
  const { t, tx, pick, locale } = useLanguage();
  const ar = locale === 'ar';
  const { id } = use(params);

  const { data: loaded, ready, error: loadError, reload: load } = useApi<Detail>(`/api/crm/accounts/${id}`);
  const data = loaded ?? null;
  const [actionError, setError] = useState<string | null>(null);
  const error = actionError || loadError;
  const [logging, setLogging] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [owners, setOwners] = useState<Array<{ _id: string; name: string; role: string }>>([]);
  const [form, setForm] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch('/api/users?role=', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : []))
      .then((u) => setOwners(Array.isArray(u) ? u : u?.users || []))
      .catch(() => setOwners([]));
  }, []);

  function openEdit() {
    const a = data?.account || {};
    setForm({
      name: a.name || '',
      nameAr: a.nameAr || '',
      category: a.category || 'other',
      city: a.city || 'other',
      segment: a.segment || '',
      brands: (a.brands || []).join(', '),
      links: (a.links || []).join(', '),
      personName: a.keyPerson?.name || '',
      personPosition: a.keyPerson?.position || '',
      personPhone: a.keyPerson?.phone || '',
      personEmail: a.keyPerson?.email || '',
      feedback: a.feedback || '',
      requirement: a.requirement || '',
      finalStatus: a.finalStatus || '',
      nextStep: a.nextStep || '',
      stage: a.stage || 'upcoming',
      ownerId: typeof a.ownerId === 'object' ? a.ownerId?._id || '' : a.ownerId || '',
    });
    setEditing(true);
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const owner = owners.find((o) => o._id === form.ownerId);
      const r = await fetch(`/api/crm/accounts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          nameAr: form.nameAr,
          category: form.category,
          city: form.city,
          segment: form.segment,
          brands: form.brands.split(',').map((s) => s.trim()).filter(Boolean),
          links: form.links.split(',').map((s) => s.trim()).filter(Boolean),
          keyPerson: {
            name: form.personName, position: form.personPosition,
            phone: form.personPhone, email: form.personEmail,
          },
          feedback: form.feedback,
          requirement: form.requirement,
          finalStatus: form.finalStatus,
          nextStep: form.nextStep,
          stage: form.stage,
          ownerId: form.ownerId || null,
          ownerName: owner?.name || null,
        }),
      });
      if (!r.ok) throw new Error((await r.json()).error || 'Save failed');
      setEditing(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  if (!ready) return <PageSkeleton tiles={3} rows={8} />;
  if (error && !data) return <ErrorNote>{error}</ErrorNote>;
  if (!data) return null;

  const a = data.account;
  const cat = CRM_CATEGORIES.find((c) => c.key === a.category);
  const cty = CRM_CITIES.find((c) => c.key === a.city);
  const done = STEP_ORDER.filter((k) => a.steps?.[k]).length;
  const label = (map: Record<string, [string, string]>, key: string) =>
    map[key] ? (ar ? map[key][1] : map[key][0]) : key;

  return (
    <div>
      <PageHeader
        title={pick(a.name, a.nameAr)}
        subtitle={[cat && (ar ? cat.labelAr : cat.labelEn), cty && (ar ? cty.labelAr : cty.labelEn), a.segment]
          .filter(Boolean)
          .join(' · ')}
        backHref={a.stage === 'upcoming' ? '/admin/crm/upcoming' : '/admin/crm/current'}
        backLabel={a.stage === 'upcoming' ? t('admin.crmUpcoming') : t('admin.crmCurrent')}
        actions={
          <>
            <Button variant="outline" icon={Pencil} onClick={openEdit}>
              {tx('Edit details')}
            </Button>
            <Button icon={Plus} onClick={() => setLogging(true)}>
              {tx('Log an action')}
            </Button>
          </>
        }
      />

      {error && (
        <div className="mb-4">
          <ErrorNote>{error}</ErrorNote>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,20rem)]">
        {/* ------------------------- left: progress and history ------------------------- */}
        <div className="space-y-5">
          <Card>
            <SectionTitle
              title={tx('Where the process has got to')}
              hint={tx('Each step is ticked by the action that satisfies it.')}
              actions={<Badge tone={done === STEP_ORDER.length ? 'ok' : 'brand'}>{done}/{STEP_ORDER.length}</Badge>}
            />
            <ol className="space-y-2">
              {STEP_ORDER.map((k, i) => {
                const at = a.steps?.[k];
                return (
                  <li key={k} className="flex items-center gap-2.5">
                    {at ? (
                      <CheckCircle2 size={16} className="shrink-0 text-brand" />
                    ) : (
                      <Circle size={16} className="shrink-0 text-fg-subtle" />
                    )}
                    <span className={`text-sm ${at ? 'text-fg' : 'text-fg-subtle'}`}>
                      {i + 1}. {label(STEP_LABELS, k)}
                    </span>
                    {at && (
                      <span className="ms-auto text-[11px] text-fg-subtle">
                        {new Date(at).toLocaleDateString(ar ? 'ar-SA' : 'en-GB', {
                          day: 'numeric', month: 'short', year: 'numeric',
                        })}
                      </span>
                    )}
                  </li>
                );
              })}
            </ol>
          </Card>

          <Card>
            <SectionTitle
              title={tx('History')}
              hint={tx('Everything recorded against this account, newest first.')}
            />
            {data.activities.length === 0 ? (
              <p className="py-6 text-center text-sm text-fg-subtle">{tx('Nothing recorded yet.')}</p>
            ) : (
              <ol className="relative space-y-3 border-s border-line ps-4">
                {data.activities.map((ev) => (
                  <li key={ev._id} className="relative">
                    <span className="absolute -start-[1.32rem] top-1.5 h-2 w-2 rounded-full bg-brand" />
                    <p className="flex flex-wrap items-center gap-2 text-sm text-fg">
                      <Badge tone={ev.type === 'stage_change' ? 'info' : 'brand'}>
                        {label(TYPE_LABELS, ev.type)}
                      </Badge>
                      {ev.meetingIndex ? (
                        <span className="text-xs text-fg-muted">#{ev.meetingIndex}</span>
                      ) : null}
                      {ev.backfilled && (
                        <Badge tone="neutral">{tx('From the sheet — date unknown')}</Badge>
                      )}
                    </p>
                    {ev.body && <p className="mt-1 text-sm text-fg-muted">{ev.body}</p>}
                    <p className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-fg-subtle">
                      <span className="inline-flex items-center gap-1">
                        <UserIcon size={10} />
                        {ev.byName || '—'}
                      </span>
                      {!ev.backfilled && (
                        <span className="inline-flex items-center gap-1">
                          <Clock size={10} />
                          {new Date(ev.at).toLocaleString(ar ? 'ar-SA' : 'en-GB', {
                            day: 'numeric', month: 'short', year: 'numeric',
                            hour: '2-digit', minute: '2-digit',
                          })}
                        </span>
                      )}
                      {ev.orderId?.orderNumber && (
                        <Link
                          href={`/admin/orders/${ev.orderId._id || ev.orderId}`}
                          className="inline-flex items-center gap-1 text-brand hover:underline"
                        >
                          <ShoppingCart size={10} />
                          {ev.orderId.orderNumber}
                        </Link>
                      )}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </Card>
        </div>

        {/* ------------------------- right: the facts ------------------------- */}
        <div className="space-y-5">
          <Card>
            <SectionTitle title={tx('Account')} />
            <dl className="space-y-2.5 text-sm">
              <Row icon={Building2} label={tx('Stage')}>
                <Badge tone={STAGE_TONES[a.stage] || 'neutral'}>{a.stage}</Badge>
              </Row>
              <Row icon={MapPin} label={tx('City')}>
                {cty ? (ar ? cty.labelAr : cty.labelEn) : a.city || '—'}
              </Row>
              <Row icon={UserIcon} label={tx('Owner')}>
                {a.ownerName || (typeof a.ownerId === 'object' ? a.ownerId?.name : '') || tx('Unassigned')}
              </Row>
              <Row icon={Clock} label={tx('Last action')}>
                {a.lastActionAt
                  ? new Date(a.lastActionAt).toLocaleDateString(ar ? 'ar-SA' : 'en-GB', {
                      day: 'numeric', month: 'short', year: 'numeric',
                    })
                  : tx('Not yet worked')}
              </Row>
              <Row icon={Check} label={tx('Recorded')}>
                {a.visitCount || 0} {tx('visits')} · {a.meetingCount || 0} {tx('meetings')}
              </Row>
            </dl>
          </Card>

          <Card>
            <SectionTitle title={tx('Key person')} />
            {a.keyPerson?.name || a.keyPerson?.phone || a.keyPerson?.email ? (
              <dl className="space-y-2.5 text-sm">
                <Row icon={UserIcon} label={tx('Name')}>
                  {a.keyPerson?.name || '—'}
                  {a.keyPerson?.position && (
                    <span className="block text-xs text-fg-subtle">{a.keyPerson.position}</span>
                  )}
                </Row>
                {a.keyPerson?.phone && (
                  <Row icon={Phone} label={tx('Phone')}>
                    <a href={`tel:${a.keyPerson.phone}`} dir="ltr" className="text-brand hover:underline">
                      {a.keyPerson.phone}
                    </a>
                  </Row>
                )}
                {a.keyPerson?.email && (
                  <Row icon={Mail} label={tx('Email')}>
                    <a href={`mailto:${a.keyPerson.email}`} dir="ltr" className="text-brand hover:underline">
                      {a.keyPerson.email}
                    </a>
                  </Row>
                )}
              </dl>
            ) : (
              <p className="text-sm text-fg-subtle">{tx('Nobody identified yet.')}</p>
            )}
          </Card>

          {(a.brands?.length > 0 || a.links?.length > 0) && (
            <Card>
              <SectionTitle title={tx('Brands and links')} />
              {a.brands?.length > 0 && (
                <p className="mb-2 flex flex-wrap gap-1.5">
                  {a.brands.map((b: string) => (
                    <Badge key={b} tone="accent">{b}</Badge>
                  ))}
                </p>
              )}
              {a.links?.map((l: string) => (
                <a
                  key={l}
                  href={l.startsWith('http') ? l : `https://${l}`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 flex items-center gap-1.5 truncate text-xs text-brand hover:underline"
                >
                  <Globe size={11} className="shrink-0" />
                  <span className="truncate">{l}</span>
                  <ExternalLink size={10} className="shrink-0" />
                </a>
              ))}
            </Card>
          )}

          {(a.feedback || a.requirement || a.nextStep || a.finalStatus) && (
            <Card>
              <SectionTitle title={tx('Where it stands')} />
              <dl className="space-y-2.5 text-sm">
                {a.feedback && <Row label={tx('Feedback')}>{a.feedback}</Row>}
                {a.requirement && <Row label={tx('What they need')}>{a.requirement}</Row>}
                {a.nextStep && <Row label={tx('Next step')}>{a.nextStep}</Row>}
                {a.finalStatus && <Row label={tx('Final status')}>{a.finalStatus}</Row>}
              </dl>
            </Card>
          )}

          {data.orders.length > 0 && (
            <Card>
              <SectionTitle title={tx('Orders from this account')} />
              <ul className="space-y-2">
                {data.orders.map((o) => (
                  <li key={o._id}>
                    <Link
                      href={`/admin/orders/${o._id}`}
                      className="flex items-center justify-between gap-2 text-sm text-fg hover:text-brand"
                    >
                      <span className="font-mono text-xs">{o.orderNumber}</span>
                      <Badge tone="info">{o.status}</Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>

      <LogActionModal
        account={logging ? { _id: id, name: a.name, nameAr: a.nameAr, stage: a.stage } : null}
        onClose={() => setLogging(false)}
        onLogged={() => {
          setLogging(false);
          load();
        }}
      />

      <div className="mt-4">
        <AuditTrail entity="CrmAccount" entityId={id} />
      </div>

      {/* ------------------------- editing the facts ------------------------- */}
      <Modal
        open={editing}
        onClose={() => setEditing(false)}
        title={tx('Edit details')}
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditing(false)}>{tx('Cancel')}</Button>
            <Button onClick={save} loading={saving}>{tx('Save')}</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={tx('Company name')} required>
              <TextInput value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Field>
            <Field label={tx('Company name (Arabic)')}>
              <ArabicInput value={form.nameAr || ''} onChange={(e) => setForm({ ...form, nameAr: e.target.value })} />
            </Field>
            <Field label={tx('Sector')}>
              <Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {CRM_CATEGORIES.map((c) => (
                  <option key={c.key} value={c.key}>{ar ? c.labelAr : c.labelEn}</option>
                ))}
              </Select>
            </Field>
            <Field label={tx('City')}>
              <Select value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })}>
                {CRM_CITIES.map((c) => (
                  <option key={c.key} value={c.key}>{ar ? c.labelAr : c.labelEn}</option>
                ))}
              </Select>
            </Field>
            <Field label={tx('Segment')} hint={tx('Skincare, haircare, makeup…')}>
              <TextInput value={form.segment || ''} onChange={(e) => setForm({ ...form, segment: e.target.value })} />
            </Field>
            <Field label={tx('Owner')}>
              <Select value={form.ownerId} onChange={(e) => setForm({ ...form, ownerId: e.target.value })}>
                <option value="">{tx('Unassigned')}</option>
                {owners.map((o) => (
                  <option key={o._id} value={o._id}>{o.name}</option>
                ))}
              </Select>
            </Field>
            <Field label={tx('Brands')} hint={tx('Separated by commas.')} className="sm:col-span-2">
              <TextInput value={form.brands || ''} onChange={(e) => setForm({ ...form, brands: e.target.value })} />
            </Field>
            <Field label={tx('Links')} hint={tx('Separated by commas.')} className="sm:col-span-2">
              <TextInput value={form.links || ''} onChange={(e) => setForm({ ...form, links: e.target.value })} />
            </Field>
          </div>

          <SectionTitle title={tx('Key person')} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={tx('Name')}>
              <TextInput value={form.personName || ''} onChange={(e) => setForm({ ...form, personName: e.target.value })} />
            </Field>
            <Field label={tx('Position')}>
              <TextInput value={form.personPosition || ''} onChange={(e) => setForm({ ...form, personPosition: e.target.value })} />
            </Field>
            <Field label={tx('Phone')}>
              <TextInput dir="ltr" value={form.personPhone || ''} onChange={(e) => setForm({ ...form, personPhone: e.target.value })} />
            </Field>
            <Field label={tx('Email')}>
              <TextInput dir="ltr" value={form.personEmail || ''} onChange={(e) => setForm({ ...form, personEmail: e.target.value })} />
            </Field>
          </div>

          <SectionTitle title={tx('Where it stands')} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={tx('What they need')} className="sm:col-span-2">
              <TextArea rows={2} value={form.requirement || ''} onChange={(e) => setForm({ ...form, requirement: e.target.value })} />
            </Field>
            <Field label={tx('Next step')} className="sm:col-span-2">
              <TextArea rows={2} value={form.nextStep || ''} onChange={(e) => setForm({ ...form, nextStep: e.target.value })} />
            </Field>
            <Field label={tx('Final status')}>
              <TextInput value={form.finalStatus || ''} onChange={(e) => setForm({ ...form, finalStatus: e.target.value })} />
            </Field>
            <Field
              label={tx('Stage')}
              hint={tx('An account reaches "current" by having work logged against it, so that is not offered here.')}
            >
              <Select value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value })}>
                <option value="upcoming">upcoming</option>
                <option value="hold">hold</option>
                <option value="won">won</option>
                <option value="lost">lost</option>
                {form.stage === 'current' && <option value="current">current</option>}
              </Select>
            </Field>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function Row({
  icon: Icon,
  label,
  children,
}: {
  icon?: React.ElementType;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-line/30 pb-2.5 last:border-b-0 last:pb-0">
      <dt className="flex shrink-0 items-center gap-1.5 text-xs text-fg-muted">
        {Icon && <Icon size={12} className="text-fg-subtle" />}
        {label}
      </dt>
      <dd className="min-w-0 text-end text-sm text-fg">{children}</dd>
    </div>
  );
}
