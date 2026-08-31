import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '@/lib/rateLimit';
import connectDB from '@/lib/db';
import KnowledgeArticle from '@/models/KnowledgeArticle';

interface ChatRequest {
  message: string;
  locale: 'en' | 'ar';
}

interface ScoredArticle {
  article: any;
  score: number;
}

// Built-in knowledge base for reliable responses when DB is empty or has no matches
const builtInKnowledge: { keywords: string[]; keywordsAr: string[]; en: string; ar: string }[] = [
  {
    keywords: ['service', 'offer', 'what do', 'provide', 'capabilities', 'help'],
    keywordsAr: ['خدم', 'تقدم', 'توفر', 'ماذا', 'قدرات'],
    en: 'KCC offers comprehensive cosmetics manufacturing services including:\n\n• **Private Label Manufacturing** — Full production under your brand name\n• **Custom Formulation** — Bespoke formulas developed by expert chemists\n• **Quality Testing** — Stability, microbiological, and dermatological testing\n• **Packaging Solutions** — Design and sourcing for premium packaging\n• **Regulatory Compliance** — SFDA, GCC, and international registration\n• **Logistics & Export** — Seamless delivery across the MENA region\n\nWe manufacture creams, serums, cleansers, toners, moisturizers, sunscreens, masks, and more.',
    ar: 'تقدم KCC خدمات شاملة في تصنيع مستحضرات التجميل تشمل:\n\n• **تصنيع العلامة الخاصة** — إنتاج كامل تحت اسم علامتك التجارية\n• **تركيبات مخصصة** — تركيبات فريدة من قبل كيميائيين خبراء\n• **اختبارات الجودة** — اختبارات الثبات والميكروبيولوجية والجلدية\n• **حلول التغليف** — تصميم وتوفير تغليف متميز\n• **الامتثال التنظيمي** — تسجيل SFDA ودول الخليج والمعايير الدولية\n• **الخدمات اللوجستية والتصدير** — توصيل سلس عبر منطقة الشرق الأوسط\n\nنصنع الكريمات والسيرومات والغسولات والتونر والمرطبات وواقيات الشمس والأقنعة والمزيد.',
  },
  {
    keywords: ['sample', 'request', 'try', 'test', 'demo'],
    keywordsAr: ['عينة', 'اطلب عينة', 'طلب عينة', 'أطلب عينة', 'تجرب', 'اختبار'],
    en: 'You can request a custom sample easily through our website:\n\n1. Go to **Order → Request Sample**\n2. Fill out the product survey (product type, ingredients, packaging preferences)\n3. Provide your contact details\n4. Submit your request\n\nOur team will review your specifications and prepare a custom sample tailored to your needs. Sample development typically takes **2-4 weeks** depending on complexity. There is no minimum quantity for sample requests.',
    ar: 'يمكنك طلب عينة مخصصة بسهولة عبر موقعنا:\n\n1. اذهب إلى **طلب → اطلب عينة**\n2. املأ استبيان المنتج (نوع المنتج، المكونات، تفضيلات التغليف)\n3. قدم بيانات الاتصال\n4. أرسل طلبك\n\nسيراجع فريقنا مواصفاتك ويحضر عينة مخصصة لاحتياجاتك. يستغرق تطوير العينة عادة **2-4 أسابيع** حسب التعقيد. لا يوجد حد أدنى للكمية لطلبات العينات.',
  },
  {
    keywords: ['certif', 'quality', 'standard', 'iso', 'gmp', 'sfda', 'halal'],
    keywordsAr: ['شهاد', 'جود', 'معيار', 'حلال', 'ترخيص'],
    en: 'KCC holds world-class certifications including:\n\n• **ISO 22716** — Cosmetics Good Manufacturing Practice (GMP)\n• **ISO 9001** — Quality Management System\n• **SFDA License** — Saudi Food & Drug Authority approval\n• **Halal Certification** — Certified halal production\n• **Cruelty-Free** — No animal testing\n• **ISO 14001** — Environmental Management System\n\nEvery product undergoes rigorous testing including stability testing, microbiological testing, and dermatological safety assessment before release.',
    ar: 'تمتلك KCC شهادات عالمية تشمل:\n\n• **ISO 22716** — ممارسات التصنيع الجيد لمستحضرات التجميل\n• **ISO 9001** — نظام إدارة الجودة\n• **ترخيص SFDA** — موافقة الهيئة العامة للغذاء والدواء\n• **شهادة حلال** — إنتاج معتمد حلال\n• **بدون تجارب على الحيوانات** — لا اختبارات على الحيوانات\n• **ISO 14001** — نظام الإدارة البيئية\n\nكل منتج يخضع لاختبارات صارمة تشمل اختبار الثبات والاختبار الميكروبيولوجي وتقييم السلامة الجلدية قبل الإطلاق.',
  },
  {
    keywords: ['minimum', 'moq', 'quantity', 'order size', 'how many', 'unit'],
    keywordsAr: ['حد أدنى', 'الحد الأدنى', 'حد الأدنى', 'أقل كمية', 'كام وحدة', 'كمي', 'عدد'],
    en: 'Our minimum order quantities are:\n\n• **Sample Orders:** No minimum — even 1 unit is fine for evaluation\n• **Bulk Orders:** Starting from **100 units** for most product types\n• **Large Production:** Custom quantities available for established partnerships\n\nPricing improves with larger volumes. Contact our sales team for a detailed quote based on your specific product and quantity needs.',
    ar: 'الحد الأدنى لكميات الطلب:\n\n• **طلبات العينات:** لا يوجد حد أدنى — حتى وحدة واحدة للتقييم\n• **الطلبات بالجملة:** تبدأ من **100 وحدة** لمعظم أنواع المنتجات\n• **الإنتاج الكبير:** كميات مخصصة متاحة للشراكات المستمرة\n\nتتحسن الأسعار مع الكميات الأكبر. تواصل مع فريق المبيعات للحصول على عرض سعر مفصل.',
  },
  {
    keywords: ['countr', 'region', 'serve', 'ship', 'export', 'deliver', 'where', 'market'],
    keywordsAr: ['دول', 'بلد', 'منطق', 'تصدير', 'توصيل', 'سوق'],
    en: 'KCC serves the entire GCC region and beyond:\n\n• **GCC:** Saudi Arabia, UAE, Kuwait, Bahrain, Qatar, Oman\n• **Middle East:** Egypt, Jordan, Lebanon, Iraq\n• **North Africa:** Morocco, Tunisia, Algeria\n• **Other:** We can export to most international markets\n\nOur logistics team handles all export documentation, customs clearance, and shipping. We have established supply chains across the MENA region.',
    ar: 'تخدم KCC منطقة الخليج بالكامل وما وراءها:\n\n• **الخليج:** السعودية، الإمارات، الكويت، البحرين، قطر، عمان\n• **الشرق الأوسط:** مصر، الأردن، لبنان، العراق\n• **شمال أفريقيا:** المغرب، تونس، الجزائر\n• **أخرى:** يمكننا التصدير لمعظم الأسواق الدولية\n\nيتولى فريقنا اللوجستي جميع وثائق التصدير والتخليص الجمركي والشحن.',
  },
  {
    keywords: ['price', 'cost', 'how much', 'pricing', 'budget', 'expensive', 'cheap', 'afford'],
    keywordsAr: ['سعر', 'تكلف', 'كم', 'ميزاني', 'غالي'],
    en: 'Pricing depends on several factors:\n\n• **Product Type** — Complexity of formulation\n• **Ingredients** — Standard vs. premium/active ingredients\n• **Packaging** — Container type and design complexity\n• **Order Volume** — Larger quantities = better unit pricing\n• **Customization Level** — Standard formula vs. fully custom\n\nWe offer competitive pricing for the MENA region. To get a detailed quote:\n1. Request a sample with your specifications\n2. Or contact our sales team directly via the Contact page\n\nWe work with budgets of all sizes.',
    ar: 'يعتمد التسعير على عدة عوامل:\n\n• **نوع المنتج** — تعقيد التركيبة\n• **المكونات** — مكونات قياسية مقابل فاخرة/فعالة\n• **التغليف** — نوع الحاوية وتعقيد التصميم\n• **حجم الطلب** — كميات أكبر = سعر أفضل للوحدة\n• **مستوى التخصيص** — تركيبة قياسية مقابل مخصصة بالكامل\n\nنقدم أسعاراً تنافسية لمنطقة الشرق الأوسط. للحصول على عرض سعر مفصل:\n1. اطلب عينة بمواصفاتك\n2. أو تواصل مع فريق المبيعات عبر صفحة الاتصال',
  },
  {
    keywords: ['time', 'long', 'how long', 'timeline', 'duration', 'delivery', 'when', 'fast', 'lead time', 'development take', 'how long does'],
    keywordsAr: ['وقت', 'مدة', 'متى', 'تسليم', 'سريع', 'بياخد قد إيه', 'قد إيه', 'بياخد', 'كام يوم', 'كام أسبوع'],
    en: 'Typical timelines at KCC:\n\n• **Sample Development:** 2-4 weeks\n• **Formulation Approval:** 1-2 weeks after sample review\n• **Bulk Production:** 4-8 weeks depending on quantity\n• **Packaging & Labeling:** 2-3 weeks\n• **Quality Testing:** 1-2 weeks\n• **Shipping (GCC):** 3-7 business days\n\nTotal from order to delivery is typically **8-16 weeks** for first-time orders. Repeat orders are faster. We offer expedited timelines for urgent requests.',
    ar: 'الجداول الزمنية النموذجية في KCC:\n\n• **تطوير العينة:** 2-4 أسابيع\n• **موافقة التركيبة:** 1-2 أسبوع بعد مراجعة العينة\n• **الإنتاج بالجملة:** 4-8 أسابيع حسب الكمية\n• **التغليف والتسمية:** 2-3 أسابيع\n• **اختبارات الجودة:** 1-2 أسبوع\n• **الشحن (الخليج):** 3-7 أيام عمل\n\nالإجمالي من الطلب إلى التسليم عادة **8-16 أسبوعاً** للطلبات الأولى. الطلبات المتكررة أسرع.',
  },
  {
    keywords: ['formul', 'custom formul', 'custom formula', 'from scratch', 'reformulat', 'benchmark', 'develop a', 'create a', 'new product', 'recipe'],
    keywordsAr: ['تركيب', 'تركيبة مخصصة', 'من الصفر', 'إعادة صياغة', 'منتج مرجعي', 'إنشاء', 'منتج جديد'],
    en: 'Yes! Custom formulation is one of our core services:\n\n• **From Scratch:** Our R&D team develops entirely new formulations\n• **Matching:** We can recreate or improve existing product formulas\n• **Modification:** Adjust existing formulations to your preferences\n• **Natural/Organic:** We specialize in clean beauty formulations\n\nOur chemists work with you to define the perfect texture, scent, active ingredients, and performance. We use premium raw materials sourced from trusted global suppliers.',
    ar: 'نعم! التركيبات المخصصة هي من خدماتنا الأساسية:\n\n• **من الصفر:** فريق البحث والتطوير يطور تركيبات جديدة تماماً\n• **مطابقة:** يمكننا إعادة إنتاج أو تحسين تركيبات منتجات موجودة\n• **تعديل:** ضبط التركيبات الحالية حسب تفضيلاتك\n• **طبيعي/عضوي:** نتخصص في تركيبات الجمال النظيف\n\nيعمل كيميائيونا معك لتحديد الملمس والرائحة والمكونات الفعالة والأداء المثالي.',
  },
  {
    keywords: ['packag', 'packaging studio', 'design the packag', 'label', 'bottle', 'jar', 'container', 'box', 'cap', 'pump', 'dropper', 'finish', 'matte', 'glossy', 'frosted', 'transparent', 'colour', 'color', '3d'],
    keywordsAr: ['تغليف', 'عبوة', 'ملصق', 'زجاجة', 'برطمان', 'غطاء', 'مضخة', 'قطارة', 'لمسة', 'لون العبوة'],
    en: 'Packaging is designed visually inside the Sample Quiz, in a 3D studio you can turn a full 360° with your mouse or the arrow keys — the same way you would pick up a bottle and look at it.\n\nFive things to choose, each on its own tab:\n\n• **The pack** — Bottle, tall slim bottle, wide jar, squeeze tube, spray, gel pump, serum pump, airless pump, roll-on, dropper bottle, vial, glass ampoule, PVC ampoule, sachet.\n• **Cap & dispenser** — Flat screw cap, domed cap, lotion pump, fine mist sprayer, dropper with bulb, flip-top, disc top.\n• **Label style** — Full wrap, centre band, oval badge, top strip, a minimal line, or no label. Your name is printed on it as you go.\n• **Surface finish** — Glossy, matte, frosted, transparent, metallic. Transparent and frosted really do show the product through the wall.\n• **Pack colour** — Ten colours, from pearl white and blush through champagne, gold, emerald and onyx.\n\nWhat you see updates instantly, and what you approve is what our packaging team quotes. Materials (glass, PETG, HDPE, PP, aluminium, eco-friendly options), sizes from 15ml upward, custom moulds and printing (screen print, hot stamping, metallic finishes) are all handled after the brief — tell us in the notes on that step.',
    ar: 'التغليف بتصممه بالعين جوة كويز السامبل، في استوديو ثلاثي الأبعاد تقدر تلفّه 360 درجة كاملة بالماوس أو بأسهم الكيبورد — بالظبط زي ما تمسك العبوة وتبصلها.\n\nخمس حاجات تختارها، كل واحدة في تبويب:\n\n• **العبوة** — زجاجة، زجاجة طويلة رفيعة، برطمان عريض، أنبوب ضاغط، بخاخ، مضخة جل، مضخة سيروم، مضخة مفرغة، رول أون، زجاجة قطارة، فيال، أمبولة زجاجية، أمبولة بلاستيك، ظرف.\n• **الغطاء وطريقة الصرف** — غطاء لولبي مسطح، غطاء مقبب، مضخة لوشن، بخاخ رذاذ، قطارة بكرة مطاطية، غطاء قلاب، غطاء قرصي.\n• **شكل الملصق** — ملصق كامل، شريط أوسط، ملصق بيضاوي، شريط علوي، خط بسيط، أو بدون ملصق. واسمك بيتطبع عليه وانت ماشي.\n• **لمسة السطح** — لامع، مطفي، مثلج، شفاف، معدني. الشفاف والمثلج بيوروا المنتج من خلال جدار العبوة فعلاً.\n• **لون العبوة** — عشر ألوان، من الأبيض اللؤلؤي والوردي الفاتح للشمبانيا والذهبي والزمردي والأسود.\n\nاللي بتشوفه بيتحدّث فوراً، واللي بتوافق عليه هو اللي فريق التغليف بيسعّره. الخامات (زجاج، PETG، HDPE، PP، ألومنيوم، خيارات صديقة للبيئة)، المقاسات من 15 مل وطالع، القوالب المخصصة والطباعة (سيلك سكرين، ختم ساخن، لمسات معدنية) بتتحدد بعد البريف — اكتبلنا في الملاحظات في نفس الخطوة.',
  },
  {
    keywords: ['about', 'who', 'company', 'kcc', 'history', 'establish', 'founded'],
    keywordsAr: ['من نحن', 'شركة', 'تاريخ', 'تأسس', 'عن'],
    en: 'KCC (Saudi Company for Cosmetics) is a leading cosmetics manufacturer based in Riyadh, Saudi Arabia. We specialize in:\n\n• Private label and contract manufacturing\n• Custom cosmetic formulation development\n• Full packaging and branding solutions\n• Quality testing and regulatory compliance\n\nOur state-of-the-art facilities are GMP-certified and SFDA-licensed. We serve clients across the GCC and MENA region, producing premium skincare, haircare, and beauty products. Our mission is to be the trusted manufacturing partner that brings your beauty vision to life.',
    ar: 'KCC (الشركة السعودية لمستحضرات التجميل) هي شركة رائدة في تصنيع مستحضرات التجميل مقرها الرياض، المملكة العربية السعودية. نتخصص في:\n\n• تصنيع العلامة الخاصة والتصنيع التعاقدي\n• تطوير تركيبات مستحضرات التجميل المخصصة\n• حلول التغليف والعلامة التجارية الكاملة\n• اختبارات الجودة والامتثال التنظيمي\n\nمرافقنا الحديثة معتمدة بشهادة GMP ومرخصة من SFDA. نخدم عملاء عبر منطقة الخليج والشرق الأوسط.',
  },
  {
    keywords: ['contact', 'reach', 'phone', 'email', 'address', 'location', 'office', 'call'],
    keywordsAr: ['تواصل', 'اتصل', 'هاتف', 'بريد', 'عنوان', 'موقع', 'مكتب'],
    en: 'You can reach KCC through several channels:\n\n• **Website:** Use our Contact page to send a message\n• **Email:** info@kcc-bv.com\n• **Phone:** +966 53 848 6109 / +966 53 848 7021\n• **Location:** Riyadh, Saudi Arabia\n• **Working Hours:** Sunday–Thursday, 8 AM – 5 PM (AST)\n\nOur team typically responds within 24 business hours. For urgent inquiries, please call during business hours.',
    ar: 'يمكنك التواصل مع KCC عبر عدة قنوات:\n\n• **الموقع:** استخدم صفحة الاتصال لإرسال رسالة\n• **البريد:** info@kcc-bv.com\n• **الهاتف:** +966 53 848 6109 / +966 53 848 7021\n• **الموقع:** الرياض، المملكة العربية السعودية\n• **ساعات العمل:** الأحد–الخميس، 8 صباحاً – 5 مساءً\n\nفريقنا يرد عادة خلال 24 ساعة عمل.',
  },
  {
    keywords: ['quiz', 'survey', 'questionnaire', 'how to order', 'how does sample', 'sample flow', 'sample order', 'process', 'steps'],
    keywordsAr: ['كويز', 'استبيان', 'استطلاع', 'إزاي أطلب', 'خطوات', 'مراحل'],
    en: 'The Sample Quiz is a guided brief that takes about **5 minutes**. You only ever see questions that apply to what you picked:\n\n1. **Your name** — We print it on the bottle in the 3D preview, live as you type.\n2. **The brief** — How you want to develop it (a new formula from scratch, a reformulation of something you already sell, matching a benchmark product, or a ready-made KCC formula), who it is for, the finish you want, and any marketing claims (sulfate-free, vegan, paraben-free…). Each answer can change what comes next.\n3. **Your category** — 10 categories, then a sub-family, then the exact product. As soon as you pick a category, the questions specific to it appear — hair type for Hair Care, SPF level for Sun Care, baby age for Baby Care.\n4. **Technical specs** — Oils & extracts, actives, fine actives, product colour, fragrance (family → notes → intensity), and the packaging studio. Every list is curated for the exact product you chose.\n5. **Review** — One screen with everything on it. Every single answer has an Edit link that takes you to that question and brings you straight back. Nothing has to be re-done.\n\nYou get an order number on screen, and can track the order from **My Samples**. Start at **/order/sample**.',
    ar: 'كويز السامبل بريف موجّه بياخد حوالي **5 دقائق**، وما بتشوفش غير الأسئلة اللي تخص اللي اخترته:\n\n1. **اسمك** — بنطبعه على العبوة في المعاينة ثلاثية الأبعاد لايف وانت بتكتب.\n2. **البريف** — طريقة التطوير (تركيبة جديدة من الصفر، إعادة صياغة لمنتج عندك بالفعل، مطابقة منتج مرجعي، أو تركيبة KCC جاهزة)، الجمهور، اللمسة المطلوبة، والـ claims (خالي من السلفات، فيجن، بدون بارابين…). كل إجابة ممكن تغيّر اللي بعدها.\n3. **الكاتيجوري** — 10 كاتيجوريز، وبعدين عائلة فرعية، وبعدين المنتج بالظبط. أول ما تختار الكاتيجوري بتظهر أسئلتها المخصصة — نوع الشعر للعناية بالشعر، درجة SPF للواقي الشمسي، عمر الطفل لعناية الأطفال.\n4. **المواصفات التقنية** — الزيوت والمستخلصات، المواد الفعالة، الـ Fine Actives، لون المنتج، العطر (عائلة ← نوتس ← كثافة)، واستوديو التغليف. كل قائمة منتقاة للمنتج اللي اخترته.\n5. **المراجعة** — شاشة واحدة فيها كل حاجة، وكل إجابة جنبها لينك تعديل بيوديك للسؤال ويرجّعك على طول. مفيش حاجة بتتعاد.\n\nهتلاقي رقم الطلب على الشاشة، وتقدر تتابعه من **عيناتي**. ابدأ من **/order/sample**.',
  },
  {
    keywords: ['categor', 'product type', 'what can', 'hair care', 'skin care', 'makeup', 'sun care', 'fragrance', 'baby', 'massage', 'oral', 'hygiene'],
    keywordsAr: ['كاتيجوري', 'كاتيجوريز', 'الفئات', 'الأقسام', 'نوع المنتج', 'شعر', 'بشرة', 'ميكب', 'شمس', 'أطفال', 'مساج', 'عناية الفم', 'نظافة'],
    en: 'KCC currently produces across **10 main categories with 60 sub-families and 240+ specific products**:\n\n• **Hair Care** — shampoos, conditioners, masks, serums, ampoules, lotions, beard styling, professional treatments\n• **Skin Care** — whitening, acne care, eye contour, serums (HA, Vit C, Retinol, Niacinamide…), face creams, masks, peeling\n• **Body Care** — body lotions, butters, oils, scrubs, deodorants, scar care, body firming, foot & nail care\n• **Sun Care** — SPF creams, lotions, sprays, tinted SPF, after-sun, thermal water\n• **Baby Care** — baby creams, diaper creams, bath & shower\n• **Makeup** — lip & cheek tints, tinted SPF\n• **Fragrance** — body perfumes, body splash, hair mist\n• **Hygiene** — hair removal, feminine care, soaps\n• **Massage** — creams, gels (incl. cold-effect), sprays, roll-ons\n• **Oral Care** — mouthwash, tooth gel, mouth spray\n\nThe Sample Quiz lets you drill into the exact product you want.',
    ar: 'KCC حالياً بتنتج في **10 كاتيجوريز رئيسية بـ 60 عائلة فرعية وأكثر من 240 منتج محدد**:\n\n• **العناية بالشعر** — شامبو، بلسم، ماسكات، سيرومات، أمبولات، لوشن، تشذيب اللحية، علاجات احترافية\n• **العناية بالبشرة** — تفتيح، علاج حب الشباب، محيط العين، سيرومات (HA، فيتامين C، ريتينول، نياسيناميد…)، كريمات الوجه، ماسكات، تقشير\n• **العناية بالجسم** — لوشن، زبدات، زيوت، سكرابات، مزيل عرق، علاج ندوب، شد، عناية بالقدم والأظافر\n• **الواقي الشمسي** — كريمات SPF، لوشن، رش، تنتد، بعد التعرض، ماء حراري\n• **عناية الأطفال** — كريمات أطفال، كريمات الحفاضات، استحمام\n• **الميكب** — تنتس للشفاه والخد، SPF تنتد\n• **العطور** — عطر جسم، بودي سبلاش، ميست شعر\n• **النظافة** — إزالة الشعر، العناية النسائية، صابون\n• **المساج** — كريمات، جل (cold-effect)، رش، رول-أون\n• **عناية الفم** — غسول فم، جل أسنان، رش\n\nكويز السامبل بيخليك تختار المنتج المحدد.',
  },
  {
    keywords: ['ingredient', 'ingredients can', 'what ingredients', 'choose from', 'oil', 'extract', 'actives', 'argan', 'jojoba', 'castor', 'fine actives', 'hyaluronic', 'retinol', 'vitamin'],
    keywordsAr: ['مكون', 'المكونات', 'زيت', 'مستخلص', 'مواد فعالة', 'أرجان', 'جوجوبا', 'خروع', 'هيالورونيك', 'ريتينول', 'فيتامين'],
    en: 'You can choose from a wide library of ingredients, all curated per-product:\n\n• **Oils & Extracts (50+ options):** Argan, Jojoba, Castor, Tea Tree, Olive, Rose Water, Aloe Vera, Green Tea, Chamomile, Calendula, Apple Cider Vinegar, and more.\n• **Actives (60+ options):** Hyaluronic Acid, Niacinamide (Vit B3), Vitamin C (Ascorbic), Retinol (Vit A), Salicylic Acid, Caffeine, Allantoin, D-Panthenol, Shea Butter, Glycolic Acid, Zinc Pyrithione, and more.\n• **Fine Actives (25+ premium peptides):** Argireline®, Eyeseryl®, Trichogen™ VEG, fiberHance™, Matmarine™, Liposomal Vitamin C, Ceramide A2, Coenzyme Q10, and more.\n\nFor each product, our admin curates the most relevant subset — so you only see ingredients that actually make sense for your formula. You can also request specific hero ingredients in the brief.',
    ar: 'تقدر تختار من مكتبة واسعة من المكونات، كلها منتقاة حسب المنتج:\n\n• **زيوت ومستخلصات (50+ خيار):** أرجان، جوجوبا، خروع، شجرة الشاي، زيتون، ماء ورد، صبار، شاي أخضر، بابونج، آذريون، خل التفاح، والمزيد.\n• **مواد فعالة (60+ خيار):** هيالورونيك أسيد، نياسيناميد، فيتامين C، ريتينول، ساليسيليك أسيد، كافيين، ألانتوين، D-بانثينول، زبدة شيا، جلايكوليك أسيد، زنك بايريثيون، والمزيد.\n• **Fine Actives (25+ ببتيد فاخر):** Argireline®, Eyeseryl®, Trichogen™ VEG, fiberHance™, Matmarine™, ليبوسومال فيتامين C، سيراميد A2، كوإنزيم Q10، والمزيد.\n\nلكل منتج، الأدمن بيختار المجموعة الأنسب — فأنت بتشوف المكونات اللي تناسب تركيبتك بس. وتقدر تطلب مكونات بطل محددة في البريف.',
  },
  {
    keywords: ['fragrance', 'custom fragrance', 'scent', 'smell', 'perfume', 'note', 'family', 'intensity'],
    keywordsAr: ['عطر', 'رائحة', 'عيلة', 'نوت', 'كثافة'],
    en: 'Our fragrance flow is a 3-step experience built into the Sample Quiz:\n\n1. **Family** — Pick from 10 scent families: Fresh & Clean, Fruity & Playful, Floral & Soft, Luxury & Perfume-Inspired, Oriental, Herbal, Earthy/Woody, Essential oil-like, Sweet, or Fragrance-Free.\n2. **Sub-notes** — Each family unlocks specific notes (e.g. Floral → Rose, Jasmine, White Flowers, Powdery; Oriental → Amber, Musk, Oud, Vanilla).\n3. **Intensity** — Light, Medium, Strong, or Long-Lasting.\n\nOur perfumer matches your selection to a custom blend. The full fragrance experience is configurable in the quiz — admin can also restrict which families show per-product (e.g. Baby Care never shows Oud).',
    ar: 'تجربة العطر بتاعتنا 3 خطوات داخل كويز السامبل:\n\n1. **العائلة** — من 10 عائلات: Fresh & Clean، Fruity & Playful، Floral & Soft، Luxury & Perfume-Inspired، Oriental، Herbal، Earthy/Woody، Essential oil-like، Sweet، أو بدون عطر.\n2. **النوتس الفرعية** — كل عائلة فيها نوتس محددة (مثلاً: Floral → روز، ياسمين، زهور بيضاء، Powdery؛ Oriental → عنبر، مسك، عود، فانيليا).\n3. **الكثافة** — Light، Medium، Strong، أو Long-Lasting.\n\nالعطّار بتاعنا بيطابق اختيارك لمزيج مخصص. الـ admin يقدر يحدد أي عائلات تظهر لكل منتج (مثلاً Baby Care مش هتشوف عود).',
  },
  {
    // Added once the order workflow went live — customers ask this more than
    // anything else, and there was no answer for it.
    keywords: ['track', 'status', 'where is my', 'my order', 'progress', 'stage', 'after i submit', 'what happens', 'update'],
    keywordsAr: ['تتبع', 'حالة', 'فين طلبي', 'طلبي', 'مراحل', 'بعد الإرسال', 'إيه اللي بيحصل', 'تحديث'],
    en: 'Once you submit, the order goes onto a tracked chain and you can follow it from **My Samples** or **My Orders** in your account. Six stages show on the tracker:\n\n1. **Received** — Your brief has landed with us.\n2. **Reviewed** — An account manager has read it and either approved it or come back to you with questions.\n3. **Quotation** — Pricing is sent, then payment is confirmed.\n4. **Production** — The factory queues it, makes it, and it passes quality check.\n5. **Dispatch** — Packed, handed to a courier, and out for delivery.\n6. **Delivered** — In your hands.\n\nEvery move is recorded with who made it and when, so nothing changes hands silently. Each stage is handled by a different team — account managers, the factory floor, the dispatch desk, accounts — and only that team can move an order at that stage.\n\nAfter delivery you can rate the sample and leave notes on the formula, the packaging, the timing and the communication. That feedback goes straight to the team that made it.',
    ar: 'أول ما ترسل، الطلب بيدخل سلسلة متابعة وتقدر تتابعه من **عيناتي** أو **طلباتي** في حسابك. ستة مراحل بتظهر في التتبع:\n\n1. **تم الاستلام** — البريف وصلنا.\n2. **المراجعة** — مدير الحساب قراه ووافق عليه أو رجعلك بأسئلة.\n3. **عرض السعر** — بيتبعتلك التسعيرة، وبعدين بيتأكد الدفع.\n4. **الإنتاج** — المصنع بيجهّزه، بينتجه، وبيعدّي فحص الجودة.\n5. **الشحن** — بيتغلّف، بيتسلّم لمندوب، وبيخرج للتسليم.\n6. **التسليم** — بقى في إيدك.\n\nكل حركة بتتسجّل بمين عملها وإمتى، فمفيش حاجة بتتنقل في السر. كل مرحلة بيشتغل عليها فريق مختلف — مديري الحسابات، أرضية المصنع، مكتب الشحن، الحسابات — والفريق ده بس هو اللي يقدر ينقل الطلب في المرحلة دي.\n\nبعد التسليم تقدر تقيّم العينة وتكتب ملاحظاتك على التركيبة والتغليف والتوقيت والتواصل. التقييم ده بيروح مباشرة للفريق اللي نفّذها.',
  },
  {
    keywords: ['reorder', 'order again', 'repeat', 'same sample', 'change something', 'tweak', 'modify my order', 'scale up'],
    keywordsAr: ['إعادة طلب', 'أعيد طلب', 'أعيد الطلب', 'اطلب تاني', 'اطلبها مرة أخرى', 'نفس العينة', 'أعدل حاجة', 'وأعدل', 'تعديل', 'تكرار', 'كمية أكبر'],
    en: 'Yes — and you do not have to fill the brief in again.\n\n• **Order Again — Edit First** reopens that exact brief with every answer already filled in, on the review screen. Change the one thing you want (a different fragrance, a heavier texture, another pack colour), leave everything else, and submit. This is the usual case: you liked the sample but want one thing different.\n• **Order as Bulk** takes the same specification through to a production quantity.\n\nBoth are on every order, from the moment you submit it and for as long as the order exists — including after it has been closed. A bulk order can be reordered as bulk in the same way.\n\nYou will find both on any order in **My Samples** or **My Orders**.',
    ar: 'أيوه — ومش هتملا البريف من الأول تاني.\n\n• **اطلبها مرة أخرى — مع التعديل** بيفتحلك نفس البريف بكل إجاباته على شاشة المراجعة. غيّر الحاجة اللي عايزها (عطر مختلف، قوام أتقل، لون عبوة تاني)، سيب الباقي زي ما هو، وابعت. ده الحالة الشائعة: العينة عجبتك بس عايز تعدّل حاجة.\n• **اطلبها بالجملة** بياخد نفس المواصفات لكمية إنتاج.\n\nالاتنين موجودين على كل طلب، من لحظة الإرسال وطول ما الطلب موجود — حتى بعد ما يتقفل. والطلب بالجملة تقدر تعيد طلبه بالجملة بنفس الطريقة.\n\nهتلاقي الاتنين على أي طلب في **عيناتي** أو **طلباتي**.',
  },
  {
    keywords: ['account', 'login', 'sign in', 'register', 'who can order', 'access', 'password'],
    keywordsAr: ['حساب', 'تسجيل دخول', 'تسجيل', 'مين يقدر يطلب', 'صلاحية', 'باسورد'],
    en: 'Ordering is for KCC customers, so a sample request needs an account.\n\n• **Already a customer?** Sign in and your samples, orders and their tracking are all in your account area.\n• **New?** Get in touch through the Contact page and our team will set your account up. Accounts are created and managed by KCC so that every brief is tied to a real, known customer.\n\nBrowsing the site, reading about our categories and certifications, and talking to me here all work without an account.',
    ar: 'الطلب مخصص لعملاء KCC، فطلب العينة محتاج حساب.\n\n• **عميل بالفعل؟** سجّل دخولك وهتلاقي عيناتك وطلباتك ومتابعتها كلها في منطقة حسابك.\n• **جديد؟** تواصل معانا من صفحة Contact وفريقنا هيفتحلك حساب. الحسابات بتتعمل وتتدار من KCC عشان كل بريف يبقى مربوط بعميل حقيقي معروف.\n\nتصفح الموقع والاطلاع على الكاتيجوريز والشهادات والكلام معايا هنا — كل ده شغال من غير حساب.',
  },
];

