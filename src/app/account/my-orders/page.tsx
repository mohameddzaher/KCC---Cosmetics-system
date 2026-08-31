'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ShoppingBag, Calendar, Truck, Hash, Package, Eye, Beaker, ArrowRight, RefreshCw } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { statusLabel } from '@/lib/orderWorkflow';

interface OrderItem {
  _id?: string;
  id?: string;
  orderNumber: string;
  type?: 'sample' | 'bulk';
  productType?: string;
  size?: string;
  containerType?: string;
  quantity?: number;
  status: string;
  date?: string;
  createdAt?: string;
  deliveryTimeline?: string;
  paymentStatus?: string;
  surveyData?: {
    productType?: string;
    size?: string;
    containerType?: string;
  };
  bulkDetails?: {
    quantity?: number;
    deliveryTimeline?: string;
  };
}


const statusColors: Record<string, string> = {
  Submitted: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  'Under Review': 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  Approved: 'bg-green-500/10 text-green-400 border-green-500/20',
  'Quotation Sent': 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  'Awaiting Payment': 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  'In Production': 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  Shipped: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  Delivered: 'bg-kcc-green/10 text-kcc-green border-kcc-green/20',
  Closed: 'bg-surface-3/10 text-fg-muted border-line-strong/20',
};

const paymentStatusColors: Record<string, string> = {
  pending: 'text-yellow-400',
  paid: 'text-kcc-green',
  refunded: 'text-red-400',
};

type FilterType = 'all' | 'sample' | 'bulk';

function getOrderId(order: OrderItem): string {
  return order._id || order.id || '';
}

function getProductType(order: OrderItem): string {
  return order.surveyData?.productType || order.productType || '-';
}

function getSize(order: OrderItem): string {
  return order.surveyData?.size || order.size || '';
}

function getContainerType(order: OrderItem): string {
  return order.surveyData?.containerType || order.containerType || '';
}

function getQuantity(order: OrderItem): number | undefined {
  return order.bulkDetails?.quantity || order.quantity;
}

function getDeliveryTimeline(order: OrderItem): string {
  return order.bulkDetails?.deliveryTimeline || order.deliveryTimeline || '';
}

function getDate(order: OrderItem): string {
  return order.createdAt || order.date || '';
}

function getOrderType(order: OrderItem): 'sample' | 'bulk' {
  return order.type || (order.orderNumber?.includes('-S-') ? 'sample' : 'bulk');
}

/** Card actions: identical metrics, never wrap inside themselves. */
const cardAction = {
  base:
    'flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-xs font-medium transition-colors',
  get neutral() {
    return `${this.base} border border-line bg-surface text-fg-muted hover:bg-surface-2 hover:text-fg`;
  },
  get primary() {
    return `${this.base} bg-brand text-brand-fg hover:bg-brand-hover`;
  },
};

