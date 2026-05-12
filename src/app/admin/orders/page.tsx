'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  Search, Filter, Download, Eye, ChevronLeft, ChevronRight,
  ShoppingCart, Package, Calendar, Loader2
} from 'lucide-react';

const statusBadgeClasses: Record<string, string> = {
  'Submitted': 'bg-blue-500/10 text-blue-400',
  'Under Review': 'bg-yellow-500/10 text-yellow-400',
  'Approved': 'bg-green-500/10 text-green-400',
  'Quotation Sent': 'bg-orange-500/10 text-orange-400',
  'Awaiting Payment': 'bg-amber-500/10 text-amber-400',
  'In Production': 'bg-purple-500/10 text-purple-400',
  'Shipped': 'bg-cyan-500/10 text-cyan-400',
  'Delivered': 'bg-emerald-500/10 text-emerald-400',
  'Closed': 'bg-dark-500/10 text-dark-400',
};

const allStatuses = [
  'All', 'Submitted', 'Under Review', 'Approved', 'Quotation Sent',
  'Awaiting Payment', 'In Production', 'Shipped', 'Delivered', 'Closed'
];

export default function OrdersPage() {
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

  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(currentPage));
      params.set('limit', String(itemsPerPage));
      if (typeFilter !== 'all') params.set('type', typeFilter);
      if (statusFilter !== 'All') params.set('status', statusFilter);

      const res = await fetch(`/api/orders?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders || []);
        setTotalOrders(data.pagination?.total || 0);
      } else {
        console.error('Failed to fetch orders:', res.statusText);
        setOrders([]);
      }
    } catch (error) {
      console.error('Failed to fetch orders:', error);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [currentPage, typeFilter, statusFilter]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

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
      {/* Filters Row */}
      <div className="flex flex-wrap items-center gap-3 p-4 bg-dark-900 border border-dark-800 rounded-xl">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute start-3 top-1/2 -translate-y-1/2 text-dark-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); }}
            placeholder="Search orders, customers..."
            className="w-full ps-9 pe-3 py-2 text-sm bg-dark-950 border border-dark-700 rounded-lg text-dark-100 placeholder:text-dark-500 focus:border-kcc-green focus:outline-none"
          />
        </div>

        {/* Type Filter */}
        <div className="flex items-center gap-1 p-0.5 bg-dark-800 rounded-lg">
          {[
            { value: 'all', label: 'All', icon: null },
            { value: 'sample', label: 'Sample', icon: ShoppingCart },
            { value: 'bulk', label: 'Bulk', icon: Package },
          ].map(opt => (
            <button
              key={opt.value}
              onClick={() => { setTypeFilter(opt.value); setCurrentPage(1); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                typeFilter === opt.value ? 'bg-kcc-green/20 text-kcc-green' : 'text-dark-400 hover:text-dark-200'
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
          className="px-3 py-2 text-sm bg-dark-950 border border-dark-700 rounded-lg text-dark-100 focus:border-kcc-green focus:outline-none appearance-none cursor-pointer"
        >
          {allStatuses.map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        {/* Date Range */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Calendar size={14} className="absolute start-2.5 top-1/2 -translate-y-1/2 text-dark-500" />
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); }}
              className="ps-8 pe-2 py-2 text-xs bg-dark-950 border border-dark-700 rounded-lg text-dark-100 focus:border-kcc-green focus:outline-none"
            />
          </div>
          <span className="text-dark-500 text-xs">to</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); }}
            className="px-2 py-2 text-xs bg-dark-950 border border-dark-700 rounded-lg text-dark-100 focus:border-kcc-green focus:outline-none"
          />
        </div>

        {/* Export */}
        <button
          onClick={handleExportCSV}
          className="flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-dark-300 border border-dark-700 rounded-lg hover:text-dark-50 hover:border-dark-600 transition-colors"
        >
          <Download size={15} />
          Export CSV
        </button>
      </div>

      {/* Results Count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-dark-400">
          Showing {filteredOrders.length} of {totalOrders} orders
        </p>
      </div>

      {/* Orders Table */}
      <div className="bg-dark-900 border border-dark-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="animate-spin text-kcc-green" size={24} />
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-dark-400">
            <ShoppingCart size={32} className="mb-2" />
            <p>No orders found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-dark-800">
                  <th className="text-start text-xs font-medium text-dark-500 uppercase tracking-wider px-5 py-3">Order #</th>
                  <th className="text-start text-xs font-medium text-dark-500 uppercase tracking-wider px-5 py-3">Type</th>
                  <th className="text-start text-xs font-medium text-dark-500 uppercase tracking-wider px-5 py-3">Customer</th>
                  <th className="text-start text-xs font-medium text-dark-500 uppercase tracking-wider px-5 py-3">Status</th>
                  <th className="text-end text-xs font-medium text-dark-500 uppercase tracking-wider px-5 py-3">Total</th>
                  <th className="text-start text-xs font-medium text-dark-500 uppercase tracking-wider px-5 py-3">Payment</th>
                  <th className="text-start text-xs font-medium text-dark-500 uppercase tracking-wider px-5 py-3">Date</th>
                  <th className="text-center text-xs font-medium text-dark-500 uppercase tracking-wider px-5 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-800">
                {filteredOrders.map((order) => (
                  <tr key={order._id} className="hover:bg-dark-800/50 transition-colors cursor-pointer" onClick={() => window.location.href = `/admin/orders/${order._id}`}>
                    <td className="px-5 py-3.5">
                      <span className="text-sm font-medium text-dark-100">{order.orderNumber}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                        order.type === 'sample' ? 'bg-kcc-green/10 text-kcc-green' : 'bg-kcc-beige/10 text-kcc-beige'
                      }`}>
                        {order.type}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="text-sm text-dark-200">{order.customerInfo?.personName || order.userId?.name || '-'}</p>
                      <p className="text-xs text-dark-500">{order.customerInfo?.companyName || order.userId?.company || ''}</p>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${statusBadgeClasses[order.status] || ''}`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-end text-sm text-dark-200 font-medium">${(order.totals?.total || 0).toLocaleString()}</td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                        order.paymentStatus === 'paid' ? 'bg-green-500/10 text-green-400' :
                        order.paymentStatus === 'refunded' ? 'bg-red-500/10 text-red-400' :
                        'bg-yellow-500/10 text-yellow-400'
                      }`}>
                        {order.paymentStatus}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-dark-400">{formatDate(order.createdAt)}</td>
                    <td className="px-5 py-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                      <Link href={`/admin/orders/${order._id}`} className="inline-flex p-1.5 text-dark-400 hover:text-kcc-green hover:bg-dark-800 rounded-lg transition-colors">
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
          <p className="text-sm text-dark-500">
            Page {currentPage} of {totalPages}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 text-dark-400 hover:text-dark-50 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg hover:bg-dark-800"
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
                    currentPage === page ? 'bg-kcc-green/20 text-kcc-green font-medium' : 'text-dark-400 hover:text-dark-50 hover:bg-dark-800'
                  }`}
                >
                  {page}
                </button>
              );
            })}
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-2 text-dark-400 hover:text-dark-50 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg hover:bg-dark-800"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