const STOP_WORDS = new Set([
  'the', 'and', 'for', 'you', 'your', 'can', 'does', 'how', 'what', 'are', 'with',
  'from', 'about', 'have', 'has', 'this', 'that', 'their', 'our', 'when', 'which',
  'will', 'would', 'there', 'them', 'they', 'get', 'got', 'much', 'many', 'take',
  'كيف', 'ايه', 'إيه', 'ازاي', 'إزاي', 'هل', 'في', 'من', 'على', 'عن', 'مع', 'اللي', 'ده', 'دي',
]);

function tokenize(text: string): string[] {
  return (
    text
      .toLowerCase()
      // Arabic punctuation — ؟ ، ؛ ٪ ۔ — lives INSIDE the Arabic block, so the
      // "keep Arabic letters" rule kept it too and every question ended with a
      // token like "التغليف؟" that matched nothing. Strip it first.
      .replace(/[\u060C\u061B\u061F\u066A-\u066D\u06D4\u0640]/g, ' ')
      .replace(/[^\w\s\u0600-\u06FF]/g, ' ')
      .split(/\s+/)
      .filter((t) => t.length > 1 && !STOP_WORDS.has(t))
  );
}

/**
 * Arabic is written with and without diacritics interchangeably: someone types
 * "أعدّل" and the keyword says "أعدل". Stripping the harakat, and settling the
 * alef and ya variants, makes those the same string.
 */
