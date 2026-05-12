/**
 * KCC Database Seed Script
 *
 * Usage:
 *   npx tsx scripts/seed.ts
 *   -- or --
 *   npx ts-node --compiler-options '{"module":"commonjs","moduleResolution":"node"}' scripts/seed.ts
 *
 * This script can also be triggered via the API route:
 *   curl -H "x-seed-key: kcc-seed-2024" http://localhost:3000/api/seed
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env.local from project root
dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') });

import mongoose from 'mongoose';

// ── Inline model imports using relative paths ──
// We import the models directly from the src directory
import User from '../src/models/User';
import CmsSection from '../src/models/CmsSection';
import Service from '../src/models/Service';
import Testimonial from '../src/models/Testimonial';
import Certificate from '../src/models/Certificate';
import Factory from '../src/models/Factory';
import PortfolioItem from '../src/models/PortfolioItem';
import NewsPost from '../src/models/NewsPost';
import FAQ from '../src/models/FAQ';
import SurveyTemplate from '../src/models/SurveyTemplate';
import InventoryItem from '../src/models/InventoryItem';
import PromoCode from '../src/models/PromoCode';
import SeoGlobal from '../src/models/SeoGlobal';
import SeoPage from '../src/models/SeoPage';
import KnowledgeArticle from '../src/models/KnowledgeArticle';
import ProductVisualRule from '../src/models/ProductVisualRule';
import BriefQuestion from '../src/models/BriefQuestion';
import SpecOptionMaster from '../src/models/SpecOptionMaster';
import ProductSpecConfig from '../src/models/ProductSpecConfig';
import briefQuestionsData from '../src/data/brief-questions.json';
import specOptionsData from '../src/data/spec-options.json';
import { getAllProducts } from '../src/lib/categories';

// We need bcryptjs for password hashing
import bcrypt from 'bcryptjs';

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

async function seed() {
  const MONGODB_URI = process.env.MONGODB_URI;
  if (!MONGODB_URI) {
    console.error('ERROR: MONGODB_URI not found in .env.local');
    process.exit(1);
  }

  console.log('Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI);
  console.log('Connected.');

  // ── Drop existing collections ──
  console.log('Dropping existing collections...');
  const collectionNames = [
    'users', 'cmssections', 'services', 'testimonials', 'certificates',
    'factories', 'portfolioitems', 'newsposts', 'faqs', 'surveytemplates',
    'inventoryitems', 'promocodes', 'seoglobals', 'seopages',
    'knowledgearticles', 'productvisualrules',
    // Sample Quiz collections
    'briefquestions', 'specoptionmasters', 'productspecconfigs',
  ];

  for (const name of collectionNames) {
    try {
      await mongoose.connection.db!.collection(name).drop();
      console.log(`  Dropped: ${name}`);
    } catch {
      // collection may not exist
    }
  }

  // ══════════════════════════════════════════════
  //  1. USERS
  // ══════════════════════════════════════════════
  console.log('Creating users...');
  const adminPassword = await hashPassword('Admin@123');
  const customerPassword = await hashPassword('Test@123');

  await User.create([
    {
      name: 'KCC Admin',
      email: 'admin@kcc.sa',
      password: adminPassword,
      role: 'SUPER_ADMIN',
      referralCode: 'ADMI0001',
      isActive: true,
      languagePref: 'en',
    },
    {
      name: 'Ahmed Al-Rashid',
      email: 'ahmed@test.com',
      password: customerPassword,
      role: 'CUSTOMER',
      company: 'Glow Beauty',
      referralCode: 'AHMD1234',
      isActive: true,
      languagePref: 'en',
    },
  ]);

  // ══════════════════════════════════════════════
  //  2. CMS SECTIONS
  // ══════════════════════════════════════════════
  console.log('Creating CMS sections...');
  await CmsSection.create([
    {
      type: 'hero',
      slug: 'home-hero',
      order: 1,
      enabled: true,
      status: 'published',
      fields: {
        en: {
          title: 'Your Trusted Cosmetics Manufacturing Partner',
          subtitle: 'Private Label & Custom Formulation',
          description: 'KCC delivers world-class cosmetics manufacturing with cutting-edge technology, GMP-certified facilities, and a passionate team dedicated to bringing your beauty vision to life.',
        },
        ar: {
          title: 'شريكك الموثوق في تصنيع مستحضرات التجميل',
          subtitle: 'العلامة الخاصة والتركيبات المخصصة',
          description: 'تقدم KCC تصنيع مستحضرات تجميل عالمي المستوى بتقنيات متطورة ومرافق معتمدة بشهادة GMP وفريق متخصص لتحقيق رؤيتك الجمالية.',
        },
      },
      images: ['/images/hero-bg.jpg'],
    },
    {
      type: 'services',
      slug: 'home-services',
      order: 2,
      enabled: true,
      status: 'published',
      fields: {
        en: { title: 'Our Services', subtitle: 'End-to-end cosmetics manufacturing solutions' },
        ar: { title: 'خدماتنا', subtitle: 'حلول تصنيع مستحضرات التجميل المتكاملة' },
      },
    },
    {
      type: 'stats',
      slug: 'home-stats',
      order: 3,
      enabled: true,
      status: 'published',
      fields: {
        en: {
          title: 'Our Impact in Numbers',
          items: [
            { label: 'Products Manufactured', value: '5000+' },
            { label: 'Happy Clients', value: '200+' },
            { label: 'Years of Experience', value: '15+' },
            { label: 'Countries Served', value: '20+' },
          ],
        },
        ar: {
          title: 'تأثيرنا بالأرقام',
          items: [
            { label: 'المنتجات المصنعة', value: '+5000' },
            { label: 'العملاء السعداء', value: '+200' },
            { label: 'سنوات الخبرة', value: '+15' },
            { label: 'الدول التي نخدمها', value: '+20' },
          ],
        },
      },
    },
    {
      type: 'process',
      slug: 'home-process',
      order: 4,
      enabled: true,
      status: 'published',
      fields: {
        en: {
          title: 'How We Work',
          subtitle: 'From concept to shelf in 4 simple steps',
          steps: [
            { title: 'Consultation', description: 'We discuss your vision, target market, and product requirements.' },
            { title: 'Formulation', description: 'Our R&D team develops custom formulations tailored to your specifications.' },
            { title: 'Production', description: 'Manufacturing in our GMP-certified facility with strict quality control.' },
            { title: 'Delivery', description: 'Packaging, labeling, and logistics handled end-to-end.' },
          ],
        },
        ar: {
          title: 'كيف نعمل',
          subtitle: 'من الفكرة إلى الرف في 4 خطوات بسيطة',
          steps: [
            { title: 'الاستشارة', description: 'نناقش رؤيتك والسوق المستهدف ومتطلبات المنتج.' },
            { title: 'التركيب', description: 'يطور فريق البحث والتطوير تركيبات مخصصة حسب مواصفاتك.' },
            { title: 'الإنتاج', description: 'التصنيع في منشأتنا المعتمدة بشهادة GMP مع رقابة جودة صارمة.' },
            { title: 'التسليم', description: 'التغليف والتوسيم واللوجستيات من البداية للنهاية.' },
          ],
        },
      },
    },
  ]);

  // ══════════════════════════════════════════════
  //  3. SERVICES
  // ══════════════════════════════════════════════
  console.log('Creating services...');
  await Service.create([
    {
      title: { en: 'Private Label Manufacturing', ar: 'تصنيع العلامة الخاصة' },
      description: {
        en: 'Launch your own beauty brand with our full-service private label manufacturing. We handle formulation, production, packaging, and quality assurance so you can focus on building your brand.',
        ar: 'أطلق علامتك التجارية الخاصة بالجمال مع خدمات تصنيع العلامة الخاصة الشاملة. نتولى التركيب والإنتاج والتغليف وضمان الجودة حتى تتمكن من التركيز على بناء علامتك التجارية.',
      },
      icon: 'Factory', image: '/images/services/private-label.jpg', order: 1, enabled: true,
    },
    {
      title: { en: 'Custom Formulation', ar: 'التركيبات المخصصة' },
      description: {
        en: 'Our expert R&D team creates unique, innovative formulations tailored to your brand identity and target audience. From serums to moisturizers, we bring your product vision to reality.',
        ar: 'يقوم فريق البحث والتطوير الخبير لدينا بإنشاء تركيبات فريدة ومبتكرة مصممة خصيصاً لهوية علامتك التجارية وجمهورك المستهدف.',
      },
      icon: 'FlaskConical', image: '/images/services/custom-formulation.jpg', order: 2, enabled: true,
    },
    {
      title: { en: 'Quality Assurance & Testing', ar: 'ضمان الجودة والاختبار' },
      description: {
        en: 'Every product undergoes rigorous testing including stability, microbial, and dermatological assessments. Our GMP-certified processes ensure the highest standards of safety and efficacy.',
        ar: 'يخضع كل منتج لاختبارات صارمة تشمل اختبارات الثبات والميكروبيولوجيا والتقييمات الجلدية. تضمن عملياتنا المعتمدة بشهادة GMP أعلى معايير السلامة والفعالية.',
      },
      icon: 'ShieldCheck', image: '/images/services/quality-assurance.jpg', order: 3, enabled: true,
    },
    {
      title: { en: 'Regulatory & Compliance', ar: 'الشؤون التنظيمية والامتثال' },
      description: {
        en: 'Navigate complex regulations with confidence. We ensure full compliance with SFDA, GCC, and international cosmetic regulations including product registration and documentation.',
        ar: 'تعامل مع اللوائح المعقدة بثقة. نضمن الامتثال الكامل للهيئة العامة للغذاء والدواء ودول مجلس التعاون الخليجي واللوائح الدولية لمستحضرات التجميل.',
      },
      icon: 'FileCheck', image: '/images/services/regulatory.jpg', order: 4, enabled: true,
    },
  ]);

  // ══════════════════════════════════════════════
  //  4. TESTIMONIALS
  // ══════════════════════════════════════════════
  console.log('Creating testimonials...');
  await Testimonial.create([
    {
      name: { en: 'Sara Al-Harbi', ar: 'سارة الحربي' },
      company: { en: 'Luxe Skin Co.', ar: 'لوكس سكن' },
      content: {
        en: 'KCC transformed our brand vision into reality. Their attention to detail and quality standards are unmatched. We launched our skincare line in record time thanks to their expertise.',
        ar: 'حولت KCC رؤية علامتنا التجارية إلى واقع. اهتمامهم بالتفاصيل ومعايير الجودة لا مثيل لها. أطلقنا خط العناية بالبشرة في وقت قياسي بفضل خبرتهم.',
      },
      avatar: '/images/testimonials/sara.jpg', rating: 5, order: 1, enabled: true,
    },
    {
      name: { en: 'Mohammed Al-Qahtani', ar: 'محمد القحطاني' },
      company: { en: 'Desert Glow', ar: 'ديزرت جلو' },
      content: {
        en: 'Working with KCC has been a game changer for our business. Their custom formulation team developed products that perfectly match our brand identity and the Saudi market demands.',
        ar: 'كان العمل مع KCC نقلة نوعية لأعمالنا. طور فريق التركيبات المخصصة منتجات تتناسب تماماً مع هوية علامتنا التجارية ومتطلبات السوق السعودي.',
      },
      avatar: '/images/testimonials/mohammed.jpg', rating: 5, order: 2, enabled: true,
    },
    {
      name: { en: 'Lina Fadel', ar: 'لينا فاضل' },
      company: { en: 'Pure Essence Beauty', ar: 'بيور إيسنس بيوتي' },
      content: {
        en: 'The quality of products from KCC exceeds expectations every time. Their regulatory team made the SFDA registration process seamless. Highly recommended for any beauty entrepreneur.',
        ar: 'جودة المنتجات من KCC تتجاوز التوقعات في كل مرة. جعل فريقهم التنظيمي عملية تسجيل الهيئة العامة للغذاء والدواء سلسة. أنصح بشدة لأي رائد أعمال في مجال الجمال.',
      },
      avatar: '/images/testimonials/lina.jpg', rating: 5, order: 3, enabled: true,
    },
  ]);

  // ══════════════════════════════════════════════
  //  5. CERTIFICATES
  // ══════════════════════════════════════════════
  console.log('Creating certificates...');
  await Certificate.create([
    {
      title: { en: 'ISO 22716', ar: 'آيزو 22716' },
      description: {
        en: 'International standard for Good Manufacturing Practices (GMP) in the cosmetics industry.',
        ar: 'المعيار الدولي لممارسات التصنيع الجيد (GMP) في صناعة مستحضرات التجميل.',
      },
      imageUrl: '/images/certificates/iso-22716.png',
      issuer: { en: 'International Organization for Standardization', ar: 'المنظمة الدولية للمعايير' },
      issuedDate: new Date('2023-01-15'), order: 1, enabled: true,
    },
    {
      title: { en: 'GMP Certification', ar: 'شهادة GMP' },
      description: {
        en: 'Good Manufacturing Practice certification verifying highest standards of production quality and hygiene.',
        ar: 'شهادة ممارسات التصنيع الجيد التي تؤكد أعلى معايير جودة الإنتاج والنظافة.',
      },
      imageUrl: '/images/certificates/gmp.png',
      issuer: { en: 'Saudi FDA (SFDA)', ar: 'الهيئة العامة للغذاء والدواء' },
      issuedDate: new Date('2023-06-01'), order: 2, enabled: true,
    },
  ]);

  // ══════════════════════════════════════════════
  //  6. FACTORY
  // ══════════════════════════════════════════════
  console.log('Creating factory...');
  await Factory.create({
    name: { en: 'Riyadh Plant', ar: 'مصنع الرياض' },
    description: {
      en: 'Our state-of-the-art manufacturing facility in Riyadh features advanced production lines, clean rooms, and quality control labs.',
      ar: 'يتميز مصنعنا الحديث في الرياض بخطوط إنتاج متقدمة وغرف نظيفة ومختبرات مراقبة الجودة.',
    },
    location: { en: 'Riyadh, Saudi Arabia', ar: 'الرياض، المملكة العربية السعودية' },
    capacity: { en: '50,000 units/month', ar: '50,000 وحدة/شهر' },
    imageUrl: '/images/factory/riyadh-plant.jpg',
    features: [
      { en: 'ISO 22716 Certified Clean Rooms', ar: 'غرف نظيفة معتمدة آيزو 22716' },
      { en: 'Automated Filling Lines', ar: 'خطوط تعبئة آلية' },
      { en: 'In-house Quality Control Lab', ar: 'مختبر مراقبة جودة داخلي' },
      { en: 'Temperature-Controlled Storage', ar: 'تخزين مع التحكم بالحرارة' },
    ],
    order: 1, enabled: true,
  });

  // ══════════════════════════════════════════════
  //  7. PORTFOLIO ITEMS
  // ══════════════════════════════════════════════
  console.log('Creating portfolio items...');
  await PortfolioItem.create([
    {
      title: { en: 'Luxe Hydrating Serum Collection', ar: 'مجموعة سيروم الترطيب الفاخرة' },
      description: {
        en: 'A premium 5-product hydrating serum line developed for Luxe Skin Co.',
        ar: 'خط سيروم ترطيب فاخر من 5 منتجات تم تطويره لشركة لوكس سكن.',
      },
      category: { en: 'Skincare', ar: 'العناية بالبشرة' },
      imageUrl: '/images/portfolio/luxe-serum.jpg',
      client: 'Luxe Skin Co.',
      slug: 'luxe-hydrating-serum-collection',
      tags: ['skincare', 'serum', 'hydrating', 'private-label'], enabled: true, order: 1,
    },
    {
      title: { en: 'Desert Rose Makeup Line', ar: 'خط مكياج وردة الصحراء' },
      description: {
        en: 'Complete makeup line designed specifically for Middle Eastern skin tones with heat-resistant formulas.',
        ar: 'خط مكياج كامل مصمم خصيصاً لألوان البشرة الشرق أوسطية بتركيبات مقاومة للحرارة.',
      },
      category: { en: 'Makeup', ar: 'المكياج' },
      imageUrl: '/images/portfolio/desert-rose.jpg',
      client: 'Desert Glow',
      slug: 'desert-rose-makeup-line',
      tags: ['makeup', 'foundation', 'heat-resistant', 'custom-formulation'], enabled: true, order: 2,
    },
  ]);

  // ══════════════════════════════════════════════
  //  8. NEWS POSTS
  // ══════════════════════════════════════════════
  console.log('Creating news posts...');
  await NewsPost.create([
    {
      title: { en: 'KCC Achieves ISO 22716 Recertification for 2024', ar: 'KCC تحصل على إعادة اعتماد آيزو 22716 لعام 2024' },
      content: {
        en: 'We are proud to announce that KCC has successfully passed the ISO 22716 audit and achieved recertification for 2024.',
        ar: 'يسعدنا أن نعلن أن KCC قد اجتازت بنجاح تدقيق آيزو 22716 وحصلت على إعادة الاعتماد لعام 2024.',
      },
      excerpt: { en: 'KCC successfully passes ISO 22716 audit with zero non-conformities.', ar: 'KCC تجتاز تدقيق آيزو 22716 بنجاح.' },
      slug: 'kcc-iso-22716-recertification-2024',
      imageUrl: '/images/news/iso-recert.jpg', author: 'KCC Admin',
      tags: ['ISO', 'certification', 'quality', 'GMP'],
      status: 'published', publishedAt: new Date('2024-03-15'),
    },
    {
      title: { en: 'New Heat-Resistant Formulation Line for Gulf Markets', ar: 'خط تركيبات جديد مقاوم للحرارة لأسواق الخليج' },
      content: {
        en: 'KCC is excited to introduce our new line of heat-resistant cosmetic formulations specifically designed for the Gulf climate.',
        ar: 'يسعد KCC أن تقدم خطنا الجديد من تركيبات مستحضرات التجميل المقاومة للحرارة المصممة خصيصاً لمناخ الخليج.',
      },
      excerpt: { en: 'Introducing proprietary heat-resistant formulations designed for Gulf climate.', ar: 'نقدم تركيبات حصرية مقاومة للحرارة لمناخ الخليج.' },
      slug: 'heat-resistant-formulation-gulf-markets',
      imageUrl: '/images/news/heat-resistant.jpg', author: 'KCC Admin',
      tags: ['formulation', 'heat-resistant', 'Gulf', 'innovation'],
      status: 'published', publishedAt: new Date('2024-06-01'),
    },
  ]);

  // ══════════════════════════════════════════════
  //  9. FAQS
  // ══════════════════════════════════════════════
  console.log('Creating FAQs...');
  await FAQ.create([
    {
      question: { en: 'What is the minimum order quantity (MOQ)?', ar: 'ما هو الحد الأدنى لكمية الطلب؟' },
      answer: { en: 'Our MOQ for sample orders starts at 100 units. For bulk production, the MOQ is typically 1,000 units per SKU.', ar: 'يبدأ الحد الأدنى لطلبات العينات من 100 وحدة. للإنتاج بالجملة، الحد الأدنى عادة 1,000 وحدة لكل SKU.' },
      category: 'general', order: 1, enabled: true,
    },
    {
      question: { en: 'How long does the production process take?', ar: 'كم تستغرق عملية الإنتاج؟' },
      answer: { en: 'Standard production lead time is 4-6 weeks from order confirmation. Sample orders are typically completed within 2-3 weeks.', ar: 'المدة الزمنية القياسية للإنتاج هي 4-6 أسابيع من تأكيد الطلب. تكتمل طلبات العينات عادة في غضون 2-3 أسابيع.' },
      category: 'production', order: 2, enabled: true,
    },
    {
      question: { en: 'Do you handle SFDA registration?', ar: 'هل تتولون تسجيل الهيئة العامة للغذاء والدواء؟' },
      answer: { en: 'Yes, we provide full regulatory support including SFDA product registration and compliance consulting.', ar: 'نعم، نقدم دعماً تنظيمياً كاملاً بما في ذلك تسجيل المنتجات لدى الهيئة العامة للغذاء والدواء واستشارات الامتثال.' },
      category: 'regulatory', order: 3, enabled: true,
    },
    {
      question: { en: 'What certifications does your facility hold?', ar: 'ما هي الشهادات التي يحملها مصنعكم؟' },
      answer: { en: 'Our facility is ISO 22716 certified and holds GMP certification from the Saudi FDA.', ar: 'مصنعنا حاصل على شهادة آيزو 22716 وشهادة GMP من الهيئة العامة للغذاء والدواء السعودية.' },
      category: 'quality', order: 4, enabled: true,
    },
    {
      question: { en: 'Can I customize the packaging and labeling?', ar: 'هل يمكنني تخصيص التغليف والتوسيم؟' },
      answer: { en: 'Absolutely! We offer fully customizable packaging solutions including container selection, label design support, and custom printing.', ar: 'بالتأكيد! نقدم حلول تغليف قابلة للتخصيص بالكامل تشمل اختيار العبوات ودعم تصميم الملصقات والطباعة المخصصة.' },
      category: 'packaging', order: 5, enabled: true,
    },
  ]);

  // ══════════════════════════════════════════════
  //  10. SEO GLOBAL
  // ══════════════════════════════════════════════
  console.log('Creating SEO global config...');
  await SeoGlobal.create({
    titleTemplate: { en: '%s | KCC - Cosmetics Manufacturing', ar: '%s | KCC - تصنيع مستحضرات التجميل' },
    defaultDescription: {
      en: "KCC is Saudi Arabia's leading cosmetics contract manufacturer offering private label, custom formulation, and GMP-certified production.",
      ar: 'KCC هي الشركة الرائدة في تصنيع مستحضرات التجميل بالعقود في المملكة العربية السعودية.',
    },
    defaultOgImage: '/images/og-default.jpg',
    twitterCard: 'summary_large_image',
    canonicalBase: 'https://kcc.sa',
  });

  // ══════════════════════════════════════════════
  //  11. SEO PAGES
  // ══════════════════════════════════════════════
  console.log('Creating SEO pages...');
  await SeoPage.create([
    {
      page: 'home',
      title: { en: 'Home', ar: 'الرئيسية' },
      description: { en: 'KCC - Your trusted partner for private label cosmetics manufacturing in Saudi Arabia.', ar: 'KCC - شريكك الموثوق لتصنيع مستحضرات التجميل بالعلامة الخاصة في السعودية.' },
      keywords: { en: 'cosmetics manufacturing, private label, Saudi Arabia, GMP', ar: 'تصنيع مستحضرات التجميل، العلامة الخاصة، السعودية، GMP' },
      ogTitle: { en: 'KCC - Cosmetics Manufacturing', ar: 'KCC - تصنيع مستحضرات التجميل' },
      ogDescription: { en: "Saudi Arabia's leading cosmetics contract manufacturer.", ar: 'الشركة الرائدة في تصنيع مستحضرات التجميل بالعقود في السعودية.' },
      ogImage: '/images/og-home.jpg', canonical: 'https://kcc.sa', robots: 'index,follow',
    },
    {
      page: 'about',
      title: { en: 'About Us', ar: 'من نحن' },
      description: { en: "Learn about KCC's history, mission, and state-of-the-art facility in Riyadh.", ar: 'تعرف على تاريخ ورسالة KCC ومنشأتها الحديثة في الرياض.' },
      keywords: { en: 'about KCC, cosmetics manufacturer, Riyadh factory', ar: 'عن KCC، مصنع مستحضرات تجميل، مصنع الرياض' },
      ogTitle: { en: 'About KCC', ar: 'عن KCC' },
      ogDescription: { en: "Discover the story behind Saudi Arabia's leading cosmetics manufacturer.", ar: 'اكتشف القصة وراء الشركة الرائدة في تصنيع مستحضرات التجميل في السعودية.' },
      ogImage: '/images/og-about.jpg', canonical: 'https://kcc.sa/about', robots: 'index,follow',
    },
    {
      page: 'contact',
      title: { en: 'Contact Us', ar: 'اتصل بنا' },
      description: { en: 'Get in touch with KCC for cosmetics manufacturing inquiries.', ar: 'تواصل مع KCC لاستفسارات تصنيع مستحضرات التجميل.' },
      keywords: { en: 'contact KCC, cosmetics manufacturing inquiry', ar: 'تواصل مع KCC، استفسار تصنيع' },
      ogTitle: { en: 'Contact KCC', ar: 'تواصل مع KCC' },
      ogDescription: { en: 'Reach out to start your cosmetics manufacturing journey with KCC.', ar: 'تواصل معنا لبدء رحلة تصنيع مستحضرات التجميل مع KCC.' },
      ogImage: '/images/og-contact.jpg', canonical: 'https://kcc.sa/contact', robots: 'index,follow',
    },
  ]);

  // ══════════════════════════════════════════════
  //  12. SURVEY TEMPLATE  (abbreviated - same as API route version)
  // ══════════════════════════════════════════════
  console.log('Creating survey template...');
  await SurveyTemplate.create({
    name: 'Sample Order Survey',
    type: 'sample',
    isActive: true,
    steps: [
      {
        stepNumber: 1,
        title: { en: 'Product Basics', ar: 'أساسيات المنتج' },
        description: { en: 'Tell us about the product you want to create.', ar: 'أخبرنا عن المنتج الذي تريد إنشاءه.' },
        questions: [
          { key: 'productType', label: { en: 'Product Type', ar: 'نوع المنتج' }, type: 'select', required: true, options: [
            { value: 'serum', label: { en: 'Serum', ar: 'سيروم' } },
            { value: 'cream', label: { en: 'Cream / Moisturizer', ar: 'كريم / مرطب' } },
            { value: 'cleanser', label: { en: 'Cleanser', ar: 'غسول' } },
            { value: 'toner', label: { en: 'Toner', ar: 'تونر' } },
            { value: 'mask', label: { en: 'Face Mask', ar: 'ماسك للوجه' } },
            { value: 'sunscreen', label: { en: 'Sunscreen', ar: 'واقي شمس' } },
          ]},
          { key: 'skinType', label: { en: 'Target Skin Type', ar: 'نوع البشرة المستهدف' }, type: 'select', required: true, options: [
            { value: 'all', label: { en: 'All Skin Types', ar: 'جميع أنواع البشرة' } },
            { value: 'oily', label: { en: 'Oily', ar: 'دهنية' } },
            { value: 'dry', label: { en: 'Dry', ar: 'جافة' } },
            { value: 'combination', label: { en: 'Combination', ar: 'مختلطة' } },
            { value: 'sensitive', label: { en: 'Sensitive', ar: 'حساسة' } },
          ]},
          { key: 'primaryGoal', label: { en: 'Primary Goal', ar: 'الهدف الرئيسي' }, type: 'select', required: true, options: [
            { value: 'hydration', label: { en: 'Hydration', ar: 'ترطيب' } },
            { value: 'antiAging', label: { en: 'Anti-Aging', ar: 'مكافحة الشيخوخة' } },
            { value: 'brightening', label: { en: 'Brightening', ar: 'تفتيح' } },
            { value: 'acne', label: { en: 'Acne Control', ar: 'علاج حب الشباب' } },
          ]},
          { key: 'texturePreference', label: { en: 'Texture Preference', ar: 'تفضيل القوام' }, type: 'select', required: false, options: [
            { value: 'lightweight', label: { en: 'Lightweight / Gel', ar: 'خفيف / جل' } },
            { value: 'rich', label: { en: 'Rich / Creamy', ar: 'غني / كريمي' } },
            { value: 'oil', label: { en: 'Oil-Based', ar: 'زيتي' } },
          ]},
        ],
      },
      {
        stepNumber: 2,
        title: { en: 'Ingredients', ar: 'المكونات' },
        description: { en: 'Specify ingredient preferences and restrictions.', ar: 'حدد تفضيلات المكونات والقيود.' },
        questions: [
          { key: 'mustHaveIngredients', label: { en: 'Must-Have Ingredients', ar: 'مكونات ضرورية' }, type: 'multiselect', required: false, options: [
            { value: 'hyaluronicAcid', label: { en: 'Hyaluronic Acid', ar: 'حمض الهيالورونيك' } },
            { value: 'vitaminC', label: { en: 'Vitamin C', ar: 'فيتامين سي' } },
            { value: 'retinol', label: { en: 'Retinol', ar: 'ريتينول' } },
            { value: 'niacinamide', label: { en: 'Niacinamide', ar: 'نياسيناميد' } },
          ]},
          { key: 'mustAvoidIngredients', label: { en: 'Must-Avoid Ingredients', ar: 'مكونات يجب تجنبها' }, type: 'multiselect', required: false, options: [
            { value: 'parabens', label: { en: 'Parabens', ar: 'البارابين' } },
            { value: 'sulfates', label: { en: 'Sulfates', ar: 'الكبريتات' } },
            { value: 'silicone', label: { en: 'Silicone', ar: 'سيليكون' } },
          ]},
          { key: 'parabenFree', label: { en: 'Paraben Free', ar: 'خالي من البارابين' }, type: 'toggle', required: false },
          { key: 'sulfateFree', label: { en: 'Sulfate Free', ar: 'خالي من الكبريتات' }, type: 'toggle', required: false },
          { key: 'siliconeFree', label: { en: 'Silicone Free', ar: 'خالي من السيليكون' }, type: 'toggle', required: false },
          { key: 'fragranceFree', label: { en: 'Fragrance Free', ar: 'خالي من العطور' }, type: 'toggle', required: false },
          { key: 'natural', label: { en: 'Natural / Organic', ar: 'طبيعي / عضوي' }, type: 'toggle', required: false },
          { key: 'vegan', label: { en: 'Vegan', ar: 'نباتي' }, type: 'toggle', required: false },
          { key: 'crueltyFree', label: { en: 'Cruelty Free', ar: 'لم يُختبر على الحيوانات' }, type: 'toggle', required: false },
        ],
      },
      {
        stepNumber: 3,
        title: { en: 'Quality & Testing', ar: 'الجودة والاختبار' },
        description: { en: 'Select the quality tests and certifications you require.', ar: 'اختر اختبارات الجودة والشهادات المطلوبة.' },
        questions: [
          { key: 'stabilityTest', label: { en: 'Stability Testing', ar: 'اختبار الثبات' }, type: 'toggle', required: false },
          { key: 'microbiologicalTest', label: { en: 'Microbiological Testing', ar: 'الاختبار الميكروبيولوجي' }, type: 'toggle', required: false },
          { key: 'dermatologicallyTested', label: { en: 'Dermatologically Tested', ar: 'مختبر جلدياً' }, type: 'toggle', required: false },
          { key: 'coaCertificate', label: { en: 'Certificate of Analysis (COA)', ar: 'شهادة تحليل (COA)' }, type: 'toggle', required: false },
          { key: 'gmpCertificate', label: { en: 'GMP Certificate', ar: 'شهادة GMP' }, type: 'toggle', required: false },
        ],
      },
      {
        stepNumber: 4,
        title: { en: 'Legal & Regulatory', ar: 'القانوني والتنظيمي' },
        description: { en: 'Provide regulatory and compliance details.', ar: 'قدم تفاصيل التنظيم والامتثال.' },
        questions: [
          { key: 'targetCountry', label: { en: 'Target Country / Region', ar: 'الدولة / المنطقة المستهدفة' }, type: 'select', required: true, options: [
            { value: 'sa', label: { en: 'Saudi Arabia', ar: 'المملكة العربية السعودية' } },
            { value: 'uae', label: { en: 'UAE', ar: 'الإمارات' } },
            { value: 'gcc', label: { en: 'GCC Region', ar: 'دول الخليج' } },
            { value: 'international', label: { en: 'International', ar: 'دولي' } },
          ]},
          { key: 'officialRegistration', label: { en: 'Need SFDA Registration', ar: 'تحتاج تسجيل SFDA' }, type: 'toggle', required: false },
          { key: 'ingredientsListFormat', label: { en: 'Ingredients List Format', ar: 'صيغة قائمة المكونات' }, type: 'select', required: false, options: [
            { value: 'inci', label: { en: 'INCI (International)', ar: 'INCI (دولي)' } },
            { value: 'arabic', label: { en: 'Arabic Translation', ar: 'ترجمة عربية' } },
            { value: 'both', label: { en: 'Both INCI + Arabic', ar: 'INCI + عربي معاً' } },
          ]},
          { key: 'finalProductName', label: { en: 'Final Product Name', ar: 'اسم المنتج النهائي' }, type: 'text', required: false },
        ],
      },
      {
        stepNumber: 5,
        title: { en: 'Production & Technical', ar: 'الإنتاج والتقنيات' },
        description: { en: 'Technical specifications and production requirements.', ar: 'المواصفات التقنية ومتطلبات الإنتاج.' },
        questions: [
          { key: 'shelfLife', label: { en: 'Desired Shelf Life', ar: 'مدة الصلاحية المطلوبة' }, type: 'select', required: false, options: [
            { value: '12', label: { en: '12 Months', ar: '12 شهر' } },
            { value: '24', label: { en: '24 Months', ar: '24 شهر' } },
            { value: '36', label: { en: '36 Months', ar: '36 شهر' } },
          ]},
          { key: 'storageConditions', label: { en: 'Storage Conditions', ar: 'ظروف التخزين' }, type: 'select', required: false, options: [
            { value: 'roomTemp', label: { en: 'Room Temperature', ar: 'درجة حرارة الغرفة' } },
            { value: 'cool', label: { en: 'Cool & Dry Place', ar: 'مكان بارد وجاف' } },
          ]},
          { key: 'gulfHeatResistant', label: { en: 'Gulf Heat-Resistant Formula', ar: 'تركيبة مقاومة لحرارة الخليج' }, type: 'toggle', required: false },
          { key: 'batchTracking', label: { en: 'Batch Tracking Required', ar: 'تتبع الدفعة مطلوب' }, type: 'toggle', required: false },
        ],
      },
      {
        stepNumber: 6,
        title: { en: 'Packaging', ar: 'التغليف' },
        description: { en: 'Choose your packaging preferences.', ar: 'اختر تفضيلات التغليف.' },
        questions: [
          { key: 'size', label: { en: 'Product Size', ar: 'حجم المنتج' }, type: 'select', required: true, options: [
            { value: '30ml', label: { en: '30 ml', ar: '30 مل' } },
            { value: '50ml', label: { en: '50 ml', ar: '50 مل' } },
            { value: '100ml', label: { en: '100 ml', ar: '100 مل' } },
            { value: '200ml', label: { en: '200 ml', ar: '200 مل' } },
          ]},
          { key: 'containerType', label: { en: 'Container Type', ar: 'نوع العبوة' }, type: 'select', required: true, options: [
            { value: 'glassPump', label: { en: 'Glass Pump Bottle', ar: 'زجاجة مضخة زجاجية' } },
            { value: 'airlessPump', label: { en: 'Airless Pump', ar: 'مضخة بدون هواء' } },
            { value: 'dropper', label: { en: 'Dropper Bottle', ar: 'زجاجة قطارة' } },
            { value: 'jar', label: { en: 'Jar', ar: 'برطمان' } },
            { value: 'tube', label: { en: 'Tube', ar: 'أنبوب' } },
          ]},
        ],
      },
      {
        stepNumber: 7,
        title: { en: 'Brand Vision', ar: 'رؤية العلامة التجارية' },
        description: { en: 'Share your brand story and vision.', ar: 'شاركنا قصة علامتك التجارية ورؤيتك.' },
        questions: [
          { key: 'brandVision', label: { en: 'Brand Vision & Notes', ar: 'رؤية العلامة التجارية وملاحظات' }, type: 'textarea', required: false },
        ],
      },
    ],
  });

  // ══════════════════════════════════════════════
  //  13. INVENTORY ITEMS
  // ══════════════════════════════════════════════
  console.log('Creating inventory items...');
  await InventoryItem.create([
    { sku: 'RM-HA-001', name: { en: 'Hyaluronic Acid', ar: 'حمض الهيالورونيك' }, description: { en: 'High molecular weight hyaluronic acid powder.', ar: 'مسحوق حمض الهيالورونيك عالي الوزن الجزيئي.' }, category: 'raw-material', currentStock: 500, lowStockThreshold: 50, unit: 'kg', costPerUnit: 120, isActive: true },
    { sku: 'RM-VC-001', name: { en: 'Vitamin C Serum Base', ar: 'قاعدة سيروم فيتامين سي' }, description: { en: 'Stabilized L-ascorbic acid base.', ar: 'قاعدة حمض الأسكوربيك المستقر.' }, category: 'raw-material', currentStock: 300, lowStockThreshold: 30, unit: 'liters', costPerUnit: 85, isActive: true },
    { sku: 'RM-RT-001', name: { en: 'Retinol Complex', ar: 'مركب الريتينول' }, description: { en: 'Encapsulated retinol complex for anti-aging.', ar: 'مركب ريتينول مغلف للتركيبات المضادة للشيخوخة.' }, category: 'raw-material', currentStock: 200, lowStockThreshold: 20, unit: 'kg', costPerUnit: 250, isActive: true },
    { sku: 'PK-GP-050', name: { en: 'Glass Pump Bottles 50ml', ar: 'زجاجات مضخة زجاجية 50 مل' }, description: { en: 'Frosted glass pump bottles, 50ml.', ar: 'زجاجات مضخة زجاجية مصنفرة بسعة 50 مل.' }, category: 'packaging', currentStock: 1000, lowStockThreshold: 100, unit: 'pcs', costPerUnit: 3.5, isActive: true },
    { sku: 'PK-AP-030', name: { en: 'Airless Pump 30ml', ar: 'مضخة بدون هواء 30 مل' }, description: { en: 'White airless pump containers, 30ml.', ar: 'عبوات مضخة بدون هواء بيضاء بسعة 30 مل.' }, category: 'packaging', currentStock: 800, lowStockThreshold: 80, unit: 'pcs', costPerUnit: 2.8, isActive: true },
  ]);

  // ══════════════════════════════════════════════
  //  14. PROMO CODES
  // ══════════════════════════════════════════════
  console.log('Creating promo codes...');
  const now = new Date();
  await PromoCode.create([
    { code: 'WELCOME10', type: 'percentage', value: 10, minOrder: 0, expiresAt: new Date(now.getFullYear() + 1, now.getMonth(), now.getDate()), usageLimit: 0, perUserLimit: 1, isActive: true },
    { code: 'FIRST20', type: 'percentage', value: 20, minOrder: 0, maxDiscount: 500, expiresAt: new Date(now.getFullYear(), now.getMonth() + 6, now.getDate()), usageLimit: 100, perUserLimit: 1, isActive: true },
    { code: 'BULK50', type: 'fixed', value: 50, minOrder: 5000, usageLimit: 0, perUserLimit: 0, isActive: true },
  ]);

  // ══════════════════════════════════════════════
  //  15. KNOWLEDGE ARTICLES
  // ══════════════════════════════════════════════
  console.log('Creating knowledge articles...');
  await KnowledgeArticle.create([
    { question: { en: 'What is the minimum order quantity?', ar: 'ما هو الحد الأدنى لكمية الطلب؟' }, answer: { en: 'Our MOQ for sample orders is 100 units. For bulk production, the standard MOQ is 1,000 units per SKU.', ar: 'الحد الأدنى لطلبات العينات هو 100 وحدة. للإنتاج بالجملة، 1,000 وحدة لكل SKU.' }, category: 'orders', keywords: ['moq', 'minimum order', 'quantity'], order: 1, enabled: true },
    { question: { en: 'What is the lead time for production?', ar: 'ما هي المدة الزمنية للإنتاج؟' }, answer: { en: 'Sample orders: 2-3 weeks. Bulk production: 4-6 weeks. Custom formulations may require additional 2-4 weeks.', ar: 'طلبات العينات: 2-3 أسابيع. الإنتاج بالجملة: 4-6 أسابيع.' }, category: 'production', keywords: ['lead time', 'production time', 'delivery', 'timeline'], order: 2, enabled: true },
    { question: { en: 'What certificates does KCC hold?', ar: 'ما هي الشهادات التي تحملها KCC؟' }, answer: { en: 'KCC holds ISO 22716 and GMP certification from the Saudi FDA (SFDA).', ar: 'تحمل KCC شهادة آيزو 22716 وشهادة GMP من SFDA.' }, category: 'quality', keywords: ['certificates', 'ISO', 'GMP', 'SFDA'], order: 3, enabled: true },
    { question: { en: 'What testing do products undergo?', ar: 'ما الاختبارات التي تخضع لها المنتجات؟' }, answer: { en: 'All products undergo stability, microbiological, and pH testing. Optional: dermatological and SPF testing.', ar: 'تخضع المنتجات لاختبار الثبات والميكروبيولوجي والحموضة.' }, category: 'quality', keywords: ['testing', 'stability', 'microbiological', 'COA'], order: 4, enabled: true },
    { question: { en: 'How does private label manufacturing work?', ar: 'كيف يعمل تصنيع العلامة الخاصة؟' }, answer: { en: 'You choose formulations or request custom ones. We handle production, filling, labeling, and packaging under your brand.', ar: 'تختار التركيبات أو تطلب مخصصة. نتولى الإنتاج والتعبئة والتوسيم بعلامتك.' }, category: 'services', keywords: ['private label', 'white label', 'own brand'], order: 5, enabled: true },
    { question: { en: 'What regulatory support do you provide?', ar: 'ما الدعم التنظيمي الذي تقدمونه؟' }, answer: { en: 'SFDA product registration, GCC notification, INCI ingredients lists, Arabic labeling compliance.', ar: 'تسجيل SFDA، إخطار دول الخليج، قوائم INCI، الامتثال للتوسيم العربي.' }, category: 'regulatory', keywords: ['regulatory', 'SFDA', 'registration', 'compliance'], order: 6, enabled: true },
    { question: { en: 'Do you offer shipping?', ar: 'هل تقدمون خدمات الشحن؟' }, answer: { en: 'Yes, local delivery within Saudi Arabia and international shipping to GCC and worldwide.', ar: 'نعم، توصيل محلي داخل السعودية وشحن دولي للخليج والعالم.' }, category: 'logistics', keywords: ['shipping', 'logistics', 'delivery', 'international'], order: 7, enabled: true },
    { question: { en: 'Are your products heat resistant?', ar: 'هل منتجاتكم مقاومة للحرارة؟' }, answer: { en: 'Yes, our heat-resistant formulations are tested for stability at up to 50 degrees Celsius.', ar: 'نعم، تركيباتنا المقاومة للحرارة مختبرة حتى 50 درجة مئوية.' }, category: 'production', keywords: ['heat resistant', 'temperature', 'Gulf', 'climate'], order: 8, enabled: true },
    { question: { en: 'What packaging options are available?', ar: 'ما خيارات التغليف المتاحة؟' }, answer: { en: 'Glass pump bottles, airless pumps, droppers, jars, tubes, sprays. Sizes from 15ml to 500ml.', ar: 'زجاجات مضخة، مضخات بدون هواء، قطارات، برطمانات، أنابيب. أحجام من 15 إلى 500 مل.' }, category: 'packaging', keywords: ['packaging', 'bottles', 'containers', 'sizes'], order: 9, enabled: true },
    { question: { en: 'What ingredients do you work with?', ar: 'ما المكونات التي تعملون بها؟' }, answer: { en: 'Hyaluronic acid, vitamin C, retinol, niacinamide, botanical extracts. Paraben-free, vegan options available.', ar: 'حمض الهيالورونيك، فيتامين سي، ريتينول، نياسيناميد. خيارات خالية من البارابين ونباتية.' }, category: 'formulation', keywords: ['ingredients', 'hyaluronic acid', 'vitamin C', 'retinol', 'natural'], order: 10, enabled: true },
    { question: { en: 'How is pricing determined?', ar: 'كيف يتم تحديد الأسعار؟' }, answer: { en: 'Based on formulation complexity, ingredients, packaging, quantity, and testing requirements.', ar: 'بناءً على تعقيد التركيبة والمكونات والتغليف والكمية ومتطلبات الاختبار.' }, category: 'pricing', keywords: ['pricing', 'cost', 'price', 'quotation'], order: 11, enabled: true },
    { question: { en: 'Can I order samples first?', ar: 'هل يمكنني طلب عينات أولاً؟' }, answer: { en: 'Yes! Sample orders start from 100 units to test before committing to bulk production.', ar: 'نعم! طلبات العينات تبدأ من 100 وحدة للاختبار قبل الإنتاج بالجملة.' }, category: 'orders', keywords: ['samples', 'sample order', 'trial', 'test'], order: 12, enabled: true },
    { question: { en: 'What quality control measures do you have?', ar: 'ما إجراءات مراقبة الجودة لديكم؟' }, answer: { en: 'Raw material inspection, in-process checks, final testing, batch documentation, in-house QC lab.', ar: 'فحص المواد الخام، فحوصات أثناء العملية، اختبار نهائي، توثيق الدفعات، مختبر جودة داخلي.' }, category: 'quality', keywords: ['quality control', 'QC', 'inspection', 'batch'], order: 13, enabled: true },
    { question: { en: 'Can you develop custom formulations?', ar: 'هل يمكنكم تطوير تركيبات مخصصة؟' }, answer: { en: 'Yes! Our R&D team creates unique formulations: concept development, prototyping, stability testing, and refinement.', ar: 'نعم! فريق البحث والتطوير ينشئ تركيبات فريدة: تطوير المفهوم، النماذج الأولية، اختبار الثبات.' }, category: 'formulation', keywords: ['custom formulation', 'R&D', 'develop', 'unique'], order: 14, enabled: true },
    { question: { en: 'What is the typical shelf life?', ar: 'ما مدة الصلاحية النموذجية؟' }, answer: { en: 'Most products: 24-36 months. All undergo accelerated stability testing.', ar: 'معظم المنتجات: 24-36 شهراً. تخضع جميعها لاختبار ثبات معجل.' }, category: 'production', keywords: ['shelf life', 'expiry', 'stability', 'storage'], order: 15, enabled: true },
    { question: { en: 'Do you export to other countries?', ar: 'هل تصدرون إلى دول أخرى؟' }, answer: { en: 'Yes, to GCC, MENA, and international markets with full export documentation.', ar: 'نعم، إلى دول الخليج والشرق الأوسط والأسواق الدولية مع وثائق التصدير الكاملة.' }, category: 'logistics', keywords: ['export', 'international', 'countries', 'GCC'], order: 16, enabled: true },
    { question: { en: 'What is GMP certification?', ar: 'ما هي شهادة GMP؟' }, answer: { en: 'Good Manufacturing Practice - a quality management system ensuring consistent production quality. Certified by SFDA.', ar: 'ممارسات التصنيع الجيد - نظام إدارة جودة يضمن جودة إنتاج متسقة. معتمد من SFDA.' }, category: 'quality', keywords: ['GMP', 'good manufacturing practice', 'certification'], order: 17, enabled: true },
    { question: { en: 'What does ISO 22716 mean?', ar: 'ماذا تعني آيزو 22716؟' }, answer: { en: 'International standard for cosmetics GMP covering production, control, storage, and shipment.', ar: 'المعيار الدولي لممارسات التصنيع الجيد لمستحضرات التجميل يشمل الإنتاج والمراقبة والتخزين والشحن.' }, category: 'quality', keywords: ['ISO', 'ISO 22716', 'standard', 'international'], order: 18, enabled: true },
    { question: { en: 'What are the Saudi cosmetic regulations?', ar: 'ما لوائح مستحضرات التجميل السعودية؟' }, answer: { en: 'Governed by SFDA. Products must be registered, comply with GSO standards, have Arabic labeling, and meet safety requirements.', ar: 'تخضع لـ SFDA. يجب تسجيل المنتجات والامتثال لمعايير التقييس الخليجية وتوفير توسيم عربي وتلبية متطلبات السلامة.' }, category: 'regulatory', keywords: ['Saudi regulations', 'SFDA', 'compliance', 'registration'], order: 19, enabled: true },
    { question: { en: 'Can you create custom packaging designs?', ar: 'هل يمكنكم إنشاء تصاميم تغليف مخصصة؟' }, answer: { en: 'Yes! Container selection, label design, box design, color matching, custom printing, and eco-friendly options.', ar: 'نعم! اختيار العبوات، تصميم الملصقات، تصميم الصناديق، مطابقة الألوان، والخيارات الصديقة للبيئة.' }, category: 'packaging', keywords: ['custom packaging', 'design', 'label', 'branding', 'eco-friendly'], order: 20, enabled: true },
  ]);

  // ══════════════════════════════════════════════
  //  16. PRODUCT VISUAL RULES
  // ══════════════════════════════════════════════
  console.log('Creating product visual rules...');
  await ProductVisualRule.create([
    {
      conditions: { productType: 'serum', texture: 'lightweight', containerType: 'dropper', freeFrom: ['parabens', 'sulfates'] },
      imageUrl: '/images/visuals/serum-dropper-clean.png',
      label: { en: 'Clean Serum in Dropper Bottle', ar: 'سيروم نظيف في زجاجة قطارة' },
      enabled: true,
    },
    {
      conditions: { productType: 'cream', texture: 'rich', containerType: 'jar', freeFrom: ['parabens'] },
      imageUrl: '/images/visuals/cream-jar-premium.png',
      label: { en: 'Premium Cream in Jar', ar: 'كريم فاخر في برطمان' },
      enabled: true,
    },
  ]);

  // ══════════════════════════════════════════════
  //  SAMPLE QUIZ — Brief Questions
  // ══════════════════════════════════════════════
  console.log('Creating Sample Quiz brief questions...');
  await BriefQuestion.create(briefQuestionsData.questions);
  console.log(`  Created ${briefQuestionsData.questions.length} brief questions.`);

  // ══════════════════════════════════════════════
  //  SAMPLE QUIZ — Spec Options Master
  // ══════════════════════════════════════════════
  console.log('Creating Sample Quiz spec options master...');
  await SpecOptionMaster.create(specOptionsData.specCategories);
  console.log(`  Created ${specOptionsData.specCategories.length} spec category masters.`);

  // ══════════════════════════════════════════════
  //  SAMPLE QUIZ — Default Product Configs
  // ══════════════════════════════════════════════
  console.log('Creating default product spec configs (all enabled, all options)...');
  const allProducts = getAllProducts().filter((p) => p.itemName !== '(no level-3 items)');

  // Build a default spec config for every level-3 product:
  // every spec category enabled, all options allowed,
  // sensible defaults for maxSelect — admin can refine per-product later
  const defaultSpecs = specOptionsData.specCategories.map((cat, idx) => ({
    specKey: cat.categoryKey,
    enabled: true,
    titleEn: cat.defaultTitleEn,
    titleAr: cat.defaultTitleAr,
    subtitleEn: cat.defaultSubtitleEn,
    subtitleAr: cat.defaultSubtitleAr,
    maxSelect:
      cat.categoryKey === 'oils-extracts' ? 8 :
      cat.categoryKey === 'actives' ? 5 :
      cat.categoryKey === 'fine-actives' ? 3 :
      cat.categoryKey === 'product-color' ? 1 :
      cat.categoryKey === 'product-packaging' ? 1 :
      cat.categoryKey === 'package-color' ? 1 :
      99,
    isRequired: ['product-color', 'product-packaging', 'package-color', 'fragrances'].includes(cat.categoryKey),
    sortOrder: idx,
    allowedOptions: cat.options.map((o: { value: string }) => o.value),
  }));

  const productConfigDocs = allProducts.map((p) => ({
    productKey: p.productKey,
    mainSlug: p.mainSlug,
    subSlug: p.subSlug,
    itemName: p.itemName,
    specs: defaultSpecs,
    active: true,
  }));

  // Insert in chunks to be Atlas-friendly
  const CHUNK = 50;
  for (let i = 0; i < productConfigDocs.length; i += CHUNK) {
    await ProductSpecConfig.insertMany(productConfigDocs.slice(i, i + CHUNK));
  }
  console.log(`  Created ${productConfigDocs.length} product spec configs (default = all enabled).`);

  console.log('');
  console.log('========================================');
  console.log('  Seed completed successfully!');
  console.log('========================================');
  console.log('');
  console.log('Created:');
  console.log('  - 2 Users (admin + customer)');
  console.log('  - 4 CMS Sections');
  console.log('  - 4 Services');
  console.log('  - 3 Testimonials');
  console.log('  - 2 Certificates');
  console.log('  - 1 Factory');
  console.log('  - 2 Portfolio Items');
  console.log('  - 2 News Posts');
  console.log('  - 5 FAQs');
  console.log('  - 1 Survey Template (7 steps)');
  console.log('  - 5 Inventory Items');
  console.log('  - 3 Promo Codes');
  console.log('  - 1 SEO Global Config');
  console.log('  - 3 SEO Pages');
  console.log('  - 20 Knowledge Articles');
  console.log('  - 2 Product Visual Rules');
  console.log('  - 12 Brief Quiz Questions');
  console.log('  - 7 Spec Option Master Categories');
  console.log('  - All products: default ProductSpecConfig (admin-editable)');
  console.log('');
  console.log('Admin login: admin@kcc.sa / Admin@123');
  console.log('Customer login: ahmed@test.com / Test@123');

  await mongoose.disconnect();
  console.log('Disconnected from MongoDB.');
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
