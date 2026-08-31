'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Check, Edit2, Mail, Plus, Search, ShieldCheck, ToggleLeft, ToggleRight, Trash2, X, Loader2,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import RequirePermission from '@/components/admin/RequirePermission';
import PasswordToggle from '@/components/common/PasswordToggle';
import {
  AutoGrid, Button, Card, DataTable, EmptyState, ErrorNote, Field, Modal,
  PageHeader, SectionTitle, Select, Spinner, Td, TextInput, Th, Toggle,
} from '@/components/admin/ui';
import {
  PERMISSIONS, PERMISSION_META, permissionsByGroup, ROLE_META, ROLE_PERMISSIONS, ROLES,
  STAFF_ROLES, type Permission, type Role,
} from '@/lib/roles';

interface AdminUser {
  _id: string;
  name: string;
  email: string;
  role: Role;
  company?: string;
  phone?: string;
  jobTitle?: string;
  department?: string;
  isActive: boolean;
  createdAt: string;
}

const emptyForm = {
  name: '',
  email: '',
  password: '',
  role: 'STAFF' as Role,
  jobTitle: '',
  department: '',
  company: '',
  phone: '',
  isActive: true,
};

interface RoleRow {
  role: Role;
  permissions: Permission[];
  customised: boolean;
}

interface RoleData {
  editable: boolean;
  roles: RoleRow[];
}

export default function UsersPage() {
  return (
    <RequirePermission permission="users.view">
      <UsersInner />
    </RequirePermission>
  );
}

