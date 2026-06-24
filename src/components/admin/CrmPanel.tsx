'use client';

import { useState } from 'react';
import {
  Loader2, Plus, X, Tag as TagIcon, UserCheck, Activity as ActivityIcon,
  StickyNote, Phone, Mail, MessageCircle, CalendarClock, CheckSquare, Square,
  Trash2, Users2, Check,
} from 'lucide-react';

export const STAGES = [
  { key: 'lead', label: 'Lead', color: 'bg-blue-500/10 text-blue-300' },
  { key: 'prospect', label: 'Prospect', color: 'bg-indigo-500/10 text-indigo-300' },
  { key: 'active', label: 'Active', color: 'bg-green-500/10 text-green-400' },
  { key: 'vip', label: 'VIP', color: 'bg-purple-500/10 text-purple-300' },
  { key: 'inactive', label: 'Inactive', color: 'bg-dark-700 text-dark-300' },
  { key: 'churned', label: 'Churned', color: 'bg-red-500/10 text-red-400' },
];

export const stageMeta = (key: string) =>
  STAGES.find((s) => s.key === key) || STAGES[0];

const ACTIVITY_META: Record<string, { label: string; icon: any; color: string }> = {
  note: { label: 'Note', icon: StickyNote, color: 'text-dark-300' },
  call: { label: 'Call', icon: Phone, color: 'text-blue-300' },
  email: { label: 'Email', icon: Mail, color: 'text-kcc-green' },
  whatsapp: { label: 'WhatsApp', icon: MessageCircle, color: 'text-green-400' },
  meeting: { label: 'Meeting', icon: Users2, color: 'text-purple-300' },
  task: { label: 'Task', icon: CalendarClock, color: 'text-yellow-300' },
  stage_change: { label: 'Stage change', icon: ActivityIcon, color: 'text-indigo-300' },
  assignment: { label: 'Assignment', icon: UserCheck, color: 'text-kcc-beige' },
  system: { label: 'System', icon: ActivityIcon, color: 'text-dark-400' },
};

interface Props {
  customer: any;
  managers: any[];
  activities: any[];
  onChange: () => void;
}

