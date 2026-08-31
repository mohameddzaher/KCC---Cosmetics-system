/**
 * Roles & permissions — the single source of truth for "who can see/do what".
 *
 * Used by:
 *   • the admin sidebar (which links render)
 *   • every admin page guard  (`useRequirePermission`)
 *   • every API route guard   (`requirePermission`)
 *   • the order workflow      (`src/lib/orderWorkflow.ts`)
 *
 * Adding a role = add it here + to the `role` enum in src/models/User.ts.
 * Nothing else needs to change.
 */

export const ROLES = [
  'SUPER_ADMIN',
  'ADMIN',
  'SALES',
  'ACCOUNT_MANAGER',
  'FACTORY',
  'LOGISTICS',
  'ACCOUNTANT',
  'SUPPORT',
  'CONTENT_EDITOR',
  'STAFF',
  'CUSTOMER',
] as const;

export type Role = (typeof ROLES)[number];

/** Everything that is not a customer — i.e. can reach /admin. */
export const STAFF_ROLES: Role[] = ROLES.filter((r) => r !== 'CUSTOMER') as Role[];

export function isStaffRole(role: string): role is Role {
  return (STAFF_ROLES as string[]).includes(role);
}

export function isAdminRole(role: string): boolean {
  return role === 'SUPER_ADMIN' || role === 'ADMIN';
}

/* ------------------------------------------------------------------ */
/* Permissions                                                         */
/* ------------------------------------------------------------------ */

export const PERMISSIONS = [
  'dashboard.view',

  'crm.view',
  'crm.edit',
  'customers.view',
  'customers.edit',
  'customers.credentials',

  'orders.view',          // see the orders list (scoped further per role)
  'orders.viewAll',       // see every order, not just assigned ones
  'orders.edit',          // edit customer-facing details / internal notes
  'orders.assign',        // set account manager / factory / courier
  'orders.advance',       // move an order along the workflow (gated per status)
  'orders.delete',

  'production.view',      // factory queue
  'production.act',
  'logistics.view',       // shipping queue
  'logistics.act',
  'couriers.manage',

  'inbox.view',
  'inbox.act',

  'categories.manage',
  'sampleQuiz.manage',
  'inventory.view',
  'inventory.manage',

  'promos.manage',
  'referrals.manage',

  'accounting.view',
  'accounting.manage',

  'cms.manage',
  'knowledge.manage',
  'seo.manage',

  'users.view',
  'users.manage',
  'settings.manage',
  'audit.view',
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const ALL: Permission[] = [...PERMISSIONS];

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  SUPER_ADMIN: ALL,

  // Full operational control. The extra guard that only a SUPER_ADMIN may mint
  // another admin lives in the /api/users route, not in the permission list.
  ADMIN: ALL,

  SALES: [
    'dashboard.view',
    'crm.view', 'crm.edit',
    'customers.view', 'customers.edit', 'customers.credentials',
    'orders.view', 'orders.viewAll', 'orders.edit', 'orders.advance',
    'inbox.view', 'inbox.act',
    'promos.manage', 'referrals.manage',
    'inventory.view',
  ],

  // Owns the customer relationship for their assigned accounts and drives the
  // order from intake → quotation → payment → handoff → delivery follow-up.
  ACCOUNT_MANAGER: [
    'dashboard.view',
    'crm.view', 'crm.edit',
    'customers.view', 'customers.edit', 'customers.credentials',
    'orders.view', 'orders.edit', 'orders.assign', 'orders.advance',
    'logistics.view',
    'production.view',
    'inbox.view', 'inbox.act',
    'inventory.view',
  ],

  // Production floor: sees only what has been released to the factory.
  FACTORY: [
    'dashboard.view',
    'orders.view',
    'production.view', 'production.act',
    'orders.advance',
    'inventory.view', 'inventory.manage',
  ],

  // Dispatch desk: owns couriers / delivery reps and the shipping leg.
  LOGISTICS: [
    'dashboard.view',
    'orders.view',
    'logistics.view', 'logistics.act', 'couriers.manage',
    'orders.advance',
    'inventory.view',
  ],

  ACCOUNTANT: [
    'dashboard.view',
    'orders.view', 'orders.viewAll',
    // Needed to confirm payment — the only workflow move an accountant makes.
    'orders.advance',
    'customers.view',
    'accounting.view', 'accounting.manage',
    'inventory.view',
  ],

  SUPPORT: [
    'dashboard.view',
    'inbox.view', 'inbox.act',
    'customers.view',
    'orders.view', 'orders.viewAll',
    'knowledge.manage',
  ],

  CONTENT_EDITOR: [
    'dashboard.view',
    'cms.manage', 'knowledge.manage', 'seo.manage',
    'categories.manage',
  ],

  // Legacy generic staff — deliberately read-mostly.
  STAFF: [
    'dashboard.view',
    'crm.view',
    'customers.view',
    'orders.view', 'orders.viewAll',
    'inbox.view',
    'inventory.view',
    'categories.manage',
    'sampleQuiz.manage',
    'cms.manage',
    'knowledge.manage',
    'seo.manage',
  ],

  CUSTOMER: [],
};

