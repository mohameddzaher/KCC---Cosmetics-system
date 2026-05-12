'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ShoppingBag, Calendar, Truck, Hash, Package, Eye, Beaker, ArrowRight
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';

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

const demoOrders: OrderItem[] = [
  {
    id: '1',
    orderNumber: 'KCC-B-001',
    type: 'bulk',
    productType: 'Hydrating Cream',
    size: '50ml',
    containerType: 'Jar',
    quantity: 500,
    status: 'Delivered',
    date: '2024-11-28',
    deliveryTimeline: '2 Months',
    paymentStatus: 'paid',
  },
  {
    id: '2',
    orderNumber: 'KCC-B-002',
    type: 'bulk',
    productType: 'Vitamin C Serum',
    size: '30ml',
    containerType: 'Dropper Bottle',
    quantity: 1000,
    status: 'In Production',
    date: '2024-12-15',
    deliveryTimeline: '3 Months',
    paymentStatus: 'paid',
  },
  {
    id: '3',
    orderNumber: 'KCC-S-001',
    type: 'sample',
    productType: 'Serum',
    size: '30ml',
    containerType: 'Dropper Bottle',
    status: 'Delivered',
    date: '2024-11-15',
    paymentStatus: 'paid',
  },
  {
    id: '4',
    orderNumber: 'KCC-S-003',
    type: 'sample',
    productType: 'Cleanser',
    size: '100ml',
    containerType: 'Pump Bottle',
    status: 'Under Review',
    date: '2024-12-20',
    paymentStatus: 'pending',
  },
];

const statusColors: Record<string, string> = {
  Submitted: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  'Under Review': 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  Approved: 'bg-green-500/10 text-green-400 border-green-500/20',
  'Quotation Sent': 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  'Awaiting Payment': 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  'In Production': 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  Shipped: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  Delivered: 'bg-kcc-green/10 text-kcc-green border-kcc-green/20',
  Closed: 'bg-dark-600/10 text-dark-400 border-dark-600/20',
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

export default function MyOrdersPage() {
  const { t, locale } = useLanguage();
  const { user } = useAuth();
  const [orders, setOrders] = useState<OrderItem[]>(demoOrders);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<FilterType>('all');

  useEffect(() => {
    const fetchOrders = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/orders');
        if (res.ok) {
          const data = await res.json();
          if (data.orders && data.orders.length > 0) {
            setOrders(data.orders);
          }
        }
      } catch {
        // Use demo data
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
          <h1 className="text-2xl font-bold text-dark-50">{t('orders.title')}</h1>
          <p className="text-sm text-dark-400 mt-1">{t('orders.subtitle')}</p>
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
                : 'bg-dark-800/50 text-dark-400 border border-dark-800 hover:text-dark-200 hover:border-dark-700'
            }`}
          >
            {tab.label}
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${
              filter === tab.key ? 'bg-kcc-green/20 text-kcc-green' : 'bg-dark-700 text-dark-500'
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
        <div className="space-y-4">
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
                className="bg-dark-900/50 border border-dark-800 rounded-2xl p-5 hover:border-dark-700 transition-colors"
              >
                <div className="flex flex-col gap-4">
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
                          <h3 className="font-semibold text-dark-50">{productType}</h3>
                          <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                            isSample
                              ? 'bg-blue-500/10 text-blue-400'
                              : 'bg-kcc-beige/10 text-kcc-beige'
                          }`}>
                            {isSample ? t('samples.sample') : t('admin.bulk')}
                          </span>
                          <span className={`px-2 py-0.5 text-xs font-medium rounded-full border ${statusColors[order.status] || 'bg-dark-700 text-dark-400 border-dark-600'}`}>
                            {t(`statuses.${order.status}`)}
                          </span>
                        </div>
                        <p className="text-sm text-dark-400">
                          {containerType && size ? `${containerType} - ${size}` : ''}
                          {quantity ? ` | ${quantity.toLocaleString()} units` : ''}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Order details grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-dark-800/50">
                    <div>
                      <p className="text-xs text-dark-500 mb-0.5">{t('samples.orderNumber')}</p>
                      <p className="text-sm font-mono text-dark-200 flex items-center gap-1">
                        <Hash size={12} />
                        {order.orderNumber}
                      </p>
                    </div>
                    {quantity && (
                      <div>
                        <p className="text-xs text-dark-500 mb-0.5">{t('orders.bulkQuantity')}</p>
                        <p className="text-sm font-semibold text-dark-200">{quantity.toLocaleString()} units</p>
                      </div>
                    )}
                    <div>
                      <p className="text-xs text-dark-500 mb-0.5">{t('samples.created')}</p>
                      <p className="text-sm text-dark-200 flex items-center gap-1">
                        <Calendar size={12} />
                        {dateStr
                          ? new Date(dateStr).toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                          : '-'}
                      </p>
                    </div>
                    {order.paymentStatus && (
                      <div>
                        <p className="text-xs text-dark-500 mb-0.5">{t('samples.paymentStatus')}</p>
                        <p className={`text-sm font-medium capitalize ${paymentStatusColors[order.paymentStatus] || 'text-dark-400'}`}>
                          {order.paymentStatus}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-3 pt-3 border-t border-dark-800/50">
                    <Link
                      href={detailPath}
                      className="flex items-center gap-2 px-4 py-2 bg-dark-800 border border-dark-700 text-dark-300 text-sm font-medium rounded-xl hover:bg-dark-700 hover:text-dark-50 transition-colors"
                    >
                      <Eye size={14} />
                      {t('samples.viewDetails')}
                    </Link>

                    {/* Reorder as Bulk for delivered samples */}
                    {isSample && order.status === 'Delivered' && (
                      <Link
                        href={`/order/bulk?fromSample=${orderId}`}
                        className="flex items-center gap-2 px-4 py-2 bg-kcc-beige/10 border border-kcc-beige/30 text-kcc-beige text-sm font-medium rounded-xl hover:bg-kcc-beige/20 transition-colors"
                      >
                        <Truck size={14} />
                        {t('order.reorderAsBulk')}
                        <ArrowRight size={14} />
                      </Link>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}

          {filteredOrders.length === 0 && (
            <div className="text-center py-20">
              <ShoppingBag size={48} className="text-dark-700 mx-auto mb-4" />
              <p className="text-dark-400 mb-4">
                {t('orders.noOrders')}
              </p>
              <p className="text-sm text-dark-500 mb-4">{t('orders.startOrdering')}</p>
              <div className="flex items-center justify-center gap-3">
                <Link href="/order/sample" className="text-kcc-green hover:text-kcc-green-light transition-colors text-sm font-medium">
                  {t('samples.newSample')}
                </Link>
                <span className="text-dark-600">|</span>
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
