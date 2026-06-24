'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  ShieldCheck, Plus, Edit2, Trash2, Loader2, Search, X,
  ToggleLeft, ToggleRight, Mail, Crown, User as UserIcon, Briefcase,
} from 'lucide-react';

type Role = 'SUPER_ADMIN' | 'ADMIN' | 'STAFF' | 'CUSTOMER';

const ROLE_META: Record<Role, { label: string; color: string; icon: any }> = {
  SUPER_ADMIN: { label: 'Super Admin', color: 'bg-purple-500/10 text-purple-300', icon: Crown },
  ADMIN: { label: 'Admin', color: 'bg-kcc-green/10 text-kcc-green', icon: ShieldCheck },
  STAFF: { label: 'Staff', color: 'bg-blue-500/10 text-blue-300', icon: Briefcase },
  CUSTOMER: { label: 'Customer', color: 'bg-dark-700 text-dark-300', icon: UserIcon },
};

const FILTERS: { key: string; label: string }[] = [
  { key: 'team', label: 'Team (Staff & Admins)' },
  { key: 'SUPER_ADMIN', label: 'Super Admins' },
  { key: 'ADMIN', label: 'Admins' },
  { key: 'STAFF', label: 'Staff' },
  { key: 'CUSTOMER', label: 'Customers' },
];

const emptyForm = {
  name: '', email: '', password: '', role: 'STAFF' as Role,
  company: '', phone: '', isActive: true,
};

