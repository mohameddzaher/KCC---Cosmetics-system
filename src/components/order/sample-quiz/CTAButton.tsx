'use client';

import { ButtonHTMLAttributes, forwardRef } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

type Variant = 'primary' | 'ghost';

interface CTAButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  label?: string;
  variant?: Variant;
  withArrow?: boolean;
  pulse?: boolean;        // subtle pulse to draw attention when newly enabled
}

const CTAButton = forwardRef<HTMLButtonElement, CTAButtonProps>(function CTAButton(
  { label = 'Next', variant = 'primary', withArrow = true, pulse = false, disabled, className = '', ...rest },
  ref
) {
  const base =
    'group inline-flex items-center justify-center gap-3 px-9 py-4 text-[13px] font-semibold uppercase tracking-[0.22em] rounded-full transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed';

  const styles =
    variant === 'primary'
      ? 'bg-espresso-900 text-cream-50 hover:bg-espresso-700 shadow-soft-lg hover:shadow-rose hover:-translate-y-0.5'
      : 'bg-transparent text-ink-700 hover:bg-cream-200/70 border border-cream-400 hover:border-ink-700';

  return (
    <motion.div
      animate={pulse && !disabled ? { scale: [1, 1.025, 1] } : { scale: 1 }}
      transition={{ duration: 1.3, repeat: pulse ? Infinity : 0, ease: 'easeInOut' }}
      className="inline-block"
    >
      <button
        ref={ref}
        type="button"
        disabled={disabled}
        className={`${base} ${styles} ${className}`}
        {...rest}
      >
        <span>{label}</span>
        {withArrow && (
          <ArrowRight
            size={16}
            className="transition-transform duration-300 group-hover:translate-x-1 rtl-flip"
          />
        )}
      </button>
    </motion.div>
  );
});

export default CTAButton;