function normalizeAr(text: string): string {
  return text
    .replace(/[\u064B-\u0652\u0670]/g, '')
    .replace(/[\u0622\u0623\u0625]/g, '\u0627')
    .replace(/\u0649/g, '\u064A')
    .replace(/\u0629/g, '\u0647');
}

/**
 * How well an admin-written article answers a question.
 *
 * The first version added two points for every query word that appeared
 * *anywhere* in an article's body, and a single point was enough to win. Long
 * articles therefore matched everything: "how do I track my order?" was
 * answered with the minimum-order-quantity article, because it happened to
 * contain the words "order" and "for". So the body is now worth one point,
 * capped, and only a keyword or question-title hit can carry a match.
 */
function scoreArticle(
  article: any,
  queryTokens: string[],
  locale: 'en' | 'ar'
): number {
  const keywords = (article.keywords || []).map((k: string) => normalizeAr(k.toLowerCase()));
  const questionText = normalizeAr((article.question?.[locale] || '').toLowerCase());
  const answerText = normalizeAr((article.answer?.[locale] || '').toLowerCase());

  let score = 0;
  let bodyPoints = 0;

  for (const raw of queryTokens) {
    const token = normalizeAr(raw);
    // Each token counts once, however many keywords it happens to touch.
    if (keywords.includes(token)) score += 10;
    else {
      // Arabic attaches its article to the noun — "التغليف" contains the
      // keyword "تغليف" — so a substring hit on a real word is a strong
      // signal, not the weak one a three-letter fragment would be.
      const partial = keywords.find((kw: string) => kw.includes(token) || token.includes(kw));
      if (partial) score += partial.length >= 4 && token.length >= 4 ? 6 : 3;
    }

    if (token.length >= 4 && questionText.includes(token)) score += 4;
    else if (answerText.includes(token)) bodyPoints += 1;
  }

  // Body text is corroboration, never the reason a match wins.
  return score + Math.min(bodyPoints, 5);
}