/**
 * Super-Admin overrides, layered on top of the defaults above.
 *
 * `ROLE_PERMISSIONS` is what the business looks like out of the box. A Super
 * Admin can widen or narrow any role from Users & Roles, and those choices
 * live in the database; `src/lib/rolePermissions.ts` loads them into here on
 * each request cycle so that `can()` — which is synchronous, and called from
 * every route — sees them without becoming async.
 *
 * SUPER_ADMIN is deliberately not overridable. The account that grants access
 * must not be able to revoke its own ability to grant it.
 */
let roleOverrides: Partial<Record<Role, Permission[]>> = {};

export function setRoleOverrides(next: Partial<Record<Role, Permission[]>>) {
  const { SUPER_ADMIN: _ignored, ...rest } = next;
  roleOverrides = rest;
}

/** Everything a role can reach: its override if it has one, else the default. */
export function effectiveRolePermissions(role: Role): Permission[] {
  if (role === 'SUPER_ADMIN') return ROLE_PERMISSIONS.SUPER_ADMIN;
  return roleOverrides[role] ?? ROLE_PERMISSIONS[role] ?? [];
}

/** True when this role's list has been changed from the shipped default. */
export function isRoleCustomised(role: Role): boolean {
  return role !== 'SUPER_ADMIN' && roleOverrides[role] !== undefined;
}

export function can(role: string | undefined | null, permission: Permission): boolean {
  if (!role) return false;
  if (!(ROLES as readonly string[]).includes(role)) return false;
  return effectiveRolePermissions(role as Role).includes(permission);
}

export function canAny(role: string | undefined | null, permissions: Permission[]): boolean {
  return permissions.some((p) => can(role, p));
}


/* ------------------------------------------------------------------ */
/* Plain-language names for the permission keys                        */
/* ------------------------------------------------------------------ */

/**
 * What each permission means, in words.
 *
 * The keys themselves are the contract — they appear in three dozen route
 * handlers and in the database — so they are NOT renamed here. This is purely
 * a display layer: "orders.viewAll" is meaningless to whoever is deciding what
 * an account manager should be able to do, and "See every order, not just
 * their own" is not.
 *
 * Grouped so the permission screen reads as a list of areas of the business
 * rather than 34 unsorted switches.
 */
export interface PermissionMeta {
  labelEn: string;
  labelAr: string;
  groupEn: string;
  groupAr: string;
}

export const PERMISSION_GROUPS = [
  { key: 'overview', en: 'Overview', ar: 'نظرة عامة' },
  { key: 'customers', en: 'Customers & sales', ar: 'العملاء والمبيعات' },
  { key: 'orders', en: 'Orders', ar: 'الطلبات' },
  { key: 'operations', en: 'Operations', ar: 'العمليات' },
  { key: 'catalogue', en: 'Catalogue & stock', ar: 'الكتالوج والمخزون' },
  { key: 'marketing', en: 'Marketing', ar: 'التسويق' },
  { key: 'finance', en: 'Finance', ar: 'المالية' },
  { key: 'content', en: 'Website & content', ar: 'الموقع والمحتوى' },
  { key: 'system', en: 'System', ar: 'النظام' },
] as const;

