'use client';

import { useEffect, useState } from 'react';
import {
  DollarSign, FileText, CreditCard, Receipt, BarChart3,
  Loader2, TrendingUp, TrendingDown, Plus, Eye, Download, Save
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer
} from 'recharts';

const invoiceStatusClasses: Record<string, string> = {
  draft: 'bg-dark-700 text-dark-300',
  sent: 'bg-blue-500/10 text-blue-400',
  paid: 'bg-green-500/10 text-green-400',
  overdue: 'bg-red-500/10 text-red-400',
  cancelled: 'bg-dark-600 text-dark-400',
};

export default function AccountingPage() {
  const [activeTab, setActiveTab] = useState<'invoices' | 'payments' | 'expenses' | 'reports'>('invoices');
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [profitReport, setProfitReport] = useState<any>(null);

  useEffect(() => {
    setMounted(true);
    fetchAccountingData();
  }, []);

  const fetchAccountingData = async () => {
    setLoading(true);
    try {
      const [invoicesRes, paymentsRes, expensesRes, profitRes] = await Promise.allSettled([
        fetch('/api/accounting/invoices'),
        fetch('/api/accounting/payments'),
        fetch('/api/accounting/expenses'),
        fetch('/api/accounting/reports?type=profit'),
      ]);

      if (invoicesRes.status === 'fulfilled' && invoicesRes.value.ok) {
        const data = await invoicesRes.value.json();
        setInvoices(Array.isArray(data) ? data : []);
      }
      if (paymentsRes.status === 'fulfilled' && paymentsRes.value.ok) {
        const data = await paymentsRes.value.json();
        setPayments(Array.isArray(data) ? data : []);
      }
      if (expensesRes.status === 'fulfilled' && expensesRes.value.ok) {
        const data = await expensesRes.value.json();
        setExpenses(Array.isArray(data) ? data : []);
      }
      if (profitRes.status === 'fulfilled' && profitRes.value.ok) {
        const data = await profitRes.value.json();
        setProfitReport(data.report || null);
      }
    } catch (error) {
      console.error('Failed to fetch accounting data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Compute summary from real data
  const totalRevenue = payments
    .filter((p: any) => p.status === 'completed')
    .reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
  const outstandingInvoices = invoices
    .filter((inv: any) => ['draft', 'sent', 'overdue'].includes(inv.status))
    .reduce((sum: number, inv: any) => sum + (inv.total || 0), 0);
  const totalExpenses = expenses.reduce((sum: number, e: any) => sum + (e.amount || 0), 0);
  const netProfit = totalRevenue - totalExpenses;

  // Build chart data from payments and expenses grouped by month
  const revenueChartData: { month: string; revenue: number; expenses: number }[] = [];
  const months = new Map<string, { revenue: number; expenses: number }>();
  payments.filter((p: any) => p.status === 'completed').forEach((p: any) => {
    const d = new Date(p.paidAt || p.createdAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('en-US', { month: 'short' });
    if (!months.has(key)) months.set(key, { revenue: 0, expenses: 0 });
    months.get(key)!.revenue += p.amount || 0;
  });
  expenses.forEach((e: any) => {
    const d = new Date(e.date || e.createdAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!months.has(key)) months.set(key, { revenue: 0, expenses: 0 });
    months.get(key)!.expenses += e.amount || 0;
  });
  Array.from(months.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .forEach(([key, data]) => {
      const [y, m] = key.split('-');
      const label = new Date(Number(y), Number(m) - 1).toLocaleDateString('en-US', { month: 'short' });
      revenueChartData.push({ month: label, ...data });
    });

  const summaryCards = [
    { label: 'Total Revenue', value: totalRevenue, icon: DollarSign, color: 'text-kcc-green', bg: 'bg-kcc-green/10' },
    { label: 'Outstanding Invoices', value: outstandingInvoices, icon: FileText, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
    { label: 'Total Expenses', value: totalExpenses, icon: Receipt, color: 'text-red-400', bg: 'bg-red-500/10' },
    { label: 'Net Profit', value: netProfit, icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  ];

  const tabs = [
    { key: 'invoices' as const, label: 'Invoices', icon: FileText },
    { key: 'payments' as const, label: 'Payments', icon: CreditCard },
    { key: 'expenses' as const, label: 'Expenses', icon: Receipt },
    { key: 'reports' as const, label: 'Reports', icon: BarChart3 },
  ];

  if (!mounted) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-kcc-green" size={24} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {summaryCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <div key={i} className="p-5 bg-dark-900 border border-dark-800 rounded-xl">
              <div className="flex items-start justify-between">
                <div className={`p-2.5 rounded-lg ${card.bg}`}>
                  <Icon size={20} className={card.color} />
                </div>
              </div>
              <div className="mt-3">
                <p className="text-2xl font-bold text-dark-50">${card.value.toLocaleString()}</p>
                <p className="text-sm text-dark-400 mt-0.5">{card.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Revenue Chart */}
      {revenueChartData.length > 0 && (
        <div className="bg-dark-900 border border-dark-800 rounded-xl p-5">
          <h2 className="text-base font-semibold text-dark-50 mb-4">Revenue vs Expenses</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="month" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    border: '1px solid #1e293b',
                    borderRadius: '8px',
                    color: '#f8fafc',
                    fontSize: '12px',
                  }}
                  formatter={(value) => [`$${(value ?? 0).toLocaleString()}`, '']}
                />
                <Bar dataKey="revenue" fill="#2D6A4F" radius={[4, 4, 0, 0]} name="Revenue" />
                <Bar dataKey="expenses" fill="#D4A574" radius={[4, 4, 0, 0]} name="Expenses" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-1 p-0.5 bg-dark-900 border border-dark-800 rounded-lg w-fit">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              type="button"
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === tab.key ? 'bg-kcc-green/20 text-kcc-green' : 'text-dark-400 hover:text-dark-200'
              }`}
            >
              <Icon size={15} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="bg-dark-900 border border-dark-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="animate-spin text-kcc-green" size={24} />
          </div>
        ) : activeTab === 'invoices' ? (
          <>
            <div className="flex items-center justify-between p-5 border-b border-dark-800">
              <h3 className="text-sm font-semibold text-dark-100">Invoices ({invoices.length})</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-dark-800">
                    <th className="text-start text-xs font-medium text-dark-500 uppercase tracking-wider px-5 py-3">Invoice #</th>
                    <th className="text-start text-xs font-medium text-dark-500 uppercase tracking-wider px-5 py-3">Customer</th>
                    <th className="text-end text-xs font-medium text-dark-500 uppercase tracking-wider px-5 py-3">Total</th>
                    <th className="text-center text-xs font-medium text-dark-500 uppercase tracking-wider px-5 py-3">Status</th>
                    <th className="text-start text-xs font-medium text-dark-500 uppercase tracking-wider px-5 py-3">Due Date</th>
                    <th className="text-start text-xs font-medium text-dark-500 uppercase tracking-wider px-5 py-3">Paid</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-800">
                  {invoices.map((inv: any) => (
                    <tr key={inv._id} className="hover:bg-dark-800/50 transition-colors">
                      <td className="px-5 py-3.5 text-sm font-medium text-dark-100">{inv.invoiceNumber}</td>
                      <td className="px-5 py-3.5 text-sm text-dark-300">{inv.userId?.name || inv.userId?.email || '-'}</td>
                      <td className="px-5 py-3.5 text-end text-sm font-medium text-dark-200">${(inv.total || 0).toLocaleString()}</td>
                      <td className="px-5 py-3.5 text-center">
                        <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full capitalize ${invoiceStatusClasses[inv.status] || ''}`}>
                          {inv.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-dark-400">{formatDate(inv.dueDate)}</td>
                      <td className="px-5 py-3.5 text-sm text-dark-400">{formatDate(inv.paidAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {invoices.length === 0 && (
                <div className="flex flex-col items-center justify-center h-32 text-dark-400">
                  <FileText size={28} className="mb-2" />
                  <p className="text-sm">No invoices found</p>
                </div>
              )}
            </div>
          </>
        ) : activeTab === 'payments' ? (
          <>
            <div className="flex items-center justify-between p-5 border-b border-dark-800">
              <h3 className="text-sm font-semibold text-dark-100">Payments ({payments.length})</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-dark-800">
                    <th className="text-start text-xs font-medium text-dark-500 uppercase tracking-wider px-5 py-3">Reference</th>
                    <th className="text-start text-xs font-medium text-dark-500 uppercase tracking-wider px-5 py-3">Invoice</th>
                    <th className="text-start text-xs font-medium text-dark-500 uppercase tracking-wider px-5 py-3">Customer</th>
                    <th className="text-end text-xs font-medium text-dark-500 uppercase tracking-wider px-5 py-3">Amount</th>
                    <th className="text-start text-xs font-medium text-dark-500 uppercase tracking-wider px-5 py-3">Method</th>
                    <th className="text-start text-xs font-medium text-dark-500 uppercase tracking-wider px-5 py-3">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-800">
                  {payments.map((pay: any) => (
                    <tr key={pay._id} className="hover:bg-dark-800/50 transition-colors">
                      <td className="px-5 py-3.5 text-sm font-medium text-dark-100">{pay.reference || pay._id?.slice(-8)}</td>
                      <td className="px-5 py-3.5 text-sm text-kcc-green">{pay.invoiceId?.invoiceNumber || '-'}</td>
                      <td className="px-5 py-3.5 text-sm text-dark-300">{pay.userId?.name || '-'}</td>
                      <td className="px-5 py-3.5 text-end text-sm font-medium text-green-400">${(pay.amount || 0).toLocaleString()}</td>
                      <td className="px-5 py-3.5 text-sm text-dark-400">{pay.method}</td>
                      <td className="px-5 py-3.5 text-sm text-dark-400">{formatDate(pay.paidAt || pay.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {payments.length === 0 && (
                <div className="flex flex-col items-center justify-center h-32 text-dark-400">
                  <CreditCard size={28} className="mb-2" />
                  <p className="text-sm">No payments found</p>
                </div>
              )}
            </div>
          </>
        ) : activeTab === 'expenses' ? (
          <>
            <div className="flex items-center justify-between p-5 border-b border-dark-800">
              <h3 className="text-sm font-semibold text-dark-100">Expenses ({expenses.length})</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-dark-800">
                    <th className="text-start text-xs font-medium text-dark-500 uppercase tracking-wider px-5 py-3">Category</th>
                    <th className="text-start text-xs font-medium text-dark-500 uppercase tracking-wider px-5 py-3">Description</th>
                    <th className="text-end text-xs font-medium text-dark-500 uppercase tracking-wider px-5 py-3">Amount</th>
                    <th className="text-start text-xs font-medium text-dark-500 uppercase tracking-wider px-5 py-3">Vendor</th>
                    <th className="text-start text-xs font-medium text-dark-500 uppercase tracking-wider px-5 py-3">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-800">
                  {expenses.map((exp: any) => (
                    <tr key={exp._id} className="hover:bg-dark-800/50 transition-colors">
                      <td className="px-5 py-3.5">
                        <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-kcc-beige/10 text-kcc-beige">{exp.category}</span>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-dark-300">{exp.description}</td>
                      <td className="px-5 py-3.5 text-end text-sm font-medium text-red-400">${(exp.amount || 0).toLocaleString()}</td>
                      <td className="px-5 py-3.5 text-sm text-dark-400">{exp.vendor}</td>
                      <td className="px-5 py-3.5 text-sm text-dark-400">{formatDate(exp.date || exp.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {expenses.length === 0 && (
                <div className="flex flex-col items-center justify-center h-32 text-dark-400">
                  <Receipt size={28} className="mb-2" />
                  <p className="text-sm">No expenses found</p>
                </div>
              )}
            </div>
          </>
        ) : (
          /* Reports Tab */
          <div className="p-8">
            {profitReport && (
              <div className="mb-6 p-5 border border-dark-800 rounded-xl">
                <h4 className="text-sm font-semibold text-dark-100 mb-3">Current Month P&L ({profitReport.month})</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-dark-500">Revenue</p>
                    <p className="text-lg font-bold text-green-400">${(profitReport.revenue || 0).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-dark-500">Expenses</p>
                    <p className="text-lg font-bold text-red-400">${(profitReport.expenses || 0).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-dark-500">Net Profit</p>
                    <p className={`text-lg font-bold ${(profitReport.profit || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      ${(profitReport.profit || 0).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                { title: 'Revenue Report', desc: 'Monthly revenue breakdown', icon: BarChart3, color: 'text-kcc-green', bg: 'bg-kcc-green/10', type: 'revenue' },
                { title: 'Expense Report', desc: 'Category-wise expense analysis', icon: Receipt, color: 'text-red-400', bg: 'bg-red-500/10', type: 'expenses' },
                { title: 'Outstanding Invoices', desc: 'Unpaid and overdue invoices', icon: FileText, color: 'text-yellow-400', bg: 'bg-yellow-500/10', type: 'outstanding' },
                { title: 'Profit & Loss', desc: 'P&L statement overview', icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-500/10', type: 'profit' },
              ].map((report) => {
                const Icon = report.icon;
                return (
                  <div key={report.type} className="p-5 border border-dark-800 rounded-xl hover:border-dark-700 transition-colors cursor-pointer">
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`p-2.5 rounded-lg ${report.bg}`}>
                        <Icon size={20} className={report.color} />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-dark-100">{report.title}</h4>
                        <p className="text-xs text-dark-500">{report.desc}</p>
                      </div>
                    </div>
                    <button type="button" className="flex items-center gap-2 text-xs text-kcc-green hover:text-kcc-green-light">
                      <Download size={13} /> Download PDF
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
