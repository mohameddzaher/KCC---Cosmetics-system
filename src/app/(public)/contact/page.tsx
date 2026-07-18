'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Phone, MapPin, Clock, Send, CheckCircle, Loader2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export default function ContactPage() {
  const { t } = useLanguage();
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    message: '',
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setSuccess(true);
        setForm({ name: '', email: '', phone: '', company: '', message: '' });
      } else {
        setError(data.error || 'Something went wrong. Please try again.');
      }
    } catch {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const contactInfo = [
    { icon: MapPin, label: t('contact.addressLabel'), value: t('contact.addressValue') },
    { icon: Phone, label: t('contact.phoneLabel'), value: '+966 53 848 6109\n+966 53 848 7021' },
    { icon: Mail, label: t('contact.emailLabel'), value: 'info@kcc.sa\nsales@kcc.sa' },
    { icon: Clock, label: t('contact.officeHoursLabel'), value: t('contact.officeHoursValue') },
  ];

  return (
    <div className="min-h-screen bg-cream-100">
      {/* Hero */}
      <section className="relative pt-8 pb-20 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-cream-100 to-cream-50" />
        <div className="absolute top-1/4 -left-32 w-80 h-80 rounded-full bg-kcc-rose-light/40 blur-[120px]" />

        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-4xl sm:text-5xl font-bold text-ink-700 mb-4">{t('contact.title')}</h1>
            <p className="text-lg text-cream-800">{t('contact.subtitle')}</p>
          </motion.div>
        </div>
      </section>

      {/* Content */}
      <section className="py-12 sm:py-16 px-4">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Contact quick info */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4"
          >
            {contactInfo.map((item, i) => {
              const Icon = item.icon;
              return (
                <div key={i} className="flex gap-3 p-4 bg-white border border-cream-300 shadow-soft rounded-xl">
                  <div className="shrink-0 w-9 h-9 rounded-lg bg-kcc-green/15 text-kcc-green flex items-center justify-center">
                    <Icon size={16} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-cream-700 mb-1">{item.label}</p>
                    <p className="text-sm text-cream-800 whitespace-pre-line leading-relaxed">{item.value}</p>
                  </div>
                </div>
              );
            })}
          </motion.div>

          {/* Form + Map */}
          <div className="grid lg:grid-cols-2 gap-6 lg:gap-8">
            {/* Form */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="h-full"
          >
            <div className="bg-white border border-cream-300 shadow-soft rounded-2xl p-6 sm:p-8 h-full">
              {success ? (
                <div className="text-center py-12">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-kcc-green/20 mb-4">
                    <CheckCircle size={32} className="text-kcc-green" />
                  </div>
                  <h3 className="text-xl font-semibold text-ink-700 mb-2">{t('contact.success')}</h3>
                  <p className="text-cream-700 mb-6">{t('contact.successDesc')}</p>
                  <button
                    onClick={() => setSuccess(false)}
                    className="px-6 py-2.5 border border-cream-400 text-cream-800 hover:text-ink-700 rounded-xl transition-colors"
                  >
                    {t('contact.sendAnother')}
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-cream-800 mb-2">
                        {t('contact.name')} <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        value={form.name}
                        onChange={(e) => update('name', e.target.value)}
                        required
                        className="w-full px-4 py-3 bg-white border border-cream-300 rounded-xl text-ink-700 placeholder:text-cream-700 focus:outline-none focus:border-kcc-rose-dark transition-colors"
                        placeholder={t('contact.namePlaceholder')}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-cream-800 mb-2">
                        {t('contact.email')} <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="email"
                        value={form.email}
                        onChange={(e) => update('email', e.target.value)}
                        required
                        className="w-full px-4 py-3 bg-white border border-cream-300 rounded-xl text-ink-700 placeholder:text-cream-700 focus:outline-none focus:border-kcc-rose-dark transition-colors"
                        placeholder={t('contact.emailPlaceholder')}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-cream-800 mb-2">{t('contact.phone')}</label>
                      <input
                        type="tel"
                        value={form.phone}
                        onChange={(e) => update('phone', e.target.value)}
                        className="w-full px-4 py-3 bg-white border border-cream-300 rounded-xl text-ink-700 placeholder:text-cream-700 focus:outline-none focus:border-kcc-rose-dark transition-colors"
                        placeholder={t('contact.phonePlaceholder')}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-cream-800 mb-2">{t('contact.company')}</label>
                      <input
                        type="text"
                        value={form.company}
                        onChange={(e) => update('company', e.target.value)}
                        className="w-full px-4 py-3 bg-white border border-cream-300 rounded-xl text-ink-700 placeholder:text-cream-700 focus:outline-none focus:border-kcc-rose-dark transition-colors"
                        placeholder={t('contact.companyPlaceholder')}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-cream-800 mb-2">
                      {t('contact.message')} <span className="text-red-400">*</span>
                    </label>
                    <textarea
                      value={form.message}
                      onChange={(e) => update('message', e.target.value)}
                      required
                      rows={5}
                      className="w-full px-4 py-3 bg-white border border-cream-300 rounded-xl text-ink-700 placeholder:text-cream-700 focus:outline-none focus:border-kcc-rose-dark transition-colors resize-none"
                      placeholder={t('contact.messagePlaceholder')}
                    />
                  </div>
                  {error && (
                    <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{error}</p>
                  )}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3 bg-kcc-green hover:bg-kcc-green-light text-white font-semibold rounded-xl transition-colors shadow-lg shadow-kcc-green/20 disabled:opacity-50"
                  >
                    {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                    {t('contact.send')}
                  </button>
                </form>
              )}
            </div>
          </motion.div>

          {/* Map & location card */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="space-y-4"
          >
            <div className="bg-white border border-cream-300 shadow-soft rounded-2xl p-5">
              <p className="text-xs uppercase tracking-[0.18em] text-kcc-beige-dark mb-2">{t('contact.locationLabel')}</p>
              <h3 className="text-lg font-semibold text-ink-700 mb-1">{t('contact.locationTitle')}</h3>
              <p className="text-sm text-cream-700 mb-4">{t('contact.locationDesc')}</p>
              <div className="rounded-xl overflow-hidden border border-cream-300 aspect-[4/3]">
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d237818.01564880843!2d39.0579!3d21.4858!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x15c3d01fb1137e59%3A0xe059579737b118db!2sJeddah%20Saudi%20Arabia!5e0!3m2!1sen!2s!4v1709290000000!5m2!1sen!2s"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="KCC Location - Jeddah, Saudi Arabia"
              />
              </div>
            </div>
          </motion.div>
          </div>
        </div>
      </section>
    </div>
  );
}
