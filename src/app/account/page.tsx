'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { User, Package, ShoppingBag, Copy, Check, ArrowRight, Calendar } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';

// Demo data
const demoRecentOrders = [
  { id: 'KCC-S-001', type: 'sample' as const, status: 'In Production', product: 'Vitamin C Serum', date: '2024-12-10' },
  { id: 'KCC-B-002', type: 'bulk' as const, status: 'Delivered', product: 'Hydrating Cream', date: '2024-11-28' },
  { id: 'KCC-S-003', type: 'sample' as const, status: 'Under Review', product: 'Anti-Aging Serum', date: '2024-12-20' },
];

const statusColors: Record<string, string> = {
  Submitted: 'bg-blue-500/10 text-blue-400',
  'Under Review': 'bg-yellow-500/10 text-yellow-400',
  Approved: 'bg-green-500/10 text-green-400',
  'In Production': 'bg-purple-500/10 text-purple-400',
  Shipped: 'bg-cyan-500/10 text-cyan-400',
  Delivered: 'bg-kcc-green/10 text-kcc-green',
  Closed: 'bg-dark-600/10 text-dark-400',
};

export default function AccountPage() {
  const { t, locale } = useLanguage();
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);

  const referralCode = 'KCC-REF-' + (user?.name?.substring(0, 3).toUpperCase() || 'USR') + '2024';

  const copyReferralCode = () => {
    navigator.clipboard.writeText(referralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!user) return null;

  return (
    <div className="space-y-6">
      {/* Profile Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-dark-900/50 border border-dark-800 rounded-2xl p-6"
      >
        <div className="flex items-start gap-5">
          <div className="w-16 h-16 rounded-2xl bg-kcc-green/10 flex items-center justify-center text-kcc-green">
            <User size={28} />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-dark-50 mb-1">{user.name}</h1>
            <p className="text-sm text-dark-400 mb-1">{user.email}</p>
            {user.company && (
              <p className="text-sm text-dark-500">{user.company}</p>
            )}
            <span className="inline-block mt-2 px-3 py-1 text-xs font-medium bg-kcc-green/10 text-kcc-green rounded-full">
              {user.role}
            </span>
          </div>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid sm:grid-cols-2 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="p-5 bg-dark-900/50 border border-dark-800 rounded-2xl"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-kcc-green/10 text-kcc-green flex items-center justify-center">
              <Package size={20} />
            </div>
            <span className="text-sm text-dark-400">{t('account.totalSamples')}</span>
          </div>
          <p className="text-3xl font-bold text-dark-50">3</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="p-5 bg-dark-900/50 border border-dark-800 rounded-2xl"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-kcc-beige/10 text-kcc-beige flex items-center justify-center">
              <ShoppingBag size={20} />
            </div>
            <span className="text-sm text-dark-400">{t('account.totalBulk')}</span>
          </div>
          <p className="text-3xl font-bold text-dark-50">1</p>
        </motion.div>
      </div>

      {/* Referral Code */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="p-5 bg-dark-900/50 border border-dark-800 rounded-2xl"
      >
        <h3 className="text-sm font-semibold text-dark-200 uppercase tracking-wider mb-3">{t('account.referralCode')}</h3>
        <div className="flex items-center gap-3">
          <div className="flex-1 px-4 py-3 bg-dark-800 border border-dark-700 rounded-xl font-mono text-dark-50 text-sm">
            {referralCode}
          </div>
          <button
            onClick={copyReferralCode}
            className="px-4 py-3 bg-dark-700 hover:bg-dark-600 text-dark-300 hover:text-dark-50 rounded-xl transition-colors flex items-center gap-2"
          >
            {copied ? <Check size={16} className="text-kcc-green" /> : <Copy size={16} />}
            <span className="text-sm">{copied ? t('common.copied') : t('common.copy')}</span>
          </button>
        </div>
        <p className="text-xs text-dark-500 mt-2">{t('account.referralDesc')}</p>
      </motion.div>

      {/* Recent Orders */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="bg-dark-900/50 border border-dark-800 rounded-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-dark-800">
          <h3 className="text-sm font-semibold text-dark-200 uppercase tracking-wider">{t('account.recentOrders')}</h3>
          <Link href="/account/my-samples" className="text-xs text-kcc-green hover:text-kcc-green-light transition-colors flex items-center gap-1">
            {t('common.viewAll')}
            <ArrowRight size={12} />
          </Link>
        </div>

        <div className="divide-y divide-dark-800/50">
          {demoRecentOrders.map((order) => (
            <div key={order.id} className="flex items-center justify-between px-6 py-4">
              <div className="flex items-center gap-4 min-w-0">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                  order.type === 'sample' ? 'bg-kcc-green/10 text-kcc-green' : 'bg-kcc-beige/10 text-kcc-beige'
                }`}>
                  {order.type === 'sample' ? <Package size={16} /> : <ShoppingBag size={16} />}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-dark-50 truncate">{order.product}</p>
                  <p className="text-xs text-dark-500 flex items-center gap-1">
                    <span className="font-mono">{order.id}</span>
                    <span className="mx-1">-</span>
                    <Calendar size={10} />
                    {new Date(order.date).toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-US', { month: 'short', day: 'numeric' })}
                  </p>
                </div>
              </div>
              <span className={`px-2.5 py-1 text-xs font-medium rounded-full shrink-0 ${statusColors[order.status] || 'bg-dark-700 text-dark-400'}`}>
                {t(`statuses.${order.status}`)}
              </span>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
