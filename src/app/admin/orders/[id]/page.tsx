'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Loader2, Save, User, CreditCard,
  FileText, Clock, MapPin, Phone, Mail, Building2,
  Hash, DollarSign, Truck, CheckCircle, AlertCircle, Trash2
} from 'lucide-react';
import OrderWorkflow from '@/components/admin/OrderWorkflow';
import OrderAssignments from '@/components/admin/OrderAssignments';
import OrderFeedbackPanel from '@/components/admin/OrderFeedbackPanel';
import { usePermission } from '@/contexts/AuthContext';
import { statusBadgeClass, statusLabel } from '@/lib/orderWorkflow';
import { useLanguage } from '@/contexts/LanguageContext';

const PAYMENT_STATUSES = ['pending', 'paid', 'refunded'];

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { t, locale, tx } = useLanguage();
  const { can } = usePermission();
  const orderId = params.id as string;

  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Editable fields
  const [status, setStatus] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');
  const [internalNotes, setInternalNotes] = useState('');

  const loadOrder = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/orders/${orderId}`);
      if (res.ok) {
        const data = await res.json();
        setOrder(data);
        setStatus(data.status || '');
        setPaymentStatus(data.paymentStatus || 'pending');
        setInternalNotes(data.internalNotes || '');
      } else if (res.status === 404) {
        setError('Order not found');
      } else {
        const err = await res.json();
        setError(err.error || 'Failed to load order');
      }
    } catch (err) {
      console.error('Failed to load order:', err);
      setError('Failed to load order');
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    if (orderId) {
      loadOrder();
    }
  }, [orderId, loadOrder]);

  const handleDelete = async () => {
    if (!confirm('Permanently delete this order? This cannot be undone.')) return;
    try {
      const res = await fetch(`/api/orders/${orderId}`, { method: 'DELETE' });
      if (res.ok) {
        router.push('/admin/orders');
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to delete order');
      }
    } catch (err) {
      console.error('Failed to delete order:', err);
      alert('Failed to delete order');
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveSuccess(false);
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentStatus,
          internalNotes,
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setOrder(updated);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to update order');
      }
    } catch (err) {
      console.error('Failed to update order:', err);
      alert('Failed to update order');
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  const formatCurrency = (amount: number) => {
    return `$${(amount || 0).toFixed(2)}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-kcc-green" size={24} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <Link href="/admin/orders" className="inline-flex items-center gap-2 text-sm text-fg-muted hover:text-kcc-green transition-colors">
          <ArrowLeft size={16} className="rtl-flip" /> {t('admin.ordersTitle')}
        </Link>
        <div className="flex flex-col items-center justify-center h-48 text-fg-muted">
          <AlertCircle size={32} className="mb-2" />
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!order) return null;

  const customer = order.userId || {};
  const customerInfo = order.customerInfo || {};
  const totals = order.totals || {};
  const promo = order.promoCodeId;
  const bulkDetails = order.bulkDetails;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/admin/orders" className="p-2 text-fg-muted hover:text-kcc-green hover:bg-surface-2 rounded-lg transition-colors">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-lg font-semibold text-fg">
              {t('admin.order')} {order.orderNumber}
            </h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                order.type === 'sample' ? 'bg-blue-500/10 text-blue-400' : 'bg-kcc-beige/10 text-kcc-beige'
              }`}>
                {order.type === 'sample' ? t('admin.sample') : t('admin.bulk')}
              </span>
              <span className="text-xs text-fg-subtle">{formatDate(order.createdAt)}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleDelete}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-red-400 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 rounded-lg transition-colors"
          >
            <Trash2 size={14} />
            {t('ui.delete')}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-brand-fg bg-brand hover:bg-brand-hover rounded-lg transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {t('ui.saveChanges')}
          </button>
        </div>
      </div>

      {/* Success message */}
      {saveSuccess && (
        <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-xl text-green-400 text-sm">
          <CheckCircle size={16} />
          {t('admin.saved')}
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3 xl:gap-6">
        {/* Left column - Order details */}
        <div className="min-w-0 space-y-5 lg:col-span-2">
          {/* Workflow — the only place a status can change */}
          <OrderWorkflow
            orderId={orderId}
            status={status}
            timeline={order.timeline || []}
            onChanged={(nextStatus) => {
              setStatus(nextStatus);
              loadOrder();
            }}
          />

          {/* The customer's verdict once it landed, plus our reply. */}
          <OrderFeedbackPanel orderId={orderId} />

          {can('orders.assign') && (
            <OrderAssignments
              orderId={orderId}
              assignments={order.assignments || {}}
              onSaved={loadOrder}
            />
          )}

          <div className="bg-surface border border-line rounded-xl p-5">
            <h2 className="text-sm font-semibold text-fg mb-4 flex items-center gap-2">
              <CreditCard size={16} className="text-brand" />
              {t('admin.payment')}
            </h2>
            <label className="field-label" htmlFor="payment-status">{t('admin.orderStatus')}</label>
            <select
              id="payment-status"
              value={paymentStatus}
              onChange={(e) => setPaymentStatus(e.target.value)}
              className="field max-w-xs"
            >
              {PAYMENT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s === 'paid' ? t('admin.paid') : s === 'refunded' ? t('ui.reset') : t('admin.unpaid')}
                </option>
              ))}
            </select>
          </div>

          {/* Customer Info */}
          <div className="bg-surface border border-line rounded-xl p-5">
            <h2 className="text-sm font-semibold text-fg mb-4 flex items-center gap-2">
              <User size={16} className="text-kcc-green" />
              {t('admin.customerInfo')}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-2 text-sm">
                <User size={14} className="text-fg-subtle shrink-0" />
                <div>
                  <p className="text-fg-muted text-xs">{tx('Account Name')}</p>
                  <p className="text-fg">{customer.name || '-'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Mail size={14} className="text-fg-subtle shrink-0" />
                <div>
                  <p className="text-fg-muted text-xs">{tx('Account Email')}</p>
                  <p className="text-fg">{customer.email || '-'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Building2 size={14} className="text-fg-subtle shrink-0" />
                <div>
                  <p className="text-fg-muted text-xs">{tx('Company')}</p>
                  <p className="text-fg">{customerInfo.companyName || customer.company || '-'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Phone size={14} className="text-fg-subtle shrink-0" />
                <div>
                  <p className="text-fg-muted text-xs">{tx('Phone')}</p>
                  <p className="text-fg">{customerInfo.phone || customer.phone || '-'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <MapPin size={14} className="text-fg-subtle shrink-0" />
                <div>
                  <p className="text-fg-muted text-xs">{tx('Country / City')}</p>
                  <p className="text-fg">
                    {[customerInfo.country, customerInfo.city].filter(Boolean).join(', ') || '-'}
                  </p>
                </div>
              </div>
              {customerInfo.address && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin size={14} className="text-fg-subtle shrink-0" />
                  <div>
                    <p className="text-fg-muted text-xs">{tx('Address')}</p>
                    <p className="text-fg">{customerInfo.address}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Bulk Details (if applicable) */}
          {order.type === 'bulk' && bulkDetails && (
            <div className="bg-surface border border-line rounded-xl p-5">
              <h2 className="text-sm font-semibold text-fg mb-4 flex items-center gap-2">
                <Truck size={16} className="text-kcc-beige" />{tx('Bulk Order Details')}</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {bulkDetails.quantity && (
                  <div>
                    <p className="text-xs text-fg-muted">{tx('Quantity')}</p>
                    <p className="text-sm font-medium text-fg">{bulkDetails.quantity.toLocaleString()} units</p>
                  </div>
                )}
                {bulkDetails.deliveryTimeline && (
                  <div>
                    <p className="text-xs text-fg-muted">{tx('Delivery Timeline')}</p>
                    <p className="text-sm font-medium text-fg">{bulkDetails.deliveryTimeline}</p>
                  </div>
                )}
                {bulkDetails.pricingNotes && (
                  <div className="md:col-span-3">
                    <p className="text-xs text-fg-muted">{tx('Pricing Notes')}</p>
                    <p className="text-sm text-fg mt-1">{bulkDetails.pricingNotes}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Internal Notes */}
          <div className="bg-surface border border-line rounded-xl p-5">
            <h2 className="text-sm font-semibold text-fg mb-4 flex items-center gap-2">
              <FileText size={16} className="text-kcc-green" />
              {t('admin.internalNotes')}
            </h2>
            <textarea
              value={internalNotes}
              onChange={(e) => setInternalNotes(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 text-sm bg-bg border border-line rounded-lg text-fg focus:border-kcc-green focus:outline-none resize-none"
              placeholder={t('admin.internalNotes')}
            />
          </div>

          {/* Attachments */}
          {order.attachments && order.attachments.length > 0 && (
            <div className="bg-surface border border-line rounded-xl p-5">
              <h2 className="text-sm font-semibold text-fg mb-4 flex items-center gap-2">
                <FileText size={16} className="text-kcc-green" />
                {t('admin.attachments')}
              </h2>
              <div className="space-y-2">
                {order.attachments.map((att: any, i: number) => (
                  <a
                    key={i}
                    href={att.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 p-2.5 bg-bg border border-line rounded-lg text-sm text-fg hover:text-kcc-green hover:border-kcc-green/30 transition-colors"
                  >
                    <FileText size={14} className="shrink-0" />
                    {att.name || `Attachment ${i + 1}`}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right column - Summary */}
        <div className="min-w-0 space-y-5">
          {/* Financial Summary */}
          <div className="bg-surface border border-line rounded-xl p-5">
            <h2 className="text-sm font-semibold text-fg mb-4 flex items-center gap-2">
              <DollarSign size={16} className="text-kcc-green" />{tx('Financial Summary')}</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-fg-muted">{tx('Subtotal')}</span>
                <span className="text-fg">{formatCurrency(totals.subtotal)}</span>
              </div>
              {totals.discount > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-fg-muted">{tx('Discount')}</span>
                  <span className="text-red-400">-{formatCurrency(totals.discount)}</span>
                </div>
              )}
              {totals.tax > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-fg-muted">Tax</span>
                  <span className="text-fg">{formatCurrency(totals.tax)}</span>
                </div>
              )}
              <div className="pt-3 border-t border-line flex items-center justify-between">
                <span className="text-sm font-medium text-fg">{tx('Total')}</span>
                <span className="text-lg font-bold text-kcc-green">{formatCurrency(totals.total)}</span>
              </div>
            </div>
          </div>

          {/* Payment Info */}
          <div className="bg-surface border border-line rounded-xl p-5">
            <h2 className="text-sm font-semibold text-fg mb-4 flex items-center gap-2">
              <CreditCard size={16} className="text-kcc-green" />{tx('Payment Info')}</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-fg-muted">{tx('Method')}</span>
                <span className="text-fg capitalize">{order.paymentMethod || '-'}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-fg-muted">{tx('Status')}</span>
                <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                  paymentStatus === 'paid' ? 'bg-green-500/10 text-green-400' :
                  paymentStatus === 'refunded' ? 'bg-red-500/10 text-red-400' :
                  'bg-yellow-500/10 text-yellow-400'
                }`}>
                  {paymentStatus.charAt(0).toUpperCase() + paymentStatus.slice(1)}
                </span>
              </div>
            </div>
          </div>

          {/* Promo Code */}
          {promo && (
            <div className="bg-surface border border-line rounded-xl p-5">
              <h2 className="text-sm font-semibold text-fg mb-4 flex items-center gap-2">
                <Hash size={16} className="text-kcc-beige" />{tx('Promo Code')}</h2>
              <div className="space-y-2">
                <code className="text-sm font-bold text-kcc-green bg-kcc-green/10 px-2.5 py-1 rounded">
                  {promo.code}
                </code>
                <p className="text-xs text-fg-muted">
                  {promo.type === 'percentage' ? `${promo.value}% off` : `$${promo.value} off`}
                </p>
              </div>
            </div>
          )}

          {/* Referral Code */}
          {order.referralCode && (
            <div className="bg-surface border border-line rounded-xl p-5">
              <h2 className="text-sm font-semibold text-fg mb-3">{tx('Referral Code')}</h2>
              <code className="text-sm text-kcc-beige bg-kcc-beige/10 px-2.5 py-1 rounded">
                {order.referralCode}
              </code>
            </div>
          )}

          {/* Timeline */}
          <div className="bg-surface border border-line rounded-xl p-5">
            <h2 className="text-sm font-semibold text-fg mb-4 flex items-center gap-2">
              <Clock size={16} className="text-kcc-green" />{tx('Timeline')}</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-fg-muted">{tx('Created')}</span>
                <span className="text-fg">{formatDate(order.createdAt)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-fg-muted">{tx('Last Updated')}</span>
                <span className="text-fg">{formatDate(order.updatedAt)}</span>
              </div>
            </div>
          </div>

          {/* Converted From Sample */}
          {order.convertedFromSample && (
            <div className="bg-surface border border-line rounded-xl p-5">
              <h2 className="text-sm font-semibold text-fg mb-3">{tx('Converted From Sample')}</h2>
              <Link
                href={`/admin/orders/${order.convertedFromSample._id}`}
                className="text-sm text-kcc-green hover:underline"
              >
                {order.convertedFromSample.orderNumber}
              </Link>
              <span className={`ms-2 badge ${statusBadgeClass(order.convertedFromSample.status)}`}>
                {statusLabel(order.convertedFromSample.status, locale)}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
