'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  motion, useInView, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform, animate,
} from 'framer-motion';
import {
  Factory, Globe2, Users, Truck, Waves, Sun, Sparkles, Droplet, Heart, ShieldCheck, Star,
  FileText, Flag, Recycle, Check, type LucideIcon,
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import type { Pair } from '@/lib/storyContent';

/** The reader's language, out of a { en, ar } pair. */
export function usePick() {
  const { locale } = useLanguage();
  return (x: Pair) => (locale === 'ar' ? x.ar : x.en);
}

export const ICONS: Record<string, LucideIcon> = {
  factory: Factory, globe: Globe2, users: Users, truck: Truck, waves: Waves, sun: Sun,
  sparkles: Sparkles, drop: Droplet, heart: Heart, shield: ShieldCheck, star: Star,
  file: FileText, flag: Flag, recycle: Recycle, check: Check,
};

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * A heading that rises in word by word behind a mask. Words, never letters:
 * Arabic letters must stay joined, and a word is the unit a reader sees.
 */
export function WordsReveal({
  text, as: Tag = 'h2', className = '', delay = 0, accent,
}: { text: string; as?: 'h1' | 'h2' | 'h3' | 'p'; className?: string; delay?: number; accent?: string }) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: '-10% 0px' });
  const words = text.split(' ');
  const all = accent ? [...words, accent] : words;
  const MotionTag = motion[Tag];
  return (
    <MotionTag ref={ref as never} className={className} aria-label={accent ? `${text} ${accent}` : text}>
      {all.map((w, i) => (
        <span key={i} aria-hidden className="inline-block overflow-hidden pb-[0.1em] align-bottom leading-[1.1] rtl:!leading-[1.45]">
          <motion.span
            className={`inline-block ${accent && i === all.length - 1 ? 'text-kcc-green-light' : ''}`}
            initial={reduce ? false : { y: '110%' }}
            animate={inView || reduce ? { y: 0 } : { y: '110%' }}
            transition={{ duration: 0.8, ease: EASE, delay: delay + i * 0.06 }}
          >
            {w}
          </motion.span>
          {i < all.length - 1 && ' '}
        </span>
      ))}
    </MotionTag>
  );
}

/** A block that is uncovered by a sliding mask rather than simply faded in. */
export function Reveal({
  children, className = '', delay = 0, from = 'bottom',
}: { children: ReactNode; className?: string; delay?: number; from?: 'bottom' | 'start' | 'end' }) {
  const reduce = useReducedMotion();
  const { isRTL: rtl } = useLanguage();
  const hidden =
    from === 'bottom' ? 'inset(100% 0% 0% 0% round 1.5rem)'
      : (from === 'start') !== rtl ? 'inset(0% 100% 0% 0% round 1.5rem)' : 'inset(0% 0% 0% 100% round 1.5rem)';
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { clipPath: hidden, opacity: 0.4, y: from === 'bottom' ? 24 : 0 }}
      whileInView={{ clipPath: 'inset(0% 0% 0% 0% round 1.5rem)', opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-8% 0px' }}
      transition={{ duration: 0.9, ease: EASE, delay }}
    >
      {children}
    </motion.div>
  );
}

/** Rises and fades in; for small items in a staggered row. */
export function Rise({ children, className = '', delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y: 22 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-6% 0px' }}
      transition={{ duration: 0.65, ease: EASE, delay }}
    >
      {children}
    </motion.div>
  );
}

/** Counts up to a figure the first time it comes into view. */
export function Counter({ to, suffix = '', className = '' }: { to: number; suffix?: string; className?: string }) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (!inView || reduce) return;
    const c = animate(0, to, { duration: 1.6, ease: EASE, onUpdate: (v) => setShown(Math.round(v)) });
    return () => c.stop();
  }, [inView, reduce, to]);
  const value = reduce || (inView && shown === to) ? to : shown;
  return (
    <span ref={ref} className={className} dir="ltr">
      {value.toLocaleString('en-US')}
      {suffix}
    </span>
  );
}

export function Eyebrow({ children, dark = false }: { children: ReactNode; dark?: boolean }) {
  return (
    <p className={`mb-3 inline-flex items-center gap-2 text-[0.6875rem] font-semibold uppercase tracking-[0.28em] ${dark ? 'text-kcc-green-light' : 'text-kcc-green'}`}>
      <span className={`h-px w-6 ${dark ? 'bg-kcc-green-light' : 'bg-kcc-green'}`} aria-hidden />
      {children}
    </p>
  );
}

/** A slow, endless band of items; pauses under the pointer and for reduced motion. */
export function Marquee({ children, className = '', speed = 40 }: { children: ReactNode; className?: string; speed?: number }) {
  return (
    <div className={`story-marquee group relative overflow-hidden ${className}`}>
      <div className="story-marquee-track flex w-max gap-[var(--gap,3rem)]" style={{ animationDuration: `${speed}s` }}>
        <div className="flex shrink-0 items-center gap-[var(--gap,3rem)]">{children}</div>
        <div className="flex shrink-0 items-center gap-[var(--gap,3rem)]" aria-hidden>{children}</div>
      </div>
    </div>
  );
}

/** A card that leans toward the pointer. Mouse only; nothing on touch or reduced motion. */
export function Tilt({ children, className = '', max = 7 }: { children: ReactNode; className?: string; max?: number }) {
  const reduce = useReducedMotion();
  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const sx = useSpring(rx, { stiffness: 180, damping: 18 });
  const sy = useSpring(ry, { stiffness: 180, damping: 18 });
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      style={{ rotateX: sx, rotateY: sy, transformPerspective: 900 }}
      onPointerMove={(e) => {
        if (e.pointerType !== 'mouse') return;
        const r = e.currentTarget.getBoundingClientRect();
        ry.set(((e.clientX - r.left) / r.width - 0.5) * 2 * max);
        rx.set(-((e.clientY - r.top) / r.height - 0.5) * 2 * max);
      }}
      onPointerLeave={() => { rx.set(0); ry.set(0); }}
    >
      {children}
    </motion.div>
  );
}

/** Pulls toward the pointer a little. For primary buttons, mouse only. */
export function Magnetic({ children, className = '' }: { children: ReactNode; className?: string }) {
  const reduce = useReducedMotion();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 220, damping: 15 });
  const sy = useSpring(y, { stiffness: 220, damping: 15 });
  if (reduce) return <span className={className}>{children}</span>;
  return (
    <motion.span
      className={`inline-block ${className}`}
      style={{ x: sx, y: sy }}
      onPointerMove={(e) => {
        if (e.pointerType !== 'mouse') return;
        const r = e.currentTarget.getBoundingClientRect();
        x.set((e.clientX - r.left - r.width / 2) * 0.25);
        y.set((e.clientY - r.top - r.height / 2) * 0.35);
      }}
      onPointerLeave={() => { x.set(0); y.set(0); }}
    >
      {children}
    </motion.span>
  );
}

/** Moves a layer at its own speed as the page scrolls past it. */
export function useParallax(range = 60) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [-range, range]);
  return { ref, y };
}

export { useTransform };
