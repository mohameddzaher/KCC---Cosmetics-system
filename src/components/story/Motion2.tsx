'use client';

import { useEffect, useRef, useState } from 'react';
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';
import {
  motion, useAnimationFrame, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform, useVelocity,
} from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { LINES, MAKE, STORY_IMG, type Pair } from '@/lib/storyContent';
import { Eyebrow, WordsReveal, usePick } from './primitives';

/* eslint-disable @next/next/no-img-element -- local, sized images */

/**
 * Smooth scrolling for the story pages: the wheel eases into place instead of
 * jumping a notch at a time. Touch keeps the device's own scrolling, anchor
 * links still work, and reduced motion turns it off.
 */
export function SmoothScroll() {
  const reduce = useReducedMotion();
  useEffect(() => {
    if (reduce) return;
    const lenis = new Lenis({ lerp: 0.09, smoothWheel: true, anchors: { offset: -72 } });
    let frame = 0;
    const raf = (t: number) => {
      lenis.raf(t);
      frame = requestAnimationFrame(raf);
    };
    frame = requestAnimationFrame(raf);
    return () => {
      cancelAnimationFrame(frame);
      lenis.destroy();
    };
  }, [reduce]);
  return null;
}

const wrap = (min: number, max: number, v: number) => {
  const r = max - min;
  return ((((v - min) % r) + r) % r) + min;
};

/**
 * A row of giant words that drifts on its own and races with the scroll,
 * leaning into the direction of travel. Two rows, opposite ways.
 */
function VelocityRow({ words, base = 3, flip = false }: { words: string[]; base?: number; flip?: boolean }) {
  const reduce = useReducedMotion();
  const { isRTL } = useLanguage();
  const x = useMotionValue(0);
  const { scrollY } = useScroll();
  const velocity = useVelocity(scrollY);
  const smooth = useSpring(velocity, { damping: 50, stiffness: 400 });
  const factor = useTransform(smooth, [0, 1000], [0, 5], { clamp: false });
  const skew = useTransform(smooth, [-2000, 2000], [8, -8]);
  const dir = useRef(1);
  const position = useTransform(x, (v) => `${wrap(-50, 0, v)}%`);

  useAnimationFrame((_, delta) => {
    if (reduce) return;
    let move = (flip ? -1 : 1) * (isRTL ? -1 : 1) * base * (delta / 1000);
    if (factor.get() < 0) dir.current = -1;
    else if (factor.get() > 0) dir.current = 1;
    move += dir.current * move * factor.get();
    x.set(x.get() + move);
  });

  const line = words.join('  ·  ');
  return (
    <div className="overflow-hidden whitespace-nowrap" aria-hidden dir="ltr">
      <motion.div className="flex w-max" style={{ x: position, skewX: reduce ? 0 : skew }}>
        {[0, 1].map((k) => (
          <span key={k} dir="auto" className={`pe-8 font-serif text-[clamp(1.25rem,2.5vw,2.25rem)] leading-[1.3] ${flip ? 'text-transparent [-webkit-text-stroke:1.5px_rgba(45,106,79,0.55)]' : 'text-kcc-green'}`}>
            {line}  ·
          </span>
        ))}
      </motion.div>
    </div>
  );
}

export function VelocityBand() {
  const pick = usePick();
  const a: Pair[] = [{ en: 'Beauty', ar: 'جمال' }, { en: 'Science', ar: 'علم' }, { en: 'Made in Jeddah', ar: 'صُنع في جدة' }, { en: 'Digitally connected', ar: 'متصل رقميًا' }];
  const b: Pair[] = [{ en: 'Skincare', ar: 'العناية بالبشرة' }, { en: 'Haircare', ar: 'العناية بالشعر' }, { en: 'Sun care', ar: 'الحماية من الشمس' }, { en: 'Body care', ar: 'العناية بالجسم' }, { en: 'Color cosmetics', ar: 'المكياج' }];
  return (
    <section className="overflow-hidden bg-cream-50 py-6 lg:py-9">
      <VelocityRow words={a.map(pick)} />
      <VelocityRow words={b.map(pick)} base={2.4} flip />
    </section>
  );
}

