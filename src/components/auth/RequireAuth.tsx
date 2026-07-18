'use client';

import Link from 'next/link';
import { Lock, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';

/**
 * Gates client pages behind authentication. Ordering (sample/bulk) is limited
 * to accounts KCC creates, so unauthenticated visitors get a sign-in prompt
 * instead of the page.
 */
export default function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { locale } = useLanguage();
  const ar = locale === 'ar';

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="animate-spin text-kcc-green" size={28} />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center bg-white border border-cream-300 shadow-soft rounded-2xl p-8">
          <div className="w-14 h-14 rounded-2xl bg-kcc-green/10 text-kcc-green flex items-center justify-center mx-auto mb-4">
            <Lock size={26} />
          </div>
          <h2 className="text-xl font-bold text-ink-700 mb-2">
            {ar ? 'تسجيل الدخول مطلوب' : 'Sign in required'}
          </h2>
          <p className="text-sm text-cream-700 mb-6">
            {ar
              ? 'طلب العينات والأوردرات متاح فقط للعملاء المعتمدين لدى KCC. سجّل دخولك بالحساب المقدّم لك، أو تواصل معنا للحصول على حساب.'
              : 'Sample and bulk requests are available only to approved KCC clients. Please sign in with the account provided to you, or contact us to get access.'}
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link href="/login" className="px-6 py-2.5 bg-kcc-green hover:bg-kcc-green-light text-white text-sm font-semibold rounded-xl transition-colors">
              {ar ? 'تسجيل الدخول' : 'Sign in'}
            </Link>
            <Link href="/contact" className="px-6 py-2.5 border border-cream-300 text-ink-700 text-sm font-semibold rounded-xl hover:bg-cream-100 transition-colors">
              {ar ? 'تواصل معنا' : 'Contact us'}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
