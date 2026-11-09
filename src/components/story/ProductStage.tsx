'use client';

import { useRef } from 'react';
import {
  motion, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform, type MotionValue,
} from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { HERO_PRODUCT_IMAGE, HERO_PRODUCT_RATIO } from '@/lib/heroProduct';
import { FORMULATEX, MAKE, PLANT, STORY_IMG, type Pair } from '@/lib/storyContent';
import { usePick } from './primitives';

/* eslint-disable @next/next/no-img-element -- local, sized images */

/**
 * The product, on a pinned stage, told in four scenes as the reader scrolls:
 *
 *   1. it drops in, lands with a ripple and hovers, formula bubbling up behind it
 *   2. the four textures orbit it (in front of it and behind it)
 *   3. it steps aside for the five steps from concept to sample
 *   4. it comes back, settles below the words, and opens onto the Jeddah plant
 *
 * The scroll position is passed through a spring before anything reads it, so
 * every movement glides rather than following the wheel's steps. Only
 * transform, opacity and one clip-path change. Reduced motion gets the same
 * content as a still composition.
 */

const SCENES: Array<{ word: Pair; eyebrow: Pair; line: Pair; at: [number, number] }> = [
  { word: { en: 'Formulated', ar: 'تركيبتك' }, eyebrow: { en: 'Brand by KCC', ar: 'علامتك من KCC' }, line: { en: 'Your brand. Your product brief. Formulated with you.', ar: 'علامتك. وفكرة منتجك. تُركَّب معك.' }, at: [0.0, 0.26] },
  { word: { en: 'Every texture', ar: 'كل قوام' }, eyebrow: MAKE.textures.eyebrow, line: MAKE.textures.title, at: [0.26, 0.5] },
  { word: { en: 'Connected', ar: 'متصلون' }, eyebrow: FORMULATEX.eyebrow, line: { en: 'From concept to sample, tracked online at every step.', ar: 'من الفكرة إلى العينة، مع تتبع كل خطوة عبر الإنترنت.' }, at: [0.5, 0.76] },
  { word: { en: 'Made in Jeddah', ar: 'صُنع في جدة' }, eyebrow: PLANT.eyebrow, line: { en: '40 million units a year, from the first phase. Operating from January 2027.', ar: '40 مليون وحدة سنويًا منذ المرحلة الأولى. يبدأ التشغيل في يناير 2027.' }, at: [0.82, 1.01] },
];

/** Fixed, so the server and the browser draw the same bubbles. */
const BUBBLES = [
  { x: 12, size: 30, dur: 9, delay: 0, drift: 2 }, { x: 22, size: 17, dur: 7, delay: -3, drift: -1 },
  { x: 30, size: 44, dur: 11, delay: -6, drift: 3 }, { x: 40, size: 22, dur: 8, delay: -1.5, drift: -2 },
  { x: 58, size: 26, dur: 10, delay: -4.5, drift: 2 }, { x: 66, size: 48, dur: 12, delay: -8, drift: -3 },
  { x: 74, size: 19, dur: 7.5, delay: -2, drift: 1 }, { x: 84, size: 35, dur: 9.5, delay: -5.5, drift: -2 },
  { x: 48, size: 15, dur: 6.5, delay: -3.8, drift: 1 }, { x: 92, size: 24, dur: 8.5, delay: -7, drift: -1 },
];

function useWindow4(p: MotionValue<number>, [a, b]: [number, number], fade = 0.04) {
  return {
    opacity: useTransform(p, [a - fade, a, b - fade, b], [0, 1, 1, 0]),
    y: useTransform(p, [a - fade, a, b - fade, b], [60, 0, 0, -60]),
  };
}

function GiantWord({ p, scene, first }: { p: MotionValue<number>; scene: (typeof SCENES)[number]; first: boolean }) {
  const pick = usePick();
  const { opacity, y } = useWindow4(p, scene.at);
  // The first word is already there when the stage arrives.
  const firstOpacity = useTransform(p, [0, 0.22, 0.26], [1, 1, 0]);
  const o = first ? firstOpacity : opacity;
  return (
    <motion.span
      style={{ opacity: o, y }}
      className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 select-none whitespace-nowrap text-center font-serif text-[clamp(4rem,15vw,15rem)] leading-none tracking-tight text-transparent [-webkit-text-stroke:1.5px_rgba(45,106,79,0.35)] rtl:font-arabic rtl:font-bold"
      aria-hidden
    >
      {pick(scene.word)}
    </motion.span>
  );
}

