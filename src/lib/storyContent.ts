/**
 * The company story, as told in "KCC Commercial Profile 2027" (the designer's
 * story deck), in English and Arabic. The home and About pages read from here.
 *
 * Kept in one file so the wording can be reviewed and changed in one place;
 * the figures are the profile's own (ECC Group, Euromonitor 2024).
 */

export type Pair = { en: string; ar: string };
const p = (en: string, ar: string): Pair => ({ en, ar });

export const STORY_IMG = (k: string) => `/images/story/${k}.webp`;

export const HERO = {
  eyebrow: p('The Digital Beauty Hub', 'مركز الجمال الرقمي'),
  // The highlighted last word is rendered apart, in green.
  title: p('Four decades of expertise, now operating in', 'أربعة عقود من الخبرة، تعمل الآن في'),
  place: p('Jeddah.', 'جدة.'),
  story: p('The complete commercial story behind KCC Saudi Arabia', 'القصة التجارية الكاملة لـ KCC السعودية'),
  tagline: p('From concept to cart. Digitally connected.', 'من الفكرة إلى سلة المتسوق. بتواصل رقمي كامل.'),
  meta: p('KCC BV for Cosmetics  |  Commercial Profile 2027  |  Office & plant in Jeddah, Saudi Arabia', 'KCC BV لمستحضرات التجميل  |  الملف التجاري 2027  |  المكتب والمصنع في جدة، المملكة العربية السعودية'),
  start: p('Start the story', 'ابدأ القصة'),
};

export const CATEGORY_TICKER: Pair[] = [
  p('Scalp & Hair Science', 'علوم فروة الرأس والشعر'),
  p('Solar Protection', 'الحماية من الشمس'),
  p('Advanced Skin Care', 'العناية المتقدمة بالبشرة'),
  p('Body Barrier Care', 'العناية بحاجز الجسم'),
  p('Gentle Baby Care', 'عناية لطيفة بالأطفال'),
  p('Hygiene & Freshness', 'النظافة والانتعاش'),
  p('Color Cosmetics', 'مستحضرات التجميل الملونة'),
  p('Proudly made in Saudi Arabia', 'صُنع بفخر في المملكة العربية السعودية'),
];

export const DIRECTION = {
  eyebrow: p('Vision, mission and values', 'الرؤية والرسالة والقيم'),
  title: p('Our strategic direction', 'توجهنا الاستراتيجي'),
  vision: p(
    'The leading digitally enabled beauty innovation and manufacturing hub in Saudi Arabia, the GCC and the Middle East.',
    'المركز الرائد للابتكار والتصنيع في مجال الجمال، المدعوم رقميًا، في المملكة العربية السعودية ودول الخليج والشرق الأوسط.'
  ),
  mission: p(
    'Transforming beauty product development through digital integration, innovation and manufacturing excellence.',
    'نُحوّل تطوير منتجات الجمال من خلال التكامل الرقمي والابتكار والتميز في التصنيع.'
  ),
  values: [p('Quality', 'الجودة'), p('Innovation', 'الابتكار'), p('Integrity', 'النزاهة'), p('Collaboration', 'التعاون'), p('Localization', 'التوطين')],
  labels: { vision: p('Vision', 'الرؤية'), mission: p('Mission', 'الرسالة'), values: p('Our values', 'قيمنا') },
};

