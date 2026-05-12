'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Mail, Lock, AlertCircle, Loader2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginPage() {
  const { t } = useLanguage();
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(email, password);

    if (result.success) {
      // Fetch user to check role for redirect
      try {
        const res = await fetch('/api/auth/me');
        const data = await res.json();
        if (data.user && ['SUPER_ADMIN', 'ADMIN', 'STAFF'].includes(data.user.role)) {
          router.push('/admin');
        } else {
          router.push('/account');
        }
      } catch {
        router.push('/account');
      }
    } else {
      setError(result.error || 'Login failed');
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-cream-100 flex items-center justify-center pt-8 pb-20 px-4">
      {/* Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 -left-32 w-80 h-80 rounded-full bg-kcc-rose-light/40 blur-[120px]" />
        <div className="absolute bottom-1/3 -right-32 w-80 h-80 rounded-full bg-kcc-beige-light/45 blur-[100px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative w-full max-w-md"
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
            <h1 className="text-xl font-semibold text-ink-700 mt-4">{t('auth.loginTitle')}</h1>
            <p className="text-sm text-cream-700 mt-1">{t('auth.loginSubtitle')}</p>
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
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-cream-800 mb-2">{t('auth.email')}</label>
              <div className="relative">
                <Mail size={18} className="absolute start-4 top-1/2 -translate-y-1/2 text-cream-600" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full ps-12 pe-4 py-3 bg-white border border-cream-300 rounded-xl text-ink-700 placeholder:text-cream-700 focus:outline-none focus:border-kcc-rose-dark transition-colors"
                  placeholder={t('auth.emailPlaceholder')}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-cream-800 mb-2">{t('auth.password')}</label>
              <div className="relative">
                <Lock size={18} className="absolute start-4 top-1/2 -translate-y-1/2 text-cream-600" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full ps-12 pe-4 py-3 bg-white border border-cream-300 rounded-xl text-ink-700 placeholder:text-cream-700 focus:outline-none focus:border-kcc-rose-dark transition-colors"
                  placeholder={t('auth.passwordPlaceholder')}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-kcc-green hover:bg-kcc-green-light text-white font-semibold rounded-xl transition-colors shadow-lg shadow-kcc-green/20 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 size={18} className="animate-spin" />}
              {t('auth.loginBtn')}
            </button>
          </form>

          {/* Register link */}
          <div className="mt-6 text-center text-sm text-cream-700">
            {t('auth.noAccount')}{' '}
            <Link href="/register" className="text-kcc-green hover:text-kcc-green-light transition-colors font-medium">
              {t('auth.signUp')}
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
