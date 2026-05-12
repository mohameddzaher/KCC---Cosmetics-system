'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  ShoppingCart, Package, DollarSign, AlertTriangle,
  TrendingUp, ArrowRight, Eye, Loader2, Users,
  CheckCircle2, Clock, BarChart3, FileDown,
  UserPlus, PlusCircle, ArrowUpRight, ArrowDownRight,
  Activity, RefreshCw, Percent, Layers
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar,
  AreaChart, Area, Legend
} from 'recharts';

/* ────────────────── colour palette constants ────────────────── */
const KCC_GREEN = '#2D6A4F';
const KCC_GREEN_LIGHT = '#40916C';
const KCC_BEIGE = '#D4A574';
const KCC_BEIGE_LIGHT = '#E8C9A0';

const STATUS_COLORS: Record<string, string> = {
  'Submitted': '#3b82f6',
  'Under Review': '#eab308',
  'Approved': '#22c55e',
  'In Production': '#a855f7',
  'Shipped': '#06b6d4',
  'Delivered': '#10b981',
  'Quotation Sent': '#f97316',
  'Awaiting Payment': '#f59e0b',
  'Closed': '#64748b',
};

const statusBadgeClasses: Record<string, string> = {
  'Submitted': 'bg-blue-500/10 text-blue-400',
  'Under Review': 'bg-yellow-500/10 text-yellow-400',
  'Approved': 'bg-green-500/10 text-green-400',
  'In Production': 'bg-purple-500/10 text-purple-400',
  'Shipped': 'bg-cyan-500/10 text-cyan-400',
  'Delivered': 'bg-emerald-500/10 text-emerald-400',
  'Quotation Sent': 'bg-orange-500/10 text-orange-400',
  'Awaiting Payment': 'bg-amber-500/10 text-amber-400',
  'Closed': 'bg-dark-500/10 text-dark-400',
};

/* ────────────────── shared tooltip style ────────────────── */
const tooltipStyle = {
  backgroundColor: '#0f172a',
  border: '1px solid #1e293b',
  borderRadius: '8px',
  color: '#f8fafc',
  fontSize: '12px',
  padding: '8px 12px',
};