export const NUMBERS = {
  eyebrow: p('ECC Holding Group in numbers', 'مجموعة ECC القابضة بالأرقام'),
  title: p('The scale behind the ECC Holding Group ecosystem', 'الحجم الذي يقف خلف منظومة مجموعة ECC القابضة'),
  items: [
    { value: 40, suffix: '+', label: p('years of manufacturing', 'عامًا من التصنيع'), detail: p('ECC began in 1981 as a small laboratory in Egypt producing cosmetic oils and soap, and has grown over four decades into an integrated group.', 'بدأت ECC عام 1981 مختبرًا صغيرًا في مصر لإنتاج زيوت التجميل والصابون، ونمت على مدى أربعة عقود لتصبح مجموعة متكاملة.') },
    { value: 6, suffix: '', label: p('integrated factories in Egypt', 'مصانع متكاملة في مصر'), detail: p('ECC Cosmetics (two factories), SmartPack (two packaging factories), Kato Prestige (aerosols) and ECC Nutrition Hub (wellness).', 'ECC للتجميل (مصنعان)، وسمارت باك (مصنعان للتغليف)، وكاتو بريستيج (البخاخات)، ومركز ECC للتغذية (العافية).') },
    { value: 3000, suffix: '+', label: p('people', 'موظف'), detail: p('Formulation know-how, quality and GMP systems, and people and training: what ECC brings across to KCC.', 'خبرة التركيب، وأنظمة الجودة وممارسات التصنيع الجيد، والكوادر والتدريب: هذا ما تنقله ECC إلى KCC.') },
    { value: 180, suffix: 'M', label: p('units a year', 'وحدة سنويًا'), detail: p('ECC Group produces 180M units a year. KCC’s first phase in Jeddah is designed for 40 million.', 'تنتج مجموعة ECC ‏180 مليون وحدة سنويًا، والمرحلة الأولى لـ KCC في جدة مصممة لـ 40 مليون وحدة.') },
    { value: 800, suffix: '+', label: p('brands served', 'علامة تجارية'), detail: p('Among them Unilever, for whom ECC has been a third-party manufacturer for personal care since COVID-19.', 'من بينها يونيليفر، التي تصنّع لها ECC منتجات العناية الشخصية منذ جائحة كوفيد-19.') },
    { value: 30, suffix: '+', label: p('countries', 'دولة'), detail: p('ECC’s reach spans more than 30 countries. KCC now brings that experience to the Saudi market.', 'يمتد حضور ECC إلى أكثر من 30 دولة، وتنقل KCC هذه الخبرة الآن إلى السوق السعودي.') },
  ],
};

export const COMMITMENT = {
  eyebrow: p('Supporting Saudi Vision 2030', 'دعمًا لرؤية السعودية 2030'),
  title: p('Our commitment to the Kingdom', 'التزامنا تجاه المملكة'),
  sub: p('Built in Jeddah. Operating in the Kingdom.', 'بُني في جدة. ويعمل في المملكة.'),
  items: [
    { icon: 'factory', title: p('Localized manufacturing', 'تصنيع محلي'), text: p('Manufacturing operations and jobs in Saudi Arabia', 'عمليات تصنيع ووظائف داخل المملكة العربية السعودية') },
    { icon: 'globe', title: p('Saudi brands that compete globally', 'علامات سعودية تنافس عالميًا'), text: p('Global ingredients and innovation, so local brands can match international quality', 'مكونات وابتكارات عالمية تُمكّن العلامات المحلية من مضاهاة الجودة الدولية') },
    { icon: 'users', title: p('Knowledge transfer', 'نقل المعرفة'), text: p('Four decades of ECC Group know-how, people and systems', 'أربعة عقود من خبرات مجموعة ECC وكوادرها وأنظمتها') },
    { icon: 'truck', title: p('Shorter supply chains', 'سلاسل إمداد أقصر'), text: p('Local production and delivery from Jeddah', 'إنتاج وتسليم محلي من جدة') },
  ],
  digital: {
    eyebrow: p('Digitally connected', 'متصلون رقميًا'),
    text: p('FormulateX links brands to our Jeddah plant online, from brief to bulk order', 'تربط منصة FormulateX العلامات التجارية بمصنعنا في جدة عبر الإنترنت، من الفكرة الأولى حتى طلب الجملة'),
    chips: [p('Brief online', 'الفكرة عبر الإنترنت'), p('Request samples', 'طلب العينات'), p('Place bulk orders', 'طلبات الجملة'), p('Track every step', 'تتبّع كل خطوة')],
  },
};

/** Where KCC is: both its office and its plant are in Jeddah. */
export const LOCATIONS = {
  office: p('Office · Jeddah, Saudi Arabia', 'المكتب · جدة، المملكة العربية السعودية'),
  plant: p('Plant · B8, Third Industrial Zone, Al Bladiyah, Jeddah', 'المصنع · B8، المنطقة الصناعية الثالثة، البلدية، جدة'),
};

export const PLANT = {
  eyebrow: p('KCC Saudi Arabia', 'KCC السعودية'),
  big: p('40 million', '40 مليون'),
  title: p('units a year, from the first phase', 'وحدة سنويًا منذ المرحلة الأولى'),
  since: p('Operating from January 2027', 'يبدأ التشغيل في يناير 2027'),
  where: p('KCC B8 plant · Third Industrial Zone, Al Bladiyah, Jeddah', 'مصنع KCC B8 · المنطقة الصناعية الثالثة، البلدية، جدة'),
  builtFor: p('Built for', 'صُمّم من أجل'),
  audiences: [p('Beauty companies', 'شركات التجميل'), p('Emerging brands', 'العلامات الناشئة'), p('Pharmacy chains', 'سلاسل الصيدليات'), p('Digital brands', 'العلامات الرقمية'), p('Clinics', 'العيادات'), p('Distributors', 'الموزعين')],
};

