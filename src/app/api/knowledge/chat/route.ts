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
    keywordsAr: ['عين', 'طلب', 'تجرب', 'اختبار'],
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
    keywordsAr: ['حد أدنى', 'كمي', 'وحد', 'عدد'],
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
    keywords: ['time', 'long', 'timeline', 'duration', 'delivery', 'when', 'fast', 'lead'],
    keywordsAr: ['وقت', 'مدة', 'متى', 'تسليم', 'سريع'],
    en: 'Typical timelines at KCC:\n\n• **Sample Development:** 2-4 weeks\n• **Formulation Approval:** 1-2 weeks after sample review\n• **Bulk Production:** 4-8 weeks depending on quantity\n• **Packaging & Labeling:** 2-3 weeks\n• **Quality Testing:** 1-2 weeks\n• **Shipping (GCC):** 3-7 business days\n\nTotal from order to delivery is typically **8-16 weeks** for first-time orders. Repeat orders are faster. We offer expedited timelines for urgent requests.',
    ar: 'الجداول الزمنية النموذجية في KCC:\n\n• **تطوير العينة:** 2-4 أسابيع\n• **موافقة التركيبة:** 1-2 أسبوع بعد مراجعة العينة\n• **الإنتاج بالجملة:** 4-8 أسابيع حسب الكمية\n• **التغليف والتسمية:** 2-3 أسابيع\n• **اختبارات الجودة:** 1-2 أسبوع\n• **الشحن (الخليج):** 3-7 أيام عمل\n\nالإجمالي من الطلب إلى التسليم عادة **8-16 أسبوعاً** للطلبات الأولى. الطلبات المتكررة أسرع.',
  },
  {
    keywords: ['formul', 'custom', 'develop', 'create', 'new product', 'recipe', 'ingredient'],
    keywordsAr: ['تركيب', 'مخصص', 'تطوير', 'إنشاء', 'منتج جديد', 'مكون'],
    en: 'Yes! Custom formulation is one of our core services:\n\n• **From Scratch:** Our R&D team develops entirely new formulations\n• **Matching:** We can recreate or improve existing product formulas\n• **Modification:** Adjust existing formulations to your preferences\n• **Natural/Organic:** We specialize in clean beauty formulations\n\nOur chemists work with you to define the perfect texture, scent, active ingredients, and performance. We use premium raw materials sourced from trusted global suppliers.',
    ar: 'نعم! التركيبات المخصصة هي من خدماتنا الأساسية:\n\n• **من الصفر:** فريق البحث والتطوير يطور تركيبات جديدة تماماً\n• **مطابقة:** يمكننا إعادة إنتاج أو تحسين تركيبات منتجات موجودة\n• **تعديل:** ضبط التركيبات الحالية حسب تفضيلاتك\n• **طبيعي/عضوي:** نتخصص في تركيبات الجمال النظيف\n\nيعمل كيميائيونا معك لتحديد الملمس والرائحة والمكونات الفعالة والأداء المثالي.',
  },
  {
    keywords: ['packag', 'design', 'label', 'bottle', 'jar', 'container', 'box'],
    keywordsAr: ['تغليف', 'تصميم', 'عبو', 'زجاج', 'حاوي', 'علب'],
    en: 'KCC provides comprehensive packaging services:\n\n• **Container Options:** Jars, pump bottles, dropper bottles, tubes, airless pumps, spray bottles\n• **Sizes:** From 15ml to 200ml+\n• **Design Services:** We can help design your labels and packaging artwork\n• **Material Selection:** Glass, PETG, HDPE, PP, aluminum, eco-friendly options\n• **Custom Molds:** For unique container shapes (minimum quantities apply)\n• **Printing:** Screen printing, hot stamping, metallic finishes\n\nWe work with you from concept to final shelf-ready product.',
    ar: 'تقدم KCC خدمات تغليف شاملة:\n\n• **خيارات الحاويات:** برطمانات، زجاجات بمضخة، زجاجات بقطارة، أنابيب، مضخات هوائية\n• **الأحجام:** من 15 مل إلى 200+ مل\n• **خدمات التصميم:** يمكننا المساعدة في تصميم الملصقات وأعمال التغليف الفنية\n• **اختيار المواد:** زجاج، PETG، HDPE، PP، ألمنيوم، خيارات صديقة للبيئة\n• **قوالب مخصصة:** لأشكال حاويات فريدة\n• **الطباعة:** طباعة شاشية، ختم ساخن، تشطيبات معدنية',
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
    en: 'You can reach KCC through several channels:\n\n• **Website:** Use our Contact page to send a message\n• **Email:** info@kcc.sa\n• **Phone:** +966 53 848 6109 / +966 53 848 7021\n• **Location:** Riyadh, Saudi Arabia\n• **Working Hours:** Sunday–Thursday, 8 AM – 5 PM (AST)\n\nOur team typically responds within 24 business hours. For urgent inquiries, please call during business hours.',
    ar: 'يمكنك التواصل مع KCC عبر عدة قنوات:\n\n• **الموقع:** استخدم صفحة الاتصال لإرسال رسالة\n• **البريد:** info@kcc.sa\n• **الهاتف:** +966 53 848 6109 / +966 53 848 7021\n• **الموقع:** الرياض، المملكة العربية السعودية\n• **ساعات العمل:** الأحد–الخميس، 8 صباحاً – 5 مساءً\n\nفريقنا يرد عادة خلال 24 ساعة عمل.',
  },
  {
    keywords: ['quiz', 'survey', 'questionnaire', 'how to order', 'how does sample', 'sample flow', 'sample order', 'process', 'steps'],
    keywordsAr: ['كويز', 'استبيان', 'استطلاع', 'إزاي أطلب', 'خطوات', 'مراحل'],
    en: 'Our Sample Quiz is a fast, guided experience that takes about **5 minutes**:\n\n1. **Personalize** — Tell us your name or brand. We\'ll print it on your sample bottle live as you type.\n2. **Pick your category** — Choose from 10 categories: Hair Care, Skin Care, Body Care, Sun Care, Baby Care, Makeup, Fragrance, Hygiene, Massage, Oral Care. Then drill down to the exact product (e.g. Anti-Hair Loss Lotion).\n3. **Creative brief** — A handful of quick questions: target audience, desired finish, hero ingredients, marketing claims (sulfate-free, vegan, etc.).\n4. **Technical specs** — Pick oils & extracts, actives, product color, packaging type, package opacity, and your fragrance profile (family + notes + intensity). Each spec is curated to your specific product.\n5. **Review & submit** — Edit anything, add your contact email, and submit. You\'ll get an order number on screen.\n\nOur R&D team reaches out within 2–4 weeks with your sample. Start at **/order/sample**.',
    ar: 'كويز السامبل بتاعنا تجربة موجهة سريعة بتاخد حوالي **5 دقائق**:\n\n1. **شخصنه** — قولنا اسمك أو اسم البراند. هنطبعه على عبوة العينة لايف وانت بتكتب.\n2. **اختار الكاتيجوري** — من 10 كاتيجوريز: العناية بالشعر، العناية بالبشرة، العناية بالجسم، الواقي الشمسي، عناية الأطفال، الميكب، العطور، النظافة، المساج، العناية بالفم. وبعدين اختار المنتج المحدد.\n3. **البريف الإبداعي** — كام سؤال سريع: الجمهور المستهدف، اللمسة النهائية المطلوبة، المكونات البطل، الـ claims التسويقية.\n4. **المواصفات التقنية** — اختار الزيوت والمستخلصات، المواد الفعالة، لون المنتج، نوع التغليف، شفافية العلبة، والعطر (عيلة + نوتس + كثافة). كل قسم مخصص لمنتجك بالظبط.\n5. **مراجعة وإرسال** — عدّل أي حاجة، اكتب إيميلك، اضغط إرسال. هتلاقي رقم الطلب على الشاشة.\n\nفريق R&D هيتواصل معاك خلال 2-4 أسابيع. ابدأ من **/order/sample**.',
  },
  {
    keywords: ['categor', 'product type', 'what can', 'hair care', 'skin care', 'makeup', 'sun care', 'fragrance', 'baby', 'massage', 'oral', 'hygiene'],
    keywordsAr: ['كاتيجوري', 'نوع المنتج', 'شعر', 'بشرة', 'ميكب', 'شمس', 'عطر', 'أطفال', 'مساج', 'فم', 'نظافة'],
    en: 'KCC currently produces across **10 main categories with 60 sub-families and 240+ specific products**:\n\n• **Hair Care** — shampoos, conditioners, masks, serums, ampoules, lotions, beard styling, professional treatments\n• **Skin Care** — whitening, acne care, eye contour, serums (HA, Vit C, Retinol, Niacinamide…), face creams, masks, peeling\n• **Body Care** — body lotions, butters, oils, scrubs, deodorants, scar care, body firming, foot & nail care\n• **Sun Care** — SPF creams, lotions, sprays, tinted SPF, after-sun, thermal water\n• **Baby Care** — baby creams, diaper creams, bath & shower\n• **Makeup** — lip & cheek tints, tinted SPF\n• **Fragrance** — body perfumes, body splash, hair mist\n• **Hygiene** — hair removal, feminine care, soaps\n• **Massage** — creams, gels (incl. cold-effect), sprays, roll-ons\n• **Oral Care** — mouthwash, tooth gel, mouth spray\n\nThe Sample Quiz lets you drill into the exact product you want.',
    ar: 'KCC حالياً بتنتج في **10 كاتيجوريز رئيسية بـ 60 عائلة فرعية وأكثر من 240 منتج محدد**:\n\n• **العناية بالشعر** — شامبو، بلسم، ماسكات، سيرومات، أمبولات، لوشن، تشذيب اللحية، علاجات احترافية\n• **العناية بالبشرة** — تفتيح، علاج حب الشباب، محيط العين، سيرومات (HA، فيتامين C، ريتينول، نياسيناميد…)، كريمات الوجه، ماسكات، تقشير\n• **العناية بالجسم** — لوشن، زبدات، زيوت، سكرابات، مزيل عرق، علاج ندوب، شد، عناية بالقدم والأظافر\n• **الواقي الشمسي** — كريمات SPF، لوشن، رش، تنتد، بعد التعرض، ماء حراري\n• **عناية الأطفال** — كريمات أطفال، كريمات الحفاضات، استحمام\n• **الميكب** — تنتس للشفاه والخد، SPF تنتد\n• **العطور** — عطر جسم، بودي سبلاش، ميست شعر\n• **النظافة** — إزالة الشعر، العناية النسائية، صابون\n• **المساج** — كريمات، جل (cold-effect)، رش، رول-أون\n• **عناية الفم** — غسول فم، جل أسنان، رش\n\nكويز السامبل بيخليك تختار المنتج المحدد.',
  },
  {
    keywords: ['ingredient', 'oil', 'extract', 'actives', 'argan', 'jojoba', 'castor', 'fine actives', 'hyaluronic', 'retinol', 'vitamin'],
    keywordsAr: ['مكون', 'زيت', 'مستخلص', 'مواد فعالة', 'أرجان', 'جوجوبا', 'خروع', 'هيالورونيك', 'ريتينول', 'فيتامين'],
    en: 'You can choose from a wide library of ingredients, all curated per-product:\n\n• **Oils & Extracts (50+ options):** Argan, Jojoba, Castor, Tea Tree, Olive, Rose Water, Aloe Vera, Green Tea, Chamomile, Calendula, Apple Cider Vinegar, and more.\n• **Actives (60+ options):** Hyaluronic Acid, Niacinamide (Vit B3), Vitamin C (Ascorbic), Retinol (Vit A), Salicylic Acid, Caffeine, Allantoin, D-Panthenol, Shea Butter, Glycolic Acid, Zinc Pyrithione, and more.\n• **Fine Actives (25+ premium peptides):** Argireline®, Eyeseryl®, Trichogen™ VEG, fiberHance™, Matmarine™, Liposomal Vitamin C, Ceramide A2, Coenzyme Q10, and more.\n\nFor each product, our admin curates the most relevant subset — so you only see ingredients that actually make sense for your formula. You can also request specific hero ingredients in the brief.',
    ar: 'تقدر تختار من مكتبة واسعة من المكونات، كلها منتقاة حسب المنتج:\n\n• **زيوت ومستخلصات (50+ خيار):** أرجان، جوجوبا، خروع، شجرة الشاي، زيتون، ماء ورد، صبار، شاي أخضر، بابونج، آذريون، خل التفاح، والمزيد.\n• **مواد فعالة (60+ خيار):** هيالورونيك أسيد، نياسيناميد، فيتامين C، ريتينول، ساليسيليك أسيد، كافيين، ألانتوين، D-بانثينول، زبدة شيا، جلايكوليك أسيد، زنك بايريثيون، والمزيد.\n• **Fine Actives (25+ ببتيد فاخر):** Argireline®, Eyeseryl®, Trichogen™ VEG, fiberHance™, Matmarine™, ليبوسومال فيتامين C، سيراميد A2، كوإنزيم Q10، والمزيد.\n\nلكل منتج، الأدمن بيختار المجموعة الأنسب — فأنت بتشوف المكونات اللي تناسب تركيبتك بس. وتقدر تطلب مكونات بطل محددة في البريف.',
  },
  {
    keywords: ['fragrance', 'scent', 'smell', 'perfume', 'note', 'family'],
    keywordsAr: ['عطر', 'رائحة', 'عيلة', 'نوت', 'كثافة'],
    en: 'Our fragrance flow is a 3-step experience built into the Sample Quiz:\n\n1. **Family** — Pick from 10 scent families: Fresh & Clean, Fruity & Playful, Floral & Soft, Luxury & Perfume-Inspired, Oriental, Herbal, Earthy/Woody, Essential oil-like, Sweet, or Fragrance-Free.\n2. **Sub-notes** — Each family unlocks specific notes (e.g. Floral → Rose, Jasmine, White Flowers, Powdery; Oriental → Amber, Musk, Oud, Vanilla).\n3. **Intensity** — Light, Medium, Strong, or Long-Lasting.\n\nOur perfumer matches your selection to a custom blend. The full fragrance experience is configurable in the quiz — admin can also restrict which families show per-product (e.g. Baby Care never shows Oud).',
    ar: 'تجربة العطر بتاعتنا 3 خطوات داخل كويز السامبل:\n\n1. **العائلة** — من 10 عائلات: Fresh & Clean، Fruity & Playful، Floral & Soft، Luxury & Perfume-Inspired، Oriental، Herbal، Earthy/Woody، Essential oil-like، Sweet، أو بدون عطر.\n2. **النوتس الفرعية** — كل عائلة فيها نوتس محددة (مثلاً: Floral → روز، ياسمين، زهور بيضاء، Powdery؛ Oriental → عنبر، مسك، عود، فانيليا).\n3. **الكثافة** — Light، Medium، Strong، أو Long-Lasting.\n\nالعطّار بتاعنا بيطابق اختيارك لمزيج مخصص. الـ admin يقدر يحدد أي عائلات تظهر لكل منتج (مثلاً Baby Care مش هتشوف عود).',
  },
];

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s\u0600-\u06FF]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1);
}

