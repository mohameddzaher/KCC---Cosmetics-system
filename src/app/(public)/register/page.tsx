'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { User, Mail, Lock, Building2, Phone, MapPin, AlertCircle, Loader2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';

export default function RegisterPage() {
  const { t } = useLanguage();
  const { register } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    company: '',
    phone: '',
    country: '',
    city: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const update = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!form.name || !form.email || !form.password) {
      setError(t('auth.requiredFields'));
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError(t('auth.passwordMismatch'));
      return;
    }
    if (form.password.length < 6) {
      setError(t('auth.passwordMinLength'));
      return;
    }

    setLoading(true);

    const result = await register({
      name: form.name,
      email: form.email,
      password: form.password,
      company: form.company || undefined,
      phone: form.phone || undefined,
      country: form.country || undefined,
      city: form.city || undefined,
    });

    if (result.success) {
      router.push('/account');
    } else {
      setError(result.error || t('auth.registrationFailed'));
    }

    setLoading(false);
  };

  const fields = [
    { key: 'name', label: t('auth.name'), icon: User, type: 'text', required: true, placeholder: t('auth.namePlaceholder') },
    { key: 'email', label: t('auth.email'), icon: Mail, type: 'email', required: true, placeholder: t('auth.emailPlaceholder') },
    { key: 'password', label: t('auth.password'), icon: Lock, type: 'password', required: true, placeholder: t('auth.passwordMin') },
    { key: 'confirmPassword', label: t('auth.confirmPassword'), icon: Lock, type: 'password', required: true, placeholder: t('auth.confirmPasswordPlaceholder') },
    { key: 'company', label: t('auth.company'), icon: Building2, type: 'text', required: false, placeholder: t('auth.companyPlaceholder') },
    { key: 'phone', label: t('auth.phone'), icon: Phone, type: 'tel', required: false, placeholder: t('auth.phonePlaceholder') },
    { key: 'country', label: t('auth.country'), icon: MapPin, type: 'text', required: false, placeholder: t('auth.countryPlaceholder') },
    { key: 'city', label: t('auth.city'), icon: MapPin, type: 'text', required: false, placeholder: t('auth.cityPlaceholder') },
  ];

  return (
    <div className="min-h-screen bg-cream-100 flex items-center justify-center pt-8 pb-20 px-4">
      {/* Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -right-32 w-80 h-80 rounded-full bg-kcc-rose-light/40 blur-[120px]" />
        <div className="absolute bottom-1/4 -left-32 w-80 h-80 rounded-full bg-kcc-beige-light/45 blur-[100px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative w-full max-w-lg"
      >
        <div className="bg-white border border-cream-300 shadow-soft rounded-2xl p-8 backdrop-blur-sm">
          {/* Logo */}
          <div className="text-center mb-8">
            <Link href="/" className="inline-block">
              <span className="text-4xl font-black">
                <span className="text-kcc-green">K</span>
                <span className="text-ink-700">CC</span>
              </span>
            </Link>
            <h1 className="text-xl font-semibold text-ink-700 mt-4">{t('auth.registerTitle')}</h1>
            <p className="text-sm text-cream-700 mt-1">{t('auth.registerSubtitle')}</p>
          </div>

          {/* Error */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 p-3 mb-6 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm"
            >
              <AlertCircle size={16} />
              {error}
            </motion.div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              {fields.map((field) => {
                const Icon = field.icon;
                return (
                  <div key={field.key} className={field.key === 'email' ? 'sm:col-span-2' : ''}>
                    <label className="block text-sm font-medium text-cream-800 mb-2">
                      {field.label} {field.required && <span className="text-red-400">*</span>}
                    </label>
                    <div className="relative">
                      <Icon size={16} className="absolute start-4 top-1/2 -translate-y-1/2 text-cream-600" />
                      <input
                        type={field.type}
                        value={form[field.key as keyof typeof form]}
                        onChange={(e) => update(field.key, e.target.value)}
                        required={field.required}
                        placeholder={field.placeholder}
                        className="w-full ps-11 pe-4 py-3 bg-white border border-cream-300 rounded-xl text-ink-700 placeholder:text-cream-700 focus:outline-none focus:border-kcc-rose-dark transition-colors text-sm"
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 mt-2 bg-kcc-green hover:bg-kcc-green-light text-white font-semibold rounded-xl transition-colors shadow-lg shadow-kcc-green/20 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 size={18} className="animate-spin" />}
              {t('auth.registerBtn')}
            </button>
          </form>

          {/* Login link */}
          <div className="mt-6 text-center text-sm text-cream-700">
            {t('auth.hasAccount')}{' '}
            <Link href="/login" className="text-kcc-green hover:text-kcc-green-light transition-colors font-medium">
              {t('auth.signIn')}
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
