import { ORDER_STATUSES, statusLabel } from '@/lib/orderWorkflow';
import { roleLabel } from '@/lib/roles';
import { CRM_CATEGORIES, CRM_CITIES } from '@/lib/crmVocab';

/**
 * The log in words. Pure and free of the database, so the screen, the workbook
 * and the tests all describe an entry the same way.
 *
 * The Arabic uses verbal nouns ("تعديل الطلب") on purpose: a verb would have to
 * be masculine or feminine, and the log does not know which the person is.
 */

const ORDER_STATUS_WORDS = new Set<string>(ORDER_STATUSES);

export type Locale = 'en' | 'ar';
type Pair = [string, string];

export interface DescribableChange { field: string; from?: unknown; to?: unknown; fromLabel?: string; toLabel?: string }

const ENTITIES: Record<string, { en: string; ar: string }> = {
  User: { en: 'user', ar: 'المستخدم' }, Order: { en: 'order', ar: 'الطلب' }, Invoice: { en: 'invoice', ar: 'الفاتورة' },
  Payment: { en: 'payment', ar: 'الدفعة' }, Expense: { en: 'expense', ar: 'المصروف' },
  CrmAccount: { en: 'CRM account', ar: 'حساب CRM' }, CrmActivity: { en: 'CRM activity', ar: 'نشاط CRM' },
  CrmTarget: { en: 'CRM targets', ar: 'مستهدفات CRM' }, CrmVisitPlan: { en: 'journey plan', ar: 'خطة الزيارات' },
  CustomerActivity: { en: 'customer note', ar: 'نشاط العميل' }, ProductCode: { en: 'product code', ar: 'كود المنتج' },
  InventoryItem: { en: 'stock item', ar: 'صنف المخزون' }, InventoryMovement: { en: 'stock movement', ar: 'حركة المخزون' },
  PromoCode: { en: 'promo code', ar: 'كود الخصم' }, PromoUsage: { en: 'promo use', ar: 'استخدام كود الخصم' },
  Referral: { en: 'referral', ar: 'الإحالة' }, RolePermission: { en: 'role permissions', ar: 'صلاحيات الدور' },
  SiteSettings: { en: 'site settings', ar: 'إعدادات الموقع' }, Session: { en: 'session', ar: 'الجلسة' },
  File: { en: 'file', ar: 'الملف' }, Category: { en: 'category', ar: 'القسم' },
  CrmReport: { en: 'CRM report', ar: 'تقرير CRM' }, AccountingReport: { en: 'accounting report', ar: 'تقرير مالي' }, AuditLog: { en: 'audit log', ar: 'سجل المراجعة' },
  OrderFeedback: { en: 'order feedback', ar: 'تقييم الطلب' }, ContactMessage: { en: 'contact message', ar: 'رسالة تواصل' },
  ProductSpecConfig: { en: 'product configuration', ar: 'إعدادات المنتج' }, SpecOptionMaster: { en: 'quiz options', ar: 'خيارات الاستبيان' },
  BriefQuestion: { en: 'brief question', ar: 'سؤال البريف' }, KnowledgeArticle: { en: 'knowledge article', ar: 'مقال المعرفة' },
  NewsPost: { en: 'news post', ar: 'الخبر' }, CmsSection: { en: 'site content', ar: 'محتوى الموقع' },
  SeoPage: { en: 'SEO page', ar: 'صفحة SEO' }, SeoGlobal: { en: 'SEO settings', ar: 'إعدادات SEO' },
  Service: { en: 'service', ar: 'الخدمة' }, Testimonial: { en: 'testimonial', ar: 'رأي العميل' }, FAQ: { en: 'FAQ', ar: 'السؤال الشائع' },
  Certificate: { en: 'certificate', ar: 'الشهادة' }, Factory: { en: 'factory', ar: 'المصنع' },
  PortfolioItem: { en: 'portfolio item', ar: 'عنصر الأعمال' }, TeamMember: { en: 'team member', ar: 'عضو الفريق' },
};

export function entityName(entity: string, locale: Locale): string {
  return ENTITIES[entity]?.[locale] ?? entity;
}

