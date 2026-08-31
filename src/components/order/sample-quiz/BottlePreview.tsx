'use client';

import { useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import PackageThumb from './widgets/packaging/PackageThumb';
import type { PackagingAnswer } from '@/lib/sample-quiz/types';

interface BottlePreviewProps {
  name: string;
  placeholder?: string;
  size?: 'lg' | 'md' | 'sm';
  /** Kept for the existing call sites; the render carries its own sparkle. */
  showSparkles?: boolean;
}

/**
 * The bottle with the customer's name on it, shown on the opening step and on
 * the thank-you screen.
 *
 * This used to composite the name over a flat product photo, which no longer
 * matched anything: the photo was a different bottle, a different colour, and
 * lying on its side. It is now the same renderer as the packaging studio, so
 * the bottle someone sees when they type their name is the bottle they will go
 * on to design — printed with the name they just typed.
 */

/** A calm, on-palette default. The studio is where the real choices happen. */
const HOUSE_PACK: PackagingAnswer = {
  bottle: 'bottle',
  cap: 'domed-cap',
  label: 'full-wrap',
  finish: 'glossy',
  color: 'blush',
};

export default function BottlePreview({ name, placeholder = 'your name', size = 'lg' }: BottlePreviewProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);

  // Gentle tilt that follows the pointer — enough to feel like an object,
  // not enough to look like a toy.
  const rotateX = useSpring(useTransform(my, [-0.5, 0.5], [7, -7]), { stiffness: 80, damping: 14 });
  const rotateY = useSpring(useTransform(mx, [-0.5, 0.5], [-9, 9]), { stiffness: 80, damping: 14 });

  function handleMove(e: React.MouseEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    mx.set((e.clientX - rect.left) / rect.width - 0.5);
    my.set((e.clientY - rect.top) / rect.height - 0.5);
  }

  const dimensions =
    size === 'lg'
      ? 'max-w-[420px] aspect-[3/4]'
      : size === 'md'
      ? 'max-w-[300px] aspect-[3/4]'
      : 'max-w-[200px] aspect-[3/4]';

  const displayName = name.trim() || placeholder;

  return (
    <div
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={() => {
        mx.set(0);
        my.set(0);
      }}
      className={`relative mx-auto w-full ${dimensions}`}
      style={{ perspective: 1200 }}
    >
      <div
        className="absolute inset-0 -z-10 rounded-full bg-gradient-to-tr from-kcc-rose-light/50 via-kcc-blush/40 to-kcc-beige-light/50 blur-3xl"
        style={{ transform: 'scale(0.82)' }}
      />

      <motion.div
        className="relative h-full w-full"
        style={{ rotateX, rotateY, transformStyle: 'preserve-3d' }}
      >
        <PackageThumb
          value={HOUSE_PACK}
          name={displayName}
          alt={displayName}
          className="h-full w-full object-contain"
        />
      </motion.div>
    </div>
  );
}
