import type { Role } from '@/lib/roles';

/**
 * How KCC runs, written down. Shown in the admin panel under Workflow & SOPs.
 *
 * The rules themselves live in code (orderWorkflow.ts, accounting.ts, crmFlow.ts).
 * This explains them in the order a person meets them. "system" lines say what
 * happens without anyone doing it, so nobody does it twice.
 */

type Text = { en: string; ar: string };
const t = (en: string, ar: string): Text => ({ en, ar });

export interface FlowStage {
  key: string;
  title: Text;
  who: Role[];
  page: { label: Text; href: string };
  doThis: Text[];
  system: Text[];
  doneWhen: Text;
}

export const FLOW: FlowStage[] = [
  {
    key: 'prospect',
    title: t('1. Target and visit', '1. الاستهداف والزيارة'),
    who: ['SALES', 'ACCOUNT_MANAGER'],
    page: { label: t('Upcoming clients', 'العملاء القادمون'), href: '/admin/crm/upcoming' },
    doThis: [
      t('Plan the week\'s visits in the Journey plan.', 'خطط زيارات الأسبوع في خطة الزيارات.'),
      t('After every visit, call or WhatsApp, press "Log an action" on the account the same day.', 'بعد كل زيارة أو مكالمة أو واتساب، اضغط «تسجيل إجراء» على الحساب في نفس اليوم.'),
      t('Fill in the key person, the feedback and the next step.', 'املأ الشخص المسؤول ورد الحساب والخطوة التالية.'),
    ],
    system: [
      t('The first logged action moves the account from Upcoming to Current and makes it yours.', 'أول إجراء يُسجَّل ينقل الحساب من القادمين إلى الحاليين ويصبح باسمك.'),
      t('Your KPIs are counted from what you log.', 'مؤشراتك تُحسب مما تسجله.'),
    ],
    doneWhen: t('The client asks for a sample or a price.', 'يطلب العميل عيّنة أو سعرًا.'),
  },
  {
    key: 'request',
    title: t('2. The request arrives', '2. وصول الطلب'),
    who: ['SALES', 'ACCOUNT_MANAGER', 'CUSTOMER'],
    page: { label: t('Orders', 'الطلبات'), href: '/admin/orders' },
    doThis: [
      t('The client fills in the sample quiz or bulk form from their own login.', 'يملأ العميل استبيان العيّنة أو نموذج الجملة من حسابه.'),
      t('For a target with no login, press "Make a client" on their account, then have an admin set the password.', 'للعميل بدون حساب، اضغط «تحويل إلى عميل» من صفحة حسابه، ثم يضبط المسؤول كلمة المرور.'),
      t('Press "Acknowledge receipt" on the order.', 'اضغط «تأكيد الاستلام» على الطلب.'),
    ],
    system: [
      t('The order finds its CRM account by company name, or creates one.', 'يربط الطلب نفسه بحساب CRM باسم الشركة، أو ينشئ حسابًا جديدًا.'),
      t('The account owner becomes the order\'s account manager.', 'يصبح مسؤول الحساب هو مدير الطلب.'),
      t('The team is notified.', 'يصل إشعار للفريق.'),
    ],
    doneWhen: t('The order is Under Review.', 'يصبح الطلب «قيد المراجعة».'),
  },
  {
    key: 'quote',
    title: t('3. Review and quotation', '3. المراجعة وعرض السعر'),
    who: ['ACCOUNT_MANAGER', 'SALES'],
    page: { label: t('Orders', 'الطلبات'), href: '/admin/orders' },
    doThis: [
      t('Read the brief. Approve it, reject it with a reason, or put it on hold.', 'راجع الطلب، ووافق عليه أو ارفضه مع ذكر السبب أو أوقفه مؤقتًا.'),
      t('For a paid order, press "Send quotation" and enter the price. A free sample goes straight to the factory.', 'للطلب المدفوع اضغط «إرسال عرض السعر» وأدخل السعر. العيّنة المجانية تذهب مباشرة للمصنع.'),
    ],
    system: [
      t('The customer is emailed the price and sees it on their order, with VAT.', 'يصل العميل السعر بالبريد ويراه على طلبه شامل الضريبة.'),
      t('A follow-up is created for the account owner in 3 days.', 'تُنشأ متابعة لمسؤول الحساب بعد 3 أيام.'),
      t('The commercial step is ticked on the account.', 'تُسجَّل الخطوة التجارية على الحساب.'),
    ],
    doneWhen: t('The client accepts and you press "Mark awaiting payment".', 'يوافق العميل وتضغط «بانتظار الدفع».'),
  },
  {
    key: 'payment',
    title: t('4. Invoice and payment', '4. الفاتورة والدفع'),
    who: ['ACCOUNTANT', 'ACCOUNT_MANAGER'],
    page: { label: t('Invoices', 'الفواتير'), href: '/admin/accounting/invoices' },
    doThis: [
      t('Open the invoice and press "Record Payment" for each amount that arrives, with its reference.', 'افتح الفاتورة واضغط «تسجيل دفعة» لكل مبلغ يصل، مع رقمه المرجعي.'),
      t('When the invoice is paid in full, press "Confirm payment" on the order.', 'عند سداد الفاتورة بالكامل، اضغط «تأكيد الدفع» على الطلب.'),
      t('A refund is marked on the payment. Never delete money that arrived.', 'الاسترداد يُسجَّل على الدفعة، ولا تُحذف مبالغ وصلت.'),
    ],
    system: [
      t('The invoice is issued by itself at "Awaiting Payment", numbered in sequence.', 'تصدر الفاتورة تلقائيًا عند «بانتظار الدفع» برقم متسلسل.'),
      t('Confirming on the order records whatever is still owed.', 'التأكيد على الطلب يسجل المتبقي تلقائيًا.'),
      t('The account moves to Won and the quotation follow-up closes.', 'ينتقل الحساب إلى «فوز» وتُغلق متابعة العرض.'),
    ],
    doneWhen: t('The order is Payment Received.', 'يصبح الطلب «تم استلام الدفع».'),
  },
  {
    key: 'production',
    title: t('5. Production and quality', '5. التصنيع والجودة'),
    who: ['ACCOUNT_MANAGER', 'FACTORY'],
    page: { label: t('Production Floor', 'الإنتاج'), href: '/admin/production' },
    doThis: [
      t('The account manager presses "Release to factory".', 'يضغط مدير الحساب «تحويل للمصنع».'),
      t('Before starting, the factory lists the order\'s materials on the order page ("Add materials"), or copies them from an earlier order.', 'قبل البدء، يكتب المصنع خامات الطلب في صفحة الطلب («إضافة خامات») أو ينسخها من طلب سابق.'),
      t('The factory presses Start, sends to QC, then QC passed. A failed QC goes back with a note.', 'يضغط المصنع «بدء التصنيع» ثم الفحص ثم «اجتاز». الفشل يعود مع ملاحظة.'),
      t('Used more or less than planned? Edit the list on the order; nothing is entered in Inventory by hand.', 'استخدمت أكثر أو أقل من المخطط؟ عدّل القائمة في الطلب، ولا يُسجَّل شيء يدويًا في المخزون.'),
    ],
    system: [
      t('"Start production" takes the materials off the stock by itself, and records each movement against the order.', '«بدء التصنيع» يخصم الخامات من المخزون تلقائيًا ويسجل كل حركة باسم الطلب.'),
      t('If anything is short, production does not start, and the screen says what is missing and how much.', 'لو فيه نقص، لا يبدأ التصنيع، وتوضح الشاشة الناقص وكميته.'),
      t('Any later change to the list takes or returns only the difference. A low item alerts the team.', 'أي تعديل بعد ذلك يخصم أو يرجّع الفرق فقط، والصنف المنخفض ينبّه الفريق.'),
      t('The order\'s materials cost and margin are worked out at average cost.', 'تُحسب تكلفة خامات الطلب وهامشه بمتوسط التكلفة.'),
      t('The factory only sees orders released to it.', 'لا يرى المصنع إلا الطلبات المحوّلة إليه.'),
      t('The customer sees each stage on their tracker.', 'يرى العميل كل مرحلة في متابعة طلبه.'),
    ],
    doneWhen: t('The order is Production Complete.', 'يصبح الطلب «انتهى الإنتاج».'),
  },
  {
    key: 'delivery',
    title: t('6. Dispatch and delivery', '6. الشحن والتسليم'),
    who: ['ACCOUNT_MANAGER', 'LOGISTICS'],
    page: { label: t('Dispatch & Delivery', 'الشحن والتسليم'), href: '/admin/logistics' },
    doThis: [
      t('The account manager signs off for dispatch.', 'يعتمد مدير الحساب الطلب للشحن.'),
      t('Dispatch assigns the courier and tracking number, then ships.', 'يعيّن الشحن المندوب ورقم التتبع ثم يشحن.'),
      t('Confirm delivery. A failed attempt goes back with a note.', 'أكّد التسليم. المحاولة الفاشلة تعود مع ملاحظة.'),
    ],
    system: [
      t('An order cannot ship without a named courier.', 'لا يمكن شحن طلب بدون مندوب.'),
      t('The customer sees the tracking number.', 'يرى العميل رقم التتبع.'),
      t('A follow-up is created for the owner 7 days after delivery.', 'تُنشأ متابعة للمسؤول بعد 7 أيام من التسليم.'),
    ],
    doneWhen: t('The order is Delivered.', 'يصبح الطلب «تم التسليم».'),
  },
  {
    key: 'after',
    title: t('7. After delivery', '7. ما بعد التسليم'),
    who: ['ACCOUNT_MANAGER', 'SALES', 'SUPPORT'],
    page: { label: t('Tasks', 'المهام'), href: '/admin/crm/tasks' },
    doThis: [
      t('Do the follow-up call and log it.', 'نفّذ مكالمة المتابعة وسجّلها.'),
      t('Handle complaints on Complaints & suggestions, writing what was done.', 'عالج الشكاوى من صفحة الشكاوى واكتب ما تم.'),
      t('Press "Close order" when nothing is outstanding, and ask for the reorder.', 'اضغط «إغلاق الطلب» عند انتهاء كل شيء، واسأل عن إعادة الطلب.'),
    ],
    system: [
      t('The customer\'s rating lands on the account. Two stars or fewer becomes an open complaint.', 'يصل تقييم العميل إلى حسابه، ونجمتان أو أقل تتحول إلى شكوى مفتوحة.'),
      t('Everything above appears in the client file.', 'كل ما سبق يظهر في ملف العميل.'),
    ],
    doneWhen: t('The order is Closed.', 'يصبح الطلب «مغلق».'),
  },
];