/**
 * The bar a database article must clear to answer at all.
 *
 * 10 is one exact keyword, or two partial keyword hits plus a title word —
 * i.e. something that genuinely names the topic. Below that the built-in
 * knowledge answers instead, which is the behaviour we want: those entries
 * are written alongside the features and stay accurate.
 */
const DB_MATCH_FLOOR = 10;

/** A built-in entry naming the topic outright, rather than brushing past it. */
const BUILTIN_STRONG = 10;

function findBestBuiltIn(message: string, locale: 'en' | 'ar') {
  const q = normalizeAr(message.toLowerCase());
  const tokens = tokenize(message).map(normalizeAr);

  let bestIdx = -1;
  let bestScore = 0;

  for (let i = 0; i < builtInKnowledge.length; i++) {
    const item = builtInKnowledge[i];
    const kws = (locale === 'ar' ? [...item.keywords, ...item.keywordsAr] : item.keywords).map(normalizeAr);

    // A phrase that appears verbatim is the strongest signal there is, and a
    // longer phrase is a more specific one: "how does sample" should beat a
    // bare "sample" hit on a different topic.
    let score = 0;
    for (const kw of kws) {
      if (q.includes(kw)) score += 10 + Math.min(kw.length, 14) + Math.min(kw.split(' ').length - 1, 2) * 4;
    }

    // Loose token overlap counts once per token, not once per keyword — the
    // old version multiplied a single word across every keyword it touched.
    for (const token of tokens) {
      if (kws.some((kw) => kw.includes(token) || token.includes(kw))) score += 3;
    }

    if (score > bestScore) {
      bestScore = score;
      bestIdx = i;
    }
  }

  return { idx: bestIdx, score: bestScore };
}

