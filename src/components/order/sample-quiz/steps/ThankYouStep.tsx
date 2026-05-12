'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import BottlePreview from '../BottlePreview';
import { useQuiz } from '@/lib/sample-quiz/QuizContext';

interface Confetto {
  id: number;
  x: number;
  rotate: number;
  delay: number;
  duration: number;
  color: string;
}

const confettiColors = ['#D89BA3', '#E8B4BC', '#D4A574', '#C9A84C', '#FFF6F1', '#43301F'];

export default function ThankYouStep() {
  const { state } = useQuiz();
  const [confetti, setConfetti] = useState<Confetto[]>([]);

  useEffect(() => {
    const items: Confetto[] = Array.from({ length: 36 }).map((_, i) => ({
      id: i,
      x: (i * 37) % 100,
      rotate: (i * 47) % 360,
      delay: (i % 9) * 0.05,
      duration: 1.4 + (i % 5) * 0.2,
      color: confettiColors[i % confettiColors.length],
    }));
    setConfetti(items);
  }, []);

  return (
    <div className="min-h-[calc(100vh-220px)] flex items-center justify-center px-6 py-16 bg-gradient-to-br from-cream-100 via-blush-50 to-cream-50 overflow-hidden relative">
      {/* Confetti */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {confetti.map((c) => (
          <motion.span
            key={c.id}
            className="absolute top-[-20px] block rounded-sm"
            style={{
              left: `${c.x}%`,
              width: 8,
              height: 12,
              backgroundColor: c.color,
            }}
            initial={{ y: -40, opacity: 1, rotate: c.rotate }}
            animate={{ y: '110vh', rotate: c.rotate + 720, opacity: [1, 1, 0] }}
            transition={{
              duration: c.duration,
              delay: c.delay,
              ease: 'easeIn',
            }}
          />
        ))}
      </div>

      <div className="relative z-10 w-full max-w-3xl text-center">
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.1 }}
        >
          <BottlePreview name={state.customerName} size="md" />
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-10 text-[11px] font-medium uppercase tracking-[0.32em] text-kcc-rose-dark"
        >
          Sample request submitted
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55 }}
          className="mt-4 font-serif text-4xl sm:text-5xl lg:text-6xl text-ink-800 leading-[1.05]"
        >
          You&apos;re officially in motion, {state.customerName}.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="mt-5 text-cream-800 text-base sm:text-lg max-w-xl mx-auto"
        >
          Our R&amp;D team will start crafting your sample. You&apos;ll hear from us within 2–4 weeks.
        </motion.p>

        {state.submitted && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.85 }}
            className="mt-8 inline-flex flex-col items-center gap-1.5 px-6 py-4 rounded-2xl bg-white shadow-soft border border-cream-300"
          >
            <span className="text-[10px] font-semibold uppercase tracking-[0.3em] text-cream-700">
              Reference number
            </span>
            <span className="font-mono text-2xl text-ink-800 tracking-wider">
              {state.submitted.orderNumber}
            </span>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.0 }}
          className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <Link
            href="/account/my-samples"
            className="inline-flex items-center justify-center gap-3 px-8 py-3.5 text-[13px] font-semibold uppercase tracking-[0.22em] rounded-full bg-espresso-900 text-cream-50 hover:bg-espresso-700 transition-all shadow-soft-lg"
          >
            View My Samples
          </Link>
          <Link
            href="/"
            className="inline-flex items-center justify-center px-8 py-3.5 text-[13px] font-semibold uppercase tracking-[0.22em] rounded-full bg-transparent border border-cream-400 text-ink-700 hover:border-ink-700 transition-all"
          >
            Back to Home
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
