/**
 * Reconcile the admin Knowledge Base with how the system actually works.
 *
 * WHY
 * ---
 * The AI assistant answers from two places: built-in entries that live beside
 * the features they describe, and these admin-editable articles. Three of the
 * articles contradicted the product outright — they said a sample order has a
 * minimum of 100 units, when a sample request is exactly one custom sample —
 * and one gave a different lead time from every other page on the site. A
 * customer asking the same question twice could get two different answers.
 *
 * Only articles whose text still matches the seeded wording are rewritten, so
 * anything the team has since edited is left alone.
 *
 * SAFE TO RE-RUN.  Usage: npx tsx scripts/fix-knowledge-articles.ts
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') });

import mongoose from 'mongoose';
import KnowledgeArticle from '../src/models/KnowledgeArticle';

interface Fix {
  match: string;
  /** Only rewrite while the English answer still starts with this. */
  seededPrefix: string;
  en: string;
  ar: string;
  keywords?: string[];
}

const FIXES: Fix[] = [
  {
    match: 'minimum order quantity',
    seededPrefix: 'Our MOQ for sample orders is 100 units',
    en:
      'Sample requests have no minimum — a sample is a single custom unit, made to the brief you fill in, so you can judge it before committing to anything.\n\n' +
      'For bulk production the standard minimum is 1,000 units per SKU, and unit pricing improves with volume. Once a sample is approved you can scale it up straight from the order, with the same specification carried across.',
    ar:
      'طلب العينة مفيش ليه حد أدنى — العينة وحدة واحدة مخصصة، بتتعمل حسب البريف اللي بتملاه، عشان تجرّبها قبل ما تلتزم بأي حاجة.\n\n' +
      'للإنتاج بالجملة، الحد الأدنى المعتاد 1,000 وحدة لكل صنف، وسعر الوحدة بيتحسن مع الكمية. وأول ما توافق على العينة تقدر تكبّرها لطلب جملة من نفس الطلب بنفس المواصفات.',
    keywords: ['moq', 'minimum order', 'quantity', 'minimum'],
  },
  {
    match: 'order samples first',
    seededPrefix: 'Yes! Sample orders start from 100 units',
    en:
      'Yes — that is how every project should start, and there is no minimum quantity.\n\n' +
      'Fill in the Sample Quiz and our R&D team makes one custom sample to your brief. Sample development takes 2–4 weeks depending on complexity. When it arrives you can approve it, reorder it with changes, or scale the same specification up to bulk.',
    ar:
      'أيوه — ودي الطريقة الصح لبداية أي مشروع، ومفيش حد أدنى للكمية.\n\n' +
      'املا كويز السامبل وفريق الـ R&D بيعملك عينة واحدة مخصصة حسب البريف. تطوير العينة بياخد من 2 لـ 4 أسابيع حسب التعقيد. ولما توصلك تقدر توافق عليها، أو تعيد طلبها بتعديلات، أو تكبّر نفس المواصفات لطلب جملة.',
    keywords: ['samples', 'sample order', 'trial', 'test'],
  },
  {
    match: 'lead time for production',
    seededPrefix: 'Sample orders: 2-3 weeks',
    en:
      'Sample development: 2–4 weeks. Bulk production: 4–8 weeks depending on quantity. Custom formulations may add 2–4 weeks.\n\n' +
      'Packaging and labelling run 2–3 weeks, quality testing 1–2 weeks, and shipping within the GCC is 3–7 business days. First orders typically run 8–16 weeks end to end; repeat orders are faster.',
    ar:
      'تطوير العينة: من 2 لـ 4 أسابيع. الإنتاج بالجملة: من 4 لـ 8 أسابيع حسب الكمية. التركيبات المخصصة ممكن تضيف من 2 لـ 4 أسابيع.\n\n' +
      'التغليف والملصقات من 2 لـ 3 أسابيع، فحص الجودة من أسبوع لأسبوعين، والشحن داخل الخليج من 3 لـ 7 أيام عمل. الطلب الأول عادة بياخد من 8 لـ 16 أسبوع من الأول للآخر، والطلبات المتكررة أسرع.',
    keywords: ['lead time', 'production time', 'timeline'],
  },
];

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI missing');
  await mongoose.connect(uri);

  const all: any[] = await KnowledgeArticle.find({});
  let changed = 0;

  for (const fix of FIXES) {
    const doc = all.find((a) => (a.question?.en || '').toLowerCase().includes(fix.match));
    if (!doc) {
      console.log(`  ? no article matching "${fix.match}"`);
      continue;
    }
    if (!(doc.answer?.en || '').startsWith(fix.seededPrefix)) {
      console.log(`  = "${doc.question.en}" has been edited since seeding — left alone`);
      continue;
    }

    doc.answer.en = fix.en;
    doc.answer.ar = fix.ar;
    if (fix.keywords) doc.keywords = fix.keywords;
    doc.markModified('answer');
    await doc.save();
    changed++;
    console.log(`  ~ rewrote "${doc.question.en}"`);
  }

  console.log(`done — ${changed}/${FIXES.length} article(s) updated`);
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
