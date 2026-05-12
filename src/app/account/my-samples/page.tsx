'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Package, Calendar, ArrowRight, Truck, Beaker, Eye, Hash } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';

interface SampleOrder {
  _id?: string;
  id?: string;
  orderNumber: string;
  productType?: string;
  size?: string;
  containerType?: string;
  status: string;
  date?: string;
  createdAt?: string;
  skinType?: string;
  primaryGoal?: string;
  type?: string;
  surveyData?: {
    productType?: string;
    skinType?: string;
    primaryGoal?: string;
    size?: string;
    containerType?: string;
    texturePreference?: string;
  };
}

const demoSamples: SampleOrder[] = [
  {
    id: '1',
    orderNumber: 'KCC-S-001',
    productType: 'Serum',
    size: '30ml',
    containerType: 'Dropper Bottle',
    status: 'In Production',
    date: '2024-12-10',
    skinType: 'Combination',
    primaryGoal: 'Brightening',
  },
  {
    id: '2',
    orderNumber: 'KCC-S-002',
    productType: 'Cream',
    size: '50ml',
    containerType: 'Jar',
    status: 'Delivered',
    date: '2024-11-15',
    skinType: 'Dry',
    primaryGoal: 'Hydration',
  },
  {
    id: '3',
    orderNumber: 'KCC-S-003',
    productType: 'Cleanser',
    size: '100ml',
    containerType: 'Pump Bottle',
    status: 'Under Review',
    date: '2024-12-20',
    skinType: 'Oily',
    primaryGoal: 'Acne Control',
  },
  {
    id: '4',
    orderNumber: 'KCC-S-004',
    productType: 'Sunscreen',
    size: '50ml',
    containerType: 'Tube',
    status: 'Submitted',
    date: '2024-12-22',
    skinType: 'Normal',
    primaryGoal: 'Sun Protection',
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

function getSampleId(sample: SampleOrder): string {
  return sample._id || sample.id || '';
}

function getProductType(sample: SampleOrder): string {
  return sample.surveyData?.productType || sample.productType || '-';
}

function getSkinType(sample: SampleOrder): string {
  return sample.surveyData?.skinType || sample.skinType || '';
}

function getPrimaryGoal(sample: SampleOrder): string {
  return sample.surveyData?.primaryGoal || sample.primaryGoal || '';
}

function getSize(sample: SampleOrder): string {
  return sample.surveyData?.size || sample.size || '';
}

function getContainerType(sample: SampleOrder): string {
  return sample.surveyData?.containerType || sample.containerType || '';
}

function getDate(sample: SampleOrder): string {
  return sample.createdAt || sample.date || '';
}

export default function MySamplesPage() {
  const { t, locale } = useLanguage();
  const { user } = useAuth();
  const [samples, setSamples] = useState<SampleOrder[]>(demoSamples);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchSamples = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/orders?type=sample');
        if (res.ok) {
          const data = await res.json();
          if (data.orders && data.orders.length > 0) {
            setSamples(data.orders);
          }
        }
      } catch {
        // Use demo data
      } finally {
        setLoading(false);
      }
    };
    fetchSamples();
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-dark-50">{t('samples.title')}</h1>
          <p className="text-sm text-dark-400 mt-1">{t('samples.subtitle')}</p>
        </div>
        <Link
          href="/order/sample"
          className="flex items-center gap-2 px-4 py-2.5 bg-kcc-green hover:bg-kcc-green-light text-white text-sm font-semibold rounded-xl transition-colors shadow-lg shadow-kcc-green/20"
        >
          <Beaker size={16} />
          {t('samples.newSample')}
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-kcc-green" />
        </div>
      ) : (
        <div className="space-y-4">
          {samples.map((sample, i) => {
            const sampleId = getSampleId(sample);
            const productType = getProductType(sample);
            const skinType = getSkinType(sample);
            const primaryGoal = getPrimaryGoal(sample);
            const size = getSize(sample);
            const containerType = getContainerType(sample);
            const dateStr = getDate(sample);

            return (
              <motion.div
                key={sampleId}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-dark-900/50 border border-dark-800 rounded-2xl p-5 hover:border-dark-700 transition-colors"
              >
                <div className="flex flex-col gap-4">
                  {/* Top row: product info + status */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-kcc-green/10 text-kcc-green flex items-center justify-center shrink-0">
                        <Package size={22} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-dark-50">{productType}</h3>
                          <span className={`px-2 py-0.5 text-xs font-medium rounded-full border ${statusColors[sample.status] || 'bg-dark-700 text-dark-400 border-dark-600'}`}>
                            {t(`statuses.${sample.status}`)}
                          </span>
                        </div>
                        <p className="text-sm text-dark-400">
                          {containerType && size ? `${containerType} - ${size}` : ''}
                          {skinType ? ` | ${skinType}` : ''}
                          {primaryGoal ? ` | ${primaryGoal}` : ''}
                        </p>
                        <div className="flex items-center gap-3 mt-1.5 text-xs text-dark-500">
                          <span className="font-mono flex items-center gap-1">
                            <Hash size={10} />
                            {sample.orderNumber}
                          </span>
                          {dateStr && (
                            <span className="flex items-center gap-1">
                              <Calendar size={10} />
                              {new Date(dateStr).toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Bottom row: actions */}
                  <div className="flex items-center gap-3 pt-3 border-t border-dark-800/50">
                    {/* View Details - always visible */}
                    <Link
                      href={`/account/my-samples/${sampleId}`}
                      className="flex items-center gap-2 px-4 py-2 bg-dark-800 border border-dark-700 text-dark-300 text-sm font-medium rounded-xl hover:bg-dark-700 hover:text-dark-50 transition-colors"
                    >
                      <Eye size={14} />
                      {t('samples.viewDetails')}
                    </Link>

                    {/* Reorder as Bulk - only for delivered samples */}
                    {sample.status === 'Delivered' && (
                      <Link
                        href={`/order/bulk?fromSample=${sampleId}`}
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

          {samples.length === 0 && (
            <div className="text-center py-20">
              <Package size={48} className="text-dark-700 mx-auto mb-4" />
              <p className="text-dark-400 mb-4">{t('samples.noSamples')}</p>
              <Link href="/order/sample" className="text-kcc-green hover:text-kcc-green-light transition-colors text-sm font-medium">
                {t('samples.requestFirst')}
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
