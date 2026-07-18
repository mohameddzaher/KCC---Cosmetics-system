'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Lock, Mail } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export default function RegisterPage() {
  const { locale } = useLanguage();
  const ar = locale === 'ar';

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-16">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full text-center bg-white border border-cream-300 shadow-soft rounded-2xl p-8"
      >
        <div className="w-14 h-14 rounded-2xl bg-kcc-green/10 text-kcc-green flex items-center justify-center mx-auto mb-4">
          <Lock size={26} />
        </div>
        <h1 className="text-2xl font-bold text-ink-700 mb-2">
          {ar ? 'الحسابات بدعوة فقط' : 'Accounts are by invitation'}
        </h1>
        <p className="text-sm text-cream-700 mb-6 leading-relaxed">
          {ar
            ? 'KCC تصنّع بالجملة للعلامات التجارية. الحسابات بتتفعّل من فريقنا فقط. تواصل معنا وهنجهّزلك حساب لطلب العينات والأوردرات.'
            : "KCC manufactures for brands at scale. Accounts are provisioned by our team only. Get in touch and we'll set up an account for you to request samples and orders."}
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link href="/contact" className="inline-flex items-center gap-2 px-6 py-2.5 bg-kcc-green hover:bg-kcc-green-light text-white text-sm font-semibold rounded-xl transition-colors">
            <Mail size={16} /> {ar ? 'تواصل معنا' : 'Contact us'}
          </Link>
          <Link href="/login" className="px-6 py-2.5 border border-cream-300 text-ink-700 text-sm font-semibold rounded-xl hover:bg-cream-100 transition-colors">
            {ar ? 'تسجيل الدخول' : 'Sign in'}
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
