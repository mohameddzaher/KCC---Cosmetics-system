/**
 * Put the About page's prose into the CMS.
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

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI missing');
  await mongoose.connect(uri);

  const existing = await CmsSection.findOne({ type: 'about' });
  if (existing) {
    console.log('an "about" section already exists -- left as the team has it');
  } else {
    await CmsSection.create({
      type: 'about',
      slug: 'about-page',
      order: 5,
      enabled: true,
      status: 'published',
      fields: FIELDS,
    });
    console.log('created the "about" section');
  }

  const all: any[] = await CmsSection.find({}).select('type enabled status').lean();
  console.log('CMS sections:', all.map((s) => s.type).join(', '));

  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
