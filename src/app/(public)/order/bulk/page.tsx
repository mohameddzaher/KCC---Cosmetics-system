'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ChevronLeft, ChevronRight, Check, CheckCircle,
  CreditCard, Banknote, Truck, AlertCircle, Sparkles,
  History, Wand2, Calendar, ArrowRight
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import RequireAuth from '@/components/auth/RequireAuth';

type BulkMode = 'undecided' | 'reuse' | 'new';

interface BulkFormData {
  // Product spec (used for new specs or preview)
  productType: string;
  skinType: string;
  primaryGoal: string;
  texturePreference: string;
  referenceProducts: string;
  mustHaveIngredients: string[];
  mustAvoidIngredients: string[];
  parabenFree: boolean;
  sulfateFree: boolean;
  siliconeFree: boolean;
  fragranceFree: boolean;
  naturalOrganic: boolean;
  vegan: boolean;
  crueltyFree: boolean;
  stabilityTest: boolean;
  microbiologicalTest: boolean;
  dermatologicallyTested: boolean;
  coaCertificate: boolean;
  gmpCertificate: boolean;
  targetCountry: string;
  officialRegistration: boolean;
  ingredientsListFormat: string;
  finalProductName: string;
  shelfLifeTarget: string;
  storageConditions: string;
  withstandGulfHeat: boolean;
  batchTrackingRequired: boolean;
  size: string;
  containerType: string;
  brandVision: string;
  // Bulk specifics
  quantity: number;
  pricingNotes: string;
  deliveryTimeline: string;
  // Customer Details
  companyName: string;
  personName: string;
  email: string;
  phone: string;
  country: string;
  city: string;
  address: string;
  // Payment
  paymentMethod: 'cash' | 'card';
  promoCode: string;
  referralCode: string;
}

interface SampleOrder {
  _id: string;
  orderNumber: string;
  status: string;
  createdAt?: string;
  surveyData?: Record<string, unknown>;
}

const productTypes = ['Cream', 'Serum', 'Cleanser', 'Toner', 'Moisturizer', 'Mask', 'Sunscreen'];
const skinTypes = ['Oily', 'Dry', 'Combination', 'Sensitive', 'Normal'];
const primaryGoals = ['Brightening', 'Hydration', 'Acne Control', 'Anti-Aging', 'Sun Protection', 'Pore Minimizing'];
const texturePreferences = ['Light', 'Heavy', 'Gel', 'Creamy', 'Watery'];
const mustHaveOptions = ['Hyaluronic Acid', 'Vitamin C', 'Retinol', 'Niacinamide', 'Salicylic Acid', 'AHA/BHA', 'Peptides', 'Ceramides', 'Aloe Vera', 'Green Tea'];
const mustAvoidOptions = ['Alcohol', 'Mineral Oil', 'Parabens', 'Sulfates', 'Silicones', 'Artificial Fragrance'];
const targetCountries = ['Saudi Arabia', 'UAE', 'Kuwait', 'Bahrain', 'Qatar', 'Oman', 'Egypt', 'Jordan', 'Other'];
const ingredientsListFormats = ['INCI Standard', 'FDA Format', 'EU Format', 'Custom'];
const shelfLifeTargets = ['1 Year', '2 Years', '3 Years'];
const storageConditionsOptions = ['Room Temperature', 'Cool & Dry', 'Refrigerated'];
const sizes = ['15ml', '30ml', '50ml', '100ml', '200ml'];
const containerTypes = ['Jar', 'Pump Bottle', 'Dropper Bottle', 'Tube', 'Airless Pump', 'Spray Bottle'];
const deliveryTimelines = ['1 Month', '2 Months', '3 Months', '6 Months'];

const statusBadge: Record<string, string> = {
  Submitted: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  'Under Review': 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  Approved: 'bg-green-500/10 text-green-400 border-green-500/20',
  'In Production': 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  Delivered: 'bg-kcc-green/15 text-kcc-green border-kcc-green/45',
};

export default function BulkOrderPage() {
  return (
    <RequireAuth>
      <Suspense fallback={<div className="min-h-screen bg-cream-100 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-kcc-green" /></div>}>
        <BulkOrderContent />
      </Suspense>
    </RequireAuth>
  );
}

