'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useLivePoll } from '@/lib/useLivePoll';
import {
  Search, Users, Eye, ChevronLeft, ChevronRight, Loader2,
  Mail, Building2, Globe, Calendar, Plus, Trash2, X
} from 'lucide-react';
import ContactActions from '@/components/admin/ContactActions';
import { stageMeta, STAGES } from '@/components/admin/CrmPanel';
import { useLanguage } from '@/contexts/LanguageContext';

export default function CustomersPage() {
  const { tx } = useLanguage();
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', company: '', phone: '', whatsapp: '', stage: 'lead', password: '' });

  const createContact = async () => {
    if (!form.name || !form.email) { alert('Name and email are required.'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/customers', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) { const e = await res.json(); alert(e.error || 'Failed to create'); return; }
      setShowForm(false);
      setForm({ name: '', email: '', company: '', phone: '', whatsapp: '', stage: 'lead', password: '' });
      loadCustomers();
    } finally {
      setSaving(false);
    }
  };

  const deleteCustomer = async (c: any) => {
    if (!confirm(`Delete ${c.name}? This removes the contact and its CRM history.`)) return;
    const res = await fetch(`/api/customers/${c._id}`, { method: 'DELETE' });
    if (res.ok) loadCustomers();
    else { const e = await res.json(); alert(e.error || 'Failed to delete'); }
  };

  const loadCustomers = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch('/api/customers', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setCustomers(Array.isArray(data) ? data : []);
      } else {
        console.error('Failed to fetch customers:', res.statusText);
        if (!silent) setCustomers([]);
      }
    } catch (error) {
      console.error('Failed to fetch customers:', error);
      if (!silent) setCustomers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  useLivePoll(useCallback(() => loadCustomers(true), [loadCustomers]), 20000);

  const stats = useMemo(() => {
    const startOfMonth = new Date();
    startOfMonth.setDate(1); startOfMonth.setHours(0, 0, 0, 0);
    const byStage: Record<string, number> = {};
    let activeVip = 0, leads = 0, newThisMonth = 0;
    for (const c of customers) {
      const st = c.stage || 'lead';
      byStage[st] = (byStage[st] || 0) + 1;
      if (st === 'active' || st === 'vip') activeVip++;
      if (st === 'lead') leads++;
      if (c.createdAt && new Date(c.createdAt) >= startOfMonth) newThisMonth++;
    }
    return { total: customers.length, byStage, activeVip, leads, newThisMonth };
  }, [customers]);

  const filteredCustomers = customers.filter(c => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.name?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.company?.toLowerCase().includes(q) ||
      c.country?.toLowerCase().includes(q) ||
      c.referralCode?.toLowerCase().includes(q)
    );
  });

  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage);
  const paginatedCustomers = filteredCustomers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric'
    });
  };

  return (
    <div className="space-y-6">
      {/* Section analytics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label={tx('Total Contacts')} value={stats.total} tone="text-kcc-green" />
        <StatCard label={tx('Active + VIP')} value={stats.activeVip} tone="text-blue-400" />
        <StatCard label={tx('Leads')} value={stats.leads} tone="text-yellow-400" />
        <StatCard label={tx('New This Month')} value={stats.newThisMonth} tone="text-purple-400" />
      </div>
      <div className="flex flex-wrap gap-2">
        {STAGES.map((s) => (
          <span key={s.key} className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full ${s.color}`}>
            {s.label}: {stats.byStage[s.key] || 0}
          </span>
        ))}
      </div>

      {/* Search Bar */}
      <div className="flex items-center gap-3 p-4 bg-surface border border-line rounded-xl">
        <div className="relative flex-1">
          <Search size={16} className="absolute start-3 top-1/2 -translate-y-1/2 text-fg-subtle" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            placeholder={tx('Search by name, email, company, country, or referral code...')}
            className="w-full ps-9 pe-3 py-2 text-sm bg-bg border border-line rounded-lg text-fg placeholder:text-fg-subtle focus:border-kcc-green focus:outline-none"
          />
        </div>
        <div className="text-sm text-fg-muted hidden sm:block">
          {filteredCustomers.length} customer{filteredCustomers.length !== 1 ? 's' : ''}
        </div>
        <button type="button" onClick={() => setShowForm((s) => !s)}
          className="flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-brand-fg bg-brand hover:bg-brand-hover rounded-lg transition-colors shrink-0">
          <Plus size={16} />{tx('Add Contact')}</button>
      </div>

      {/* Add contact form */}
      {showForm && (
        <div className="bg-surface border border-line rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-fg">{tx('New Contact')}</h3>
            <button type="button" onClick={() => setShowForm(false)} className="text-fg-muted hover:text-fg" aria-label={tx('Close')}><X size={18} /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {([['name', 'Full Name'], ['email', 'Email'], ['company', 'Company'], ['phone', 'Phone'], ['whatsapp', 'WhatsApp']] as [string, string][]).map(([k, lbl]) => (
              <div key={k}>
                <label className="block text-xs font-medium text-fg-muted mb-1.5">{lbl}</label>
                <input type="text" aria-label={lbl} value={(form as any)[k]}
                  onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))}
                  className="w-full px-3 py-2 text-sm bg-bg border border-line rounded-lg text-fg focus:border-kcc-green focus:outline-none" />
              </div>
            ))}
            <div>
              <label className="block text-xs font-medium text-fg-muted mb-1.5">{tx('Stage')}</label>
              <select value={form.stage} onChange={(e) => setForm((f) => ({ ...f, stage: e.target.value }))}
                title={tx('Stage')} className="w-full px-3 py-2 text-sm bg-bg border border-line rounded-lg text-fg focus:border-kcc-green focus:outline-none">
                {STAGES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-fg-muted mb-1.5">{tx('Login Password (optional)')}</label>
              <input type="text" aria-label={tx('Login password')} value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                placeholder={tx('Give them a password to sign in')}
                className="w-full px-3 py-2 text-sm bg-bg border border-line rounded-lg text-fg focus:border-kcc-green focus:outline-none" />
            </div>
          </div>
          <p className="mt-3 text-xs text-fg-subtle">Username is the email. Set a password now (or later from the profile) so the customer can sign in and place requests.</p>
          <div className="flex justify-end gap-3 mt-5">
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-fg-muted border border-line rounded-lg hover:text-fg">{tx('Cancel')}</button>
            <button type="button" onClick={createContact} disabled={saving}
              className="px-4 py-2 text-sm font-medium text-brand-fg bg-brand hover:bg-brand-hover rounded-lg transition-colors disabled:opacity-50">
              {saving ? <Loader2 size={14} className="animate-spin inline mr-1" /> : null}Create
            </button>
          </div>
        </div>
      )}

      {/* Customers Table */}
      <div className="bg-surface border border-line rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="animate-spin text-kcc-green" size={24} />
          </div>
        ) : paginatedCustomers.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-fg-muted">
            <Users size={32} className="mb-2" />
            <p>{tx('No customers found')}</p>
          </div>
        ) : (
          <div className="scroll-thin w-full min-w-0 overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-line">
                  <th className="text-start text-xs font-medium text-fg-subtle uppercase tracking-wider px-5 py-3">{tx('Customer')}</th>
                  <th className="text-start text-xs font-medium text-fg-subtle uppercase tracking-wider px-5 py-3">{tx('Email')}</th>
                  <th className="text-start text-xs font-medium text-fg-subtle uppercase tracking-wider px-5 py-3">{tx('Company')}</th>
                  <th className="text-start text-xs font-medium text-fg-subtle uppercase tracking-wider px-5 py-3">{tx('Country')}</th>
                  <th className="text-start text-xs font-medium text-fg-subtle uppercase tracking-wider px-5 py-3">{tx('Referral Code')}</th>
                  <th className="text-start text-xs font-medium text-fg-subtle uppercase tracking-wider px-5 py-3">{tx('Joined')}</th>
                  <th className="text-center text-xs font-medium text-fg-subtle uppercase tracking-wider px-5 py-3">{tx('Actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {paginatedCustomers.map((customer) => (
                  <tr key={customer._id} className="hover:bg-surface-2/50 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-kcc-green/20 flex items-center justify-center text-kcc-green text-sm font-bold shrink-0">
                          {customer.name?.charAt(0) || '?'}
                        </div>
                        <div>
                          <span className="text-sm font-medium text-fg">{customer.name}</span>
                          <span className={`block w-fit mt-0.5 px-1.5 py-0.5 text-[10px] font-medium rounded-full ${stageMeta(customer.stage).color}`}>
                            {stageMeta(customer.stage).label}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5 text-sm text-fg-muted">
                        <Mail size={13} className="text-fg-subtle shrink-0" />
                        {customer.email}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5 text-sm text-fg-muted">
                        <Building2 size={13} className="text-fg-subtle shrink-0" />
                        {customer.company || '-'}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5 text-sm text-fg-muted">
                        <Globe size={13} className="text-fg-subtle shrink-0" />
                        {customer.country || '-'}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      {customer.referralCode ? (
                        <code className="text-xs text-kcc-beige bg-kcc-beige/10 px-2 py-0.5 rounded">
                          {customer.referralCode}
                        </code>
                      ) : (
                        <span className="text-xs text-fg-subtle">-</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5 text-sm text-fg-muted">
                        <Calendar size={13} className="text-fg-subtle shrink-0" />
                        {customer.createdAt ? formatDate(customer.createdAt) : '-'}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-center gap-2">
                        <ContactActions
                          phone={customer.phone} whatsapp={customer.whatsapp}
                          email={customer.email} website={customer.website}
                          size={14}
                        />
                        <Link href={`/admin/customers/${customer._id}`} className="inline-flex p-1.5 text-fg-muted hover:text-kcc-green hover:bg-surface-2 rounded-lg transition-colors" title={tx('View profile')}>
                          <Eye size={16} />
                        </Link>
                        <button type="button" onClick={() => deleteCustomer(customer)} className="inline-flex p-1.5 text-fg-muted hover:text-red-400 hover:bg-surface-2 rounded-lg transition-colors" title={tx('Delete contact')}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-fg-subtle">Page {currentPage} of {totalPages}</p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 text-fg-muted hover:text-fg disabled:opacity-30 disabled:cursor-not-allowed rounded-lg hover:bg-surface-2"
              title={tx('Previous page')}
            >
              <ChevronLeft size={16} />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <button
                type="button"
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`w-8 h-8 text-sm rounded-lg transition-colors ${
                  currentPage === page ? 'bg-kcc-green/20 text-kcc-green font-medium' : 'text-fg-muted hover:text-fg hover:bg-surface-2'
                }`}
              >
                {page}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-2 text-fg-muted hover:text-fg disabled:opacity-30 disabled:cursor-not-allowed rounded-lg hover:bg-surface-2"
              title={tx('Next page')}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="p-4 bg-surface border border-line rounded-xl">
      <span className="text-xs text-fg-muted">{label}</span>
      <p className={`text-2xl font-bold mt-1.5 ${tone}`}>{value}</p>
    </div>
  );
}