function getBuiltInResponse(message: string, locale: 'en' | 'ar'): string {
  const { idx, score } = findBestBuiltIn(message, locale);
  if (idx >= 0 && score >= 3) {
    const m = builtInKnowledge[idx];
    return locale === 'ar' ? m.ar : m.en;
  }
  return locale === 'ar'
    ? 'شكراً لسؤالك! KCC هي شركة رائدة في تصنيع مستحضرات التجميل في الشرق الأوسط. نقدم خدمات التصنيع بالعلامة الخاصة، التركيبات المخصصة، اختبارات الجودة، وحلول التغليف. تقدر تبدأ كويز السامبل من /order/sample أو تتواصل معنا عبر صفحة Contact. كيف يمكنني مساعدتك أكثر؟'
    : 'Thank you for your question! KCC is a leading cosmetics manufacturer in the Middle East. We offer private label manufacturing, custom formulation, quality testing, and packaging solutions. You can start the Sample Quiz from /order/sample or reach out via the Contact page. How else can I assist?';
}

/**
 * Pick 3 related follow-up questions based on the matched topic.
 * Returns the topic question phrasings (different from the just-answered one).
 */
function getRelatedQuestions(message: string, locale: 'en' | 'ar'): string[] {
  const followUpsByKeyword: Record<string, { en: string[]; ar: string[] }> = {
    quiz: {
      en: ['What product categories can I order?', 'How long does sample development take?', 'What ingredients can I choose from?'],
      ar: ['إيه الكاتيجوريز اللي أقدر أطلبها؟', 'تطوير العينة بياخد قد إيه؟', 'إيه المكونات المتاحة؟'],
    },
    category: {
      en: ['How does the Sample Quiz work?', 'Can I customize the fragrance?', 'What packaging options do you offer?'],
      ar: ['إزاي بيشتغل كويز السامبل؟', 'أقدر أخصّص العطر؟', 'إيه خيارات التغليف؟'],
    },
    ingredient: {
      en: ['What about hero ingredients?', 'Can I exclude certain ingredients?', 'Do you offer natural / vegan formulas?'],
      ar: ['إيه قصة المكونات البطل؟', 'أقدر أستبعد مكونات معينة؟', 'في تركيبات طبيعية / vegan؟'],
    },
    fragrance: {
      en: ['Can I have a fragrance-free formula?', 'How does packaging affect the scent?', 'Can the admin restrict scent families per product?'],
      ar: ['أقدر أعمل تركيبة بدون عطر؟', 'التغليف بيأثر على الرائحة؟', 'الأدمن يقدر يحدد عائلات العطر لكل منتج؟'],
    },
    sample: {
      en: ['What are your minimum order quantities?', 'How long does sample development take?', 'Can I customize the formula?'],
      ar: ['الحد الأدنى للطلب كام؟', 'تطوير العينة بياخد قد إيه؟', 'أقدر أخصّص التركيبة؟'],
    },
    certif: {
      en: ['Do you ship to my country?', 'What testing do you perform?', 'Are your products vegan-friendly?'],
      ar: ['بتشحنوا لبلدي؟', 'إيه نوع الاختبارات اللي بتعملوها؟', 'منتجاتكم vegan؟'],
    },
    moq: {
      en: ['How does pricing work?', 'How long does production take?', 'Do you offer expedited orders?'],
      ar: ['التسعير بيشتغل إزاي؟', 'الإنتاج بياخد قد إيه؟', 'في طلبات عاجلة؟'],
    },
    countr: {
      en: ['What\'s your typical delivery timeline?', 'How does export work?', 'What documents do I need?'],
      ar: ['مدة التسليم النموذجية كام؟', 'التصدير بيشتغل إزاي؟', 'إيه الأوراق المطلوبة؟'],
    },
    price: {
      en: ['What\'s the minimum order quantity?', 'How can I get a quote?', 'Do you offer volume discounts?'],
      ar: ['إيه الحد الأدنى للطلب؟', 'إزاي أطلب عرض سعر؟', 'في خصم على الكميات الكبيرة؟'],
    },
    time: {
      en: ['What\'s the sample development timeline?', 'How does the production phase work?', 'Can you expedite my order?'],
      ar: ['مدة تطوير العينة؟', 'إزاي بتشتغل مرحلة الإنتاج؟', 'تقدروا تعجلوا الطلب؟'],
    },
    formul: {
      en: ['What active ingredients can I include?', 'Can I match an existing benchmark product?', 'Do you offer ready-made formulas?'],
      ar: ['إيه المواد الفعالة اللي أقدر أضمها؟', 'أقدر أحاكي منتج موجود؟', 'في تركيبات جاهزة؟'],
    },
    packag: {
      en: ['Can I have transparent or frosted packaging?', 'What caps and dispensers can I choose?', 'How does the Sample Quiz work?'],
      ar: ['أقدر أعمل تغليف شفاف أو مثلج؟', 'إيه الأغطية وطرق الصرف المتاحة؟', 'إزاي بيشتغل كويز السامبل؟'],
    },
    track: {
      en: ['Can I reorder a sample I liked?', 'How long does production take?', 'Can I leave feedback on my sample?'],
      ar: ['أقدر أعيد طلب عينة عجبتني؟', 'الإنتاج بياخد قد إيه؟', 'أقدر أكتب تقييم على العينة؟'],
    },
    reorder: {
      en: ['How do I track my order?', 'What are your minimum order quantities?', 'How does the Sample Quiz work?'],
      ar: ['إزاي أتابع طلبي؟', 'الحد الأدنى للطلب كام؟', 'إزاي بيشتغل كويز السامبل؟'],
    },
    account: {
      en: ['How do I start my sample order?', 'How do I track my order?', 'How do I contact your team?'],
      ar: ['إزاي أبدأ طلب السامبل؟', 'إزاي أتابع طلبي؟', 'إزاي أتواصل مع الفريق؟'],
    },
    contact: {
      en: ['How do I start my sample order?', 'What\'s your typical response time?', 'Do you have a showroom?'],
      ar: ['إزاي أبدأ طلب السامبل؟', 'وقت الرد عادة قد إيه؟', 'في معرض؟'],
    },
    about: {
      en: ['What services do you offer?', 'Where are you located?', 'How does the Sample Quiz work?'],
      ar: ['إيه الخدمات اللي بتقدموها؟', 'فين موقعكم؟', 'إزاي بيشتغل كويز السامبل؟'],
    },
  };

  const q = message.toLowerCase();
  for (const [k, v] of Object.entries(followUpsByKeyword)) {
    if (q.includes(k)) return locale === 'ar' ? v.ar : v.en;
  }

  // Default related questions
  return locale === 'ar'
    ? ['إزاي بيشتغل كويز السامبل؟', 'إيه الكاتيجوريز اللي أقدر أطلبها؟', 'إيه شهادات KCC؟']
    : ['How does the Sample Quiz work?', 'What product categories can I order?', 'What certifications does KCC hold?'];
}

