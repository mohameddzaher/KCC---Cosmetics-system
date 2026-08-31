'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Share2, DollarSign, Loader2, Search,
  CheckCircle, Clock, Plus, Edit2, Trash2, X,
} from 'lucide-react';
import { useLivePoll } from '@/lib/useLivePoll';
import { useLanguage } from '@/contexts/LanguageContext';

export default function ReferralsPage() {
  const { tx } = useLanguage();
  const [referrals, setReferrals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ referralCode: '', referredEmail: '', creditAmount: 0, status: 'pending' });

  const loadReferrals = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch('/api/referrals', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setReferrals(Array.isArray(data) ? data : []);
      } else {
        console.error('Failed to fetch referrals:', res.statusText);
        if (!silent) setReferrals([]);
      }
    } catch (error) {
      console.error('Failed to fetch referrals:', error);
      if (!silent) setReferrals([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReferrals();
  }, [loadReferrals]);

  useLivePoll(useCallback(() => loadReferrals(true), [loadReferrals]), 20000);

  const openCreate = () => {
    setEditing(null);
    setForm({ referralCode: '', referredEmail: '', creditAmount: 0, status: 'pending' });
    setShowForm(true);
  };

  const openEdit = (ref: any) => {
    setEditing(ref);
    setForm({
      referralCode: ref.referralCode || ref.referrerId?.referralCode || '',
      referredEmail: ref.referredId?.email || '',
      creditAmount: ref.creditAmount || 0,
      status: ref.status || 'pending',
    });
    setShowForm(true);
  };

  const submit = async () => {
    setSaving(true);
    try {
      if (editing) {
        const res = await fetch(`/api/referrals/${editing._id}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: form.status, creditAmount: Number(form.creditAmount) }),
        });
        if (!res.ok) { const e = await res.json(); alert(e.error || 'Failed to update'); return; }
      } else {
        const res = await fetch('/api/referrals', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            manual: true,
            referralCode: form.referralCode,
            referredEmail: form.referredEmail,
            creditAmount: Number(form.creditAmount),
            status: form.status,
          }),
        });
        if (!res.ok) { const e = await res.json(); alert(e.error || 'Failed to create referral'); return; }
      }
      setShowForm(false); setEditing(null);
      loadReferrals();
    } finally {
      setSaving(false);
    }
  };

  const remove = async (ref: any) => {
    if (!confirm('Delete this referral? Any credited amount will be reversed from the referrer balance.')) return;
    const res = await fetch(`/api/referrals/${ref._id}`, { method: 'DELETE' });
    if (res.ok) loadReferrals();
    else { const e = await res.json(); alert(e.error || 'Failed to delete'); }
  };

  const filteredReferrals = referrals.filter(r => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const referrerName = r.referrerId?.name || '';
    const referrerEmail = r.referrerId?.email || '';
    const referredName = r.referredId?.name || '';
    const referredEmail = r.referredId?.email || '';
    const code = r.referralCode || r.referrerId?.referralCode || '';
    const orderNumber = r.orderId?.orderNumber || '';
    return (
      referrerName.toLowerCase().includes(q) ||
      referrerEmail.toLowerCase().includes(q) ||
      referredName.toLowerCase().includes(q) ||
      referredEmail.toLowerCase().includes(q) ||
      code.toLowerCase().includes(q) ||
      orderNumber.toLowerCase().includes(q)
    );
  });

  const totalReferrals = referrals.length;
  const creditedReferrals = referrals.filter(r => r.status === 'credited').length;
  const pendingReferrals = referrals.filter(r => r.status === 'pending').length;
  const totalCredits = referrals.filter(r => r.status === 'credited').reduce((sum, r) => sum + (r.creditAmount || 0), 0);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric'
    });
  };

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="p-5 bg-surface border border-line rounded-xl">
          <div className="flex items-start justify-between">
            <div className="p-2.5 rounded-lg bg-kcc-green/10">
              <Share2 size={20} className="text-kcc-green" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-bold text-fg">{totalReferrals}</p>
            <p className="text-sm text-fg-muted mt-0.5">{tx('Total Referrals')}</p>
          </div>
        </div>
        <div className="p-5 bg-surface border border-line rounded-xl">
          <div className="flex items-start justify-between">
            <div className="p-2.5 rounded-lg bg-green-500/10">
              <CheckCircle size={20} className="text-green-400" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-bold text-fg">{creditedReferrals}</p>
            <p className="text-sm text-fg-muted mt-0.5">{tx('Credited')}</p>
          </div>
        </div>
        <div className="p-5 bg-surface border border-line rounded-xl">
          <div className="flex items-start justify-between">
            <div className="p-2.5 rounded-lg bg-yellow-500/10">
              <Clock size={20} className="text-yellow-400" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-bold text-fg">{pendingReferrals}</p>
            <p className="text-sm text-fg-muted mt-0.5">{tx('Pending')}</p>
          </div>
        </div>
        <div className="p-5 bg-surface border border-line rounded-xl">
          <div className="flex items-start justify-between">
            <div className="p-2.5 rounded-lg bg-kcc-beige/10">
              <DollarSign size={20} className="text-kcc-beige" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-bold text-fg">${totalCredits}</p>
            <p className="text-sm text-fg-muted mt-0.5">{tx('Total Credits Given')}</p>
          </div>
        </div>
      </div>

      {/* Search + Add */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={16} className="absolute start-3 top-1/2 -translate-y-1/2 text-fg-subtle" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={tx('Search by name, email, referral code, or order number...')}
            className="w-full ps-9 pe-3 py-2.5 text-sm bg-surface border border-line rounded-xl text-fg placeholder:text-fg-subtle focus:border-kcc-green focus:outline-none"
          />
        </div>
        <button type="button" onClick={openCreate}
          className="flex items-center gap-2 px-3.5 py-2.5 text-sm font-medium text-brand-fg bg-brand hover:bg-brand-hover rounded-lg transition-colors">
          <Plus size={16} />{tx('Add Referral')}</button>
      </div>

      {/* Create / Edit form */}
      {showForm && (
        <div className="bg-surface border border-line rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-fg">{editing ? 'Edit Referral' : 'Add Referral'}</h3>
            <button type="button" onClick={() => { setShowForm(false); setEditing(null); }} className="text-fg-muted hover:text-fg" aria-label={tx('Close')}><X size={18} /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-fg-muted mb-1.5">{tx('Referrer Code')}</label>
              <input type="text" value={form.referralCode} disabled={!!editing}
                onChange={(e) => setForm(f => ({ ...f, referralCode: e.target.value.toUpperCase() }))}
                placeholder="ABCD1234"
                className="w-full px-3 py-2 text-sm bg-bg border border-line rounded-lg text-fg focus:border-kcc-green focus:outline-none disabled:opacity-50" />
            </div>
            <div>
              <label className="block text-xs font-medium text-fg-muted mb-1.5">{tx('Referred Email')}</label>
              <input type="email" value={form.referredEmail} disabled={!!editing}
                onChange={(e) => setForm(f => ({ ...f, referredEmail: e.target.value }))}
                placeholder={tx('customer@email.com')}
                className="w-full px-3 py-2 text-sm bg-bg border border-line rounded-lg text-fg focus:border-kcc-green focus:outline-none disabled:opacity-50" />
            </div>
            <div>
              <label className="block text-xs font-medium text-fg-muted mb-1.5">{tx('Credit Amount ($)')}</label>
              <input type="number" aria-label={tx('Credit amount')} placeholder="0" value={form.creditAmount}
                onChange={(e) => setForm(f => ({ ...f, creditAmount: Number(e.target.value) }))}
                className="w-full px-3 py-2 text-sm bg-bg border border-line rounded-lg text-fg focus:border-kcc-green focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-fg-muted mb-1.5">{tx('Status')}</label>
              <select value={form.status} onChange={(e) => setForm(f => ({ ...f, status: e.target.value }))}
                title={tx('Status')} className="w-full px-3 py-2 text-sm bg-bg border border-line rounded-lg text-fg focus:border-kcc-green focus:outline-none">
                <option value="pending">{tx('Pending')}</option>
                <option value="credited">{tx('Credited')}</option>
              </select>
            </div>
          </div>
          {editing && <p className="mt-3 text-xs text-fg-subtle">{tx('Changing the status or credit will adjust the referrer&apos;s balance automatically.')}</p>}
          <div className="flex justify-end gap-3 mt-5">
            <button type="button" onClick={() => { setShowForm(false); setEditing(null); }} className="px-4 py-2 text-sm text-fg-muted border border-line rounded-lg hover:text-fg">{tx('Cancel')}</button>
            <button type="button" onClick={submit} disabled={saving}
              className="px-4 py-2 text-sm font-medium text-brand-fg bg-brand hover:bg-brand-hover rounded-lg transition-colors disabled:opacity-50">
              {saving ? <Loader2 size={14} className="animate-spin inline mr-1" /> : null}{editing ? 'Update' : 'Create'}
            </button>
          </div>
        </div>
      )}

      {/* Referrals Table */}
      <div className="bg-surface border border-line rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="animate-spin text-kcc-green" size={24} />
          </div>
        ) : filteredReferrals.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-fg-muted">
            <Share2 size={32} className="mb-2" />
            <p>{tx('No referrals found')}</p>
          </div>
        ) : (
          <div className="scroll-thin w-full min-w-0 overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-line">
                  <th className="text-start text-xs font-medium text-fg-subtle uppercase tracking-wider px-5 py-3">{tx('Referrer')}</th>
                  <th className="text-start text-xs font-medium text-fg-subtle uppercase tracking-wider px-5 py-3">{tx('Referred User')}</th>
                  <th className="text-start text-xs font-medium text-fg-subtle uppercase tracking-wider px-5 py-3">{tx('Code')}</th>
                  <th className="text-center text-xs font-medium text-fg-subtle uppercase tracking-wider px-5 py-3">{tx('Status')}</th>
                  <th className="text-end text-xs font-medium text-fg-subtle uppercase tracking-wider px-5 py-3">{tx('Credit')}</th>
                  <th className="text-start text-xs font-medium text-fg-subtle uppercase tracking-wider px-5 py-3">{tx('Order')}</th>
                  <th className="text-start text-xs font-medium text-fg-subtle uppercase tracking-wider px-5 py-3">{tx('Date')}</th>
                  <th className="text-center text-xs font-medium text-fg-subtle uppercase tracking-wider px-5 py-3">{tx('Actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filteredReferrals.map((ref) => {
                  const referrerName = ref.referrerId?.name || 'Unknown';
                  const referrerEmail = ref.referrerId?.email || '';
                  const referredName = ref.referredId?.name || 'Unknown';
                  const referredEmail = ref.referredId?.email || '';
                  const code = ref.referralCode || ref.referrerId?.referralCode || '-';
                  const orderNumber = ref.orderId?.orderNumber || null;

                  return (
                    <tr key={ref._id} className="hover:bg-surface-2/50 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-kcc-green/20 flex items-center justify-center text-kcc-green text-xs font-bold shrink-0">
                            {referrerName.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-fg">{referrerName}</p>
                            <p className="text-xs text-fg-subtle">{referrerEmail}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-kcc-beige/20 flex items-center justify-center text-kcc-beige text-xs font-bold shrink-0">
                            {referredName.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-fg">{referredName}</p>
                            <p className="text-xs text-fg-subtle">{referredEmail}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <code className="text-xs text-kcc-beige bg-kcc-beige/10 px-2 py-0.5 rounded">{code}</code>
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${
                          ref.status === 'credited' ? 'bg-green-500/10 text-green-400' : 'bg-yellow-500/10 text-yellow-400'
                        }`}>
                          {ref.status === 'credited' ? <CheckCircle size={11} /> : <Clock size={11} />}
                          {ref.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-end">
                        <span className="text-sm font-medium text-fg">${ref.creditAmount || 0}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        {orderNumber ? (
                          <code className="text-xs text-kcc-green bg-kcc-green/10 px-2 py-0.5 rounded">{orderNumber}</code>
                        ) : (
                          <span className="text-xs text-fg-subtle">-</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-sm text-fg-muted">{formatDate(ref.createdAt)}</td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-center gap-2">
                          <button type="button" onClick={() => openEdit(ref)} title={tx('Edit')}
                            className="p-1.5 text-fg-muted hover:text-kcc-green hover:bg-surface-2 rounded-lg transition-colors"><Edit2 size={15} /></button>
                          <button type="button" onClick={() => remove(ref)} title={tx('Delete')}
                            className="p-1.5 text-fg-muted hover:text-red-400 hover:bg-surface-2 rounded-lg transition-colors"><Trash2 size={15} /></button>
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