export const PERMISSION_META: Record<Permission, PermissionMeta> = {
  'dashboard.view': { labelEn: 'See the dashboard', labelAr: 'رؤية لوحة التحكم', groupEn: 'overview', groupAr: 'overview' },

  'crm.view': { labelEn: 'See the sales pipeline', labelAr: 'رؤية مسار المبيعات', groupEn: 'customers', groupAr: 'customers' },
  'crm.edit': { labelEn: 'Move deals and add tasks', labelAr: 'تحريك الصفقات وإضافة المهام', groupEn: 'customers', groupAr: 'customers' },
  'customers.view': { labelEn: 'See customer records', labelAr: 'رؤية بيانات العملاء', groupEn: 'customers', groupAr: 'customers' },
  'customers.edit': { labelEn: 'Add and edit customers', labelAr: 'إضافة وتعديل العملاء', groupEn: 'customers', groupAr: 'customers' },
  'customers.credentials': { labelEn: 'Create customer logins and reset their passwords', labelAr: 'إنشاء حسابات دخول للعملاء وإعادة ضبط كلمات المرور', groupEn: 'customers', groupAr: 'customers' },

  'orders.view': { labelEn: 'See orders', labelAr: 'رؤية الطلبات', groupEn: 'orders', groupAr: 'orders' },
  'orders.viewAll': { labelEn: 'See every order, not only their own', labelAr: 'رؤية كل الطلبات وليس طلباته فقط', groupEn: 'orders', groupAr: 'orders' },
  'orders.edit': { labelEn: 'Edit order details', labelAr: 'تعديل تفاصيل الطلب', groupEn: 'orders', groupAr: 'orders' },
  'orders.assign': { labelEn: 'Assign an order to a colleague', labelAr: 'إسناد الطلب لزميل', groupEn: 'orders', groupAr: 'orders' },
  'orders.advance': { labelEn: 'Move an order to its next stage', labelAr: 'نقل الطلب للمرحلة التالية', groupEn: 'orders', groupAr: 'orders' },
  'orders.delete': { labelEn: 'Delete an order', labelAr: 'حذف طلب', groupEn: 'orders', groupAr: 'orders' },

  'production.view': { labelEn: 'See the production floor', labelAr: 'رؤية أرضية الإنتاج', groupEn: 'operations', groupAr: 'operations' },
  'production.act': { labelEn: 'Start, QC and complete manufacturing', labelAr: 'بدء التصنيع وفحص الجودة وإنهاؤه', groupEn: 'operations', groupAr: 'operations' },
  'logistics.view': { labelEn: 'See the dispatch desk', labelAr: 'رؤية مكتب الشحن', groupEn: 'operations', groupAr: 'operations' },
  'logistics.act': { labelEn: 'Ship orders and confirm delivery', labelAr: 'شحن الطلبات وتأكيد التسليم', groupEn: 'operations', groupAr: 'operations' },
  'couriers.manage': { labelEn: 'Manage delivery reps and couriers', labelAr: 'إدارة المندوبين وشركات الشحن', groupEn: 'operations', groupAr: 'operations' },
  'inbox.view': { labelEn: 'Read the enquiry inbox', labelAr: 'قراءة صندوق الرسائل', groupEn: 'operations', groupAr: 'operations' },
  'inbox.act': { labelEn: 'Reply to and close enquiries', labelAr: 'الرد على الرسائل وإغلاقها', groupEn: 'operations', groupAr: 'operations' },

  'categories.manage': { labelEn: 'Edit the product catalogue tree', labelAr: 'تعديل شجرة كتالوج المنتجات', groupEn: 'catalogue', groupAr: 'catalogue' },
  'sampleQuiz.manage': { labelEn: 'Edit the sample quiz questions and specs', labelAr: 'تعديل أسئلة كويز العينة ومواصفاتها', groupEn: 'catalogue', groupAr: 'catalogue' },
  'inventory.view': { labelEn: 'See stock levels', labelAr: 'رؤية أرصدة المخزون', groupEn: 'catalogue', groupAr: 'catalogue' },
  'inventory.manage': { labelEn: 'Record stock movements', labelAr: 'تسجيل حركات المخزون', groupEn: 'catalogue', groupAr: 'catalogue' },

  'promos.manage': { labelEn: 'Create and edit promo codes', labelAr: 'إنشاء وتعديل أكواد الخصم', groupEn: 'marketing', groupAr: 'marketing' },
  'referrals.manage': { labelEn: 'Manage the referral programme', labelAr: 'إدارة برنامج الإحالة', groupEn: 'marketing', groupAr: 'marketing' },

  'accounting.view': { labelEn: 'See invoices, payments and reports', labelAr: 'رؤية الفواتير والمدفوعات والتقارير', groupEn: 'finance', groupAr: 'finance' },
  'accounting.manage': { labelEn: 'Record invoices, payments and expenses', labelAr: 'تسجيل الفواتير والمدفوعات والمصروفات', groupEn: 'finance', groupAr: 'finance' },

  'cms.manage': { labelEn: 'Edit the website content and news', labelAr: 'تعديل محتوى الموقع والأخبار', groupEn: 'content', groupAr: 'content' },
  'knowledge.manage': { labelEn: "Edit the AI assistant's answers", labelAr: 'تعديل إجابات المساعد الذكي', groupEn: 'content', groupAr: 'content' },
  'seo.manage': { labelEn: 'Edit page titles and search settings', labelAr: 'تعديل عناوين الصفحات وإعدادات البحث', groupEn: 'content', groupAr: 'content' },

  'users.view': { labelEn: 'See the staff list and roles', labelAr: 'رؤية قائمة الموظفين والأدوار', groupEn: 'system', groupAr: 'system' },
  'users.manage': { labelEn: 'Add, edit and deactivate staff accounts', labelAr: 'إضافة وتعديل وتعطيل حسابات الموظفين', groupEn: 'system', groupAr: 'system' },
  'settings.manage': { labelEn: 'Change system settings', labelAr: 'تغيير إعدادات النظام', groupEn: 'system', groupAr: 'system' },
  'audit.view': { labelEn: 'Read the audit trail', labelAr: 'قراءة سجل التدقيق', groupEn: 'system', groupAr: 'system' },
};

