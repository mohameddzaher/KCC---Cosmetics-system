'use client';

import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react';
import { motion, useMotionValue, useMotionValueEvent, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { useCmsSection } from '@/lib/useCmsSection';
import { HERO_PRODUCT_IMAGE } from '@/lib/heroProduct';

/**
 * One product, carried down the home page.
 *
 * Each section marks where the product lands with a <ProductSlot>. This layer
 * measures those slots in page coordinates when the page loads or changes
 * size (never on a scroll frame), then turns the scroll position into a
 * single transform: the product rests in a slot while the slot is near the
 * middle of the screen, and flies to the next one in between, tilting and
 * turning on the way. Only transform and opacity change, so scrolling stays
 * on the compositor.
 *
 * Below 1024 px and under reduced motion there is no flight: the still image inside each slot
 * shows instead (see .product-static in globals.css).
 */

/** How each landing is posed: tilt, turn around the vertical axis, extra swing in flight. */
const POSE: Record<string, { rotate: number; rotateY: number; swing: number }> = {
  hero: { rotate: 0, rotateY: 0, swing: 0 },
  services: { rotate: 8, rotateY: 0, swing: -15 },
  stats: { rotate: -4, rotateY: 360, swing: 10 },
  vision: { rotate: -6, rotateY: 360, swing: -12 },
  process: { rotate: 4, rotateY: 360, swing: 8 },
  cta: { rotate: 0, rotateY: 360, swing: -6 },
};
const ORDER = Object.keys(POSE);

interface Key {
  name: string;
  /** Centre of the slot in page coordinates. */
  cx: number;
  cy: number;
  scale: number;
  rotate: number;
  rotateY: number;
  swing: number;
  /** Scroll positions between which the product rests in this slot. */
  from: number;
  to: number;
}

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

function subscribeWide(cb: () => void) {
  const mq = window.matchMedia('(min-width: 1024px)');
  mq.addEventListener('change', cb);
  return () => mq.removeEventListener('change', cb);
}

export default function TravellingProduct() {
  const reduce = useReducedMotion();
  const wide = useSyncExternalStore(subscribeWide, () => window.matchMedia('(min-width: 1024px)').matches, () => false);
  const travel = wide && !reduce;

  const { content } = useCmsSection('hero', { en: { productImage: '' }, ar: { productImage: '' } });
  const image = (content.productImage as string) || HERO_PRODUCT_IMAGE;

  // Still mode is a class on <html>: the slots show their own image.
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('product-static', !travel);
    return () => root.classList.remove('product-static');
  }, [travel]);

  // A product photo set in the CMS replaces the still images too.
  useEffect(() => {
    if (image === HERO_PRODUCT_IMAGE) return;
    document.querySelectorAll<HTMLImageElement>('[data-product-slot] .product-static-img').forEach((img) => {
      img.src = image;
    });
  }, [image]);

  const { scrollY } = useScroll();
  const keys = useRef<Key[]>([]);
  const base = useRef({ w: 0, h: 0 });
  /** The longest flight, in scroll pixels: over a long stretch the product
   *  stays in its section and only flies for the last part, rather than
   *  hanging over the content in between. */
  const maxFlight = useRef(1000);

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const scale = useMotionValue(1);
  const rotate = useMotionValue(0);
  const rotateY = useMotionValue(0);
  const landed = useMotionValue(1);
  const visible = useMotionValue(0);
  const width = useMotionValue(0);
  const height = useMotionValue(0);

  const apply = useCallback((scroll: number) => {
    const k = keys.current;
    if (k.length === 0) return;
    let cx = k[0].cx, cy = k[0].cy, s = k[0].scale, r = k[0].rotate, ry = k[0].rotateY, land = 1;
    const last = k[k.length - 1];
    if (scroll >= last.from) {
      ({ cx, cy, scale: s, rotate: r, rotateY: ry } = last);
    } else {
      for (let i = 0; i < k.length - 1; i++) {
        const a = k[i], b = k[i + 1];
        if (scroll <= a.to) {
          ({ cx, cy, scale: s, rotate: r, rotateY: ry } = a);
          break;
        }
        if (scroll < b.from) {
          const start = Math.max(a.to, b.from - maxFlight.current);
          if (scroll <= start) {
            ({ cx, cy, scale: s, rotate: r, rotateY: ry } = a);
            break;
          }
          const t = (scroll - start) / Math.max(1, b.from - start);
          const e = ease(t);
          const arc = Math.sin(Math.PI * t);
          cx = lerp(a.cx, b.cx, e);
          cy = lerp(a.cy, b.cy, e);
          s = lerp(a.scale, b.scale, e) * (1 - 0.08 * arc);
          r = lerp(a.rotate, b.rotate, e) + b.swing * arc;
          ry = lerp(a.rotateY, b.rotateY, e);
          land = 1 - arc;
          break;
        }
      }
    }
    x.set(cx - base.current.w / 2);
    y.set(cy - scroll - base.current.h / 2);
    scale.set(s);
    rotate.set(r);
    rotateY.set(ry);
    landed.set(land);
  }, [x, y, scale, rotate, rotateY, landed]);

  // Measure the slots: on load, on resize, and when the page's height changes
  // (images and CMS copy arriving). Never per scroll frame.
  useEffect(() => {
    if (!travel) return;
    let frame = 0;
    const measure = () => {
      frame = 0;
      const vh = window.innerHeight;
      const maxScroll = Math.max(0, document.documentElement.scrollHeight - vh);
      const found: Array<Omit<Key, 'from' | 'to'> & { anchor: number }> = [];
      for (const name of ORDER) {
        const el = document.querySelector<HTMLElement>(`[data-product-slot="${name}"]`);
        if (!el) continue;
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;
        const cy = r.top + window.scrollY + r.height / 2;
        found.push({
          name, cx: r.left + r.width / 2, cy, scale: 1, ...POSE[name],
          anchor: Math.min(maxScroll, Math.max(0, cy - vh / 2)),
        });
      }
      if (found.length === 0) return;
      const first = document.querySelector<HTMLElement>(`[data-product-slot="${found[0].name}"]`)!.getBoundingClientRect();
      base.current = { w: first.width, h: first.height };
      width.set(first.width);
      height.set(first.height);
      const hold = vh * 0.16;
      maxFlight.current = vh * 1.3;
      keys.current = found.map((f, i) => {
        const el = document.querySelector<HTMLElement>(`[data-product-slot="${f.name}"]`)!.getBoundingClientRect();
        const prev = found[i - 1];
        const next = found[i + 1];
        // Rest around the slot's own scroll position, never overlapping a neighbour's rest.
        const from = i === 0 ? 0 : Math.max(f.anchor - hold, (prev.anchor + f.anchor) / 2);
        const to = next ? Math.min(f.anchor + hold, (f.anchor + next.anchor) / 2) : Number.MAX_SAFE_INTEGER;
        return { ...f, scale: el.width / first.width, from, to };
      });
      apply(window.scrollY);
      visible.set(1);
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(measure); };
    schedule();
    const ro = new ResizeObserver(schedule);
    ro.observe(document.body);
    window.addEventListener('resize', schedule);
    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
      window.removeEventListener('resize', schedule);
    };
  }, [travel, apply, visible, width, height]);

  useMotionValueEvent(scrollY, 'change', (v) => { if (travel) apply(v); });

  const shadowOpacity = useTransform(landed, [0, 1], [0.12, 0.35]);
  const shadowScale = useTransform(landed, [0, 1], [0.6, 1]);
  // The light runs across the glass as it turns.
  const sweep = useTransform([rotate, rotateY], ([r, ry]: number[]) => `${-60 + ((r * 4 + ry / 3) % 200)}%`);

  if (!travel) return null;

  return (
    <motion.div
      aria-hidden
      className="pointer-events-none fixed left-0 top-0 z-30"
      style={{ x, y, width, height, opacity: visible, willChange: 'transform', perspective: 900 }}
    >
      <motion.div className="relative h-full w-full" style={{ scale }}>
      <motion.div className="relative h-full w-full" style={{ rotate, rotateY, transformStyle: 'preserve-3d' }}>
        <div className="travel-float h-full w-full">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image} alt="" className="h-full w-full object-contain" decoding="async" draggable={false} />
          {/* Specular highlight, clipped to the product's own outline. */}
          <motion.div
            className="absolute inset-0"
            style={{
              WebkitMaskImage: `url(${image})`,
              maskImage: `url(${image})`,
              WebkitMaskSize: 'contain',
              maskSize: 'contain',
              WebkitMaskRepeat: 'no-repeat',
              maskRepeat: 'no-repeat',
              WebkitMaskPosition: 'center',
              maskPosition: 'center',
              backgroundImage: 'linear-gradient(105deg, transparent 35%, rgba(255,255,255,0.45) 50%, transparent 65%)',
              backgroundSize: '250% 100%',
              backgroundPositionX: sweep,
              mixBlendMode: 'screen',
            }}
          />
        </div>
      </motion.div>
      {/* Shadow: dark and close when it rests, faint and narrow in flight. It
          scales with the product but does not turn with it. */}
      <motion.div
        className="absolute -bottom-[3%] left-[15%] h-[4%] w-[70%] rounded-[50%] bg-black blur-md"
        style={{ opacity: shadowOpacity, scaleX: shadowScale }}
      />
      </motion.div>
    </motion.div>
  );
}