/* ────────────────── helpers ────────────────── */
function formatCurrency(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toLocaleString()}`;
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function timeAgo(dateStr: string, t: (key: string) => string, locale: string): string {
  const now = new Date();
  const past = new Date(dateStr);
  const diffMs = now.getTime() - past.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return t('time.justNow');
  if (diffMin < 60) return t('time.minutesAgo').replace('{n}', String(diffMin));
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return t('time.hoursAgo').replace('{n}', String(diffHr));
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return t('time.daysAgo').replace('{n}', String(diffDay));
  return past.toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-US', { month: 'short', day: 'numeric' });
}

function getMonthLabel(date: Date, locale: string): string {
  return date.toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-US', { month: 'short', year: '2-digit' });
}

/* ────────────────── custom recharts label for donut ────────────────── */
function DonutCenterLabel({ viewBox, value }: any) {
  const { cx, cy } = viewBox;
  return (
    <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central">
      <tspan x={cx} dy="-6" className="fill-dark-50 text-lg font-bold">{value}</tspan>
      <tspan x={cx} dy="18" className="fill-dark-400 text-[10px]">Total</tspan>
    </text>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════ */
export default function AdminDashboard() {
  const { t, locale } = useLanguage();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    setMounted(true);
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const [ordersRes, customersRes, inventoryRes, invoicesRes] = await Promise.allSettled([
        fetch('/api/orders?limit=500'),
        fetch('/api/customers'),
        fetch('/api/inventory'),
        fetch('/api/accounting/invoices'),
      ]);

      if (ordersRes.status === 'fulfilled' && ordersRes.value.ok) {
        const data = await ordersRes.value.json();
        setOrders(data.orders || data || []);
      }
      if (customersRes.status === 'fulfilled' && customersRes.value.ok) {
        const data = await customersRes.value.json();
        setCustomers(Array.isArray(data) ? data : []);
      }
      if (inventoryRes.status === 'fulfilled' && inventoryRes.value.ok) {
        const data = await inventoryRes.value.json();
        setInventoryItems(Array.isArray(data) ? data : []);
      }
      if (invoicesRes.status === 'fulfilled' && invoicesRes.value.ok) {
        const data = await invoicesRes.value.json();
        setInvoices(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  /* ── Computed analytics ── */
  const analytics = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // ──── Stat cards ────
    const totalOrders = orders.length;
    const sampleOrders = orders.filter(o => o.type === 'sample').length;
    const bulkOrders = orders.filter(o => o.type === 'bulk').length;
    const totalCustomers = customers.length;

    const totalRevenue = invoices
      .filter((inv: any) => inv.status === 'paid')
      .reduce((sum: number, inv: any) => sum + (inv.total || 0), 0);

    const pendingStatuses = ['Submitted', 'Under Review', 'Quotation Sent', 'Awaiting Payment'];
    const completedStatuses = ['Delivered', 'Closed'];
    const pendingOrders = orders.filter(o => pendingStatuses.includes(o.status)).length;
    const completedOrders = orders.filter(o => completedStatuses.includes(o.status)).length;

    // Conversion rate: percentage of orders that reached Delivered or Closed
    const conversionRate = totalOrders > 0
      ? Math.round((completedOrders / totalOrders) * 100)
      : 0;

    // Compare with previous 30-day period for trend arrows
    const sixtyDaysAgo = new Date(today);
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    const currentPeriodOrders = orders.filter(o => new Date(o.createdAt) >= thirtyDaysAgo).length;
    const previousPeriodOrders = orders.filter(o => {
      const d = new Date(o.createdAt);
      return d >= sixtyDaysAgo && d < thirtyDaysAgo;
    }).length;

    const ordersTrend = previousPeriodOrders > 0
      ? Math.round(((currentPeriodOrders - previousPeriodOrders) / previousPeriodOrders) * 100)
      : currentPeriodOrders > 0 ? 100 : 0;

    // Low stock
    const lowStockItems = inventoryItems.filter(
      (item: any) => item.currentStock <= item.lowStockThreshold && item.isActive !== false
    );

    // ──── Orders trend line (last 30 days) ────
    const ordersTrendData = Array.from({ length: 30 }, (_, i) => {
      const date = new Date(today);
      date.setDate(date.getDate() - (29 - i));
      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);

      const dayOrders = orders.filter(o => {
        const created = new Date(o.createdAt);
        return created >= date && created < nextDay;
      });

      return {
        date: date.toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-US', { month: 'short', day: 'numeric' }),
        orders: dayOrders.length,
        sample: dayOrders.filter(o => o.type === 'sample').length,
        bulk: dayOrders.filter(o => o.type === 'bulk').length,
      };
    });

    // ──── Revenue by month (last 6 months) ────
    const revenueByMonth = Array.from({ length: 6 }, (_, i) => {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const nextMonth = new Date(now.getFullYear(), now.getMonth() - (5 - i) + 1, 1);

      const monthRevenue = invoices
        .filter((inv: any) => {
          const d = new Date(inv.createdAt);
          return d >= monthDate && d < nextMonth && inv.status === 'paid';
        })
        .reduce((sum: number, inv: any) => sum + (inv.total || 0), 0);

      const monthOrderRevenue = orders
        .filter(o => {
          const d = new Date(o.createdAt);
          return d >= monthDate && d < nextMonth;
        })
        .reduce((sum: number, o: any) => sum + (o.totals?.total || 0), 0);

      return {
        month: getMonthLabel(monthDate, locale),
        revenue: monthRevenue,
        orderValue: monthOrderRevenue,
      };
    });

    // ──── Order status distribution (donut) ────
    const statusCounts: Record<string, number> = {};
    orders.forEach(o => {
      statusCounts[o.status] = (statusCounts[o.status] || 0) + 1;
    });
    const statusDistribution = Object.entries(statusCounts)
      .map(([name, value]) => ({
        name,
        value,
        color: STATUS_COLORS[name] || '#64748b',
      }))
      .sort((a, b) => b.value - a.value);

    // ──── Orders by type comparison (sample vs bulk per month) ────
    const ordersByTypeMonth = Array.from({ length: 6 }, (_, i) => {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const nextMonth = new Date(now.getFullYear(), now.getMonth() - (5 - i) + 1, 1);

      const monthOrders = orders.filter(o => {
        const d = new Date(o.createdAt);
        return d >= monthDate && d < nextMonth;
      });

      return {
        month: getMonthLabel(monthDate, locale),
        sample: monthOrders.filter(o => o.type === 'sample').length,
        bulk: monthOrders.filter(o => o.type === 'bulk').length,
      };
    });

    // ──── Customer growth (area chart, last 6 months cumulative) ────
    const customerGrowth = Array.from({ length: 6 }, (_, i) => {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const nextMonth = new Date(now.getFullYear(), now.getMonth() - (5 - i) + 1, 1);

      const newCustomers = customers.filter(c => {
        const d = new Date(c.createdAt);
        return d >= monthDate && d < nextMonth;
      }).length;

      const cumulativeCustomers = customers.filter(c => {
        return new Date(c.createdAt) < nextMonth;
      }).length;

      return {
        month: getMonthLabel(monthDate, locale),
        newCustomers,
        totalCustomers: cumulativeCustomers,
      };
    });

    // ──── Top products (from survey data or items in orders) ────
    const productMap: Record<string, { name: string; count: number; revenue: number }> = {};
    orders.forEach(o => {
      // Try extracting product info from surveyData
      const productName =
        o.surveyData?.productType ||
        o.surveyData?.product ||
        o.surveyData?.category ||
        (o.type === 'sample' ? 'Sample Kit' : 'Bulk Order');
      const key = productName;
      if (!productMap[key]) {
        productMap[key] = { name: key, count: 0, revenue: 0 };
      }
      productMap[key].count += 1;
      productMap[key].revenue += o.totals?.total || 0;
    });
    const topProducts = Object.values(productMap)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // ──── Recent activity feed ────
    type ActivityItem = {
      id: string;
      type: 'order' | 'customer' | 'status';
      icon: 'order' | 'customer' | 'status';
      message: string;
      time: string;
      color: string;
    };

    const activityItems: ActivityItem[] = [];

    // Latest orders
    orders.slice(0, 8).forEach(o => {
      activityItems.push({
        id: `order-${o._id}`,
        type: 'order',
        icon: 'order',
        message: `New ${o.type} order ${o.orderNumber} from ${o.customerInfo?.personName || o.userId?.name || 'Unknown'}`,
        time: o.createdAt,
        color: o.type === 'sample' ? 'text-kcc-green' : 'text-kcc-beige',
      });
    });

    // Latest customers
    customers.slice(0, 5).forEach(c => {
      activityItems.push({
        id: `customer-${c._id}`,
        type: 'customer',
        icon: 'customer',
        message: `New customer ${c.name || c.email} registered`,
        time: c.createdAt,
        color: 'text-blue-400',
      });
    });

    // Sort by time descending and take top 10
    activityItems.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
    const recentActivity = activityItems.slice(0, 10);

    // Recent orders for table
    const recentOrders = orders.slice(0, 6);

    return {
      totalOrders,
      sampleOrders,
      bulkOrders,
      totalCustomers,
      totalRevenue,
      pendingOrders,
      completedOrders,
      conversionRate,
      ordersTrend,
      lowStockItems,
      ordersTrendData,
      revenueByMonth,
      statusDistribution,
      ordersByTypeMonth,
      customerGrowth,
      topProducts,
      recentActivity,
      recentOrders,
    };
  }, [orders, customers, inventoryItems, invoices, locale]);

  /* ── Hydration guard ── */
  if (!mounted) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-kcc-green" />
      </div>
    );
  }

  /* ── Loading state ── */
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-3">
        <Loader2 className="animate-spin text-kcc-green" size={32} />
        <p className="text-dark-400 text-sm">{t('admin.loadingDashboard')}</p>
      </div>
    );
  }

  /* ── Stat cards config ── */
  const statCards = [
    {
      value: formatNumber(analytics.totalOrders),
      label: t('admin.totalOrders'),
      icon: ShoppingCart,
      href: '/admin/orders',
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
      trend: analytics.ordersTrend,
    },
    {
      value: formatNumber(analytics.sampleOrders),
      label: t('admin.totalSamples'),
      icon: Package,
      href: '/admin/orders?type=sample',
      color: 'text-kcc-green',
      bg: 'bg-kcc-green/10',
    },
    {
      value: formatNumber(analytics.bulkOrders),
      label: t('admin.totalBulk'),
      icon: Layers,
      href: '/admin/orders?type=bulk',
      color: 'text-kcc-beige',
      bg: 'bg-kcc-beige/10',
    },
    {
      value: formatNumber(analytics.totalCustomers),
      label: t('admin.totalCustomers'),
      icon: Users,
      href: '/admin/customers',
      color: 'text-purple-400',
      bg: 'bg-purple-500/10',
    },
    {
      value: formatCurrency(analytics.totalRevenue),
      label: t('admin.totalRevenue'),
      icon: DollarSign,
      href: '/admin/accounting',
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
    },
    {
      value: formatNumber(analytics.pendingOrders),
      label: t('admin.pending'),
      icon: Clock,
      href: '/admin/orders?status=Submitted',
      color: 'text-yellow-400',
      bg: 'bg-yellow-500/10',
    },
    {
      value: formatNumber(analytics.completedOrders),
      label: t('admin.completed'),
      icon: CheckCircle2,
      href: '/admin/orders?status=Delivered',
      color: 'text-green-400',
      bg: 'bg-green-500/10',
    },
    {
      value: `${analytics.conversionRate}%`,
      label: t('admin.conversionRate'),
      icon: Percent,
      href: '/admin/orders',
      color: 'text-cyan-400',
      bg: 'bg-cyan-500/10',
    },
  ];

  /* ═══════════════════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════════════════ */
  return (
    <div className="space-y-6">

      {/* ── Header row with refresh ── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-dark-50">{t('admin.dashboardOverview')}</h2>
          <p className="text-sm text-dark-400 mt-0.5">{t('admin.dashboardSubtitle')}</p>
        </div>
        <button
          type="button"
          onClick={() => fetchDashboardData(true)}
          disabled={refreshing}
          className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-dark-300 bg-dark-900 border border-dark-800 rounded-lg hover:border-dark-700 hover:text-dark-50 transition-all disabled:opacity-50"
        >
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          {refreshing ? t('common.refreshing') : t('common.refresh')}
        </button>
      </div>

      {/* ═══════  STAT CARDS (2 rows of 4)  ═══════ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {statCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <Link key={i} href={card.href} className="group block">
              <div className="relative p-5 bg-dark-900 border border-dark-800 rounded-xl hover:border-dark-700 transition-all group-hover:shadow-lg group-hover:shadow-dark-900/50 overflow-hidden">
                {/* Subtle gradient accent */}
                <div className={`absolute top-0 right-0 w-24 h-24 ${card.bg} rounded-full -translate-y-8 translate-x-8 opacity-50`} />

                <div className="relative flex items-start justify-between">
                  <div className={`p-2.5 rounded-lg ${card.bg}`}>
                    <Icon size={20} className={card.color} />
                  </div>
                  {card.trend !== undefined && card.trend !== 0 && (
                    <div className={`flex items-center gap-0.5 text-xs font-medium ${
                      card.trend > 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {card.trend > 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                      {Math.abs(card.trend)}%
                    </div>
                  )}
                </div>
                <div className="relative mt-3">
                  <p className="text-2xl font-bold text-dark-50 tracking-tight">{card.value}</p>
                  <p className="text-sm text-dark-400 mt-0.5">{card.label}</p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* ═══════  QUICK ACTIONS  ═══════ */}
      <div className="bg-dark-900 border border-dark-800 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-dark-300 uppercase tracking-wider mb-3">{t('admin.quickActions')}</h3>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/admin/orders"
            className="flex items-center gap-2 px-4 py-2.5 bg-kcc-green/10 text-kcc-green border border-kcc-green/20 rounded-lg text-sm font-medium hover:bg-kcc-green/20 transition-colors"
          >
            <PlusCircle size={16} /> {t('admin.newOrder')}
          </Link>
          <Link
            href="/admin/customers"
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-lg text-sm font-medium hover:bg-blue-500/20 transition-colors"
          >
            <UserPlus size={16} /> {t('admin.addCustomer')}
          </Link>
          <Link
            href="/admin/accounting"
            className="flex items-center gap-2 px-4 py-2.5 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-lg text-sm font-medium hover:bg-purple-500/20 transition-colors"
          >
            <FileDown size={16} /> {t('admin.exportReports')}
          </Link>
          <Link
            href="/admin/orders"
            className="flex items-center gap-2 px-4 py-2.5 bg-dark-800 text-dark-200 border border-dark-700 rounded-lg text-sm font-medium hover:bg-dark-700 transition-colors"
          >
            <Eye size={16} /> {t('admin.viewAllOrders')}
          </Link>
        </div>
      </div>

      {/* ═══════  CHARTS ROW 1: Orders Trend + Order Status Donut  ═══════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Orders Trend Line Chart (30 days) */}
        <div className="lg:col-span-2 bg-dark-900 border border-dark-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold text-dark-50">{t('admin.ordersTrend')}</h2>
              <p className="text-xs text-dark-500 mt-0.5">{t('admin.last30Days')}</p>
            </div>
            <Link href="/admin/orders" className="text-xs text-kcc-green hover:text-kcc-green-light flex items-center gap-1">
              View All <ArrowRight size={12} />
            </Link>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={analytics.ordersTrendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis
                  dataKey="date"
                  stroke="#64748b"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  interval={4}
                />
                <YAxis
                  stroke="#64748b"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend
                  wrapperStyle={{ fontSize: '12px', color: '#94a3b8' }}
                  iconSize={8}
                  iconType="circle"
                />
                <Line
                  type="monotone"
                  dataKey="sample"
                  stroke={KCC_GREEN}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ fill: KCC_GREEN, r: 4, strokeWidth: 0 }}
                  name={t('admin.sample')}
                />
                <Line
                  type="monotone"
                  dataKey="bulk"
                  stroke={KCC_BEIGE}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ fill: KCC_BEIGE, r: 4, strokeWidth: 0 }}
                  name={t('admin.bulk')}
                />
                <Line
                  type="monotone"
                  dataKey="orders"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                  activeDot={{ fill: '#3b82f6', r: 4, strokeWidth: 0 }}
                  name={t('accounting.total')}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Order Status Donut Chart */}
        <div className="bg-dark-900 border border-dark-800 rounded-xl p-5">
          <h2 className="text-base font-semibold text-dark-50 mb-1">{t('admin.orderStatus')}</h2>
          <p className="text-xs text-dark-500 mb-4">{t('admin.statusDistribution')}</p>
          {analytics.statusDistribution.length > 0 ? (
            <>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={analytics.statusDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                      strokeWidth={0}
                    >
                      {analytics.statusDistribution.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-2 space-y-1.5 max-h-36 overflow-y-auto">
                {analytics.statusDistribution.map((s, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                      <span className="text-dark-400">{s.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-dark-300 font-medium">{s.value}</span>
                      <span className="text-dark-500 w-8 text-right">
                        {analytics.totalOrders > 0 ? Math.round((s.value / analytics.totalOrders) * 100) : 0}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-52 text-dark-400">
              <ShoppingCart size={28} className="mb-2" />
              <p className="text-sm">{t('admin.noOrders')}</p>
            </div>
          )}
        </div>
      </div>

      {/* ═══════  CHARTS ROW 2: Revenue + Orders by Type  ═══════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Revenue Bar Chart (6 months) */}
        <div className="bg-dark-900 border border-dark-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold text-dark-50">{t('admin.revenueChart')}</h2>
              <p className="text-xs text-dark-500 mt-0.5">{t('admin.paidInvoices6Months')}</p>
            </div>
            <Link href="/admin/accounting" className="text-xs text-kcc-green hover:text-kcc-green-light flex items-center gap-1">
              Details <ArrowRight size={12} />
            </Link>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.revenueByMonth} barCategoryGap="20%">
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="month" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v >= 1000 ? `${(v/1000).toFixed(0)}K` : v}`} />
                <Tooltip contentStyle={tooltipStyle} formatter={(value) => [`$${Number(value).toLocaleString()}`, '']} />
                <Legend wrapperStyle={{ fontSize: '12px', color: '#94a3b8' }} iconSize={8} iconType="circle" />
                <Bar dataKey="revenue" fill={KCC_GREEN} name={t('admin.paidRevenue')} radius={[4, 4, 0, 0]} />
                <Bar dataKey="orderValue" fill={KCC_GREEN_LIGHT} name={t('admin.orderValue')} radius={[4, 4, 0, 0]} opacity={0.5} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Orders by Type (sample vs bulk) Bar Chart */}
        <div className="bg-dark-900 border border-dark-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold text-dark-50">{t('admin.ordersByType')}</h2>
              <p className="text-xs text-dark-500 mt-0.5">{t('admin.sampleVsBulk')}</p>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.ordersByTypeMonth} barCategoryGap="20%">
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="month" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: '12px', color: '#94a3b8' }} iconSize={8} iconType="circle" />
                <Bar dataKey="sample" fill={KCC_GREEN} name={t('admin.sample')} radius={[4, 4, 0, 0]} />
                <Bar dataKey="bulk" fill={KCC_BEIGE} name={t('admin.bulk')} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ═══════  CHARTS ROW 3: Customer Growth + Top Products  ═══════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Customer Growth Area Chart */}
        <div className="lg:col-span-2 bg-dark-900 border border-dark-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold text-dark-50">{t('admin.customerGrowth')}</h2>
              <p className="text-xs text-dark-500 mt-0.5">{t('admin.newAndCumulative')}</p>
            </div>
            <Link href="/admin/customers" className="text-xs text-kcc-green hover:text-kcc-green-light flex items-center gap-1">
              View All <ArrowRight size={12} />
            </Link>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={analytics.customerGrowth}>
                <defs>
                  <linearGradient id="gradientCustomers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={KCC_GREEN} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={KCC_GREEN} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradientNew" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="month" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: '12px', color: '#94a3b8' }} iconSize={8} iconType="circle" />
                <Area
                  type="monotone"
                  dataKey="totalCustomers"
                  stroke={KCC_GREEN}
                  strokeWidth={2}
                  fill="url(#gradientCustomers)"
                  name={t('admin.totalCustomersChart')}
                />
                <Area
                  type="monotone"
                  dataKey="newCustomers"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fill="url(#gradientNew)"
                  name={t('admin.newCustomers')}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Products Table */}
        <div className="bg-dark-900 border border-dark-800 rounded-xl">
          <div className="p-5 border-b border-dark-800">
            <h2 className="text-base font-semibold text-dark-50">{t('admin.topProducts')}</h2>
            <p className="text-xs text-dark-500 mt-0.5">{t('admin.byRevenue')}</p>
          </div>
          {analytics.topProducts.length > 0 ? (
            <div className="divide-y divide-dark-800">
              {analytics.topProducts.map((product, i) => (
                <div key={i} className="flex items-center justify-between px-5 py-3.5 hover:bg-dark-800/50 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="flex items-center justify-center w-7 h-7 rounded-full bg-dark-800 text-dark-400 text-xs font-bold flex-shrink-0">
                      {i + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-dark-100 truncate">{product.name}</p>
                      <p className="text-xs text-dark-500">{product.count} orders</p>
                    </div>
                  </div>
                  <p className="text-sm font-semibold text-dark-200 flex-shrink-0 ml-2">
                    ${product.revenue.toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-32 text-dark-400 p-5">
              <BarChart3 size={28} className="mb-2" />
              <p className="text-sm">{t('admin.noProductData')}</p>
            </div>
          )}
        </div>
      </div>

      {/* ═══════  BOTTOM ROW: Recent Orders + Activity + Low Stock  ═══════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Recent Orders Table */}
        <div className="lg:col-span-2 bg-dark-900 border border-dark-800 rounded-xl">
          <div className="flex items-center justify-between p-5 border-b border-dark-800">
            <div>
              <h2 className="text-base font-semibold text-dark-50">{t('admin.recentOrders')}</h2>
              <p className="text-xs text-dark-500 mt-0.5">{t('admin.latestOrders')}</p>
            </div>
            <Link href="/admin/orders" className="text-xs text-kcc-green hover:text-kcc-green-light flex items-center gap-1">
              View All <ArrowRight size={12} />
            </Link>
          </div>
          {analytics.recentOrders.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-dark-800">
                    <th className="text-start text-xs font-medium text-dark-500 uppercase tracking-wider px-5 py-3">{t('admin.order')}</th>
                    <th className="text-start text-xs font-medium text-dark-500 uppercase tracking-wider px-5 py-3">{t('admin.type')}</th>
                    <th className="text-start text-xs font-medium text-dark-500 uppercase tracking-wider px-5 py-3 hidden sm:table-cell">{t('admin.customer')}</th>
                    <th className="text-start text-xs font-medium text-dark-500 uppercase tracking-wider px-5 py-3">{t('common.status')}</th>
                    <th className="text-end text-xs font-medium text-dark-500 uppercase tracking-wider px-5 py-3">{t('admin.total')}</th>
                    <th className="text-center text-xs font-medium text-dark-500 uppercase tracking-wider px-5 py-3 w-12"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-800">
                  {analytics.recentOrders.map((order: any) => (
                    <tr key={order._id} className="hover:bg-dark-800/50 transition-colors">
                      <td className="px-5 py-3">
                        <span className="text-sm font-medium text-dark-100">{order.orderNumber}</span>
                        <p className="text-xs text-dark-500 mt-0.5 sm:hidden">
                          {order.customerInfo?.personName || order.userId?.name || '-'}
                        </p>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                          order.type === 'sample' ? 'bg-kcc-green/10 text-kcc-green' : 'bg-kcc-beige/10 text-kcc-beige'
                        }`}>
                          {order.type === 'sample' ? t('admin.sample') : t('admin.bulk')}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-sm text-dark-300 hidden sm:table-cell">
                        {order.customerInfo?.personName || order.userId?.name || '-'}
                      </td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${statusBadgeClasses[order.status] || ''}`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-end text-sm text-dark-200 font-medium">
                        ${(order.totals?.total || 0).toLocaleString()}
                      </td>
                      <td className="px-5 py-3 text-center">
                        <Link href={`/admin/orders/${order._id}`} className="text-dark-400 hover:text-kcc-green transition-colors">
                          <Eye size={16} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-32 text-dark-400 p-5">
              <ShoppingCart size={28} className="mb-2" />
              <p className="text-sm">{t('admin.noOrders')}</p>
            </div>
          )}
        </div>

        {/* Right column: Activity + Low Stock stacked */}
        <div className="space-y-6">

          {/* Recent Activity Feed */}
          <div className="bg-dark-900 border border-dark-800 rounded-xl">
            <div className="flex items-center justify-between p-5 border-b border-dark-800">
              <div className="flex items-center gap-2">
                <Activity size={16} className="text-kcc-green" />
                <h2 className="text-base font-semibold text-dark-50">{t('admin.recentActivity')}</h2>
              </div>
            </div>
            {analytics.recentActivity.length > 0 ? (
              <div className="divide-y divide-dark-800 max-h-64 overflow-y-auto">
                {analytics.recentActivity.map((item) => (
                  <div key={item.id} className="px-5 py-3 hover:bg-dark-800/50 transition-colors">
                    <div className="flex items-start gap-3">
                      <div className={`mt-0.5 flex-shrink-0 ${item.color}`}>
                        {item.icon === 'order' && <ShoppingCart size={14} />}
                        {item.icon === 'customer' && <UserPlus size={14} />}
                        {item.icon === 'status' && <TrendingUp size={14} />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-dark-300 leading-relaxed line-clamp-2">{item.message}</p>
                        <p className="text-[10px] text-dark-500 mt-0.5">{timeAgo(item.time, t, locale)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-24 text-dark-400 p-5">
                <Activity size={20} className="mb-1" />
                <p className="text-xs">{t('admin.noRecentActivity')}</p>
              </div>
            )}
          </div>

          {/* Low Stock Alerts */}
          <div className="bg-dark-900 border border-dark-800 rounded-xl">
            <div className="flex items-center justify-between p-5 border-b border-dark-800">
              <div className="flex items-center gap-2">
                <AlertTriangle size={16} className="text-red-400" />
                <h2 className="text-base font-semibold text-dark-50">{t('admin.lowStock')}</h2>
              </div>
              <Link href="/admin/inventory" className="text-xs text-kcc-green hover:text-kcc-green-light flex items-center gap-1">
                View All <ArrowRight size={12} />
              </Link>
            </div>
            {analytics.lowStockItems.length > 0 ? (
              <div className="divide-y divide-dark-800 max-h-52 overflow-y-auto">
                {analytics.lowStockItems.slice(0, 5).map((item: any) => (
                  <div key={item._id} className="px-5 py-3 hover:bg-dark-800/50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-dark-100 truncate">{item.name?.en || item.name}</p>
                        <p className="text-xs text-dark-500">{item.sku}</p>
                      </div>
                      <div className="text-end flex-shrink-0 ml-2">
                        <p className="text-sm font-bold text-red-400">{item.currentStock} {item.unit}</p>
                        <p className="text-xs text-dark-500">Min: {item.lowStockThreshold}</p>
                      </div>
                    </div>
                    <div className="mt-2 w-full bg-dark-800 rounded-full h-1.5">
                      <div
                        className="bg-red-500 h-1.5 rounded-full transition-all"
                        style={{ width: `${Math.min((item.currentStock / (item.lowStockThreshold || 1)) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-24 text-dark-400 p-5">
                <Package size={20} className="mb-1" />
                <p className="text-xs">{t('admin.allStockHealthy')}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
