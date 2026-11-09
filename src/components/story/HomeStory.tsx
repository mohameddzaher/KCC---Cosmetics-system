'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import {
  ArrowRight, ArrowDown, ChevronLeft, ChevronRight, Check, Phone, MapPin, Quote,
  Sparkles, Droplets, Waves, FlaskRound, Sun, Pipette, HandHeart, Baby, ShowerHead, Palette, Droplet, FlaskConical,
  Factory, Truck, Building2, type LucideIcon,
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCmsSection } from '@/lib/useCmsSection';
import {
  HERO, DIRECTION, NUMBERS, COMMITMENT, PLANT, LINES, MAKE, MARKET,
  FORMULATEX, ODM, QUALITY, PARTNERS, CASE, PROMISE, LOCATIONS, STORY_IMG, type Pair,
} from '@/lib/storyContent';
import {
  Counter, Eyebrow, ICONS, Magnetic, Marquee, Reveal, Rise, Tilt, WordsReveal, useParallax, usePick,
} from './primitives';
import { LuxeTicker } from './Motion2';

/* eslint-disable @next/next/no-img-element -- the story photographs are local, sized webp files */

/* ================================ Hero ================================ */

/**
 * The hero film, without a single hard cut: it fades in over its own first
 * frame once it is actually playing, and loops by crossfading between two
 * copies of itself, because its last shot is not its first. `media` limits
 * it to the screens it is shown on, so a hidden copy never downloads.
 */
function HeroVideo({ src, media }: { src: string; media: string }) {
  const a = useRef<HTMLVideoElement>(null);
  const b = useRef<HTMLVideoElement>(null);
  const [front, setFront] = useState<0 | 1 | null>(null);
  useEffect(() => {
    const va = a.current;
    const vb = b.current;
    if (!va || !vb || !window.matchMedia(media).matches) return;
    const vids = [va, vb];
    let cur = 0;
    let swapping = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    va.preload = 'auto';
    vb.preload = 'metadata';
    va.play().then(() => setFront(0)).catch(() => {});
    const onTime = () => {
      const v = vids[cur];
      if (swapping || !v.duration || v.duration - v.currentTime > 1.3) return;
      swapping = true;
      const next = 1 - cur;
      const nv = vids[next];
      nv.currentTime = 0;
      nv.play()
        .then(() => {
          setFront(next as 0 | 1);
          const old = cur;
          cur = next;
          timer = setTimeout(() => { vids[old].pause(); swapping = false; }, 1400);
        })
        .catch(() => { swapping = false; });
    };
    vids.forEach((v) => v.addEventListener('timeupdate', onTime));
    return () => {
      clearTimeout(timer);
      vids.forEach((v) => { v.removeEventListener('timeupdate', onTime); v.pause(); });
    };
  }, [media]);
  const cls = (i: 0 | 1) =>
    `absolute inset-0 h-full w-full object-cover transition-opacity duration-[1300ms] ease-out ${front === i ? 'opacity-100' : 'opacity-0'}`;
  return (
    <>
      <video ref={a} className={cls(0)} muted playsInline preload="none" aria-hidden>
        <source src={src} type="video/mp4" />
      </video>
      <video ref={b} className={cls(1)} muted playsInline preload="none" aria-hidden>
        <source src={src} type="video/mp4" />
      </video>
    </>
  );
}

const EASE_OUT = [0.22, 1, 0.36, 1] as const;

/** The four things to know about KCC, on a rail along the foot of the hero. */
const HERO_FACTS: Array<{ big?: Pair; count?: number; suffix?: string; flag?: boolean; Icon?: LucideIcon; label: Pair }> = [
  { big: { en: '1st', ar: 'الأول' }, Icon: Sparkles, label: { en: 'Digitalized beauty hub', ar: 'مركز تجميل رقمي' } },
  { big: { en: 'NL', ar: 'NL' }, flag: true, label: { en: 'Rooted in the Netherlands', ar: 'جذورنا في هولندا' } },
  { count: 40, suffix: 'M', Icon: Factory, label: { en: 'Units a year', ar: 'وحدة سنويًا' } },
  { count: 90, Icon: Truck, label: { en: 'Days to delivery', ar: 'يومًا للتسليم' } },
];

/**
 * The rail: a fine line draws itself across, then each fact rises in turn,
 * its mark ringed by a slowly orbiting light and its number counting up.
 */
function HeroFacts() {
  const pick = usePick();
  const reduce = useReducedMotion();
  return (
    <div className="relative grid grid-cols-2 lg:grid-cols-4">
      <motion.span
        aria-hidden
        className="absolute inset-x-0 top-0 h-px origin-[0%_50%] bg-[linear-gradient(90deg,rgba(159,216,183,0.75),rgba(255,255,255,0.14)_55%,rgba(255,255,255,0.04))] rtl:origin-[100%_50%] rtl:bg-[linear-gradient(270deg,rgba(159,216,183,0.75),rgba(255,255,255,0.14)_55%,rgba(255,255,255,0.04))]"
        initial={reduce ? false : { scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 1.6, delay: 1.1, ease: EASE_OUT }}
      />
      {HERO_FACTS.map((f, i) => (
        <motion.div
          key={i}
          className={`group flex items-center gap-3.5 py-4 sm:py-5 lg:px-6 ${i === 0 ? 'lg:ps-0' : 'lg:border-s lg:border-white/10'} ${i % 2 ? 'max-lg:ps-4 max-lg:border-s max-lg:border-white/10' : ''} ${i > 1 ? 'max-lg:border-t max-lg:border-white/10' : ''}`}
          initial={reduce ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 1.35 + i * 0.12, ease: EASE_OUT }}
        >
          <span className="relative grid h-10 w-10 shrink-0 place-items-center rounded-full transition-transform duration-500 group-hover:scale-110 sm:h-11 sm:w-11">
            <span
              className="story-orbit absolute inset-0 rounded-full bg-[conic-gradient(from_0deg,transparent_0deg,rgba(159,216,183,0.9)_70deg,transparent_150deg)]"
              style={{ animationDelay: `${i * -1.3}s` }}
              aria-hidden
            />
            <span className="absolute inset-[1.5px] rounded-full bg-[#0c1f16]" aria-hidden />
            {f.flag ? (
              <span className="relative flex h-3 w-[1.125rem] flex-col overflow-hidden rounded-[2px]" aria-hidden>
                <i className="flex-1 bg-[#AE1C28]" /><i className="flex-1 bg-white" /><i className="flex-1 bg-[#21468B]" />
              </span>
            ) : f.Icon ? (
              <f.Icon size={16} strokeWidth={1.5} className="relative text-[#9FD8B7]" aria-hidden />
            ) : null}
          </span>
          <span className="min-w-0">
            <span className="block font-serif text-[1.75rem] leading-none text-white lining-nums transition-colors duration-500 group-hover:text-[#9FD8B7] sm:text-[2.1rem]">
              {f.count !== undefined ? <Counter to={f.count} suffix={f.suffix} /> : pick(f.big!)}
            </span>
            <span className="mt-1.5 block text-[0.625rem] font-semibold uppercase leading-snug tracking-[0.16em] text-white/60 rtl:text-xs rtl:normal-case rtl:tracking-normal sm:text-[0.6875rem]">
              {pick(f.label)}
            </span>
          </span>
        </motion.div>
      ))}
    </div>
  );
}

