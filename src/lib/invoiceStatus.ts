/**
 * The accounts' vocabulary and the rules that need no database.
 *
 * Pure, so the screens, the server and the tests all answer "is this overdue?"
 * the same way. Overdue is worked out from the due date rather than stored:
 * stored, it would need a nightly job to stay true, and would be wrong whenever
 * that job had not run.
 */

export const INVOICE_STATUSES = ['draft', 'sent', 'partial', 'paid', 'cancelled'] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];
/** What a person is shown: the stored status, plus `overdue`. */
export type InvoiceDisplayStatus = InvoiceStatus | 'overdue';

/** Still owed money, and counted as a sale. A draft is not yet either. */
export const OPEN_INVOICE_STATUSES: InvoiceStatus[] = ['sent', 'partial'];
/** Any status that occupies an order: everything but cancelled. */
export const ACTIVE_INVOICE_STATUSES: InvoiceStatus[] = ['draft', 'sent', 'partial', 'paid'];

const EPSILON = 0.005;

export const money2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;

export function balanceOf(inv: { total?: number; amountPaid?: number }): number {
  return Math.max(0, money2((inv.total || 0) - (inv.amountPaid || 0)));
}

export function isFullyPaid(total: number, paid: number): boolean {
  return total > 0 && paid >= total - EPSILON;
}

/** The status money implies. A draft or a cancelled invoice stays as it is until a person moves it. */
export function statusFromPayments(current: string, total: number, paid: number): InvoiceStatus {
  if (current === 'cancelled') return 'cancelled';
  if (isFullyPaid(total, paid)) return 'paid';
  if (paid > EPSILON) return 'partial';
  return current === 'draft' ? 'draft' : 'sent';
}

export function displayStatus(
  inv: { status: string; dueDate?: string | Date | null },
  now: Date = new Date()
): InvoiceDisplayStatus {
  const open = (OPEN_INVOICE_STATUSES as string[]).includes(inv.status);
  if (open && inv.dueDate && new Date(inv.dueDate) < startOfDay(now)) return 'overdue';
  return inv.status as InvoiceStatus;
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export const AGING_BUCKETS = ['current', 'd1_30', 'd31_60', 'd61_90', 'd90plus'] as const;
export type AgingBucket = (typeof AGING_BUCKETS)[number];

/** Which column of the receivables table a due date falls in. */
export function agingBucket(dueDate: string | Date | null | undefined, now: Date = new Date()): AgingBucket {
  if (!dueDate) return 'current';
  const days = Math.floor((startOfDay(now).getTime() - startOfDay(new Date(dueDate)).getTime()) / 86400000);
  if (days <= 0) return 'current';
  if (days <= 30) return 'd1_30';
  if (days <= 60) return 'd31_60';
  return days <= 90 ? 'd61_90' : 'd90plus';
}

type Pair = { en: string; ar: string };

export const INVOICE_STATUS_META: Record<InvoiceDisplayStatus, Pair & { tone: 'neutral' | 'info' | 'warn' | 'ok' | 'danger' }> = {
  draft: { en: 'Draft', ar: 'مسودة', tone: 'neutral' },
  sent: { en: 'Issued', ar: 'صادرة', tone: 'info' },
  partial: { en: 'Part paid', ar: 'مدفوعة جزئيًا', tone: 'warn' },
  paid: { en: 'Paid', ar: 'مدفوعة', tone: 'ok' },
  overdue: { en: 'Overdue', ar: 'متأخرة', tone: 'danger' },
  cancelled: { en: 'Cancelled', ar: 'ملغاة', tone: 'neutral' },
};

export const PAYMENT_METHODS: Record<string, Pair> = {
  bank_transfer: { en: 'Bank transfer', ar: 'تحويل بنكي' },
  cash: { en: 'Cash', ar: 'نقدًا' },
  card: { en: 'Card', ar: 'بطاقة' },
};

export const PAYMENT_STATUS_META: Record<string, Pair & { tone: 'neutral' | 'warn' | 'ok' | 'danger' }> = {
  completed: { en: 'Received', ar: 'مستلمة', tone: 'ok' },
  pending: { en: 'Pending', ar: 'قيد الانتظار', tone: 'warn' },
  failed: { en: 'Failed', ar: 'فشلت', tone: 'danger' },
  refunded: { en: 'Refunded', ar: 'مستردة', tone: 'neutral' },
};

export const EXPENSE_CATEGORIES: Array<Pair & { key: string }> = [
  { key: 'raw_materials', en: 'Raw materials', ar: 'مواد خام' },
  { key: 'packaging', en: 'Packaging', ar: 'تغليف' },
  { key: 'manufacturing', en: 'Manufacturing', ar: 'تصنيع' },
  { key: 'shipping', en: 'Shipping & delivery', ar: 'شحن وتوصيل' },
  { key: 'salaries', en: 'Salaries', ar: 'رواتب' },
  { key: 'rent', en: 'Rent & utilities', ar: 'إيجار ومرافق' },
  { key: 'marketing', en: 'Marketing', ar: 'تسويق' },
  { key: 'licences', en: 'Licences & fees', ar: 'تراخيص ورسوم' },
  { key: 'software', en: 'Software', ar: 'برمجيات' },
  { key: 'travel', en: 'Travel', ar: 'سفر وانتقالات' },
  { key: 'other', en: 'Other', ar: 'أخرى' },
];

export function expenseCategoryLabel(key: string, locale: 'en' | 'ar'): string {
  const c = EXPENSE_CATEGORIES.find((x) => x.key === key);
  return c ? c[locale] : key;
}
