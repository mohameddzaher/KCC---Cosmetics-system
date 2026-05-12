import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import User from '@/models/User';
import CmsSection from '@/models/CmsSection';
import Service from '@/models/Service';
import Testimonial from '@/models/Testimonial';
import Certificate from '@/models/Certificate';
import Factory from '@/models/Factory';
import PortfolioItem from '@/models/PortfolioItem';
import NewsPost from '@/models/NewsPost';
import FAQ from '@/models/FAQ';
import SurveyTemplate from '@/models/SurveyTemplate';
import InventoryItem from '@/models/InventoryItem';
import PromoCode from '@/models/PromoCode';
import SeoGlobal from '@/models/SeoGlobal';
import SeoPage from '@/models/SeoPage';
import KnowledgeArticle from '@/models/KnowledgeArticle';
import ProductVisualRule from '@/models/ProductVisualRule';
import Order from '@/models/Order';
import Invoice from '@/models/Invoice';
import TeamMember from '@/models/TeamMember';

const SEED_KEY = 'kcc-seed-2024';

export async function GET(req: NextRequest) {
  const key = req.headers.get('x-seed-key');
  if (key !== SEED_KEY) {
    return NextResponse.json({ error: 'Forbidden: invalid seed key' }, { status: 403 });
  }

  try {
    await connectDB();

    // ── Drop existing collections ──
    const collections = [
      'users', 'cmssections', 'services', 'testimonials', 'certificates',
      'factories', 'portfolioitems', 'newsposts', 'faqs', 'surveytemplates',
      'inventoryitems', 'promocodes', 'seoglobals', 'seopages',
      'knowledgearticles', 'productvisualrules', 'orders', 'invoices', 'teammembers',
    ];

    for (const name of collections) {
      try {
        const { connection } = await import('mongoose');
        await connection.db!.collection(name).drop();
      } catch {
        // collection may not exist yet - ignore
      }
    }

    // ══════════════════════════════════════════════
    //  1. USERS
    // ══════════════════════════════════════════════
    const adminPassword = await hashPassword('Admin@123');
    const customerPassword = await hashPassword('Test@123');

    const createdUsers = await User.create([
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
        country: 'Saudi Arabia',
      },
      {
        name: 'Sara Al-Fahd',
        email: 'sara@test.com',
        password: customerPassword,
        role: 'CUSTOMER',
        company: 'PureGlow Cosmetics',
        referralCode: 'SARA5678',
        isActive: true,
        languagePref: 'ar',
        country: 'UAE',
      },
      {
        name: 'Khalid Nasser',
        email: 'khalid@test.com',
        password: customerPassword,
        role: 'CUSTOMER',
        company: 'NightRevive Labs',
        referralCode: 'KHLD9012',
        isActive: true,
        languagePref: 'en',
        country: 'Kuwait',
      },
      {
        name: 'Nora Hassan',
        email: 'nora@test.com',
        password: customerPassword,
        role: 'CUSTOMER',
        company: 'SunShield Arabia',
        referralCode: 'NORA3456',
        isActive: true,
        languagePref: 'en',
        country: 'Bahrain',
      },
      {
        name: 'Omar Youssef',
        email: 'omar@test.com',
        password: customerPassword,
        role: 'STAFF',
        company: 'KCC',
        referralCode: 'OMAR7890',
        isActive: true,
        languagePref: 'en',
      },
    ]);
    const customerIds = createdUsers.filter((u: { role: string }) => u.role === 'CUSTOMER').map((u: { _id: unknown }) => u._id);

    // ══════════════════════════════════════════════
    //  2. CMS SECTIONS
    // ══════════════════════════════════════════════
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
          en: {
            title: 'Our Services',
            subtitle: 'End-to-end cosmetics manufacturing solutions',
          },
          ar: {
            title: 'خدماتنا',
            subtitle: 'حلول تصنيع مستحضرات التجميل المتكاملة',
          },
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
      {
        type: 'vision2030',
        slug: 'vision-2030-home',
        order: 5,
        enabled: true,
        status: 'published',
        fields: {
          en: {
            badge: 'KCC x Saudi Vision 2030',
            title: 'Aligned With Vision 2030, Built for National Impact',
            subtitle: 'Innovation, local manufacturing, quality excellence, sustainability, and job creation.',
            description: 'KCC advances Vision 2030 through local manufacturing, innovation-led formulation, high quality standards, sustainable operations, and stronger Saudi workforce participation.',
          },
          ar: {
            badge: 'KCC × رؤية السعودية 2030',
            title: 'متوافقون مع رؤية 2030 ونقود أثراً وطنياً ملموساً',
            subtitle: 'ابتكار، تصنيع محلي، جودة عالية، استدامة، وتوليد وظائف نوعية.',
            description: 'تدعم KCC رؤية 2030 عبر التصنيع المحلي، والابتكار في التركيبات، ومعايير الجودة المرتفعة، والممارسات المستدامة، وتعزيز مساهمة الكفاءات السعودية.',
          },
        },
      },
    ]);

    // ══════════════════════════════════════════════
    //  3. SERVICES
    // ══════════════════════════════════════════════
    await Service.create([
      {
        title: {
          en: 'Private Label Manufacturing',
          ar: 'تصنيع العلامة الخاصة',
        },
        description: {
          en: 'Launch your own beauty brand with our full-service private label manufacturing. We handle formulation, production, packaging, and quality assurance so you can focus on building your brand.',
          ar: 'أطلق علامتك التجارية الخاصة بالجمال مع خدمات تصنيع العلامة الخاصة الشاملة. نتولى التركيب والإنتاج والتغليف وضمان الجودة حتى تتمكن من التركيز على بناء علامتك التجارية.',
        },
        icon: 'Factory',
        image: '/images/services/private-label.jpg',
        order: 1,
        enabled: true,
      },
      {
        title: {
          en: 'Custom Formulation',
          ar: 'التركيبات المخصصة',
        },
        description: {
          en: 'Our expert R&D team creates unique, innovative formulations tailored to your brand identity and target audience. From serums to moisturizers, we bring your product vision to reality.',
          ar: 'يقوم فريق البحث والتطوير الخبير لدينا بإنشاء تركيبات فريدة ومبتكرة مصممة خصيصاً لهوية علامتك التجارية وجمهورك المستهدف.',
        },
        icon: 'FlaskConical',
        image: '/images/services/custom-formulation.jpg',
        order: 2,
        enabled: true,
      },
      {
        title: {
          en: 'Quality Assurance & Testing',
          ar: 'ضمان الجودة والاختبار',
        },
        description: {
          en: 'Every product undergoes rigorous testing including stability, microbial, and dermatological assessments. Our GMP-certified processes ensure the highest standards of safety and efficacy.',
          ar: 'يخضع كل منتج لاختبارات صارمة تشمل اختبارات الثبات والميكروبيولوجيا والتقييمات الجلدية. تضمن عملياتنا المعتمدة بشهادة GMP أعلى معايير السلامة والفعالية.',
        },
        icon: 'ShieldCheck',
        image: '/images/services/quality-assurance.jpg',
        order: 3,
        enabled: true,
      },
      {
        title: {
          en: 'Regulatory & Compliance',
          ar: 'الشؤون التنظيمية والامتثال',
        },
        description: {
          en: 'Navigate complex regulations with confidence. We ensure full compliance with SFDA, GCC, and international cosmetic regulations including product registration and documentation.',
          ar: 'تعامل مع اللوائح المعقدة بثقة. نضمن الامتثال الكامل للهيئة العامة للغذاء والدواء ودول مجلس التعاون الخليجي واللوائح الدولية لمستحضرات التجميل.',
        },
        icon: 'FileCheck',
        image: '/images/services/regulatory.jpg',
        order: 4,
        enabled: true,
      },
    ]);

    // ══════════════════════════════════════════════
    //  4. TESTIMONIALS
    // ══════════════════════════════════════════════
    await Testimonial.create([
      {
        name: { en: 'Sara Al-Harbi', ar: 'سارة الحربي' },
        company: { en: 'Luxe Skin Co.', ar: 'لوكس سكن' },
        content: {
          en: 'KCC transformed our brand vision into reality. Their attention to detail and quality standards are unmatched. We launched our skincare line in record time thanks to their expertise.',
          ar: 'حولت KCC رؤية علامتنا التجارية إلى واقع. اهتمامهم بالتفاصيل ومعايير الجودة لا مثيل لها. أطلقنا خط العناية بالبشرة في وقت قياسي بفضل خبرتهم.',
        },
        avatar: '/images/testimonials/sara.jpg',
        rating: 5,
        order: 1,
        enabled: true,
      },
      {
        name: { en: 'Mohammed Al-Qahtani', ar: 'محمد القحطاني' },
        company: { en: 'Desert Glow', ar: 'ديزرت جلو' },
        content: {
          en: 'Working with KCC has been a game changer for our business. Their custom formulation team developed products that perfectly match our brand identity and the Saudi market demands.',
          ar: 'كان العمل مع KCC نقلة نوعية لأعمالنا. طور فريق التركيبات المخصصة منتجات تتناسب تماماً مع هوية علامتنا التجارية ومتطلبات السوق السعودي.',
        },
        avatar: '/images/testimonials/mohammed.jpg',
        rating: 5,
        order: 2,
        enabled: true,
      },
      {
        name: { en: 'Lina Fadel', ar: 'لينا فاضل' },
        company: { en: 'Pure Essence Beauty', ar: 'بيور إيسنس بيوتي' },
        content: {
          en: 'The quality of products from KCC exceeds expectations every time. Their regulatory team made the SFDA registration process seamless. Highly recommended for any beauty entrepreneur.',
          ar: 'جودة المنتجات من KCC تتجاوز التوقعات في كل مرة. جعل فريقهم التنظيمي عملية تسجيل الهيئة العامة للغذاء والدواء سلسة. أنصح بشدة لأي رائد أعمال في مجال الجمال.',
        },
        avatar: '/images/testimonials/lina.jpg',
        rating: 5,
        order: 3,
        enabled: true,
      },
    ]);

    // ══════════════════════════════════════════════
    //  5. CERTIFICATES
    // ══════════════════════════════════════════════
    await Certificate.create([
      {
        title: { en: 'ISO 45001:2018 OHS', ar: 'آيزو 45001:2018 - نظام إدارة السلامة والصحة المهنية' },
        description: {
          en: 'Occupational Health & Safety Management System. Demonstrates our commitment to providing a safe and healthy workplace, preventing work-related injuries, and continually improving OHS performance.',
          ar: 'نظام إدارة السلامة والصحة المهنية. يُظهر التزامنا بتوفير بيئة عمل آمنة وصحية ومنع الإصابات المرتبطة بالعمل والتحسين المستمر لأداء السلامة والصحة المهنية.',
        },
        imageUrl: '/images/certificates/iso-45001.png',
        issuer: { en: 'International Organization for Standardization', ar: 'المنظمة الدولية للمعايير' },
        issuedDate: new Date('2023-01-15'),
        order: 1,
        enabled: true,
      },
      {
        title: { en: 'ISO 22000:2018 FSSC', ar: 'آيزو 22000:2018 - نظام إدارة سلامة الغذاء' },
        description: {
          en: 'Food Safety Management System (FSSC). Ensures our manufacturing processes comply with the highest food safety standards, including HACCP principles, applicable to cosmetics that contact skin and oral products.',
          ar: 'نظام إدارة سلامة الغذاء (FSSC). يضمن أن عمليات التصنيع لدينا تتوافق مع أعلى معايير سلامة الغذاء بما في ذلك مبادئ HACCP المطبقة على مستحضرات التجميل التي تلامس الجلد ومنتجات العناية بالفم.',
        },
        imageUrl: '/images/certificates/iso-22000.png',
        issuer: { en: 'International Organization for Standardization', ar: 'المنظمة الدولية للمعايير' },
        issuedDate: new Date('2023-06-20'),
        order: 2,
        enabled: true,
      },
      {
        title: { en: 'ISO 9001:2015 QMS', ar: 'آيزو 9001:2015 - نظام إدارة الجودة' },
        description: {
          en: 'Quality Management System. Globally recognized certification demonstrating our systematic approach to quality management, ensuring consistent product quality, customer satisfaction, and continuous improvement.',
          ar: 'نظام إدارة الجودة. شهادة معترف بها عالمياً تُظهر نهجنا المنظم لإدارة الجودة مما يضمن جودة منتج متسقة ورضا العملاء والتحسين المستمر.',
        },
        imageUrl: '/images/certificates/iso-9001.png',
        issuer: { en: 'International Organization for Standardization', ar: 'المنظمة الدولية للمعايير' },
        issuedDate: new Date('2023-03-10'),
        order: 3,
        enabled: true,
      },
      {
        title: { en: 'ISO 14001:2015 EHS', ar: 'آيزو 14001:2015 - نظام الإدارة البيئية' },
        description: {
          en: 'Environmental Management System. Demonstrates our structured approach to minimizing environmental impact, managing waste responsibly, reducing carbon footprint, and continually improving environmental performance.',
          ar: 'نظام الإدارة البيئية. يُظهر نهجنا المنظم لتقليل التأثير البيئي وإدارة النفايات بمسؤولية وتقليل البصمة الكربونية والتحسين المستمر للأداء البيئي.',
        },
        imageUrl: '/images/certificates/iso-14001.png',
        issuer: { en: 'International Organization for Standardization', ar: 'المنظمة الدولية للمعايير' },
        issuedDate: new Date('2023-09-05'),
        order: 4,
        enabled: true,
      },
    ]);

    // ══════════════════════════════════════════════
    //  5b. TEAM MEMBERS
    // ══════════════════════════════════════════════
    await TeamMember.create([
      {
        name: 'Dr. Mohamed Salah',
        role: { en: 'CEO & Founder', ar: 'الرئيس التنفيذي والمؤسس' },
        image: '/images/mohamedsalah.jpeg',
        section: 'leadership',
        order: 1,
        enabled: true,
      },
      {
        name: 'Heba Essam',
        role: { en: 'Commercial Manager', ar: 'المدير التجاري' },
        image: '/images/heba.jpg',
        section: 'team',
        order: 1,
        enabled: true,
      },
      {
        name: 'Rawan Ashraf',
        role: { en: 'Marketing Strategist', ar: 'استراتيجية التسويق' },
        image: '/images/rawan.jpg',
        section: 'team',
        order: 2,
        enabled: true,
      },
      {
        name: 'Fadwa Alaa',
        role: { en: 'Marketing Analyst', ar: 'محللة التسويق' },
        image: '/images/fadwa.jpg',
        section: 'team',
        order: 3,
        enabled: true,
      },
      {
        name: 'Youssra El-Gendy',
        role: { en: 'Senior Key Account Manager', ar: 'مديرة حسابات رئيسية أولى' },
        image: '/images/youssra.jpg',
        section: 'team',
        order: 4,
        enabled: true,
      },
      {
        name: 'Marianne Georges',
        role: { en: 'Project Manager', ar: 'مديرة المشاريع' },
        image: '/images/marianne.jpg',
        section: 'team',
        order: 5,
        enabled: true,
      },
      {
        name: 'Maryam Zarie',
        role: { en: 'Registration and Legal Affairs Specialist', ar: 'أخصائية التسجيل والشؤون القانونية' },
        image: '/images/maryam.jpg',
        section: 'team',
        order: 6,
        enabled: true,
      },
    ]);

    // ══════════════════════════════════════════════
    //  6. FACTORY
    // ══════════════════════════════════════════════
    await Factory.create([
      {
        name: { en: 'Riyadh Plant', ar: 'مصنع الرياض' },
        description: {
          en: 'Our state-of-the-art manufacturing facility in Riyadh features advanced production lines, clean rooms, and quality control labs equipped with the latest technology.',
          ar: 'يتميز مصنعنا الحديث في الرياض بخطوط إنتاج متقدمة وغرف نظيفة ومختبرات مراقبة الجودة المجهزة بأحدث التقنيات.',
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
        order: 1,
        enabled: true,
      },
    ]);

    // ══════════════════════════════════════════════
    //  7. PORTFOLIO ITEMS
    // ══════════════════════════════════════════════
    await PortfolioItem.create([
      {
        title: { en: 'Luxe Hydrating Serum Collection', ar: 'مجموعة سيروم الترطيب الفاخرة' },
        description: {
          en: 'A premium 5-product hydrating serum line developed for Luxe Skin Co., featuring hyaluronic acid and natural botanical extracts for the Saudi climate.',
          ar: 'خط سيروم ترطيب فاخر من 5 منتجات تم تطويره لشركة لوكس سكن، يتميز بحمض الهيالورونيك ومستخلصات نباتية طبيعية مناسبة للمناخ السعودي.',
        },
        category: { en: 'Skincare', ar: 'العناية بالبشرة' },
        imageUrl: '/images/portfolio/luxe-serum.jpg',
        client: 'Luxe Skin Co.',
        slug: 'luxe-hydrating-serum-collection',
        tags: ['skincare', 'serum', 'hydrating', 'private-label'],
        enabled: true,
        order: 1,
      },
      {
        title: { en: 'Desert Rose Makeup Line', ar: 'خط مكياج وردة الصحراء' },
        description: {
          en: 'Complete makeup line including foundation, concealer, and lip products designed specifically for Middle Eastern skin tones with long-wear, heat-resistant formulas.',
          ar: 'خط مكياج كامل يشمل كريم الأساس والكونسيلر ومنتجات الشفاه مصمم خصيصاً لألوان البشرة الشرق أوسطية بتركيبات مقاومة للحرارة وطويلة الأمد.',
        },
        category: { en: 'Makeup', ar: 'المكياج' },
        imageUrl: '/images/portfolio/desert-rose.jpg',
        client: 'Desert Glow',
        slug: 'desert-rose-makeup-line',
        tags: ['makeup', 'foundation', 'heat-resistant', 'custom-formulation'],
        enabled: true,
        order: 2,
      },
    ]);

    // ══════════════════════════════════════════════
    //  8. NEWS POSTS
    // ══════════════════════════════════════════════
    await NewsPost.create([
      {
        title: {
          en: 'KCC Achieves ISO 22716 Recertification for 2024',
          ar: 'KCC تحصل على إعادة اعتماد آيزو 22716 لعام 2024',
        },
        content: {
          en: 'We are proud to announce that KCC has successfully passed the ISO 22716 audit and achieved recertification for 2024. This internationally recognized standard for cosmetics Good Manufacturing Practices (GMP) validates our commitment to quality, safety, and consistency in every product we manufacture. Our Riyadh facility met all requirements with zero non-conformities, reflecting the dedication of our quality assurance team.',
          ar: 'يسعدنا أن نعلن أن KCC قد اجتازت بنجاح تدقيق آيزو 22716 وحصلت على إعادة الاعتماد لعام 2024. يؤكد هذا المعيار المعترف به دولياً لممارسات التصنيع الجيد لمستحضرات التجميل التزامنا بالجودة والسلامة والاتساق في كل منتج نصنعه.',
        },
        excerpt: {
          en: 'KCC successfully passes ISO 22716 audit with zero non-conformities.',
          ar: 'KCC تجتاز تدقيق آيزو 22716 بنجاح بدون أي ملاحظات.',
        },
        slug: 'kcc-iso-22716-recertification-2024',
        imageUrl: '/images/news/iso-recert.jpg',
        author: 'KCC Admin',
        tags: ['ISO', 'certification', 'quality', 'GMP'],
        status: 'published',
        publishedAt: new Date('2024-03-15'),
      },
      {
        title: {
          en: 'New Heat-Resistant Formulation Line for Gulf Markets',
          ar: 'خط تركيبات جديد مقاوم للحرارة لأسواق الخليج',
        },
        content: {
          en: 'KCC is excited to introduce our new line of heat-resistant cosmetic formulations specifically designed for the Gulf climate. After two years of R&D, our team has developed proprietary technology that ensures product stability at temperatures up to 50 degrees Celsius. This breakthrough addresses one of the biggest challenges faced by beauty brands in the Middle East region, where extreme heat can compromise product quality and shelf life.',
          ar: 'يسعد KCC أن تقدم خطنا الجديد من تركيبات مستحضرات التجميل المقاومة للحرارة المصممة خصيصاً لمناخ الخليج. بعد عامين من البحث والتطوير، طور فريقنا تقنية حصرية تضمن ثبات المنتج في درجات حرارة تصل إلى 50 درجة مئوية.',
        },
        excerpt: {
          en: 'Introducing proprietary heat-resistant formulations designed for Gulf climate conditions.',
          ar: 'نقدم تركيبات حصرية مقاومة للحرارة مصممة لظروف مناخ الخليج.',
        },
        slug: 'heat-resistant-formulation-gulf-markets',
        imageUrl: '/images/news/heat-resistant.jpg',
        author: 'KCC Admin',
        tags: ['formulation', 'heat-resistant', 'Gulf', 'innovation'],
        status: 'published',
        publishedAt: new Date('2024-06-01'),
      },
    ]);

    // ══════════════════════════════════════════════
    //  9. FAQS
    // ══════════════════════════════════════════════
    await FAQ.create([
      {
        question: { en: 'What is the minimum order quantity (MOQ)?', ar: 'ما هو الحد الأدنى لكمية الطلب؟' },
        answer: {
          en: 'Our MOQ for sample orders starts at 100 units. For bulk production, the MOQ is typically 1,000 units per SKU, but this can vary depending on the product type and packaging requirements.',
          ar: 'يبدأ الحد الأدنى لكمية الطلب لطلبات العينات من 100 وحدة. للإنتاج بالجملة، الحد الأدنى عادة 1,000 وحدة لكل SKU، لكن هذا قد يختلف حسب نوع المنتج ومتطلبات التغليف.',
        },
        category: 'general',
        order: 1,
        enabled: true,
      },
      {
        question: { en: 'How long does the production process take?', ar: 'كم تستغرق عملية الإنتاج؟' },
        answer: {
          en: 'Standard production lead time is 4-6 weeks from order confirmation. Sample orders are typically completed within 2-3 weeks. Complex custom formulations may require additional time for R&D and testing.',
          ar: 'المدة الزمنية القياسية للإنتاج هي 4-6 أسابيع من تأكيد الطلب. تكتمل طلبات العينات عادة في غضون 2-3 أسابيع. قد تتطلب التركيبات المخصصة المعقدة وقتاً إضافياً للبحث والاختبار.',
        },
        category: 'production',
        order: 2,
        enabled: true,
      },
      {
        question: { en: 'Do you handle SFDA registration?', ar: 'هل تتولون تسجيل الهيئة العامة للغذاء والدواء؟' },
        answer: {
          en: 'Yes, we provide full regulatory support including SFDA product registration, documentation preparation, and compliance consulting for the Saudi and GCC markets.',
          ar: 'نعم، نقدم دعماً تنظيمياً كاملاً بما في ذلك تسجيل المنتجات لدى الهيئة العامة للغذاء والدواء وإعداد المستندات واستشارات الامتثال للأسواق السعودية والخليجية.',
        },
        category: 'regulatory',
        order: 3,
        enabled: true,
      },
      {
        question: { en: 'What certifications does your facility hold?', ar: 'ما هي الشهادات التي يحملها مصنعكم؟' },
        answer: {
          en: 'Our facility is ISO 22716 certified and holds GMP certification from the Saudi FDA. We also adhere to international standards for environmental management and occupational health and safety.',
          ar: 'مصنعنا حاصل على شهادة آيزو 22716 وشهادة GMP من الهيئة العامة للغذاء والدواء السعودية. كما نلتزم بالمعايير الدولية للإدارة البيئية والصحة والسلامة المهنية.',
        },
        category: 'quality',
        order: 4,
        enabled: true,
      },
      {
        question: { en: 'Can I customize the packaging and labeling?', ar: 'هل يمكنني تخصيص التغليف والتوسيم؟' },
        answer: {
          en: 'Absolutely! We offer fully customizable packaging solutions including container selection, label design support, box design, and custom printing. Our design team can help create packaging that aligns with your brand identity.',
          ar: 'بالتأكيد! نقدم حلول تغليف قابلة للتخصيص بالكامل تشمل اختيار العبوات ودعم تصميم الملصقات وتصميم الصناديق والطباعة المخصصة. يمكن لفريق التصميم لدينا المساعدة في إنشاء تغليف يتماشى مع هوية علامتك التجارية.',
        },
        category: 'packaging',
        order: 5,
        enabled: true,
      },
    ]);

    // ══════════════════════════════════════════════
    //  10. SEO GLOBAL CONFIG
    // ══════════════════════════════════════════════
    await SeoGlobal.create({
      titleTemplate: {
        en: '%s | KCC - Cosmetics Manufacturing',
        ar: '%s | KCC - تصنيع مستحضرات التجميل',
      },
      defaultDescription: {
        en: 'KCC is Saudi Arabia\'s leading cosmetics contract manufacturer offering private label, custom formulation, and GMP-certified production for beauty brands.',
        ar: 'KCC هي الشركة الرائدة في تصنيع مستحضرات التجميل بالعقود في المملكة العربية السعودية وتقدم خدمات العلامة الخاصة والتركيبات المخصصة والإنتاج المعتمد بشهادة GMP.',
      },
      defaultOgImage: '/images/og-default.jpg',
      twitterCard: 'summary_large_image',
      canonicalBase: 'https://kcc.sa',
      additionalMeta: {
        'google-site-verification': '',
      },
    });

    // ══════════════════════════════════════════════
    //  11. SEO PAGES
    // ══════════════════════════════════════════════
    await SeoPage.create([
      {
        page: 'home',
        title: { en: 'Home', ar: 'الرئيسية' },
        description: {
          en: 'KCC - Your trusted partner for private label cosmetics manufacturing in Saudi Arabia. ISO 22716 & GMP certified facility.',
          ar: 'KCC - شريكك الموثوق لتصنيع مستحضرات التجميل بالعلامة الخاصة في المملكة العربية السعودية. منشأة معتمدة بشهادات آيزو 22716 و GMP.',
        },
        keywords: {
          en: 'cosmetics manufacturing, private label, Saudi Arabia, GMP, ISO 22716, beauty manufacturing',
          ar: 'تصنيع مستحضرات التجميل، العلامة الخاصة، المملكة العربية السعودية، GMP، آيزو 22716، تصنيع الجمال',
        },
        ogTitle: { en: 'KCC - Cosmetics Manufacturing', ar: 'KCC - تصنيع مستحضرات التجميل' },
        ogDescription: {
          en: 'Saudi Arabia\'s leading cosmetics contract manufacturer.',
          ar: 'الشركة الرائدة في تصنيع مستحضرات التجميل بالعقود في السعودية.',
        },
        ogImage: '/images/og-home.jpg',
        canonical: 'https://kcc.sa',
        robots: 'index,follow',
      },
      {
        page: 'about',
        title: { en: 'About Us', ar: 'من نحن' },
        description: {
          en: 'Learn about KCC\'s history, mission, and state-of-the-art cosmetics manufacturing facility in Riyadh, Saudi Arabia.',
          ar: 'تعرف على تاريخ ورسالة KCC ومنشأتها الحديثة لتصنيع مستحضرات التجميل في الرياض.',
        },
        keywords: {
          en: 'about KCC, cosmetics manufacturer, Riyadh factory, beauty manufacturing company',
          ar: 'عن KCC، مصنع مستحضرات تجميل، مصنع الرياض، شركة تصنيع مستحضرات تجميل',
        },
        ogTitle: { en: 'About KCC', ar: 'عن KCC' },
        ogDescription: {
          en: 'Discover the story behind Saudi Arabia\'s leading cosmetics manufacturer.',
          ar: 'اكتشف القصة وراء الشركة الرائدة في تصنيع مستحضرات التجميل في السعودية.',
        },
        ogImage: '/images/og-about.jpg',
        canonical: 'https://kcc.sa/about',
        robots: 'index,follow',
      },
      {
        page: 'contact',
        title: { en: 'Contact Us', ar: 'اتصل بنا' },
        description: {
          en: 'Get in touch with KCC for cosmetics manufacturing inquiries, quotations, and partnership opportunities.',
          ar: 'تواصل مع KCC لاستفسارات تصنيع مستحضرات التجميل وعروض الأسعار وفرص الشراكة.',
        },
        keywords: {
          en: 'contact KCC, cosmetics manufacturing inquiry, get a quote, partnership',
          ar: 'تواصل مع KCC، استفسار تصنيع مستحضرات تجميل، عرض أسعار، شراكة',
        },
        ogTitle: { en: 'Contact KCC', ar: 'تواصل مع KCC' },
        ogDescription: {
          en: 'Reach out to start your cosmetics manufacturing journey with KCC.',
          ar: 'تواصل معنا لبدء رحلة تصنيع مستحضرات التجميل مع KCC.',
        },
        ogImage: '/images/og-contact.jpg',
        canonical: 'https://kcc.sa/contact',
        robots: 'index,follow',
      },
    ]);

    // ══════════════════════════════════════════════
    //  12. SURVEY TEMPLATE
    // ══════════════════════════════════════════════
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
            {
              key: 'productType',
              label: { en: 'Product Type', ar: 'نوع المنتج' },
              type: 'select',
              required: true,
              options: [
                { value: 'serum', label: { en: 'Serum', ar: 'سيروم' } },
                { value: 'cream', label: { en: 'Cream / Moisturizer', ar: 'كريم / مرطب' } },
                { value: 'cleanser', label: { en: 'Cleanser', ar: 'غسول' } },
                { value: 'toner', label: { en: 'Toner', ar: 'تونر' } },
                { value: 'mask', label: { en: 'Face Mask', ar: 'ماسك للوجه' } },
                { value: 'sunscreen', label: { en: 'Sunscreen', ar: 'واقي شمس' } },
                { value: 'shampoo', label: { en: 'Shampoo', ar: 'شامبو' } },
                { value: 'conditioner', label: { en: 'Conditioner', ar: 'بلسم' } },
                { value: 'bodyLotion', label: { en: 'Body Lotion', ar: 'لوشن للجسم' } },
                { value: 'lipProduct', label: { en: 'Lip Product', ar: 'منتج للشفاه' } },
              ],
            },
            {
              key: 'skinType',
              label: { en: 'Target Skin Type', ar: 'نوع البشرة المستهدف' },
              type: 'select',
              required: true,
              options: [
                { value: 'all', label: { en: 'All Skin Types', ar: 'جميع أنواع البشرة' } },
                { value: 'oily', label: { en: 'Oily', ar: 'دهنية' } },
                { value: 'dry', label: { en: 'Dry', ar: 'جافة' } },
                { value: 'combination', label: { en: 'Combination', ar: 'مختلطة' } },
                { value: 'sensitive', label: { en: 'Sensitive', ar: 'حساسة' } },
              ],
            },
            {
              key: 'primaryGoal',
              label: { en: 'Primary Goal', ar: 'الهدف الرئيسي' },
              type: 'select',
              required: true,
              options: [
                { value: 'hydration', label: { en: 'Hydration', ar: 'ترطيب' } },
                { value: 'antiAging', label: { en: 'Anti-Aging', ar: 'مكافحة الشيخوخة' } },
                { value: 'brightening', label: { en: 'Brightening', ar: 'تفتيح' } },
                { value: 'acne', label: { en: 'Acne Control', ar: 'علاج حب الشباب' } },
                { value: 'sunProtection', label: { en: 'Sun Protection', ar: 'حماية من الشمس' } },
                { value: 'cleansing', label: { en: 'Deep Cleansing', ar: 'تنظيف عميق' } },
              ],
            },
            {
              key: 'texturePreference',
              label: { en: 'Texture Preference', ar: 'تفضيل القوام' },
              type: 'select',
              required: false,
              options: [
                { value: 'lightweight', label: { en: 'Lightweight / Gel', ar: 'خفيف / جل' } },
                { value: 'rich', label: { en: 'Rich / Creamy', ar: 'غني / كريمي' } },
                { value: 'oil', label: { en: 'Oil-Based', ar: 'زيتي' } },
                { value: 'foam', label: { en: 'Foam', ar: 'رغوي' } },
                { value: 'matte', label: { en: 'Matte Finish', ar: 'لمسة مات' } },
              ],
            },
          ],
        },
        {
          stepNumber: 2,
          title: { en: 'Ingredients', ar: 'المكونات' },
          description: { en: 'Specify ingredient preferences and restrictions.', ar: 'حدد تفضيلات المكونات والقيود.' },
          questions: [
            {
              key: 'mustHaveIngredients',
              label: { en: 'Must-Have Ingredients', ar: 'مكونات ضرورية' },
              type: 'multiselect',
              required: false,
              options: [
                { value: 'hyaluronicAcid', label: { en: 'Hyaluronic Acid', ar: 'حمض الهيالورونيك' } },
                { value: 'vitaminC', label: { en: 'Vitamin C', ar: 'فيتامين سي' } },
                { value: 'retinol', label: { en: 'Retinol', ar: 'ريتينول' } },
                { value: 'niacinamide', label: { en: 'Niacinamide', ar: 'نياسيناميد' } },
                { value: 'aloVera', label: { en: 'Aloe Vera', ar: 'الصبار' } },
                { value: 'sheaButter', label: { en: 'Shea Butter', ar: 'زبدة الشيا' } },
                { value: 'teaTree', label: { en: 'Tea Tree Oil', ar: 'زيت شجرة الشاي' } },
                { value: 'collagen', label: { en: 'Collagen', ar: 'كولاجين' } },
              ],
            },
            {
              key: 'mustAvoidIngredients',
              label: { en: 'Must-Avoid Ingredients', ar: 'مكونات يجب تجنبها' },
              type: 'multiselect',
              required: false,
              options: [
                { value: 'parabens', label: { en: 'Parabens', ar: 'البارابين' } },
                { value: 'sulfates', label: { en: 'Sulfates (SLS/SLES)', ar: 'الكبريتات' } },
                { value: 'silicone', label: { en: 'Silicone', ar: 'سيليكون' } },
                { value: 'alcohol', label: { en: 'Alcohol', ar: 'كحول' } },
                { value: 'fragrance', label: { en: 'Synthetic Fragrance', ar: 'عطر صناعي' } },
                { value: 'mineralOil', label: { en: 'Mineral Oil', ar: 'زيت معدني' } },
              ],
            },
            {
              key: 'parabenFree',
              label: { en: 'Paraben Free', ar: 'خالي من البارابين' },
              type: 'toggle',
              required: false,
            },
            {
              key: 'sulfateFree',
              label: { en: 'Sulfate Free', ar: 'خالي من الكبريتات' },
              type: 'toggle',
              required: false,
            },
            {
              key: 'siliconeFree',
              label: { en: 'Silicone Free', ar: 'خالي من السيليكون' },
              type: 'toggle',
              required: false,
            },
            {
              key: 'fragranceFree',
              label: { en: 'Fragrance Free', ar: 'خالي من العطور' },
              type: 'toggle',
              required: false,
            },
            {
              key: 'natural',
              label: { en: 'Natural / Organic', ar: 'طبيعي / عضوي' },
              type: 'toggle',
              required: false,
            },
            {
              key: 'vegan',
              label: { en: 'Vegan', ar: 'نباتي' },
              type: 'toggle',
              required: false,
            },
            {
              key: 'crueltyFree',
              label: { en: 'Cruelty Free', ar: 'لم يُختبر على الحيوانات' },
              type: 'toggle',
              required: false,
            },
          ],
        },
        {
          stepNumber: 3,
          title: { en: 'Quality & Testing', ar: 'الجودة والاختبار' },
          description: { en: 'Select the quality tests and certifications you require.', ar: 'اختر اختبارات الجودة والشهادات المطلوبة.' },
          questions: [
            {
              key: 'stabilityTest',
              label: { en: 'Stability Testing', ar: 'اختبار الثبات' },
              type: 'toggle',
              required: false,
            },
            {
              key: 'microbiologicalTest',
              label: { en: 'Microbiological Testing', ar: 'الاختبار الميكروبيولوجي' },
              type: 'toggle',
              required: false,
            },
            {
              key: 'dermatologicallyTested',
              label: { en: 'Dermatologically Tested', ar: 'مختبر جلدياً' },
              type: 'toggle',
              required: false,
            },
            {
              key: 'coaCertificate',
              label: { en: 'Certificate of Analysis (COA)', ar: 'شهادة تحليل (COA)' },
              type: 'toggle',
              required: false,
            },
            {
              key: 'gmpCertificate',
              label: { en: 'GMP Certificate', ar: 'شهادة GMP' },
              type: 'toggle',
              required: false,
            },
          ],
        },
        {
          stepNumber: 4,
          title: { en: 'Legal & Regulatory', ar: 'القانوني والتنظيمي' },
          description: { en: 'Provide regulatory and compliance details.', ar: 'قدم تفاصيل التنظيم والامتثال.' },
          questions: [
            {
              key: 'targetCountry',
              label: { en: 'Target Country / Region', ar: 'الدولة / المنطقة المستهدفة' },
              type: 'select',
              required: true,
              options: [
                { value: 'sa', label: { en: 'Saudi Arabia', ar: 'المملكة العربية السعودية' } },
                { value: 'uae', label: { en: 'UAE', ar: 'الإمارات' } },
                { value: 'gcc', label: { en: 'GCC Region', ar: 'دول الخليج' } },
                { value: 'mena', label: { en: 'MENA Region', ar: 'منطقة الشرق الأوسط وشمال أفريقيا' } },
                { value: 'eu', label: { en: 'European Union', ar: 'الاتحاد الأوروبي' } },
                { value: 'us', label: { en: 'United States', ar: 'الولايات المتحدة' } },
                { value: 'international', label: { en: 'International', ar: 'دولي' } },
              ],
            },
            {
              key: 'officialRegistration',
              label: { en: 'Need Official Product Registration (SFDA)', ar: 'تحتاج تسجيل رسمي للمنتج (SFDA)' },
              type: 'toggle',
              required: false,
            },
            {
              key: 'ingredientsListFormat',
              label: { en: 'Ingredients List Format', ar: 'صيغة قائمة المكونات' },
              type: 'select',
              required: false,
              options: [
                { value: 'inci', label: { en: 'INCI (International)', ar: 'INCI (دولي)' } },
                { value: 'arabic', label: { en: 'Arabic Translation', ar: 'ترجمة عربية' } },
                { value: 'both', label: { en: 'Both INCI + Arabic', ar: 'INCI + عربي معاً' } },
              ],
            },
            {
              key: 'finalProductName',
              label: { en: 'Final Product Name (if decided)', ar: 'اسم المنتج النهائي (إن وُجد)' },
              type: 'text',
              required: false,
              placeholder: { en: 'e.g., Glow Vitamin C Serum', ar: 'مثال: سيروم فيتامين سي جلو' },
            },
          ],
        },
        {
          stepNumber: 5,
          title: { en: 'Production & Technical', ar: 'الإنتاج والتقنيات' },
          description: { en: 'Technical specifications and production requirements.', ar: 'المواصفات التقنية ومتطلبات الإنتاج.' },
          questions: [
            {
              key: 'shelfLife',
              label: { en: 'Desired Shelf Life', ar: 'مدة الصلاحية المطلوبة' },
              type: 'select',
              required: false,
              options: [
                { value: '12', label: { en: '12 Months', ar: '12 شهر' } },
                { value: '18', label: { en: '18 Months', ar: '18 شهر' } },
                { value: '24', label: { en: '24 Months', ar: '24 شهر' } },
                { value: '36', label: { en: '36 Months', ar: '36 شهر' } },
              ],
            },
            {
              key: 'storageConditions',
              label: { en: 'Storage Conditions', ar: 'ظروف التخزين' },
              type: 'select',
              required: false,
              options: [
                { value: 'roomTemp', label: { en: 'Room Temperature', ar: 'درجة حرارة الغرفة' } },
                { value: 'cool', label: { en: 'Cool & Dry Place', ar: 'مكان بارد وجاف' } },
                { value: 'refrigerated', label: { en: 'Refrigerated', ar: 'مبرد' } },
              ],
            },
            {
              key: 'gulfHeatResistant',
              label: { en: 'Gulf Heat-Resistant Formula', ar: 'تركيبة مقاومة لحرارة الخليج' },
              type: 'toggle',
              required: false,
            },
            {
              key: 'batchTracking',
              label: { en: 'Batch Tracking Required', ar: 'تتبع الدفعة مطلوب' },
              type: 'toggle',
              required: false,
            },
          ],
        },
        {
          stepNumber: 6,
          title: { en: 'Packaging', ar: 'التغليف' },
          description: { en: 'Choose your packaging preferences.', ar: 'اختر تفضيلات التغليف.' },
          questions: [
            {
              key: 'size',
              label: { en: 'Product Size', ar: 'حجم المنتج' },
              type: 'select',
              required: true,
              options: [
                { value: '15ml', label: { en: '15 ml', ar: '15 مل' } },
                { value: '30ml', label: { en: '30 ml', ar: '30 مل' } },
                { value: '50ml', label: { en: '50 ml', ar: '50 مل' } },
                { value: '100ml', label: { en: '100 ml', ar: '100 مل' } },
                { value: '200ml', label: { en: '200 ml', ar: '200 مل' } },
                { value: '250ml', label: { en: '250 ml', ar: '250 مل' } },
                { value: '500ml', label: { en: '500 ml', ar: '500 مل' } },
              ],
            },
            {
              key: 'containerType',
              label: { en: 'Container Type', ar: 'نوع العبوة' },
              type: 'select',
              required: true,
              options: [
                { value: 'glassPump', label: { en: 'Glass Pump Bottle', ar: 'زجاجة مضخة زجاجية' } },
                { value: 'airlessPump', label: { en: 'Airless Pump', ar: 'مضخة بدون هواء' } },
                { value: 'dropper', label: { en: 'Dropper Bottle', ar: 'زجاجة قطارة' } },
                { value: 'jar', label: { en: 'Jar', ar: 'برطمان' } },
                { value: 'tube', label: { en: 'Tube', ar: 'أنبوب' } },
                { value: 'spray', label: { en: 'Spray Bottle', ar: 'زجاجة رذاذ' } },
              ],
            },
          ],
        },
        {
          stepNumber: 7,
          title: { en: 'Brand Vision', ar: 'رؤية العلامة التجارية' },
          description: { en: 'Share your brand story and vision for this product.', ar: 'شاركنا قصة علامتك التجارية ورؤيتك لهذا المنتج.' },
          questions: [
            {
              key: 'brandVision',
              label: { en: 'Brand Vision & Notes', ar: 'رؤية العلامة التجارية وملاحظات' },
              type: 'textarea',
              required: false,
              placeholder: {
                en: 'Describe your brand identity, target audience, inspiration, and any specific requirements...',
                ar: 'صف هوية علامتك التجارية والجمهور المستهدف والإلهام وأي متطلبات محددة...',
              },
            },
          ],
        },
      ],
    });

    // ══════════════════════════════════════════════
    //  13. INVENTORY ITEMS
    // ══════════════════════════════════════════════
    await InventoryItem.create([
      {
        sku: 'RM-HA-001',
        name: { en: 'Hyaluronic Acid', ar: 'حمض الهيالورونيك' },
        description: {
          en: 'High molecular weight hyaluronic acid powder for hydrating formulations.',
          ar: 'مسحوق حمض الهيالورونيك عالي الوزن الجزيئي للتركيبات المرطبة.',
        },
        category: 'raw-material',
        currentStock: 500,
        lowStockThreshold: 50,
        unit: 'kg',
        costPerUnit: 120,
        isActive: true,
      },
      {
        sku: 'RM-VC-001',
        name: { en: 'Vitamin C Serum Base', ar: 'قاعدة سيروم فيتامين سي' },
        description: {
          en: 'Stabilized L-ascorbic acid base for vitamin C serum production.',
          ar: 'قاعدة حمض الأسكوربيك المستقر لإنتاج سيروم فيتامين سي.',
        },
        category: 'raw-material',
        currentStock: 300,
        lowStockThreshold: 30,
        unit: 'liters',
        costPerUnit: 85,
        isActive: true,
      },
      {
        sku: 'RM-RT-001',
        name: { en: 'Retinol Complex', ar: 'مركب الريتينول' },
        description: {
          en: 'Encapsulated retinol complex for anti-aging formulations.',
          ar: 'مركب ريتينول مغلف للتركيبات المضادة للشيخوخة.',
        },
        category: 'raw-material',
        currentStock: 200,
        lowStockThreshold: 20,
        unit: 'kg',
        costPerUnit: 250,
        isActive: true,
      },
      {
        sku: 'PK-GP-050',
        name: { en: 'Glass Pump Bottles 50ml', ar: 'زجاجات مضخة زجاجية 50 مل' },
        description: {
          en: 'Frosted glass pump bottles, 50ml capacity, suitable for serums and lotions.',
          ar: 'زجاجات مضخة زجاجية مصنفرة بسعة 50 مل، مناسبة للسيرومات واللوشن.',
        },
        category: 'packaging',
        currentStock: 1000,
        lowStockThreshold: 100,
        unit: 'pcs',
        costPerUnit: 3.5,
        isActive: true,
      },
      {
        sku: 'PK-AP-030',
        name: { en: 'Airless Pump 30ml', ar: 'مضخة بدون هواء 30 مل' },
        description: {
          en: 'White airless pump containers, 30ml, ideal for sensitive formulations.',
          ar: 'عبوات مضخة بدون هواء بيضاء بسعة 30 مل، مثالية للتركيبات الحساسة.',
        },
        category: 'packaging',
        currentStock: 800,
        lowStockThreshold: 80,
        unit: 'pcs',
        costPerUnit: 2.8,
        isActive: true,
      },
    ]);

    // ══════════════════════════════════════════════
    //  14. PROMO CODES
    // ══════════════════════════════════════════════
    const now = new Date();
    await PromoCode.create([
      {
        code: 'WELCOME10',
        type: 'percentage',
        value: 10,
        minOrder: 0,
        maxDiscount: 0,
        expiresAt: new Date(now.getFullYear() + 1, now.getMonth(), now.getDate()),
        usageLimit: 0,
        perUserLimit: 1,
        usedCount: 0,
        isActive: true,
      },
      {
        code: 'FIRST20',
        type: 'percentage',
        value: 20,
        minOrder: 0,
        maxDiscount: 500,
        expiresAt: new Date(now.getFullYear(), now.getMonth() + 6, now.getDate()),
        usageLimit: 100,
        perUserLimit: 1,
        usedCount: 0,
        isActive: true,
      },
      {
        code: 'BULK50',
        type: 'fixed',
        value: 50,
        minOrder: 5000,
        maxDiscount: 0,
        expiresAt: null as unknown as Date,
        usageLimit: 0,
        perUserLimit: 0,
        usedCount: 0,
        isActive: true,
      },
    ]);

    // ══════════════════════════════════════════════
    //  15. KNOWLEDGE ARTICLES (20)
    // ══════════════════════════════════════════════
    await KnowledgeArticle.create([
      {
        question: { en: 'What is the minimum order quantity?', ar: 'ما هو الحد الأدنى لكمية الطلب؟' },
        answer: {
          en: 'Our MOQ for sample orders is 100 units. For bulk production orders, the standard MOQ is 1,000 units per SKU. However, MOQ may vary depending on product complexity and packaging requirements.',
          ar: 'الحد الأدنى لطلبات العينات هو 100 وحدة. لطلبات الإنتاج بالجملة، الحد الأدنى القياسي هو 1,000 وحدة لكل SKU. قد يختلف الحد الأدنى حسب تعقيد المنتج ومتطلبات التغليف.',
        },
        category: 'orders',
        keywords: ['moq', 'minimum order', 'quantity', 'units', 'bulk', 'sample'],
        order: 1,
        enabled: true,
      },
      {
        question: { en: 'What is the lead time for production?', ar: 'ما هي المدة الزمنية للإنتاج؟' },
        answer: {
          en: 'Sample orders typically take 2-3 weeks. Bulk production orders take 4-6 weeks from order confirmation. Custom formulations may require an additional 2-4 weeks for R&D and stability testing.',
          ar: 'تستغرق طلبات العينات عادة 2-3 أسابيع. تستغرق طلبات الإنتاج بالجملة 4-6 أسابيع من تأكيد الطلب. قد تتطلب التركيبات المخصصة 2-4 أسابيع إضافية للبحث واختبار الثبات.',
        },
        category: 'production',
        keywords: ['lead time', 'production time', 'delivery', 'timeline', 'weeks', 'how long'],
        order: 2,
        enabled: true,
      },
      {
        question: { en: 'What certificates does KCC hold?', ar: 'ما هي الشهادات التي تحملها KCC؟' },
        answer: {
          en: 'KCC holds ISO 22716 certification for cosmetics GMP and GMP certification from the Saudi FDA (SFDA). These certifications ensure our manufacturing processes meet international quality and safety standards.',
          ar: 'تحمل KCC شهادة آيزو 22716 لممارسات التصنيع الجيد لمستحضرات التجميل وشهادة GMP من الهيئة العامة للغذاء والدواء السعودية. تضمن هذه الشهادات أن عمليات التصنيع لدينا تلبي معايير الجودة والسلامة الدولية.',
        },
        category: 'quality',
        keywords: ['certificates', 'certification', 'ISO', 'GMP', 'SFDA', 'quality'],
        order: 3,
        enabled: true,
      },
      {
        question: { en: 'What testing do products undergo?', ar: 'ما الاختبارات التي تخضع لها المنتجات؟' },
        answer: {
          en: 'All products undergo stability testing, microbiological testing, and pH testing. Optional tests include dermatological testing, SPF testing for sunscreens, and challenge testing. We provide Certificate of Analysis (COA) for every batch.',
          ar: 'تخضع جميع المنتجات لاختبار الثبات والاختبار الميكروبيولوجي واختبار درجة الحموضة. تشمل الاختبارات الاختيارية الاختبار الجلدي واختبار SPF لواقيات الشمس. نقدم شهادة تحليل (COA) لكل دفعة.',
        },
        category: 'quality',
        keywords: ['testing', 'stability', 'microbiological', 'quality control', 'COA', 'analysis'],
        order: 4,
        enabled: true,
      },
      {
        question: { en: 'How does private label manufacturing work?', ar: 'كيف يعمل تصنيع العلامة الخاصة؟' },
        answer: {
          en: 'Private label manufacturing allows you to sell products under your own brand name. You choose from our existing formulations or request custom ones, and we handle production, filling, labeling with your brand, and packaging. You focus on marketing and sales.',
          ar: 'يتيح لك تصنيع العلامة الخاصة بيع المنتجات تحت اسم علامتك التجارية. تختار من تركيباتنا الحالية أو تطلب تركيبات مخصصة، ونتولى الإنتاج والتعبئة والتوسيم بعلامتك التجارية والتغليف. أنت تركز على التسويق والمبيعات.',
        },
        category: 'services',
        keywords: ['private label', 'white label', 'own brand', 'manufacturing', 'branding'],
        order: 5,
        enabled: true,
      },
      {
        question: { en: 'What regulatory support do you provide?', ar: 'ما الدعم التنظيمي الذي تقدمونه؟' },
        answer: {
          en: 'We provide comprehensive regulatory support including SFDA product registration, GCC product notification, ingredients list preparation in INCI format, Arabic labeling compliance, and documentation for export to international markets.',
          ar: 'نقدم دعماً تنظيمياً شاملاً يشمل تسجيل المنتجات لدى SFDA وإخطار منتجات دول مجلس التعاون الخليجي وإعداد قوائم المكونات بصيغة INCI والامتثال للتوسيم باللغة العربية ووثائق التصدير للأسواق الدولية.',
        },
        category: 'regulatory',
        keywords: ['regulatory', 'SFDA', 'registration', 'compliance', 'documentation', 'labeling'],
        order: 6,
        enabled: true,
      },
      {
        question: { en: 'Do you offer shipping and logistics?', ar: 'هل تقدمون خدمات الشحن واللوجستيات؟' },
        answer: {
          en: 'Yes, we offer end-to-end logistics solutions including local delivery within Saudi Arabia and international shipping to GCC countries and worldwide. We handle proper packaging for transit and can arrange temperature-controlled shipping when required.',
          ar: 'نعم، نقدم حلول لوجستية متكاملة تشمل التوصيل المحلي داخل المملكة العربية السعودية والشحن الدولي لدول الخليج والعالم. نتولى التغليف المناسب للنقل ويمكننا ترتيب الشحن بالتحكم بالحرارة عند الحاجة.',
        },
        category: 'logistics',
        keywords: ['shipping', 'logistics', 'delivery', 'international', 'GCC', 'transport'],
        order: 7,
        enabled: true,
      },
      {
        question: { en: 'Are your products heat resistant?', ar: 'هل منتجاتكم مقاومة للحرارة؟' },
        answer: {
          en: 'Yes, we have developed proprietary heat-resistant formulations specifically designed for the Gulf climate. Our products are tested for stability at temperatures up to 50°C, ensuring they maintain their quality and efficacy in hot weather conditions.',
          ar: 'نعم، لقد طورنا تركيبات حصرية مقاومة للحرارة مصممة خصيصاً لمناخ الخليج. يتم اختبار منتجاتنا للثبات في درجات حرارة تصل إلى 50 درجة مئوية، مما يضمن الحفاظ على جودتها وفعاليتها في ظروف الطقس الحار.',
        },
        category: 'production',
        keywords: ['heat resistant', 'temperature', 'Gulf', 'climate', 'stability', 'hot weather'],
        order: 8,
        enabled: true,
      },
      {
        question: { en: 'What packaging options are available?', ar: 'ما هي خيارات التغليف المتاحة؟' },
        answer: {
          en: 'We offer a wide range of packaging options including glass pump bottles, airless pumps, dropper bottles, jars, tubes, and spray bottles. Sizes range from 15ml to 500ml. Custom packaging design and printing services are also available.',
          ar: 'نقدم مجموعة واسعة من خيارات التغليف تشمل زجاجات مضخة زجاجية ومضخات بدون هواء وزجاجات قطارة وبرطمانات وأنابيب وزجاجات رذاذ. تتراوح الأحجام من 15 مل إلى 500 مل. كما تتوفر خدمات تصميم وطباعة التغليف المخصص.',
        },
        category: 'packaging',
        keywords: ['packaging', 'bottles', 'containers', 'sizes', 'glass', 'pump', 'airless'],
        order: 9,
        enabled: true,
      },
      {
        question: { en: 'What ingredients do you work with?', ar: 'ما المكونات التي تعملون بها؟' },
        answer: {
          en: 'We work with a comprehensive range of cosmetic ingredients including hyaluronic acid, vitamin C, retinol, niacinamide, natural botanical extracts, and more. We can source specialty ingredients and create formulations that are paraben-free, sulfate-free, vegan, and cruelty-free.',
          ar: 'نعمل مع مجموعة شاملة من مكونات مستحضرات التجميل تشمل حمض الهيالورونيك وفيتامين سي والريتينول والنياسيناميد والمستخلصات النباتية الطبيعية وغيرها. يمكننا توفير مكونات متخصصة وإنشاء تركيبات خالية من البارابين والكبريتات ونباتية.',
        },
        category: 'formulation',
        keywords: ['ingredients', 'hyaluronic acid', 'vitamin C', 'retinol', 'natural', 'vegan', 'paraben-free'],
        order: 10,
        enabled: true,
      },
      {
        question: { en: 'How is pricing determined?', ar: 'كيف يتم تحديد الأسعار؟' },
        answer: {
          en: 'Pricing depends on several factors: formulation complexity, ingredients used, packaging type, order quantity, and testing requirements. We provide detailed quotations after reviewing your product specifications. Higher quantities result in lower per-unit costs.',
          ar: 'تعتمد الأسعار على عدة عوامل: تعقيد التركيبة والمكونات المستخدمة ونوع التغليف وكمية الطلب ومتطلبات الاختبار. نقدم عروض أسعار مفصلة بعد مراجعة مواصفات المنتج. الكميات الأكبر تعني تكلفة أقل للوحدة.',
        },
        category: 'pricing',
        keywords: ['pricing', 'cost', 'price', 'quotation', 'quote', 'how much', 'rates'],
        order: 11,
        enabled: true,
      },
      {
        question: { en: 'Can I order samples before bulk production?', ar: 'هل يمكنني طلب عينات قبل الإنتاج بالجملة؟' },
        answer: {
          en: 'Absolutely! We encourage sample orders before committing to bulk production. Sample orders start from 100 units and allow you to test the product, packaging, and market response before scaling up to full production.',
          ar: 'بالتأكيد! نشجع طلب العينات قبل الالتزام بالإنتاج بالجملة. تبدأ طلبات العينات من 100 وحدة وتتيح لك اختبار المنتج والتغليف واستجابة السوق قبل التوسع في الإنتاج الكامل.',
        },
        category: 'orders',
        keywords: ['samples', 'sample order', 'trial', 'test', 'before bulk', 'try'],
        order: 12,
        enabled: true,
      },
      {
        question: { en: 'What quality control measures do you have?', ar: 'ما هي إجراءات مراقبة الجودة لديكم؟' },
        answer: {
          en: 'Our quality control includes incoming raw material inspection, in-process checks, final product testing, and batch documentation. We have an in-house QC lab with equipment for stability testing, viscosity measurement, pH testing, and microbiological analysis.',
          ar: 'تشمل مراقبة الجودة لدينا فحص المواد الخام الواردة والفحوصات أثناء العملية واختبار المنتج النهائي وتوثيق الدفعات. لدينا مختبر مراقبة جودة داخلي مجهز لاختبار الثبات وقياس اللزوجة واختبار الحموضة والتحليل الميكروبيولوجي.',
        },
        category: 'quality',
        keywords: ['quality control', 'QC', 'inspection', 'lab', 'testing', 'batch'],
        order: 13,
        enabled: true,
      },
      {
        question: { en: 'Can you develop custom formulations?', ar: 'هل يمكنكم تطوير تركيبات مخصصة؟' },
        answer: {
          en: 'Yes! Our R&D team specializes in custom formulation development. We can create unique formulations tailored to your brand identity, target market, and specific requirements. The process includes concept development, prototype creation, stability testing, and refinement.',
          ar: 'نعم! يتخصص فريق البحث والتطوير لدينا في تطوير التركيبات المخصصة. يمكننا إنشاء تركيبات فريدة مصممة خصيصاً لهوية علامتك التجارية والسوق المستهدف والمتطلبات المحددة. تشمل العملية تطوير المفهوم وإنشاء النماذج الأولية واختبار الثبات والتحسين.',
        },
        category: 'formulation',
        keywords: ['custom formulation', 'R&D', 'develop', 'unique', 'custom', 'create'],
        order: 14,
        enabled: true,
      },
      {
        question: { en: 'What is the typical shelf life of your products?', ar: 'ما هي مدة صلاحية منتجاتكم النموذجية؟' },
        answer: {
          en: 'Most of our products have a shelf life of 24-36 months when stored properly. The exact shelf life depends on the formulation and ingredients used. All products undergo accelerated stability testing to verify the stated shelf life.',
          ar: 'تتراوح مدة صلاحية معظم منتجاتنا بين 24-36 شهراً عند التخزين الصحيح. تعتمد مدة الصلاحية الدقيقة على التركيبة والمكونات المستخدمة. تخضع جميع المنتجات لاختبار ثبات معجل للتحقق من مدة الصلاحية المذكورة.',
        },
        category: 'production',
        keywords: ['shelf life', 'expiry', 'expiration', 'stability', 'storage', 'how long last'],
        order: 15,
        enabled: true,
      },
      {
        question: { en: 'Do you export to other countries?', ar: 'هل تصدرون إلى دول أخرى؟' },
        answer: {
          en: 'Yes, we export to GCC countries, MENA region, and international markets. We handle export documentation, ensure compliance with destination country regulations, and can arrange international shipping logistics.',
          ar: 'نعم، نصدر إلى دول مجلس التعاون الخليجي ومنطقة الشرق الأوسط وشمال أفريقيا والأسواق الدولية. نتولى وثائق التصدير ونضمن الامتثال للوائح الدولة المستهدفة ويمكننا ترتيب لوجستيات الشحن الدولي.',
        },
        category: 'logistics',
        keywords: ['export', 'international', 'countries', 'GCC', 'shipping', 'global'],
        order: 16,
        enabled: true,
      },
      {
        question: { en: 'What is GMP certification?', ar: 'ما هي شهادة GMP؟' },
        answer: {
          en: 'GMP (Good Manufacturing Practice) is a quality management system that ensures products are consistently produced and controlled according to quality standards. Our GMP certification from SFDA verifies that our facility, processes, and personnel meet strict requirements for cosmetics manufacturing.',
          ar: 'GMP (ممارسات التصنيع الجيد) هو نظام إدارة جودة يضمن أن المنتجات يتم إنتاجها والتحكم فيها باستمرار وفقاً لمعايير الجودة. تؤكد شهادة GMP من الهيئة العامة للغذاء والدواء أن منشأتنا وعملياتنا وموظفينا يلبون المتطلبات الصارمة لتصنيع مستحضرات التجميل.',
        },
        category: 'quality',
        keywords: ['GMP', 'good manufacturing practice', 'certification', 'quality management'],
        order: 17,
        enabled: true,
      },
      {
        question: { en: 'What does ISO 22716 mean?', ar: 'ماذا تعني شهادة آيزو 22716؟' },
        answer: {
          en: 'ISO 22716 is the international standard for cosmetics Good Manufacturing Practices. It provides guidelines for the production, control, storage, and shipment of cosmetic products. KCC\'s ISO 22716 certification demonstrates our commitment to the highest quality standards in cosmetics manufacturing.',
          ar: 'آيزو 22716 هو المعيار الدولي لممارسات التصنيع الجيد لمستحضرات التجميل. يقدم إرشادات لإنتاج ومراقبة وتخزين وشحن منتجات التجميل. تثبت شهادة آيزو 22716 الخاصة بـ KCC التزامنا بأعلى معايير الجودة في تصنيع مستحضرات التجميل.',
        },
        category: 'quality',
        keywords: ['ISO', 'ISO 22716', 'standard', 'international', 'certification'],
        order: 18,
        enabled: true,
      },
      {
        question: { en: 'What are the Saudi cosmetic regulations?', ar: 'ما هي لوائح مستحضرات التجميل السعودية؟' },
        answer: {
          en: 'Saudi cosmetic regulations are governed by the SFDA (Saudi Food and Drug Authority). All cosmetic products sold in Saudi Arabia must be registered with SFDA, comply with GSO standards, have proper Arabic labeling, and meet safety and quality requirements. KCC ensures full compliance for all manufactured products.',
          ar: 'تخضع لوائح مستحضرات التجميل السعودية للهيئة العامة للغذاء والدواء (SFDA). يجب تسجيل جميع منتجات التجميل المباعة في المملكة لدى الهيئة والامتثال لمعايير هيئة التقييس الخليجية ووجود توسيم باللغة العربية وتلبية متطلبات السلامة والجودة.',
        },
        category: 'regulatory',
        keywords: ['Saudi regulations', 'SFDA', 'compliance', 'requirements', 'registration', 'labeling'],
        order: 19,
        enabled: true,
      },
      {
        question: { en: 'Can you create custom packaging designs?', ar: 'هل يمكنكم إنشاء تصاميم تغليف مخصصة؟' },
        answer: {
          en: 'Yes, we offer custom packaging design services. Our design team can help create unique packaging that reflects your brand identity. Services include container selection, label design, box design, color matching, and custom printing. We also offer sustainable and eco-friendly packaging options.',
          ar: 'نعم، نقدم خدمات تصميم تغليف مخصصة. يمكن لفريق التصميم لدينا المساعدة في إنشاء تغليف فريد يعكس هوية علامتك التجارية. تشمل الخدمات اختيار العبوات وتصميم الملصقات وتصميم الصناديق ومطابقة الألوان والطباعة المخصصة. كما نقدم خيارات تغليف مستدامة وصديقة للبيئة.',
        },
        category: 'packaging',
        keywords: ['custom packaging', 'design', 'label', 'branding', 'box', 'printing', 'eco-friendly'],
        order: 20,
        enabled: true,
      },
    ]);

    // ══════════════════════════════════════════════
    //  16. PRODUCT VISUAL RULES
    // ══════════════════════════════════════════════
    await ProductVisualRule.create([
      {
        conditions: {
          productType: 'serum',
          texture: 'lightweight',
          containerType: 'dropper',
          freeFrom: ['parabens', 'sulfates'],
        },
        imageUrl: '/images/visuals/serum-dropper-clean.png',
        label: { en: 'Clean Serum in Dropper Bottle', ar: 'سيروم نظيف في زجاجة قطارة' },
        enabled: true,
      },
      {
        conditions: {
          productType: 'cream',
          texture: 'rich',
          containerType: 'jar',
          freeFrom: ['parabens'],
        },
        imageUrl: '/images/visuals/cream-jar-premium.png',
        label: { en: 'Premium Cream in Jar', ar: 'كريم فاخر في برطمان' },
        enabled: true,
      },
    ]);

    // ══════════════════════════════════════════════
    //  17. ORDERS (sample + bulk with realistic data)
    // ══════════════════════════════════════════════
    const seedNow = new Date();
    const daysAgo = (d: number) => new Date(seedNow.getTime() - d * 86400000);

    const sampleOrders = [
      {
        orderNumber: 'KCC-S-2026-001',
        type: 'sample' as const,
        status: 'Delivered',
        userId: customerIds[0],
        customerInfo: { companyName: 'Glow Beauty', personName: 'Ahmed Al-Rashid', email: 'ahmed@test.com', phone: '+966 50 111 2222', country: 'Saudi Arabia', city: 'Jeddah' },
        surveyData: { productType: 'Serum', skinType: 'Combination', primaryGoal: 'Brightening', size: '30ml', containerType: 'Dropper Bottle', texturePreference: 'Light' },
        totals: { subtotal: 250, discount: 0, tax: 37.5, total: 287.5 },
        paymentMethod: 'card' as const,
        paymentStatus: 'paid' as const,
        createdAt: daysAgo(45),
        updatedAt: daysAgo(30),
      },
      {
        orderNumber: 'KCC-S-2026-002',
        type: 'sample' as const,
        status: 'In Production',
        userId: customerIds[1],
        customerInfo: { companyName: 'PureGlow Cosmetics', personName: 'Sara Al-Fahd', email: 'sara@test.com', phone: '+971 50 333 4444', country: 'UAE', city: 'Dubai' },
        surveyData: { productType: 'Cream', skinType: 'Dry', primaryGoal: 'Hydration', size: '50ml', containerType: 'Jar', texturePreference: 'Creamy' },
        totals: { subtotal: 320, discount: 48, tax: 40.8, total: 312.8 },
        paymentMethod: 'cash' as const,
        paymentStatus: 'paid' as const,
        createdAt: daysAgo(20),
        updatedAt: daysAgo(10),
      },
      {
        orderNumber: 'KCC-S-2026-003',
        type: 'sample' as const,
        status: 'Under Review',
        userId: customerIds[2],
        customerInfo: { companyName: 'NightRevive Labs', personName: 'Khalid Nasser', email: 'khalid@test.com', phone: '+965 55 666 7777', country: 'Kuwait', city: 'Kuwait City' },
        surveyData: { productType: 'Cleanser', skinType: 'Oily', primaryGoal: 'Acne Control', size: '100ml', containerType: 'Pump Bottle', texturePreference: 'Gel' },
        totals: { subtotal: 180, discount: 0, tax: 27, total: 207 },
        paymentMethod: 'card' as const,
        paymentStatus: 'pending' as const,
        createdAt: daysAgo(5),
        updatedAt: daysAgo(3),
      },
      {
        orderNumber: 'KCC-S-2026-004',
        type: 'sample' as const,
        status: 'Submitted',
        userId: customerIds[3],
        customerInfo: { companyName: 'SunShield Arabia', personName: 'Nora Hassan', email: 'nora@test.com', phone: '+973 33 888 9999', country: 'Bahrain', city: 'Manama' },
        surveyData: { productType: 'Sunscreen', skinType: 'Normal', primaryGoal: 'Sun Protection', size: '50ml', containerType: 'Tube', texturePreference: 'Light' },
        totals: { subtotal: 290, discount: 0, tax: 43.5, total: 333.5 },
        paymentMethod: 'cash' as const,
        paymentStatus: 'pending' as const,
        createdAt: daysAgo(2),
        updatedAt: daysAgo(2),
      },
      {
        orderNumber: 'KCC-S-2026-005',
        type: 'sample' as const,
        status: 'Delivered',
        userId: customerIds[0],
        customerInfo: { companyName: 'Glow Beauty', personName: 'Ahmed Al-Rashid', email: 'ahmed@test.com', phone: '+966 50 111 2222', country: 'Saudi Arabia', city: 'Jeddah' },
        surveyData: { productType: 'Moisturizer', skinType: 'Sensitive', primaryGoal: 'Hydration', size: '50ml', containerType: 'Airless Pump', texturePreference: 'Creamy' },
        totals: { subtotal: 350, discount: 70, tax: 42, total: 322 },
        paymentMethod: 'card' as const,
        paymentStatus: 'paid' as const,
        createdAt: daysAgo(60),
        updatedAt: daysAgo(40),
      },
      {
        orderNumber: 'KCC-S-2026-006',
        type: 'sample' as const,
        status: 'Shipped',
        userId: customerIds[1],
        customerInfo: { companyName: 'PureGlow Cosmetics', personName: 'Sara Al-Fahd', email: 'sara@test.com', phone: '+971 50 333 4444', country: 'UAE', city: 'Dubai' },
        surveyData: { productType: 'Toner', skinType: 'Combination', primaryGoal: 'Pore Minimizing', size: '100ml', containerType: 'Spray Bottle', texturePreference: 'Watery' },
        totals: { subtotal: 200, discount: 0, tax: 30, total: 230 },
        paymentMethod: 'card' as const,
        paymentStatus: 'paid' as const,
        createdAt: daysAgo(12),
        updatedAt: daysAgo(4),
      },
    ];

    const bulkOrders = [
      {
        orderNumber: 'KCC-B-2026-001',
        type: 'bulk' as const,
        status: 'In Production',
        userId: customerIds[0],
        customerInfo: { companyName: 'Glow Beauty', personName: 'Ahmed Al-Rashid', email: 'ahmed@test.com', phone: '+966 50 111 2222', country: 'Saudi Arabia', city: 'Jeddah' },
        surveyData: { productType: 'Serum', skinType: 'Combination', primaryGoal: 'Brightening', size: '30ml', containerType: 'Dropper Bottle' },
        bulkDetails: { quantity: 5000, pricingNotes: 'Negotiated bulk rate', deliveryTimeline: '2 Months' },
        totals: { subtotal: 15000, discount: 1500, tax: 2025, total: 15525 },
        paymentMethod: 'card' as const,
        paymentStatus: 'paid' as const,
        convertedFromSample: undefined,
        createdAt: daysAgo(25),
        updatedAt: daysAgo(8),
      },
      {
        orderNumber: 'KCC-B-2026-002',
        type: 'bulk' as const,
        status: 'Delivered',
        userId: customerIds[1],
        customerInfo: { companyName: 'PureGlow Cosmetics', personName: 'Sara Al-Fahd', email: 'sara@test.com', phone: '+971 50 333 4444', country: 'UAE', city: 'Dubai' },
        surveyData: { productType: 'Cream', skinType: 'Dry', primaryGoal: 'Anti-Aging', size: '50ml', containerType: 'Jar' },
        bulkDetails: { quantity: 10000, pricingNotes: 'Annual contract pricing', deliveryTimeline: '3 Months' },
        totals: { subtotal: 45000, discount: 6750, tax: 5737.5, total: 43987.5 },
        paymentMethod: 'cash' as const,
        paymentStatus: 'paid' as const,
        createdAt: daysAgo(90),
        updatedAt: daysAgo(30),
      },
      {
        orderNumber: 'KCC-B-2026-003',
        type: 'bulk' as const,
        status: 'Awaiting Payment',
        userId: customerIds[2],
        customerInfo: { companyName: 'NightRevive Labs', personName: 'Khalid Nasser', email: 'khalid@test.com', phone: '+965 55 666 7777', country: 'Kuwait', city: 'Kuwait City' },
        surveyData: { productType: 'Cleanser', skinType: 'Oily', primaryGoal: 'Acne Control', size: '150ml', containerType: 'Pump Bottle' },
        bulkDetails: { quantity: 3000, pricingNotes: 'First bulk order', deliveryTimeline: '1 Month' },
        totals: { subtotal: 8400, discount: 0, tax: 1260, total: 9660 },
        paymentMethod: 'card' as const,
        paymentStatus: 'pending' as const,
        createdAt: daysAgo(7),
        updatedAt: daysAgo(3),
      },
      {
        orderNumber: 'KCC-B-2026-004',
        type: 'bulk' as const,
        status: 'Approved',
        userId: customerIds[3],
        customerInfo: { companyName: 'SunShield Arabia', personName: 'Nora Hassan', email: 'nora@test.com', phone: '+973 33 888 9999', country: 'Bahrain', city: 'Manama' },
        surveyData: { productType: 'Sunscreen', skinType: 'Normal', primaryGoal: 'Sun Protection', size: '50ml', containerType: 'Tube' },
        bulkDetails: { quantity: 8000, pricingNotes: 'Summer campaign stock', deliveryTimeline: '2 Months' },
        totals: { subtotal: 28000, discount: 4200, tax: 3570, total: 27370 },
        paymentMethod: 'cash' as const,
        paymentStatus: 'pending' as const,
        createdAt: daysAgo(10),
        updatedAt: daysAgo(6),
      },
      {
        orderNumber: 'KCC-B-2026-005',
        type: 'bulk' as const,
        status: 'Shipped',
        userId: customerIds[0],
        customerInfo: { companyName: 'Glow Beauty', personName: 'Ahmed Al-Rashid', email: 'ahmed@test.com', phone: '+966 50 111 2222', country: 'Saudi Arabia', city: 'Jeddah' },
        surveyData: { productType: 'Moisturizer', skinType: 'Sensitive', primaryGoal: 'Hydration', size: '50ml', containerType: 'Airless Pump' },
        bulkDetails: { quantity: 2000, pricingNotes: 'Reorder from sample KCC-S-2026-005', deliveryTimeline: '1 Month' },
        totals: { subtotal: 7600, discount: 760, tax: 1026, total: 7866 },
        paymentMethod: 'card' as const,
        paymentStatus: 'paid' as const,
        createdAt: daysAgo(35),
        updatedAt: daysAgo(5),
      },
    ];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const allOrders: any[] = await Order.create([...sampleOrders, ...bulkOrders]);

    // ══════════════════════════════════════════════
    //  18. INVOICES
    // ══════════════════════════════════════════════
    const paidOrders = allOrders.filter(o => o.paymentStatus === 'paid');
    const invoiceData = paidOrders.map((order, i) => ({
      invoiceNumber: `INV-2026-${String(i + 1).padStart(3, '0')}`,
      orderId: order._id,
      userId: order.userId,
      items: [{
        description: `${order.type === 'bulk' ? 'Bulk' : 'Sample'} Order - ${order.surveyData?.productType || 'Product'} (${order.surveyData?.size || ''})`,
        quantity: order.bulkDetails?.quantity || 1,
        unitPrice: order.totals.subtotal / (order.bulkDetails?.quantity || 1),
        total: order.totals.subtotal,
      }],
      subtotal: order.totals.subtotal,
      tax: order.totals.tax,
      discount: order.totals.discount,
      total: order.totals.total,
      status: 'paid' as const,
      dueDate: new Date(order.createdAt.getTime() + 30 * 86400000),
      paidAt: new Date(order.createdAt.getTime() + 7 * 86400000),
      notes: `Payment received for order ${order.orderNumber}`,
    }));
    await Invoice.create(invoiceData);

    console.log('Seed completed successfully!');
    return NextResponse.json({
      success: true,
      message: 'Seed completed successfully!',
      counts: {
        users: createdUsers.length,
        cmsSections: 4,
        services: 4,
        testimonials: 3,
        certificates: 4,
        teamMembers: 7,
        factories: 1,
        portfolioItems: 2,
        newsPosts: 2,
        faqs: 5,
        surveyTemplates: 1,
        inventoryItems: 5,
        promoCodes: 3,
        seoGlobal: 1,
        seoPages: 3,
        knowledgeArticles: 20,
        productVisualRules: 2,
        orders: allOrders.length,
        invoices: invoiceData.length,
      },
    });
  } catch (error: any) {
    console.error('Seed error:', error);
    return NextResponse.json(
      { error: 'Seed failed', details: error.message },
      { status: 500 }
    );
  }
}