/** On the film's top edge: the group's road, from the Netherlands to the Kingdom. */
function FilmRoute() {
  const pick = usePick();
  return (
    <motion.div
      className="absolute -top-4 end-8 z-10 flex items-center gap-2.5 rounded-full bg-[#0c1f16]/90 px-3.5 py-2 text-[0.6875rem] font-semibold tracking-[0.12em] text-white/85 shadow-[0_14px_40px_-16px_rgba(0,0,0,0.9)] ring-1 ring-white/15"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.9, delay: 1.1, ease: EASE_OUT }}
      dir="ltr"
      aria-label={pick({ en: 'From the Netherlands to Saudi Arabia', ar: 'من هولندا إلى السعودية' })}
    >
      <span className="flex h-2.5 w-4 flex-col overflow-hidden rounded-[2px]" aria-hidden>
        <i className="flex-1 bg-[#AE1C28]" /><i className="flex-1 bg-white" /><i className="flex-1 bg-[#21468B]" />
      </span>
      <span aria-hidden>NL</span>
      <span className="relative h-px w-12 bg-[repeating-linear-gradient(90deg,rgba(255,255,255,0.45)_0_3px,transparent_3px_6px)]" aria-hidden>
        <span className="story-route absolute -top-[3px] left-0 h-[7px] w-[7px] rounded-full bg-[#9FD8B7] shadow-[0_0_10px_rgba(159,216,183,0.9)]" />
      </span>
      <span aria-hidden>KSA</span>
      <span className="relative h-2.5 w-4 rounded-[2px] bg-[#006C35]" aria-hidden>
        <i className="absolute inset-x-[3px] top-1/2 h-px -translate-y-1/2 bg-white/90" />
      </span>
    </motion.div>
  );
}

/** On the film's lower corner: where KCC is, office and plant both, in Jeddah. */
function FilmPlace() {
  const pick = usePick();
  return (
    <motion.div
      className="absolute -bottom-5 start-8 z-10 flex items-center gap-3 rounded-full bg-[#0c1f16]/90 px-4 py-2 text-[0.6875rem] font-semibold text-white/85 shadow-[0_14px_40px_-16px_rgba(0,0,0,0.9)] ring-1 ring-white/15"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.9, delay: 1.3, ease: EASE_OUT }}
    >
      <span className="relative flex h-2 w-2" aria-hidden>
        <span className="absolute inset-0 animate-ping rounded-full bg-[#3AA05C] opacity-70" />
        <span className="relative h-2 w-2 rounded-full bg-[#3AA05C]" />
      </span>
      <span className="uppercase tracking-[0.16em] rtl:normal-case rtl:tracking-normal">{pick({ en: 'Jeddah, Saudi Arabia', ar: 'جدة، السعودية' })}</span>
      <span className="h-3 w-px bg-white/20" aria-hidden />
      <span className="flex items-center gap-1.5 text-[#9FD8B7]">
        <Building2 size={13} strokeWidth={1.75} aria-hidden />
        {pick({ en: 'Office', ar: 'المكتب' })}
        <span className="text-white/35" aria-hidden>{pick({ en: '&', ar: 'و' })}</span>
        <Factory size={13} strokeWidth={1.75} aria-hidden />
        {pick({ en: 'Plant', ar: 'المصنع' })}
      </span>
    </motion.div>
  );
}

/**
 * The cover of the company profile, as the home page's first screen: the
 * words beside the KCC film, the four facts beneath them, and what KCC makes
 * drifting along the foot. Every line of copy can still be overridden from
 * the CMS (section "hero", fields eyebrow, headline, place, story, tagline).
 */
export function StoryHero() {
  const pick = usePick();
  const { locale, t } = useLanguage();
  const reduce = useReducedMotion();
  const { content } = useCmsSection('hero', {
    en: { eyebrow: HERO.eyebrow.en, headline: HERO.title.en, place: HERO.place.en, story: HERO.story.en, tagline: HERO.tagline.en },
    ar: { eyebrow: HERO.eyebrow.ar, headline: HERO.title.ar, place: HERO.place.ar, story: HERO.story.ar, tagline: HERO.tagline.ar },
  });
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const bgY = useTransform(scrollYProgress, [0, 1], reduce ? ['0%', '0%'] : ['0%', '18%']);
  const textY = useTransform(scrollYProgress, [0, 1], reduce ? ['0%', '0%'] : ['0%', '-18%']);
  const filmY = useTransform(scrollYProgress, [0, 1], reduce ? ['0%', '0%'] : ['0%', '-8%']);
  const fade = useTransform(scrollYProgress, [0, 0.7], [1, 0]);

  return (
    <section ref={ref} className="relative isolate flex min-h-[100svh] flex-col overflow-hidden bg-[#0a160e] pt-24 sm:pt-28">
      <motion.div className="absolute inset-0 -z-10" style={{ y: bgY }}>
        {/* Wide screens: the film's first frame, blurred and calmed, as the room it stands in. */}
        <img src={STORY_IMG('hero-kcc-backdrop')} alt="" className="absolute inset-0 hidden h-full w-full object-cover brightness-[.7] saturate-[.3] lg:block" />
        <div className="absolute inset-0 hidden bg-[radial-gradient(ellipse_at_75%_45%,rgba(45,106,79,0.28),transparent_60%)] lg:block" aria-hidden />
        <div className="absolute inset-0 hidden bg-[#0a160e]/50 lg:block" aria-hidden />
        {/* Phones and tablets: the film, which is vertical, fills the screen. */}
        <div className="absolute inset-0 lg:hidden">
          <img src={STORY_IMG('hero-kcc-poster')} alt="" className="absolute inset-0 h-full w-full object-cover" />
          {!reduce && <HeroVideo src="/videos/hero-kcc.mp4" media="(max-width: 1023.98px)" />}
        </div>
      </motion.div>
      {/* Dark under the words, open toward the film. */}
      <div
        className="absolute inset-0 -z-10 ltr:bg-[linear-gradient(90deg,rgba(10,22,14,.95)_0%,rgba(10,22,14,.84)_36%,rgba(10,22,14,.18)_72%,rgba(10,22,14,0)_100%)] rtl:bg-[linear-gradient(270deg,rgba(10,22,14,.95)_0%,rgba(10,22,14,.84)_36%,rgba(10,22,14,.18)_72%,rgba(10,22,14,0)_100%)] max-lg:!bg-[linear-gradient(0deg,rgba(10,22,14,.96)_0%,rgba(10,22,14,.82)_45%,rgba(10,22,14,.55)_75%,rgba(10,22,14,.35)_100%)]"
        aria-hidden
      />

      <div className="page-shell flex w-full flex-1 items-end pb-6 lg:items-center lg:pb-8">
        <div className="grid w-full items-center gap-10 lg:grid-cols-[minmax(0,1fr)_auto] xl:gap-16">
          <motion.div style={{ y: textY, opacity: fade }}>
            <div className="max-w-[44rem]">
              <motion.div initial={{ y: 10 }} animate={{ y: 0 }} transition={{ duration: 0.6 }}>
                <Eyebrow dark>{content.eyebrow}</Eyebrow>
              </motion.div>
              <WordsReveal
                as="h1"
                text={content.headline}
                accent={content.place}
                className="font-serif text-[2.6rem] leading-[1.02] text-white sm:text-6xl lg:text-[4rem] xl:text-[4.6rem]"
              />
              <Rise delay={0.9}>
                <p className="mt-6 font-serif text-xl italic text-[#DCEBDD] sm:text-2xl">{content.story}</p>
              </Rise>
              <Rise delay={1.05}>
                <p className="mt-3 text-base font-semibold text-kcc-green-light sm:text-lg">{content.tagline}</p>
              </Rise>
              <Rise delay={1.2}>
                <div className="mt-8 flex flex-wrap items-center gap-3">
                  <Magnetic>
                    <Link href="/order/sample" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#3AA05C] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-black/20 transition-colors hover:bg-[#2f8a4d]">
                      {t('hero.requestSample')}
                      <ArrowRight size={16} className="rtl-flip" />
                    </Link>
                  </Magnetic>
                  <Link href="/order/bulk" className="inline-flex min-h-11 items-center rounded-full border border-white/30 px-6 py-3 text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/10">
                    {t('hero.placeBulkOrder')}
                  </Link>
                  <a href="#story" className="inline-flex min-h-11 items-center gap-2 px-2 text-sm font-medium text-white/80 hover:text-white">
                    {pick(HERO.start)}
                    <ArrowDown size={15} className={reduce ? '' : 'animate-bounce'} />
                  </a>
                </div>
              </Rise>
              <Rise delay={1.3}>
                <p className="mt-8 text-[0.6875rem] uppercase tracking-[0.18em] text-[#B9CDBE]" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
                  {pick(HERO.meta)}
                </p>
              </Rise>
            </div>
          </motion.div>

          {/* Wide screens: the film in its own frame, a fine outline set just behind it. */}
          <motion.div
            className="relative hidden lg:block"
            style={{ y: filmY }}
            initial={reduce ? false : { opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.4, delay: 0.3, ease: EASE_OUT }}
          >
            {/* A soft green light behind the film. */}
            <span className="absolute -inset-16 -z-10 rounded-full bg-[radial-gradient(closest-side,rgba(64,145,108,0.35),transparent)]" aria-hidden />
            {/* Viewfinder marks at the four corners. */}
            {['-start-4 -top-4 border-s border-t rounded-ss-xl', '-end-4 -top-4 border-e border-t rounded-se-xl', '-start-4 -bottom-4 border-s border-b rounded-es-xl', '-end-4 -bottom-4 border-e border-b rounded-ee-xl'].map((c) => (
              <span key={c} className={`absolute h-7 w-7 border-white/35 ${c}`} aria-hidden />
            ))}
            <FilmRoute />
            <FilmPlace />
            <div className="relative aspect-[4/5] h-[min(64svh,calc(100svh-18rem),40rem)] overflow-hidden rounded-[2rem] shadow-[0_40px_90px_-30px_rgba(0,0,0,0.75)] ring-1 ring-white/15">
              <img src={STORY_IMG('hero-kcc-poster')} alt="" fetchPriority="high" className="absolute inset-0 h-full w-full object-cover" />
              {!reduce && <HeroVideo src="/videos/hero-kcc.mp4" media="(min-width: 1024px)" />}
            </div>
          </motion.div>
        </div>
      </div>

      {/* The four facts. */}
      <div className="page-shell w-full">
        <HeroFacts />
      </div>

      {/* What KCC makes, drifting along the foot of the hero. */}
      <CategoryTicker />
    </section>
  );
}