export const LINES = {
  eyebrow: p('Production lines', 'خطوط الإنتاج'),
  title: p('Six lines, installed and ready', 'ستة خطوط، مُركّبة وجاهزة'),
  items: [
    { img: 'ln0', name: p('Tube', 'الأنابيب'), text: p('Creams, gels, lotions and masks', 'الكريمات والجل واللوشن والأقنعة') },
    { img: 'ln1', name: p('Liquid', 'السوائل'), text: p('Shampoos, washes, toners and lotions', 'الشامبو والغسول والتونر واللوشن') },
    { img: 'ln2', name: p('Serum', 'السيروم'), text: p('Serums, oils and ampoules', 'السيروم والزيوت والأمبولات') },
    { img: 'ln3', name: p('Sunscreen', 'واقي الشمس'), text: p('Creams, lotions, fluids and gels', 'كريمات ولوشن وسوائل وجل') },
    { img: 'ln4', name: p('Roll-on', 'الرول أون'), text: p('Roll-on deodorants', 'مزيلات العرق رول أون') },
    { img: 'ln5', name: p('Makeup', 'المكياج'), text: p('Foundations, concealers and lip products, in small batches', 'كريم الأساس والكونسيلر ومنتجات الشفاه بدفعات صغيرة'), phase2: true },
  ],
  phase2: p('Phase 2', 'المرحلة الثانية'),
};

export const MAKE = {
  eyebrow: p('What we make', 'ما نصنعه'),
  title: p('Seven care categories, one integrated group', 'سبع فئات للعناية، ومجموعة واحدة متكاملة'),
  categories: [
    { icon: 'waves', name: p('Scalp & Hair Science', 'علوم فروة الرأس والشعر'), text: p('Shampoos, conditioners, masks, scalp lotions, serums, ampoules', 'شامبو وبلسم وأقنعة ولوشن لفروة الرأس وسيروم وأمبولات') },
    { icon: 'sun', name: p('Solar Protection System', 'منظومة الحماية من الشمس'), text: p('Sunscreen creams, lotions, fluids, gels, tinted concepts', 'كريمات ولوشن وسوائل وجل واقية من الشمس، وتركيبات ملونة') },
    { icon: 'sparkles', name: p('Advanced Skin Care', 'العناية المتقدمة بالبشرة'), text: p('Cleansers, toners, serums, ampoules, moisturizers', 'منظفات وتونر وسيروم وأمبولات ومرطبات') },
    { icon: 'drop', name: p('Body Barrier Care', 'العناية بحاجز الجسم'), text: p('Washes, lotions, creams, oils, hand and foot care', 'غسول ولوشن وكريمات وزيوت، وعناية باليدين والقدمين') },
    { icon: 'heart', name: p('Gentle Baby Care', 'عناية لطيفة بالأطفال'), text: p('Washes, lotions, creams, diaper care', 'غسول ولوشن وكريمات، وعناية بمنطقة الحفاض') },
    { icon: 'shield', name: p('Hygiene & Freshness', 'النظافة والانتعاش'), text: p('Hand and intimate washes, cleansing gels, roll-on deodorants', 'غسول لليدين وللمناطق الحساسة، وجل منظف، ومزيلات عرق رول أون') },
    { icon: 'star', name: p('Color Cosmetics', 'مستحضرات التجميل الملونة'), text: p('Foundations, concealers, lip products', 'كريم الأساس والكونسيلر ومنتجات الشفاه'), phase2: true },
  ],
  textures: {
    eyebrow: p('Versatile manufacturing', 'تصنيع متعدد الإمكانات'),
    title: p('Expertise across every form and texture', 'خبرة في كل شكل وقوام'),
    items: [
      { img: 'tx0', name: p('Liquids', 'السوائل'), list: p('Hair lotions and tonics · Facial toners · Liquid serums · Body mists · Scalp treatments', 'لوشن وتونيك الشعر · تونر الوجه · السيروم السائل · بخاخات الجسم · علاجات فروة الرأس') },
      { img: 'tx1', name: p('Viscous liquids', 'السوائل اللزجة'), list: p('Shampoos · Shower gels · Liquid hand soaps · Facial cleansing gels', 'الشامبو · جل الاستحمام · صابون اليدين السائل · جل تنظيف الوجه') },
      { img: 'tx2', name: p('Semi-solids', 'شبه الصلبة'), list: p('Face and body creams · Moisturizers · Hair masks · Gels · Cream foundations', 'كريمات الوجه والجسم · المرطبات · أقنعة الشعر · الجل · كريم الأساس') },
      { img: 'tx3', name: p('Solids and structured makeup', 'الصلبة والمكياج المُشكّل'), list: p('Lipsticks · Lip balms · Makeup sticks · Blushes', 'أحمر الشفاه · مرطب الشفاه · أصابع المكياج · أحمر الخدود'), phase2: true },
    ],
  },
};