function BulkOrderContent() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const searchParams = useSearchParams();

  // Bulk orders MUST be linked to a previous sample. Default to 'reuse'.
  const [mode, setMode] = useState<BulkMode>('reuse');
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [orderNumber, setOrderNumber] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [promoValid, setPromoValid] = useState<boolean | null>(null);
  const [promoMessage, setPromoMessage] = useState('');

  const [samples, setSamples] = useState<SampleOrder[]>([]);
  const [samplesLoading, setSamplesLoading] = useState(false);
  const [selectedSampleId, setSelectedSampleId] = useState('');
  const [selectedSampleSurveyData, setSelectedSampleSurveyData] = useState<Record<string, unknown> | null>(null);

  const [data, setData] = useState<BulkFormData>({
    productType: '', skinType: '', primaryGoal: '', texturePreference: '', referenceProducts: '',
    mustHaveIngredients: [], mustAvoidIngredients: [],
    parabenFree: false, sulfateFree: false, siliconeFree: false, fragranceFree: false,
    naturalOrganic: false, vegan: false, crueltyFree: false,
    stabilityTest: false, microbiologicalTest: false, dermatologicallyTested: false, coaCertificate: false, gmpCertificate: false,
    targetCountry: '', officialRegistration: false, ingredientsListFormat: '', finalProductName: '',
    shelfLifeTarget: '', storageConditions: '', withstandGulfHeat: false, batchTrackingRequired: false,
    size: '', containerType: '', brandVision: '',
    quantity: 100, pricingNotes: '', deliveryTimeline: '',
    companyName: '', personName: '', email: '', phone: '', country: '', city: '', address: '',
    paymentMethod: 'cash', promoCode: '', referralCode: '',
  });

  useEffect(() => {
    if (!user) return;
    const loadSamples = async () => {
      setSamplesLoading(true);
      try {
        const res = await fetch('/api/orders?type=sample&limit=30');
        if (!res.ok) return;
        const result = await res.json();
        setSamples(Array.isArray(result.orders) ? result.orders : []);
      } catch {
        // Keep empty suggestions for guests/offline
      } finally {
        setSamplesLoading(false);
      }
    };
    loadSamples();
  }, [user]);

  useEffect(() => {
    const fromSample = searchParams.get('fromSample');
    if (fromSample) {
      setMode('reuse');
      setSelectedSampleId(fromSample);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!selectedSampleId) {
      setSelectedSampleSurveyData(null);
      return;
    }

    const fromList = samples.find((s) => s._id === selectedSampleId);
    if (fromList?.surveyData) {
      applySample(fromList);
      return;
    }

    const fromSample = searchParams.get('fromSample');
    if (!fromSample || fromSample !== selectedSampleId) return;

    const fallbackSurvey = {
      productType: searchParams.get('productType') || '',
      size: searchParams.get('size') || '',
      containerType: searchParams.get('containerType') || '',
    };
    setSelectedSampleSurveyData(fallbackSurvey);
    setData((prev) => ({
      ...prev,
      productType: fallbackSurvey.productType || prev.productType,
      size: fallbackSurvey.size || prev.size,
      containerType: fallbackSurvey.containerType || prev.containerType,
    }));
  }, [selectedSampleId, samples, searchParams]);

  useEffect(() => {
    if (!user || step < 2) return;
    setData((prev) => ({
      ...prev,
      personName: prev.personName || user.name || '',
      email: prev.email || user.email || '',
      companyName: prev.companyName || user.company || '',
    }));
  }, [user, step]);

  const applySample = (sample: SampleOrder) => {
    const survey = sample.surveyData || {};
    setSelectedSampleSurveyData(survey);
    setData((prev) => ({
      ...prev,
      productType: getSurveyString(survey, 'productType') || prev.productType,
      skinType: getSurveyString(survey, 'skinType') || prev.skinType,
      primaryGoal: getSurveyString(survey, 'primaryGoal') || prev.primaryGoal,
      texturePreference: getSurveyString(survey, 'texturePreference') || prev.texturePreference,
      referenceProducts: getSurveyString(survey, 'referenceProducts') || prev.referenceProducts,
      mustHaveIngredients: getSurveyArray(survey, 'mustHaveIngredients') || prev.mustHaveIngredients,
      mustAvoidIngredients: getSurveyArray(survey, 'mustAvoidIngredients') || prev.mustAvoidIngredients,
      parabenFree: getSurveyBoolean(survey, 'parabenFree') ?? prev.parabenFree,
      sulfateFree: getSurveyBoolean(survey, 'sulfateFree') ?? prev.sulfateFree,
      siliconeFree: getSurveyBoolean(survey, 'siliconeFree') ?? prev.siliconeFree,
      fragranceFree: getSurveyBoolean(survey, 'fragranceFree') ?? prev.fragranceFree,
      naturalOrganic: getSurveyBoolean(survey, 'naturalOrganic') ?? prev.naturalOrganic,
      vegan: getSurveyBoolean(survey, 'vegan') ?? prev.vegan,
      crueltyFree: getSurveyBoolean(survey, 'crueltyFree') ?? prev.crueltyFree,
      stabilityTest: getSurveyBoolean(survey, 'stabilityTest') ?? prev.stabilityTest,
      microbiologicalTest: getSurveyBoolean(survey, 'microbiologicalTest') ?? prev.microbiologicalTest,
      dermatologicallyTested: getSurveyBoolean(survey, 'dermatologicallyTested') ?? prev.dermatologicallyTested,
      coaCertificate: getSurveyBoolean(survey, 'coaCertificate') ?? prev.coaCertificate,
      gmpCertificate: getSurveyBoolean(survey, 'gmpCertificate') ?? prev.gmpCertificate,
      targetCountry: getSurveyString(survey, 'targetCountry') || prev.targetCountry,
      officialRegistration: getSurveyBoolean(survey, 'officialRegistration') ?? prev.officialRegistration,
      ingredientsListFormat: getSurveyString(survey, 'ingredientsListFormat') || prev.ingredientsListFormat,
      finalProductName: getSurveyString(survey, 'finalProductName') || prev.finalProductName,
      shelfLifeTarget: getSurveyString(survey, 'shelfLifeTarget') || prev.shelfLifeTarget,
      storageConditions: getSurveyString(survey, 'storageConditions') || prev.storageConditions,
      withstandGulfHeat: getSurveyBoolean(survey, 'withstandGulfHeat') ?? prev.withstandGulfHeat,
      batchTrackingRequired: getSurveyBoolean(survey, 'batchTrackingRequired') ?? prev.batchTrackingRequired,
      size: getSurveyString(survey, 'size') || prev.size,
      containerType: getSurveyString(survey, 'containerType') || prev.containerType,
      brandVision: getSurveyString(survey, 'brandVision') || prev.brandVision,
    }));
  };

  const update = <K extends keyof BulkFormData>(key: K, value: BulkFormData[K]) => {
    setData((prev) => ({ ...prev, [key]: value }));
  };

  const totalSteps = mode === 'new' ? 4 : 3;

  const stepLabels = useMemo(() => {
    if (mode === 'new') {
      return ['Order Path', 'Product Specs', 'Quantity & Details', 'Payment & Submit'];
    }
    return ['Order Path', 'Quantity & Details', 'Payment & Submit'];
  }, [mode]);

  const canMoveNext = useMemo(() => {
    if (step === 1) {
      if (mode === 'undecided') return false;
      if (mode === 'reuse') return Boolean(selectedSampleId);
      return true;
    }

    if (mode === 'new' && step === 2) {
      return Boolean(
        data.productType
        && data.size
        && data.containerType
        && data.targetCountry
        && data.ingredientsListFormat
      );
    }

    if ((mode === 'new' && step === 3) || (mode !== 'new' && step === 2)) {
      return Boolean(
        data.quantity > 0
        && data.personName.trim()
        && data.email.trim()
        && data.phone.trim()
        && data.country.trim()
        && data.city.trim()
        && data.companyName.trim()
      );
    }

    return true;
  }, [step, mode, selectedSampleId, data]);

  const next = () => setStep((s) => Math.min(totalSteps, s + 1));
  const prev = () => setStep((s) => Math.max(1, s - 1));

  const validatePromo = async () => {
    if (!data.promoCode.trim()) return;
    try {
      const res = await fetch('/api/promos/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: data.promoCode }),
      });
      const result = await res.json();
      if (res.ok && result.valid) {
        setPromoValid(true);
        setPromoMessage(result.message || 'Promo code applied.');
      } else {
        setPromoValid(false);
        setPromoMessage(result.error || 'Invalid promo code');
      }
    } catch {
      setPromoValid(false);
      setPromoMessage('Could not validate promo code');
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setSubmitError('');

    const surveyData = mode === 'reuse'
      ? (selectedSampleSurveyData || {
        productType: data.productType,
        skinType: data.skinType,
        primaryGoal: data.primaryGoal,
        size: data.size,
        containerType: data.containerType,
      })
      : {
        productType: data.productType,
        skinType: data.skinType,
        primaryGoal: data.primaryGoal,
        texturePreference: data.texturePreference,
        referenceProducts: data.referenceProducts,
        mustHaveIngredients: data.mustHaveIngredients,
        mustAvoidIngredients: data.mustAvoidIngredients,
        parabenFree: data.parabenFree,
        sulfateFree: data.sulfateFree,
        siliconeFree: data.siliconeFree,
        fragranceFree: data.fragranceFree,
        naturalOrganic: data.naturalOrganic,
        vegan: data.vegan,
        crueltyFree: data.crueltyFree,
        stabilityTest: data.stabilityTest,
        microbiologicalTest: data.microbiologicalTest,
        dermatologicallyTested: data.dermatologicallyTested,
        coaCertificate: data.coaCertificate,
        gmpCertificate: data.gmpCertificate,
        targetCountry: data.targetCountry,
        officialRegistration: data.officialRegistration,
        ingredientsListFormat: data.ingredientsListFormat,
        finalProductName: data.finalProductName,
        shelfLifeTarget: data.shelfLifeTarget,
        storageConditions: data.storageConditions,
        withstandGulfHeat: data.withstandGulfHeat,
        batchTrackingRequired: data.batchTrackingRequired,
        size: data.size,
        containerType: data.containerType,
        brandVision: data.brandVision,
      };

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'bulk',
          surveyData,
          bulkDetails: {
            quantity: data.quantity,
            pricingNotes: data.pricingNotes,
            deliveryTimeline: data.deliveryTimeline,
          },
          customerInfo: {
            companyName: data.companyName,
            personName: data.personName,
            email: data.email,
            phone: data.phone,
            country: data.country,
            city: data.city,
            address: data.address,
          },
          paymentMethod: data.paymentMethod,
          promoCode: data.promoCode || undefined,
          referralCode: data.referralCode || undefined,
          convertedFromSample: mode === 'reuse' ? selectedSampleId : undefined,
        }),
      });

      let result: { orderNumber?: string; error?: string } = {};
      try {
        result = await res.json();
      } catch {
        result = {};
      }

      if (res.ok) {
        setOrderNumber(result.orderNumber || `KCC-B-${Date.now()}`);
        setSubmitted(true);
      } else if (res.status === 401) {
        setSubmitError('Session expired. Please log in again or continue as guest with full details.');
      } else {
        setSubmitError(result.error || 'Failed to submit order. Please try again.');
      }
    } catch {
      setSubmitError('Network error. Please check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-cream-100 flex items-center justify-center pt-8 pb-20 px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-lg mx-auto text-center"
        >
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-kcc-green/15 ring-4 ring-kcc-green/20 mb-6">
            <CheckCircle size={40} className="text-kcc-green" />
          </div>
          <h1 className="text-3xl font-bold text-ink-700 mb-4">{t('order.orderSuccess')}</h1>
          <p className="text-cream-700 mb-2">{t('order.orderNumber')}:</p>
          <p className="text-2xl font-mono font-bold text-kcc-green mb-8">{orderNumber}</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/account/my-orders" className="px-6 py-3 bg-kcc-green hover:bg-kcc-green-light text-white font-semibold rounded-xl transition-colors">
              View My Orders
            </Link>
            <Link href="/" className="px-6 py-3 border border-cream-400 text-cream-800 hover:text-ink-700 hover:border-cream-500 rounded-xl transition-colors">
              Back to Home
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  const isNewSpecsStep = mode === 'new' && step === 2;
  const isDetailsStep = (mode === 'new' && step === 3) || (mode !== 'new' && step === 2);
  const isPaymentStep = (mode === 'new' && step === 4) || (mode !== 'new' && step === 3);

  const selectedSample = samples.find((s) => s._id === selectedSampleId);

  return (
    <div className="min-h-screen bg-cream-100 pt-8 pb-20 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-kcc-beige-light/55 text-kcc-beige-dark mb-4">
            <Truck size={28} />
          </div>
          <h1 className="text-3xl font-bold text-ink-700 mb-2">{t('order.bulkTitle')}</h1>
          <p className="text-cream-700">{t('order.bulkDesc')}</p>
        </div>

        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-cream-700">{t('order.step')} {step} {t('order.of')} {totalSteps}</span>
            <span className="text-sm text-cream-700">{stepLabels[step - 1]}</span>
          </div>
          <div className="h-2 bg-cream-200 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-kcc-beige rounded-full"
              initial={false}
              animate={{ width: `${(step / totalSteps) * 100}%` }}
              transition={{ duration: 0.35 }}
            />
          </div>
        </div>

        <motion.div
          key={`${mode}-${step}`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="bg-white border border-cream-300 shadow-soft rounded-2xl p-6 sm:p-8 mb-6"
        >
          {step === 1 && (
            <div className="space-y-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-ink-700 mb-1">Pick the sample you want to scale up</h2>
                  <p className="text-sm text-cream-700">Bulk production runs from a sample you&apos;ve already requested. Pick one of your samples to continue with the same exact specs.</p>
                </div>
                <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full border border-kcc-rose-dark/40 bg-kcc-rose-light/55 text-kcc-rose-dark">
                  <Sparkles size={13} />
                  From your samples
                </span>
              </div>

              {!user ? (
                <div className="rounded-2xl border border-cream-400 bg-cream-100 p-6 text-center">
                  <p className="text-sm text-ink-700 mb-3">
                    Sign in to access your sample history and turn one of them into a bulk order.
                  </p>
                  <div className="flex items-center justify-center gap-3">
                    <Link
                      href="/login?redirect=/order/bulk"
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-kcc-green hover:bg-kcc-green-light text-white rounded-xl text-sm font-medium transition-colors"
                    >
                      Sign in
                    </Link>
                    <Link
                      href="/order/sample"
                      className="inline-flex items-center gap-2 px-5 py-2.5 border border-cream-400 text-ink-700 hover:border-ink-700 rounded-xl text-sm font-medium transition-colors"
                    >
                      Or request a sample first <ArrowRight size={14} />
                    </Link>
                  </div>
                </div>
              ) : samplesLoading ? (
                <div className="py-10 text-center text-cream-700">Loading your previous sample orders…</div>
              ) : samples.length === 0 ? (
                /* Empty state — no samples yet */
                <div className="rounded-2xl border border-cream-400 bg-gradient-to-br from-blush-50 to-cream-100 p-8 text-center">
                  <div className="inline-flex w-14 h-14 rounded-2xl bg-white items-center justify-center mb-4 shadow-soft">
                    <Wand2 size={22} className="text-kcc-rose-dark" />
                  </div>
                  <h3 className="text-lg font-semibold text-ink-700 mb-2">You don&apos;t have any samples yet</h3>
                  <p className="text-sm text-cream-800 max-w-md mx-auto mb-6 leading-relaxed">
                    Bulk orders are based on a sample you&apos;ve already approved. Start with our 5-minute Sample Quiz —
                    once your sample is reviewed, you can come back and scale it to bulk.
                  </p>
                  <Link
                    href="/order/sample"
                    className="inline-flex items-center gap-2 px-7 py-3 bg-kcc-rose-dark hover:bg-kcc-rose text-white rounded-xl text-sm font-semibold transition-colors shadow-rose"
                  >
                    <Sparkles size={15} />
                    Start the Sample Quiz
                    <ArrowRight size={15} />
                  </Link>
                  <div className="mt-6 pt-6 border-t border-cream-300">
                    <Link
                      href="/account/my-samples"
                      className="text-xs text-cream-700 hover:text-ink-700 inline-flex items-center gap-1.5"
                    >
                      <History size={12} />
                      View My Samples page
                    </Link>
                  </div>
                </div>
              ) : (
                /* Sample picker */
                <div className="space-y-4">
                  <div className="rounded-xl border border-cream-400 bg-cream-100 p-4 flex items-start gap-3">
                    <Sparkles size={16} className="text-kcc-rose-dark mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm text-ink-700 font-medium mb-0.5">Pick the sample to scale</p>
                      <p className="text-xs text-cream-700">All product specs (oils, actives, packaging, fragrance, etc.) carry over automatically. You only set quantity & delivery.</p>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-3">
                    {samples.map((sample) => {
                      const survey = sample.surveyData || {};
                      const surveyProductType = getSurveyString(survey, 'productType');
                      const surveyContainer = getSurveyString(survey, 'containerType');
                      const surveySize = getSurveyString(survey, 'size');
                      const itemName = getSurveyString(survey, 'productItem');
                      const active = selectedSampleId === sample._id;
                      return (
                        <button
                          type="button"
                          key={sample._id}
                          onClick={() => {
                            setSelectedSampleId(sample._id);
                            applySample(sample);
                          }}
                          className={`text-start rounded-xl border p-4 transition-all duration-200 ${
                            active
                              ? 'bg-blush-50 border-kcc-rose-dark/50 shadow-soft-lg ring-1 ring-kcc-rose-dark/20'
                              : 'bg-white border-cream-300 hover:border-kcc-rose-dark/40'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <div className="font-mono text-xs text-cream-800">{sample.orderNumber}</div>
                            <span className={`px-2 py-0.5 text-[10px] rounded-full border ${statusBadge[sample.status] || 'bg-cream-300 text-cream-700 border-cream-400'}`}>
                              {sample.status}
                            </span>
                          </div>
                          <p className="text-sm text-ink-700 font-medium mb-1">{itemName || surveyProductType || 'Custom Product'}</p>
                          <p className="text-xs text-cream-700">{surveyContainer || 'Container TBD'} {surveySize ? `· ${surveySize}` : ''}</p>
                          {sample.createdAt && (
                            <div className="mt-2 inline-flex items-center gap-1 text-[11px] text-cream-600">
                              <Calendar size={11} />
                              {new Date(sample.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </div>
                          )}
                          {active && (
                            <div className="mt-3 inline-flex items-center gap-1.5 text-[11px] text-kcc-rose-dark font-semibold">
                              <Check size={11} strokeWidth={3} />
                              Selected
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  <div className="text-center pt-2">
                    <Link
                      href="/order/sample"
                      className="inline-flex items-center gap-1.5 text-xs text-cream-700 hover:text-ink-700 transition-colors"
                    >
                      Or start a new sample for a different product
                      <ArrowRight size={12} />
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )}

          {isNewSpecsStep && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-ink-700 mb-1">New Product Specs Survey</h2>
                <p className="text-sm text-cream-700">Complete the full specifications wizard for this new bulk requirement before checkout.</p>
              </div>

              <div className="rounded-xl border border-cream-400 bg-cream-100 p-4 space-y-4">
                <p className="text-xs uppercase tracking-[0.16em] text-cream-600">1. Product Basics</p>
                <div className="grid sm:grid-cols-2 gap-4">
                  <SelectField label="Product Type" required value={data.productType} onChange={(v) => update('productType', v)} options={productTypes} />
                  <SelectField label="Skin Type" value={data.skinType} onChange={(v) => update('skinType', v)} options={skinTypes} />
                  <SelectField label="Primary Goal" value={data.primaryGoal} onChange={(v) => update('primaryGoal', v)} options={primaryGoals} />
                  <SelectField label="Texture Preference" value={data.texturePreference} onChange={(v) => update('texturePreference', v)} options={texturePreferences} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-cream-800 mb-2">Reference Products / Notes</label>
                  <textarea
                    value={data.referenceProducts}
                    onChange={(e) => update('referenceProducts', e.target.value)}
                    rows={3}
                    className="w-full px-4 py-3 bg-white border border-cream-300 rounded-xl text-ink-700 placeholder:text-cream-700 focus:outline-none focus:border-kcc-beige transition-colors resize-none"
                    placeholder="Mention existing products or desired benchmark..."
                  />
                </div>
              </div>

              <div className="rounded-xl border border-cream-400 bg-cream-100 p-4 space-y-4">
                <p className="text-xs uppercase tracking-[0.16em] text-cream-600">2. Ingredients</p>
                <MultiSelectChips
                  label="Must-have ingredients"
                  options={mustHaveOptions}
                  values={data.mustHaveIngredients}
                  onChange={(v) => update('mustHaveIngredients', v)}
                />
                <MultiSelectChips
                  label="Must-avoid ingredients"
                  options={mustAvoidOptions}
                  values={data.mustAvoidIngredients}
                  onChange={(v) => update('mustAvoidIngredients', v)}
                />
                <div className="grid sm:grid-cols-2 gap-3">
                  <ToggleField label="Paraben Free" checked={data.parabenFree} onChange={(v) => update('parabenFree', v)} />
                  <ToggleField label="Sulfate Free" checked={data.sulfateFree} onChange={(v) => update('sulfateFree', v)} />
                  <ToggleField label="Silicone Free" checked={data.siliconeFree} onChange={(v) => update('siliconeFree', v)} />
                  <ToggleField label="Fragrance Free" checked={data.fragranceFree} onChange={(v) => update('fragranceFree', v)} />
                  <ToggleField label="Natural / Organic" checked={data.naturalOrganic} onChange={(v) => update('naturalOrganic', v)} />
                  <ToggleField label="Vegan / Cruelty Free" checked={data.vegan || data.crueltyFree} onChange={(v) => { update('vegan', v); update('crueltyFree', v); }} />
                </div>
              </div>

              <div className="rounded-xl border border-cream-400 bg-cream-100 p-4 space-y-4">
                <p className="text-xs uppercase tracking-[0.16em] text-cream-600">3. Quality, Regulatory & Technical</p>
                <div className="grid sm:grid-cols-2 gap-3">
                  <ToggleField label="Stability Test" checked={data.stabilityTest} onChange={(v) => update('stabilityTest', v)} />
                  <ToggleField label="Microbiological Test" checked={data.microbiologicalTest} onChange={(v) => update('microbiologicalTest', v)} />
                  <ToggleField label="Dermatologically Tested" checked={data.dermatologicallyTested} onChange={(v) => update('dermatologicallyTested', v)} />
                  <ToggleField label="COA Certificate" checked={data.coaCertificate} onChange={(v) => update('coaCertificate', v)} />
                  <ToggleField label="GMP Certificate" checked={data.gmpCertificate} onChange={(v) => update('gmpCertificate', v)} />
                  <ToggleField label="Official Registration Needed" checked={data.officialRegistration} onChange={(v) => update('officialRegistration', v)} />
                  <ToggleField label="Withstand Gulf Heat" checked={data.withstandGulfHeat} onChange={(v) => update('withstandGulfHeat', v)} />
                  <ToggleField label="Batch Tracking Required" checked={data.batchTrackingRequired} onChange={(v) => update('batchTrackingRequired', v)} />
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <SelectField label="Target Country" required value={data.targetCountry} onChange={(v) => update('targetCountry', v)} options={targetCountries} />
                  <SelectField label="Ingredients List Format" required value={data.ingredientsListFormat} onChange={(v) => update('ingredientsListFormat', v)} options={ingredientsListFormats} />
                  <SelectField label="Shelf Life Target" value={data.shelfLifeTarget} onChange={(v) => update('shelfLifeTarget', v)} options={shelfLifeTargets} />
                  <SelectField label="Storage Conditions" value={data.storageConditions} onChange={(v) => update('storageConditions', v)} options={storageConditionsOptions} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-cream-800 mb-2">Final Product Name</label>
                  <input
                    type="text"
                    value={data.finalProductName}
                    onChange={(e) => update('finalProductName', e.target.value)}
                    className="w-full px-4 py-3 bg-white border border-cream-300 rounded-xl text-ink-700 focus:outline-none focus:border-kcc-beige transition-colors"
                    placeholder="Optional product name"
                  />
                </div>
              </div>

              <div className="rounded-xl border border-cream-400 bg-cream-100 p-4 space-y-4">
                <p className="text-xs uppercase tracking-[0.16em] text-cream-600">4. Packaging & Brand Vision</p>
                <div className="grid sm:grid-cols-2 gap-4">
                  <SelectField label="Size" required value={data.size} onChange={(v) => update('size', v)} options={sizes} />
                  <SelectField label="Container Type" required value={data.containerType} onChange={(v) => update('containerType', v)} options={containerTypes} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-cream-800 mb-2">Brand Vision</label>
                  <textarea
                    value={data.brandVision}
                    onChange={(e) => update('brandVision', e.target.value)}
                    rows={3}
                    className="w-full px-4 py-3 bg-white border border-cream-300 rounded-xl text-ink-700 placeholder:text-cream-700 focus:outline-none focus:border-kcc-beige transition-colors resize-none"
                    placeholder="Describe product direction, audience, and look & feel..."
                  />
                </div>
              </div>
            </div>
          )}

          {isDetailsStep && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-ink-700 mb-1">Quantity & Customer Details</h2>
                <p className="text-sm text-cream-700">Complete operational details to move quickly into payment and final review.</p>
              </div>

              {mode === 'reuse' && selectedSample && (
                <div className="rounded-xl border border-kcc-beige/30 bg-kcc-beige/10 p-4">
                  <p className="text-sm text-kcc-beige-dark font-medium mb-1">Using previous sample specs</p>
                  <p className="text-xs text-cream-800">{selectedSample.orderNumber} • {data.productType || 'Custom Product'} {data.size ? `(${data.size})` : ''}</p>
                </div>
              )}

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-cream-800 mb-2">Quantity (units) <span className="text-red-400">*</span></label>
                  <input
                    type="number"
                    min={1}
                    value={data.quantity}
                    onChange={(e) => update('quantity', Math.max(1, parseInt(e.target.value, 10) || 0))}
                    className="w-full px-4 py-3 bg-white border border-cream-300 rounded-xl text-ink-700 focus:outline-none focus:border-kcc-beige transition-colors"
                  />
                </div>
                <SelectField
                  label={t('order.deliveryTimeline')}
                  value={data.deliveryTimeline}
                  onChange={(v) => update('deliveryTimeline', v)}
                  options={deliveryTimelines}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-cream-800 mb-2">Pricing Notes / Budget</label>
                <textarea
                  value={data.pricingNotes}
                  onChange={(e) => update('pricingNotes', e.target.value)}
                  rows={3}
                  placeholder="Any constraints, target margin, or launch timeline notes..."
                  className="w-full px-4 py-3 bg-white border border-cream-300 rounded-xl text-ink-700 placeholder:text-cream-700 focus:outline-none focus:border-kcc-beige transition-colors resize-none"
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                {[
                  { label: 'Company / Pharmacy Name', key: 'companyName' as const, required: true },
                  { label: 'Person Name', key: 'personName' as const, required: true },
                  { label: 'Email', key: 'email' as const, required: true, type: 'email' },
                  { label: 'Phone', key: 'phone' as const, required: true, type: 'tel' },
                  { label: 'Country', key: 'country' as const, required: true },
                  { label: 'City', key: 'city' as const, required: true },
                ].map((field) => (
                  <div key={field.key}>
                    <label className="block text-sm font-medium text-cream-800 mb-2">
                      {field.label} {field.required && <span className="text-red-400">*</span>}
                    </label>
                    <input
                      type={field.type || 'text'}
                      value={data[field.key] as string}
                      onChange={(e) => update(field.key, e.target.value)}
                      className="w-full px-4 py-3 bg-white border border-cream-300 rounded-xl text-ink-700 focus:outline-none focus:border-kcc-beige transition-colors"
                    />
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-sm font-medium text-cream-800 mb-2">Address</label>
                <textarea
                  value={data.address}
                  onChange={(e) => update('address', e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 bg-white border border-cream-300 rounded-xl text-ink-700 placeholder:text-cream-700 focus:outline-none focus:border-kcc-beige transition-colors resize-none"
                  placeholder="Full address (optional)"
                />
              </div>
            </div>
          )}

          {isPaymentStep && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-ink-700 mb-1">Payment, Promo & Final Review</h2>
                <p className="text-sm text-cream-700">Finish checkout with promo/referral and submit your bulk order.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-cream-800 mb-3">Payment Method</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => update('paymentMethod', 'cash')}
                    className={`flex items-center gap-3 px-4 py-4 rounded-xl border transition-all ${
                      data.paymentMethod === 'cash'
                        ? 'bg-kcc-beige/10 border-kcc-beige/50 text-kcc-beige-dark'
                        : 'bg-white border-cream-400 text-cream-700 hover:border-cream-500'
                    }`}
                  >
                    <Banknote size={22} />
                    <span className="font-medium">Cash</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => update('paymentMethod', 'card')}
                    className={`flex items-center gap-3 px-4 py-4 rounded-xl border transition-all ${
                      data.paymentMethod === 'card'
                        ? 'bg-kcc-beige/10 border-kcc-beige/50 text-kcc-beige-dark'
                        : 'bg-white border-cream-400 text-cream-700 hover:border-cream-500'
                    }`}
                  >
                    <CreditCard size={22} />
                    <span className="font-medium">Card</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-cream-800 mb-2">{t('order.promo')}</label>
                <div className="flex gap-2">
                  <input
                    value={data.promoCode}
                    onChange={(e) => { update('promoCode', e.target.value); setPromoValid(null); }}
                    placeholder={t('order.promoPlaceholder')}
                    className="flex-1 px-4 py-3 bg-white border border-cream-300 rounded-xl text-ink-700 placeholder:text-cream-700 focus:outline-none focus:border-kcc-beige transition-colors"
                  />
                  <button type="button" onClick={validatePromo} className="px-5 py-3 bg-cream-300 hover:bg-cream-400 text-ink-600 rounded-xl transition-colors font-medium">
                    {t('order.applyPromo')}
                  </button>
                </div>
                {promoValid !== null && <p className={`text-sm mt-2 ${promoValid ? 'text-kcc-green' : 'text-red-400'}`}>{promoMessage}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-cream-800 mb-2">{t('order.referral')}</label>
                <input
                  value={data.referralCode}
                  onChange={(e) => update('referralCode', e.target.value)}
                  placeholder={t('order.referralPlaceholder')}
                  className="w-full px-4 py-3 bg-white border border-cream-300 rounded-xl text-ink-700 placeholder:text-cream-700 focus:outline-none focus:border-kcc-beige transition-colors"
                />
              </div>

              <div className="p-5 bg-white border border-cream-300 rounded-xl">
                <h3 className="text-sm font-semibold text-ink-600 uppercase tracking-wider mb-4">Order Summary</h3>
                <div className="grid sm:grid-cols-2 gap-2 text-sm">
                  <SummaryRow label="Order Path" value={mode === 'reuse' ? 'Use previous sample specs' : 'New specs'} />
                  {mode === 'reuse' && <SummaryRow label="Sample Reference" value={selectedSample?.orderNumber || '-'} />}
                  <SummaryRow label="Product Type" value={data.productType || '-'} />
                  <SummaryRow label="Size" value={data.size || '-'} />
                  <SummaryRow label="Container" value={data.containerType || '-'} />
                  <SummaryRow label="Quantity" value={`${data.quantity} units`} />
                  <SummaryRow label="Delivery" value={data.deliveryTimeline || '-'} />
                  <SummaryRow label="Payment" value={data.paymentMethod} />
                </div>
                <div className="mt-4 pt-4 border-t border-cream-400 text-xs text-cream-600">
                  {mode === 'reuse'
                    ? 'Specs are auto-filled from your selected sample and survey steps are skipped.'
                    : 'You are placing a new bulk order with new specs.'}
                </div>
              </div>
            </div>
          )}
        </motion.div>

        {submitError && (
          <div className="flex items-center gap-2 p-3 mb-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
            <AlertCircle size={16} className="shrink-0" />
            {submitError}
          </div>
        )}

        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={prev}
            disabled={step === 1}
            className="flex items-center gap-2 px-5 py-3 text-cream-800 hover:text-ink-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft size={18} />
            {t('common.previous')}
          </button>

          {step < totalSteps ? (
            <button
              type="button"
              onClick={next}
              disabled={!canMoveNext}
              className="flex items-center gap-2 px-6 py-3 bg-kcc-beige hover:bg-kcc-beige/90 text-ink-800 font-semibold rounded-xl transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {mode === 'reuse' && step === 1 ? 'Continue to Checkout' : t('common.next')}
              <ChevronRight size={18} />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || !canMoveNext}
              className="flex items-center gap-2 px-6 py-3 bg-kcc-beige hover:bg-kcc-beige/90 text-ink-800 font-semibold rounded-xl transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? t('common.loading') : t('order.submitOrder')}
              {!submitting && <Check size={18} />}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-cream-800 mb-2">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-3 bg-white border border-cream-300 rounded-xl text-ink-700 focus:outline-none focus:border-kcc-beige transition-colors appearance-none"
      >
        <option value="">-- Select --</option>
        {options.map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-cream-800">
      <span>{label}</span>
      <span className="text-ink-700 font-medium capitalize">{value || '-'}</span>
    </div>
  );
}

function getSurveyString(survey: Record<string, unknown>, key: string): string {
  const value = survey[key];
  return typeof value === 'string' ? value : '';
}

function getSurveyBoolean(survey: Record<string, unknown>, key: string): boolean | null {
  const value = survey[key];
  return typeof value === 'boolean' ? value : null;
}

function getSurveyArray(survey: Record<string, unknown>, key: string): string[] {
  const value = survey[key];
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];
}

function ToggleField({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`flex items-center justify-between w-full px-4 py-3 rounded-xl border transition-colors ${
        checked ? 'bg-kcc-green/10 border-kcc-green/40 text-kcc-green' : 'bg-white border-cream-300 text-cream-800 hover:border-cream-400'
      }`}
    >
      <span className="text-sm">{label}</span>
      <span className={`w-10 h-5 rounded-full relative ${checked ? 'bg-kcc-green' : 'bg-cream-400'}`}>
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${checked ? 'right-0.5' : 'left-0.5'}`} />
      </span>
    </button>
  );
}

function MultiSelectChips({
  label,
  options,
  values,
  onChange,
}: {
  label: string;
  options: string[];
  values: string[];
  onChange: (values: string[]) => void;
}) {
  const toggleValue = (value: string) => {
    if (values.includes(value)) {
      onChange(values.filter((v) => v !== value));
    } else {
      onChange([...values, value]);
    }
  };

  return (
    <div>
      <p className="text-sm font-medium text-cream-800 mb-2">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const active = values.includes(option);
          return (
            <button
              key={option}
              type="button"
              onClick={() => toggleValue(option)}
              className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                active ? 'bg-kcc-green/10 border-kcc-green/40 text-kcc-green' : 'bg-white border-cream-300 text-cream-800 hover:border-cream-400'
              }`}
            >
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
}