/* ============================ Category band ============================ */

/** What KCC makes: its categories and the forms they come in. */
const TICKER_LINE: Array<Pair & { Icon: LucideIcon }> = [
  { en: 'Skin care', ar: 'العناية بالبشرة', Icon: Sparkles },
  { en: 'Creams & lotions', ar: 'الكريمات واللوشن', Icon: Droplets },
  { en: 'Hair & scalp', ar: 'الشعر وفروة الرأس', Icon: Waves },
  { en: 'Shampoos & conditioners', ar: 'الشامبو والبلسم', Icon: FlaskRound },
  { en: 'Sun protection', ar: 'الحماية من الشمس', Icon: Sun },
  { en: 'Serums & gels', ar: 'السيروم والجل', Icon: Pipette },
  { en: 'Body care', ar: 'العناية بالجسم', Icon: HandHeart },
  { en: 'Gentle baby care', ar: 'عناية لطيفة بالأطفال', Icon: Baby },
  { en: 'Hygiene & freshness', ar: 'النظافة والانتعاش', Icon: ShowerHead },
  { en: 'Color cosmetics', ar: 'مستحضرات التجميل الملونة', Icon: Palette },
  { en: 'Oils & butters', ar: 'الزيوت والزبدات', Icon: Droplet },
  { en: 'Formulated with you', ar: 'تُركَّب معك', Icon: FlaskConical },
];

export function CategoryTicker() {
  const pick = usePick();
  return <LuxeTicker items={TICKER_LINE.map((x) => ({ label: pick(x), Icon: x.Icon }))} />;
}

/* ====================== Vision, mission and values ====================== */