export default function CrmPanel({ customer, managers, activities, onChange }: Props) {
  const customerId = customer._id;
  const [savingField, setSavingField] = useState<string | null>(null);
  const [tagInput, setTagInput] = useState('');

  // Activity composer
  const [actType, setActType] = useState<'note' | 'call' | 'email' | 'whatsapp' | 'meeting' | 'task'>('note');
  const [actBody, setActBody] = useState('');
  const [actDue, setActDue] = useState('');
  const [posting, setPosting] = useState(false);

  const patchCustomer = async (update: Record<string, unknown>, field: string) => {
    setSavingField(field);
    try {
      const res = await fetch(`/api/customers/${customerId}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(update),
      });
      if (!res.ok) {
        const e = await res.json();
        alert(e.error || 'Failed to update');
      } else {
        onChange();
      }
    } finally {
      setSavingField(null);
    }
  };

  const addTag = () => {
    const v = tagInput.trim();
    if (!v) return;
    const current: string[] = customer.tags || [];
    if (current.map((t) => t.toLowerCase()).includes(v.toLowerCase())) { setTagInput(''); return; }
    patchCustomer({ tags: [...current, v] }, 'tags');
    setTagInput('');
  };

  const removeTag = (t: string) => {
    patchCustomer({ tags: (customer.tags || []).filter((x: string) => x !== t) }, 'tags');
  };

  const addActivity = async () => {
    if (!actBody.trim()) return;
    setPosting(true);
    try {
      const res = await fetch(`/api/customers/${customerId}/activities`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: actType, body: actBody, dueDate: actType === 'task' ? actDue : undefined }),
      });
      if (res.ok) {
        setActBody(''); setActDue('');
        onChange();
      } else {
        const e = await res.json();
        alert(e.error || 'Failed to add activity');
      }
    } finally {
      setPosting(false);
    }
  };

  const toggleTask = async (a: any) => {
    await fetch(`/api/customers/${customerId}/activities/${a._id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ done: !a.done }),
    });
    onChange();
  };

  const deleteActivity = async (a: any) => {
    if (!confirm('Delete this entry?')) return;
    await fetch(`/api/customers/${customerId}/activities/${a._id}`, { method: 'DELETE' });
    onChange();
  };

  const managerId =
    typeof customer.accountManagerId === 'object' && customer.accountManagerId
      ? customer.accountManagerId._id
      : customer.accountManagerId || '';

  const fmt = (d: string) =>
    d ? new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';

  const composerTypes = ['note', 'call', 'email', 'whatsapp', 'meeting', 'task'] as const;

  return (
    <div className="space-y-6">
      {/* CRM controls */}
      <div className="bg-dark-900 border border-dark-800 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-dark-100 mb-4 flex items-center gap-2">
          <UserCheck size={16} className="text-kcc-green" /> CRM
        </h2>

        {/* Stage */}
        <div className="mb-4">
          <label className="block text-xs text-dark-400 mb-1.5">Stage</label>
          <div className="flex flex-wrap gap-1.5">
            {STAGES.map((s) => (
              <button
                key={s.key}
                type="button"
                onClick={() => patchCustomer({ stage: s.key }, 'stage')}
                disabled={savingField === 'stage'}
                className={`px-2.5 py-1 text-xs font-medium rounded-full border transition-colors ${
                  customer.stage === s.key
                    ? `${s.color} border-transparent`
                    : 'text-dark-400 border-dark-700 hover:text-dark-100'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Account manager */}
        <div className="mb-4">
          <label className="block text-xs text-dark-400 mb-1.5">Account Manager</label>
          <select
            value={managerId}
            onChange={(e) => patchCustomer({ accountManagerId: e.target.value || '' }, 'manager')}
            disabled={savingField === 'manager'}
            className="w-full px-3 py-2 text-sm bg-dark-950 border border-dark-700 rounded-lg text-dark-100 focus:border-kcc-green focus:outline-none"
          >
            <option value="">— Unassigned —</option>
            {managers.map((m) => (
              <option key={m._id} value={m._id}>{m.name} ({m.role})</option>
            ))}
          </select>
        </div>

        {/* Tags */}
        <div>
          <label className="block text-xs text-dark-400 mb-1.5 flex items-center gap-1.5">
            <TagIcon size={12} /> Tags
          </label>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {(customer.tags || []).length === 0 && <span className="text-xs text-dark-500">No tags</span>}
            {(customer.tags || []).map((t: string) => (
              <span key={t} className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-dark-800 text-dark-200">
                {t}
                <button type="button" onClick={() => removeTag(t)} className="text-dark-500 hover:text-red-400"><X size={11} /></button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
              placeholder="Add tag..."
              className="flex-1 px-3 py-1.5 text-sm bg-dark-950 border border-dark-700 rounded-lg text-dark-100 focus:border-kcc-green focus:outline-none"
            />
            <button type="button" onClick={addTag} className="px-2.5 py-1.5 text-dark-300 border border-dark-700 rounded-lg hover:text-kcc-green hover:border-kcc-green/40">
              <Plus size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* Activity timeline */}
      <div className="bg-dark-900 border border-dark-800 rounded-xl overflow-hidden">
        <div className="p-5 border-b border-dark-800">
          <h2 className="text-sm font-semibold text-dark-100 flex items-center gap-2">
            <ActivityIcon size={16} className="text-kcc-green" /> Activity & Notes
          </h2>
        </div>

        {/* Composer */}
        <div className="p-4 border-b border-dark-800 space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {composerTypes.map((tp) => {
              const m = ACTIVITY_META[tp];
              const Icon = m.icon;
              return (
                <button
                  key={tp}
                  type="button"
                  onClick={() => setActType(tp)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg border transition-colors ${
                    actType === tp ? 'bg-kcc-green/10 text-kcc-green border-kcc-green/40' : 'text-dark-400 border-dark-700 hover:text-dark-100'
                  }`}
                >
                  <Icon size={13} /> {m.label}
                </button>
              );
            })}
          </div>
          <textarea
            value={actBody}
            onChange={(e) => setActBody(e.target.value)}
            rows={2}
            placeholder={actType === 'task' ? 'Describe the follow-up task...' : 'Log a note or interaction...'}
            className="w-full px-3 py-2 text-sm bg-dark-950 border border-dark-700 rounded-lg text-dark-100 placeholder:text-dark-500 focus:border-kcc-green focus:outline-none resize-none"
          />
          <div className="flex items-center justify-between gap-3">
            {actType === 'task' ? (
              <input
                type="date"
                value={actDue}
                onChange={(e) => setActDue(e.target.value)}
                className="px-3 py-1.5 text-sm bg-dark-950 border border-dark-700 rounded-lg text-dark-100 focus:border-kcc-green focus:outline-none"
              />
            ) : <span />}
            <button
              type="button"
              onClick={addActivity}
              disabled={posting || !actBody.trim()}
              className="px-4 py-1.5 text-sm font-medium text-dark-950 bg-kcc-green hover:bg-kcc-green-light rounded-lg transition-colors disabled:opacity-50"
            >
              {posting ? <Loader2 size={13} className="animate-spin inline mr-1" /> : null}Add
            </button>
          </div>
        </div>

        {/* Timeline */}
        <div className="divide-y divide-dark-800/60 max-h-[28rem] overflow-y-auto">
          {activities.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-28 text-dark-500">
              <StickyNote size={22} className="mb-2" />
              <p className="text-sm">No activity yet</p>
            </div>
          ) : (
            activities.map((a) => {
              const m = ACTIVITY_META[a.type] || ACTIVITY_META.note;
              const Icon = m.icon;
              return (
                <div key={a._id} className="flex gap-3 p-4 group">
                  <div className={`w-7 h-7 rounded-lg bg-dark-800 flex items-center justify-center shrink-0 ${m.color}`}>
                    <Icon size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-medium text-dark-300">{m.label}</span>
                      <span className="text-xs text-dark-600">·</span>
                      <span className="text-xs text-dark-500">{fmt(a.createdAt)}</span>
                      {a.authorName && <span className="text-xs text-dark-600">by {a.authorName}</span>}
                    </div>
                    <p className={`text-sm mt-0.5 ${a.type === 'task' && a.done ? 'text-dark-500 line-through' : 'text-dark-100'}`}>
                      {a.body}
                    </p>
                    {a.type === 'task' && a.dueDate && (
                      <p className="text-xs text-yellow-300/80 mt-1 flex items-center gap-1">
                        <CalendarClock size={11} /> Due {new Date(a.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    )}
                  </div>
                  <div className="flex items-start gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {a.type === 'task' && (
                      <button type="button" onClick={() => toggleTask(a)} title={a.done ? 'Mark not done' : 'Mark done'}
                        className="p-1 text-dark-400 hover:text-kcc-green">
                        {a.done ? <CheckSquare size={15} className="text-kcc-green" /> : <Square size={15} />}
                      </button>
                    )}
                    {!['stage_change', 'assignment', 'system'].includes(a.type) && (
                      <button type="button" onClick={() => deleteActivity(a)} title="Delete"
                        className="p-1 text-dark-400 hover:text-red-400">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
