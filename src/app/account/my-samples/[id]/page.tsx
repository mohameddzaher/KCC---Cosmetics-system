'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Package, Calendar, Truck, ArrowRight, Beaker, FlaskConical,
  Shield, FileText, Factory, Palette, User, CreditCard, Hash,
  MapPin, Phone, Mail, Building2, CheckCircle, XCircle, Send, Loader2,
  AlertCircle, MessageSquare, Droplets
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

function BoolBadge({ value }: { value: boolean | undefined }) {
  if (value) {
    return (
      <span className="inline-flex items-center gap-1 text-kcc-green text-sm">
        <CheckCircle size={14} />
        Yes
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-dark-500 text-sm">
      <XCircle size={14} />
      No
    </span>
  );
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

export default function SampleDetailPage() {
  const { t, locale } = useLanguage();
  const dateLocale = locale === 'ar' ? 'ar-SA' : 'en-US';
  const params = useParams();
  const sampleId = params.id as string;

  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [sendingNotes, setSendingNotes] = useState(false);
  const [notesSent, setNotesSent] = useState(false);
  const [notesError, setNotesError] = useState('');

  const loadOrder = useCallback(async (silent = false) => {
    if (!silent) {
      setLoading(true);
      setError(null);
    }
    try {
      const res = await fetch(`/api/orders/${sampleId}?ts=${Date.now()}`, { cache: 'no-store' });
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
  }, [sampleId, t]);

  useEffect(() => {
    if (sampleId) {
      loadOrder();
    }
  }, [sampleId, loadOrder]);

  useEffect(() => {
    if (!sampleId) return;

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
  }, [sampleId, loadOrder]);

  const handleSendNotes = async () => {
    if (!notes.trim()) return;
    setSendingNotes(true);
    setNotesError('');
    setNotesSent(false);
    try {
      const res = await fetch(`/api/orders/${sampleId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerInfo: {
            ...order?.customerInfo,
          },
          attachments: [
            ...(order?.attachments || []),
            {
              name: `Customer Note - ${new Date().toLocaleDateString()}`,
              url: notes.trim(),
            },
          ],
        }),
      });
      if (res.ok) {
        setNotesSent(true);
        setNotes('');
        // Reload order to show updated data
        loadOrder();
        setTimeout(() => setNotesSent(false), 3000);
      } else {
        const err = await res.json().catch(() => ({ error: t('samples.notesFailed') }));
        setNotesError(err.error || t('samples.notesFailed'));
      }
    } catch {
      setNotesError(t('samples.networkError'));
    } finally {
      setSendingNotes(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-kcc-green" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-4">
        <Link
          href="/account/my-samples"
          className="inline-flex items-center gap-2 text-sm text-dark-400 hover:text-kcc-green transition-colors"
        >
          <ArrowLeft size={16} />
          {t('samples.backToSamples')}
        </Link>
        <div className="flex flex-col items-center justify-center py-20">
          <AlertCircle size={48} className="text-dark-600 mb-4" />
          <p className="text-dark-400 mb-4">{error}</p>
          <button
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

  const survey = order.surveyData || {};
  const customerInfo = order.customerInfo || {};
  const isDelivered = order.status === 'Delivered';
  const productType = survey.productType || '';
  const size = survey.size || '';
  const containerType = survey.containerType || '';

  // Collect free-from preferences
  const freeFromPrefs = [
    survey.parabenFree && 'Paraben Free',
    survey.sulfateFree && 'Sulfate Free',
    survey.siliconeFree && 'Silicone Free',
    survey.fragranceFree && 'Fragrance Free',
    survey.naturalOrganic && 'Natural / Organic',
    survey.vegan && 'Vegan',
    survey.crueltyFree && 'Cruelty Free',
  ].filter(Boolean);

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href="/account/my-samples"
        className="inline-flex items-center gap-2 text-sm text-dark-400 hover:text-kcc-green transition-colors"
      >
        <ArrowLeft size={16} />
        {t('samples.backToSamples')}
      </Link>

      {/* Header card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-dark-900/50 border border-dark-800 rounded-2xl p-6"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-kcc-green/10 text-kcc-green flex items-center justify-center shrink-0">
              <Package size={28} />
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-xl font-bold text-dark-50">
                  {productType || t('samples.sample')}
                </h1>
                <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full border ${statusColors[order.status] || 'bg-dark-700 text-dark-400 border-dark-600'}`}>
                  {t(`statuses.${order.status}`)}
                </span>
              </div>
              <p className="text-sm text-dark-400">
                {containerType && size ? `${containerType} - ${size}` : ''}
                {survey.skinType ? ` | ${survey.skinType}` : ''}
                {survey.primaryGoal ? ` | ${survey.primaryGoal}` : ''}
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

          {/* Reorder as Bulk - prominent for delivered */}
          {isDelivered && (
            <div className="flex flex-col sm:flex-row gap-2 shrink-0">
              <Link
                href={`/order/bulk?fromSample=${sampleId}`}
                className="flex items-center justify-center gap-2 px-5 py-3 bg-kcc-beige text-dark-950 font-semibold rounded-xl hover:bg-kcc-beige/90 transition-colors"
              >
                <Truck size={16} />
                {t('order.orderThisSample')}
                <ArrowRight size={16} />
              </Link>
              <Link
                href={`/order/bulk?fromSample=${sampleId}`}
                className="flex items-center justify-center gap-2 px-5 py-3 bg-kcc-beige/10 border border-kcc-beige/30 text-kcc-beige font-semibold rounded-xl hover:bg-kcc-beige/20 transition-colors"
              >
                <Truck size={16} />
                {t('order.reorderAsBulk')}
              </Link>
            </div>
          )}
        </div>
      </motion.div>

      <OrderProgressTracker status={order.status} updatedAt={order.updatedAt} />

      {/* Detail sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Order Info */}
        <SectionCard title={t('samples.orderInfo')} icon={FileText}>
          <DetailRow label={t('samples.orderNumber')} value={<span className="font-mono">{order.orderNumber}</span>} />
          <DetailRow label={t('samples.type')} value={
            <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-blue-500/10 text-blue-400">
              {t('samples.sample')}
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

        {/* Product Specification */}
        <SectionCard title={t('samples.productSpec')} icon={Beaker}>
          <DetailRow label={t('samples.productType')} value={survey.productType} />
          <DetailRow label={t('samples.skinType')} value={survey.skinType} />
          <DetailRow label={t('samples.primaryGoal')} value={survey.primaryGoal} />
          <DetailRow label={t('samples.texture')} value={survey.texturePreference} />
          <DetailRow label={t('samples.size')} value={survey.size} />
          <DetailRow label={t('samples.containerType')} value={survey.containerType} />
          {survey.referenceProducts && (
            <DetailRow label={t('samples.reference')} value={survey.referenceProducts} />
          )}
        </SectionCard>

        {/* Ingredients */}
        <SectionCard title={t('samples.ingredientsSection')} icon={FlaskConical}>
          <DetailRow
            label={t('samples.mustHave')}
            value={
              survey.mustHaveIngredients && survey.mustHaveIngredients.length > 0
                ? (
                  <div className="flex flex-wrap gap-1 justify-end">
                    {survey.mustHaveIngredients.map((ing: string) => (
                      <span key={ing} className="px-2 py-0.5 text-xs bg-kcc-green/10 text-kcc-green rounded-full">
                        {ing}
                      </span>
                    ))}
                  </div>
                )
                : '-'
            }
          />
          <DetailRow
            label={t('samples.mustAvoid')}
            value={
              survey.mustAvoidIngredients && survey.mustAvoidIngredients.length > 0
                ? (
                  <div className="flex flex-wrap gap-1 justify-end">
                    {survey.mustAvoidIngredients.map((ing: string) => (
                      <span key={ing} className="px-2 py-0.5 text-xs bg-red-500/10 text-red-400 rounded-full">
                        {ing}
                      </span>
                    ))}
                  </div>
                )
                : '-'
            }
          />
          {freeFromPrefs.length > 0 && (
            <DetailRow
              label={t('samples.preferences')}
              value={
                <div className="flex flex-wrap gap-1 justify-end">
                  {freeFromPrefs.map((pref) => (
                    <span key={pref as string} className="px-2 py-0.5 text-xs bg-purple-500/10 text-purple-400 rounded-full">
                      {pref}
                    </span>
                  ))}
                </div>
              }
            />
          )}
        </SectionCard>

        {/* Quality & Testing */}
        <SectionCard title={t('samples.qualityTestingSection')} icon={Shield}>
          <DetailRow label={t('samples.stabilityTest')} value={<BoolBadge value={survey.stabilityTest} />} />
          <DetailRow label={t('samples.microbiologicalTest')} value={<BoolBadge value={survey.microbiologicalTest} />} />
          <DetailRow label={t('samples.dermatologicallyTested')} value={<BoolBadge value={survey.dermatologicallyTested} />} />
          <DetailRow label={t('samples.coaCertificate')} value={<BoolBadge value={survey.coaCertificate} />} />
          <DetailRow label={t('samples.gmpCertificate')} value={<BoolBadge value={survey.gmpCertificate} />} />
        </SectionCard>

        {/* Legal & Regulatory */}
        <SectionCard title={t('samples.legalRegulatorySection')} icon={FileText}>
          <DetailRow label={t('samples.targetCountry')} value={survey.targetCountry} />
          <DetailRow label={t('samples.officialRegistration')} value={<BoolBadge value={survey.officialRegistration} />} />
          <DetailRow label={t('samples.ingredientsListFormat')} value={survey.ingredientsListFormat} />
          <DetailRow label={t('samples.productName')} value={survey.finalProductName} />
        </SectionCard>

        {/* Production */}
        <SectionCard title={t('samples.productionTechnicalSection')} icon={Factory}>
          <DetailRow label={t('samples.shelfLifeTarget')} value={survey.shelfLifeTarget} />
          <DetailRow label={t('samples.storageConditions')} value={survey.storageConditions} />
          <DetailRow label={t('samples.withstandGulfHeat')} value={<BoolBadge value={survey.withstandGulfHeat} />} />
          <DetailRow label={t('samples.batchTracking')} value={<BoolBadge value={survey.batchTrackingRequired} />} />
        </SectionCard>

        {/* Brand Vision */}
        {survey.brandVision && (
          <SectionCard title={t('samples.brandVisionSection')} icon={Palette}>
            <p className="text-sm text-dark-200 leading-relaxed">{survey.brandVision}</p>
          </SectionCard>
        )}

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

        {/* Payment */}
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
      </div>

      {/* Add Notes / Request Modification */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="bg-dark-900/50 border border-dark-800 rounded-2xl overflow-hidden"
      >
        <div className="flex items-center gap-2 px-5 py-3.5 border-b border-dark-800 bg-dark-800/20">
          <MessageSquare size={16} className="text-kcc-green shrink-0" />
          <h3 className="text-sm font-semibold text-dark-200 uppercase tracking-wider">
            {t('samples.addNotes')}
          </h3>
        </div>
        <div className="p-5">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t('samples.notesPlaceholder')}
            rows={4}
            className="w-full px-4 py-3 bg-dark-800 border border-dark-700 rounded-xl text-dark-50 placeholder:text-dark-500 focus:outline-none focus:border-kcc-green transition-colors resize-none text-sm"
          />

          {notesError && (
            <p className="text-sm text-red-400 mt-2 flex items-center gap-1.5">
              <AlertCircle size={14} />
              {notesError}
            </p>
          )}

          {notesSent && (
            <p className="text-sm text-kcc-green mt-2 flex items-center gap-1.5">
              <CheckCircle size={14} />
              {t('samples.notesSent')}
            </p>
          )}

          <div className="flex items-center justify-between mt-3">
            <p className="text-xs text-dark-500">
              {order.status === 'Submitted'
                ? t('samples.modifiableStatus')
                : t('samples.notesAttached')}
            </p>
            <button
              onClick={handleSendNotes}
              disabled={sendingNotes || !notes.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-kcc-green hover:bg-kcc-green-light text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sendingNotes ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Send size={14} />
              )}
              {t('samples.sendNotes')}
            </button>
          </div>
        </div>
      </motion.div>

      {/* Reorder as Bulk - bottom CTA for delivered samples */}
      {isDelivered && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-r from-kcc-beige/5 to-kcc-green/5 border border-kcc-beige/20 rounded-2xl p-6 text-center"
        >
          <Droplets size={32} className="text-kcc-beige mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-dark-50 mb-2">
            {t('samples.happyWithSample')}
          </h3>
          <p className="text-sm text-dark-400 mb-4 max-w-md mx-auto">
            {t('samples.convertToBulk')}
          </p>
          <Link
            href={`/order/bulk?fromSample=${sampleId}`}
            className="inline-flex items-center gap-2 px-6 py-3 bg-kcc-beige hover:bg-kcc-beige/90 text-dark-950 font-semibold rounded-xl transition-colors shadow-lg"
          >
            <Truck size={18} />
            {t('order.orderThisSample')}
            <ArrowRight size={18} />
          </Link>
        </motion.div>
      )}
    </div>
  );
}
