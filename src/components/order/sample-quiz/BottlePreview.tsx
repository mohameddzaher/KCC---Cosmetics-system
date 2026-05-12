'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'framer-motion';

interface BottlePreviewProps {
  name: string;
  placeholder?: string;
  size?: 'lg' | 'md' | 'sm';
  showSparkles?: boolean;
}

/**
 * BottlePreview
 * - Renders the brand bottle (public/images/bottle.png) with the customer's
 *   name overlaid in serif white type.
 * - 3D tilt that follows mouse position (disabled on touch devices).
 * - Sparkle particles bloom around the bottle once a name is typed.
 *
 * Reused in Phase 1, Phase 5 review, and Thank-you screen.
 */
export default function BottlePreview({ name, placeholder = 'your name', size = 'lg', showSparkles = true }: BottlePreviewProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);

  // Tilt limits — gentle so it stays elegant
  const rotateX = useSpring(useTransform(my, [-0.5, 0.5], [8, -8]), { stiffness: 80, damping: 14 });
  const rotateY = useSpring(useTransform(mx, [-0.5, 0.5], [-10, 10]), { stiffness: 80, damping: 14 });

  const [hasInteracted, setHasInteracted] = useState(false);

  function handleMove(e: React.MouseEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    mx.set(x);
    my.set(y);
    if (!hasInteracted) setHasInteracted(true);
  }

  function handleLeave() {
    mx.set(0);
    my.set(0);
  }

  // Small set of sparkle positions, computed once.
  const sparkles = useMemo(() => {
    return Array.from({ length: 14 }).map((_, i) => ({
      id: i,
      // polar position around the bottle, radius 38–58% from center
      angle: (i / 14) * Math.PI * 2 + (i % 2) * 0.4,
      radius: 38 + ((i * 7) % 22),
      delay: (i % 7) * 0.18,
      duration: 2 + ((i * 13) % 18) / 10,
      sizePx: 4 + (i % 3) * 2,
    }));
  }, []);

  const dimensions =
    size === 'lg'
      ? 'max-w-[460px] aspect-[3/4]'
      : size === 'md'
      ? 'max-w-[320px] aspect-[3/4]'
      : 'max-w-[220px] aspect-[3/4]';

  const displayName = name.trim() || placeholder;

  return (
    <div
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      className={`relative mx-auto w-full ${dimensions}`}
      style={{ perspective: 1200 }}
    >
      {/* Soft halo behind */}
      <div
        className="absolute inset-0 -z-10 rounded-full blur-3xl bg-gradient-to-tr from-kcc-rose-light/60 via-kcc-blush/50 to-kcc-beige-light/60"
        style={{ transform: 'scale(0.85)' }}
      />

      <motion.div
        className="relative w-full h-full"
        style={{ rotateX, rotateY, transformStyle: 'preserve-3d' }}
      >
        {/* Sparkles — only after name is typed */}
        {showSparkles && name.trim().length > 0 && (
          <div className="absolute inset-0 pointer-events-none">
            {sparkles.map((s) => {
              const cx = 50 + Math.cos(s.angle) * s.radius;
              const cy = 50 + Math.sin(s.angle) * s.radius;
              return (
                <motion.span
                  key={s.id}
                  className="absolute rounded-full bg-kcc-rose-dark"
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{
                    opacity: [0, 1, 0],
                    scale: [0, 1, 0],
                    y: [0, -10, -16],
                  }}
                  transition={{
                    duration: s.duration,
                    repeat: Infinity,
                    delay: s.delay,
                    ease: 'easeInOut',
                  }}
                  style={{
                    left: `${cx}%`,
                    top: `${cy}%`,
                    width: s.sizePx,
                    height: s.sizePx,
                    boxShadow: '0 0 12px rgba(216,155,163,0.7)',
                  }}
                />
              );
            })}
          </div>
        )}

        {/* The bottle image */}
        <img
          src="/images/bottle.png"
          alt="KCC sample bottle"
          className="relative w-full h-full object-contain drop-shadow-[0_30px_50px_rgba(89,70,52,0.25)]"
          draggable={false}
        />

        {/* Name overlay — sits on the bottle's label area, just below the "function of" line */}
        <div
          className="absolute inset-x-0 pointer-events-none flex items-center justify-center"
          style={{
            top: '50%',
            transform: 'translateZ(20px)',
          }}
        >
          <AnimatePresence mode="wait">
            <motion.span
              key={displayName + (name.trim().length > 0 ? '_real' : '_ph')}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.32 }}
              className={`font-serif italic text-center tracking-wide leading-none select-none ${
                name.trim() ? 'text-cream-50' : 'text-cream-50/55'
              }`}
              style={{
                fontSize: size === 'lg' ? 'clamp(22px, 4vw, 38px)' : size === 'md' ? '24px' : '18px',
                textShadow: '0 2px 12px rgba(0,0,0,0.35)',
                maxWidth: '78%',
                wordBreak: 'break-word',
              }}
            >
              {displayName}
            </motion.span>
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