const FIELDS: Record<string, Pair> = {
  name: ['Name', 'الاسم'], nameAr: ['Arabic name', 'الاسم بالعربي'], email: ['Email', 'البريد'], phone: ['Phone', 'الهاتف'],
  whatsapp: ['WhatsApp', 'واتساب'], website: ['Website', 'الموقع'], company: ['Company', 'الشركة'],
  companyName: ['Company', 'الشركة'], personName: ['Contact person', 'الشخص المسؤول'],
  country: ['Country', 'الدولة'], city: ['City', 'المدينة'], address: ['Address', 'العنوان'],
  role: ['Role', 'الدور'], isActive: ['Active', 'مفعّل'], active: ['Active', 'نشط'], password: ['Password', 'كلمة المرور'],
  permissions: ['Permissions', 'الصلاحيات'], managerId: ['Reports to', 'المدير المباشر'],
  accountManagerId: ['Account manager', 'مدير الحساب'], factoryUserId: ['Factory user', 'مسؤول المصنع'],
  logisticsUserId: ['Logistics user', 'مسؤول الشحن'], courierName: ['Courier', 'المندوب'], courierPhone: ['Courier phone', 'هاتف المندوب'],
  trackingNumber: ['Tracking number', 'رقم التتبع'],
  status: ['Status', 'الحالة'], stage: ['Stage', 'المرحلة'], priority: ['Priority', 'الأولوية'], type: ['Type', 'النوع'],
  dueDate: ['Due date', 'تاريخ الاستحقاق'], orderNumber: ['Order number', 'رقم الطلب'], invoiceNumber: ['Invoice number', 'رقم الفاتورة'],
  userId: ['Customer', 'العميل'], customerId: ['Customer', 'العميل'], orderId: ['Order', 'الطلب'], orderIds: ['Orders', 'الطلبات'],
  invoiceId: ['Invoice', 'الفاتورة'], accountId: ['Account', 'الحساب'], itemId: ['Item', 'الصنف'], ownerId: ['Owner', 'المسؤول'],
  ownerName: ['Owner', 'المسؤول'], promoCodeId: ['Promo code', 'كود الخصم'], referrerId: ['Referred by', 'صاحب الإحالة'],
  referredId: ['Referred customer', 'العميل المُحال'], convertedFromSample: ['From sample', 'من العيّنة'],
  subtotal: ['Subtotal', 'الإجمالي الفرعي'], discount: ['Discount', 'الخصم'], tax: ['Tax', 'الضريبة'], total: ['Total', 'الإجمالي'],
  amount: ['Amount', 'المبلغ'], price: ['Price', 'السعر'], quantity: ['Quantity', 'الكمية'], cost: ['Cost', 'التكلفة'],
  paymentMethod: ['Payment method', 'طريقة الدفع'], paymentStatus: ['Payment status', 'حالة الدفع'],
  creditApplied: ['Credit applied', 'الرصيد المستخدم'], referralCode: ['Referral code', 'كود الإحالة'],
  internalNotes: ['Internal notes', 'ملاحظات داخلية'], notes: ['Notes', 'ملاحظات'], note: ['Note', 'ملاحظة'],
  body: ['Text', 'النص'], outcome: ['Outcome', 'النتيجة'], done: ['Done', 'تم'], at: ['Date', 'التاريخ'],
  category: ['Category', 'الفئة'], segment: ['Segment', 'الشريحة'], source: ['Source', 'المصدر'], brands: ['Brands', 'العلامات'],
  links: ['Links', 'الروابط'], feedback: ['Feedback', 'رد الحساب'], finalStatus: ['Final status', 'الحالة النهائية'],
  requirement: ['Requirement', 'المطلوب'], nextStep: ['Next step', 'الخطوة التالية'], tags: ['Tags', 'الوسوم'],
  visitCount: ['Visits', 'الزيارات'], meetingCount: ['Meetings', 'الاجتماعات'], activityCount: ['Activities', 'الأنشطة'],
  firstActionAt: ['First action', 'أول إجراء'], lastActionAt: ['Last action', 'آخر إجراء'], targetList: ['On target list', 'ضمن قائمة الأهداف'],
  checklist: ['Call checklist', 'قائمة الزيارة'], interest: ['Interest', 'الاهتمام'], meetingIndex: ['Meeting number', 'رقم الاجتماع'],
  code: ['Code', 'الكود'], product: ['Product', 'المنتج'], title: ['Title', 'العنوان'], description: ['Description', 'الوصف'],
  amountPaid: ['Paid', 'المدفوع'], issuedAt: ['Issued', 'تاريخ الإصدار'], paidAt: ['Paid on', 'تاريخ الدفع'], method: ['Method', 'الطريقة'],
  reference: ['Reference', 'المرجع'], vendor: ['Vendor', 'المورد'], vatAmount: ['VAT', 'الضريبة'], vatNumber: ['VAT number', 'الرقم الضريبي'],
  sku: ['SKU', 'SKU'], unit: ['Unit', 'الوحدة'], stock: ['Stock', 'المخزون'], date: ['Date', 'التاريخ'],
  'keyPerson.name': ['Key person', 'الشخص المسؤول'], 'keyPerson.position': ['Key person position', 'منصب الشخص المسؤول'],
  'keyPerson.phone': ['Key person phone', 'هاتف الشخص المسؤول'], 'keyPerson.email': ['Key person email', 'بريد الشخص المسؤول'],
  'quote.amount': ['Quoted amount', 'مبلغ عرض السعر'], 'quote.notes': ['Quote notes', 'ملاحظات عرض السعر'],
  'quote.validUntil': ['Quote valid until', 'صلاحية عرض السعر'], 'quote.sentAt': ['Quote sent', 'إرسال عرض السعر'],
  'steps.scheduled': ['Step: meeting scheduled', 'خطوة: تحديد موعد'], 'steps.introduced': ['Step: KCC introduced', 'خطوة: التعريف بـKCC'],
  'steps.accountInfo': ['Step: account information', 'خطوة: بيانات الحساب'], 'steps.keyPerson': ['Step: key person', 'خطوة: الشخص المسؤول'],
  'steps.feedback': ['Step: feedback', 'خطوة: رد الحساب'], 'steps.commercial': ['Step: commercial', 'خطوة: الجزء التجاري'],
};

