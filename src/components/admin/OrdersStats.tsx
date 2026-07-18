'use client';

import { useEffect, useState, useCallback } from 'react';
import { ShoppingCart, Package, DollarSign, Clock, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useLivePoll } from '@/lib/useLivePoll';

const STATUS_COLORS: Record<string, string> = {
  Submitted: '#3b82f6', 'Under Review': '#eab308', Approved: '#22c55e',
  'Quotation Sent': '#f97316', 'Awaiting Payment': '#f59e0b', 'In Production': '#a855f7',
  Shipped: '#06b6d4', Delivered: '#10b981', Closed: '#64748b',
};

const money = (n: number) => (n >= 1000 ? `$${(n / 1000).toFixed(1)}K` : `$${n.toLocaleString()}`);

export default function OrdersStats() {
  const [s, setS] = useState<any>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/orders/stats', { cache: 'no-store' });
      if (res.ok) setS(await res.json());
    } catch { /* ignore */ }
  }, []);
  useEffect(() => { load(); }, [load]);
  useLivePoll(load, 20000);

  if (!s) return null;

  const pending = (s.byStatus?.['Submitted'] || 0) + (s.byStatus?.['Under Review'] || 0);
  const cards = [
    { label: 'Total Orders', value: s.total, icon: ShoppingCart, color: 'text-kcc-green' },
    { label: 'This Month', value: s.thisMonth, icon: TrendingUp, color: 'text-blue-400' },
    { label: 'Order Value', value: money(s.revenue), icon: DollarSign, color: 'text-green-400' },
    { label: 'Needs Action', value: pending, icon: Clock, color: 'text-yellow-400' },
  ];

  const statusData = Object.entries(s.byStatus || {}).map(([k, v]) => ({ name: k, value: v as number }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2 grid grid-cols-2 gap-4">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.label} className="p-4 bg-dark-900 border border-dark-800 rounded-xl">
              <div className="flex items-center justify-between">
                <span className="text-xs text-dark-400">{c.label}</span>
                <Icon size={16} className={c.color} />
              </div>
              <p className="text-2xl font-bold text-dark-50 mt-1.5">{c.value}</p>
            </div>
          );
        })}
      </div>
      <div className="p-4 bg-dark-900 border border-dark-800 rounded-xl">
        <p className="text-xs text-dark-400 mb-2">By Status</p>
        {statusData.length === 0 ? (
          <div className="h-24 flex items-center justify-center text-xs text-dark-600">No data</div>
        ) : (
          <ResponsiveContainer width="100%" height={96}>
            <BarChart data={statusData}>
              <XAxis dataKey="name" hide />
              <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {statusData.map((d) => <Cell key={d.name} fill={STATUS_COLORS[d.name] || '#64748b'} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