/**
 * The six production lines as tall photographic strips. The one in focus
 * opens up and tells its story; the others narrow to a sliver with their
 * name on its side. It cycles by itself while on screen and stops under the
 * pointer. Phones get a swipeable row instead (see LinesSlider).
 */
export function LinesStrips() {
  const pick = usePick();
  const reduce = useReducedMotion();
  const [active, setActive] = useState(0);
  const [hover, setHover] = useState(false);
  const [onScreen, setOnScreen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const n = LINES.items.length;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setOnScreen(e.isIntersecting), { threshold: 0.4 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (reduce || hover || !onScreen) return;
    const id = window.setInterval(() => setActive((a) => (a + 1) % n), 3800);
    return () => window.clearInterval(id);
  }, [reduce, hover, onScreen, n]);

  return (
    <section className="relative hidden overflow-hidden bg-[#0F1712] py-20 text-white lg:block lg:py-28">
      <div className="page-shell">
        <div className="mb-10 flex items-end justify-between gap-6">
          <div>
            <Eyebrow dark>{pick(LINES.eyebrow)}</Eyebrow>
            <WordsReveal text={pick(LINES.title)} className="font-serif text-5xl leading-tight" />
          </div>
          <p className="font-serif text-7xl text-white/15" aria-hidden>0{active + 1}<span className="text-3xl">/0{n}</span></p>
        </div>
        <div
          ref={ref}
          className="flex h-[34rem] gap-3"
          onPointerEnter={() => setHover(true)}
          onPointerLeave={() => setHover(false)}
        >
          {LINES.items.map((l, i) => {
            const open = i === active;
            return (
              <button
                key={l.img}
                type="button"
                onPointerEnter={() => setActive(i)}
                onFocus={() => setActive(i)}
                onClick={() => setActive(i)}
                aria-pressed={open}
                className="group relative overflow-hidden rounded-[1.75rem] text-start transition-[flex-grow] duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)] focus-visible:outline-2"
                style={{ flexGrow: open ? 6 : 1, flexBasis: 0 }}
              >
                <img
                  src={STORY_IMG(l.img)}
                  alt=""
                  loading="lazy"
                  className={`absolute inset-0 h-full w-full object-cover transition-transform duration-[1.6s] ease-out ${open ? 'scale-100' : 'scale-125 grayscale-[60%]'}`}
                />
                <div className={`absolute inset-0 transition-colors duration-700 ${open ? 'bg-gradient-to-t from-[#0a160e]/90 via-transparent to-transparent' : 'bg-[#0a160e]/55'}`} />
                <span className="absolute start-4 top-4 rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-kcc-green">0{i + 1}</span>
                {/* Collapsed: the name runs up the strip. */}
                <span
                  className={`absolute bottom-6 start-1/2 origin-bottom-left -rotate-90 whitespace-nowrap font-serif text-2xl transition-opacity duration-500 rtl:origin-bottom-right rtl:rotate-90 ${open ? 'opacity-0' : 'opacity-100 delay-300'}`}
                  aria-hidden={open}
                >
                  {pick(l.name)}
                </span>
                {/* Open: the full caption rises in. */}
                <div className={`absolute inset-x-0 bottom-0 p-8 transition-all duration-700 ${open ? 'translate-y-0 opacity-100 delay-300' : 'translate-y-6 opacity-0'}`}>
                  <h3 className="font-serif text-4xl">
                    {pick(l.name)}
                    {l.phase2 && <span className="ms-3 rounded-full bg-kcc-beige/90 px-2 py-0.5 align-middle font-sans text-[0.625rem] font-bold uppercase tracking-wider text-ink-800">{pick(LINES.phase2)}</span>}
                  </h3>
                  <p className="mt-2 max-w-md text-white/80">{pick(l.text)}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/**
 * The textures, the part the team liked, given the stage: four cutouts float
 * at their own depths over a giant word, drift with the scroll at different
 * speeds and lean away from the pointer, each on its own rhythm.
 */
export function TextureShowcase() {
  const pick = usePick();
  const reduce = useReducedMotion();
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const smx = useSpring(mx, { stiffness: 60, damping: 15 });
  const smy = useSpring(my, { stiffness: 60, damping: 15 });
  const wordX = useTransform(scrollYProgress, [0, 1], reduce ? ['0%', '0%'] : ['12%', '-12%']);

  // Placement and depth of each cutout (depth drives both parallaxes).
  const layout = [
    { pos: 'start-[4%] top-[14%]', w: 'w-[min(30vw,22rem)]', depth: 1.4 },
    { pos: 'end-[6%] top-[8%]', w: 'w-[min(26vw,19rem)]', depth: 0.8 },
    { pos: 'start-[18%] bottom-[6%]', w: 'w-[min(28vw,20rem)]', depth: 1.1 },
    { pos: 'end-[14%] bottom-[10%]', w: 'w-[min(24vw,17rem)]', depth: 1.7 },
  ];

  return (
    <section
      ref={ref}
      className="relative overflow-hidden bg-cream-100 py-16 lg:py-24"
      onPointerMove={(e) => {
        if (e.pointerType !== 'mouse') return;
        const r = e.currentTarget.getBoundingClientRect();
        mx.set((e.clientX - r.left) / r.width - 0.5);
        my.set((e.clientY - r.top) / r.height - 0.5);
      }}
      onPointerLeave={() => { mx.set(0); my.set(0); }}
    >
      <div className="page-shell relative text-center">
        <Eyebrow>{pick(MAKE.textures.eyebrow)}</Eyebrow>
        <WordsReveal text={pick(MAKE.textures.title)} className="mx-auto max-w-3xl font-serif text-4xl leading-tight text-ink-800 sm:text-5xl" />
      </div>
      {/* Phones: the same four, in a grid, each on its own float. */}
      <div className="page-shell mt-8 grid grid-cols-2 gap-3 sm:hidden">
        {MAKE.textures.items.map((t, i) => (
          <div key={t.img} className="story-bob rounded-3xl bg-white/80 p-3 shadow-soft" style={{ animationDelay: `${i * -1.8}s` }}>
            <img src={STORY_IMG(t.img)} alt="" className="aspect-[3/2] w-full object-contain mix-blend-multiply" />
            <p className="mt-1 font-serif text-lg text-ink-800">{pick(t.name)}</p>
            <p className="text-[0.6875rem] leading-relaxed text-cream-700">{pick(t.list)}</p>
          </div>
        ))}
      </div>
      <div className="relative mx-auto mt-6 hidden h-[44rem] max-w-[100rem] sm:block">
        <motion.p
          style={{ x: wordX }}
          className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 select-none whitespace-nowrap text-center font-serif text-[clamp(5rem,18vw,17rem)] leading-none text-transparent [-webkit-text-stroke:1.5px_rgba(45,106,79,0.28)]"
          aria-hidden
        >
          {pick({ en: 'Texture', ar: 'القوام' })}
        </motion.p>
        {MAKE.textures.items.map((t, i) => (
          <Floater key={t.img} i={i} t={t} cls={layout[i]} smx={smx} smy={smy} progress={scrollYProgress} pick={pick} reduce={!!reduce} />
        ))}
      </div>
    </section>
  );
}

function Floater({
  i, t, cls, smx, smy, progress, pick, reduce,
}: {
  i: number;
  t: (typeof MAKE.textures.items)[number];
  cls: { pos: string; w: string; depth: number };
  smx: ReturnType<typeof useSpring>;
  smy: ReturnType<typeof useSpring>;
  progress: ReturnType<typeof useScroll>['scrollYProgress'];
  pick: (x: Pair) => string;
  reduce: boolean;
}) {
  const x = useTransform(smx, (v) => (reduce ? 0 : -v * 40 * cls.depth));
  const yMouse = useTransform(smy, (v) => (reduce ? 0 : -v * 30 * cls.depth));
  const yScroll = useTransform(progress, [0, 1], reduce ? [0, 0] : [120 * cls.depth, -120 * cls.depth]);
  const y = useTransform([yMouse, yScroll], ([a, b]: number[]) => a + b);
  const rotate = useTransform(progress, [0, 1], reduce ? [0, 0] : [(i % 2 ? 8 : -8) * cls.depth, (i % 2 ? -6 : 6) * cls.depth]);
  return (
    <motion.figure className={`absolute ${cls.pos} ${cls.w}`} style={{ x, y, rotate, zIndex: Math.round(cls.depth * 10) }}>
      <div className="story-bob" style={{ animationDelay: `${i * -1.8}s`, animationDuration: `${6 + i}s` }}>
        <div className="group rounded-[2rem] bg-white/70 p-4 shadow-soft-lg backdrop-blur-sm transition-transform duration-500 hover:scale-105 dark:bg-white/90">
          <img src={STORY_IMG(t.img)} alt="" className="aspect-[3/2] w-full object-contain mix-blend-multiply transition-transform duration-700 group-hover:scale-110 group-hover:-rotate-3" />
          <figcaption className="px-2 pb-1 text-start">
            <p className="font-serif text-xl text-ink-800">
              {pick(t.name)}
              {t.phase2 && <span className="ms-2 text-[0.625rem] font-bold uppercase text-kcc-beige-dark">· {pick(LINES.phase2)}</span>}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-cream-700">{pick(t.list)}</p>
          </figcaption>
        </div>
      </div>
    </motion.figure>
  );
}

/* ============================ The luxe ticker ============================ */

/** A row that drifts on its own and speeds up, in the scroll's direction, while the page moves. */
function DriftRow({ children, base, flip = false, className = '' }: { children: React.ReactNode; base: number; flip?: boolean; className?: string }) {
  const reduce = useReducedMotion();
  const { isRTL } = useLanguage();
  const x = useMotionValue(0);
  const { scrollY } = useScroll();
  const velocity = useVelocity(scrollY);
  const smooth = useSpring(velocity, { damping: 50, stiffness: 300 });
  const boost = useTransform(smooth, [-2500, 0, 2500], [4, 0, 4]);
  const position = useTransform(x, (v) => `${wrap(-50, 0, v)}%`);
  const held = useRef(false);
  useAnimationFrame((_, delta) => {
    if (reduce || held.current) return;
    const sign = (flip ? -1 : 1) * (isRTL ? -1 : 1);
    x.set(x.get() + sign * base * (1 + boost.get()) * (delta / 1000));
  });
  return (
    // Laid out left to right in both languages so the loop starts in view;
    // only the direction of travel follows the language.
    <div
      className={`overflow-hidden whitespace-nowrap ${className}`}
      dir="ltr"
      onPointerEnter={(e) => { if (e.pointerType === 'mouse') held.current = true; }}
      onPointerLeave={() => { held.current = false; }}
    >
      <motion.div className="flex w-max" style={{ x: position }}>
        <div className="flex shrink-0 items-center">{children}</div>
        <div className="flex shrink-0 items-center" aria-hidden>{children}</div>
      </motion.div>
    </div>
  );
}

/**
 * The line at the foot of the hero: what KCC makes, each category with its
 * own fine icon, drifting on its own and quickening while the page is
 * scrolled. Hovering it holds it still.
 */
export function LuxeTicker({ items }: { items: Array<{ label: string; Icon: LucideIcon }> }) {
  return (
    // No background of its own: it sits at the foot of the hero, over the film.
    <div className="relative py-3 text-[#FFFCF8] sm:py-4" role="region" aria-label={items.map((x) => x.label).join(', ')}>
      <div className="[mask-image:linear-gradient(90deg,transparent,#000_6%,#000_94%,transparent)]" aria-hidden>
        <DriftRow base={1.5}>
          {items.map(({ label, Icon }, i) => (
            <span key={i} className="flex items-center gap-3 px-5 sm:px-7 rtl:flex-row-reverse">
              <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/[0.08] ring-1 ring-white/15">
                <Icon size={14} strokeWidth={1.5} className="text-[#9FD8B7]" />
              </span>
              <span dir="auto" className="text-[0.8125rem] font-medium tracking-[0.04em] text-[#F2F7F3] sm:text-sm">{label}</span>
            </span>
          ))}
        </DriftRow>
      </div>
    </div>
  );
}
