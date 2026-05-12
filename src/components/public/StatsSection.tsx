'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { Award, Globe2, Package, Users, Sparkles } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface StatItem {
  value: number;
  suffix: string;
  label: { en: string; ar: string };
  Icon: React.ComponentType<{ size?: number; className?: string }>;
}

const stats: StatItem[] = [
  { value: 500, suffix: '+', label: { en: 'Products Manufactured', ar: 'منتج تم تصنيعه' }, Icon: Package },
  { value: 150, suffix: '+', label: { en: 'Brands Served', ar: 'علامة تجارية' }, Icon: Users },
  { value: 15,  suffix: '+', label: { en: 'Years of Excellence', ar: 'سنة خبرة' }, Icon: Award },
  { value: 20,  suffix: '+', label: { en: 'Countries Exported', ar: 'دولة تم التصدير إليها' }, Icon: Globe2 },
];

function AnimatedCounter({ target, suffix, inView }: { target: number; suffix: string; inView: boolean }) {
  const [count, setCount] = useState(0);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (!inView || hasAnimated.current) return;
    hasAnimated.current = true;
    const duration = 1800;
    const steps = 50;
    const stepValue = target / steps;
    const stepTime = duration / steps;
    let currentStep = 0;
    const interval = setInterval(() => {
      currentStep++;
      if (currentStep >= steps) {
        setCount(target);
        clearInterval(interval);
      } else {
        setCount(Math.round(stepValue * currentStep));
      }
    }, stepTime);
    return () => clearInterval(interval);
  }, [inView, target]);

  return <span>{count}{suffix}</span>;
}

export default function StatsSection() {
  const { locale } = useLanguage();
  const sectionRef = useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: '-100px' });

  return (
    <section
      ref={sectionRef}
      className="relative py-16 lg:py-24 overflow-hidden bg-espresso-950"
    >
      {/* Warm dark background */}
      <div className="absolute inset-0 bg-gradient-to-br from-espresso-950 via-espresso-800 to-espresso-950" />
      <div className="absolute inset-0 bg-gradient-to-tr from-kcc-rose-dark/15 via-transparent to-kcc-beige/12" />

      {/* Decorative orbs */}
      <div className="absolute top-0 -start-32 w-[420px] h-[420px] rounded-full bg-kcc-rose/15 blur-[140px]" />
      <div className="absolute bottom-0 -end-32 w-[420px] h-[420px] rounded-full bg-kcc-beige/15 blur-[140px]" />
      <div className="absolute inset-0 dot-pattern-dark opacity-40 pointer-events-none" />

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12 lg:mb-14"
        >
          <span className="inline-flex items-center gap-2 px-4 py-1.5 mb-4 text-[10px] uppercase tracking-[0.32em] chip-on-dark-rose rounded-full font-medium">
            <Sparkles size={11} />
            {locale === 'ar' ? 'بالأرقام' : 'By the numbers'}
          </span>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-3">
            <span className="gradient-text-light">
              {locale === 'ar' ? 'أثرنا في الصناعة' : 'A Legacy of Cosmetic Craft'}
            </span>
          </h2>
          <p className="text-cream-200/80 text-sm sm:text-base max-w-xl mx-auto">
            {locale === 'ar'
              ? 'أرقام تروي قصة شغف بالجودة، الابتكار، وثقة عملائنا حول العالم.'
              : 'Numbers that capture our obsession with quality, innovation, and the trust of brands across the world.'}
          </p>
        </motion.div>

        {/* Stats Grid — single row of refined cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5">
          {stats.map((stat, index) => {
            const Icon = stat.Icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="group relative overflow-hidden rounded-2xl border border-cream-300/10 bg-espresso-800/40 backdrop-blur-sm p-5 lg:p-6 hover:border-kcc-rose/40 hover:bg-espresso-700/40 transition-all duration-300"
              >
                {/* Hover glow */}
                <div className="absolute inset-0 bg-gradient-to-br from-kcc-rose/0 via-transparent to-kcc-beige/0 group-hover:from-kcc-rose/15 group-hover:to-kcc-beige/10 transition-all duration-500 pointer-events-none" />

                <div className="relative z-10">
                  {/* Icon */}
                  <div className="inline-flex w-10 h-10 rounded-xl bg-kcc-rose/15 text-kcc-rose-light items-center justify-center mb-4">
                    <Icon size={18} />
                  </div>

                  {/* Number */}
                  <div className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight mb-2 gradient-text-light">
                    <AnimatedCounter target={stat.value} suffix={stat.suffix} inView={isInView} />
                  </div>

                  {/* Label */}
                  <p className="text-xs sm:text-sm text-cream-200/85 font-medium leading-snug">
                    {locale === 'ar' ? stat.label.ar : stat.label.en}
                  </p>

                  {/* Hairline divider */}
                  <div className="absolute top-0 start-0 h-px w-12 bg-gradient-to-r from-kcc-rose-light to-transparent" />
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
