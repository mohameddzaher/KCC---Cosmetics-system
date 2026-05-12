'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Package, Calendar, Truck, ShoppingBag, Hash,
  User, CreditCard, FileText, Clock,
  MapPin, Phone, Mail, Building2,
  AlertCircle, Eye
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import OrderProgressTracker from '@/components/account/OrderProgressTracker';

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

function formatDate(dateStr: string | undefined, dateLocale: string = 'en-US') {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString(dateLocale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatCurrency(amount: number) {
  return `$${(amount || 0).toFixed(2)}`;
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between items-start py-2.5 border-b border-dark-800/30 last:border-b-0">
      <span className="text-sm text-dark-400 shrink-0 pr-4">{label}</span>
      <span className="text-sm text-dark-100 font-medium text-end">{value || '-'}</span>
    </div>
  );
}

function SectionCard({ title, icon: Icon, children }: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-dark-900/50 border border-dark-800 rounded-2xl overflow-hidden"
    >
      <div className="flex items-center gap-2 px-5 py-3.5 border-b border-dark-800 bg-dark-800/20">
        <Icon size={16} className="text-kcc-green shrink-0" />
        <h3 className="text-sm font-semibold text-dark-200 uppercase tracking-wider">{title}</h3>
      </div>
      <div className="px-5 py-4">
        {children}
      </div>
    </motion.div>
  );
}