const SECTIONS: Record<string, Pair> = {
  customerInfo: ['Customer', 'بيانات العميل'], assignments: ['Assignment', 'التكليف'], totals: ['Totals', 'الإجماليات'],
  bulkDetails: ['Bulk details', 'تفاصيل الجملة'], timeline: ['Status log', 'سجل الحالات'], attachments: ['Attachments', 'المرفقات'],
};

function humanise(key: string): string {
  const s = key.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[_-]/g, ' ').toLowerCase();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function fieldLabel(field: string, locale: Locale): string {
  const i = locale === 'ar' ? 1 : 0;
  if (FIELDS[field]) return FIELDS[field][i];
  const parts = field.split('.').filter((p) => !/^\d+$/.test(p));
  const last = parts[parts.length - 1];
  const own = FIELDS[last]?.[i] ?? humanise(last);
  const section = parts.length > 1 ? SECTIONS[parts[0]]?.[i] ?? (FIELDS[parts[0]]?.[i]) : undefined;
  return section ? `${section}: ${own}` : own;
}

const VALUES: Record<string, Pair> = {
  // CRM stages
  upcoming: ['Upcoming', 'قادم'], current: ['Current', 'حالي'], hold: ['On hold', 'معلّق'], won: ['Won', 'تم الفوز'], lost: ['Lost', 'خسارة'],
  // Customer stages
  lead: ['Lead', 'عميل محتمل'], prospect: ['Prospect', 'مهتم'], vip: ['VIP', 'VIP'], inactive: ['Inactive', 'غير نشط'], churned: ['Churned', 'فقدناه'],
  // Activity types
  visit: ['Visit', 'زيارة'], meeting: ['Meeting', 'اجتماع'], call: ['Call', 'مكالمة'], email: ['Email', 'بريد'],
  whatsapp: ['WhatsApp', 'واتساب'], intro: ['KCC introduced', 'تعريف بـKCC'], account_info: ['Account info', 'بيانات الحساب'],
  key_person: ['Key person', 'الشخص المسؤول'], feedback: ['Feedback', 'رد الحساب'], commercial: ['Commercial', 'تجاري'],
  sample_request: ['Sample request', 'طلب عيّنة'], pricing_request: ['Pricing request', 'طلب أسعار'], complaint: ['Complaint', 'شكوى'],
  suggestion: ['Suggestion', 'اقتراح'], note: ['Note', 'ملاحظة'], task: ['Task', 'مهمة'], stage_change: ['Stage change', 'تغيير المرحلة'],
  order_update: ['Order update', 'تحديث طلب'], assignment: ['Assignment', 'تعيين'], system: ['System', 'النظام'],
  // Orders
  sample: ['Sample', 'عيّنة'], bulk: ['Bulk', 'جملة'], low: ['Low', 'منخفضة'], normal: ['Normal', 'عادية'], high: ['High', 'مرتفعة'], urgent: ['Urgent', 'عاجلة'],
  pending: ['Pending', 'قيد الانتظار'], paid: ['Paid', 'مدفوع'], refunded: ['Refunded', 'مسترد'], cash: ['Cash', 'نقدًا'], card: ['Card', 'بطاقة'],
  // Money
  draft: ['Draft', 'مسودة'], sent: ['Issued', 'صادرة'], partial: ['Part paid', 'مدفوعة جزئيًا'], cancelled: ['Cancelled', 'ملغاة'],
  completed: ['Received', 'مستلمة'], failed: ['Failed', 'فشلت'], bank_transfer: ['Bank transfer', 'تحويل بنكي'],
  raw_materials: ['Raw materials', 'مواد خام'], packaging: ['Packaging', 'تغليف'], manufacturing: ['Manufacturing', 'تصنيع'],
  // Interest
  interested: ['Interested', 'مهتم'], moderate: ['Moderate', 'متوسط'], not_interested: ['Not interested', 'غير مهتم'],
};

