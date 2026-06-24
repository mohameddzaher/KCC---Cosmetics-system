'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  Loader2, Plus, Search, X, Users2, UserCheck, ListTodo,
  Building2, AlertCircle, GripVertical,
} from 'lucide-react';
import ContactActions from '@/components/admin/ContactActions';
import { STAGES, stageMeta } from '@/components/admin/CrmPanel';
import { useLivePoll } from '@/lib/useLivePoll';

const emptyForm = {
  name: '', email: '', company: '', phone: '', whatsapp: '',
  website: '', stage: 'lead', source: 'manual', accountManagerId: '',
};

export default function CrmPipelinePage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [managers, setManagers] = useState<any[]>([]);
  const [openTasks, setOpenTasks] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [managerFilter, setManagerFilter] = useState('all');
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [cRes, mRes, tRes] = await Promise.allSettled([
        fetch('/api/customers', { cache: 'no-store' }),
        fetch('/api/users?role=', { cache: 'no-store' }),
        fetch('/api/crm/tasks?status=open', { cache: 'no-store' }),
      ]);
      if (cRes.status === 'fulfilled' && cRes.value.ok) {
        const data = await cRes.value.json();
        setCustomers(Array.isArray(data) ? data : []);
      }
      if (mRes.status === 'fulfilled' && mRes.value.ok) {
        const data = await mRes.value.json();
        setManagers(Array.isArray(data) ? data : []);
      }
      if (tRes.status === 'fulfilled' && tRes.value.ok) {
        const data = await tRes.value.json();
        setOpenTasks(Array.isArray(data) ? data.length : 0);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useLivePoll(useCallback(() => load(true), [load]), 20000);

  const managerId = (c: any) =>
    typeof c.accountManagerId === 'object' && c.accountManagerId ? c.accountManagerId._id : c.accountManagerId || '';

  const filtered = useMemo(() => customers.filter((c) => {
    if (managerFilter === 'unassigned' && managerId(c)) return false;
    if (managerFilter !== 'all' && managerFilter !== 'unassigned' && managerId(c) !== managerFilter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return [c.name, c.email, c.company, c.phone].some((v) => v?.toLowerCase?.().includes(q));
  }), [customers, search, managerFilter]);

  const byStage = useMemo(() => {
    const map: Record<string, any[]> = {};
    STAGES.forEach((s) => { map[s.key] = []; });
    filtered.forEach((c) => {
      const stage = c.stage && map[c.stage] ? c.stage : 'lead';
      map[stage].push(c);
    });
    return map;
  }, [filtered]);

  const moveStage = async (id: string, stage: string) => {
    const current = customers.find((c) => c._id === id);
    if (!current || current.stage === stage) return;
    // optimistic
    setCustomers((prev) => prev.map((c) => (c._id === id ? { ...c, stage } : c)));
    const res = await fetch(`/api/customers/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stage }),
    });
    if (!res.ok) load(true);
  };

  const onDrop = (stage: string) => {
    if (dragId) moveStage(dragId, stage);
    setDragId(null);
    setDragOverStage(null);
  };

  const createContact = async () => {
    if (!form.name || !form.email) { alert('Name and email are required.'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/customers', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, accountManagerId: form.accountManagerId || undefined }),
      });
      if (!res.ok) { const e = await res.json(); alert(e.error || 'Failed to create contact'); return; }
      setShowForm(false); setForm(emptyForm); load(true);
    } finally {
      setSaving(false);
    }
  };

  const kpis = [
    { label: 'Total Contacts', value: customers.length, icon: Users2, color: 'text-kcc-green' },
    { label: 'Open Tasks', value: openTasks, icon: ListTodo, color: 'text-yellow-400' },
    { label: 'Active + VIP', value: customers.filter((c) => ['active', 'vip'].includes(c.stage)).length, icon: UserCheck, color: 'text-blue-400' },
    { label: 'Unassigned', value: customers.filter((c) => !managerId(c)).length, icon: AlertCircle, color: 'text-orange-400' },
  ];

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search size={15} className="absolute start-3 top-1/2 -translate-y-1/2 text-dark-500" />
            <input
              value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search contacts..."
              className="ps-9 pe-3 py-2 text-sm bg-dark-900 border border-dark-800 rounded-lg text-dark-100 placeholder:text-dark-500 focus:border-kcc-green focus:outline-none w-56"
            />
          </div>
          <select
            value={managerFilter} onChange={(e) => setManagerFilter(e.target.value)}
            title="Filter by account manager"
            className="px-3 py-2 text-sm bg-dark-900 border border-dark-800 rounded-lg text-dark-100 focus:border-kcc-green focus:outline-none"
          >
            <option value="all">All managers</option>
            <option value="unassigned">Unassigned</option>
            {managers.map((m) => <option key={m._id} value={m._id}>{m.name}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/admin/crm/tasks" className="flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-dark-200 bg-dark-900 border border-dark-800 rounded-lg hover:border-dark-700">
            <ListTodo size={16} /> Tasks{openTasks > 0 && <span className="px-1.5 py-0.5 text-xs rounded-full bg-yellow-500/20 text-yellow-300">{openTasks}</span>}
          </Link>
          <button type="button" onClick={() => { setForm(emptyForm); setShowForm(true); }}
            className="flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-dark-950 bg-kcc-green hover:bg-kcc-green-light rounded-lg transition-colors">
            <Plus size={16} /> Add Contact
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {kpis.map((k) => {
          const Icon = k.icon;
          return (
            <div key={k.label} className="p-4 bg-dark-900 border border-dark-800 rounded-xl">
              <div className="flex items-center justify-between">
                <span className="text-sm text-dark-400">{k.label}</span>
                <Icon size={18} className={k.color} />
              </div>
              <p className="text-2xl font-bold text-dark-50 mt-2">{k.value}</p>
            </div>
          );
        })}
      </div>

      {/* Add contact form */}
      {showForm && (
        <div className="bg-dark-900 border border-dark-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-dark-100">New Contact / Lead</h3>
            <button type="button" onClick={() => setShowForm(false)} className="text-dark-400 hover:text-dark-50" aria-label="Close"><X size={18} /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {([
              ['name', 'Full Name'], ['email', 'Email'], ['company', 'Company'],
              ['phone', 'Phone'], ['whatsapp', 'WhatsApp'], ['website', 'Website'],
            ] as [string, string][]).map(([k, lbl]) => (
              <div key={k}>
                <label className="block text-xs font-medium text-dark-400 mb-1.5">{lbl}</label>
                <input type="text" aria-label={lbl} value={(form as any)[k]}
                  onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))}
                  className="w-full px-3 py-2 text-sm bg-dark-950 border border-dark-700 rounded-lg text-dark-100 focus:border-kcc-green focus:outline-none" />
              </div>
            ))}
            <div>
              <label className="block text-xs font-medium text-dark-400 mb-1.5">Stage</label>
              <select value={form.stage} onChange={(e) => setForm((f) => ({ ...f, stage: e.target.value }))}
                title="Stage" className="w-full px-3 py-2 text-sm bg-dark-950 border border-dark-700 rounded-lg text-dark-100 focus:border-kcc-green focus:outline-none">
                {STAGES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-dark-400 mb-1.5">Account Manager</label>
              <select value={form.accountManagerId} onChange={(e) => setForm((f) => ({ ...f, accountManagerId: e.target.value }))}
                title="Account manager" className="w-full px-3 py-2 text-sm bg-dark-950 border border-dark-700 rounded-lg text-dark-100 focus:border-kcc-green focus:outline-none">
                <option value="">— Unassigned —</option>
                {managers.map((m) => <option key={m._id} value={m._id}>{m.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-dark-400 mb-1.5">Source</label>
              <input type="text" aria-label="Source" value={form.source}
                onChange={(e) => setForm((f) => ({ ...f, source: e.target.value }))} placeholder="manual / referral / event"
                className="w-full px-3 py-2 text-sm bg-dark-950 border border-dark-700 rounded-lg text-dark-100 focus:border-kcc-green focus:outline-none" />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-5">
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-dark-400 border border-dark-700 rounded-lg hover:text-dark-50">Cancel</button>
            <button type="button" onClick={createContact} disabled={saving}
              className="px-4 py-2 text-sm font-medium text-dark-950 bg-kcc-green hover:bg-kcc-green-light rounded-lg transition-colors disabled:opacity-50">
              {saving ? <Loader2 size={14} className="animate-spin inline mr-1" /> : null}Create
            </button>
          </div>
        </div>
      )}

      {/* Kanban board */}
      {loading ? (
        <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-kcc-green" size={24} /></div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {STAGES.map((s) => {
            const list = byStage[s.key] || [];
            const isOver = dragOverStage === s.key;
            return (
              <div
                key={s.key}
                onDragOver={(e) => { e.preventDefault(); setDragOverStage(s.key); }}
                onDragLeave={() => setDragOverStage((cur) => (cur === s.key ? null : cur))}
                onDrop={() => onDrop(s.key)}
                className={`shrink-0 w-72 rounded-xl border transition-colors ${
                  isOver ? 'border-kcc-green bg-kcc-green/5' : 'border-dark-800 bg-dark-900/50'
                }`}
              >
                <div className="flex items-center justify-between px-3 py-3 border-b border-dark-800">
                  <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-semibold rounded-full ${s.color}`}>
                    {s.label}
                  </span>
                  <span className="text-xs text-dark-500">{list.length}</span>
                </div>
                <div className="p-2 space-y-2 min-h-[8rem] max-h-[calc(100vh-22rem)] overflow-y-auto">
                  {list.map((c) => (
                    <div
                      key={c._id}
                      draggable
                      onDragStart={() => setDragId(c._id)}
                      onDragEnd={() => { setDragId(null); setDragOverStage(null); }}
                      className={`group bg-dark-900 border border-dark-800 rounded-lg p-3 cursor-grab active:cursor-grabbing hover:border-dark-700 transition-colors ${
                        dragId === c._id ? 'opacity-50' : ''
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <GripVertical size={14} className="text-dark-600 mt-0.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <Link href={`/admin/customers/${c._id}`} className="text-sm font-medium text-dark-50 hover:text-kcc-green block truncate">
                            {c.name}
                          </Link>
                          {c.company && (
                            <p className="text-xs text-dark-500 flex items-center gap-1 truncate">
                              <Building2 size={10} /> {c.company}
                            </p>
                          )}
                          {(c.tags || []).length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {(c.tags || []).slice(0, 3).map((t: string) => (
                                <span key={t} className="px-1.5 py-0.5 text-[10px] rounded bg-dark-800 text-dark-300">{t}</span>
                              ))}
                            </div>
                          )}
                          <div className="flex items-center justify-between mt-2">
                            <ContactActions phone={c.phone} whatsapp={c.whatsapp} email={c.email} website={c.website} size={13} />
                            {managerId(c) && (
                              <span className="text-[10px] text-dark-500 flex items-center gap-1 truncate max-w-[6rem]">
                                <UserCheck size={10} className="text-kcc-green shrink-0" />
                                {typeof c.accountManagerId === 'object' ? c.accountManagerId.name : ''}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {list.length === 0 && (
                    <div className="flex items-center justify-center h-20 text-xs text-dark-600 border border-dashed border-dark-800 rounded-lg">
                      Drop here
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
