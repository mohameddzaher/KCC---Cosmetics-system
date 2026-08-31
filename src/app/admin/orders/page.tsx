'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  Search, Filter, Download, Eye, ChevronLeft, ChevronRight,
  ShoppingCart, Package, Calendar, Loader2
} from 'lucide-react';
import { useLivePoll } from '@/lib/useLivePoll';
import OrdersStats from '@/components/admin/OrdersStats';
import { useLanguage } from '@/contexts/LanguageContext';
import { ORDER_STATUSES, statusBadgeClass, statusLabel } from '@/lib/orderWorkflow';

// The filter list is derived from the workflow, so a new status appears here
// the moment it is added to src/lib/orderWorkflow.ts.
const allStatuses = ['All', ...ORDER_STATUSES];

export default function OrdersPage() {
  const { t, tx, locale } = useLanguage();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('All');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);
  const itemsPerPage = 20;

  const loadOrders = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(currentPage));
      params.set('limit', String(itemsPerPage));
      if (typeFilter !== 'all') params.set('type', typeFilter);
      if (statusFilter !== 'All') params.set('status', statusFilter);

      const res = await fetch(`/api/orders?${params.toString()}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders || []);
        setTotalOrders(data.pagination?.total || 0);
      } else {
        console.error('Failed to fetch orders:', res.statusText);
        if (!silent) setOrders([]);
      }
    } catch (error) {
      console.error('Failed to fetch orders:', error);
      if (!silent) setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [currentPage, typeFilter, statusFilter]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  useLivePoll(useCallback(() => loadOrders(true), [loadOrders]), 20000);

  // Client-side filtering for search and date range (server already filtered type/status)
  const filteredOrders = orders.filter(order => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchesOrder = order.orderNumber?.toLowerCase().includes(q);
      const matchesName = order.customerInfo?.personName?.toLowerCase().includes(q);
      const matchesCompany = order.customerInfo?.companyName?.toLowerCase().includes(q);
      const matchesUserName = order.userId?.name?.toLowerCase().includes(q);
      if (!matchesOrder && !matchesName && !matchesCompany && !matchesUserName) return false;
    }
    if (dateFrom && new Date(order.createdAt) < new Date(dateFrom)) return false;
    if (dateTo && new Date(order.createdAt) > new Date(dateTo + 'T23:59:59Z')) return false;
    return true;
  });

  const totalPages = Math.ceil(totalOrders / itemsPerPage);

  const handleExportCSV = () => {
    const headers = ['Order Number', 'Type', 'Customer', 'Company', 'Status', 'Total', 'Payment', 'Date'];
    const rows = filteredOrders.map(o => [
      o.orderNumber,
      o.type,
      o.customerInfo?.personName || o.userId?.name || '',
      o.customerInfo?.companyName || o.userId?.company || '',
      o.status,
      o.totals?.total || 0,
      o.paymentStatus,
      new Date(o.createdAt).toLocaleDateString()
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `orders-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      {/* Section analytics */}
      <OrdersStats />

      {/* Filters Row */}
      <div className="flex flex-wrap items-center gap-3 p-4 bg-surface border border-line rounded-xl">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute start-3 top-1/2 -translate-y-1/2 text-fg-subtle" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); }}
            placeholder={tx('Search orders, customers...')}
            className="w-full ps-9 pe-3 py-2 text-sm bg-bg border border-line rounded-lg text-fg placeholder:text-fg-subtle focus:border-kcc-green focus:outline-none"
          />
        </div>

        {/* Type Filter */}
        <div className="flex items-center gap-1 p-0.5 bg-surface-2 rounded-lg">
          {[
            { value: 'all', label: 'All', icon: null },
            { value: 'sample', label: 'Sample', icon: ShoppingCart },
            { value: 'bulk', label: 'Bulk', icon: Package },
          ].map(opt => (
            <button
              key={opt.value}
              onClick={() => { setTypeFilter(opt.value); setCurrentPage(1); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                typeFilter === opt.value ? 'bg-kcc-green/20 text-kcc-green' : 'text-fg-muted hover:text-fg'
              }`}
            >
              {opt.icon && <opt.icon size={13} />}
              {opt.label}
            </button>
          ))}
        </div>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
          className="field max-w-[14rem] cursor-pointer"
        >
          {allStatuses.map((s) => (
            <option key={s} value={s}>
              {s === 'All' ? t('admin.allStatuses') : statusLabel(s, locale)}
            </option>
          ))}
        </select>

        {/* Date Range */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Calendar size={14} className="absolute start-2.5 top-1/2 -translate-y-1/2 text-fg-subtle" />
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); }}
              className="ps-8 pe-2 py-2 text-xs bg-bg border border-line rounded-lg text-fg focus:border-kcc-green focus:outline-none"
            />
          </div>
          <span className="text-fg-subtle text-xs">to</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); }}
            className="px-2 py-2 text-xs bg-bg border border-line rounded-lg text-fg focus:border-kcc-green focus:outline-none"
          />
        </div>

        {/* Export */}
        <button
          onClick={handleExportCSV}
          className="flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-fg-muted border border-line rounded-lg hover:text-fg hover:border-line-strong transition-colors"
        >
          <Download size={15} />{tx('Export CSV')}</button>
      </div>

      {/* Results Count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-fg-muted">
          Showing {filteredOrders.length} of {totalOrders} orders
        </p>
      </div>

      {/* Orders Table */}
      <div className="bg-surface border border-line rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="animate-spin text-kcc-green" size={24} />
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-fg-muted">
            <ShoppingCart size={32} className="mb-2" />
            <p>{tx('No orders found')}</p>
          </div>
        ) : (
          <div className="scroll-thin w-full min-w-0 overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-line">
                  <th className="text-start text-xs font-medium text-fg-subtle uppercase tracking-wider px-5 py-3">{tx('Order #')}</th>
                  <th className="text-start text-xs font-medium text-fg-subtle uppercase tracking-wider px-5 py-3">{tx('Type')}</th>
                  <th className="text-start text-xs font-medium text-fg-subtle uppercase tracking-wider px-5 py-3">{tx('Customer')}</th>
                  <th className="text-start text-xs font-medium text-fg-subtle uppercase tracking-wider px-5 py-3">{tx('Status')}</th>
                  <th className="text-end text-xs font-medium text-fg-subtle uppercase tracking-wider px-5 py-3">{tx('Total')}</th>
                  <th className="text-start text-xs font-medium text-fg-subtle uppercase tracking-wider px-5 py-3">{tx('Payment')}</th>
                  <th className="text-start text-xs font-medium text-fg-subtle uppercase tracking-wider px-5 py-3">{tx('Date')}</th>
                  <th className="text-center text-xs font-medium text-fg-subtle uppercase tracking-wider px-5 py-3">{tx('Actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filteredOrders.map((order) => (
                  <tr key={order._id} className="hover:bg-surface-2/50 transition-colors cursor-pointer" onClick={() => window.location.href = `/admin/orders/${order._id}`}>
                    <td className="px-5 py-3.5">
                      <span className="text-sm font-medium text-fg">{order.orderNumber}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                        order.type === 'sample' ? 'bg-kcc-green/10 text-kcc-green' : 'bg-kcc-beige/10 text-kcc-beige'
                      }`}>
                        {order.type}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="text-sm text-fg">{order.customerInfo?.personName || order.userId?.name || '-'}</p>
                      <p className="text-xs text-fg-subtle">{order.customerInfo?.companyName || order.userId?.company || ''}</p>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`badge ${statusBadgeClass(order.status)}`}>
                        {statusLabel(order.status, locale)}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-end text-sm text-fg font-medium">${(order.totals?.total || 0).toLocaleString()}</td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                        order.paymentStatus === 'paid' ? 'bg-green-500/10 text-green-400' :
                        order.paymentStatus === 'refunded' ? 'bg-red-500/10 text-red-400' :
                        'bg-yellow-500/10 text-yellow-400'
                      }`}>
                        {order.paymentStatus}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-fg-muted">{formatDate(order.createdAt)}</td>
                    <td className="px-5 py-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                      <Link href={`/admin/orders/${order._id}`} className="inline-flex p-1.5 text-fg-muted hover:text-kcc-green hover:bg-surface-2 rounded-lg transition-colors">
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
          <p className="text-sm text-fg-subtle">
            Page {currentPage} of {totalPages}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 text-fg-muted hover:text-fg disabled:opacity-30 disabled:cursor-not-allowed rounded-lg hover:bg-surface-2"
            >
              <ChevronLeft size={16} />
            </button>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              let page: number;
              if (totalPages <= 7) {
                page = i + 1;
              } else if (currentPage <= 4) {
                page = i + 1;
              } else if (currentPage >= totalPages - 3) {
                page = totalPages - 6 + i;
              } else {
                page = currentPage - 3 + i;
              }
              return (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`w-8 h-8 text-sm rounded-lg transition-colors ${
                    currentPage === page ? 'bg-kcc-green/20 text-kcc-green font-medium' : 'text-fg-muted hover:text-fg hover:bg-surface-2'
                  }`}
                >
                  {page}
                </button>
              );
            })}
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-2 text-fg-muted hover:text-fg disabled:opacity-30 disabled:cursor-not-allowed rounded-lg hover:bg-surface-2"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
