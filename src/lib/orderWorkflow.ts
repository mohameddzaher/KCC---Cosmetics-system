/**
 * Order workflow — the state machine every sample/bulk order travels through,
 * and the rule set for which role may perform which transition.
 *
 * Hand-off chain the business asked for:
 *
 *   customer submits
 *     → ACCOUNT_MANAGER acknowledges receipt        (Submitted → Under Review)
 *     → ACCOUNT_MANAGER approves / quotes / collects payment
 *     → ACCOUNT_MANAGER releases to the factory     (→ Queued for Production)
 *     → FACTORY starts work                         (→ In Production)
 *     → FACTORY QCs and declares it finished        (→ Production Complete)
 *     → ACCOUNT_MANAGER signs it off for dispatch   (→ Ready to Ship)
 *     → LOGISTICS assigns a delivery rep & ships    (→ Shipped → Out for Delivery)
 *     → LOGISTICS confirms delivery                 (→ Delivered)
 *     → ACCOUNT_MANAGER closes the file             (→ Closed)
 *
 * The customer-facing tracker collapses these into 6 friendly stages.
 */

import type { Role } from './roles';

export const ORDER_STATUSES = [
  'Submitted',
  'Under Review',
  'Approved',
  'Rejected',
  'Quotation Sent',
  'Awaiting Payment',
  'Payment Received',
  'Queued for Production',
  'In Production',
  'Quality Check',
  'Production Complete',
  'Ready to Ship',
  'Shipped',
  'Out for Delivery',
  'Delivered',
  'Closed',
  'On Hold',
  'Cancelled',
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export type OrderStage =
  | 'intake'
  | 'review'
  | 'commercial'
  | 'production'
  | 'dispatch'
  | 'done'
  | 'stopped';

export type StatusTone = 'neutral' | 'info' | 'brand' | 'warn' | 'ok' | 'danger' | 'accent';

export interface StatusMeta {
  value: OrderStatus;
  labelEn: string;
  labelAr: string;
  /** Short line shown to the customer in the tracker. */
  customerEn: string;
  customerAr: string;
  stage: OrderStage;
  tone: StatusTone;
  /** Whose court the ball is in — drives the "My queue" filters. */
  owner: Role | null;
  terminal?: boolean;
}

export const STATUS_META: Record<OrderStatus, StatusMeta> = {
  'Submitted': {
    value: 'Submitted',
    labelEn: 'Submitted', labelAr: 'تم الإرسال',
    customerEn: 'We received your request.', customerAr: 'استلمنا طلبك.',
    stage: 'intake', tone: 'neutral', owner: 'ACCOUNT_MANAGER',
  },
  'Under Review': {
    value: 'Under Review',
    labelEn: 'Under Review', labelAr: 'قيد المراجعة',
    customerEn: 'Your account manager is reviewing the brief.', customerAr: 'مدير حسابك يراجع الطلب.',
    stage: 'review', tone: 'info', owner: 'ACCOUNT_MANAGER',
  },
  'Approved': {
    value: 'Approved',
    labelEn: 'Approved', labelAr: 'تمت الموافقة',
    customerEn: 'Your brief is approved.', customerAr: 'تمت الموافقة على طلبك.',
    stage: 'review', tone: 'ok', owner: 'ACCOUNT_MANAGER',
  },
  'Rejected': {
    value: 'Rejected',
    labelEn: 'Rejected', labelAr: 'مرفوض',
    customerEn: 'We could not proceed with this brief.', customerAr: 'لم نتمكن من المتابعة بهذا الطلب.',
    stage: 'stopped', tone: 'danger', owner: null, terminal: true,
  },
  'Quotation Sent': {
    value: 'Quotation Sent',
    labelEn: 'Quotation Sent', labelAr: 'تم إرسال عرض السعر',
    customerEn: 'Your quotation is ready.', customerAr: 'عرض السعر جاهز.',
    stage: 'commercial', tone: 'info', owner: 'ACCOUNT_MANAGER',
  },
  'Awaiting Payment': {
    value: 'Awaiting Payment',
    labelEn: 'Awaiting Payment', labelAr: 'بانتظار الدفع',
    customerEn: 'Waiting for your payment to start production.', customerAr: 'بانتظار الدفع لبدء الإنتاج.',
    stage: 'commercial', tone: 'warn', owner: 'ACCOUNTANT',
  },
  'Payment Received': {
    value: 'Payment Received',
    labelEn: 'Payment Received', labelAr: 'تم استلام الدفع',
    customerEn: 'Payment confirmed — thank you.', customerAr: 'تم تأكيد الدفع — شكرًا لك.',
    stage: 'commercial', tone: 'ok', owner: 'ACCOUNT_MANAGER',
  },
  'Queued for Production': {
    value: 'Queued for Production',
    labelEn: 'Released to Factory', labelAr: 'تم التحويل للمصنع',
    customerEn: 'Your order is in the production queue.', customerAr: 'طلبك في قائمة انتظار الإنتاج.',
    stage: 'production', tone: 'info', owner: 'FACTORY',
  },
  'In Production': {
    value: 'In Production',
    labelEn: 'In Production', labelAr: 'قيد التصنيع',
    customerEn: 'We are manufacturing your formula.', customerAr: 'جارٍ تصنيع تركيبتك.',
    stage: 'production', tone: 'brand', owner: 'FACTORY',
  },
  'Quality Check': {
    value: 'Quality Check',
    labelEn: 'Quality Check', labelAr: 'فحص الجودة',
    customerEn: 'Your batch is in quality control.', customerAr: 'دفعتك في مرحلة فحص الجودة.',
    stage: 'production', tone: 'warn', owner: 'FACTORY',
  },
  'Production Complete': {
    value: 'Production Complete',
    labelEn: 'Production Complete', labelAr: 'انتهى الإنتاج',
    customerEn: 'Manufacturing is complete.', customerAr: 'اكتمل التصنيع.',
    stage: 'production', tone: 'ok', owner: 'ACCOUNT_MANAGER',
  },
  'Ready to Ship': {
    value: 'Ready to Ship',
    labelEn: 'Ready to Ship', labelAr: 'جاهز للشحن',
    customerEn: 'Packed and ready for dispatch.', customerAr: 'تم التغليف وجاهز للشحن.',
    stage: 'dispatch', tone: 'info', owner: 'LOGISTICS',
  },
  'Shipped': {
    value: 'Shipped',
    labelEn: 'Shipped', labelAr: 'تم الشحن',
    customerEn: 'Your order has left our facility.', customerAr: 'غادر طلبك مقرّنا.',
    stage: 'dispatch', tone: 'brand', owner: 'LOGISTICS',
  },
  'Out for Delivery': {
    value: 'Out for Delivery',
    labelEn: 'Out for Delivery', labelAr: 'خارج للتسليم',
    customerEn: 'Our rep is on the way to you.', customerAr: 'المندوب في الطريق إليك.',
    stage: 'dispatch', tone: 'brand', owner: 'LOGISTICS',
  },
  'Delivered': {
    value: 'Delivered',
    labelEn: 'Delivered', labelAr: 'تم التسليم',
    customerEn: 'Delivered. Enjoy!', customerAr: 'تم التسليم. نتمنى أن ينال إعجابك!',
    stage: 'done', tone: 'ok', owner: 'ACCOUNT_MANAGER',
  },
  'Closed': {
    value: 'Closed',
    labelEn: 'Closed', labelAr: 'مغلق',
    customerEn: 'This order is complete.', customerAr: 'اكتمل هذا الطلب.',
    stage: 'done', tone: 'neutral', owner: null, terminal: true,
  },
  'On Hold': {
    value: 'On Hold',
    labelEn: 'On Hold', labelAr: 'متوقف مؤقتًا',
    customerEn: 'On hold — we will contact you shortly.', customerAr: 'متوقف مؤقتًا — سنتواصل معك قريبًا.',
    stage: 'stopped', tone: 'warn', owner: 'ACCOUNT_MANAGER',
  },
  'Cancelled': {
    value: 'Cancelled',
    labelEn: 'Cancelled', labelAr: 'ملغي',
    customerEn: 'This order was cancelled.', customerAr: 'تم إلغاء هذا الطلب.',
    stage: 'stopped', tone: 'danger', owner: null, terminal: true,
  },
};

/* ------------------------------------------------------------------ */
/* Transitions                                                         */
/* ------------------------------------------------------------------ */

export interface Transition {
  to: OrderStatus;
  /** Verb on the button, not the destination name. */
  actionEn: string;
  actionAr: string;
  /** Roles allowed to fire it. ADMIN/SUPER_ADMIN are always allowed. */
  roles: Role[];
  /** Ask for a short note before committing (rejections, holds, reworks). */
  requiresNote?: boolean;
  /** Requires a courier/rep to be assigned first. */
  requiresCourier?: boolean;
  tone?: StatusTone;
}

const AM: Role[] = ['ACCOUNT_MANAGER', 'SALES'];
const FAC: Role[] = ['FACTORY'];
const LOG: Role[] = ['LOGISTICS'];
const FIN: Role[] = ['ACCOUNTANT', 'ACCOUNT_MANAGER'];

export const TRANSITIONS: Record<OrderStatus, Transition[]> = {
  'Submitted': [
    { to: 'Under Review', actionEn: 'Acknowledge receipt', actionAr: 'تأكيد الاستلام', roles: AM, tone: 'info' },
    { to: 'Cancelled', actionEn: 'Cancel order', actionAr: 'إلغاء الطلب', roles: AM, requiresNote: true, tone: 'danger' },
  ],
  'Under Review': [
    { to: 'Approved', actionEn: 'Approve brief', actionAr: 'الموافقة على الطلب', roles: AM, tone: 'ok' },
    { to: 'Rejected', actionEn: 'Reject', actionAr: 'رفض', roles: AM, requiresNote: true, tone: 'danger' },
    { to: 'On Hold', actionEn: 'Put on hold', actionAr: 'إيقاف مؤقت', roles: AM, requiresNote: true, tone: 'warn' },
  ],
  'Approved': [
    { to: 'Quotation Sent', actionEn: 'Send quotation', actionAr: 'إرسال عرض السعر', roles: AM, tone: 'info' },
    // Free samples skip the commercial leg entirely.
    { to: 'Queued for Production', actionEn: 'Release to factory', actionAr: 'تحويل للمصنع', roles: AM, tone: 'brand' },
    { to: 'On Hold', actionEn: 'Put on hold', actionAr: 'إيقاف مؤقت', roles: AM, requiresNote: true, tone: 'warn' },
  ],
  'Quotation Sent': [
    { to: 'Awaiting Payment', actionEn: 'Mark awaiting payment', actionAr: 'بانتظار الدفع', roles: AM, tone: 'warn' },
    { to: 'Approved', actionEn: 'Revise quotation', actionAr: 'تعديل عرض السعر', roles: AM, tone: 'neutral' },
    { to: 'Cancelled', actionEn: 'Cancel order', actionAr: 'إلغاء الطلب', roles: AM, requiresNote: true, tone: 'danger' },
  ],
  'Awaiting Payment': [
    { to: 'Payment Received', actionEn: 'Confirm payment', actionAr: 'تأكيد الدفع', roles: FIN, tone: 'ok' },
    { to: 'On Hold', actionEn: 'Put on hold', actionAr: 'إيقاف مؤقت', roles: AM, requiresNote: true, tone: 'warn' },
  ],
  'Payment Received': [
    { to: 'Queued for Production', actionEn: 'Release to factory', actionAr: 'تحويل للمصنع', roles: AM, tone: 'brand' },
  ],
  'Queued for Production': [
    { to: 'In Production', actionEn: 'Start production', actionAr: 'بدء التصنيع', roles: FAC, tone: 'brand' },
    { to: 'On Hold', actionEn: 'Put on hold', actionAr: 'إيقاف مؤقت', roles: [...FAC, ...AM], requiresNote: true, tone: 'warn' },
  ],
  'In Production': [
    { to: 'Quality Check', actionEn: 'Send to QC', actionAr: 'تحويل لفحص الجودة', roles: FAC, tone: 'warn' },
    { to: 'Production Complete', actionEn: 'Mark production complete', actionAr: 'إنهاء الإنتاج', roles: FAC, tone: 'ok' },
  ],
  'Quality Check': [
    { to: 'Production Complete', actionEn: 'QC passed', actionAr: 'اجتاز فحص الجودة', roles: FAC, tone: 'ok' },
    { to: 'In Production', actionEn: 'QC failed — rework', actionAr: 'إعادة التصنيع', roles: FAC, requiresNote: true, tone: 'danger' },
  ],
  'Production Complete': [
    { to: 'Ready to Ship', actionEn: 'Sign off for dispatch', actionAr: 'اعتماد للشحن', roles: AM, tone: 'info' },
  ],
  'Ready to Ship': [
    { to: 'Shipped', actionEn: 'Assign rep & ship', actionAr: 'تعيين مندوب وشحن', roles: LOG, requiresCourier: true, tone: 'brand' },
  ],
  'Shipped': [
    { to: 'Out for Delivery', actionEn: 'Out for delivery', actionAr: 'خارج للتسليم', roles: LOG, tone: 'brand' },
    { to: 'Delivered', actionEn: 'Confirm delivery', actionAr: 'تأكيد التسليم', roles: LOG, tone: 'ok' },
  ],
  'Out for Delivery': [
    { to: 'Delivered', actionEn: 'Confirm delivery', actionAr: 'تأكيد التسليم', roles: LOG, tone: 'ok' },
    { to: 'Shipped', actionEn: 'Delivery attempt failed', actionAr: 'فشلت محاولة التسليم', roles: LOG, requiresNote: true, tone: 'danger' },
  ],
  'Delivered': [
    { to: 'Closed', actionEn: 'Close order', actionAr: 'إغلاق الطلب', roles: AM, tone: 'neutral' },
  ],
  'Closed': [],
  'Rejected': [],
  'On Hold': [
    { to: 'Under Review', actionEn: 'Resume', actionAr: 'استئناف', roles: [...AM, ...FAC], tone: 'info' },
    { to: 'Cancelled', actionEn: 'Cancel order', actionAr: 'إلغاء الطلب', roles: AM, requiresNote: true, tone: 'danger' },
  ],
  'Cancelled': [],
};

const ALWAYS_ALLOWED: Role[] = ['SUPER_ADMIN', 'ADMIN'];

export function isValidStatus(s: string): s is OrderStatus {
  return (ORDER_STATUSES as readonly string[]).includes(s);
}

/** Transitions this role may actually fire from the given status. */
export function allowedTransitions(status: string, role: string): Transition[] {
  const list = TRANSITIONS[status as OrderStatus] || [];
  if ((ALWAYS_ALLOWED as string[]).includes(role)) return list;
  return list.filter((t) => (t.roles as string[]).includes(role));
}

export function canTransition(from: string, to: string, role: string): boolean {
  return allowedTransitions(from, role).some((t) => t.to === to);
}

export function findTransition(from: string, to: string): Transition | undefined {
  return (TRANSITIONS[from as OrderStatus] || []).find((t) => t.to === to);
}

export function statusMeta(status: string): StatusMeta {
  return (
    STATUS_META[status as OrderStatus] ?? {
      value: status as OrderStatus,
      labelEn: status, labelAr: status,
      customerEn: status, customerAr: status,
      stage: 'intake', tone: 'neutral', owner: null,
    }
  );
}

export function statusLabel(status: string, locale: 'en' | 'ar'): string {
  const m = statusMeta(status);
  return locale === 'ar' ? m.labelAr : m.labelEn;
}

/** Tailwind badge classes for a status — theme-token based, safe in both themes. */
export function statusBadgeClass(status: string): string {
  const tone = statusMeta(status).tone;
  switch (tone) {
    case 'ok': return 'bg-ok-soft text-ok-soft-fg';
    case 'warn': return 'bg-warn-soft text-warn-soft-fg';
    case 'danger': return 'bg-danger-soft text-danger-soft-fg';
    case 'info': return 'bg-info-soft text-info-soft-fg';
    case 'brand': return 'bg-brand-soft text-brand-soft-fg';
    case 'accent': return 'bg-accent-soft text-accent-soft-fg';
    default: return 'bg-surface-3 text-fg-muted';
  }
}

/* ------------------------------------------------------------------ */
/* Customer-facing tracker                                             */
/* ------------------------------------------------------------------ */

export interface TrackerStage {
  key: OrderStage;
  labelEn: string;
  labelAr: string;
}

export const TRACKER_STAGES: TrackerStage[] = [
  { key: 'intake', labelEn: 'Received', labelAr: 'تم الاستلام' },
  { key: 'review', labelEn: 'Reviewed', labelAr: 'المراجعة' },
  { key: 'commercial', labelEn: 'Quotation', labelAr: 'عرض السعر' },
  { key: 'production', labelEn: 'Production', labelAr: 'الإنتاج' },
  { key: 'dispatch', labelEn: 'Dispatch', labelAr: 'الشحن' },
  { key: 'done', labelEn: 'Delivered', labelAr: 'التسليم' },
];

/** 0-based index into TRACKER_STAGES; -1 when the order is halted. */
export function trackerIndex(status: string): number {
  const stage = statusMeta(status).stage;
  if (stage === 'stopped') return -1;
  return TRACKER_STAGES.findIndex((s) => s.key === stage);
}

/* ------------------------------------------------------------------ */
/* Role queues                                                         */
/* ------------------------------------------------------------------ */

/** Statuses that sit in a given role's work queue. */
export const ROLE_QUEUE: Partial<Record<Role, OrderStatus[]>> = {
  ACCOUNT_MANAGER: [
    'Submitted', 'Under Review', 'Approved', 'Quotation Sent',
    'Payment Received', 'Production Complete', 'Delivered', 'On Hold',
  ],
  SALES: ['Submitted', 'Under Review', 'Approved', 'Quotation Sent'],
  ACCOUNTANT: ['Awaiting Payment', 'Quotation Sent'],
  FACTORY: ['Queued for Production', 'In Production', 'Quality Check'],
  LOGISTICS: ['Ready to Ship', 'Shipped', 'Out for Delivery'],
};

/**
 * Mongo filter restricting what a role is allowed to see in the orders list.
 * `null` = no restriction.
 */
export function scopeFilterForRole(role: string, userId: string): Record<string, unknown> | null {
  switch (role) {
    case 'FACTORY':
      return { status: { $in: ROLE_QUEUE.FACTORY } };
    case 'LOGISTICS':
      // Dispatch also needs recent history to answer "where is my order?".
      return { status: { $in: [...(ROLE_QUEUE.LOGISTICS || []), 'Production Complete', 'Delivered', 'Closed'] } };
    case 'ACCOUNT_MANAGER':
      return { $or: [{ 'assignments.accountManagerId': userId }, { 'assignments.accountManagerId': { $exists: false } }, { 'assignments.accountManagerId': null }] };
    default:
      return null;
  }
}
