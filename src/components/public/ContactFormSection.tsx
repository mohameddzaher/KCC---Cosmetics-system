'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, CheckCircle, AlertCircle, Loader2, Mail, Phone, MapPin, Clock } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface FormData {
  name: string;
  email: string;
  phone: string;
  company: string;
  message: string;
}

const initialFormData: FormData = {
  name: '',
  email: '',
  phone: '',
  company: '',
  message: '',
};

export default function ContactFormSection() {
  const { locale } = useLanguage();
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [settings, setSettings] = useState<any>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/settings/public', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (!cancelled) setSettings(d); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const content = {
    title: {
      en: 'Get in Touch',
      ar: 'تواصل معنا',
    },
    subtitle: {
      en: 'Ready to bring your cosmetics brand to life? Tell us about your project and our team will get back to you within 24 hours.',
      ar: 'مستعد لإحياء علامتك التجارية لمستحضرات التجميل؟ أخبرنا عن مشروعك وسيتواصل فريقنا معك خلال 24 ساعة.',
    },
    fields: {
      name: { en: 'Full Name', ar: 'الاسم الكامل' },
      email: { en: 'Email Address', ar: 'البريد الإلكتروني' },
      phone: { en: 'Phone Number', ar: 'رقم الهاتف' },
      company: { en: 'Company Name', ar: 'اسم الشركة' },
      message: { en: 'Your Message', ar: 'رسالتك' },
    },
    placeholders: {
      name: { en: 'John Doe', ar: 'محمد أحمد' },
      email: { en: 'you@company.com', ar: 'you@company.com' },
      phone: { en: '+966 5X XXX XXXX', ar: '+966 5X XXX XXXX' },
      company: { en: 'Your Company Ltd.', ar: 'شركتك المحدودة' },
      message: {
        en: 'Tell us about your project requirements...',
        ar: 'أخبرنا عن متطلبات مشروعك...',
      },
    },
    button: { en: 'Send Message', ar: 'إرسال الرسالة' },
    success: {
      title: { en: 'Message Sent!', ar: 'تم إرسال الرسالة!' },
      description: {
        en: 'Thank you for reaching out. Our team will contact you within 24 hours.',
        ar: 'شكراً للتواصل معنا. سيتواصل فريقنا معك خلال 24 ساعة.',
      },
      another: { en: 'Send Another Message', ar: 'إرسال رسالة أخرى' },
    },
    error: {
      en: 'Something went wrong. Please try again or contact us directly.',
      ar: 'حدث خطأ ما. يرجى المحاولة مرة أخرى أو التواصل معنا مباشرة.',
    },
    sidebar: {
      heading: { en: 'Contact Information', ar: 'معلومات الاتصال' },
      email: { label: { en: 'Email', ar: 'البريد الإلكتروني' } },
      phone: { label: { en: 'Phone', ar: 'الهاتف' } },
      address: { label: { en: 'Address', ar: 'العنوان' } },
      hours: {
        label: { en: 'Business Hours', ar: 'ساعات العمل' },
        value: {
          en: 'Sun - Thu: 9:00 AM - 5:00 PM',
          ar: 'الأحد - الخميس: 9:00 ص - 5:00 م',
        },
      },
    },
  };

  // Real, editable contact info from Site Settings (falls back to our domain).
  const g = settings || {};
  const realEmail = g.contactEmail || g.emails?.info || 'info@kcc-bv.com';
  const realPhone = g.contactPhone || g.phones?.primary || '';
  const realAddress = (g.contactAddress?.[locale] || g.contactAddress?.en) || '';

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    if (status === 'error') setStatus('idle');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setStatus('success');
        setFormData(initialFormData);
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
  };

  const inputClasses =
    'w-full px-4 py-3 bg-white border border-cream-300 rounded-xl text-ink-700 text-sm placeholder:text-cream-700 focus:outline-none focus:border-kcc-rose-dark/60 focus:ring-2 focus:ring-kcc-rose/20 transition-all duration-200';

  const l = (field: { en: string; ar: string }) => (locale === 'ar' ? field.ar : field.en);

  const contactItems = [
    { icon: Mail, label: l(content.sidebar.email.label), value: realEmail, href: `mailto:${realEmail}` },
    ...(realPhone ? [{ icon: Phone, label: l(content.sidebar.phone.label), value: realPhone, href: `tel:${realPhone.replace(/\s+/g, '')}` }] : []),
    ...(realAddress ? [{ icon: MapPin, label: l(content.sidebar.address.label), value: realAddress, href: '' }] : []),
    { icon: Clock, label: l(content.sidebar.hours.label), value: l(content.sidebar.hours.value), href: '' },
  ];

  return (
    <section className="relative py-12 lg:py-16 bg-cream-50 overflow-hidden">
      {/* Background */}
      <div className="absolute top-0 end-0 w-96 h-96 bg-kcc-rose-light/40 rounded-full blur-[200px]" />
      <div className="absolute bottom-0 start-0 w-80 h-80 bg-kcc-beige-light/35 rounded-full blur-[180px]" />
      <div className="absolute inset-0 dot-pattern opacity-40" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <span className="inline-block px-4 py-1.5 mb-4 text-[11px] uppercase tracking-[0.25em] chip-rose rounded-full font-medium">
            {locale === 'ar' ? 'دعنا نتعرف عليك' : "Let's Connect"}
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold mb-3">
            <span className="gradient-text">{l(content.title)}</span>
          </h2>
          <p className="text-cream-700 text-base sm:text-lg max-w-2xl mx-auto">
            {l(content.subtitle)}
          </p>
        </motion.div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 lg:gap-12">
          {/* Form Column */}
          <motion.div
            initial={{ opacity: 0, x: locale === 'ar' ? 30 : -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="lg:col-span-3"
          >
            <div className="glass-card p-6 sm:p-8 h-full">
              <AnimatePresence mode="wait">
                {status === 'success' ? (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.3 }}
                    className="flex flex-col items-center justify-center py-12 text-center"
                  >
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-kcc-rose-light to-kcc-beige-light flex items-center justify-center mb-5 shadow-rose">
                      <CheckCircle size={32} className="text-kcc-green" />
                    </div>
                    <h3 className="text-xl font-bold text-ink-700 mb-2">
                      {l(content.success.title)}
                    </h3>
                    <p className="text-cream-700 text-sm mb-6 max-w-sm">
                      {l(content.success.description)}
                    </p>
                    <button
                      type="button"
                      onClick={() => setStatus('idle')}
                      className="text-sm font-medium text-kcc-rose-dark hover:text-kcc-rose transition-colors duration-200"
                    >
                      {l(content.success.another)}
                    </button>
                  </motion.div>
                ) : (
                  <motion.form
                    key="form"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    onSubmit={handleSubmit}
                    className="space-y-5"
                  >
                    {/* Name & Email Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-xs font-semibold text-ink-600 mb-2 uppercase tracking-wide">
                          {l(content.fields.name)} <span className="text-kcc-rose-dark">*</span>
                        </label>
                        <input
                          type="text"
                          name="name"
                          required
                          value={formData.name}
                          onChange={handleChange}
                          placeholder={l(content.placeholders.name)}
                          className={inputClasses}
                          dir={locale === 'ar' ? 'rtl' : 'ltr'}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-ink-600 mb-2 uppercase tracking-wide">
                          {l(content.fields.email)} <span className="text-kcc-rose-dark">*</span>
                        </label>
                        <input
                          type="email"
                          name="email"
                          required
                          value={formData.email}
                          onChange={handleChange}
                          placeholder={l(content.placeholders.email)}
                          className={inputClasses}
                          dir="ltr"
                        />
                      </div>
                    </div>

                    {/* Phone & Company Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-xs font-semibold text-ink-600 mb-2 uppercase tracking-wide">
                          {l(content.fields.phone)}
                        </label>
                        <input
                          type="tel"
                          name="phone"
                          value={formData.phone}
                          onChange={handleChange}
                          placeholder={l(content.placeholders.phone)}
                          className={inputClasses}
                          dir="ltr"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-ink-600 mb-2 uppercase tracking-wide">
                          {l(content.fields.company)}
                        </label>
                        <input
                          type="text"
                          name="company"
                          value={formData.company}
                          onChange={handleChange}
                          placeholder={l(content.placeholders.company)}
                          className={inputClasses}
                          dir={locale === 'ar' ? 'rtl' : 'ltr'}
                        />
                      </div>
                    </div>

                    {/* Message */}
                    <div>
                      <label className="block text-xs font-semibold text-ink-600 mb-2 uppercase tracking-wide">
                        {l(content.fields.message)} <span className="text-kcc-rose-dark">*</span>
                      </label>
                      <textarea
                        name="message"
                        required
                        rows={4}
                        value={formData.message}
                        onChange={handleChange}
                        placeholder={l(content.placeholders.message)}
                        className={`${inputClasses} resize-none`}
                        dir={locale === 'ar' ? 'rtl' : 'ltr'}
                      />
                    </div>

                    {/* Error Message */}
                    <AnimatePresence>
                      {status === 'error' && (
                        <motion.div
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -5 }}
                          transition={{ duration: 0.2 }}
                          className="flex items-center gap-2 text-blush-700 text-sm bg-blush-50 border border-blush-200 rounded-xl px-3 py-2"
                        >
                          <AlertCircle size={16} />
                          <span>{l(content.error)}</span>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Submit Button */}
                    <button
                      type="submit"
                      disabled={status === 'loading'}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 btn-luxe font-semibold rounded-xl disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {status === 'loading' ? (
                        <Loader2 size={18} className="animate-spin" />
                      ) : (
                        <Send size={16} />
                      )}
                      <span>{l(content.button)}</span>
                    </button>
                  </motion.form>
                )}
              </AnimatePresence>
            </div>
          </motion.div>

          {/* Sidebar Column */}
          <motion.div
            initial={{ opacity: 0, x: locale === 'ar' ? -30 : 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.35 }}
            className="lg:col-span-2"
          >
            <div className="glass-card-champagne p-6 sm:p-8 h-full">
              <h3 className="text-lg font-semibold text-ink-700 mb-6 flex items-center gap-2">
                <span className="w-1.5 h-6 rounded-full bg-gradient-to-b from-kcc-rose to-kcc-beige" />
                {l(content.sidebar.heading)}
              </h3>

              <div className="space-y-6">
                {contactItems.map((item, index) => {
                  const Icon = item.icon;
                  return (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 15 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.4, delay: 0.4 + index * 0.1 }}
                      className="flex items-start gap-4"
                    >
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-kcc-rose-light to-kcc-beige-light flex items-center justify-center flex-shrink-0 shadow-soft">
                        <Icon size={18} className="text-kcc-rose-dark" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-cream-700 mb-1 uppercase tracking-wide">{item.label}</p>
                        {item.href ? (
                          <a href={item.href} className="text-sm text-ink-700 font-medium hover:text-kcc-rose-dark transition-colors break-words">{item.value}</a>
                        ) : (
                          <p className="text-sm text-ink-700 font-medium break-words">{item.value}</p>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* Divider */}
              <div className="my-8 divider-soft" />

              {/* Trust badges */}
              <div className="space-y-3">
                {[
                  { en: 'SFDA Approved Facility', ar: 'منشأة معتمدة من هيئة الغذاء والدواء' },
                  { en: 'ISO 22716 Certified', ar: 'حاصلة على شهادة ISO 22716' },
                  { en: 'GMP Compliant', ar: 'متوافقة مع معايير GMP' },
                ].map((badge, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-kcc-rose-dark" />
                    <span className="text-xs text-ink-600">{l(badge)}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
