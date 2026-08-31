'use client';

import { Moon, Sun, Monitor } from 'lucide-react';
import { useTheme, type ThemePref } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';

const OPTIONS: Array<{ value: ThemePref; icon: typeof Sun; labelKey: string }> = [
  { value: 'light', icon: Sun, labelKey: 'theme.light' },
  { value: 'dark', icon: Moon, labelKey: 'theme.dark' },
  { value: 'system', icon: Monitor, labelKey: 'theme.system' },
];

/**
 * Theme switcher.
 *  - variant="segmented" → three-way light / dark / system rail (settings pages)
 *  - variant="icon"      → single button that flips light ⇄ dark (headers)
 */
export default function ThemeToggle({
  variant = 'icon',
  className = '',
}: {
  variant?: 'icon' | 'segmented';
  className?: string;
}) {
  const { theme, resolved, setTheme, toggle } = useTheme();
  const { t } = useLanguage();

  if (variant === 'segmented') {
    return (
      <div
        role="radiogroup"
        aria-label={t('theme.label')}
        className={`inline-flex items-center gap-1 rounded-xl border border-line bg-surface-2 p-1 ${className}`}
      >
        {OPTIONS.map((opt) => {
          const Icon = opt.icon;
          const active = theme === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setTheme(opt.value)}
              title={t(opt.labelKey)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                active
                  ? 'bg-surface text-fg shadow-soft'
                  : 'text-fg-muted hover:text-fg'
              }`}
            >
              <Icon size={14} />
              <span className="hidden sm:inline">{t(opt.labelKey)}</span>
            </button>
          );
        })}
      </div>
    );
  }

  const nextLabel = resolved === 'dark' ? t('theme.light') : t('theme.dark');
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={nextLabel}
      title={nextLabel}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-surface text-fg-muted transition-colors hover:text-fg hover:border-line-strong ${className}`}
    >
      {resolved === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}
