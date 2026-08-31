/**
 * Customer-facing Sample Quiz dictionary.
 *
 * Everything the quiz says that is NOT authored by an admin. Admin-authored
 * text (question titles, choice labels, spec names) is bilingual in the
 * database and resolved with `pick(xEn, xAr)` at render time.
 */

export const quizEn = {
  back: 'Back',
  next: 'Next',
  continue: 'Continue',
  skip: 'Skip this question',
  saveAndReturn: 'Save and return to review',
  loading: 'Preparing your quiz…',
  loadingSpecs: 'Personalizing your specs…',
  noQuestions: 'No questions are configured yet.',

  sections: {
    you: 'You',
    brief: 'Brief',
    category: 'Product',
    specs: 'Specs',
    review: 'Review',
  },

  milestone25: 'Looking good',
  milestone50: 'Halfway there',
  milestone75: 'Almost done',

  questionOf: 'Question {current} of {total}',
  specOf: 'Spec {current} of {total}',
  selectedOf: '{count} of {max} selected',
  selectedCount: '{count} selected',
  pickUpTo: 'Pick up to {max}',
  required: 'Required',
  optional: 'Optional',
  typeAnswer: 'Type your answer…',
  tellUsMore: 'Tell us more…',
  addNote: 'Add a note',
  notePlaceholder: 'Anything else we should know?',
  yes: 'Yes',
  no: 'No',

  // Personalization
  welcomeEyebrow: 'Step 01',
  welcomeTitle: 'First, your name.',
  welcomeSubtitle: 'We personalise every sample bottle — so let’s start with who this is for.',
  namePlaceholder: 'Your first name',
  start: 'Start',

  // Section intros
  briefEyebrow: 'Step 02',
  briefTitle: 'The creative brief.',
  briefBody:
    'A few quick questions so our R&D team can match your vision exactly. Most people finish in under three minutes.',
  briefCta: 'Begin the brief',

  categoryEyebrow: 'Step 03',
  categoryTitle: 'Now, the product.',
  categoryBody:
    'Tell us what we’re crafting. Pick your category, then your sub-family, then the exact product.',
  categoryCta: 'Pick your product',

  specsEyebrow: 'Step 04',
  specsTitle: 'The technical specs.',
  specsBody:
    'Now let’s dial in the science — actives, packaging, colour, scent. This is where your formula gets its DNA.',
  specsCta: 'Customise specs',

  // Category picker
  pickCategory: 'Which category?',
  pickSubCategory: 'Which family?',
  pickProduct: 'Which product exactly?',
  searchProducts: 'Search products…',
  noMatches: 'Nothing matches that search.',

  // Uploads
  uploadPrompt: 'Drop a file here or browse',
  uploading: 'Uploading…',
  uploadFailed: 'Upload failed. Try again.',
  removeFile: 'Remove file',
  maxFileSize: 'Up to 10 MB per file',

  // Packaging configurator
  packaging: {
    title: 'Design your packaging',
    subtitle: 'Pick a bottle, then a cap, then a label. The preview updates as you go.',
    bottle: 'Bottle',
    cap: 'Cap',
    label: 'Label',
    finish: 'Finish',
    color: 'Colour',
    rotateHint: 'Drag to turn it — a full 360°. Arrow keys work too.',
    reset: 'Reset view',
    rotateLeft: 'Turn left',
    rotateRight: 'Turn right',
  },

  // Review
  reviewEyebrow: 'One last look',
  reviewTitle: '{name}, your custom sample brief is ready.',
  reviewSubtitle: 'Review every detail. Edit anything that needs a tweak — submit when it feels right.',
  reviewCategory: 'Category',
  reviewBrief: 'Brief',
  reviewCategoryQuestions: 'About your product',
  reviewSpecs: 'Specs',
  reviewFragrance: 'Fragrance',
  reviewPackaging: 'Packaging',
  reviewDetails: 'Your details',
  reviewEmpty: 'Nothing captured yet.',
  editName: 'Edit name',
  edit: 'Edit',
  note: 'Note',
  emailPlaceholder: 'Email address',
  phonePlaceholder: 'Phone (optional)',
  companyPlaceholder: 'Company / brand (optional)',
  submit: 'Submit sample request',
  submitting: 'Submitting…',
  sending: 'Sending your brief to KCC…',
  emailRequired: 'Please enter your email so we can send confirmation.',
  submitFailed: 'Could not submit your sample request.',

  // Thank you
  thankYouTitle: 'Sample request submitted',
  thankYouHeadline: 'You’re officially in motion, {name}.',
  thankYouBody: 'Our R&D team will start crafting your sample. You’ll hear from us within 2–4 weeks.',
  referenceNumber: 'Reference number',
  viewMySamples: 'View my samples',
  backToHome: 'Back to home',

  // Hero ingredient widget
  hero: {
    yes: 'Yes, I have one in mind',
    no: 'No (let R&D suggest)',
    pickUpToTwo: 'Name up to two hero ingredients',
    ingredientPlaceholder: 'e.g. Niacinamide',
    needHelp: 'I’d like R&D to recommend one',
    excludeLabel: 'Anything we must avoid?',
    excludePlaceholder: 'e.g. no parabens, no sulphates',
  },

  // Fragrance flow
  fragrance: {
    family: 'Fragrance family',
    notes: 'Which notes?',
    intensity: 'How strong?',
    light: 'Light',
    medium: 'Medium',
    strong: 'Strong',
    longLasting: 'Long-lasting',
  },
};

