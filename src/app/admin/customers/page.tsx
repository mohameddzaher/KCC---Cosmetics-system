'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useLivePoll } from '@/lib/useLivePoll';
import {
  Search, Users, Eye, ChevronLeft, ChevronRight, Loader2,
  Mail, Building2, Globe, Calendar, Plus, Trash2, X
} from 'lucide-react';
import ContactActions from '@/components/admin/ContactActions';
import { stageMeta, STAGES } from '@/components/admin/CrmPanel';

export default function CustomersPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', company: '', phone: '', whatsapp: '', stage: 'lead' });

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
      setForm({ name: '', email: '', company: '', phone: '', whatsapp: '', stage: 'lead' });
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
      {/* Search Bar */}
      <div className="flex items-center gap-3 p-4 bg-dark-900 border border-dark-800 rounded-xl">
        <div className="relative flex-1">
          <Search size={16} className="absolute start-3 top-1/2 -translate-y-1/2 text-dark-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            placeholder="Search by name, email, company, country, or referral code..."
            className="w-full ps-9 pe-3 py-2 text-sm bg-dark-950 border border-dark-700 rounded-lg text-dark-100 placeholder:text-dark-500 focus:border-kcc-green focus:outline-none"
          />
        </div>
        <div className="text-sm text-dark-400 hidden sm:block">
          {filteredCustomers.length} customer{filteredCustomers.length !== 1 ? 's' : ''}
        </div>
        <button type="button" onClick={() => setShowForm((s) => !s)}
          className="flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-dark-950 bg-kcc-green hover:bg-kcc-green-light rounded-lg transition-colors shrink-0">
          <Plus size={16} /> Add Contact
        </button>
      </div>

      {/* Add contact form */}
      {showForm && (
        <div className="bg-dark-900 border border-dark-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-dark-100">New Contact</h3>
            <button type="button" onClick={() => setShowForm(false)} className="text-dark-400 hover:text-dark-50" aria-label="Close"><X size={18} /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {([['name', 'Full Name'], ['email', 'Email'], ['company', 'Company'], ['phone', 'Phone'], ['whatsapp', 'WhatsApp']] as [string, string][]).map(([k, lbl]) => (
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

      {/* Customers Table */}
      <div className="bg-dark-900 border border-dark-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="animate-spin text-kcc-green" size={24} />
          </div>
        ) : paginatedCustomers.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-dark-400">
            <Users size={32} className="mb-2" />
            <p>No customers found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-dark-800">
                  <th className="text-start text-xs font-medium text-dark-500 uppercase tracking-wider px-5 py-3">Customer</th>
                  <th className="text-start text-xs font-medium text-dark-500 uppercase tracking-wider px-5 py-3">Email</th>
                  <th className="text-start text-xs font-medium text-dark-500 uppercase tracking-wider px-5 py-3">Company</th>
                  <th className="text-start text-xs font-medium text-dark-500 uppercase tracking-wider px-5 py-3">Country</th>
                  <th className="text-start text-xs font-medium text-dark-500 uppercase tracking-wider px-5 py-3">Referral Code</th>
                  <th className="text-start text-xs font-medium text-dark-500 uppercase tracking-wider px-5 py-3">Joined</th>
                  <th className="text-center text-xs font-medium text-dark-500 uppercase tracking-wider px-5 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-800">
                {paginatedCustomers.map((customer) => (
                  <tr key={customer._id} className="hover:bg-dark-800/50 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-kcc-green/20 flex items-center justify-center text-kcc-green text-sm font-bold shrink-0">
                          {customer.name?.charAt(0) || '?'}
                        </div>
                        <div>
                          <span className="text-sm font-medium text-dark-100">{customer.name}</span>
                          <span className={`block w-fit mt-0.5 px-1.5 py-0.5 text-[10px] font-medium rounded-full ${stageMeta(customer.stage).color}`}>
                            {stageMeta(customer.stage).label}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5 text-sm text-dark-300">
                        <Mail size={13} className="text-dark-500 shrink-0" />
                        {customer.email}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5 text-sm text-dark-300">
                        <Building2 size={13} className="text-dark-500 shrink-0" />
                        {customer.company || '-'}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5 text-sm text-dark-300">
                        <Globe size={13} className="text-dark-500 shrink-0" />
                        {customer.country || '-'}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      {customer.referralCode ? (
                        <code className="text-xs text-kcc-beige bg-kcc-beige/10 px-2 py-0.5 rounded">
                          {customer.referralCode}
                        </code>
                      ) : (
                        <span className="text-xs text-dark-500">-</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5 text-sm text-dark-400">
                        <Calendar size={13} className="text-dark-500 shrink-0" />
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
                        <Link href={`/admin/customers/${customer._id}`} className="inline-flex p-1.5 text-dark-400 hover:text-kcc-green hover:bg-dark-800 rounded-lg transition-colors" title="View profile">
                          <Eye size={16} />
                        </Link>
                        <button type="button" onClick={() => deleteCustomer(customer)} className="inline-flex p-1.5 text-dark-400 hover:text-red-400 hover:bg-dark-800 rounded-lg transition-colors" title="Delete contact">
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
          <p className="text-sm text-dark-500">Page {currentPage} of {totalPages}</p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 text-dark-400 hover:text-dark-50 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg hover:bg-dark-800"
              title="Previous page"
            >
              <ChevronLeft size={16} />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <button
                type="button"
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`w-8 h-8 text-sm rounded-lg transition-colors ${
                  currentPage === page ? 'bg-kcc-green/20 text-kcc-green font-medium' : 'text-dark-400 hover:text-dark-50 hover:bg-dark-800'
                }`}
              >
                {page}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-2 text-dark-400 hover:text-dark-50 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg hover:bg-dark-800"
              title="Next page"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
