/**
 * Put the About and Certificates page prose into the CMS.
 *
 * The story, mission, vision and figures were code-only. That is exactly the
 * shape of the bug that made the homepage hero say one thing while the CMS
 * said another: an editor changes the CMS, the page carries on rendering the
 * hardcoded copy, and nobody can tell which one is real. Everything on that
 * page a person might want to reword now lives in one editable section.
 *
 * SAFE TO RE-RUN. Creates the section if it is missing and leaves an existing
 * one exactly as the team has it.
 *
 * Usage:  npx tsx scripts/seed-about-section.ts
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') });

import mongoose from 'mongoose';
import CmsSection from '../src/models/CmsSection';

const FIELDS = {
  en: {
    story: [
      'KCC was built around one idea: that a brand should be able to make a product in the Kingdom, to an international standard, without leaving the country to do it.',
      'We formulate, produce, test and pack under one roof in GMP-certified conditions. Our R&D team develops from scratch, reformulates what a brand already sells, or matches a benchmark it wants to beat.',
      'Today we work with brands across the GCC and the wider MENA region, from a first sample of a single unit through to full production runs and export.',
    ],
    mission:
      'To make world-class cosmetics manufacturing available to brands of any size, with the formulation depth, quality systems and regulatory support that used to be out of reach unless you were very large.',
    vision:
      'A Kingdom that makes what it sells — where a Saudi beauty brand can go from an idea to a shelf without its supply chain ever leaving the region.',
    items: [
      { value: '15+', label: 'Years of experience' },
      { value: '500+', label: 'Products launched' },
      { value: '200+', label: 'Brands served' },
      { value: '12', label: 'Countries served' },
    ],
  },
  ar: {
    story: [
      'قامت KCC على فكرة واحدة: أن تتمكن العلامة التجارية من تصنيع منتجها داخل المملكة، وبمعيار عالمي، دون أن تضطر للخروج من البلد لتفعل ذلك.',
      'نطوّر التركيبات وننتج ونفحص ونعبّئ تحت سقف واحد وفق ممارسات التصنيع الجيد. وفريق البحث والتطوير لدينا يطوّر من الصفر، أو يعيد صياغة منتج تبيعه العلامة بالفعل، أو يطابق منتجًا مرجعيًا تريد التفوق عليه.',
      'نعمل اليوم مع علامات في دول الخليج ومنطقة الشرق الأوسط وشمال أفريقيا، من أول عيّنة بوحدة واحدة وحتى دفعات الإنتاج الكاملة والتصدير.',
    ],
    mission:
      'أن نُتيح تصنيع مستحضرات تجميل بمستوى عالمي لأي علامة تجارية مهما كان حجمها، مع عمق في التركيب وأنظمة جودة ودعم تنظيمي كان في السابق حكرًا على الشركات الكبيرة.',
    vision:
      'مملكة تصنع ما تبيع — حيث تستطيع علامة سعودية أن تنتقل من فكرة إلى رفّ المتجر دون أن تغادر سلسلة توريدها المنطقة.',
    items: [
      { value: '+15', label: 'سنة خبرة' },
      { value: '+500', label: 'منتج تم إطلاقه' },
      { value: '+200', label: 'علامة تجارية' },
      { value: '12', label: 'دولة نخدمها' },
    ],
  },
};

/*
 * The Certificates page's "what this means for you" band. Two certificate
 * cards left most of a full-height page empty; this fills it with something
 * a brand actually needs to know, and the team can reword it.
 */
const CERT_FIELDS = {
  en: {
    eyebrow: 'What this means for you',
    title: 'Credentials are only useful if they change something',
    lede: 'These are not badges for a footer. Each one changes what we are able to do for a brand, and what a regulator will accept from it.',
    points: [
      {
        title: 'ISO 22716 — Good Manufacturing Practice',
        body: 'Every batch is made to a documented procedure and traceable back to its raw material lots. That record is what a regulator, an auditor or a retailer asks for when something needs explaining.',
      },
      {
        title: 'SFDA-licensed facility',
        body: 'Producing in a licensed facility means your product is documented for Saudi registration from the first batch, rather than being reconstructed for the paperwork after it is made.',
      },
      {
        title: 'Testing before release',
        body: 'Stability, microbiological and pH testing on every formula, with dermatological and SPF testing where the claim needs it. Nothing ships on the strength of a recipe alone.',
      },
    ],
  },
  ar: {
    eyebrow: 'ماذا يعني ذلك لك',
    title: 'الشهادات لا قيمة لها ما لم تغيّر شيئًا',
    lede: 'هذه ليست شارات تُوضع في تذييل الصفحة. كل واحدة منها تغيّر ما نستطيع تقديمه للعلامة التجارية، وما ستقبله الجهة التنظيمية منها.',
    points: [
      {
        title: 'ISO 22716 — ممارسات التصنيع الجيد',
        body: 'كل تشغيلة تُصنَّع وفق إجراء موثّق ويمكن تتبّعها رجوعًا إلى تشغيلات موادها الخام. وهذا السجل هو ما تطلبه الجهة التنظيمية أو المدقّق أو التاجر عند الحاجة لتفسير أي أمر.',
      },
      {
        title: 'منشأة مرخّصة من الهيئة العامة للغذاء والدواء',
        body: 'الإنتاج في منشأة مرخّصة يعني أن منتجك موثّق للتسجيل السعودي من أول دفعة، بدل إعادة تجميع الأوراق بعد التصنيع.',
      },
      {
        title: 'الفحص قبل الإفراج',
        body: 'فحوص الثبات والأحياء الدقيقة ودرجة الحموضة لكل تركيبة، مع الفحص الجلدي وفحص معامل الحماية حين يتطلب الادعاء ذلك. لا شيء يُشحن بالاعتماد على الوصفة وحدها.',
      },
    ],
  },
};

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI missing');
  await mongoose.connect(uri);

  for (const [type, slug, order, fields] of [
    ['about', 'about-page', 5, FIELDS],
    ['certifications', 'certificates-assurance', 6, CERT_FIELDS],
  ] as const) {
    const existing = await CmsSection.findOne({ type });
    if (existing) {
      console.log(`a "${type}" section already exists -- left as the team has it`);
      continue;
    }
    await CmsSection.create({ type, slug, order, enabled: true, status: 'published', fields });
    console.log(`created the "${type}" section`);
  }

  const all: any[] = await CmsSection.find({}).select('type enabled status').lean();
  console.log('CMS sections:', all.map((s) => s.type).join(', '));

  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