export default function MyOrdersPage() {
  const { t, locale } = useLanguage();
  const { user } = useAuth();
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<FilterType>('all');

  useEffect(() => {
    const fetchOrders = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/orders');
        if (res.ok) {
          const data = await res.json();
          // Show exactly what the customer has, including nothing — this page
          // used to fall back to invented orders whose links went nowhere.
          setOrders(Array.isArray(data.orders) ? data.orders : []);
        }
      } catch {
        setOrders([]);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, []);

  const filteredOrders = filter === 'all'
    ? orders
    : orders.filter((o) => getOrderType(o) === filter);

  const sampleCount = orders.filter((o) => getOrderType(o) === 'sample').length;
  const bulkCount = orders.filter((o) => getOrderType(o) === 'bulk').length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-fg">{t('orders.title')}</h1>
          <p className="text-sm text-fg-muted mt-1">{t('orders.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/order/sample"
            className="flex items-center gap-2 px-3 py-2 bg-kcc-green/10 border border-kcc-green/30 text-kcc-green text-sm font-medium rounded-xl hover:bg-kcc-green/20 transition-colors"
          >
            <Beaker size={14} />
            {t('samples.newSample')}
          </Link>
          <Link
            href="/order/bulk"
            className="flex items-center gap-2 px-3 py-2 bg-kcc-beige/10 border border-kcc-beige/30 text-kcc-beige text-sm font-medium rounded-xl hover:bg-kcc-beige/20 transition-colors"
          >
            <Truck size={14} />
            {t('orders.newBulk')}
          </Link>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-2 mb-5">
        {[
          { key: 'all' as FilterType, label: t('orders.allOrders'), count: orders.length },
          { key: 'sample' as FilterType, label: t('nav.mySamples'), count: sampleCount },
          { key: 'bulk' as FilterType, label: t('admin.bulk'), count: bulkCount },
        ].map((tab) => (
          <button
            type="button"
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-xl transition-all ${
              filter === tab.key
                ? 'bg-kcc-green/10 text-kcc-green border border-kcc-green/30'
                : 'bg-surface-2/50 text-fg-muted border border-line hover:text-fg hover:border-line'
            }`}
          >
            {tab.label}
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${
              filter === tab.key ? 'bg-kcc-green/20 text-kcc-green' : 'bg-surface-3 text-fg-subtle'
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-kcc-green" />
        </div>
      ) : (
        <div
          className="grid items-stretch gap-4"
          style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(23rem, 100%), 1fr))' }}
        >
          {filteredOrders.map((order, i) => {
            const orderId = getOrderId(order);
            const orderType = getOrderType(order);
            const productType = getProductType(order);
            const size = getSize(order);
            const containerType = getContainerType(order);
            const quantity = getQuantity(order);
            const dateStr = getDate(order);
            const isSample = orderType === 'sample';
            const detailPath = isSample
              ? `/account/my-samples/${orderId}`
              : `/account/my-orders/${orderId}`;

            return (
              <motion.div
                key={orderId || order.orderNumber}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex min-w-0 flex-col rounded-2xl border border-line bg-surface p-5 transition-colors hover:border-line-strong"
              >
                <div className="flex h-full min-w-0 flex-col gap-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                        isSample
                          ? 'bg-kcc-green/10 text-kcc-green'
                          : 'bg-kcc-beige/10 text-kcc-beige'
                      }`}>
                        {isSample ? <Package size={22} /> : <ShoppingBag size={22} />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-fg">{productType}</h3>
                          <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                            isSample
                              ? 'bg-blue-500/10 text-blue-400'
                              : 'bg-kcc-beige/10 text-kcc-beige'
                          }`}>
                            {isSample ? t('samples.sample') : t('admin.bulk')}
                          </span>
                          <span className={`px-2 py-0.5 text-xs font-medium rounded-full border ${statusColors[order.status] || 'bg-surface-3 text-fg-muted border-line-strong'}`}>
                            {statusLabel(order.status, locale)}
                          </span>
                        </div>
                        <p className="text-sm text-fg-muted">
                          {[
                            containerType && size ? `${containerType} - ${size}` : '',
                            quantity ? `${quantity.toLocaleString()} units` : '',
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Order details grid */}
                  <div className="grid grid-cols-2 gap-3 border-t border-line/50 pt-3">
                    <div>
                      <p className="text-xs text-fg-subtle mb-0.5">{t('samples.orderNumber')}</p>
                      <p className="text-sm font-mono text-fg flex items-center gap-1">
                        <Hash size={12} />
                        {order.orderNumber}
                      </p>
                    </div>
                    {quantity && (
                      <div>
                        <p className="text-xs text-fg-subtle mb-0.5">{t('orders.bulkQuantity')}</p>
                        <p className="text-sm font-semibold text-fg">{quantity.toLocaleString()} units</p>
                      </div>
                    )}
                    <div>
                      <p className="text-xs text-fg-subtle mb-0.5">{t('samples.created')}</p>
                      <p className="text-sm text-fg flex items-center gap-1">
                        <Calendar size={12} />
                        {dateStr
                          ? new Date(dateStr).toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                          : '-'}
                      </p>
                    </div>
                    {order.paymentStatus && (
                      <div>
                        <p className="text-xs text-fg-subtle mb-0.5">{t('samples.paymentStatus')}</p>
                        <p className={`text-sm font-medium capitalize ${paymentStatusColors[order.paymentStatus] || 'text-fg-muted'}`}>
                          {order.paymentStatus}
                        </p>
                      </div>
                    )}
                  </div>

                  {/*
                    One row, allowed to wrap BETWEEN buttons.

                    It used to be `flex` with no `flex-wrap`, so when three
                    buttons did not fit, flex shrank each one below its content
                    width and the labels wrapped INSIDE the buttons instead —
                    "View Details" came out three lines tall. `flex-wrap` plus
                    `shrink-0` and `whitespace-nowrap` means a button either
                    fits on this line or moves to the next one whole.
                  */}
                  <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-line/50 pt-3">
                    <Link
                      href={detailPath}
                      className={cardAction.neutral}
                    >
                      <Eye size={14} />
                      {t('samples.viewDetails')}
                    </Link>

                    {/* A sample can be reordered as a sample (with edits) or
                        scaled up to bulk. A bulk order is already at scale, so
                        the only sensible repeat is another bulk run. */}
                    {isSample && (
                      <Link
                        href={`/order/sample?from=${orderId}`}
                        title={t('order.orderAgainHint')}
                        className={cardAction.primary}
                      >
                        <RefreshCw size={14} />
                        {t('order.orderAgainShort')}
                      </Link>
                    )}
                    <Link
                      href={`/order/bulk?fromSample=${orderId}`}
                      className={cardAction.neutral}
                    >
                      <Truck size={14} />
                      {isSample ? t('order.reorderAsBulk') : t('order.reorderThisBulk')}
                    </Link>
                  </div>
                </div>
              </motion.div>
            );
          })}

          {filteredOrders.length === 0 && (
            <div className="col-span-full py-20 text-center">
              <ShoppingBag size={48} className="text-fg-subtle mx-auto mb-4" />
              <p className="text-fg-muted mb-4">
                {t('orders.noOrders')}
              </p>
              <p className="text-sm text-fg-subtle mb-4">{t('orders.startOrdering')}</p>
              <div className="flex items-center justify-center gap-3">
                <Link href="/order/sample" className="text-kcc-green hover:text-kcc-green-light transition-colors text-sm font-medium">
                  {t('samples.newSample')}
                </Link>
                <span className="text-fg-subtle">|</span>
                <Link href="/order/bulk" className="text-kcc-beige hover:text-kcc-beige/80 transition-colors text-sm font-medium">
                  {t('orders.newBulk')}
                </Link>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