export const MARKET = {
  eyebrow: p('Market opportunity', 'فرصة السوق'),
  title: p('Saudi personal care: sustained double-digit growth to 2029', 'العناية الشخصية في السعودية: نمو مستدام بخانتين حتى 2029'),
  unit: p('US$ billion', 'مليار دولار أمريكي'),
  years: [['2025', 8.5], ['2026', 9.3], ['2027', 10.3], ['2028', 11.4], ['2029', 12.6]] as Array<[string, number]>,
  cagr: { value: '10.5%', label: p('forecast annual growth, 2025 to 2029', 'نمو سنوي متوقع من 2025 إلى 2029') },
  size: { value: 'US$ 12.6B', label: p('market size by 2029', 'حجم السوق بحلول 2029') },
  population: [
    { value: '33M', label: p('total population, 2024', 'إجمالي السكان، 2024') },
    { value: '28M', label: p('urban population, 2024', 'سكان المدن، 2024') },
  ],
  source: p('Source: Euromonitor, 2024.', 'المصدر: يورومونيتور، 2024.'),
};

export const FORMULATEX = {
  eyebrow: p('FormulateX · Digital to physical', 'FormulateX · من الرقمي إلى الواقع'),
  title: p('Your brand. Your product brief.', 'علامتك. وفكرة منتجك.'),
  text: p(
    'A confidential digital product co-creation experience that turns customer choices into an R&D-ready request. Formulate your own product online, then choose its pack.',
    'تجربة رقمية سرية لتطوير المنتجات بالمشاركة، تحوّل اختيارات العميل إلى طلب جاهز لفريق البحث والتطوير. صمّم منتجك عبر الإنترنت، ثم اختر عبوته.'
  ),
  steps: [
    { title: p('Customer concept', 'فكرة العميل'), text: p('An idea, a benchmark or a gap in the market', 'فكرة، أو منتج مرجعي، أو فجوة في السوق') },
    { title: p('FormulateX brief', 'الموجز عبر FormulateX'), text: p('Benefits, actives, texture, fragrance and pack', 'الفوائد والمكونات الفعالة والقوام والعطر والعبوة') },
    { title: p('R&D feasibility', 'دراسة الجدوى'), text: p('KCC R&D checks formula, cost and regulatory fit', 'يراجع فريق KCC التركيبة والتكلفة والمتطلبات التنظيمية') },
    { title: p('Formula and sample', 'التركيبة والعينة'), text: p('The first formula is developed and sampled', 'تُطوّر التركيبة الأولى وتُنتج عينتها') },
    { title: p('Customer feedback', 'ملاحظات العميل'), text: p('The customer tests, comments and approves', 'يجرّب العميل ويعلّق ويعتمد') },
  ],
  promises: [p('Confidential: your brief stays yours', 'سرّي: فكرتك تبقى ملكك'), p('Guided: step by step, online', 'موجّه: خطوة بخطوة عبر الإنترنت'), p('R&D-ready: your choices become a clear request', 'جاهز للتطوير: اختياراتك تصبح طلبًا واضحًا'), p('Tracked: follow your project online', 'قابل للتتبع: تابع مشروعك عبر الإنترنت')],
  packs: [p('Tubes', 'أنابيب'), p('Jars', 'برطمانات'), p('Bottles', 'زجاجات'), p('Ampoules', 'أمبولات'), p('Pumps', 'مضخات'), p('Sprays', 'بخاخات'), p('Droppers', 'قطّارات')],
  cta: p('Request a sample', 'اطلب عينة'),
};