function dateText(iso: string, locale: Locale): string {
  return new Date(iso).toLocaleString(locale === 'ar' ? 'ar-EG' : 'en-GB', { dateStyle: 'medium', timeStyle: 'short' });
}

/** One value as a person would say it. `label` is the name behind an id, if it had one. */
export function valueText(field: string, value: unknown, locale: Locale, label?: string): string {
  if (label) return label;
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? (locale === 'ar' ? 'نعم' : 'Yes') : (locale === 'ar' ? 'لا' : 'No');
  if (Array.isArray(value)) return value.map((v) => valueText(field, v, locale)).join('، ') || '—';
  if (typeof value === 'object') return JSON.stringify(value);

  const key = field.split('.').pop() as string;
  const text = String(value);
  if (key === 'status' && ORDER_STATUS_WORDS.has(text)) return statusLabel(text, locale);
  if (key === 'role' || key === 'byRole') return roleLabel(text, locale) || text;
  if (key === 'category') {
    const c = CRM_CATEGORIES.find((x) => x.key === text);
    if (c) return locale === 'ar' ? c.labelAr : c.labelEn;
  }
  if (key === 'city') {
    const c = CRM_CITIES.find((x) => x.key === text);
    if (c) return locale === 'ar' ? c.labelAr : c.labelEn;
  }
  if (/^\d{4}-\d{2}-\d{2}T[\d:.]+Z$/.test(text)) return dateText(text, locale);
  return VALUES[text]?.[locale === 'ar' ? 1 : 0] ?? text;
}

/** Bookkeeping that repeats what another line already says. Kept for the detail view. */
export function headlineChanges<T extends DescribableChange>(changes: T[] = []): T[] {
  return changes.filter((c) => !/^(timeline|statusHistory)\./.test(c.field) && !/(^|\.)(byName|ownerName|byRole)$/.test(c.field));
}

const VERBS: Record<string, { en: string; ar: string; attempt: Pair }> = {
  create: { en: 'Added', ar: 'إضافة', attempt: ['Tried to add', 'محاولة إضافة'] },
  update: { en: 'Changed', ar: 'تعديل', attempt: ['Tried to change', 'محاولة تعديل'] },
  delete: { en: 'Deleted', ar: 'حذف', attempt: ['Tried to delete', 'محاولة حذف'] },
  export: { en: 'Exported', ar: 'تصدير', attempt: ['Tried to export', 'محاولة تصدير'] },
  upload: { en: 'Uploaded', ar: 'رفع', attempt: ['Tried to upload', 'محاولة رفع'] },
  request: { en: 'Used', ar: 'استخدام', attempt: ['Tried to use', 'محاولة استخدام'] },
};

