'use client';

import { Eye, EyeOff } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

/**
 * The show/hide control that sits inside a password field.
 *
 * Positioned with `end-3` rather than `right-3`, so it lands on the right in
 * English and on the left in Arabic without a second rule — the same logical
 * property the field's leading icon already uses.
 *
 * The field it sits in needs padding on that side (`pe-12`) so typed text
 * never runs underneath it.
 */
export default function PasswordToggle({
  shown,
  onToggle,
  className = '',
}: {
  shown: boolean;
  onToggle: () => void;
  className?: string;
}) {
  const { tx } = useLanguage();
  const label = shown ? tx('Hide password') : tx('Show password');

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={label}
      aria-pressed={shown}
      title={label}
      // tabIndex -1 would hide it from keyboard users; it stays reachable.
      className={`absolute end-3 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-fg-subtle transition-colors hover:text-fg ${className}`}
    >
      {shown ? <EyeOff size={17} /> : <Eye size={17} />}
    </button>
  );
}