export const ODM = {
  eyebrow: p('Integrated ODM', 'التصنيع المتكامل ODM'),
  title: p('From concept to cart, in fifteen connected steps', 'من الفكرة إلى سلة المتسوق، في خمس عشرة خطوة مترابطة'),
  sub: p('One connected manufacturing journey in three phases. Track progress online at every step.', 'رحلة تصنيع واحدة مترابطة في ثلاث مراحل، مع تتبع التقدم عبر الإنترنت في كل خطوة.'),
  phases: [
    { img: 'fxh', label: p('Phase 01', 'المرحلة 01'), name: p('Discover and develop', 'الاكتشاف والتطوير'), steps: [p('Concept', 'الفكرة'), p('FormulateX', 'FormulateX'), p('R&D feasibility', 'دراسة الجدوى'), p('Development', 'التطوير'), p('Sample', 'العينة')] },
    { img: 'qa', label: p('Phase 02', 'المرحلة 02'), name: p('Approve and prepare', 'الاعتماد والتجهيز'), steps: [p('Feedback', 'الملاحظات'), p('Sample approval', 'اعتماد العينة'), p('Testing and regulatory', 'الاختبارات والتسجيل'), p('Packaging', 'التغليف'), p('Contract and order', 'العقد والطلب')] },
    { img: 'mfg', label: p('Phase 03', 'المرحلة 03'), name: p('Produce and deliver', 'الإنتاج والتسليم'), steps: [p('Planning', 'التخطيط'), p('Scale-up', 'التوسع'), p('Manufacturing', 'التصنيع'), p('Quality release', 'الإفراج بعد الجودة'), p('Delivery', 'التسليم')] },
  ],
};

export const QUALITY = {
  eyebrow: p('Quality and working with us', 'الجودة والعمل معنا'),
  title: p('Certified, regulated and operating in Saudi Arabia', 'معتمدون ومنظَّمون ونعمل في المملكة العربية السعودية'),
  credentials: [
    { icon: 'shield', title: p('GMP certified · Halal', 'ممارسات التصنيع الجيد · حلال'), text: p('Good Manufacturing Practices built into every stage, from supplier qualification to batch traceability.', 'ممارسات التصنيع الجيد في كل مرحلة، من تأهيل الموردين حتى تتبع الدُفعات.') },
    { icon: 'file', title: p('SFDA', 'هيئة الغذاء والدواء'), text: p('We handle your SFDA registration: dossier, labels and claims, eCosma listing and market release.', 'نتولى تسجيل منتجك لدى الهيئة: الملف، والملصقات والادعاءات، والإدراج في eCosma، والطرح في السوق.') },
    { icon: 'flag', title: p('Proudly made in Saudi Arabia', 'صُنع بفخر في السعودية'), text: p('Manufacturing, packing, quality control and release at our Jeddah plant.', 'التصنيع والتعبئة ومراقبة الجودة والإفراج في مصنعنا بجدة.') },
    { icon: 'truck', title: p('Local supply chain', 'سلسلة إمداد محلية'), text: p('Production and EXW delivery from Jeddah. 90 days from complete order confirmation to finished product.', 'إنتاج وتسليم من المصنع في جدة، و90 يومًا من تأكيد الطلب الكامل حتى المنتج النهائي.') },
  ],
  sfda: {
    title: p('We handle your SFDA registration', 'نتولى تسجيل منتجك لدى الهيئة'),
    steps: [
      { img: 'qa', title: p('Dossier', 'الملف'), text: p('Formula, INCI list, specifications and safety documents', 'التركيبة وقائمة المكونات INCI والمواصفات ووثائق السلامة') },
      { img: 'svc1', title: p('Labels and claims', 'الملصقات والادعاءات'), text: p('Arabic and English, reviewed against SFDA rules', 'بالعربية والإنجليزية، ومراجَعة وفق اشتراطات الهيئة') },
      { img: 'svc3', title: p('eCosma listing', 'الإدراج في eCosma'), text: p('Your product listed on SFDA’s system', 'إدراج منتجك في نظام الهيئة') },
      { img: 'svc4', title: p('Market release', 'الطرح في السوق'), text: p('Compliant and ready to sell across the Kingdom', 'متوافق وجاهز للبيع في أنحاء المملكة') },
    ],
  },
  sustainability: {
    title: p('Beauty, made responsibly', 'جمال يُصنع بمسؤولية'),
    items: [
      { icon: 'heart', title: p('Cruelty-free', 'خالٍ من التجارب على الحيوانات'), text: p('Every material from established global suppliers that do not test on animals', 'كل المواد من موردين عالميين معروفين لا يختبرون على الحيوانات') },
      { icon: 'drop', title: p('Water stewardship', 'ترشيد المياه'), text: p('Clean-in-place systems, proven in ECC factories, save water at KCC', 'أنظمة التنظيف الموضعي المجرّبة في مصانع ECC توفر المياه في KCC') },
      { icon: 'recycle', title: p('Waste reduction', 'تقليل النفايات'), text: p('Segregation and recycling, aiming for zero waste to landfill', 'الفرز وإعادة التدوير، بهدف عدم إرسال أي نفايات إلى المكبات') },
    ],
  },
};

