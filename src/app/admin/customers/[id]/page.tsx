'use client';

import { useEffect, useState, useCallback, type ReactNode } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Loader2, User, Mail, Building2, Phone,
  MapPin, Globe, Calendar, DollarSign, Package,
  Share2, CheckCircle, Clock, AlertCircle, Eye,
  MessageCircle, Pencil, Save, X, UserCheck
} from 'lucide-react';
import ContactActions from '@/components/admin/ContactActions';
import CrmPanel, { stageMeta } from '@/components/admin/CrmPanel';

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

export default function CustomerDetailPage() {
  const params = useParams();
  const customerId = params.id as string;

  const [customer, setCustomer] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [managers, setManagers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [form, setForm] = useState<any>({});

  const loadCustomer = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch(`/api/customers/${customerId}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setCustomer(data.customer);
        setOrders(Array.isArray(data.orders) ? data.orders : []);
        setReferrals(Array.isArray(data.referrals) ? data.referrals : []);
        setActivities(Array.isArray(data.activities) ? data.activities : []);
        setManagers(Array.isArray(data.managers) ? data.managers : []);
      } else if (res.status === 404) {
        setError('Customer not found');
      } else {
        const err = await res.json();
        setError(err.error || 'Failed to load customer');
      }
    } catch (err) {
      console.error('Failed to load customer:', err);
      setError('Failed to load customer');
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    if (customerId) {
      loadCustomer();
    }
  }, [customerId, loadCustomer]);

  const startEdit = () => {
    setForm({
      name: customer.name || '', email: customer.email || '',
      company: customer.company || '', phone: customer.phone || '',
      whatsapp: customer.whatsapp || '', website: customer.website || '',
      country: customer.country || '', city: customer.city || '', address: customer.address || '',
    });
    setEditing(true);
  };

  const saveEdit = async () => {
    setSavingEdit(true);
    try {
      const res = await fetch(`/api/customers/${customerId}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const e = await res.json();
        alert(e.error || 'Failed to save');
        return;
      }
      setEditing(false);
      loadCustomer();
    } finally {
      setSavingEdit(false);
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric'
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
        <Link href="/admin/customers" className="inline-flex items-center gap-2 text-sm text-dark-400 hover:text-kcc-green transition-colors">
          <ArrowLeft size={16} /> Back to Customers
        </Link>
        <div className="flex flex-col items-center justify-center h-48 text-dark-400">
          <AlertCircle size={32} className="mb-2" />
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!customer) return null;

  const totalSpent = orders.reduce((sum, o) => sum + (o.totals?.total || 0), 0);
  const paidOrders = orders.filter(o => o.paymentStatus === 'paid').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/admin/customers" className="p-2 text-dark-400 hover:text-kcc-green hover:bg-dark-800 rounded-lg transition-colors">
            <ArrowLeft size={18} />
          </Link>
          <div className="w-10 h-10 rounded-full bg-kcc-green/20 flex items-center justify-center text-kcc-green text-lg font-bold">
            {customer.name?.charAt(0) || '?'}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-semibold text-dark-50">{customer.name}</h1>
              <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${stageMeta(customer.stage).color}`}>
                {stageMeta(customer.stage).label}
              </span>
            </div>
            <p className="text-sm text-dark-400">{customer.company || customer.email}</p>
          </div>
        </div>
        {/* Quick contact actions */}
        <ContactActions
          phone={customer.phone}
          whatsapp={customer.whatsapp}
          email={customer.email}
          website={customer.website}
          size={17}
        />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="p-5 bg-dark-900 border border-dark-800 rounded-xl">
          <div className="p-2.5 rounded-lg bg-kcc-green/10 w-fit">
            <Package size={20} className="text-kcc-green" />
          </div>
          <div className="mt-3">
            <p className="text-2xl font-bold text-dark-50">{orders.length}</p>
            <p className="text-sm text-dark-400 mt-0.5">Total Orders</p>
          </div>
        </div>
        <div className="p-5 bg-dark-900 border border-dark-800 rounded-xl">
          <div className="p-2.5 rounded-lg bg-green-500/10 w-fit">
            <DollarSign size={20} className="text-green-400" />
          </div>
          <div className="mt-3">
            <p className="text-2xl font-bold text-dark-50">{formatCurrency(totalSpent)}</p>
            <p className="text-sm text-dark-400 mt-0.5">Total Spent</p>
          </div>
        </div>
        <div className="p-5 bg-dark-900 border border-dark-800 rounded-xl">
          <div className="p-2.5 rounded-lg bg-kcc-beige/10 w-fit">
            <Share2 size={20} className="text-kcc-beige" />
          </div>
          <div className="mt-3">
            <p className="text-2xl font-bold text-dark-50">{referrals.length}</p>
            <p className="text-sm text-dark-400 mt-0.5">Referrals Made</p>
          </div>
        </div>
        <div className="p-5 bg-dark-900 border border-dark-800 rounded-xl">
          <div className="p-2.5 rounded-lg bg-yellow-500/10 w-fit">
            <DollarSign size={20} className="text-yellow-400" />
          </div>
          <div className="mt-3">
            <p className="text-2xl font-bold text-dark-50">{formatCurrency(customer.referralBalance || 0)}</p>
            <p className="text-sm text-dark-400 mt-0.5">Referral Balance</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column - Details & Orders */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer Orders */}
          <div className="bg-dark-900 border border-dark-800 rounded-xl overflow-hidden">
            <div className="p-5 border-b border-dark-800">
              <h2 className="text-sm font-semibold text-dark-100 flex items-center gap-2">
                <Package size={16} className="text-kcc-green" />
                Orders ({orders.length})
              </h2>
            </div>
            {orders.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-dark-400">
                <Package size={24} className="mb-2" />
                <p className="text-sm">No orders yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-dark-800">
                      <th className="text-start text-xs font-medium text-dark-500 uppercase tracking-wider px-5 py-3">Order</th>
                      <th className="text-center text-xs font-medium text-dark-500 uppercase tracking-wider px-5 py-3">Type</th>
                      <th className="text-center text-xs font-medium text-dark-500 uppercase tracking-wider px-5 py-3">Status</th>
                      <th className="text-end text-xs font-medium text-dark-500 uppercase tracking-wider px-5 py-3">Total</th>
                      <th className="text-center text-xs font-medium text-dark-500 uppercase tracking-wider px-5 py-3">Payment</th>
                      <th className="text-start text-xs font-medium text-dark-500 uppercase tracking-wider px-5 py-3">Date</th>
                      <th className="text-center text-xs font-medium text-dark-500 uppercase tracking-wider px-5 py-3">View</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-dark-800">
                    {orders.map((order) => (
                      <tr key={order._id} className="hover:bg-dark-800/50 transition-colors">
                        <td className="px-5 py-3">
                          <code className="text-xs text-kcc-green bg-kcc-green/10 px-2 py-0.5 rounded">
                            {order.orderNumber}
                          </code>
                        </td>
                        <td className="px-5 py-3 text-center">
                          <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                            order.type === 'sample' ? 'bg-blue-500/10 text-blue-400' : 'bg-kcc-beige/10 text-kcc-beige'
                          }`}>
                            {order.type}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-center">
                          <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                            statusColors[order.status] || 'bg-dark-700 text-dark-400'
                          }`}>
                            {order.status}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-end text-sm font-medium text-dark-100">
                          {formatCurrency(order.totals?.total)}
                        </td>
                        <td className="px-5 py-3 text-center">
                          <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                            order.paymentStatus === 'paid' ? 'bg-green-500/10 text-green-400' :
                            order.paymentStatus === 'refunded' ? 'bg-red-500/10 text-red-400' :
                            'bg-yellow-500/10 text-yellow-400'
                          }`}>
                            {order.paymentStatus || 'pending'}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-sm text-dark-400">{formatDate(order.createdAt)}</td>
                        <td className="px-5 py-3 text-center">
                          <Link
                            href={`/admin/orders/${order._id}`}
                            className="inline-flex p-1.5 text-dark-400 hover:text-kcc-green hover:bg-dark-800 rounded-lg transition-colors"
                          >
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

          {/* Referrals */}
          {referrals.length > 0 && (
            <div className="bg-dark-900 border border-dark-800 rounded-xl overflow-hidden">
              <div className="p-5 border-b border-dark-800">
                <h2 className="text-sm font-semibold text-dark-100 flex items-center gap-2">
                  <Share2 size={16} className="text-kcc-beige" />
                  Referrals ({referrals.length})
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-dark-800">
                      <th className="text-start text-xs font-medium text-dark-500 uppercase tracking-wider px-5 py-3">Referred User</th>
                      <th className="text-center text-xs font-medium text-dark-500 uppercase tracking-wider px-5 py-3">Status</th>
                      <th className="text-end text-xs font-medium text-dark-500 uppercase tracking-wider px-5 py-3">Credit</th>
                      <th className="text-start text-xs font-medium text-dark-500 uppercase tracking-wider px-5 py-3">Order</th>
                      <th className="text-start text-xs font-medium text-dark-500 uppercase tracking-wider px-5 py-3">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-dark-800">
                    {referrals.map((ref) => (
                      <tr key={ref._id} className="hover:bg-dark-800/50 transition-colors">
                        <td className="px-5 py-3">
                          <div>
                            <p className="text-sm font-medium text-dark-100">{ref.referredId?.name || 'Unknown'}</p>
                            <p className="text-xs text-dark-500">{ref.referredId?.email || ''}</p>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-center">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${
                            ref.status === 'credited' ? 'bg-green-500/10 text-green-400' : 'bg-yellow-500/10 text-yellow-400'
                          }`}>
                            {ref.status === 'credited' ? <CheckCircle size={11} /> : <Clock size={11} />}
                            {ref.status}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-end text-sm font-medium text-dark-200">
                          ${ref.creditAmount || 0}
                        </td>
                        <td className="px-5 py-3">
                          {ref.orderId?.orderNumber ? (
                            <code className="text-xs text-kcc-green bg-kcc-green/10 px-2 py-0.5 rounded">
                              {ref.orderId.orderNumber}
                            </code>
                          ) : (
                            <span className="text-xs text-dark-500">-</span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-sm text-dark-400">{formatDate(ref.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Right column - Customer Profile */}
        <div className="space-y-6">
          {/* Profile Info */}
          <div className="bg-dark-900 border border-dark-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-dark-100 flex items-center gap-2">
                <User size={16} className="text-kcc-green" />
                Contact Details
              </h2>
              {!editing ? (
                <button type="button" onClick={startEdit} className="inline-flex items-center gap-1 text-xs text-dark-400 hover:text-kcc-green">
                  <Pencil size={13} /> Edit
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => setEditing(false)} className="inline-flex items-center gap-1 text-xs text-dark-400 hover:text-dark-100">
                    <X size={13} /> Cancel
                  </button>
                  <button type="button" onClick={saveEdit} disabled={savingEdit} className="inline-flex items-center gap-1 text-xs text-kcc-green hover:text-kcc-green-light disabled:opacity-50">
                    {savingEdit ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} Save
                  </button>
                </div>
              )}
            </div>

            {editing ? (
              <div className="space-y-3">
                {([
                  ['name', 'Name'], ['email', 'Email'], ['company', 'Company'],
                  ['phone', 'Phone'], ['whatsapp', 'WhatsApp'], ['website', 'Website'],
                  ['country', 'Country'], ['city', 'City'], ['address', 'Address'],
                ] as [string, string][]).map(([key, lbl]) => (
                  <div key={key}>
                    <label className="block text-xs text-dark-400 mb-1">{lbl}</label>
                    <input
                      type="text"
                      aria-label={lbl}
                      placeholder={lbl}
                      value={form[key] ?? ''}
                      onChange={(e) => setForm((f: any) => ({ ...f, [key]: e.target.value }))}
                      className="w-full px-3 py-1.5 text-sm bg-dark-950 border border-dark-700 rounded-lg text-dark-100 focus:border-kcc-green focus:outline-none"
                    />
                  </div>
                ))}
              </div>
            ) : (
              <>
                <ContactActions
                  phone={customer.phone} whatsapp={customer.whatsapp}
                  email={customer.email} website={customer.website}
                  className="mb-4"
                />
                <div className="space-y-4">
                  <Row icon={<Mail size={14} />} label="Email" value={customer.email} href={`mailto:${customer.email}`} />
                  {customer.company && <Row icon={<Building2 size={14} />} label="Company" value={customer.company} />}
                  {customer.phone && <Row icon={<Phone size={14} />} label="Phone" value={customer.phone} href={`tel:${customer.phone.replace(/\s+/g, '')}`} />}
                  {customer.whatsapp && <Row icon={<MessageCircle size={14} />} label="WhatsApp" value={customer.whatsapp} href={`https://wa.me/${customer.whatsapp.replace(/[^\d]/g, '')}`} />}
                  {customer.website && <Row icon={<Globe size={14} />} label="Website" value={customer.website} href={/^https?:\/\//i.test(customer.website) ? customer.website : `https://${customer.website}`} />}
                  {(customer.country || customer.city) && <Row icon={<MapPin size={14} />} label="Location" value={[customer.city, customer.country].filter(Boolean).join(', ')} />}
                  {customer.address && <Row icon={<MapPin size={14} />} label="Address" value={customer.address} />}
                </div>
              </>
            )}
          </div>

          {/* CRM: stage, manager, tags, activity timeline */}
          <CrmPanel customer={customer} managers={managers} activities={activities} onChange={loadCustomer} />

          {/* Referral Info */}
          <div className="bg-dark-900 border border-dark-800 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-dark-100 mb-4 flex items-center gap-2">
              <Share2 size={16} className="text-kcc-beige" />
              Referral Program
            </h2>
            <div className="space-y-3">
              {customer.referralCode && (
                <div>
                  <p className="text-xs text-dark-400 mb-1">Referral Code</p>
                  <code className="text-sm font-bold text-kcc-beige bg-kcc-beige/10 px-2.5 py-1 rounded">
                    {customer.referralCode}
                  </code>
                </div>
              )}
              <div className="flex items-center justify-between text-sm">
                <span className="text-dark-400">Balance</span>
                <span className="font-medium text-kcc-green">{formatCurrency(customer.referralBalance || 0)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-dark-400">Successful Referrals</span>
                <span className="font-medium text-dark-100">
                  {referrals.filter(r => r.status === 'credited').length}
                </span>
              </div>
            </div>
          </div>

          {/* Account Info */}
          <div className="bg-dark-900 border border-dark-800 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-dark-100 mb-4 flex items-center gap-2">
              <Calendar size={16} className="text-kcc-green" />
              Account
            </h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-dark-400">Status</span>
                <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                  customer.isActive !== false ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                }`}>
                  {customer.isActive !== false ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-dark-400">Account Manager</span>
                <span className="text-dark-100 inline-flex items-center gap-1.5">
                  <UserCheck size={13} className="text-kcc-green" />
                  {customer.accountManagerId?.name || 'Unassigned'}
                </span>
              </div>
              {customer.lastContactedAt && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-dark-400">Last Contacted</span>
                  <span className="text-dark-200">{formatDate(customer.lastContactedAt)}</span>
                </div>
              )}
              <div className="flex items-center justify-between text-sm">
                <span className="text-dark-400">Language</span>
                <span className="text-dark-100">{customer.languagePref === 'ar' ? 'Arabic' : 'English'}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-dark-400">Joined</span>
                <span className="text-dark-200">{formatDate(customer.createdAt)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-dark-400">Last Updated</span>
                <span className="text-dark-200">{formatDate(customer.updatedAt)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ icon, label, value, href }: { icon: ReactNode; label: string; value: string; href?: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="text-dark-500 mt-0.5 shrink-0">{icon}</span>
      <div className="min-w-0">
        <p className="text-xs text-dark-400">{label}</p>
        {href ? (
          <a href={href} target={href.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer"
            className="text-sm text-dark-100 hover:text-kcc-green break-words">{value}</a>
        ) : (
          <p className="text-sm text-dark-100 break-words">{value}</p>
        )}
      </div>
    </div>
  );
}