function UsersInner() {
  const { user: me } = useAuth();
  const { t, pick, tx } = useLanguage();
  const isSuper = me?.role === 'SUPER_ADMIN';

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState('team');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [matrixRole, setMatrixRole] = useState<Role>('ACCOUNT_MANAGER');

  /* ---- Role configuration, editable by a Super Admin ---- */
  const [roleData, setRoleData] = useState<RoleData | null>(null);
  /*
   * The in-progress edit, tagged with the server state it was started from.
   * Deriving it this way — rather than copying server data into state inside
   * an effect — means switching role or reloading simply drops the draft,
   * with no effect to keep in sync and no cascading render.
   */
  const [draft, setDraft] = useState<{ key: string; perms: Permission[] } | null>(null);
  const [savingPerms, setSavingPerms] = useState(false);
  const [permsMsg, setPermsMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const loadRoles = useCallback(async () => {
    try {
      const res = await fetch('/api/roles', { cache: 'no-store' });
      if (!res.ok) return;
      setRoleData(await res.json());
    } catch {
      /* the matrix falls back to the shipped defaults */
    }
  }, []);

  useEffect(() => {
    loadRoles();
  }, [loadRoles]);

  const serverPerms = (roleData?.roles.find((r) => r.role === matrixRole)?.permissions ??
    ROLE_PERMISSIONS[matrixRole]) as Permission[];
  const serverKey = `${matrixRole}:${serverPerms.join(',')}`;
  const draftPerms = draft?.key === serverKey ? draft.perms : serverPerms;

  const permsDirty = draftPerms.slice().sort().join(',') !== serverPerms.slice().sort().join(',');

  const togglePermission = (p: Permission) =>
    setDraft({
      key: serverKey,
      perms: draftPerms.includes(p) ? draftPerms.filter((x) => x !== p) : [...draftPerms, p],
    });

  const selectRole = (role: Role) => {
    setMatrixRole(role);
    setPermsMsg(null);
  };

  const saveRolePermissions = async () => {
    setSavingPerms(true);
    setPermsMsg(null);
    try {
      const res = await fetch('/api/roles', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: matrixRole, permissions: draftPerms }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      await loadRoles();
      setPermsMsg({ ok: true, text: tx('Saved. Everyone in this role sees the change on their next action.') });
    } catch (e) {
      setPermsMsg({ ok: false, text: e instanceof Error ? e.message : 'Save failed' });
    } finally {
      setSavingPerms(false);
    }
  };

  const resetRolePermissions = async (role: Role) => {
    setSavingPerms(true);
    setPermsMsg(null);
    try {
      const res = await fetch('/api/roles', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, reset: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Reset failed');
      await loadRoles();
      setPermsMsg({ ok: true, text: tx('Restored to the shipped defaults.') });
    } catch (e) {
      setPermsMsg({ ok: false, text: e instanceof Error ? e.message : 'Reset failed' });
    } finally {
      setSavingPerms(false);
    }
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const sp = new URLSearchParams();
      if (roleFilter !== 'team') sp.set('role', roleFilter);
      if (search) sp.set('search', search);
      const res = await fetch(`/api/users?${sp}`, { cache: 'no-store' });
      const data = res.ok ? await res.json() : [];
      setUsers(Array.isArray(data) ? data : []);
    } catch {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [roleFilter, search]);

  useEffect(() => {
    const id = setTimeout(load, search ? 300 : 0);
    return () => clearTimeout(id);
  }, [load, search]);

  function openCreate() {
    setEditing(null);
    setError(null);
    setForm({ ...emptyForm });
    setShowForm(true);
  }

  function openEdit(u: AdminUser) {
    setEditing(u);
    setError(null);
    setForm({
      name: u.name || '',
      email: u.email || '',
      password: '',
      role: u.role,
      jobTitle: u.jobTitle || '',
      department: u.department || '',
      company: u.company || '',
      phone: u.phone || '',
      isActive: u.isActive,
    });
    setShowForm(true);
  }

  async function submit() {
    if (!form.name || !form.email || (!editing && !form.password)) {
      setError(t('admin.requiredField'));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = {
        name: form.name,
        email: form.email,
        role: form.role,
        jobTitle: form.jobTitle,
        department: form.department,
        company: form.company,
        phone: form.phone,
        isActive: form.isActive,
      };
      if (form.password) payload.password = form.password;

      const res = await fetch(editing ? `/api/users/${editing._id}` : '/api/users', {
        method: editing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error((await res.json()).error || t('admin.saveFailed'));
      setShowForm(false);
      setEditing(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : t('admin.saveFailed'));
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(u: AdminUser) {
    await fetch(`/api/users/${u._id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !u.isActive }),
    });
    await load();
  }

  async function remove(u: AdminUser) {
    if (!confirm(t('admin.deleteConfirm'))) return;
    const res = await fetch(`/api/users/${u._id}`, { method: 'DELETE' });
    if (!res.ok) setError((await res.json()).error || t('admin.saveFailed'));
    await load();
  }

  const filters = useMemo(
    () => [
      { key: 'team', label: t('admin.allRoles') },
      ...STAFF_ROLES.map((r) => ({ key: r, label: pick(ROLE_META[r].labelEn, ROLE_META[r].labelAr) })),
      { key: 'CUSTOMER', label: pick(ROLE_META.CUSTOMER.labelEn, ROLE_META.CUSTOMER.labelAr) },
    ],
    [t, pick]
  );

  // A non-super-admin may not mint or edit privileged accounts.
  const assignableRoles = ROLES.filter((r) =>
    isSuper ? true : r !== 'SUPER_ADMIN' && r !== 'ADMIN'
  );
  const editingSelf = !!editing && editing._id === me?.id;

  return (
    <div>
      <PageHeader
        title={t('admin.usersTitle')}
        subtitle={t('admin.usersSubtitle')}
        actions={
          <Button icon={Plus} onClick={openCreate}>
            {t('admin.addUser')}
          </Button>
        }
      />

      {error && (
        <div className="mb-4">
          <ErrorNote>{error}</ErrorNote>
        </div>
      )}

      <Card className="mb-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative min-w-0 flex-1">
            <Search size={15} className="absolute start-3 top-1/2 -translate-y-1/2 text-fg-subtle" />
            <TextInput
              className="ps-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('admin.searchPlaceholder')}
              aria-label={t('ui.search')}
            />
          </div>
          <Select
            className="sm:w-64"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            aria-label={t('admin.role')}
          >
            {filters.map((f) => (
              <option key={f.key} value={f.key}>
                {f.label}
              </option>
            ))}
          </Select>
        </div>
      </Card>

      {loading ? (
        <Spinner />
      ) : users.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title={t('admin.noData')}
          hint={t('admin.noDataHint')}
          action={
            <Button size="sm" icon={Plus} onClick={openCreate}>
              {t('admin.addUser')}
            </Button>
          }
        />
      ) : (
        <DataTable>
          <thead>
            <tr>
              <Th>{t('admin.customerName')}</Th>
              <Th>{t('admin.role')}</Th>
              <Th>{t('admin.jobTitle')}</Th>
              <Th>{t('admin.email')}</Th>
              <Th align="center">{t('admin.active')}</Th>
              <Th align="end">{t('admin.actions')}</Th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const meta = ROLE_META[u.role];
              return (
                <tr key={u._id} className="transition-colors hover:bg-surface-2">
                  <Td>
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs font-bold text-brand-soft-fg">
                        {u.name.charAt(0).toUpperCase()}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-fg">{u.name}</span>
                        {u.department && (
                          <span className="block truncate text-[11px] text-fg-muted">{u.department}</span>
                        )}
                      </span>
                    </div>
                  </Td>
                  <Td>
                    <span className={`badge ${meta?.badge || 'badge-neutral'}`}>
                      {pick(meta?.labelEn, meta?.labelAr) || u.role}
                    </span>
                  </Td>
                  <Td className="text-sm text-fg-muted">{u.jobTitle || '—'}</Td>
                  <Td>
                    <a
                      href={`mailto:${u.email}`}
                      className="inline-flex items-center gap-1.5 text-sm text-fg-muted hover:text-brand"
                    >
                      <Mail size={12} />
                      <span className="truncate">{u.email}</span>
                    </a>
                  </Td>
                  <Td align="center">
                    <button
                      type="button"
                      onClick={() => toggleActive(u)}
                      title={u.isActive ? t('admin.deactivate') : t('admin.activate')}
                      aria-label={u.isActive ? t('admin.deactivate') : t('admin.activate')}
                      className={u.isActive ? 'text-ok' : 'text-fg-subtle'}
                    >
                      {u.isActive ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
                    </button>
                  </Td>
                  <Td align="end">
                    <div className="flex justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => openEdit(u)}
                        title={t('ui.edit')}
                        aria-label={t('ui.edit')}
                        className="rounded-lg p-1.5 text-fg-muted hover:bg-surface-2 hover:text-fg"
                      >
                        <Edit2 size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(u)}
                        title={t('ui.delete')}
                        aria-label={t('ui.delete')}
                        disabled={u._id === me?.id}
                        className="rounded-lg p-1.5 text-fg-muted hover:bg-danger-soft hover:text-danger disabled:opacity-30"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </DataTable>
      )}

      {/* ---------------- Role reference + permission matrix ---------------- */}
      <div className="mt-8">
        <SectionTitle
          title={t('admin.rolesReference')}
          hint={
            roleData?.editable
              ? tx('Tick a permission to grant it, untick to take it away. Saved changes apply on the next request — no sign-out needed.')
              : t('admin.permissionMatrix')
          }
        />
        <AutoGrid min="17rem">
          {STAFF_ROLES.map((r) => {
            const meta = ROLE_META[r];
            const active = matrixRole === r;
            const row = roleData?.roles.find((x) => x.role === r);
            const count = row ? row.permissions.length : ROLE_PERMISSIONS[r].length;
            return (
              <button
                key={r}
                type="button"
                onClick={() => selectRole(r)}
                className={`rounded-xl border p-4 text-start transition-colors ${
                  active ? 'border-brand bg-brand-soft' : 'border-line bg-surface hover:border-line-strong'
                }`}
              >
                <span className="flex flex-wrap items-center gap-2">
                  <span className={`badge ${meta.badge}`}>{pick(meta.labelEn, meta.labelAr)}</span>
                  {row?.customised && (
                    <span className="badge badge-warn">{tx('Customised')}</span>
                  )}
                </span>
                <p className="mt-2 text-xs leading-relaxed text-fg-muted">
                  {pick(meta.descEn, meta.descAr)}
                </p>
                <p className="mt-2 text-[11px] font-medium text-fg-subtle">
                  {count} / {PERMISSIONS.length}
                </p>
              </button>
            );
          })}
        </AutoGrid>

        <Card className="mt-4">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <SectionTitle
              title={`${t('admin.permissionMatrix')} — ${pick(
                ROLE_META[matrixRole].labelEn,
                ROLE_META[matrixRole].labelAr
              )}`}
            />
            {roleData?.editable && matrixRole !== 'SUPER_ADMIN' && (
              <div className="flex flex-wrap items-center gap-2">
                {permsDirty && (
                  <span className="text-xs text-fg-muted">{tx('Unsaved changes')}</span>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => resetRolePermissions(matrixRole)}
                  disabled={savingPerms}
                >
                  {tx('Restore defaults')}
                </Button>
                <Button size="sm" onClick={saveRolePermissions} disabled={savingPerms || !permsDirty}>
                  {savingPerms ? <Loader2 size={14} className="animate-spin" /> : tx('Save permissions')}
                </Button>
              </div>
            )}
          </div>

          {permsMsg && (
            <p className={`mb-3 text-sm ${permsMsg.ok ? 'text-ok-soft-fg' : 'text-danger'}`}>
              {permsMsg.text}
            </p>
          )}

          {matrixRole === 'SUPER_ADMIN' && roleData?.editable && (
            <p className="mb-3 text-xs text-fg-muted">
              {tx('The Super Admin role always has full access — it cannot be narrowed, so that nobody can lock themselves out.')}
            </p>
          )}

          {/* Grouped by area of the business, and labelled in words. The
              technical key stays visible underneath — support still needs it,
              and it is what appears in the audit trail. */}
          {/* A hairline between groups. Without one the nine sections ran into
              each other and the whole list read as a single wall of switches. */}
          <div className="divide-y divide-line">
            {permissionsByGroup().map((group, gi) => (
              <div key={group.key} className={gi === 0 ? 'pb-5' : 'py-5 last:pb-0'}>
                <p className="mb-2.5 flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-fg-subtle">
                  <span className="whitespace-nowrap">{pick(group.en, group.ar)}</span>
                  <span className="text-[10px] font-normal normal-case tracking-normal opacity-70">
                    {group.permissions.filter((p) => draftPerms.includes(p)).length}/
                    {group.permissions.length}
                  </span>
                </p>
                {/*
                  Fixed column counts, not `auto-fill`.

                  Auto-fill worked out its own column count from the available
                  width, so the tracks did not line up between one group and
                  the next and the whole thing read as ragged. Explicit
                  breakpoints mean every group shares the same columns, the
                  gaps in a group's last row line up with the group above, and
                  the tiles are all the same height whatever the label length.
                */}
                <div className="grid items-stretch gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  {group.permissions.map((p) => {
                    const has = draftPerms.includes(p);
                    const canEdit = !!roleData?.editable && matrixRole !== 'SUPER_ADMIN';
                    const meta = PERMISSION_META[p];
                    const className = `flex min-h-[3.5rem] w-full items-center gap-2 rounded-lg border px-3 py-2 text-start transition-colors ${
                      has
                        ? 'border-ok bg-ok-soft text-ok-soft-fg'
                        : 'border-line bg-surface-2 text-fg-subtle'
                    } ${canEdit ? 'cursor-pointer hover:border-brand' : ''}`;

                    const body = (
                      <>
                        <span className="shrink-0">
                          {has ? <Check size={13} strokeWidth={3} /> : <X size={13} />}
                        </span>
                        <span className="min-w-0">
                          {/* No strike-through: the green tile and the tick
                              already say which are on, and a line through the
                              wording just makes it harder to read. */}
                          <span className="block text-xs font-medium">
                            {pick(meta.labelEn, meta.labelAr)}
                          </span>
                          <span className="mt-0.5 block font-mono text-[10px] opacity-60">{p}</span>
                        </span>
                      </>
                    );

                    if (!canEdit) {
                      return (
                        <span key={p} className={className}>
                          {body}
                        </span>
                      );
                    }
                    return (
                      <button
                        key={p}
                        type="button"
                        aria-pressed={has}
                        onClick={() => togglePermission(p)}
                        className={className}
                      >
                        {body}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>


      {/* ---------------- Create / edit ---------------- */}
      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        size="md"
        title={editing ? t('admin.editUser') : t('admin.addUser')}
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowForm(false)}>
              {t('ui.cancel')}
            </Button>
            <Button onClick={submit} loading={saving}>
              {editing ? t('ui.saveChanges') : t('ui.create')}
            </Button>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t('admin.customerName')} required>
            <TextInput value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label={t('admin.email')} required>
            <TextInput
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </Field>

          <Field
            label={editing ? t('admin.newPassword') : t('admin.password')}
            hint={editing ? t('admin.leaveBlankKeep') : undefined}
            required={!editing}
          >
            {/* An admin setting someone else's password needs to be able to
                read back what they typed before handing it over. */}
            <div className="relative">
              <TextInput
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                className="pe-11"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
              <PasswordToggle shown={showPassword} onToggle={() => setShowPassword((v) => !v)} />
            </div>
          </Field>

          <Field
            label={t('admin.role')}
            required
            hint={editingSelf ? t('admin.cannotEditSelfRole') : !isSuper ? t('admin.onlySuperAdmin') : undefined}
          >
            <Select
              value={form.role}
              disabled={editingSelf}
              onChange={(e) => setForm({ ...form, role: e.target.value as Role })}
            >
              {assignableRoles.map((r) => (
                <option key={r} value={r}>
                  {pick(ROLE_META[r].labelEn, ROLE_META[r].labelAr)}
                </option>
              ))}
            </Select>
          </Field>

          <Field label={t('admin.jobTitle')}>
            <TextInput value={form.jobTitle} onChange={(e) => setForm({ ...form, jobTitle: e.target.value })} />
          </Field>
          <Field label={t('admin.department')}>
            <TextInput
              value={form.department}
              onChange={(e) => setForm({ ...form, department: e.target.value })}
            />
          </Field>
          <Field label={t('admin.company')}>
            <TextInput value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
          </Field>
          <Field label={t('admin.phone')}>
            <TextInput value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </Field>

          <div className="sm:col-span-2">
            <Toggle
              label={t('admin.accountActive')}
              hint={t('admin.accountActiveHint')}
              value={form.isActive}
              onChange={(v) => setForm({ ...form, isActive: v })}
            />
          </div>

          <div className="rounded-xl border border-line bg-surface-2 p-3 sm:col-span-2">
            <p className="text-xs font-semibold text-fg">
              {pick(ROLE_META[form.role].labelEn, ROLE_META[form.role].labelAr)}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-fg-muted">
              {pick(ROLE_META[form.role].descEn, ROLE_META[form.role].descAr)}
            </p>
          </div>
        </div>
        {error && (
          <div className="mt-4">
            <ErrorNote>{error}</ErrorNote>
          </div>
        )}
      </Modal>
    </div>
  );
}
