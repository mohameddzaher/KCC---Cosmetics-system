'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Send, Loader2, CheckCircle, X, MessageSquarePlus } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export default function ReviewForm() {
  const { locale } = useLanguage();
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [hover, setHover] = useState(0);
  const [form, setForm] = useState({ name: '', company: '', content: '' });
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ar = locale === 'ar';

  const submit = async () => {
    setError(null);
    if (!form.name.trim() || !form.content.trim()) {
      setError(ar ? 'الاسم والتقييم مطلوبين' : 'Name and review are required');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, rating }),
      });
      const data = await res.json();
      if (res.ok) {
        setDone(true);
        setForm({ name: '', company: '', content: '' });
        setRating(5);
      } else {
        setError(data.error || (ar ? 'حدث خطأ' : 'Something went wrong'));
      }
    } catch {
      setError(ar ? 'خطأ في الشبكة' : 'Network error');
    } finally {
      setLoading(false);
    }
  };

  const close = () => { setOpen(false); setTimeout(() => setDone(false), 300); };

  return (
    <>
      <div className="text-center mt-8">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 px-6 py-3 bg-kcc-green hover:bg-kcc-green-light text-white text-sm font-semibold rounded-xl transition-colors shadow-soft"
        >
          <MessageSquarePlus size={17} />
          {ar ? 'شاركنا تجربتك' : 'Share your experience'}
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={close}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-espresso-950/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl w-full max-w-md shadow-soft-lg p-6"
              dir={ar ? 'rtl' : 'ltr'}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-ink-700">{ar ? 'اكتب تقييمك' : 'Write a review'}</h3>
                <button type="button" onClick={close} aria-label="Close" className="text-cream-700 hover:text-ink-700"><X size={20} /></button>
              </div>

              {done ? (
                <div className="text-center py-8">
                  <CheckCircle size={44} className="text-kcc-green mx-auto mb-3" />
                  <p className="text-ink-700 font-medium">{ar ? 'شكراً لك!' : 'Thank you!'}</p>
                  <p className="text-sm text-cream-700 mt-1">{ar ? 'تقييمك هيظهر بعد المراجعة.' : 'Your review will appear after approval.'}</p>
                  <button type="button" onClick={close} className="mt-5 px-5 py-2 text-sm text-ink-700 border border-cream-300 rounded-xl hover:bg-cream-100">{ar ? 'إغلاق' : 'Close'}</button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Stars */}
                  <div className="flex items-center justify-center gap-1.5">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button key={n} type="button" onMouseEnter={() => setHover(n)} onMouseLeave={() => setHover(0)} onClick={() => setRating(n)} aria-label={`${n} stars`}>
                        <Star size={30} className={(hover || rating) >= n ? 'text-kcc-gold fill-kcc-gold' : 'text-cream-400'} />
                      </button>
                    ))}
                  </div>
                  <input
                    value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder={ar ? 'اسمك *' : 'Your name *'}
                    className="w-full px-4 py-2.5 bg-cream-50 border border-cream-300 rounded-xl text-ink-700 placeholder:text-cream-700 focus:outline-none focus:border-kcc-green"
                  />
                  <input
                    value={form.company} onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
                    placeholder={ar ? 'الشركة (اختياري)' : 'Company (optional)'}
                    className="w-full px-4 py-2.5 bg-cream-50 border border-cream-300 rounded-xl text-ink-700 placeholder:text-cream-700 focus:outline-none focus:border-kcc-green"
                  />
                  <textarea
                    value={form.content} onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                    rows={4} placeholder={ar ? 'اكتب تجربتك معنا... *' : 'Tell us about your experience... *'}
                    className="w-full px-4 py-2.5 bg-cream-50 border border-cream-300 rounded-xl text-ink-700 placeholder:text-cream-700 focus:outline-none focus:border-kcc-green resize-none"
                  />
                  {error && <p className="text-sm text-red-500">{error}</p>}
                  <button
                    type="button" onClick={submit} disabled={loading}
                    className="w-full flex items-center justify-center gap-2 px-5 py-2.5 bg-kcc-green hover:bg-kcc-green-light text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50"
                  >
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                    {ar ? 'إرسال التقييم' : 'Submit review'}
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