/** Permissions in display order, grouped by area of the business. */
export function permissionsByGroup(): Array<{
  key: string;
  en: string;
  ar: string;
  permissions: Permission[];
}> {
  return PERMISSION_GROUPS.map((g) => ({
    key: g.key,
    en: g.en,
    ar: g.ar,
    permissions: (PERMISSIONS as readonly Permission[]).filter(
      (p) => PERMISSION_META[p].groupEn === g.key
    ),
  })).filter((g) => g.permissions.length > 0);
}

/** Roles that may be assigned to an order as the responsible party. */
export const ASSIGNABLE_ROLES: Record<'accountManager' | 'factory' | 'courierDesk', Role[]> = {
  accountManager: ['ACCOUNT_MANAGER', 'SALES', 'ADMIN', 'SUPER_ADMIN'],
  factory: ['FACTORY', 'ADMIN', 'SUPER_ADMIN'],
  courierDesk: ['LOGISTICS', 'ADMIN', 'SUPER_ADMIN'],
};

/* ------------------------------------------------------------------ */
/* Presentation                                                        */
/* ------------------------------------------------------------------ */

export interface RoleMeta {
  value: Role;
  labelEn: string;
  labelAr: string;
  descEn: string;
  descAr: string;
  /** Tailwind classes for the role badge — theme-token based. */
  badge: string;
}

