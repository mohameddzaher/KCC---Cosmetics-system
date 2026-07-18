'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, ChevronLeft, ChevronRight, Quote } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface Testimonial {
  quote: { en: string; ar: string };
  name: { en: string; ar: string };
  company: { en: string; ar: string };
  rating: number;
}

const testimonials: Testimonial[] = [
  {
    quote: {
      en: 'KCC transformed our brand vision into reality. Their formulation expertise and attention to detail exceeded our expectations. The quality of products they deliver is truly world-class.',
      ar: 'حولت KCC رؤية علامتنا التجارية إلى واقع. خبرتهم في التركيب واهتمامهم بالتفاصيل فاقت توقعاتنا. جودة المنتجات التي يقدمونها عالمية المستوى حقاً.',
    },
    name: { en: 'Sarah Al-Rashid', ar: 'سارة الراشد' },
    company: { en: 'Lumière Beauty', ar: 'لوميير بيوتي' },
    rating: 5,
  },
  {
    quote: {
      en: 'Working with KCC has been a game-changer for our cosmetics line. Their regulatory expertise made our expansion into GCC markets seamless. Highly professional team from start to finish.',
      ar: 'العمل مع KCC كان نقلة نوعية لخط مستحضرات التجميل لدينا. خبرتهم التنظيمية جعلت توسعنا في أسواق الخليج سلساً. فريق احترافي من البداية إلى النهاية.',
    },
    name: { en: 'Ahmed Al-Mansouri', ar: 'أحمد المنصوري' },
    company: { en: 'Desert Glow Cosmetics', ar: 'ديزرت جلو كوزمتكس' },
    rating: 5,
  },
  {
    quote: {
      en: 'From custom formulation to final packaging, KCC delivered excellence at every step. Their state-of-the-art facilities and experienced team make them the ideal manufacturing partner.',
      ar: 'من التركيب المخصص إلى التغليف النهائي، قدمت KCC التميز في كل خطوة. مرافقهم الحديثة وفريقهم ذو الخبرة يجعلانهم الشريك المثالي في التصنيع.',
    },
    name: { en: 'Fatima Al-Zahrani', ar: 'فاطمة الزهراني' },
    company: { en: 'Noor Skincare', ar: 'نور للعناية بالبشرة' },
    rating: 5,
  },
];

export default function TestimonialsSection() {
  const { t, locale } = useLanguage();
  const [current, setCurrent] = useState(0);
  const [list, setList] = useState<Testimonial[]>(testimonials);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/content/testimonials', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (cancelled || !Array.isArray(data) || data.length === 0) return;
        setList(
          data.map((d: any) => ({
            quote: d.content || d.quote || { en: '', ar: '' },
            name: d.name || { en: '', ar: '' },
            company: d.company || { en: '', ar: '' },
            rating: d.rating || 5,
          }))
        );
        setCurrent(0);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const nextSlide = useCallback(() => {
    setCurrent((prev) => (prev + 1) % list.length);
  }, [list.length]);

  const prevSlide = useCallback(() => {
    setCurrent((prev) => (prev - 1 + list.length) % list.length);
  }, [list.length]);

  // Auto-rotate every 5 seconds
  useEffect(() => {
    const timer = setInterval(nextSlide, 5000);
    return () => clearInterval(timer);
  }, [nextSlide]);

  const testimonial = list[Math.min(current, list.length - 1)] || list[0];

  return (
    <section className="relative py-16 lg:py-24 bg-cream-50 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 dot-pattern opacity-40" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-kcc-rose-light/40 rounded-full blur-[200px]" />
      <div className="absolute top-0 end-0 w-[300px] h-[300px] bg-kcc-beige-light/30 rounded-full blur-[150px]" />

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <span className="inline-block px-4 py-1.5 mb-4 text-[11px] uppercase tracking-[0.25em] chip-rose rounded-full font-medium">
            {locale === 'ar' ? 'بصمات نلتزم بها' : 'Voices of Trust'}
          </span>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-3">
            <span className="gradient-text-rose">{t('sections.testimonials')}</span>
          </h2>
        </motion.div>

        {/* Testimonial Card */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="relative"
        >
          <div className="relative glass-card overflow-hidden border-t-[3px] border-t-kcc-rose-dark">
            {/* Decorative quote */}
            <Quote
              size={80}
              className="absolute -top-4 -start-3 text-kcc-rose-light/40 rtl-flip pointer-events-none"
              strokeWidth={1.2}
            />

            <AnimatePresence mode="wait">
              <motion.div
                key={current}
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.4 }}
                className="relative p-8 sm:p-10 lg:p-12"
              >
                {/* Stars */}
                <div className="flex items-center gap-1 mb-6">
                  {Array.from({ length: testimonial.rating }).map((_, i) => (
                    <Star key={i} size={18} className="text-kcc-gold fill-kcc-gold" />
                  ))}
                </div>

                {/* Quote */}
                <blockquote className="text-base sm:text-lg lg:text-xl text-ink-700 leading-relaxed mb-8 font-light font-serif italic">
                  &ldquo;{locale === 'ar' ? testimonial.quote.ar : testimonial.quote.en}&rdquo;
                </blockquote>

                {/* Author */}
                <div className="flex items-center gap-4">
                  {/* Avatar placeholder */}
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-kcc-rose to-kcc-rose-dark flex items-center justify-center text-white font-bold text-lg shadow-rose">
                    {(locale === 'ar' ? testimonial.name.ar : testimonial.name.en).charAt(0)}
                  </div>
                  <div>
                    <p className="text-ink-700 font-semibold">
                      {locale === 'ar' ? testimonial.name.ar : testimonial.name.en}
                    </p>
                    <p className="text-sm text-cream-700">
                      {locale === 'ar' ? testimonial.company.ar : testimonial.company.en}
                    </p>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Navigation Arrows */}
          <div className="flex items-center justify-between mt-6">
            <button
              type="button"
              onClick={prevSlide}
              className="p-2.5 rounded-xl bg-white border border-cream-300 text-ink-600 hover:text-kcc-rose-dark hover:border-kcc-rose-dark/40 hover:shadow-soft transition-all duration-200"
              aria-label="Previous testimonial"
            >
              <ChevronLeft size={20} className="rtl-flip" />
            </button>

            {/* Dots */}
            <div className="flex items-center gap-2">
              {list.map((_, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => setCurrent(index)}
                  className={`transition-all duration-300 rounded-full ${
                    index === current
                      ? 'w-8 h-2.5 bg-gradient-to-r from-kcc-rose to-kcc-beige'
                      : 'w-2.5 h-2.5 bg-cream-500 hover:bg-cream-600'
                  }`}
                  aria-label={`Go to testimonial ${index + 1}`}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={nextSlide}
              className="p-2.5 rounded-xl bg-white border border-cream-300 text-ink-600 hover:text-kcc-rose-dark hover:border-kcc-rose-dark/40 hover:shadow-soft transition-all duration-200"
              aria-label="Next testimonial"
            >
              <ChevronRight size={20} className="rtl-flip" />
            </button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