export const PARTNERS = {
  eyebrow: p('Global ingredient network', 'شبكة المكونات العالمية'),
  title: p('The ingredients Europe’s brands use, available to yours', 'المكونات التي تستخدمها العلامات الأوروبية، متاحة لعلامتك'),
  sub: p('Advanced actives, textures and fragrance, through ECC Group’s supplier relationships. 13 global partners, ethically and sustainably sourced.', 'مكونات فعالة متقدمة وقوامات وعطور عبر علاقات مجموعة ECC بالموردين: 13 شريكًا عالميًا، بمصادر أخلاقية ومستدامة.'),
  logos: [['lipotec', 'Lipotec'], ['sederma', 'Sederma'], ['ashland', 'Ashland'], ['basf', 'BASF'], ['sensient', 'Sensient'], ['crodarom', 'Crodarom'], ['givaudan', 'Givaudan'], ['cpl', 'CPL Aromas'], ['lipomize', 'Lipomize'], ['aqia', 'AQIA'], ['symrise', 'Symrise'], ['mibelle', 'Mibelle'], ['evonik', 'Evonik']] as Array<[string, string]>,
};

export const CASE = {
  eyebrow: p('From our group · ECC Egypt × Unilever', 'من مجموعتنا · ECC مصر × يونيليفر'),
  note: p(
    'This project was delivered by ECC, our sister company in Egypt. KCC is the group’s plant in Saudi Arabia, and brings the same know-how, systems and people to Jeddah.',
    'نفّذت هذا المشروع شركة ECC، شركتنا الشقيقة في مصر. أما KCC فهي مصنع المجموعة في السعودية، وتنقل الخبرة والأنظمة والكوادر نفسها إلى جدة.'
  ),
  title: p('When Unilever needed it fast, ECC delivered it whole', 'حين احتاجت يونيليفر السرعة، قدّمت ECC الحل كاملًا'),
  text: p(
    'During COVID-19, demand for hand hygiene surged overnight. ECC sourced the raw materials, produced the packaging and manufactured Lifebuoy hand sanitizer, in a short time. One emergency order became a lasting partnership.',
    'خلال جائحة كوفيد-19 ارتفع الطلب على منتجات تعقيم اليدين بين ليلة وضحاها. وفّرت ECC المواد الخام، وأنتجت العبوات، وصنّعت معقّم لايفبوي في وقت قصير. وتحوّل طلب طارئ إلى شراكة دائمة.'
  ),
  quote: p(
    '“Thanks to ECC for delivering our emergency Lifebuoy project in a short time, sourcing the same raw materials and using a production line under our auditing. This makes ECC a first-choice third party for our products at Unilever.”',
    '«شكرًا لـ ECC على تنفيذ مشروع لايفبوي الطارئ في وقت قصير، بتوفير المواد الخام نفسها واستخدام خط إنتاج تحت تدقيقنا. وهذا ما يجعل ECC الخيار الأول لتصنيع منتجاتنا لدى يونيليفر.»'
  ),
  who: p('Hassan Ali · Plant Manager, Unilever Mashreq', 'حسن علي · مدير المصنع، يونيليفر المشرق'),
  products: [
    { img: 'san', name: p('Lifebuoy Hand Sanitizer', 'معقم اليدين لايفبوي') },
    { img: 'clear', name: p('Clear Men Styling Cream', 'كريم تصفيف كلير للرجال') },
    { img: 'oil', name: p('Sunsilk Hair Oil', 'زيت شعر صانسيلك') },
    { img: 'shamp', name: p('Sunsilk Shampoo', 'شامبو صانسيلك') },
  ],
};

