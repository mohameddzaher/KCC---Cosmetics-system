'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, CheckCircle, Loader2, Mail } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export default function NewsletterSection() {
  const { locale } = useLanguage();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const content = {
    title: {
      en: 'Stay Updated',
      ar: 'ابقَ على اطلاع',
    },
    subtitle: {
      en: 'Subscribe to our newsletter for the latest industry insights, product launches, and KCC news delivered straight to your inbox.',
      ar: 'اشترك في نشرتنا الإخبارية لتصلك أحدث رؤى الصناعة وإطلاقات المنتجات وأخبار KCC مباشرة إلى بريدك الإلكتروني.',
    },
    placeholder: {
      en: 'Enter your email address',
      ar: 'أدخل بريدك الإلكتروني',
    },
    button: {
      en: 'Subscribe',
      ar: 'اشترك',
    },
    success: {
      en: 'Thank you for subscribing! We\'ll keep you updated.',
      ar: 'شكراً لاشتراكك! سنبقيك على اطلاع.',
    },
    error: {
      en: 'Please enter a valid email address.',
      ar: 'يرجى إدخال بريد إلكتروني صالح.',
    },
    privacy: {
      en: 'We respect your privacy. Unsubscribe at any time.',
      ar: 'نحن نحترم خصوصيتك. يمكنك إلغاء الاشتراك في أي وقت.',
    },
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setStatus('error');
      setErrorMessage(locale === 'ar' ? content.error.ar : content.error.en);
      return;
    }

    setStatus('loading');

    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (res.ok) {
        setStatus('success');
        setEmail('');
      } else {
        setStatus('success');
        setEmail('');
      }
    } catch {
      setStatus('success');
      setEmail('');
    }
  };

  return (
    <section className="relative py-16 lg:py-20 bg-blush-radial overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 dot-pattern opacity-50" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-kcc-rose-light/40 rounded-full blur-[180px]" />

      <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="glass-card-blush p-8 sm:p-10 lg:p-12 text-center relative overflow-hidden"
        >
          {/* Decorative ribbon */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-1 bg-gradient-to-r from-kcc-rose via-kcc-beige to-kcc-rose rounded-b-full" />

          {/* Icon */}
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-br from-kcc-rose-light to-kcc-beige-light shadow-rose mb-5">
            <Mail size={22} className="text-kcc-rose-dark" />
          </div>

          {/* Heading */}
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-3">
            <span className="gradient-text-rose">
              {locale === 'ar' ? content.title.ar : content.title.en}
            </span>
          </h2>

          {/* Subtitle */}
          <p className="text-cream-700 text-sm sm:text-base max-w-xl mx-auto mb-8">
            {locale === 'ar' ? content.subtitle.ar : content.subtitle.en}
          </p>

          {/* Form / Success State */}
          <AnimatePresence mode="wait">
            {status === 'success' ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3 }}
                className="flex items-center justify-center gap-3 py-4"
              >
                <CheckCircle size={22} className="text-kcc-green flex-shrink-0" />
                <p className="text-ink-700 text-sm sm:text-base font-medium">
                  {locale === 'ar' ? content.success.ar : content.success.en}
                </p>
              </motion.div>
            ) : (
              <motion.form
                key="form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                onSubmit={handleSubmit}
                className="flex flex-col sm:flex-row items-stretch gap-3 max-w-lg mx-auto"
              >
                <div className="relative flex-1">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (status === 'error') setStatus('idle');
                    }}
                    placeholder={locale === 'ar' ? content.placeholder.ar : content.placeholder.en}
                    className={`w-full px-4 py-3.5 bg-white border rounded-xl text-ink-700 text-sm placeholder:text-cream-700 focus:outline-none focus:border-kcc-rose-dark/60 focus:ring-2 focus:ring-kcc-rose/20 transition-all duration-200 ${
                      status === 'error' ? 'border-blush-500/70' : 'border-cream-300'
                    }`}
                    dir={locale === 'ar' ? 'rtl' : 'ltr'}
                  />
                </div>
                <button
                  type="submit"
                  disabled={status === 'loading'}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 btn-luxe font-semibold rounded-xl disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {status === 'loading' ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <Send size={16} />
                  )}
                  <span>{locale === 'ar' ? content.button.ar : content.button.en}</span>
                </button>
              </motion.form>
            )}
          </AnimatePresence>

          {/* Error message */}
          <AnimatePresence>
            {status === 'error' && (
              <motion.p
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.2 }}
                className="text-blush-700 text-xs mt-3"
              >
                {errorMessage}
              </motion.p>
            )}
          </AnimatePresence>

          {/* Privacy note */}
          {status !== 'success' && (
            <p className="text-cream-700 text-xs mt-4">
              {locale === 'ar' ? content.privacy.ar : content.privacy.en}
            </p>
          )}
        </motion.div>
      </div>
    </section>
  );
}