export default function UsersPage() {
  const { user: me } = useAuth();
  const isSuper = me?.role === 'SUPER_ADMIN';

  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('team');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const roleParam = filter === 'team' ? '' : `role=${filter}`;
      const sp = new URLSearchParams();
      if (roleParam) sp.set('role', filter);
      if (search) sp.set('search', search);
      const res = await fetch(`/api/users?${sp.toString()}`);
      const data = res.ok ? await res.json() : [];
      setUsers(Array.isArray(data) ? data : []);
    } catch {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [filter, search]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm });
    setShowForm(true);
  };

  const openEdit = (u: any) => {
    setEditing(u);
    setForm({
      name: u.name || '', email: u.email || '', password: '',
      role: u.role, company: u.company || '', phone: u.phone || '',
      isActive: u.isActive,
    });
    setShowForm(true);
  };

  const submit = async () => {
    if (!form.name || !form.email || (!editing && !form.password)) {
      alert('Name, email and password are required.');
      return;
    }
    setSaving(true);
    try {
      const payload: any = {
        name: form.name, email: form.email, role: form.role,
        company: form.company, phone: form.phone, isActive: form.isActive,
      };
      if (form.password) payload.password = form.password;

      const url = editing ? `/api/users/${editing._id}` : '/api/users';
      const method = editing ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method, headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || 'Failed to save user');
        return;
      }
      setShowForm(false);
      setEditing(null);
      load();
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (u: any) => {
    const res = await fetch(`/api/users/${u._id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !u.isActive }),
    });
    if (res.ok) load();
    else { const e = await res.json(); alert(e.error || 'Failed'); }
  };

  const remove = async (u: any) => {
    if (!confirm(`Delete ${u.name}? This cannot be undone.`)) return;
    const res = await fetch(`/api/users/${u._id}`, { method: 'DELETE' });
    if (res.ok) load();
    else { const e = await res.json(); alert(e.error || 'Failed to delete'); }
  };

  const canManage = (u: any) => {
    // Admins cannot touch privileged accounts; super admins can do anything except self-delete
    if (['SUPER_ADMIN', 'ADMIN'].includes(u.role) && !isSuper) return false;
    return true;
  };

  const roleOptions: Role[] = isSuper
    ? ['SUPER_ADMIN', 'ADMIN', 'STAFF', 'CUSTOMER']
    : ['STAFF', 'CUSTOMER'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search size={16} className="absolute start-3 top-1/2 -translate-y-1/2 text-dark-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email or company..."
            className="w-full ps-9 pe-3 py-2.5 text-sm bg-dark-900 border border-dark-800 rounded-xl text-dark-100 placeholder:text-dark-500 focus:border-kcc-green focus:outline-none"
          />
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="flex items-center gap-2 px-3.5 py-2.5 text-sm font-medium text-dark-950 bg-kcc-green hover:bg-kcc-green-light rounded-lg transition-colors"
        >
          <Plus size={16} />
          Add User
        </button>
      </div>

      {/* Role filter tabs */}
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
              filter === f.key
                ? 'bg-kcc-green/10 text-kcc-green border-kcc-green/40'
                : 'text-dark-400 border-dark-800 hover:text-dark-100'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-dark-900 border border-dark-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-dark-100">
              {editing ? `Edit: ${editing.name}` : 'Create New User'}
            </h3>
            <button type="button" onClick={() => { setShowForm(false); setEditing(null); }} className="text-dark-400 hover:text-dark-50" aria-label="Close">
              <X size={18} />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-dark-400 mb-1.5">Full Name</label>
              <input type="text" value={form.name} onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))}
                className="w-full px-3 py-2 text-sm bg-dark-950 border border-dark-700 rounded-lg text-dark-100 focus:border-kcc-green focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-dark-400 mb-1.5">Email</label>
              <input type="email" value={form.email} onChange={(e) => setForm(p => ({ ...p, email: e.target.value }))}
                className="w-full px-3 py-2 text-sm bg-dark-950 border border-dark-700 rounded-lg text-dark-100 focus:border-kcc-green focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-dark-400 mb-1.5">
                {editing ? 'New Password (leave blank to keep)' : 'Password'}
              </label>
              <input type="password" value={form.password} onChange={(e) => setForm(p => ({ ...p, password: e.target.value }))}
                className="w-full px-3 py-2 text-sm bg-dark-950 border border-dark-700 rounded-lg text-dark-100 focus:border-kcc-green focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-dark-400 mb-1.5">Role</label>
              <select value={form.role} onChange={(e) => setForm(p => ({ ...p, role: e.target.value as Role }))}
                className="w-full px-3 py-2 text-sm bg-dark-950 border border-dark-700 rounded-lg text-dark-100 focus:border-kcc-green focus:outline-none">
                {roleOptions.map(r => <option key={r} value={r}>{ROLE_META[r].label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-dark-400 mb-1.5">Company (optional)</label>
              <input type="text" value={form.company} onChange={(e) => setForm(p => ({ ...p, company: e.target.value }))}
                className="w-full px-3 py-2 text-sm bg-dark-950 border border-dark-700 rounded-lg text-dark-100 focus:border-kcc-green focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-dark-400 mb-1.5">Phone (optional)</label>
              <input type="text" value={form.phone} onChange={(e) => setForm(p => ({ ...p, phone: e.target.value }))}
                className="w-full px-3 py-2 text-sm bg-dark-950 border border-dark-700 rounded-lg text-dark-100 focus:border-kcc-green focus:outline-none" />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.isActive} onChange={(e) => setForm(p => ({ ...p, isActive: e.target.checked }))}
                  className="w-4 h-4 rounded border-dark-700 bg-dark-950 text-kcc-green focus:ring-kcc-green" />
                <span className="text-sm text-dark-300">Active</span>
              </label>
            </div>
          </div>
          {!isSuper && (
            <p className="mt-3 text-xs text-dark-500">
              Note: only a Super Admin can create or edit Admin / Super Admin accounts.
            </p>
          )}
          <div className="flex justify-end gap-3 mt-5">
            <button type="button" onClick={() => { setShowForm(false); setEditing(null); }}
              className="px-4 py-2 text-sm text-dark-400 border border-dark-700 rounded-lg hover:text-dark-50">Cancel</button>
            <button type="button" onClick={submit} disabled={saving}
              className="px-4 py-2 text-sm font-medium text-dark-950 bg-kcc-green hover:bg-kcc-green-light rounded-lg transition-colors disabled:opacity-50">
              {saving ? <Loader2 size={14} className="animate-spin inline mr-1" /> : null}
              {editing ? 'Update' : 'Create'}
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-dark-900 border border-dark-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48"><Loader2 className="animate-spin text-kcc-green" size={24} /></div>
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-dark-400">
            <ShieldCheck size={32} className="mb-2" />
            <p>No users found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-dark-800">
                  <th className="text-start text-xs font-medium text-dark-500 uppercase tracking-wider px-5 py-3">User</th>
                  <th className="text-start text-xs font-medium text-dark-500 uppercase tracking-wider px-5 py-3">Role</th>
                  <th className="text-start text-xs font-medium text-dark-500 uppercase tracking-wider px-5 py-3">Company</th>
                  <th className="text-center text-xs font-medium text-dark-500 uppercase tracking-wider px-5 py-3">Status</th>
                  <th className="text-center text-xs font-medium text-dark-500 uppercase tracking-wider px-5 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-800">
                {users.map((u) => {
                  const meta = ROLE_META[u.role as Role] || ROLE_META.STAFF;
                  const RoleIcon = meta.icon;
                  const manage = canManage(u);
                  const isMe = me?.id === u._id;
                  return (
                    <tr key={u._id} className="hover:bg-dark-800/50 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-kcc-green/15 flex items-center justify-center text-kcc-green text-sm font-bold shrink-0">
                            {u.name?.charAt(0)?.toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-dark-50 truncate">
                              {u.name}{isMe && <span className="text-dark-500 font-normal"> (you)</span>}
                            </p>
                            <a href={`mailto:${u.email}`} className="text-xs text-dark-400 hover:text-kcc-green flex items-center gap-1">
                              <Mail size={11} />{u.email}
                            </a>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium rounded-full ${meta.color}`}>
                          <RoleIcon size={12} />{meta.label}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-dark-300">{u.company || '—'}</td>
                      <td className="px-5 py-3.5 text-center">
                        {u.isActive
                          ? <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-green-500/10 text-green-400">Active</span>
                          : <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-dark-700 text-dark-400">Disabled</span>}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-center gap-2">
                          <button type="button" onClick={() => toggleActive(u)} disabled={!manage || isMe}
                            className="p-1.5 rounded-lg transition-colors text-dark-400 hover:bg-dark-800 disabled:opacity-30 disabled:cursor-not-allowed"
                            title={u.isActive ? 'Disable' : 'Enable'}>
                            {u.isActive ? <ToggleRight size={18} className="text-green-400" /> : <ToggleLeft size={18} />}
                          </button>
                          <button type="button" onClick={() => openEdit(u)} disabled={!manage}
                            className="p-1.5 text-dark-400 hover:text-kcc-green hover:bg-dark-800 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                            title="Edit"><Edit2 size={15} /></button>
                          <button type="button" onClick={() => remove(u)} disabled={!manage || isMe}
                            className="p-1.5 text-dark-400 hover:text-red-400 hover:bg-dark-800 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                            title="Delete"><Trash2 size={15} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
