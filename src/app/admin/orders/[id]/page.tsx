'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Loader2, Save, Package, User, CreditCard,
  FileText, Calendar, Clock, MapPin, Phone, Mail, Building2,
  Hash, DollarSign, Truck, CheckCircle, AlertCircle, Trash2
} from 'lucide-react';

const ORDER_STATUSES = [
  'Submitted',
  'Under Review',
  'Approved',
  'Quotation Sent',
  'Awaiting Payment',
  'In Production',
  'Shipped',
  'Delivered',
  'Closed',
];

const PAYMENT_STATUSES = ['pending', 'paid', 'refunded'];

const statusColors: Record<string, string> = {
  'Submitted': 'bg-blue-500/10 text-blue-400',
  'Under Review': 'bg-yellow-500/10 text-yellow-400',
  'Approved': 'bg-green-500/10 text-green-400',
  'Quotation Sent': 'bg-purple-500/10 text-purple-400',
  'Awaiting Payment': 'bg-orange-500/10 text-orange-400',
  'In Production': 'bg-cyan-500/10 text-cyan-400',
  'Shipped': 'bg-indigo-500/10 text-indigo-400',
  'Delivered': 'bg-green-500/10 text-green-400',
  'Closed': 'bg-dark-700 text-dark-400',
};

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
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
          status,
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
        <Link href="/admin/orders" className="inline-flex items-center gap-2 text-sm text-dark-400 hover:text-kcc-green transition-colors">
          <ArrowLeft size={16} /> Back to Orders
        </Link>
        <div className="flex flex-col items-center justify-center h-48 text-dark-400">
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
          <Link href="/admin/orders" className="p-2 text-dark-400 hover:text-kcc-green hover:bg-dark-800 rounded-lg transition-colors">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-lg font-semibold text-dark-50">
              Order {order.orderNumber}
            </h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                order.type === 'sample' ? 'bg-blue-500/10 text-blue-400' : 'bg-kcc-beige/10 text-kcc-beige'
              }`}>
                {order.type === 'sample' ? 'Sample' : 'Bulk'}
              </span>
              <span className="text-xs text-dark-500">{formatDate(order.createdAt)}</span>
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
            Delete
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-dark-950 bg-kcc-green hover:bg-kcc-green-light rounded-lg transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Save Changes
          </button>
        </div>
      </div>

      {/* Success message */}
      {saveSuccess && (
        <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-xl text-green-400 text-sm">
          <CheckCircle size={16} />
          Order updated successfully!
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column - Order details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Status & Payment */}
          <div className="bg-dark-900 border border-dark-800 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-dark-100 mb-4 flex items-center gap-2">
              <Package size={16} className="text-kcc-green" />
              Order Status
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-dark-400 mb-1.5">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-dark-950 border border-dark-700 rounded-lg text-dark-100 focus:border-kcc-green focus:outline-none"
                >
                  {ORDER_STATUSES.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-dark-400 mb-1.5">Payment Status</label>
                <select
                  value={paymentStatus}
                  onChange={(e) => setPaymentStatus(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-dark-950 border border-dark-700 rounded-lg text-dark-100 focus:border-kcc-green focus:outline-none"
                >
                  {PAYMENT_STATUSES.map(s => (
                    <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Customer Info */}
          <div className="bg-dark-900 border border-dark-800 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-dark-100 mb-4 flex items-center gap-2">
              <User size={16} className="text-kcc-green" />
              Customer Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-2 text-sm">
                <User size={14} className="text-dark-500 shrink-0" />
                <div>
                  <p className="text-dark-400 text-xs">Account Name</p>
                  <p className="text-dark-100">{customer.name || '-'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Mail size={14} className="text-dark-500 shrink-0" />
                <div>
                  <p className="text-dark-400 text-xs">Account Email</p>
                  <p className="text-dark-100">{customer.email || '-'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Building2 size={14} className="text-dark-500 shrink-0" />
                <div>
                  <p className="text-dark-400 text-xs">Company</p>
                  <p className="text-dark-100">{customerInfo.companyName || customer.company || '-'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Phone size={14} className="text-dark-500 shrink-0" />
                <div>
                  <p className="text-dark-400 text-xs">Phone</p>
                  <p className="text-dark-100">{customerInfo.phone || customer.phone || '-'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <MapPin size={14} className="text-dark-500 shrink-0" />
                <div>
                  <p className="text-dark-400 text-xs">Country / City</p>
                  <p className="text-dark-100">
                    {[customerInfo.country, customerInfo.city].filter(Boolean).join(', ') || '-'}
                  </p>
                </div>
              </div>
              {customerInfo.address && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin size={14} className="text-dark-500 shrink-0" />
                  <div>
                    <p className="text-dark-400 text-xs">Address</p>
                    <p className="text-dark-100">{customerInfo.address}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Bulk Details (if applicable) */}
          {order.type === 'bulk' && bulkDetails && (
            <div className="bg-dark-900 border border-dark-800 rounded-xl p-5">
              <h2 className="text-sm font-semibold text-dark-100 mb-4 flex items-center gap-2">
                <Truck size={16} className="text-kcc-beige" />
                Bulk Order Details
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {bulkDetails.quantity && (
                  <div>
                    <p className="text-xs text-dark-400">Quantity</p>
                    <p className="text-sm font-medium text-dark-100">{bulkDetails.quantity.toLocaleString()} units</p>
                  </div>
                )}
                {bulkDetails.deliveryTimeline && (
                  <div>
                    <p className="text-xs text-dark-400">Delivery Timeline</p>
                    <p className="text-sm font-medium text-dark-100">{bulkDetails.deliveryTimeline}</p>
                  </div>
                )}
                {bulkDetails.pricingNotes && (
                  <div className="md:col-span-3">
                    <p className="text-xs text-dark-400">Pricing Notes</p>
                    <p className="text-sm text-dark-200 mt-1">{bulkDetails.pricingNotes}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Internal Notes */}
          <div className="bg-dark-900 border border-dark-800 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-dark-100 mb-4 flex items-center gap-2">
              <FileText size={16} className="text-kcc-green" />
              Internal Notes
            </h2>
            <textarea
              value={internalNotes}
              onChange={(e) => setInternalNotes(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 text-sm bg-dark-950 border border-dark-700 rounded-lg text-dark-100 focus:border-kcc-green focus:outline-none resize-none"
              placeholder="Add internal notes about this order..."
            />
          </div>

          {/* Attachments */}
          {order.attachments && order.attachments.length > 0 && (
            <div className="bg-dark-900 border border-dark-800 rounded-xl p-5">
              <h2 className="text-sm font-semibold text-dark-100 mb-4 flex items-center gap-2">
                <FileText size={16} className="text-kcc-green" />
                Attachments
              </h2>
              <div className="space-y-2">
                {order.attachments.map((att: any, i: number) => (
                  <a
                    key={i}
                    href={att.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 p-2.5 bg-dark-950 border border-dark-800 rounded-lg text-sm text-dark-200 hover:text-kcc-green hover:border-kcc-green/30 transition-colors"
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
        <div className="space-y-6">
          {/* Financial Summary */}
          <div className="bg-dark-900 border border-dark-800 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-dark-100 mb-4 flex items-center gap-2">
              <DollarSign size={16} className="text-kcc-green" />
              Financial Summary
            </h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-dark-400">Subtotal</span>
                <span className="text-dark-100">{formatCurrency(totals.subtotal)}</span>
              </div>
              {totals.discount > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-dark-400">Discount</span>
                  <span className="text-red-400">-{formatCurrency(totals.discount)}</span>
                </div>
              )}
              {totals.tax > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-dark-400">Tax</span>
                  <span className="text-dark-100">{formatCurrency(totals.tax)}</span>
                </div>
              )}
              <div className="pt-3 border-t border-dark-800 flex items-center justify-between">
                <span className="text-sm font-medium text-dark-200">Total</span>
                <span className="text-lg font-bold text-kcc-green">{formatCurrency(totals.total)}</span>
              </div>
            </div>
          </div>

          {/* Payment Info */}
          <div className="bg-dark-900 border border-dark-800 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-dark-100 mb-4 flex items-center gap-2">
              <CreditCard size={16} className="text-kcc-green" />
              Payment Info
            </h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-dark-400">Method</span>
                <span className="text-dark-100 capitalize">{order.paymentMethod || '-'}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-dark-400">Status</span>
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
            <div className="bg-dark-900 border border-dark-800 rounded-xl p-5">
              <h2 className="text-sm font-semibold text-dark-100 mb-4 flex items-center gap-2">
                <Hash size={16} className="text-kcc-beige" />
                Promo Code
              </h2>
              <div className="space-y-2">
                <code className="text-sm font-bold text-kcc-green bg-kcc-green/10 px-2.5 py-1 rounded">
                  {promo.code}
                </code>
                <p className="text-xs text-dark-400">
                  {promo.type === 'percentage' ? `${promo.value}% off` : `$${promo.value} off`}
                </p>
              </div>
            </div>
          )}

          {/* Referral Code */}
          {order.referralCode && (
            <div className="bg-dark-900 border border-dark-800 rounded-xl p-5">
              <h2 className="text-sm font-semibold text-dark-100 mb-3">Referral Code</h2>
              <code className="text-sm text-kcc-beige bg-kcc-beige/10 px-2.5 py-1 rounded">
                {order.referralCode}
              </code>
            </div>
          )}

          {/* Timeline */}
          <div className="bg-dark-900 border border-dark-800 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-dark-100 mb-4 flex items-center gap-2">
              <Clock size={16} className="text-kcc-green" />
              Timeline
            </h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-dark-400">Created</span>
                <span className="text-dark-200">{formatDate(order.createdAt)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-dark-400">Last Updated</span>
                <span className="text-dark-200">{formatDate(order.updatedAt)}</span>
              </div>
            </div>
          </div>

          {/* Converted From Sample */}
          {order.convertedFromSample && (
            <div className="bg-dark-900 border border-dark-800 rounded-xl p-5">
              <h2 className="text-sm font-semibold text-dark-100 mb-3">Converted From Sample</h2>
              <Link
                href={`/admin/orders/${order.convertedFromSample._id}`}
                className="text-sm text-kcc-green hover:underline"
              >
                {order.convertedFromSample.orderNumber}
              </Link>
              <span className={`ml-2 inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                statusColors[order.convertedFromSample.status] || 'bg-dark-700 text-dark-400'
              }`}>
                {order.convertedFromSample.status}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
