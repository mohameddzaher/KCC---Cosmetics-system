'use client';

/**
 * Admin UI kit.
 *
 * Shared primitives so every admin screen looks like the same product and is
 * responsive by construction. All colours come from the semantic theme tokens
 * (`surface`, `fg`, `line`, `brand`, …) so each piece is correct in light AND
 * dark without a single conditional.
 *
 * Layout contract:
 *   • pages fill the available width — no fixed max-widths inside a page
 *   • anything that can overflow horizontally scrolls itself (`DataTable`)
 *   • grids use auto-fit so they gain columns on very large screens
 */

import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, Check, ChevronLeft, Loader2, X } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import Link from 'next/link';

/* ------------------------------------------------------------------ */
/* Page scaffolding                                                    */
/* ------------------------------------------------------------------ */

export function PageHeader({
  title,
  subtitle,
  backHref,
  backLabel,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  backHref?: string;
  backLabel?: string;
  actions?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-5 sm:mb-6">
      {backHref && (
        <Link
          href={backHref}
          className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-fg-muted transition-colors hover:text-fg"
        >
          <ChevronLeft size={14} className="rtl-flip" />
          {backLabel}
        </Link>
      )}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-bold leading-tight text-fg sm:text-2xl">{title}</h1>
          {subtitle && <p className="mt-1 max-w-3xl text-sm text-fg-muted">{subtitle}</p>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}

export function Card({
  children,
  className = '',
  padded = true,
  as: As = 'div',
}: {
  children: React.ReactNode;
  className?: string;
  padded?: boolean;
  as?: React.ElementType;
}) {
  return (
    <As className={`rounded-xl border border-line bg-surface ${padded ? 'p-4 sm:p-5' : ''} ${className}`}>
      {children}
    </As>
  );
}

export function SectionTitle({
  title,
  hint,
  actions,
}: {
  title: string;
  hint?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
      <div className="min-w-0">
        <h2 className="text-sm font-semibold text-fg">{title}</h2>
        {hint && <p className="mt-0.5 text-xs text-fg-muted">{hint}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}

/** Auto-fitting grid — gains columns on wide screens instead of stretching. */
export function AutoGrid({
  children,
  min = '16rem',
  gap = '0.75rem',
  className = '',
}: {
  children: React.ReactNode;
  min?: string;
  gap?: string;
  className?: string;
}) {
  return (
    <div
      className={`grid ${className}`}
      style={{ gridTemplateColumns: `repeat(auto-fit, minmax(min(${min}, 100%), 1fr))`, gap }}
    >
      {children}
    </div>
  );
}

export function EmptyState({
  title,
  hint,
  action,
  icon: Icon,
}: {
  title: string;
  hint?: string;
  action?: React.ReactNode;
  icon?: React.ElementType;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-line bg-surface px-6 py-12 text-center">
      {Icon && (
        <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-surface-2 text-fg-subtle">
          <Icon size={20} />
        </span>
      )}
      <p className="text-sm font-medium text-fg">{title}</p>
      {hint && <p className="mt-1 max-w-sm text-xs text-fg-muted">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Spinner({ label }: { label?: string }) {
  const { t } = useLanguage();
  return (
    <div className="flex items-center justify-center gap-2.5 p-10 text-sm text-fg-muted">
      <Loader2 size={16} className="animate-spin" />
      {label ?? t('admin.loading')}
    </div>
  );
}

export function ErrorNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-danger bg-danger-soft px-3 py-2.5 text-sm text-danger-soft-fg">
      <AlertCircle size={15} className="mt-0.5 shrink-0" />
      <span className="min-w-0">{children}</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Form controls                                                       */
/* ------------------------------------------------------------------ */

export function Field({
  label,
  hint,
  required,
  htmlFor,
  children,
  className = '',
}: {
  label: string;
  hint?: string;
  required?: boolean;
  htmlFor?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="field-label">
        {label}
        {required && <span className="ms-1 text-danger">*</span>}
      </label>
      {children}
      {hint && <p className="mt-1 text-[11px] leading-snug text-fg-subtle">{hint}</p>}
    </div>
  );
}

/** Text input already wired to the themed `.field` class. */
export const TextInput = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function TextInput({ className = '', ...props }, ref) {
    return <input ref={ref} className={`field ${className}`} {...props} />;
  }
);

export const TextArea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function TextArea({ className = '', ...props }, ref) {
    return <textarea ref={ref} className={`field ${className}`} {...props} />;
  }
);

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className = '', children, ...props }, ref) {
    return (
      <select ref={ref} className={`field ${className}`} {...props}>
        {children}
      </select>
    );
  }
);

/** Arabic-side input: RTL and the Arabic font, regardless of UI language. */
export function ArabicInput({ className = '', ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input dir="rtl" lang="ar" className={`field font-arabic ${className}`} {...props} />;
}

export function ArabicTextArea({ className = '', ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea dir="rtl" lang="ar" className={`field font-arabic ${className}`} {...props} />;
}

export function Toggle({
  label,
  hint,
  value,
  onChange,
  disabled,
}: {
  label: string;
  hint?: string;
  value: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      disabled={disabled}
      onClick={() => onChange(!value)}
      className="flex w-full items-start gap-2.5 text-start disabled:opacity-50"
    >
      <span
        className={`relative mt-0.5 inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
          value ? 'bg-brand' : 'bg-surface-3 border border-line'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
            value ? 'ltr:translate-x-4 rtl:-translate-x-4' : 'ltr:translate-x-0.5 rtl:-translate-x-0.5'
          }`}
        />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium leading-tight text-fg">{label}</span>
        {hint && <span className="mt-0.5 block text-[11px] leading-snug text-fg-muted">{hint}</span>}
      </span>
    </button>
  );
}

export function Badge({
  children,
  tone = 'neutral',
  className = '',
}: {
  children: React.ReactNode;
  tone?: 'neutral' | 'brand' | 'accent' | 'ok' | 'warn' | 'danger' | 'info';
  className?: string;
}) {
  return <span className={`badge badge-${tone} ${className}`}>{children}</span>;
}

/* ------------------------------------------------------------------ */
/* Data table — always scrolls itself, never the page                  */
/* ------------------------------------------------------------------ */

export function DataTable({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`overflow-hidden rounded-xl border border-line bg-surface ${className}`}>
      <div className="scroll-thin w-full overflow-x-auto">
        <table className="w-full min-w-[42rem] border-collapse text-sm">{children}</table>
      </div>
    </div>
  );
}

// Static map — Tailwind cannot see interpolated class names.
const ALIGN = { start: 'text-start', end: 'text-end', center: 'text-center' } as const;

export function Th({
  children,
  className = '',
  align = 'start',
}: {
  children?: React.ReactNode;
  className?: string;
  align?: keyof typeof ALIGN;
}) {
  return (
    <th
      className={`whitespace-nowrap border-b border-line bg-bg-subtle px-3 py-2.5 ${ALIGN[align]} text-[11px] font-semibold uppercase tracking-wide text-fg-muted ${className}`}
    >
      {children}
    </th>
  );
}

export function Td({
  children,
  className = '',
  align = 'start',
}: {
  children?: React.ReactNode;
  className?: string;
  align?: keyof typeof ALIGN;
}) {
  return <td className={`border-b border-line px-3 py-2.5 ${ALIGN[align]} text-fg ${className}`}>{children}</td>;
}

/* ------------------------------------------------------------------ */
/* Modal — portalled, scroll-locked, escape-closable, responsive       */
/* ------------------------------------------------------------------ */

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  size = 'lg',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}) {
  const { t } = useLanguage();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open || typeof document === 'undefined') return null;

  const width = {
    sm: 'max-w-md',
    md: 'max-w-2xl',
    lg: 'max-w-4xl',
    xl: 'max-w-6xl',
    full: 'max-w-[min(96rem,96vw)]',
  }[size];

  return createPortal(
    <div
      className="modal-overlay fixed inset-0 z-[100] flex items-end justify-center p-0 sm:items-center sm:p-4 lg:p-6"
      onMouseDown={(e) => {
        if (!panelRef.current?.contains(e.target as Node)) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        ref={panelRef}
        className={`flex max-h-[95dvh] w-full ${width} flex-col overflow-hidden rounded-t-2xl border border-line bg-surface shadow-soft-lg sm:max-h-[90dvh] sm:rounded-2xl`}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-line px-4 py-3.5 sm:px-6 sm:py-4">
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold text-fg sm:text-lg">{title}</h2>
            {subtitle && <p className="mt-0.5 text-xs text-fg-muted">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('ui.close')}
            className="-me-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-fg-muted hover:bg-surface-2 hover:text-fg"
          >
            <X size={18} />
          </button>
        </div>

        <div className="scroll-thin min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">{children}</div>

        {footer && (
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-line bg-surface px-4 py-3 sm:px-6">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

/* ------------------------------------------------------------------ */
/* Buttons                                                             */
/* ------------------------------------------------------------------ */

type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'accent' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ElementType;
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading,
  icon: Icon,
  children,
  className = '',
  disabled,
  ...props
}: BtnProps) {
  const sizeCls = size === 'sm' ? 'btn-sm' : size === 'lg' ? 'btn-lg' : '';
  return (
    <button
      className={`btn btn-${variant} ${sizeCls} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <Loader2 size={15} className="animate-spin" /> : Icon ? <Icon size={15} /> : null}
      {children}
    </button>
  );
}

export function SaveButton({
  onClick,
  saving,
  label,
  disabled,
}: {
  onClick: () => void;
  saving?: boolean;
  label?: string;
  disabled?: boolean;
}) {
  const { t } = useLanguage();
  return (
    <Button onClick={onClick} loading={saving} disabled={disabled} icon={Check}>
      {saving ? t('admin.saving') : label ?? t('ui.saveChanges')}
    </Button>
  );
}