export const ROLE_META: Record<Role, RoleMeta> = {
  SUPER_ADMIN: {
    value: 'SUPER_ADMIN',
    labelEn: 'Super Admin', labelAr: 'مدير عام',
    descEn: 'Unrestricted access to every module, including user management and system settings.',
    descAr: 'صلاحية كاملة على كل الأقسام، بما فيها إدارة المستخدمين وإعدادات النظام.',
    badge: 'bg-accent-soft text-accent-soft-fg',
  },
  ADMIN: {
    value: 'ADMIN',
    labelEn: 'Admin', labelAr: 'مدير',
    descEn: 'Full operational access across sales, production, content and finance.',
    descAr: 'صلاحية تشغيلية كاملة على المبيعات والإنتاج والمحتوى والمالية.',
    badge: 'bg-brand-soft text-brand-soft-fg',
  },
  SALES: {
    value: 'SALES',
    labelEn: 'Sales', labelAr: 'المبيعات',
    descEn: 'Leads, customers, orders, promo codes and referrals.',
    descAr: 'العملاء المحتملون والعملاء والطلبات وأكواد الخصم والإحالات.',
    badge: 'bg-info-soft text-info-soft-fg',
  },
  ACCOUNT_MANAGER: {
    value: 'ACCOUNT_MANAGER',
    labelEn: 'Account Manager', labelAr: 'مدير حسابات',
    descEn: 'Owns assigned accounts. Acknowledges new orders, sends quotations, releases work to the factory and follows delivery through.',
    descAr: 'مسؤول عن حساباته. يستلم الطلبات الجديدة ويرسل عروض الأسعار ويحوّل العمل للمصنع ويتابع التسليم.',
    badge: 'bg-brand-soft text-brand-soft-fg',
  },
  FACTORY: {
    value: 'FACTORY',
    labelEn: 'Factory / Production', labelAr: 'المصنع / الإنتاج',
    descEn: 'Sees only orders released to production. Starts, QCs and completes manufacturing.',
    descAr: 'يرى فقط الطلبات المحوّلة للإنتاج. يبدأ التصنيع ويفحص الجودة ويعلن الانتهاء.',
    badge: 'bg-warn-soft text-warn-soft-fg',
  },
  LOGISTICS: {
    value: 'LOGISTICS',
    labelEn: 'Logistics / Dispatch', labelAr: 'الشحن والمناديب',
    descEn: 'Manages delivery reps and couriers. Ships completed orders and confirms delivery.',
    descAr: 'يدير المناديب وشركات الشحن. يشحن الطلبات المنتهية ويؤكد التسليم.',
    badge: 'bg-info-soft text-info-soft-fg',
  },
  ACCOUNTANT: {
    value: 'ACCOUNTANT',
    labelEn: 'Accountant', labelAr: 'محاسب',
    descEn: 'Invoices, payments, expenses and financial reports.',
    descAr: 'الفواتير والمدفوعات والمصروفات والتقارير المالية.',
    badge: 'bg-ok-soft text-ok-soft-fg',
  },
  SUPPORT: {
    value: 'SUPPORT',
    labelEn: 'Customer Support', labelAr: 'خدمة العملاء',
    descEn: 'Inbox, customer enquiries and the knowledge base.',
    descAr: 'صندوق الرسائل واستفسارات العملاء وقاعدة المعرفة.',
    badge: 'bg-accent-soft text-accent-soft-fg',
  },
  CONTENT_EDITOR: {
    value: 'CONTENT_EDITOR',
    labelEn: 'Content Editor', labelAr: 'محرر المحتوى',
    descEn: 'Website content, news, SEO and the product catalogue tree.',
    descAr: 'محتوى الموقع والأخبار وتحسين محركات البحث وشجرة الأقسام.',
    badge: 'bg-warn-soft text-warn-soft-fg',
  },
  STAFF: {
    value: 'STAFF',
    labelEn: 'Staff (general)', labelAr: 'موظف (عام)',
    descEn: 'Read-mostly access to operations plus content tools.',
    descAr: 'صلاحية اطّلاع على العمليات مع أدوات المحتوى.',
    badge: 'bg-neutral text-fg-muted',
  },
  CUSTOMER: {
    value: 'CUSTOMER',
    labelEn: 'Customer', labelAr: 'عميل',
    descEn: 'Customer portal only — their own samples, orders and profile.',
    descAr: 'بوابة العميل فقط — عيّناته وطلباته وملفه الشخصي.',
    badge: 'bg-neutral text-fg-muted',
  },
};

export function roleLabel(role: string | undefined, locale: 'en' | 'ar'): string {
  const meta = ROLE_META[role as Role];
  if (!meta) return role || '';
  return locale === 'ar' ? meta.labelAr : meta.labelEn;
}