export default function OrderDetailPage() {
  const { t, locale } = useLanguage();
  const dateLocale = locale === 'ar' ? 'ar-SA' : 'en-US';
  const params = useParams();
  const orderId = params.id as string;

  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadOrder = useCallback(async (silent = false) => {
    if (!silent) {
      setLoading(true);
      setError(null);
    }
    try {
      const res = await fetch(`/api/orders/${orderId}?ts=${Date.now()}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setOrder(data);
      } else if (res.status === 404) {
        if (!silent) setError(t('samples.sampleNotFound'));
      } else if (res.status === 401) {
        if (!silent) setError(t('samples.loginToView'));
      } else {
        const err = await res.json().catch(() => ({ error: t('samples.failedToLoad') }));
        if (!silent) setError(err.error || t('samples.failedToLoad'));
      }
    } catch {
      if (!silent) {
        setError(t('samples.failedToLoadConnection'));
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, [orderId, t]);

  useEffect(() => {
    if (orderId) {
      loadOrder();
    }
  }, [orderId, loadOrder]);

  useEffect(() => {
    if (!orderId) return;

    const intervalId = window.setInterval(() => {
      loadOrder(true);
    }, 1000);

    const onFocus = () => loadOrder(true);
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        loadOrder(true);
      }
    };

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [orderId, loadOrder]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-kcc-green" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <Link
          href="/account/my-orders"
          className="inline-flex items-center gap-2 text-sm text-dark-400 hover:text-kcc-green transition-colors"
        >
          <ArrowLeft size={16} />
          {t('orders.backToOrders')}
        </Link>
        <div className="flex flex-col items-center justify-center py-20">
          <AlertCircle size={48} className="text-dark-600 mb-4" />
          <p className="text-dark-400 mb-4">{error}</p>
          <button
            type="button"
            onClick={() => loadOrder()}
            className="text-kcc-green hover:text-kcc-green-light text-sm font-medium transition-colors"
          >
            {t('common.tryAgain')}
          </button>
        </div>
      </div>
    );
  }

  if (!order) return null;

  // If this is a sample order, redirect user to sample detail page
  if (order.type === 'sample') {
    return (
      <div className="space-y-4">
        <Link
          href="/account/my-orders"
          className="inline-flex items-center gap-2 text-sm text-dark-400 hover:text-kcc-green transition-colors"
        >
          <ArrowLeft size={16} />
          {t('orders.backToOrders')}
        </Link>
        <div className="flex flex-col items-center justify-center py-20">
          <Package size={48} className="text-kcc-green mb-4" />
          <p className="text-dark-300 mb-4">{t('samples.sample')}</p>
          <Link
            href={`/account/my-samples/${orderId}`}
            className="flex items-center gap-2 px-5 py-2.5 bg-kcc-green hover:bg-kcc-green-light text-white font-medium rounded-xl transition-colors"
          >
            <Eye size={16} />
            {t('samples.viewDetails')}
          </Link>
        </div>
      </div>
    );
  }

  const survey = order.surveyData || {};
  const customerInfo = order.customerInfo || {};
  const bulkDetails = order.bulkDetails || {};
  const totals = order.totals || {};
  const productType = survey.productType || '';
  const size = survey.size || '';
  const containerType = survey.containerType || '';

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href="/account/my-orders"
        className="inline-flex items-center gap-2 text-sm text-dark-400 hover:text-kcc-green transition-colors"
      >
        <ArrowLeft size={16} />
        {t('orders.backToOrders')}
      </Link>

      {/* Header card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-dark-900/50 border border-dark-800 rounded-2xl p-6"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-kcc-beige/10 text-kcc-beige flex items-center justify-center shrink-0">
              <ShoppingBag size={28} />
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-xl font-bold text-dark-50">
                  {productType || t('admin.bulk')}
                </h1>
                <span className="px-2.5 py-0.5 text-xs font-medium rounded-full bg-kcc-beige/10 text-kcc-beige">
                  {t('admin.bulk')}
                </span>
                <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full border ${statusColors[order.status] || 'bg-dark-700 text-dark-400 border-dark-600'}`}>
                  {t(`statuses.${order.status}`)}
                </span>
              </div>
              <p className="text-sm text-dark-400">
                {containerType && size ? `${containerType} - ${size}` : ''}
                {bulkDetails.quantity ? ` | ${bulkDetails.quantity.toLocaleString()} units` : ''}
              </p>
              <div className="flex items-center gap-4 mt-2 text-xs text-dark-500">
                <span className="font-mono flex items-center gap-1">
                  <Hash size={10} />
                  {order.orderNumber}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar size={10} />
                  {formatDate(order.createdAt, dateLocale)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      <OrderProgressTracker status={order.status} updatedAt={order.updatedAt} />

      {/* Detail sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Order Info */}
        <SectionCard title={t('samples.orderInfo')} icon={FileText}>
          <DetailRow label={t('samples.orderNumber')} value={<span className="font-mono">{order.orderNumber}</span>} />
          <DetailRow label={t('samples.type')} value={
            <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-kcc-beige/10 text-kcc-beige">
              {t('admin.bulk')}
            </span>
          } />
          <DetailRow label={t('samples.status')} value={
            <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full border ${statusColors[order.status] || 'bg-dark-700 text-dark-400 border-dark-600'}`}>
              {t(`statuses.${order.status}`)}
            </span>
          } />
          <DetailRow label={t('samples.created')} value={formatDate(order.createdAt, dateLocale)} />
          <DetailRow label={t('samples.lastUpdated')} value={formatDate(order.updatedAt, dateLocale)} />
        </SectionCard>

        {/* Bulk Details */}
        <SectionCard title={t('orders.bulkDetails')} icon={Truck}>
          <DetailRow label={t('samples.productType')} value={productType} />
          <DetailRow label={t('samples.size')} value={size} />
          <DetailRow label={t('samples.containerType')} value={containerType} />
          {bulkDetails.quantity && (
            <DetailRow label={t('orders.bulkQuantity')} value={`${bulkDetails.quantity.toLocaleString()} units`} />
          )}
          {bulkDetails.deliveryTimeline && (
            <DetailRow label={t('orders.deliveryTimeline')} value={bulkDetails.deliveryTimeline} />
          )}
          {bulkDetails.pricingNotes && (
            <DetailRow label={t('orders.pricingNotes')} value={bulkDetails.pricingNotes} />
          )}
          {survey.skinType && <DetailRow label={t('samples.skinType')} value={survey.skinType} />}
          {survey.primaryGoal && <DetailRow label={t('samples.primaryGoal')} value={survey.primaryGoal} />}
        </SectionCard>

        {/* Customer Info */}
        <SectionCard title={t('samples.customerInfoSection')} icon={User}>
          <DetailRow label={t('samples.customerName')} value={
            <span className="flex items-center gap-1.5">
              <User size={12} className="text-dark-500" />
              {customerInfo.personName || order.userId?.name}
            </span>
          } />
          <DetailRow label={t('samples.customerEmail')} value={
            <span className="flex items-center gap-1.5">
              <Mail size={12} className="text-dark-500" />
              {customerInfo.email || order.userId?.email}
            </span>
          } />
          {(customerInfo.phone || order.userId?.phone) && (
            <DetailRow label={t('samples.customerPhone')} value={
              <span className="flex items-center gap-1.5">
                <Phone size={12} className="text-dark-500" />
                {customerInfo.phone || order.userId?.phone}
              </span>
            } />
          )}
          {(customerInfo.companyName || order.userId?.company) && (
            <DetailRow label={t('samples.customerCompany')} value={
              <span className="flex items-center gap-1.5">
                <Building2 size={12} className="text-dark-500" />
                {customerInfo.companyName || order.userId?.company}
              </span>
            } />
          )}
          {(customerInfo.country || customerInfo.city) && (
            <DetailRow label={t('samples.customerLocation')} value={
              <span className="flex items-center gap-1.5">
                <MapPin size={12} className="text-dark-500" />
                {[customerInfo.city, customerInfo.country].filter(Boolean).join(', ')}
              </span>
            } />
          )}
          {customerInfo.address && (
            <DetailRow label={t('samples.customerAddress')} value={customerInfo.address} />
          )}
        </SectionCard>

        {/* Payment & Financial */}
        <SectionCard title={t('samples.paymentSection')} icon={CreditCard}>
          <DetailRow label={t('samples.paymentMethod')} value={
            <span className="capitalize">{order.paymentMethod || '-'}</span>
          } />
          <DetailRow label={t('samples.paymentStatus')} value={
            <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full capitalize ${
              order.paymentStatus === 'paid' ? 'bg-kcc-green/10 text-kcc-green' :
              order.paymentStatus === 'refunded' ? 'bg-red-500/10 text-red-400' :
              'bg-yellow-500/10 text-yellow-400'
            }`}>
              {order.paymentStatus || 'pending'}
            </span>
          } />
          {totals.subtotal > 0 && <DetailRow label={t('orders.subtotal')} value={formatCurrency(totals.subtotal)} />}
          {totals.discount > 0 && <DetailRow label={t('orders.discount')} value={
            <span className="text-red-400">-{formatCurrency(totals.discount)}</span>
          } />}
          {totals.tax > 0 && <DetailRow label={t('orders.tax')} value={formatCurrency(totals.tax)} />}
          {totals.total > 0 && (
            <div className="flex justify-between items-center pt-3 mt-1 border-t border-dark-700">
              <span className="text-sm font-medium text-dark-200">{t('orders.total')}</span>
              <span className="text-lg font-bold text-kcc-green">{formatCurrency(totals.total)}</span>
            </div>
          )}
          {order.promoCodeId && (
            <DetailRow label={t('samples.promoCode')} value={
              <code className="text-xs font-bold text-kcc-green bg-kcc-green/10 px-2 py-0.5 rounded">
                {order.promoCodeId.code || 'Applied'}
              </code>
            } />
          )}
          {order.referralCode && (
            <DetailRow label={t('samples.referralCodeLabel')} value={
              <code className="text-xs text-kcc-beige bg-kcc-beige/10 px-2 py-0.5 rounded">
                {order.referralCode}
              </code>
            } />
          )}
        </SectionCard>

        {/* Converted From Sample */}
        {order.convertedFromSample && (
          <SectionCard title={t('samples.sample')} icon={Package}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-dark-200 font-medium">
                  {order.convertedFromSample.orderNumber || t('samples.sample')}
                </p>
                {order.convertedFromSample.status && (
                  <span className={`inline-flex mt-1 px-2 py-0.5 text-xs font-medium rounded-full border ${statusColors[order.convertedFromSample.status] || 'bg-dark-700 text-dark-400 border-dark-600'}`}>
                    {t(`statuses.${order.convertedFromSample.status}`)}
                  </span>
                )}
              </div>
              <Link
                href={`/account/my-samples/${order.convertedFromSample._id}`}
                className="flex items-center gap-1.5 text-sm text-kcc-green hover:text-kcc-green-light transition-colors"
              >
                <Eye size={14} />
                {t('samples.viewDetails')}
              </Link>
            </div>
          </SectionCard>
        )}

        {/* Timeline */}
        <SectionCard title={t('orders.timeline')} icon={Clock}>
          <DetailRow label={t('orders.orderCreated')} value={formatDate(order.createdAt, dateLocale)} />
          <DetailRow label={t('orders.lastUpdate')} value={formatDate(order.updatedAt, dateLocale)} />
        </SectionCard>
      </div>
    </div>
  );
}