function Caption({ p, scene, dark = false }: { p: MotionValue<number>; scene: (typeof SCENES)[number]; dark?: boolean }) {
  const pick = usePick();
  const { opacity, y } = useWindow4(p, scene.at, 0.035);
  return (
    <motion.div style={{ opacity, y }} className="absolute inset-x-0 top-[12svh] z-30 px-6 text-center">
      <p className={`text-[0.6875rem] font-bold uppercase tracking-[0.28em] ${dark ? 'text-[#7FD39A]' : 'text-kcc-green'}`}>{pick(scene.eyebrow)}</p>
      <p className={`mx-auto mt-3 max-w-xl font-serif text-2xl leading-snug sm:text-3xl ${dark ? 'text-white' : 'text-ink-800'}`}>{pick(scene.line)}</p>
    </motion.div>
  );
}

/** One texture on its orbit: in front of the bottle on the near side, behind it on the far side. */
function Orbiter({ p, i, img, label }: { p: MotionValue<number>; i: number; img: string; label: string }) {
  const angle = useTransform(p, [0.22, 0.54], [i * 90 - 40, i * 90 + 140]);
  const x = useTransform(angle, (a) => `${Math.cos((a * Math.PI) / 180) * 34}vmin`);
  const y = useTransform(angle, (a) => `${Math.sin((a * Math.PI) / 180) * 15}vmin`);
  const depth = useTransform(angle, (a) => Math.sin((a * Math.PI) / 180));
  const scale = useTransform(depth, [-1, 1], [0.7, 1.15]);
  const z = useTransform(depth, (d) => (d > 0 ? 30 : 5));
  const opacity = useTransform(p, [0.22, 0.28, 0.47, 0.53], [0, 1, 1, 0]);
  return (
    <motion.div style={{ x, y, scale, zIndex: z, opacity }} className="absolute left-1/2 top-1/2 -ml-[11vmin] -mt-[8vmin] w-[22vmin]">
      <div className="story-bob" style={{ animationDelay: `${i * -1.6}s` }}>
        <img src={STORY_IMG(img)} alt="" className="w-full rounded-[1.5rem] mix-blend-multiply dark:mix-blend-normal" />
        <p className="mt-1 text-center text-xs font-semibold text-kcc-green sm:text-sm">{label}</p>
      </div>
    </motion.div>
  );
}

function Step({ p, i, n, title, text }: { p: MotionValue<number>; i: number; n: number; title: string; text: string }) {
  const start = 0.53 + (i / n) * 0.14;
  const opacity = useTransform(p, [start, start + 0.03, 0.72, 0.77], [0, 1, 1, 0]);
  const { isRTL } = useLanguage();
  const x = useTransform(p, [start, start + 0.04], [isRTL ? -40 : 40, 0]);
  return (
    <motion.li style={{ opacity, x }} className="flex gap-4 rounded-2xl border border-cream-300 bg-surface/90 p-4 shadow-soft backdrop-blur-sm">
      <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-kcc-green text-xs font-bold text-white">0{i + 1}</span>
      <div>
        <p className="font-semibold text-ink-800">{title}</p>
        <p className="text-sm text-cream-700">{text}</p>
      </div>
    </motion.li>
  );
}