export const PROMISE = {
  title: p('The KCC Promise', 'وعد KCC'),
  sub: p('International Expertise. Saudi Manufacturing Capabilities.', 'خبرة دولية. وقدرات تصنيع سعودية.'),
  items: [p('Saudi Brand Empowerment', 'تمكين العلامات السعودية'), p('FormulateX Digital Innovation', 'الابتكار الرقمي عبر FormulateX'), p('360° Integrated Solutions', 'حلول متكاملة 360°'), p('Agile Manufacturing', 'تصنيع مرن'), p('Science-Led Innovation & International Expertise', 'ابتكار قائم على العلم وخبرة دولية')],
  contactEyebrow: p('Contact', 'تواصل معنا'),
  contactTitle: p('Let’s build your brand in the Kingdom', 'لنبنِ علامتك التجارية في المملكة'),
  person: p('Amr El Zayat', 'عمرو الزيات'),
  role: p('Commercial Manager', 'المدير التجاري'),
  phone: '+966 54 990 0668',
  plant: p('Third Industrial Zone, Al Bladiyah, Jeddah, Makkah Region · National Address JCZA3194', 'المنطقة الصناعية الثالثة، البلدية، جدة، منطقة مكة المكرمة · العنوان الوطني JCZA3194'),
  legal: p('KCC BV for Cosmetics | CR 4030577536 | Unified National No. 7041685947', 'KCC BV لمستحضرات التجميل | السجل التجاري 4030577536 | الرقم الوطني الموحد 7041685947'),
  closing: p('Your beauty innovation and manufacturing partner in Saudi Arabia', 'شريكك في ابتكار وتصنيع منتجات الجمال في المملكة العربية السعودية'),
  group: p('Part of ECC Holding Group | The Netherlands', 'جزء من مجموعة ECC القابضة | هولندا'),
};

/* ------------------------------ About page ------------------------------ */