export interface RoleSop { role: Role; daily: Text[]; pages: Array<{ label: Text; href: string }> }

export const ROLE_SOPS: RoleSop[] = [
  {
    role: 'SALES',
    daily: [
      t('Start with Tasks: clear what is due today.', 'ابدأ بالمهام: أنهِ مستحقات اليوم.'),
      t('Follow the Journey plan: the target is in your KPIs.', 'التزم بخطة الزيارات، والمستهدف في مؤشراتك.'),
      t('Log every contact before the day ends. What is not logged did not happen.', 'سجّل كل تواصل قبل نهاية اليوم، فما لم يُسجَّل لم يحدث.'),
      t('Move new requests to Under Review the same day.', 'انقل الطلبات الجديدة إلى المراجعة في نفس اليوم.'),
    ],
    pages: [{ label: t('Tasks', 'المهام'), href: '/admin/crm/tasks' }, { label: t('Journey plan', 'خطة الزيارات'), href: '/admin/crm/plan' }, { label: t('Sales KPIs', 'مؤشرات المبيعات'), href: '/admin/crm/kpis' }],
  },
  {
    role: 'ACCOUNT_MANAGER',
    daily: [
      t('Check your queue on the dashboard: Submitted, Under Review, Approved, Quotation Sent, Payment Received, Production Complete, Delivered, On Hold.', 'راجع قائمتك في لوحة التحكم: كل طلب ينتظر خطوة منك.'),
      t('Review your team\'s KPIs weekly.', 'راجع مؤشرات فريقك أسبوعيًا.'),
      t('Keep every open complaint moving.', 'تابع كل شكوى مفتوحة حتى تُغلق.'),
    ],
    pages: [{ label: t('Orders', 'الطلبات'), href: '/admin/orders' }, { label: t('Sales KPIs', 'مؤشرات المبيعات'), href: '/admin/crm/kpis' }, { label: t('Complaints', 'الشكاوى'), href: '/admin/crm/feedback' }],
  },
  {
    role: 'ACCOUNTANT',
    daily: [
      t('Record every payment the day it arrives, with its reference.', 'سجّل كل دفعة يوم وصولها مع مرجعها.'),
      t('Check Overview for priced orders with no invoice.', 'راجع الطلبات المسعّرة بلا فاتورة في النظرة العامة.'),
      t('Chase Receivables weekly, oldest first.', 'تابع المستحقات أسبوعيًا، الأقدم أولًا.'),
      t('Enter expenses with their VAT, and take the VAT report at month end.', 'أدخل المصروفات بضريبتها، واستخرج تقرير الضريبة نهاية الشهر.'),
      t('Stock bought with a price is already an expense: do not enter the same purchase again.', 'المخزون المسجل بسعر شراء أصبح مصروفًا بالفعل، فلا تُدخل نفس الشراء مرة أخرى.'),
    ],
    pages: [{ label: t('Invoices', 'الفواتير'), href: '/admin/accounting/invoices' }, { label: t('Receivables', 'المستحقات'), href: '/admin/accounting/receivables' }, { label: t('Financial reports', 'التقارير المالية'), href: '/admin/accounting/reports' }],
  },
  {
    role: 'FACTORY',
    daily: [
      t('Work the Production Floor from the left column.', 'اعمل من صفحة الإنتاج من أول عمود.'),
      t('Update the status when work actually moves, not at the end of the day.', 'حدّث الحالة عند التنفيذ الفعلي، لا في نهاية اليوم.'),
      t('Write the reason on every failed QC.', 'اكتب السبب عند كل فشل في الجودة.'),
      t('List each order\'s materials before it reaches the floor, so a shortage shows up early.', 'اكتب خامات كل طلب قبل وصوله للتصنيع، ليظهر أي نقص مبكرًا.'),
      t('Record every delivery from a supplier as Stock In with the price paid: the cost and the expense follow by themselves.', 'سجّل كل توريد من المورد «وارد» بسعر الشراء، فتتحدث التكلفة ويُسجَّل المصروف تلقائيًا.'),
      t('Correct a count with an Adjustment, never by editing the item.', 'صحّح الجرد بحركة «تسوية»، لا بتعديل الصنف.'),
    ],
    pages: [{ label: t('Production Floor', 'الإنتاج'), href: '/admin/production' }, { label: t('Inventory', 'المخزون'), href: '/admin/inventory' }],
  },
  {
    role: 'LOGISTICS',
    daily: [
      t('Assign a courier and tracking number before shipping.', 'عيّن المندوب ورقم التتبع قبل الشحن.'),
      t('Confirm delivery the moment it happens.', 'أكّد التسليم فور حدوثه.'),
      t('Write what went wrong on a failed attempt.', 'اكتب ما حدث عند فشل التسليم.'),
    ],
    pages: [{ label: t('Dispatch & Delivery', 'الشحن والتسليم'), href: '/admin/logistics' }],
  },
  {
    role: 'SUPPORT',
    daily: [
      t('Answer the Inbox the same day.', 'أجب صندوق الرسائل في نفس اليوم.'),
      t('Open the client file before replying, so you know their history.', 'افتح ملف العميل قبل الرد لتعرف تاريخه.'),
      t('Keep the knowledge base current.', 'حافظ على تحديث قاعدة المعرفة.'),
    ],
    pages: [{ label: t('Inbox', 'صندوق الرسائل'), href: '/admin/inbox' }, { label: t('Customers', 'العملاء'), href: '/admin/customers' }],
  },
  {
    role: 'ADMIN',
    daily: [
      t('Check denied and failed entries in the Audit log.', 'راجع العمليات المرفوضة والفاشلة في سجل المراجعة.'),
      t('Disable an account the day someone leaves: it takes effect at once.', 'عطّل الحساب يوم مغادرة الموظف، ويسري فورًا.'),
      t('Keep the VAT and CR numbers current in Settings.', 'حدّث الرقم الضريبي والسجل التجاري في الإعدادات.'),
    ],
    pages: [{ label: t('Audit log', 'سجل المراجعة'), href: '/admin/audit' }, { label: t('Users & Roles', 'المستخدمون والصلاحيات'), href: '/admin/users' }, { label: t('Settings', 'الإعدادات'), href: '/admin/settings' }],
  },
];
