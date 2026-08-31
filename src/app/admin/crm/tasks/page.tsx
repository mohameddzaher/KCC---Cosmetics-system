'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  Loader2, ArrowLeft, CheckSquare, Square, CalendarClock,
  ListTodo, AlertTriangle,
} from 'lucide-react';
import ContactActions from '@/components/admin/ContactActions';
import { useLivePoll } from '@/lib/useLivePoll';
import { useLanguage } from '@/contexts/LanguageContext';

const FILTERS = [
  { key: 'open', label: 'Open' },
  { key: 'done', label: 'Completed' },
  { key: 'all', label: 'All' },
];

export default function CrmTasksPage() {
  const { tx } = useLanguage();
  const [tasks, setTasks] = useState<any[]>([]);
  const [filter, setFilter] = useState('open');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch(`/api/crm/tasks?status=${filter}`, { cache: 'no-store' });
      const data = res.ok ? await res.json() : [];
      setTasks(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { load(); }, [load]);
  useLivePoll(useCallback(() => load(true), [load]), 20000);

  const toggle = async (task: any) => {
    const cid = task.customerId?._id;
    if (!cid) return;
    await fetch(`/api/customers/${cid}/activities/${task._id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ done: !task.done }),
    });
    load(true);
  };

  const isOverdue = (t: any) => t.dueDate && !t.done && new Date(t.dueDate) < new Date();

  const fmtDue = (d: string) =>
    new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/admin/crm" className="p-2 text-fg-muted hover:text-kcc-green hover:bg-surface-2 rounded-lg transition-colors">
            <ArrowLeft size={18} />
          </Link>
          <h1 className="text-lg font-semibold text-fg flex items-center gap-2">
            <ListTodo size={18} className="text-kcc-green" />{tx('Follow-up Tasks')}</h1>
        </div>
        <div className="flex gap-2">
          {FILTERS.map((f) => (
            <button key={f.key} type="button" onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                filter === f.key ? 'bg-kcc-green/10 text-kcc-green border-kcc-green/40' : 'text-fg-muted border-line hover:text-fg'
              }`}>{f.label}</button>
          ))}
        </div>
      </div>

      <div className="bg-surface border border-line rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48"><Loader2 className="animate-spin text-kcc-green" size={24} /></div>
        ) : tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-fg-muted">
            <ListTodo size={32} className="mb-2" />
            <p>No {filter === 'all' ? '' : filter} tasks</p>
          </div>
        ) : (
          <div className="divide-y divide-line">
            {tasks.map((t) => {
              const c = t.customerId;
              const overdue = isOverdue(t);
              return (
                <div key={t._id} className={`flex items-start gap-3 p-4 ${overdue ? 'bg-red-500/5' : ''}`}>
                  <button type="button" onClick={() => toggle(t)} title={t.done ? 'Mark open' : 'Mark done'}
                    className="mt-0.5 text-fg-muted hover:text-kcc-green">
                    {t.done ? <CheckSquare size={18} className="text-kcc-green" /> : <Square size={18} />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${t.done ? 'text-fg-subtle line-through' : 'text-fg'}`}>{t.body}</p>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      {c && (
                        <Link href={`/admin/customers/${c._id}`} className="text-xs text-fg-muted hover:text-kcc-green">
                          {c.name}{c.company ? ` · ${c.company}` : ''}
                        </Link>
                      )}
                      {t.dueDate && (
                        <span className={`text-xs flex items-center gap-1 ${overdue ? 'text-red-400' : 'text-fg-subtle'}`}>
                          {overdue ? <AlertTriangle size={11} /> : <CalendarClock size={11} />}
                          {overdue ? 'Overdue · ' : 'Due '}{fmtDue(t.dueDate)}
                        </span>
                      )}
                    </div>
                  </div>
                  {c && (
                    <ContactActions phone={c.phone} whatsapp={c.whatsapp} email={c.email} size={14} />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