export default function ProductStage() {
  const pick = usePick();
  const { isRTL } = useLanguage();
  const reduce = useReducedMotion();
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] });
  // The glide: the stage follows the scroll through a spring.
  const p = useSpring(scrollYProgress, { stiffness: 70, damping: 22, mass: 0.6 });
  const side = isRTL ? 1 : -1;

  // At the end it settles a little lower, leaving the words above it clear.
  const bottleY = useTransform(p, [0, 0.16, 0.86, 1], ['-95svh', '0svh', '0svh', '8svh']);
  const bottleX = useTransform(p, [0.5, 0.56, 0.74, 0.8], ['0vw', `${side * 22}vw`, `${side * 22}vw`, '0vw']);
  const bottleRot = useTransform(p, [0, 0.16, 0.3, 0.45, 0.56, 0.74, 0.82], [-22, 0, 4, -3, -6, -6, 0]);
  const bottleScale = useTransform(p, [0, 0.16, 0.5, 0.56, 0.8, 0.92, 1], [0.8, 1, 1, 0.9, 0.9, 1, 1.02]);
  // Squash and stretch: long while it falls, a little flat as it lands, then itself.
  const bottleScaleY = useTransform(p, [0, 0.13, 0.165, 0.2], [1.06, 1.06, 0.93, 1]);
  const ripple1 = useTransform(p, [0.15, 0.26], [0.3, 2.4]);
  const ripple1o = useTransform(p, [0.15, 0.17, 0.26], [0, 0.45, 0]);
  const ripple2 = useTransform(p, [0.17, 0.3], [0.3, 3]);
  const ripple2o = useTransform(p, [0.17, 0.19, 0.3], [0, 0.3, 0]);
  const bubblesOpacity = useTransform(p, [0.14, 0.2, 0.46, 0.52], [0, 1, 1, 0]);
  const shadowScale = useTransform(p, [0, 0.14, 0.16, 1], [0.2, 0.9, 1, 1]);
  const shadowOpacity = useTransform(p, [0, 0.14, 0.16], [0, 0.25, 0.35]);
  const sweep = useTransform(p, [0, 1], ['-120%', '220%']);
  const reveal = useTransform(p, [0.76, 0.9], ['circle(0% at 50% 55%)', 'circle(85% at 50% 55%)']);
  const plantOpacity = useTransform(p, [0.76, 0.79], [0, 1]);
  const progress = useTransform(p, [0, 1], ['0%', '100%']);

  // A small lean toward the pointer, on top of the scroll movement.
  const tiltX = useMotionValue(0);
  const tiltY = useMotionValue(0);
  const rotX = useSpring(tiltX, { stiffness: 120, damping: 14 });
  const rotY = useSpring(tiltY, { stiffness: 120, damping: 14 });

  if (reduce) {
    return (
      <section className="bg-cream-50 py-20">
        <div className="page-shell grid items-center gap-10 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)]">
          <img src={HERO_PRODUCT_IMAGE} alt={pick({ en: 'A KCC bottle, made in Saudi Arabia', ar: 'عبوة من KCC، صُنعت في السعودية' })} className="mx-auto w-48" />
          <div className="space-y-6">
            {SCENES.map((s, i) => (
              <div key={i}>
                <p className="text-[0.6875rem] font-bold uppercase tracking-[0.28em] text-kcc-green">{pick(s.eyebrow)}</p>
                <p className="mt-1 font-serif text-2xl text-ink-800">{pick(s.line)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section ref={ref} className="relative h-[460svh] bg-cream-50" aria-label={pick({ en: 'The KCC product, from brief to Jeddah', ar: 'منتج KCC، من الفكرة إلى جدة' })}>
      <div
        className="sticky top-0 h-[100svh] overflow-hidden"
        onPointerMove={(e) => {
          if (e.pointerType !== 'mouse') return;
          tiltY.set((e.clientX / window.innerWidth - 0.5) * 16);
          tiltX.set(-(e.clientY / window.innerHeight - 0.5) * 10);
        }}
        onPointerLeave={() => { tiltX.set(0); tiltY.set(0); }}
      >
        {/* Soft studio light. */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_60%,rgba(45,106,79,0.10),transparent_60%),radial-gradient(ellipse_at_50%_100%,rgba(200,162,74,0.10),transparent_55%)]" aria-hidden />

        {/* Scene 4 ends by opening onto the plant. */}
        <motion.div className="absolute inset-0" style={{ clipPath: reveal, opacity: plantOpacity }} aria-hidden>
          <img src={STORY_IMG('cover')} alt="" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(10,22,14,0.82)_0%,rgba(10,22,14,0.35)_30%,rgba(10,22,14,0.1)_55%,rgba(10,22,14,0.75)_100%)]" />
        </motion.div>

        {SCENES.map((s, i) => <GiantWord key={i} p={p} scene={s} first={i === 0} />)}
        {/* Bubbles of formula rising behind the product. */}
        <motion.div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 mx-auto h-full w-[min(40rem,80vw)]" style={{ opacity: bubblesOpacity }} aria-hidden>
          {BUBBLES.map((b, i) => (
            <span
              key={i}
              className="story-bubble absolute bottom-[18svh] rounded-full border border-kcc-green/25 bg-[radial-gradient(circle_at_32%_28%,rgba(255,255,255,0.95)_0_12%,rgba(127,211,154,0.28)_45%,rgba(45,106,79,0.08)_70%,transparent)] shadow-[inset_-2px_-3px_8px_rgba(45,106,79,0.18)]"
              style={{ left: `${b.x}%`, width: b.size, height: b.size, ['--dur' as string]: `${b.dur}s`, ['--delay' as string]: `${b.delay}s`, ['--drift' as string]: `${b.drift}vw` }}
            />
          ))}
        </motion.div>

        {SCENES.map((s, i) => <Caption key={i} p={p} scene={s} dark={i === SCENES.length - 1} />)}

        {MAKE.textures.items.map((t, i) => (
          <Orbiter key={t.img} p={p} i={i} img={t.img} label={pick(t.name)} />
        ))}

        {/* The bottle. */}
        <motion.div
          className="absolute left-1/2 top-1/2 z-20"
          style={{ x: bottleX, y: bottleY, rotate: bottleRot, scale: bottleScale, width: 'min(19vmin, 15rem)', marginLeft: 'calc(min(19vmin, 15rem) / -2)', marginTop: `calc(min(19vmin, 15rem) / ${HERO_PRODUCT_RATIO} / -2 + 2svh)` }}
        >
          <motion.div style={{ rotateX: rotX, rotateY: rotY, transformPerspective: 900, scaleY: bottleScaleY, originY: 1 }}>
            <div className="story-levitate relative">
              <img src={HERO_PRODUCT_IMAGE} alt={pick({ en: 'A KCC bottle, made in Saudi Arabia', ar: 'عبوة من KCC، صُنعت في السعودية' })} className="relative w-full drop-shadow-[0_30px_40px_rgba(15,23,18,0.25)]" draggable={false} />
              {/* Light running over the plastic, kept inside the bottle's outline. */}
              <div
                className="pointer-events-none absolute inset-0 overflow-hidden"
                style={{ WebkitMaskImage: `url(${HERO_PRODUCT_IMAGE})`, maskImage: `url(${HERO_PRODUCT_IMAGE})`, WebkitMaskSize: '100% 100%', maskSize: '100% 100%' }}
                aria-hidden
              >
                <motion.div className="absolute inset-y-0 w-1/2 bg-[linear-gradient(100deg,transparent,rgba(255,255,255,0.55),transparent)] mix-blend-screen" style={{ x: sweep }} />
              </div>
            </div>
          </motion.div>
          <motion.div className="relative mx-auto -mt-2 h-4 w-[85%]" style={{ scaleX: shadowScale, opacity: shadowOpacity }} aria-hidden>
            <div className="story-shadow-breathe h-full w-full rounded-[50%] bg-black blur-lg" />
          </motion.div>
          {/* Where it lands, the floor ripples. */}
          <motion.div className="absolute bottom-0 left-1/2 -ml-[50%] h-6 w-full rounded-[50%] border border-kcc-green/60" style={{ scale: ripple1, opacity: ripple1o }} aria-hidden />
          <motion.div className="absolute bottom-0 left-1/2 -ml-[50%] h-6 w-full rounded-[50%] border border-kcc-green/40" style={{ scale: ripple2, opacity: ripple2o }} aria-hidden />
        </motion.div>

        {/* Scene 3: the five steps beside the bottle. */}
        <ol className="absolute top-1/2 z-10 w-[min(26rem,44vw)] -translate-y-1/2 space-y-3 ltr:right-[8vw] rtl:left-[8vw] max-md:inset-x-4 max-md:top-auto max-md:bottom-[6svh] max-md:w-auto max-md:translate-y-0">
          {FORMULATEX.steps.map((s, i) => (
            <Step key={i} p={p} i={i} n={FORMULATEX.steps.length} title={pick(s.title)} text={pick(s.text)} />
          ))}
        </ol>

        {/* Where the reader is in the scene. */}
        <div className="absolute bottom-6 left-1/2 h-1 w-40 -translate-x-1/2 overflow-hidden rounded-full bg-kcc-green/15" aria-hidden>
          <motion.div className="h-full rounded-full bg-kcc-green" style={{ width: progress }} />
        </div>
      </div>
    </section>
  );
}