const FIXED: Record<string, Pair> = {
  login: ['Signed in', 'تسجيل دخول'],
  login_failed: ['Failed to sign in as', 'محاولة دخول فاشلة بالحساب'],
  logout: ['Signed out', 'تسجيل خروج'],
  'role.permissions.update': ['Changed the permissions of', 'تعديل صلاحيات'],
  'role.permissions.reset': ['Reset the permissions of', 'إعادة ضبط صلاحيات'],
};

export interface Describable {
  action: string;
  entity: string;
  entityId?: string;
  entityLabel?: string;
  outcome?: string;
  changes?: DescribableChange[];
}

/** "Changed order SMP-12", as `what` and `target`, so the screen can link the target. */
export function describe(row: Describable, locale: Locale): { what: string; target?: string; note?: string } {
  const i = locale === 'ar' ? 1 : 0;
  const label = row.entityLabel ? valueText('', row.entityLabel, locale) : undefined;

  if (FIXED[row.action]) {
    const legacyRole = row.entity === 'RolePermission' && row.entityId ? roleLabel(row.entityId, locale) : undefined;
    const signIn = row.action === 'login' || row.action === 'logout';
    return { what: FIXED[row.action][i], target: signIn ? undefined : legacyRole || label };
  }

  const verb = VERBS[row.action] ?? VERBS.request;
  const failed = row.outcome === 'denied' || row.outcome === 'failed';
  const name = entityName(row.entity, locale);
  const noChange = !failed && row.action === 'update' && !row.changes?.length;
  return {
    what: `${failed ? verb.attempt[i] : verb[locale]} ${name}`,
    target: label,
    note: noChange ? (locale === 'ar' ? 'تم الحفظ بدون أي تغيير' : 'Saved with nothing different') : undefined,
  };
}

/** Where a record lives, when it has a page of its own. */
export function recordHref(entity: string, id?: string, role?: string): string | undefined {
  if (entity === 'Order' && id) return `/admin/orders/${id}`;
  if (entity === 'CrmAccount' && id) return `/admin/crm/accounts/${id}`;
  if (entity === 'User') return role === 'CUSTOMER' && id ? `/admin/customers/${id}` : '/admin/users';
  if (entity === 'Invoice' && id) return `/admin/accounting/invoices/${id}`;
  if (entity === 'Payment') return '/admin/accounting/payments';
  if (entity === 'Expense') return '/admin/accounting/expenses';
  if (['InventoryItem', 'InventoryMovement'].includes(entity)) return '/admin/inventory';
  if (entity === 'PromoCode') return '/admin/promos';
  if (entity === 'Referral') return '/admin/referrals';
  if (entity === 'ProductCode') return '/admin/crm/catalogue';
  if (entity === 'Category') return '/admin/categories';
  return undefined;
}

/** "Customer: Nahdi", for the line of things an entry concerns. */
export function subjectTitle(s: { field: string; model: string }, locale: Locale): string {
  return fieldLabel(s.field, locale) || entityName(s.model, locale);
}

/** "Chrome on Mac", from the string a browser sends. The full text stays on the row. */
export function deviceText(ua: string | undefined, locale: Locale): string {
  if (!ua) return '—';
  const browser = /Edg\//.test(ua) ? 'Edge'
    : /OPR\//.test(ua) ? 'Opera'
      : /Chrome\//.test(ua) ? 'Chrome'
        : /Firefox\//.test(ua) ? 'Firefox'
          : /Safari\//.test(ua) ? 'Safari' : undefined;
  const os = /iPhone|iPad/.test(ua) ? 'iOS'
    : /Android/.test(ua) ? 'Android'
      : /Mac OS X/.test(ua) ? 'Mac'
        : /Windows/.test(ua) ? 'Windows'
          : /Linux/.test(ua) ? 'Linux' : undefined;
  if (!browser || !os) return ua.slice(0, 60);
  return locale === 'ar' ? `${browser} على ${os}` : `${browser} on ${os}`;
}
