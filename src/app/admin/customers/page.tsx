'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Search, Users, Eye, ChevronLeft, ChevronRight, Loader2,
  Mail, Building2, Globe, Calendar, Hash
} from 'lucide-react';

export default function CustomersPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/customers');
      if (res.ok) {
        const data = await res.json();
        setCustomers(Array.isArray(data) ? data : []);
      } else {
        console.error('Failed to fetch customers:', res.statusText);
        setCustomers([]);
      }
    } catch (error) {
      console.error('Failed to fetch customers:', error);
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  };

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
        <div className="text-sm text-dark-400">
          {filteredCustomers.length} customer{filteredCustomers.length !== 1 ? 's' : ''}
        </div>
      </div>

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
                        <span className="text-sm font-medium text-dark-100">{customer.name}</span>
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
                    <td className="px-5 py-3.5 text-center">
                      <Link href={`/admin/customers/${customer._id}`} className="inline-flex p-1.5 text-dark-400 hover:text-kcc-green hover:bg-dark-800 rounded-lg transition-colors">
                        <Eye size={16} />
                      </Link>
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
