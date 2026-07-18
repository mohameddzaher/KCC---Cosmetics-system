'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Inbox, Mail, Loader2, Trash2, Building2, Phone, Search, Users,
} from 'lucide-react';
import { useLivePoll } from '@/lib/useLivePoll';

type Tab = 'messages' | 'subscribers';

export default function InboxPage() {
  const [tab, setTab] = useState<Tab>('messages');
  const [messages, setMessages] = useState<any[]>([]);
  const [subs, setSubs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [mRes, sRes] = await Promise.allSettled([
        fetch('/api/contact', { cache: 'no-store' }),
        fetch('/api/newsletter', { cache: 'no-store' }),
      ]);
      if (mRes.status === 'fulfilled' && mRes.value.ok) setMessages(await mRes.value.json());
      if (sRes.status === 'fulfilled' && sRes.value.ok) setSubs(await sRes.value.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useLivePoll(useCallback(() => load(true), [load]), 30000);

  const delMessage = async (id: string) => {
    if (!confirm('Delete this message?')) return;
    const res = await fetch(`/api/contact?id=${id}`, { method: 'DELETE' });
    if (res.ok) load(true);
  };
  const delSub = async (id: string) => {
    if (!confirm('Remove this subscriber?')) return;
    const res = await fetch(`/api/newsletter?id=${id}`, { method: 'DELETE' });
    if (res.ok) load(true);
  };

  const fmt = (d: string) => new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  const filteredMsgs = messages.filter((m) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return [m.name, m.email, m.company, m.message].some((v) => v?.toLowerCase?.().includes(q));
  });
  const filteredSubs = subs.filter((s) => !search || s.email?.toLowerCase().includes(search.toLowerCase()));

  const exportSubs = () => {
    const csv = 'email,subscribed_at\n' + subs.map((s) => `${s.email},${s.createdAt || ''}`).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'subscribers.csv';
    a.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          {([['messages', `Messages (${messages.length})`, Mail], ['subscribers', `Subscribers (${subs.length})`, Users]] as const).map(([k, label, Icon]) => (
            <button key={k} type="button" onClick={() => setTab(k as Tab)}
              className={`flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-lg border transition-colors ${
                tab === k ? 'bg-kcc-green/10 text-kcc-green border-kcc-green/40' : 'text-dark-400 border-dark-800 hover:text-dark-100'}`}>
              <Icon size={15} /> {label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={15} className="absolute start-3 top-1/2 -translate-y-1/2 text-dark-500" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..."
              className="ps-9 pe-3 py-2 text-sm bg-dark-900 border border-dark-800 rounded-lg text-dark-100 focus:border-kcc-green focus:outline-none w-52" />
          </div>
          {tab === 'subscribers' && subs.length > 0 && (
            <button type="button" onClick={exportSubs} className="px-3 py-2 text-sm text-dark-200 border border-dark-800 rounded-lg hover:border-dark-700">Export CSV</button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48"><Loader2 className="animate-spin text-kcc-green" size={24} /></div>
      ) : tab === 'messages' ? (
        filteredMsgs.length === 0 ? (
          <Empty icon={Inbox} text="No messages yet" />
        ) : (
          <div className="space-y-3">
            {filteredMsgs.map((m) => (
              <div key={m._id} className="bg-dark-900 border border-dark-800 rounded-xl p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-dark-50">{m.name}</span>
                      <a href={`mailto:${m.email}`} className="text-xs text-kcc-green hover:underline flex items-center gap-1"><Mail size={11} />{m.email}</a>
                      {m.company && <span className="text-xs text-dark-500 flex items-center gap-1"><Building2 size={11} />{m.company}</span>}
                      {m.phone && <a href={`tel:${m.phone}`} className="text-xs text-dark-400 flex items-center gap-1"><Phone size={11} />{m.phone}</a>}
                    </div>
                    <p className="text-sm text-dark-200 mt-2 whitespace-pre-wrap">{m.message}</p>
                    <p className="text-[11px] text-dark-600 mt-2">{fmt(m.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <a href={`mailto:${m.email}`} className="p-1.5 text-dark-400 hover:text-kcc-green hover:bg-dark-800 rounded-lg" title="Reply"><Mail size={15} /></a>
                    <button type="button" onClick={() => delMessage(m._id)} className="p-1.5 text-dark-400 hover:text-red-400 hover:bg-dark-800 rounded-lg" title="Delete"><Trash2 size={15} /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      ) : filteredSubs.length === 0 ? (
        <Empty icon={Users} text="No subscribers yet" />
      ) : (
        <div className="bg-dark-900 border border-dark-800 rounded-xl overflow-hidden divide-y divide-dark-800">
          {filteredSubs.map((s) => (
            <div key={s._id} className="flex items-center justify-between px-5 py-3">
              <a href={`mailto:${s.email}`} className="text-sm text-dark-100 hover:text-kcc-green flex items-center gap-2"><Mail size={14} className="text-dark-500" />{s.email}</a>
              <div className="flex items-center gap-3">
                <span className="text-xs text-dark-500">{s.createdAt ? fmt(s.createdAt) : ''}</span>
                <button type="button" onClick={() => delSub(s._id)} className="p-1.5 text-dark-400 hover:text-red-400 hover:bg-dark-800 rounded-lg" title="Remove"><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Empty({ icon: Icon, text }: { icon: any; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-48 text-dark-400 bg-dark-900 border border-dark-800 rounded-xl">
      <Icon size={30} className="mb-2" /><p>{text}</p>
    </div>
  );
}