export const quizAr: typeof quizEn = {
  back: 'رجوع',
  next: 'التالي',
  continue: 'متابعة',
  skip: 'تخطي هذا السؤال',
  saveAndReturn: 'حفظ والعودة للمراجعة',
  loading: 'جارٍ تجهيز الاستبيان…',
  loadingSpecs: 'جارٍ تجهيز المواصفات الخاصة بك…',
  noQuestions: 'لا توجد أسئلة مُعدّة بعد.',

  sections: {
    you: 'بياناتك',
    brief: 'الأسئلة العامة',
    category: 'المنتج',
    specs: 'المواصفات',
    review: 'المراجعة',
  },

  milestone25: 'ماشي تمام',
  milestone50: 'وصلت للنصف',
  milestone75: 'قربت تخلّص',

  questionOf: 'السؤال {current} من {total}',
  specOf: 'المواصفة {current} من {total}',
  selectedOf: 'تم اختيار {count} من {max}',
  selectedCount: 'تم اختيار {count}',
  pickUpTo: 'اختر حتى {max}',
  required: 'مطلوب',
  optional: 'اختياري',
  typeAnswer: 'اكتب إجابتك…',
  tellUsMore: 'أخبرنا المزيد…',
  addNote: 'إضافة ملاحظة',
  notePlaceholder: 'هل من شيء آخر يجب أن نعرفه؟',
  yes: 'نعم',
  no: 'لا',

  welcomeEyebrow: 'الخطوة ٠١',
  welcomeTitle: 'أولًا، اسمك.',
  welcomeSubtitle: 'نحن نخصّص كل عبوة عيّنة — فلنبدأ بمعرفة صاحبها.',
  namePlaceholder: 'اسمك الأول',
  start: 'ابدأ',

  briefEyebrow: 'الخطوة ٠٢',
  briefTitle: 'الموجز الإبداعي.',
  briefBody: 'أسئلة سريعة تساعد فريق البحث والتطوير على مطابقة رؤيتك بدقة. أغلب العملاء ينهونها في أقل من ثلاث دقائق.',
  briefCta: 'ابدأ الأسئلة',

  categoryEyebrow: 'الخطوة ٠٣',
  categoryTitle: 'والآن، المنتج.',
  categoryBody: 'أخبرنا بما سنصنعه. اختر القسم، ثم العائلة الفرعية، ثم المنتج بالتحديد.',
  categoryCta: 'اختر منتجك',

  specsEyebrow: 'الخطوة ٠٤',
  specsTitle: 'المواصفات التقنية.',
  specsBody: 'الآن ندخل في التفاصيل — المواد الفعّالة والتغليف واللون والرائحة. هنا تتكوّن هوية تركيبتك.',
  specsCta: 'خصّص المواصفات',

  pickCategory: 'أي قسم؟',
  pickSubCategory: 'أي عائلة؟',
  pickProduct: 'أي منتج بالتحديد؟',
  searchProducts: 'ابحث عن منتج…',
  noMatches: 'لا توجد نتائج مطابقة.',

  uploadPrompt: 'أفلت الملف هنا أو تصفّح',
  uploading: 'جارٍ الرفع…',
  uploadFailed: 'فشل الرفع. حاول مرة أخرى.',
  removeFile: 'إزالة الملف',
  maxFileSize: 'حتى ١٠ ميجابايت للملف',

  packaging: {
    title: 'صمّم عبوتك',
    subtitle: 'اختر الزجاجة، ثم الغطاء، ثم الملصق. المعاينة تتحدث معك خطوة بخطوة.',
    bottle: 'الزجاجة',
    cap: 'الغطاء',
    label: 'الملصق',
    finish: 'التشطيب',
    color: 'اللون',
    rotateHint: 'اسحب لتدويره ٣٦٠ درجة كاملة — وأزرار الأسهم تعمل أيضًا.',
    reset: 'إعادة ضبط العرض',
    rotateLeft: 'تدوير لليسار',
    rotateRight: 'تدوير لليمين',
  },

  reviewEyebrow: 'نظرة أخيرة',
  reviewTitle: '{name}، طلب العيّنة الخاص بك جاهز.',
  reviewSubtitle: 'راجع كل التفاصيل. عدّل ما تحتاج تعديله — وأرسل عندما تطمئن.',
  reviewCategory: 'القسم',
  reviewBrief: 'الأسئلة العامة',
  reviewCategoryQuestions: 'عن منتجك',
  reviewSpecs: 'المواصفات',
  reviewFragrance: 'الرائحة',
  reviewPackaging: 'التغليف',
  reviewDetails: 'بياناتك',
  reviewEmpty: 'لم يتم تسجيل شيء بعد.',
  editName: 'تعديل الاسم',
  edit: 'تعديل',
  note: 'ملاحظة',
  emailPlaceholder: 'البريد الإلكتروني',
  phonePlaceholder: 'الهاتف (اختياري)',
  companyPlaceholder: 'الشركة / العلامة التجارية (اختياري)',
  submit: 'إرسال طلب العيّنة',
  submitting: 'جارٍ الإرسال…',
  sending: 'جارٍ إرسال طلبك إلى KCC…',
  emailRequired: 'من فضلك أدخل بريدك الإلكتروني لنرسل لك التأكيد.',
  submitFailed: 'تعذّر إرسال طلب العيّنة.',

  thankYouTitle: 'تم إرسال طلب العيّنة',
  thankYouHeadline: 'انطلقنا رسميًا، {name}.',
  thankYouBody: 'سيبدأ فريق البحث والتطوير في تجهيز عيّنتك. سنتواصل معك خلال ٢–٤ أسابيع.',
  referenceNumber: 'الرقم المرجعي',
  viewMySamples: 'عرض عيّناتي',
  backToHome: 'العودة للرئيسية',

  hero: {
    yes: 'نعم، لديّ مكوّن محدد',
    no: 'لا (اتركوا الاختيار للبحث والتطوير)',
    pickUpToTwo: 'اذكر حتى مكوّنين رئيسيين',
    ingredientPlaceholder: 'مثال: نياسيناميد',
    needHelp: 'أفضّل أن يرشّح فريق البحث والتطوير مكوّنًا',
    excludeLabel: 'هل من مكوّنات يجب تجنّبها؟',
    excludePlaceholder: 'مثال: بدون بارابين، بدون سلفات',
  },

  fragrance: {
    family: 'عائلة الرائحة',
    notes: 'أي نفحات؟',
    intensity: 'ما درجة القوة؟',
    light: 'خفيفة',
    medium: 'متوسطة',
    strong: 'قوية',
    longLasting: 'ثابتة وطويلة',
  },
};
