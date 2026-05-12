'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Share2, Users, DollarSign, Loader2, Search,
  CheckCircle, Clock, TrendingUp
} from 'lucide-react';

export default function ReferralsPage() {
  const [referrals, setReferrals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const loadReferrals = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/referrals');
      if (res.ok) {
        const data = await res.json();
        setReferrals(Array.isArray(data) ? data : []);
      } else {
        console.error('Failed to fetch referrals:', res.statusText);
        setReferrals([]);
      }
    } catch (error) {
      console.error('Failed to fetch referrals:', error);
      setReferrals([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReferrals();
  }, [loadReferrals]);

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
        <div className="p-5 bg-dark-900 border border-dark-800 rounded-xl">
          <div className="flex items-start justify-between">
            <div className="p-2.5 rounded-lg bg-kcc-green/10">
              <Share2 size={20} className="text-kcc-green" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-bold text-dark-50">{totalReferrals}</p>
            <p className="text-sm text-dark-400 mt-0.5">Total Referrals</p>
          </div>
        </div>
        <div className="p-5 bg-dark-900 border border-dark-800 rounded-xl">
          <div className="flex items-start justify-between">
            <div className="p-2.5 rounded-lg bg-green-500/10">
              <CheckCircle size={20} className="text-green-400" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-bold text-dark-50">{creditedReferrals}</p>
            <p className="text-sm text-dark-400 mt-0.5">Credited</p>
          </div>
        </div>
        <div className="p-5 bg-dark-900 border border-dark-800 rounded-xl">
          <div className="flex items-start justify-between">
            <div className="p-2.5 rounded-lg bg-yellow-500/10">
              <Clock size={20} className="text-yellow-400" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-bold text-dark-50">{pendingReferrals}</p>
            <p className="text-sm text-dark-400 mt-0.5">Pending</p>
          </div>
        </div>
        <div className="p-5 bg-dark-900 border border-dark-800 rounded-xl">
          <div className="flex items-start justify-between">
            <div className="p-2.5 rounded-lg bg-kcc-beige/10">
              <DollarSign size={20} className="text-kcc-beige" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-bold text-dark-50">${totalCredits}</p>
            <p className="text-sm text-dark-400 mt-0.5">Total Credits Given</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute start-3 top-1/2 -translate-y-1/2 text-dark-500" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by name, email, referral code, or order number..."
          className="w-full ps-9 pe-3 py-2.5 text-sm bg-dark-900 border border-dark-800 rounded-xl text-dark-100 placeholder:text-dark-500 focus:border-kcc-green focus:outline-none"
        />
      </div>

      {/* Referrals Table */}
      <div className="bg-dark-900 border border-dark-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="animate-spin text-kcc-green" size={24} />
          </div>
        ) : filteredReferrals.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-dark-400">
            <Share2 size={32} className="mb-2" />
            <p>No referrals found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-dark-800">
                  <th className="text-start text-xs font-medium text-dark-500 uppercase tracking-wider px-5 py-3">Referrer</th>
                  <th className="text-start text-xs font-medium text-dark-500 uppercase tracking-wider px-5 py-3">Referred User</th>
                  <th className="text-start text-xs font-medium text-dark-500 uppercase tracking-wider px-5 py-3">Code</th>
                  <th className="text-center text-xs font-medium text-dark-500 uppercase tracking-wider px-5 py-3">Status</th>
                  <th className="text-end text-xs font-medium text-dark-500 uppercase tracking-wider px-5 py-3">Credit</th>
                  <th className="text-start text-xs font-medium text-dark-500 uppercase tracking-wider px-5 py-3">Order</th>
                  <th className="text-start text-xs font-medium text-dark-500 uppercase tracking-wider px-5 py-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-800">
                {filteredReferrals.map((ref) => {
                  const referrerName = ref.referrerId?.name || 'Unknown';
                  const referrerEmail = ref.referrerId?.email || '';
                  const referredName = ref.referredId?.name || 'Unknown';
                  const referredEmail = ref.referredId?.email || '';
                  const code = ref.referralCode || ref.referrerId?.referralCode || '-';
                  const orderNumber = ref.orderId?.orderNumber || null;

                  return (
                    <tr key={ref._id} className="hover:bg-dark-800/50 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-kcc-green/20 flex items-center justify-center text-kcc-green text-xs font-bold shrink-0">
                            {referrerName.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-dark-100">{referrerName}</p>
                            <p className="text-xs text-dark-500">{referrerEmail}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-kcc-beige/20 flex items-center justify-center text-kcc-beige text-xs font-bold shrink-0">
                            {referredName.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-dark-100">{referredName}</p>
                            <p className="text-xs text-dark-500">{referredEmail}</p>
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
                        <span className="text-sm font-medium text-dark-200">${ref.creditAmount || 0}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        {orderNumber ? (
                          <code className="text-xs text-kcc-green bg-kcc-green/10 px-2 py-0.5 rounded">{orderNumber}</code>
                        ) : (
                          <span className="text-xs text-dark-500">-</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-sm text-dark-400">{formatDate(ref.createdAt)}</td>
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
