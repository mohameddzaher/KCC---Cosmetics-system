'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, useInView, useReducedMotion } from 'framer-motion';
import { Award, Globe2, Package, Users } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCmsSection } from '@/lib/useCmsSection';

const ICONS = [Package, Users, Award, Globe2];

/**
 * Shipped defaults. The CMS Manager's "stats" section overrides them —
 * `{ items: [{ label, value }] }`, where the value may carry its own suffix
 * ("5000+"), which is how the CMS stores it.
 */
const DEFAULTS = {
  en: {
    items: [
      { label: 'Products manufactured', value: '500+' },
      { label: 'Brands served', value: '150+' },
      { label: 'Years of excellence', value: '15+' },
      { label: 'Countries exported to', value: '20+' },
    ],
  },
  ar: {
    items: [
      { label: 'منتج تم تصنيعه', value: '500+' },
      { label: 'علامة تجارية', value: '150+' },
      { label: 'سنة خبرة', value: '15+' },
      { label: 'دولة تم التصدير إليها', value: '20+' },
    ],
  },
};

/** "5000+" → 5000 and "+", so the counter can still count up to it. */
function splitValue(raw: string): { value: number; suffix: string } {
  const match = String(raw).match(/^\s*([\d.,]+)\s*(.*)$/);
  if (!match) return { value: 0, suffix: String(raw) };
  return { value: Number(match[1].replace(/,/g, '')) || 0, suffix: match[2] || '' };
}

function AnimatedCounter({ target, suffix, inView }: { target: number; suffix: string; inView: boolean }) {
  const [count, setCount] = useState(0);
  const hasAnimated = useRef<number | null>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    // Keyed on the target as well as visibility: the figures now come from the
    // CMS, which lands after first paint. Without this, a number that had
    // already counted up to its built-in default would never move to the
    // edited one.
    if (!inView || hasAnimated.current === target) return;
    hasAnimated.current = target;
    if (reduce) {
      setCount(target);
      return;
    }
    const duration = 1400;
    const steps = 40;
    const stepTime = duration / steps;
    let step = 0;
    const interval = setInterval(() => {
      step += 1;
      if (step >= steps) {
        setCount(target);
        clearInterval(interval);
      } else {
        setCount(Math.round((target / steps) * step));
      }
    }, stepTime);
    return () => clearInterval(interval);
  }, [inView, target, reduce]);

  return (
    <span>
      {count}
      {suffix}
    </span>
  );
}

/**
 * "By the numbers".
 *
 * Reworked from four heavy cards to a single quiet band divided by hairlines.
 * The figures are set in the serif at a calmer size, the labels sit under them
 * in small caps, and colour appears exactly once — a champagne rule above each
 * figure. Nothing here competes with the product photography around it.
 */
export default function StatsSection() {
  const { locale } = useLanguage();
  // Editable under Admin → CMS Manager → "stats".
  const content = useCmsSection('stats', DEFAULTS);
  const sectionRef = useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: '-80px' });
  const reduce = useReducedMotion();

  return (
    <section ref={sectionRef} className="relative overflow-hidden bg-cream-100 py-14 lg:py-20">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-cream-100 to-cream-50" />

      <div className="relative z-10 mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5 }}
          className="mb-10 text-center lg:mb-12"
        >
          <p className="mb-3 text-[10px] font-medium uppercase tracking-[0.32em] text-kcc-beige-dark">
            {locale === 'ar' ? 'بالأرقام' : 'By the numbers'}
          </p>
          <h2 className="font-serif text-2xl leading-tight text-ink-800 sm:text-3xl lg:text-[2.25rem]">
            {locale === 'ar' ? 'أثرنا في الصناعة' : 'A legacy of cosmetic craft'}
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-cream-700">
            {locale === 'ar'
              ? 'أرقام تروي قصة شغف بالجودة والابتكار وثقة عملائنا حول العالم.'
              : 'Numbers that capture our obsession with quality, innovation and the trust of brands across the world.'}
          </p>
        </motion.div>

        {/* One band, split by hairlines — no card chrome, no per-card colour. */}
        <div className="grid grid-cols-2 border-y border-cream-300 lg:grid-cols-4">
          {content.items.map((stat, i) => {
            const Icon = ICONS[i % ICONS.length];
            const { value, suffix } = splitValue(stat.value);
            return (
              <motion.div
                key={`${stat.label}-${i}`}
                initial={reduce ? false : { opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.45, delay: i * 0.07 }}
                className={`px-4 py-8 text-center sm:px-6 lg:py-10 ${
                  // two-up on mobile, four-up from lg — a hairline between every
                  // pair, never after the last item in a row
                  i < 2 ? 'border-b border-cream-300 lg:border-b-0' : ''
                } ${i % 2 === 0 ? 'border-e border-cream-300' : ''} ${
                  i === 1 ? 'lg:border-e lg:border-cream-300' : ''
                } ${i === 3 ? 'lg:border-e-0' : ''}`}
              >
                <span className="mx-auto mb-4 block h-px w-8 bg-kcc-beige/70" />

                <Icon size={17} className="mx-auto mb-3 text-kcc-beige-dark" />

                <p className="font-serif text-3xl leading-none text-ink-800 sm:text-4xl">
                  <AnimatedCounter target={value} suffix={suffix} inView={isInView} />
                </p>

                <p className="mt-3 text-[11px] uppercase tracking-[0.16em] text-cream-700">
                  {stat.label}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