export const ABOUT = {
  heroTitle: p('KCC BV for Cosmetics', 'KCC BV لمستحضرات التجميل'),
  heroSub: p('Your beauty innovation and manufacturing partner in Saudi Arabia', 'شريكك في ابتكار وتصنيع منتجات الجمال في المملكة العربية السعودية'),
  group: {
    eyebrow: p('Group structure', 'هيكل المجموعة'),
    title: p('One European holding, two manufacturing hubs', 'شركة قابضة أوروبية واحدة، ومركزان للتصنيع'),
    text: p(
      'Founded in Amsterdam in July 2020, ECC Holding Group B.V. builds cosmetics manufacturing in high-growth markets, starting with Egypt and the Gulf, to quality standards comparable to Europe and the United States.',
      'تأسست مجموعة ECC القابضة B.V. في أمستردام في يوليو 2020، لتبني صناعة مستحضرات التجميل في الأسواق سريعة النمو، بدءًا بمصر والخليج، بمعايير جودة تضاهي أوروبا والولايات المتحدة.'
    ),
    milestones: [
      { year: '1981', place: p('Egypt', 'مصر'), name: p('ECC Group Innovation Campus, Cairo', 'حرم ECC للابتكار، القاهرة'), text: p('A small laboratory producing cosmetic oils and soap, grown into one of the region’s leading beauty and personal care groups.', 'مختبر صغير لإنتاج زيوت التجميل والصابون، أصبح واحدة من أبرز مجموعات الجمال والعناية الشخصية في المنطقة.') },
      { year: '2020', place: p('The Netherlands', 'هولندا'), name: p('ECC Holding Group B.V., Amsterdam', 'مجموعة ECC القابضة B.V.، أمستردام'), text: p('A European holding set up to grow cosmetics manufacturing in high-potential markets.', 'شركة قابضة أوروبية أُسست لتنمية صناعة مستحضرات التجميل في الأسواق الواعدة.') },
      { year: '2027', place: p('Saudi Arabia', 'المملكة العربية السعودية'), name: p('KCC BV for Cosmetics, Jeddah', 'KCC BV لمستحضرات التجميل، جدة'), text: p('The group’s second hub, operating from January 2027: 40 million units a year from the first phase.', 'المركز الثاني للمجموعة، يبدأ التشغيل في يناير 2027 بطاقة 40 مليون وحدة سنويًا في المرحلة الأولى.') },
    ],
  },
  decades: {
    eyebrow: p('Four decades of ECC Group', 'أربعة عقود من مجموعة ECC'),
    title: p('Four decades of building an integrated beauty ecosystem', 'أربعة عقود في بناء منظومة جمال متكاملة'),
    text: p(
      'Beauty and wellness manufacturing at the core, with backward integration into smart packaging (SmartPack) and forward integration into e-commerce (Source Beauty). Four decades of legacy and quality standards make it one glocal, integrated manufacturing hub.',
      'تصنيع منتجات الجمال والعافية في القلب، مع تكامل خلفي في التغليف الذكي (سمارت باك) وتكامل أمامي في التجارة الإلكترونية (سورس بيوتي). أربعة عقود من الإرث ومعايير الجودة تجعلها مركز تصنيع متكاملًا، عالمي الخبرة محلي الحضور.'
    ),
    brings: p('What we bring to KCC', 'ما ننقله إلى KCC'),
    list: [p('Formulation know-how', 'خبرة التركيب'), p('Quality and GMP systems', 'أنظمة الجودة والتصنيع الجيد'), p('Global supplier network', 'شبكة موردين عالمية'), p('People and training', 'الكوادر والتدريب'), p('FormulateX and ODM expertise', 'خبرة FormulateX والتصنيع المتكامل')],
  },
  whySaudi: {
    eyebrow: p('Why Saudi Arabia', 'لماذا المملكة العربية السعودية'),
    title: p('Why ECC Holding Group chose the Kingdom for its second hub', 'لماذا اختارت مجموعة ECC القابضة المملكة مركزًا ثانيًا لها'),
    items: [
      { title: p('A growing, urban consumer base', 'قاعدة مستهلكين متنامية وحضرية'), text: p('Population growth and urbanization drive rising demand for beauty and personal care.', 'النمو السكاني والتحضر يدفعان الطلب المتزايد على منتجات الجمال والعناية الشخصية.') },
      { title: p('A strategy set in Amsterdam', 'استراتيجية وُضعت في أمستردام'), text: p('ECC Holding Group B.V. was founded in 2020 to grow cosmetics manufacturing in high-potential markets, starting with Egypt and the Gulf.', 'تأسست مجموعة ECC القابضة عام 2020 لتنمية صناعة مستحضرات التجميل في الأسواق الواعدة، بدءًا بمصر والخليج.') },
      { title: p('A key milestone in the Gulf', 'محطة رئيسية في الخليج'), text: p('The Jeddah plant puts the group inside the region’s fast-growing beauty and personal care market.', 'يضع مصنع جدة المجموعة داخل سوق الجمال والعناية الشخصية الأسرع نموًا في المنطقة.') },
      { title: p('Products made for each market', 'منتجات تُصنع لكل سوق'), text: p('A portfolio tailored to local needs, at quality standards comparable to Europe and the United States.', 'مجموعة منتجات مصممة للاحتياجات المحلية، بمعايير جودة تضاهي أوروبا والولايات المتحدة.') },
    ],
  },
  win: {
    eyebrow: p('KCC strategic advantage', 'الميزة الاستراتيجية لـ KCC'),
    title: p('Why KCC can win in the Kingdom', 'لماذا تستطيع KCC أن تنجح في المملكة'),
    sub: p('Global know-how, with a local presence.', 'خبرة عالمية، بحضور محلي.'),
    items: [
      { img: 'lab', title: p('International expertise', 'خبرة دولية'), text: p('Four decades of ECC Group manufacturing and product development know-how, now serving Saudi brands.', 'أربعة عقود من خبرات مجموعة ECC في التصنيع وتطوير المنتجات، في خدمة العلامات السعودية الآن.') },
      { img: 'b8a', title: p('Saudi operational presence', 'حضور تشغيلي سعودي'), text: p('Localised manufacturing, quality control and final release in Jeddah, close to the brands we serve.', 'تصنيع ومراقبة جودة وإفراج نهائي محليًا في جدة، بالقرب من العلامات التي نخدمها.') },
    ],
  },
  leadership: {
    eyebrow: p('Leadership', 'القيادة'),
    title: p('Who runs KCC', 'من يقود KCC'),
    board: p('Board of directors', 'مجلس الإدارة'),
    management: p('Management team', 'فريق الإدارة'),
    /** In order of seniority: the board, then the management team. */
    people: [
      { tier: 'board', img: 'per0', name: p('Dr. Mohamed Salah', 'د. محمد صلاح'), role: p('CEO and Board Member', 'الرئيس التنفيذي وعضو مجلس الإدارة') },
      { tier: 'board', img: 'per1', name: p('Dr. Ahmed Abou El Hamayl', 'د. أحمد أبو الحمايل'), role: p('Board Member', 'عضو مجلس الإدارة') },
      { tier: 'management', img: 'per2', name: p('Nader Magdy', 'نادر مجدي'), role: p('Country Manager', 'المدير القُطري') },
      { tier: 'management', img: 'per4', name: p('Dr. Zahraa Hussein', 'د. زهراء حسين'), role: p('Operations Head', 'رئيسة العمليات') },
      { tier: 'management', img: 'per3', name: p('Sherif Kassem', 'شريف قاسم'), role: p('Site Lead and Supply Chain Director', 'مسؤول الموقع ومدير سلسلة الإمداد') },
      { tier: 'management', img: 'per5', name: p('Amr El Zayat', 'عمرو الزيات'), role: p('Commercial Manager', 'المدير التجاري') },
    ],
  },
};