function scoreArticle(
  article: any,
  queryTokens: string[],
  locale: 'en' | 'ar'
): number {
  let score = 0;
  const keywords = (article.keywords || []).map((k: string) => k.toLowerCase());
  for (const token of queryTokens) {
    if (keywords.includes(token)) score += 10;
    for (const kw of keywords) {
      if (kw.includes(token) || token.includes(kw)) score += 3;
    }
  }
  const questionText = (article.question?.[locale] || '').toLowerCase();
  for (const token of queryTokens) {
    if (questionText.includes(token)) score += 5;
  }
  const answerText = (article.answer?.[locale] || '').toLowerCase();
  for (const token of queryTokens) {
    if (answerText.includes(token)) score += 2;
  }
  return score;
}

function findBestBuiltIn(message: string, locale: 'en' | 'ar') {
  const q = message.toLowerCase();
  const tokens = tokenize(message);

  let bestIdx = -1;
  let bestScore = 0;

  for (let i = 0; i < builtInKnowledge.length; i++) {
    const item = builtInKnowledge[i];
    let score = 0;
    const kws = locale === 'ar' ? [...item.keywords, ...item.keywordsAr] : item.keywords;
    for (const kw of kws) {
      if (q.includes(kw)) score += 10;
      for (const token of tokens) {
        if (kw.includes(token) || token.includes(kw)) score += 3;
      }
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
      en: ['What package colors are available?', 'Can I have transparent packaging?', 'How does the Sample Quiz work?'],
      ar: ['إيه الألوان المتاحة للعلبة؟', 'أقدر أعمل تغليف شفاف؟', 'إزاي بيشتغل كويز السامبل؟'],
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

    if (dbArticles.length > 0) {
      const queryTokens = tokenize(message);
      const scored: ScoredArticle[] = dbArticles
        .map((article) => ({
          article,
          score: scoreArticle(article, queryTokens, locale),
        }))
        .filter((s) => s.score > 0)
        .sort((a, b) => b.score - a.score);

      const topMatches = scored.slice(0, 3);

      if (topMatches.length > 0) {
        const sources: string[] = topMatches.map(
          (m) => m.article.question[locale] || m.article.question.en
        );
        const contextParts = topMatches.map(
          (m) =>
            `Q: ${m.article.question[locale] || m.article.question.en}\nA: ${m.article.answer[locale] || m.article.answer.en}`
        );
        const context = contextParts.join('\n\n');

        // Try OpenAI for a better response
        const aiAnswer = await generateOpenAIResponse(message, context, locale);
        if (aiAnswer) {
          return NextResponse.json({ answer: aiAnswer, sources, related });
        }

        // Use best matching article's answer
        let answer = topMatches[0].article.answer[locale] || topMatches[0].article.answer.en;
        if (topMatches.length > 1 && topMatches[1].score >= topMatches[0].score * 0.5) {
          const additional = topMatches[1].article.answer[locale] || topMatches[1].article.answer.en;
          const connector = locale === 'ar' ? '\n\nبالإضافة إلى ذلك، ' : '\n\nAdditionally, ';
          answer = answer + connector + additional;
        }
        return NextResponse.json({ answer, sources, related });
      }
    }

    // Fall back to built-in knowledge
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