async function generateOpenAIResponse(
  message: string,
  context: string,
  locale: 'en' | 'ar'
): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  try {
    const systemPrompt =
      locale === 'ar'
        ? 'أنت مساعد ذكي لشركة KCC لتصنيع مستحضرات التجميل. أجب على أسئلة العملاء بناءً على المعلومات المقدمة. كن مختصراً ومفيداً. أجب باللغة العربية.'
        : 'You are an AI assistant for KCC Cosmetics Manufacturing Company. Answer customer questions based on the provided context. Be concise and helpful. Answer in English.';

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Context:\n${context}\n\nQuestion: ${message}` },
        ],
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    if (!response.ok) return null;
    const data = await response.json();
    return data.choices?.[0]?.message?.content || null;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    // Throttle to protect the OpenAI billing budget from abuse.
    const limited = rateLimit(req, 'chat', 20, 60 * 1000);
    if (limited) return limited;

    const body: ChatRequest = await req.json();

    if (!body.message || typeof body.message !== 'string') {
      return NextResponse.json({ error: 'message is required' }, { status: 400 });
    }
    if (body.message.length > 2000) {
      return NextResponse.json({ error: 'message is too long' }, { status: 400 });
    }

    const locale = body.locale === 'ar' ? 'ar' : 'en';
    const message = body.message.trim();

    // Try database articles first
    let dbArticles: any[] = [];
    try {
      await connectDB();
      dbArticles = await KnowledgeArticle.find({ enabled: true }).lean();
    } catch {
      // DB not available — proceed with built-in knowledge
    }

    const related = getRelatedQuestions(message, locale);

    /*
     * The Knowledge Base is the source of truth.
     *
     * Every entry below also exists as an article the team can edit under
     * Admin → Knowledge Base (see scripts/seed-assistant-knowledge.ts). So a
     * database article always wins once it clears the relevance floor — an
     * answer the team has reworded has to be the answer customers get, or the
     * screen that edits it is a lie.
     *
     * The built-in copies stay for two cases only: a fresh install where
     * nothing has been seeded, and the database being unreachable. They are
     * the floor, never the ceiling.
     */
    const queryTokens = tokenize(message);
    const builtIn = findBestBuiltIn(message, locale);

    const scored: ScoredArticle[] = dbArticles
      .map((article) => ({ article, score: scoreArticle(article, queryTokens, locale) }))
      .filter((x) => x.score >= DB_MATCH_FLOOR)
      .sort((a, b) => b.score - a.score);

    const topMatches = scored.slice(0, 3);
    const builtInAnswer =
      builtIn.idx >= 0 && builtIn.score >= BUILTIN_STRONG
        ? builtInKnowledge[builtIn.idx][locale]
        : null;

    if (topMatches.length > 0 || builtInAnswer) {
      const sources: string[] = topMatches.map(
        (m) => m.article.question[locale] || m.article.question.en
      );

      const contextParts = topMatches.map(
        (m) =>
          `Q: ${m.article.question[locale] || m.article.question.en}\nA: ${m.article.answer[locale] || m.article.answer.en}`
      );
      // The fallback copy is offered as context only when the Knowledge Base
      // has nothing to say; otherwise it could dilute an answer the team wrote.
      if (builtInAnswer && contextParts.length === 0) contextParts.push(builtInAnswer);

      const aiAnswer = await generateOpenAIResponse(message, contextParts.join('\n\n'), locale);
      if (aiAnswer) {
        return NextResponse.json({ answer: aiAnswer, sources, related });
      }

      // Only when nothing in the Knowledge Base names the topic.
      if (builtInAnswer && topMatches.length === 0) {
        return NextResponse.json({ answer: builtInAnswer, sources, related });
      }

      let answer = topMatches[0].article.answer[locale] || topMatches[0].article.answer.en;
      if (topMatches.length > 1 && topMatches[1].score >= topMatches[0].score * 0.7) {
        const additional = topMatches[1].article.answer[locale] || topMatches[1].article.answer.en;
        const connector = locale === 'ar' ? '\n\nبالإضافة إلى ذلك، ' : '\n\nAdditionally, ';
        answer = answer + connector + additional;
      }
      return NextResponse.json({ answer, sources, related });
    }

    // Neither source names the topic — say something useful anyway.
    const answer = getBuiltInResponse(message, locale);
    return NextResponse.json({ answer, sources: [], related });
  } catch (error: any) {
    console.error('Knowledge Chat error:', error);
    // Even on error, return a helpful response instead of failing
    const locale = 'en';
    const answer = getBuiltInResponse('general', locale);
    return NextResponse.json({ answer, sources: [] });
  }
}