export function DirectionSection() {
  const pick = usePick();
  const { ref, y } = useParallax(40);
  return (
    <section id="story" className="relative scroll-mt-20 overflow-hidden bg-cream-50 py-20 lg:py-28">
      <div className="page-shell grid items-center gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
        <Reveal from="start" className="relative">
          <div ref={ref} className="relative aspect-[4/5] overflow-hidden rounded-[2rem] shadow-soft-lg">
            <motion.img src={STORY_IMG('rd')} alt="" className="absolute inset-0 h-[115%] w-full object-cover" style={{ y }} />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-6">
              <p className="font-serif text-2xl italic text-white">{pick(HERO.tagline)}</p>
            </div>
          </div>
        </Reveal>
        <div className="relative">
          <Eyebrow>{pick(DIRECTION.eyebrow)}</Eyebrow>
          <WordsReveal text={pick(DIRECTION.title)} className="mb-8 font-serif text-4xl leading-tight text-ink-800 sm:text-5xl" />
          <div className="space-y-4">
            {[[DIRECTION.labels.vision, DIRECTION.vision], [DIRECTION.labels.mission, DIRECTION.mission]].map(([label, text], i) => (
              <Reveal key={i} from="end" delay={0.15 + i * 0.15}>
                <Tilt max={4}>
                  <div className="grid gap-3 rounded-3xl border border-cream-300 bg-surface p-6 shadow-soft sm:grid-cols-[7rem_1fr] sm:p-7">
                    <p className="text-[0.6875rem] font-bold uppercase tracking-[0.24em] text-kcc-green">{pick(label)}</p>
                    <p className="font-serif text-xl leading-snug text-ink-800 sm:text-2xl">{pick(text)}</p>
                  </div>
                </Tilt>
              </Reveal>
            ))}
            <Reveal from="end" delay={0.45}>
              <div className="grid gap-3 rounded-3xl border border-cream-300 bg-surface p-6 shadow-soft sm:grid-cols-[7rem_1fr] sm:items-center sm:p-7">
                <p className="text-[0.6875rem] font-bold uppercase tracking-[0.24em] text-kcc-green">{pick(DIRECTION.labels.values)}</p>
                <div className="flex flex-wrap gap-2">
                  {DIRECTION.values.map((v, i) => (
                    <Rise key={i} delay={0.6 + i * 0.08}>
                      <span className="inline-flex rounded-full bg-[#E1EEE2] px-4 py-1.5 text-sm font-semibold text-kcc-green dark:bg-kcc-green/20">{pick(v)}</span>
                    </Rise>
                  ))}
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ============================== Numbers ============================== */

export function NumbersSection() {
  const pick = usePick();
  const reduce = useReducedMotion();
  return (
    <section className="relative overflow-hidden bg-[#0F1712] py-20 text-white lg:py-28">
      <div className="orb pointer-events-none absolute -top-40 end-0 h-[34rem] w-[34rem] rounded-full [--orb:rgba(58,160,92,.25)]" aria-hidden />
      <div className="page-shell relative">
        <div className="mb-12 max-w-3xl">
          <Eyebrow dark>{pick(NUMBERS.eyebrow)}</Eyebrow>
          <WordsReveal text={pick(NUMBERS.title)} className="font-serif text-4xl leading-tight sm:text-5xl" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {NUMBERS.items.map((n, i) => (
            <Rise key={i} delay={i * 0.08}>
              <div className={reduce ? '' : 'story-flip'} tabIndex={0}>
                <div className="story-flip-inner relative h-52">
                  <div className="story-flip-face absolute inset-0 flex flex-col justify-between rounded-3xl border border-white/10 bg-white/[0.04] p-7">
                    <p className="font-serif text-6xl leading-none text-white">
                      <Counter to={n.value} suffix={n.suffix} />
                    </p>
                    <div className="flex items-end justify-between gap-4">
                      <p className="text-sm uppercase tracking-[0.18em] text-white/70">{pick(n.label)}</p>
                      {!reduce && <span className="text-xs text-kcc-green-light">↻</span>}
                    </div>
                  </div>
                  {!reduce && (
                    <div className="story-flip-face story-flip-back absolute inset-0 flex items-center rounded-3xl bg-kcc-green p-7 dark:bg-[#1F5A40]">
                      <p className="text-sm leading-relaxed text-white/90">{pick(n.detail)}</p>
                    </div>
                  )}
                </div>
              </div>
              {reduce && <p className="mt-2 text-sm text-white/70">{pick(n.detail)}</p>}
            </Rise>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ======================== Commitment to the Kingdom ======================== */

export function CommitmentSection() {
  const pick = usePick();
  return (
    <section className="relative overflow-hidden bg-cream-100 py-20 lg:py-28">
      <div className="page-shell">
        <div className="mb-12 max-w-3xl">
          <Eyebrow>{pick(COMMITMENT.eyebrow)}</Eyebrow>
          <WordsReveal text={pick(COMMITMENT.title)} className="font-serif text-4xl leading-tight text-ink-800 sm:text-5xl" />
          <Rise delay={0.3}>
            <p className="mt-3 font-serif text-2xl italic text-kcc-green">{pick(COMMITMENT.sub)}</p>
          </Rise>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {COMMITMENT.items.map((c, i) => {
            const Icon = ICONS[c.icon];
            return (
              <Rise key={i} delay={i * 0.12}>
                <Tilt className="h-full">
                  <div className="group flex h-full flex-col rounded-3xl border border-cream-300 bg-surface p-6 shadow-soft transition-shadow hover:shadow-soft-lg">
                    <span className="mb-10 inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#E1EEE2] text-kcc-green transition-transform duration-500 group-hover:rotate-[-8deg] group-hover:scale-110 dark:bg-kcc-green/20">
                      <Icon size={24} />
                    </span>
                    <h3 className="mb-2 text-lg font-semibold text-ink-800">{pick(c.title)}</h3>
                    <p className="text-sm leading-relaxed text-cream-700">{pick(c.text)}</p>
                  </div>
                </Tilt>
              </Rise>
            );
          })}
        </div>
        <Reveal delay={0.2} className="mt-6">
          <div className="relative overflow-hidden rounded-[2rem] bg-kcc-green p-8 text-white sm:p-10 dark:bg-[#1F5A40]">
            <img src={STORY_IMG('fxh')} alt="" className="story-kenburns absolute inset-0 h-full w-full object-cover opacity-20 mix-blend-luminosity" />
            <div className="relative grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
              <div>
                <p className="mb-2 text-[0.6875rem] font-bold uppercase tracking-[0.24em] text-[#7FD39A]">{pick(COMMITMENT.digital.eyebrow)}</p>
                <p className="max-w-xl font-serif text-2xl leading-snug sm:text-3xl">{pick(COMMITMENT.digital.text)}</p>
              </div>
              <div className="flex flex-wrap gap-2 lg:max-w-md lg:justify-end">
                {COMMITMENT.digital.chips.map((c, i) => (
                  <Rise key={i} delay={0.5 + i * 0.1}>
                    <span className="inline-flex rounded-full bg-white/15 px-4 py-2 text-sm font-semibold backdrop-blur-sm">{pick(c)}</span>
                  </Rise>
                ))}
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ============================ The Jeddah plant ============================ */

export function PlantSection() {
  const pick = usePick();
  const { ref: aRef, y: aY } = useParallax(50);
  const { ref: bRef, y: bY } = useParallax(90);
  return (
    <section className="relative overflow-hidden bg-cream-50 py-20 lg:py-28">
      <div className="page-shell grid gap-12 lg:grid-cols-2 lg:items-center">
        <div>
          <Eyebrow>{pick(PLANT.eyebrow)}</Eyebrow>
          <p className="font-serif text-6xl leading-none text-kcc-green sm:text-7xl lg:text-8xl">
            <Counter to={40} suffix="M" />
          </p>
          <WordsReveal text={pick(PLANT.title)} className="mt-4 font-serif text-3xl leading-tight text-ink-800 sm:text-4xl" />
          <Rise delay={0.3}>
            <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#E1EEE2] px-4 py-2 text-sm font-semibold text-kcc-green dark:bg-kcc-green/20">
              <span className="h-2 w-2 animate-pulse rounded-full bg-kcc-green" aria-hidden />
              {pick(PLANT.since)}
            </p>
          </Rise>
          <Rise delay={0.4}>
            <div className="mt-6 space-y-2 text-sm text-cream-700">
              <p className="flex items-start gap-2"><Building2 size={16} className="mt-0.5 shrink-0 text-kcc-green" />{pick(LOCATIONS.office)}</p>
              <p className="flex items-start gap-2"><Factory size={16} className="mt-0.5 shrink-0 text-kcc-green" />{pick(LOCATIONS.plant)}</p>
            </div>
          </Rise>
          <Rise delay={0.5}>
            <p className="mt-8 text-[0.6875rem] font-bold uppercase tracking-[0.24em] text-kcc-green">{pick(PLANT.builtFor)}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {PLANT.audiences.map((x, i) => (
                <span key={i} className="rounded-full border border-cream-300 bg-surface px-4 py-2 text-sm text-ink-700">{pick(x)}</span>
              ))}
            </div>
          </Rise>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div ref={aRef} className="space-y-4">
            <Reveal><motion.img src={STORY_IMG('plant')} alt="" className="aspect-[4/3] w-full rounded-3xl object-cover shadow-soft-lg" style={{ y: aY }} /></Reveal>
            <Reveal delay={0.15}><motion.img src={STORY_IMG('b8b')} alt="" className="aspect-square w-full rounded-3xl object-cover shadow-soft-lg" style={{ y: aY }} /></Reveal>
          </div>
          <div ref={bRef} className="space-y-4 pt-16">
            <Reveal delay={0.1}><motion.img src={STORY_IMG('b8a')} alt="" className="aspect-square w-full rounded-3xl object-cover shadow-soft-lg" style={{ y: bY }} /></Reveal>
            <Reveal delay={0.25}><motion.img src={STORY_IMG('cityC')} alt="" className="aspect-[4/3] w-full rounded-3xl object-cover shadow-soft-lg" style={{ y: bY }} /></Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ========================= Production lines slider ========================= */

export function LinesSlider() {
  const pick = usePick();
  const { isRTL } = useLanguage();
  const reduce = useReducedMotion();
  const track = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [onScreen, setOnScreen] = useState(false);

  // Only plays while the reader can see it.
  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setOnScreen(e.isIntersecting), { threshold: 0.4 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const n = LINES.items.length;

  const go = (i: number) => {
    const el = track.current;
    if (!el) return;
    const next = (i + n) % n;
    const card = el.children[next] as HTMLElement | undefined;
    if (!card) return;
    // Scroll the track only (scrollIntoView would also move the page), by the
    // distance between the card's leading edge and the track's, which is
    // right in both directions.
    const c = card.getBoundingClientRect();
    const t = el.getBoundingClientRect();
    const pad = 16;
    const delta = isRTL ? c.right - (t.right - pad) : c.left - (t.left + pad);
    el.scrollBy({ left: delta, behavior: reduce ? 'auto' : 'smooth' });
    setActive(next);
  };

  // Advances by itself, unless someone is looking at it or prefers stillness.
  useEffect(() => {
    if (reduce || paused || !onScreen) return;
    const id = window.setInterval(() => go(active + 1), 4500);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, paused, reduce, onScreen]);

  return (
    <section
      className="relative overflow-hidden bg-cream-100 py-20 lg:hidden"
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div className="page-shell">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-6">
          <div>
            <Eyebrow>{pick(LINES.eyebrow)}</Eyebrow>
            <WordsReveal text={pick(LINES.title)} className="font-serif text-4xl leading-tight text-ink-800 sm:text-5xl" />
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => go(active - 1)} className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-cream-300 bg-surface text-ink-700 hover:border-kcc-green hover:text-kcc-green" aria-label={pick({ en: 'Previous line', ar: 'الخط السابق' })}>
              <ChevronLeft size={20} className="rtl-flip" />
            </button>
            <button type="button" onClick={() => go(active + 1)} className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-kcc-green text-white hover:bg-kcc-green-dark" aria-label={pick({ en: 'Next line', ar: 'الخط التالي' })}>
              <ChevronRight size={20} className="rtl-flip" />
            </button>
          </div>
        </div>
        <div
          ref={track}
          className="scroll-thin -mx-4 flex snap-x snap-mandatory gap-5 overflow-x-auto px-4 pb-4"
          onScroll={(e) => {
            const el = e.currentTarget;
            const w = (el.children[0] as HTMLElement | undefined)?.offsetWidth || 1;
            setActive(Math.min(n - 1, Math.round(Math.abs(el.scrollLeft) / (w + 20))));
          }}
        >
          {LINES.items.map((l, i) => (
            <article key={l.img} className="group relative w-[78%] shrink-0 snap-start overflow-hidden rounded-[1.75rem] sm:w-[46%] lg:w-[31%]">
              <img src={STORY_IMG(l.img)} alt="" loading="lazy" className="aspect-[4/5] w-full object-cover transition-transform duration-[1.2s] ease-out group-hover:scale-110" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0a160e]/90 via-[#0a160e]/20 to-transparent" />
              <span className="absolute start-4 top-4 rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-kcc-green">0{i + 1}</span>
              <div className="absolute inset-x-0 bottom-0 p-6 text-white">
                <h3 className="font-serif text-3xl">
                  {pick(l.name)}
                  {l.phase2 && <span className="ms-2 rounded-full bg-kcc-beige/90 px-2 py-0.5 align-middle font-sans text-[0.625rem] font-bold uppercase tracking-wider text-ink-800">{pick(LINES.phase2)}</span>}
                </h3>
                <p className="mt-1 text-sm text-white/80">{pick(l.text)}</p>
              </div>
            </article>
          ))}
        </div>
        <div className="mt-6 flex gap-1.5" aria-hidden>
          {LINES.items.map((_, i) => (
            <span key={i} className="h-1 flex-1 overflow-hidden rounded-full bg-cream-300">
              <span className={`block h-full rounded-full bg-kcc-green transition-all duration-500 ${i <= active ? 'w-full' : 'w-0'}`} />
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ====================== Categories and textures ====================== */

export function MakeSection() {
  const pick = usePick();
  return (
    <section className="relative overflow-hidden bg-cream-50 py-20 lg:py-28">
      <div className="page-shell">
        <div className="mb-12 max-w-3xl">
          <Eyebrow>{pick(MAKE.eyebrow)}</Eyebrow>
          <WordsReveal text={pick(MAKE.title)} className="font-serif text-4xl leading-tight text-ink-800 sm:text-5xl" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {MAKE.categories.map((c, i) => {
            const Icon = ICONS[c.icon];
            return (
              <Rise key={i} delay={(i % 4) * 0.1}>
                <div className="group h-full rounded-3xl border border-cream-300 bg-surface p-6 transition-all duration-500 hover:-translate-y-1 hover:border-kcc-green/40 hover:shadow-soft-lg">
                  <Icon size={26} className="mb-6 text-kcc-green transition-transform duration-500 group-hover:scale-125" />
                  <h3 className="mb-2 font-semibold text-ink-800">
                    {pick(c.name)}
                    {c.phase2 && <span className="ms-2 rounded-full bg-kcc-beige/30 px-2 py-0.5 text-[0.625rem] font-bold uppercase tracking-wider text-ink-700">{pick(LINES.phase2)}</span>}
                  </h3>
                  <p className="text-sm leading-relaxed text-cream-700">{pick(c.text)}</p>
                </div>
              </Rise>
            );
          })}
          <Rise delay={0.3}>
            <div className="flex h-full flex-col justify-between rounded-3xl bg-kcc-green p-6 text-white dark:bg-[#1F5A40]">
              <p className="font-serif text-7xl leading-none">7</p>
              <p className="text-sm text-white/80">{pick({ en: 'care categories, one integrated group', ar: 'فئات للعناية، ومجموعة واحدة متكاملة' })}</p>
            </div>
          </Rise>
        </div>

      </div>
    </section>
  );
}

/* ============================ Market growth ============================ */

/**
 * One series, one colour: bars rise as they come into view, each labelled
 * with its own value, the last one marked as the 2029 figure. The numbers are
 * also in a table for screen readers.
 */
export function MarketSection() {
  const pick = usePick();
  const reduce = useReducedMotion();
  const max = Math.max(...MARKET.years.map((y) => y[1]));
  return (
    <section className="relative overflow-hidden bg-cream-100 py-20 lg:py-28">
      <div className="page-shell">
        <div className="mb-12 max-w-4xl">
          <Eyebrow>{pick(MARKET.eyebrow)}</Eyebrow>
          <WordsReveal text={pick(MARKET.title)} className="font-serif text-4xl leading-tight text-ink-800 sm:text-5xl" />
        </div>
        <div className="grid gap-5 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
          <Reveal>
            <div className="h-full rounded-[2rem] border border-cream-300 bg-surface p-6 shadow-soft sm:p-8">
              <p className="mb-6 text-[0.6875rem] font-bold uppercase tracking-[0.24em] text-cream-700">{pick(MARKET.unit)}</p>
              <div className="flex h-64 items-end gap-3 sm:gap-6" aria-hidden>
                {MARKET.years.map(([year, v], i) => (
                  <div key={year} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
                    <motion.span
                      className="text-sm font-semibold text-ink-800"
                      initial={reduce ? false : { opacity: 0 }}
                      whileInView={{ opacity: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.5 + i * 0.12 }}
                    >
                      {v}
                    </motion.span>
                    <motion.div
                      className={`w-full max-w-16 rounded-t-[4px] ${i === MARKET.years.length - 1 ? 'bg-kcc-green' : 'bg-kcc-green/45'}`}
                      style={{ height: `${(v / max) * 100}%`, originY: 1 }}
                      initial={reduce ? false : { scaleY: 0 }}
                      whileInView={{ scaleY: 1 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.2 + i * 0.12 }}
                    />
                    <span className="text-xs text-cream-700">{year}</span>
                  </div>
                ))}
              </div>
              <table className="sr-only">
                <caption>{pick(MARKET.title)} ({pick(MARKET.unit)})</caption>
                <tbody>{MARKET.years.map(([y, v]) => <tr key={y}><th>{y}</th><td>{v}</td></tr>)}</tbody>
              </table>
            </div>
          </Reveal>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-1">
            {[MARKET.cagr, MARKET.size].map((k, i) => (
              <Reveal key={i} delay={0.15 + i * 0.15} from="end">
                <div className={`flex h-full flex-col justify-between rounded-[2rem] p-7 ${i === 0 ? 'bg-kcc-green text-white dark:bg-[#1F5A40]' : 'border border-cream-300 bg-surface text-ink-800'}`}>
                  <p className="font-serif text-5xl leading-none sm:text-6xl">{k.value}</p>
                  <p className={`mt-6 text-sm ${i === 0 ? 'text-white/80' : 'text-cream-700'}`}>{pick(k.label)}</p>
                </div>
              </Reveal>
            ))}
            <div className="grid grid-cols-2 gap-5 sm:col-span-2 lg:col-span-1">
              {MARKET.population.map((k, i) => (
                <Rise key={i} delay={0.4 + i * 0.1}>
                  <div className="rounded-3xl border border-cream-300 bg-surface p-5">
                    <p className="font-serif text-3xl text-kcc-green">{k.value}</p>
                    <p className="mt-1 text-xs text-cream-700">{pick(k.label)}</p>
                  </div>
                </Rise>
              ))}
            </div>
          </div>
        </div>
        <p className="mt-4 text-xs text-cream-700">{pick(MARKET.source)}</p>
      </div>
    </section>
  );
}

/* ============================== FormulateX ============================== */

const FX_STEPS: Pair[] = [
  { en: 'Your name', ar: 'اسمك' },
  { en: 'Category', ar: 'القسم' },
  { en: 'Family', ar: 'العائلة' },
  { en: 'Your product', ar: 'منتجك' },
];

/**
 * The real sample builder (/order/sample), shown in a browser window that
 * walks through its first steps on its own while it is on screen. The frames
 * are screenshots of the site itself, one set per language.
 */
function FormulateXDemo() {
  const pick = usePick();
  const { locale } = useLanguage();
  const reduce = useReducedMotion();
  const [step, setStep] = useState(0);
  const [onScreen, setOnScreen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setOnScreen(e.isIntersecting), { threshold: 0.3 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  useEffect(() => {
    if (!onScreen || reduce) return;
    const t = setInterval(() => setStep((s) => (s + 1) % FX_STEPS.length), 3200);
    return () => clearInterval(t);
  }, [onScreen, reduce]);
  const lang = locale === 'ar' ? 'ar' : 'en';
  return (
    <div ref={box}>
      <div className="overflow-hidden rounded-2xl border border-cream-300 bg-surface shadow-soft-lg">
        {/* The browser's bar. */}
        <div className="flex items-center gap-3 border-b border-cream-300 bg-cream-100 px-4 py-2.5" dir="ltr">
          <span className="flex gap-1.5" aria-hidden>
            <i className="h-2.5 w-2.5 rounded-full bg-[#FF5F57]" /><i className="h-2.5 w-2.5 rounded-full bg-[#FEBC2E]" /><i className="h-2.5 w-2.5 rounded-full bg-[#28C840]" />
          </span>
          <span className="flex-1 truncate rounded-md bg-surface px-3 py-1 text-center text-[0.6875rem] text-cream-700">kcc-bv.com/order/sample</span>
        </div>
        <div className="relative aspect-[2/1] overflow-hidden bg-cream-50">
          {FX_STEPS.map((_, i) => (
            <motion.img
              key={`${lang}-${i}`}
              src={`/images/story/fx-${lang}-${i}.webp`}
              alt={i === step ? pick({ en: 'The KCC sample builder, step: ', ar: 'منشئ العيّنات في KCC، خطوة: ' }) + pick(FX_STEPS[i]) : ''}
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover object-top"
              initial={false}
              animate={{ opacity: i === step ? 1 : 0, scale: i === step ? 1 : 1.04, y: i === step ? 0 : 12 }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            />
          ))}
        </div>
      </div>
      {/* The steps, which also let the reader jump. */}
      <div className="mt-4 grid grid-cols-4 gap-2">
        {FX_STEPS.map((x, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setStep(i)}
            aria-pressed={i === step}
            className="group min-h-11 text-start"
          >
            <span className="block h-1 overflow-hidden rounded-full bg-kcc-green/15">
              {i === step ? (
                <motion.span
                  key={`on-${step}`}
                  className="block h-full origin-[0%_50%] rounded-full bg-kcc-green rtl:origin-[100%_50%]"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: !reduce && onScreen ? 3.2 : 0.3, ease: 'linear' }}
                />
              ) : (
                <span className={`block h-full rounded-full bg-kcc-green transition-opacity ${i < step ? 'opacity-100' : 'opacity-0'}`} />
              )}
            </span>
            <span className={`mt-1.5 block text-xs font-semibold transition-colors ${i === step ? 'text-kcc-green' : 'text-cream-700 group-hover:text-ink-700'}`}>0{i + 1} · {pick(x)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function FormulateXSection() {
  const pick = usePick();
  return (
    <section className="relative overflow-hidden bg-cream-50 py-20 lg:py-28">
      <div className="page-shell grid gap-12 lg:grid-cols-2 lg:items-center">
        <div>
          <Reveal from="start">
            <FormulateXDemo />
          </Reveal>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {FORMULATEX.packs.map((x, i) => (
              <Rise key={i} delay={0.4 + i * 0.06}>
                <span className="inline-block rounded-full border border-kcc-green/20 bg-surface px-3 py-1 text-xs font-semibold text-kcc-green">{pick(x)}</span>
              </Rise>
            ))}
          </div>
        </div>
        <div>
          <Eyebrow>{pick(FORMULATEX.eyebrow)}</Eyebrow>
          <WordsReveal text={pick(FORMULATEX.title)} className="font-serif text-4xl leading-tight text-ink-800 sm:text-5xl" />
          <Rise delay={0.2}><p className="mt-4 max-w-xl leading-relaxed text-cream-700">{pick(FORMULATEX.text)}</p></Rise>
          <ol className="relative mt-8 space-y-3 border-s-2 border-dashed border-kcc-green/30 ps-6">
            {FORMULATEX.steps.map((s, i) => (
              <Rise key={i} delay={0.3 + i * 0.1}>
                <li className="relative">
                  <span className="absolute -start-[2.2rem] top-0.5 inline-flex h-7 w-7 items-center justify-center rounded-full bg-kcc-green text-xs font-bold text-white">0{i + 1}</span>
                  <p className="font-semibold text-ink-800">{pick(s.title)}</p>
                  <p className="text-sm text-cream-700">{pick(s.text)}</p>
                </li>
              </Rise>
            ))}
          </ol>
          <div className="mt-8 grid gap-2 sm:grid-cols-2">
            {FORMULATEX.promises.map((x, i) => (
              <Rise key={i} delay={0.8 + i * 0.06}>
                <p className="flex items-start gap-2 text-sm text-ink-700"><Check size={16} className="mt-0.5 shrink-0 text-kcc-green" />{pick(x)}</p>
              </Rise>
            ))}
          </div>
          <Rise delay={1}>
            <Magnetic className="mt-8">
              <Link href="/order/sample" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-kcc-green px-6 py-3 text-sm font-semibold text-white hover:bg-kcc-green-dark">
                {pick(FORMULATEX.cta)}
                <ArrowRight size={16} className="rtl-flip" />
              </Link>
            </Magnetic>
          </Rise>
        </div>
      </div>
    </section>
  );
}

/* ========================= Integrated ODM journey ========================= */

export function OdmSection() {
  const pick = usePick();
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 80%', 'end 60%'] });
  const line = useTransform(scrollYProgress, [0, 1], reduce ? [1, 1] : [0, 1]);
  return (
    <section className="relative overflow-hidden bg-[#0F1712] py-20 text-white lg:py-28">
      <div className="page-shell">
        <div className="mb-12 max-w-4xl">
          <Eyebrow dark>{pick(ODM.eyebrow)}</Eyebrow>
          <WordsReveal text={pick(ODM.title)} className="font-serif text-4xl leading-tight sm:text-5xl" />
          <Rise delay={0.2}><p className="mt-4 text-white/70">{pick(ODM.sub)}</p></Rise>
        </div>
        <div ref={ref} className="relative">
          {/* The journey's thread, drawn as the reader scrolls through it. */}
          <div className="absolute inset-x-0 top-[7.5rem] hidden h-0.5 bg-white/10 lg:block" aria-hidden>
            <motion.div className="h-full origin-[0%_50%] bg-[#7FD39A] rtl:origin-[100%_50%]" style={{ scaleX: line }} />
          </div>
          <div className="grid gap-5 lg:grid-cols-3">
            {ODM.phases.map((ph, i) => {
              let n = i * 5;
              return (
                <Reveal key={i} delay={i * 0.2}>
                  <div className="h-full overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.04]">
                    <div className="relative h-40 overflow-hidden">
                      <img src={STORY_IMG(ph.img)} alt="" loading="lazy" className="story-kenburns h-full w-full object-cover opacity-80" />
                      <span className="absolute start-5 top-5 rounded-full bg-[#3AA05C] px-3 py-1 text-xs font-bold">{pick(ph.label)}</span>
                    </div>
                    <div className="p-6">
                      <h3 className="mb-4 font-serif text-2xl">{pick(ph.name)}</h3>
                      <ol className="space-y-2">
                        {ph.steps.map((s, k) => {
                          n += 1;
                          return (
                            <li key={k} className="flex items-center gap-3 text-sm text-white/80">
                              <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/20 text-[0.6875rem] font-bold text-[#7FD39A]">{String(n).padStart(2, '0')}</span>
                              {pick(s)}
                            </li>
                          );
                        })}
                      </ol>
                    </div>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ============================ Quality and SFDA ============================ */

export function QualitySection() {
  const pick = usePick();
  return (
    <section className="relative overflow-hidden bg-cream-50 py-20 lg:py-28">
      <div className="page-shell">
        <div className="mb-12 max-w-4xl">
          <Eyebrow>{pick(QUALITY.eyebrow)}</Eyebrow>
          <WordsReveal text={pick(QUALITY.title)} className="font-serif text-4xl leading-tight text-ink-800 sm:text-5xl" />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {QUALITY.credentials.map((c, i) => {
            const Icon = ICONS[c.icon];
            return (
              <Rise key={i} delay={(i % 2) * 0.12}>
                <div className="flex h-full gap-5 rounded-3xl border border-cream-300 bg-surface p-6 shadow-soft">
                  <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#E1EEE2] text-kcc-green dark:bg-kcc-green/20"><Icon size={22} /></span>
                  <div>
                    <h3 className="font-semibold text-ink-800">{pick(c.title)}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-cream-700">{pick(c.text)}</p>
                  </div>
                </div>
              </Rise>
            );
          })}
        </div>

        <h3 className="mb-6 mt-20 font-serif text-3xl text-ink-800 sm:text-4xl">{pick(QUALITY.sfda.title)}</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {QUALITY.sfda.steps.map((s, i) => (
            <Reveal key={i} delay={i * 0.15}>
              <div className="group h-full overflow-hidden rounded-3xl border border-cream-300 bg-surface">
                <div className="relative h-40 overflow-hidden">
                  <img src={STORY_IMG(s.img)} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" />
                  <span className="absolute start-4 top-4 rounded-full bg-kcc-green px-3 py-1 text-xs font-bold text-white dark:bg-[#1F5A40]">0{i + 1}</span>
                </div>
                <div className="p-5">
                  <p className="font-semibold text-ink-800">{pick(s.title)}</p>
                  <p className="mt-1 text-sm text-cream-700">{pick(s.text)}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal className="mt-20">
          <div className="relative overflow-hidden rounded-[2rem]">
            <img src={STORY_IMG('sus2')} alt="" loading="lazy" className="story-kenburns absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 bg-[#0a160e]/75" />
            <div className="relative grid gap-8 p-8 text-white sm:p-12 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] lg:items-center">
              <h3 className="font-serif text-4xl leading-tight">{pick(QUALITY.sustainability.title)}</h3>
              <div className="grid gap-4 sm:grid-cols-3">
                {QUALITY.sustainability.items.map((x, i) => {
                  const Icon = ICONS[x.icon];
                  return (
                    <Rise key={i} delay={0.2 + i * 0.12}>
                      <div className="rounded-3xl border border-white/15 bg-white/10 p-5 backdrop-blur-sm">
                        <Icon size={22} className="mb-4 text-[#7FD39A]" />
                        <p className="font-semibold">{pick(x.title)}</p>
                        <p className="mt-1 text-sm text-white/75">{pick(x.text)}</p>
                      </div>
                    </Rise>
                  );
                })}
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ============================ Ingredient partners ============================ */

export function PartnersSection() {
  const pick = usePick();
  return (
    <section className="relative overflow-hidden bg-cream-100 py-20 lg:py-24">
      <div className="page-shell mb-10 grid gap-6 lg:grid-cols-2 lg:items-end">
        <div>
          <Eyebrow>{pick(PARTNERS.eyebrow)}</Eyebrow>
          <WordsReveal text={pick(PARTNERS.title)} className="font-serif text-4xl leading-tight text-ink-800 sm:text-5xl" />
        </div>
        <Rise delay={0.2}><p className="leading-relaxed text-cream-700">{pick(PARTNERS.sub)}</p></Rise>
      </div>
      <div style={{ ['--gap' as string]: '1.25rem' }}>
        <Marquee speed={50}>
          {PARTNERS.logos.map(([k, name]) => (
            <span key={k} className="flex h-24 w-48 items-center justify-center rounded-2xl bg-white p-4 shadow-soft">
              <img src={`/images/story/partners/${k}.webp`} alt={name} loading="lazy" className="max-h-full max-w-full object-contain" />
            </span>
          ))}
        </Marquee>
      </div>
    </section>
  );
}

/* ============================== Case study ============================== */

export function CaseSection() {
  const pick = usePick();
  return (
    <section className="relative overflow-hidden bg-cream-50 py-20 lg:py-28">
      <div className="page-shell grid gap-12 lg:grid-cols-[minmax(0,6fr)_minmax(0,6fr)] lg:items-center">
        <div>
          <Eyebrow>{pick(CASE.eyebrow)}</Eyebrow>
          <WordsReveal text={pick(CASE.title)} className="font-serif text-4xl leading-tight text-ink-800 sm:text-5xl" />
          <Rise delay={0.2}><p className="mt-5 leading-relaxed text-cream-700">{pick(CASE.text)}</p></Rise>
          <Rise delay={0.25}><p className="mt-4 border-s-2 border-kcc-green ps-4 text-sm leading-relaxed text-ink-700">{pick(CASE.note)}</p></Rise>
          <div className="mt-8 grid grid-cols-4 gap-3">
            {CASE.products.map((x, i) => (
              <Rise key={x.img} delay={0.3 + i * 0.1}>
                <figure className="group">
                  <div className="overflow-hidden rounded-2xl bg-white">
                    <img src={STORY_IMG(x.img)} alt={pick(x.name)} loading="lazy" className="aspect-square w-full object-cover transition-transform duration-700 group-hover:scale-110" />
                  </div>
                  <figcaption className="mt-2 text-xs leading-snug text-cream-700">{pick(x.name)}</figcaption>
                </figure>
              </Rise>
            ))}
          </div>
        </div>
        <Reveal from="end">
          <blockquote className="relative rounded-[2rem] bg-kcc-green p-8 text-white shadow-soft-lg sm:p-10 dark:bg-[#1F5A40]">
            <Quote size={40} className="mb-4 text-[#7FD39A]" aria-hidden />
            <p className="font-serif text-2xl leading-snug sm:text-[1.7rem]">{pick(CASE.quote)}</p>
            <footer className="mt-6 flex items-center gap-3 text-sm text-white/80">
              <img src={STORY_IMG('uni')} alt="" className="h-10 w-10 rounded-full bg-white object-contain p-1" />
              {pick(CASE.who)}
            </footer>
            <p className="mt-4 text-[#F5C96A]" aria-label={pick({ en: 'Rated 5 out of 5', ar: 'تقييم 5 من 5' })}>★★★★★</p>
          </blockquote>
        </Reveal>
      </div>
    </section>
  );
}

/* ========================== Promise and contact ========================== */

export function PromiseSection() {
  const pick = usePick();
  const { t } = useLanguage();
  const { ref, y } = useParallax(70);
  return (
    <section ref={ref} className="relative isolate overflow-hidden bg-[#0F1712] py-24 text-white lg:py-32">
      <motion.img src={STORY_IMG('cityC')} alt="" loading="lazy" className="absolute inset-0 -z-10 h-[120%] w-full object-cover opacity-25" style={{ y }} />
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-[#0F1712] via-[#0F1712]/70 to-[#0F1712]" aria-hidden />
      <div className="page-shell">
        <div className="text-center">
          <WordsReveal text={pick(PROMISE.title)} className="font-serif text-5xl sm:text-6xl" />
          <Rise delay={0.2}><p className="mt-3 text-lg text-[#7FD39A]">{pick(PROMISE.sub)}</p></Rise>
          <div className="mx-auto mt-10 flex max-w-5xl flex-wrap justify-center gap-3">
            {PROMISE.items.map((x, i) => (
              <Rise key={i} delay={0.3 + i * 0.1}>
                <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm font-medium backdrop-blur-sm transition-colors hover:border-[#7FD39A] hover:bg-[#3AA05C]/20">
                  <Check size={15} className="text-[#7FD39A]" />
                  {pick(x)}
                </span>
              </Rise>
            ))}
          </div>
        </div>

        <Reveal className="mt-20">
          <div className="grid gap-8 rounded-[2rem] border border-white/10 bg-white/[0.05] p-8 backdrop-blur-sm sm:p-12 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-center">
            <div>
              <Eyebrow dark>{pick(PROMISE.contactEyebrow)}</Eyebrow>
              <h2 className="font-serif text-4xl leading-tight sm:text-5xl">{pick(PROMISE.contactTitle)}</h2>
              <p className="mt-3 text-[#7FD39A]">{pick(HERO.tagline)}</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Magnetic>
                  <Link href="/order/sample" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#3AA05C] px-6 py-3 text-sm font-semibold hover:bg-[#2f8a4d]">
                    {t('hero.requestSample')}
                    <ArrowRight size={16} className="rtl-flip" />
                  </Link>
                </Magnetic>
                <Link href="/contact" className="inline-flex min-h-11 items-center rounded-full border border-white/30 px-6 py-3 text-sm font-semibold hover:bg-white/10">
                  {t('nav.contact')}
                </Link>
              </div>
            </div>
            <div className="space-y-4 text-sm">
              <div>
                <p className="font-serif text-2xl">{pick(PROMISE.person)}</p>
                <p className="text-white/60">{pick(PROMISE.role)}</p>
              </div>
              <a href={`tel:${PROMISE.phone.replace(/\s/g, '')}`} className="inline-flex min-h-11 items-center gap-2 text-lg font-semibold text-[#7FD39A] hover:underline" dir="ltr">
                <Phone size={16} />
                {PROMISE.phone}
              </a>
              <p className="flex items-start gap-2 text-white/70"><Building2 size={16} className="mt-0.5 shrink-0" />{pick(LOCATIONS.office)}</p>
              <p className="flex items-start gap-2 text-white/70"><MapPin size={16} className="mt-0.5 shrink-0" />{pick({ en: `Plant · ${PROMISE.plant.en}`, ar: `المصنع · ${PROMISE.plant.ar}` })}</p>
              <p className="text-xs text-white/40">{pick(PROMISE.legal)}</p>
              <p className="text-xs uppercase tracking-[0.2em] text-white/40">{pick(PROMISE.group)}</p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
