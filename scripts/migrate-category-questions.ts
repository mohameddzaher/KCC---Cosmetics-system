/**
 * Migration — move category questions into their categories, and seed the
 * "how are we developing this?" branching flows.
 *
 * WHY
 * ---
 * Every category-specific question (hair type, SPF level, baby age …) lived in
 * the shared brief, hidden behind a `_categoryMain` condition. But the category
 * is chosen AFTER the brief, so at brief time that condition could not be
 * evaluated — the customer was shown all 34 questions, most of them irrelevant.
 *
 * This moves each of those questions to `scope: 'main'` with its category as
 * `scopeKey`, and drops the now-redundant condition. The quiz asks them right
 * after the customer picks that category, before the technical specs — which is
 * what the business asked for.
 *
 * It also seeds the follow-up flows for "Reformulation of an existing product"
 * and "Matching a benchmark product", conditioned on `developmentType`.
 *
 * SAFE TO RE-RUN. It never deletes a question; it upserts by
 * (scope, scopeKey, questionKey) and only moves questions that still carry the
 * old `_categoryMain` condition.
 *
 * Usage:  npx tsx scripts/migrate-category-questions.ts
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') });

import mongoose from 'mongoose';
import BriefQuestion from '../src/models/BriefQuestion';

/* ------------------------------------------------------------------ */
/* 1 — move `_categoryMain` questions into their category scope        */
/* ------------------------------------------------------------------ */

async function moveCategoryQuestions() {
  const all = await BriefQuestion.find({
    scope: 'general',
    'conditions.questionKey': '_categoryMain',
  }).lean();

  console.log(`found ${all.length} question(s) still gated on _categoryMain`);

  const perScope = new Map<string, number>();

  for (const q of all as Array<Record<string, any>>) {
    const cond = (q.conditions || []).find((c: any) => c.questionKey === '_categoryMain');
    const raw = cond?.value;
    const slug = Array.isArray(raw) ? raw[0] : raw;
    if (!slug || typeof slug !== 'string') {
      console.warn(`  ! skipping ${q.questionKey} — unusable condition value`, raw);
      continue;
    }

    // Keep any OTHER conditions the question had; only the category gate goes.
    const remaining = (q.conditions || []).filter((c: any) => c.questionKey !== '_categoryMain');

    const nextOrder = perScope.get(slug) ?? 0;
    perScope.set(slug, nextOrder + 1);

    await BriefQuestion.updateOne(
      { _id: q._id },
      { $set: { scope: 'main', scopeKey: slug, conditions: remaining, order: nextOrder } }
    );
    console.log(`  → ${q.questionKey.padEnd(22)} moved to main:${slug} (order ${nextOrder})`);
  }

  // Re-number what is left in the general brief so there are no gaps.
  const remainingGeneral = await BriefQuestion.find({ scope: 'general' }).sort({ order: 1 }).lean();
  let i = 0;
  for (const q of remainingGeneral as Array<Record<string, any>>) {
    await BriefQuestion.updateOne({ _id: q._id }, { $set: { order: i++ } });
  }
  console.log(`re-numbered ${remainingGeneral.length} general question(s)`);
}

/* ------------------------------------------------------------------ */
/* 1b — put each category's questions in a sensible order              */
/* ------------------------------------------------------------------ */

/**
 * The move above preserves content but not sequence, so state the intended
 * reading order explicitly. Anything not listed keeps its current position
 * after the listed ones; admins can still drag-reorder afterwards.
 */
const CANONICAL_ORDER: Record<string, string[]> = {
  'hair-care': ['primaryHairType', 'hairCondition', 'scalpCondition', 'mainConcerns', 'desiredFinish'],
  'skin-care': ['skinType', 'skinConcerns', 'skinFinish'],
  'body-care': ['bodyConcerns', 'bodyGoal'],
  'sun-care': ['spfLevel', 'sunFormat', 'sunFeatures'],
  'baby-care': ['babyAge', 'babyConcerns'],
  makeup: ['makeupType', 'makeupCoverage', 'shadeFamily'],
  fragrance: ['fragranceType', 'scentFamily', 'fragranceIntensity'],
  hygiene: ['hygieneType', 'hygieneBenefits'],
  massage: ['massageFormat', 'massageEffect'],
  'oral-care': ['oralType', 'oralBenefits'],
};

async function applyCanonicalOrder() {
  for (const [scopeKey, keys] of Object.entries(CANONICAL_ORDER)) {
    let i = 0;
    for (const key of keys) {
      const res = await BriefQuestion.updateOne(
        { scope: 'main', scopeKey, questionKey: key },
        { $set: { order: i } }
      );
      if (res.matchedCount) i++;
    }
    if (i > 0) console.log(`  ordered ${i} question(s) for main:${scopeKey}`);
  }
}

/* ------------------------------------------------------------------ */
/* 2 — seed the development-type branching flows                       */
/* ------------------------------------------------------------------ */

type Seed = Record<string, unknown> & { questionKey: string };

const REFORMULATION: Seed[] = [
  {
    questionKey: 'reformExistingProduct',
    widget: 'upload',
    titleEn: 'Tell us about the existing product',
    titleAr: 'احكِ لنا عن المنتج الحالي',
    subtitleEn: 'Share whatever you have — the more we can see, the closer we can get.',
    subtitleAr: 'شارِكنا ما لديك — كلما رأينا أكثر، اقتربنا أكثر من هدفك.',
    accept: 'image/png,image/jpeg,image/webp,application/pdf',
    required: true,
    allowNote: true,
    options: [
      { value: 'product-photo', labelEn: 'Product photo', labelAr: 'صورة المنتج', slotRequired: true },
      { value: 'ingredient-list', labelEn: 'Ingredient list (INCI)', labelAr: 'قائمة المكونات', slotRequired: true },
      { value: 'existing-formula', labelEn: 'Existing formula', labelAr: 'التركيبة الحالية', description: 'Optional', descriptionAr: 'اختياري' },
    ],
  },
  {
    questionKey: 'reformReasons',
    widget: 'checkbox-list',
    titleEn: 'Why reformulate?',
    titleAr: 'لماذا إعادة التركيب؟',
    subtitleEn: 'Pick everything that applies. Add a note wherever the detail matters.',
    subtitleAr: 'اختر كل ما ينطبق. وأضف ملاحظة حيثما كانت التفاصيل مهمة.',
    required: true,
    allowNote: false,
    options: [
      { value: 'better-performance', labelEn: 'Better performance', labelAr: 'أداء أفضل', allowNote: true },
      { value: 'better-texture', labelEn: 'Better texture', labelAr: 'قوام أفضل', allowNote: true },
      { value: 'improve-stability', labelEn: 'Improve stability', labelAr: 'تحسين الثبات', allowNote: true },
      { value: 'cost-reduction', labelEn: 'Cost reduction', labelAr: 'خفض التكلفة', allowNote: true },
      {
        value: 'ingredient-replacement',
        labelEn: 'Ingredient replacement',
        labelAr: 'استبدال مكوّن',
        description: 'Tell us which ingredient',
        descriptionAr: 'أخبرنا بالمكوّن المقصود',
        allowNote: true,
        noteLabelEn: 'Which ingredient?',
        noteLabelAr: 'أي مكوّن؟',
      },
      { value: 'regulatory-update', labelEn: 'Regulatory update', labelAr: 'تحديث تنظيمي', allowNote: true },
      { value: 'improve-fragrance', labelEn: 'Improve fragrance', labelAr: 'تحسين الرائحة', allowNote: true },
      { value: 'improve-color', labelEn: 'Improve colour', labelAr: 'تحسين اللون', allowNote: true },
      { value: 'improve-claims', labelEn: 'Improve claims', labelAr: 'تحسين الادعاءات التسويقية', allowNote: true },
    ],
  },
  {
    questionKey: 'reformKeepSame',
    widget: 'chips-multi',
    titleEn: 'What should stay exactly the same?',
    titleAr: 'ما الذي يجب أن يبقى كما هو تمامًا؟',
    subtitleEn: 'Anything you pick here is locked — we will not touch it.',
    subtitleAr: 'كل ما تختاره هنا سيبقى دون تغيير.',
    required: false,
    allowNote: true,
    options: [
      { value: 'fragrance', labelEn: 'Fragrance', labelAr: 'الرائحة' },
      { value: 'texture', labelEn: 'Texture', labelAr: 'القوام' },
      { value: 'color', labelEn: 'Colour', labelAr: 'اللون' },
      { value: 'performance', labelEn: 'Performance', labelAr: 'الأداء' },
      { value: 'packaging', labelEn: 'Packaging', labelAr: 'التغليف' },
    ],
  },
  {
    questionKey: 'reformChangeWhat',
    widget: 'textarea',
    titleEn: 'What are you not happy with?',
    titleAr: 'ما الذي لا يعجبك في المنتج الحالي؟',
    subtitleEn: 'Be as specific as you like — this is the brief our chemists read first.',
    subtitleAr: 'كن محددًا قدر ما تشاء — هذا أول ما يقرأه الكيميائيون لدينا.',
    required: true,
    allowNote: false,
    options: [],
  },
];

const BENCHMARK: Seed[] = [
  {
    questionKey: 'benchmarkUpload',
    widget: 'upload',
    titleEn: 'Show us the benchmark product',
    titleAr: 'أرِنا المنتج المرجعي',
    subtitleEn: 'A photo of the pack and its ingredient list is usually enough to start.',
    subtitleAr: 'صورة للعبوة وقائمة المكونات تكفي عادةً للبدء.',
    accept: 'image/png,image/jpeg,image/webp,application/pdf',
    required: true,
    allowNote: true,
    options: [
      { value: 'benchmark-photo', labelEn: 'Product photo', labelAr: 'صورة المنتج', slotRequired: true },
      { value: 'benchmark-inci', labelEn: 'Ingredient list (INCI)', labelAr: 'قائمة المكونات', description: 'Optional', descriptionAr: 'اختياري' },
    ],
  },
  {
    questionKey: 'benchmarkLikes',
    widget: 'chips-multi',
    titleEn: 'What do you like about this product?',
    titleAr: 'ما الذي يعجبك في هذا المنتج؟',
    subtitleEn: 'Pick everything worth keeping.',
    subtitleAr: 'اختر كل ما يستحق الحفاظ عليه.',
    required: true,
    allowNote: true,
    options: [
      { value: 'texture', labelEn: 'Texture', labelAr: 'القوام' },
      { value: 'fragrance', labelEn: 'Fragrance', labelAr: 'الرائحة' },
      { value: 'spreadability', labelEn: 'Spreadability', labelAr: 'سهولة التوزيع' },
      { value: 'absorption', labelEn: 'Absorption', labelAr: 'سرعة الامتصاص' },
      { value: 'finish', labelEn: 'Finish', labelAr: 'اللمسة النهائية' },
      { value: 'foam', labelEn: 'Foam', labelAr: 'الرغوة' },
      { value: 'color', labelEn: 'Colour', labelAr: 'اللون' },
      { value: 'packaging', labelEn: 'Packaging', labelAr: 'التغليف' },
      { value: 'performance', labelEn: 'Performance', labelAr: 'الأداء' },
      { value: 'everything', labelEn: 'Everything', labelAr: 'كل شيء' },
    ],
  },
  {
    questionKey: 'benchmarkImprove',
    widget: 'chips-multi',
    titleEn: 'What would you improve?',
    titleAr: 'ما الذي تودّ تحسينه؟',
    subtitleEn: 'Optional — leave it blank if the benchmark is already where you want it.',
    subtitleAr: 'اختياري — اتركه فارغًا إذا كان المنتج المرجعي مناسبًا كما هو.',
    required: false,
    allowNote: true,
    options: [
      { value: 'better-fragrance', labelEn: 'Better fragrance', labelAr: 'رائحة أفضل' },
      { value: 'better-hydration', labelEn: 'Better hydration', labelAr: 'ترطيب أفضل' },
      { value: 'better-anti-hair-loss', labelEn: 'Better anti-hair-loss', labelAr: 'فعالية أعلى ضد تساقط الشعر' },
      { value: 'more-natural', labelEn: 'More natural', labelAr: 'مكونات طبيعية أكثر' },
      { value: 'lower-cost', labelEn: 'Lower cost', labelAr: 'تكلفة أقل' },
      { value: 'better-appearance', labelEn: 'Better appearance', labelAr: 'مظهر أفضل' },
      { value: 'faster-absorption', labelEn: 'Faster absorption', labelAr: 'امتصاص أسرع' },
    ],
  },
  {
    questionKey: 'benchmarkApproach',
    widget: 'cards',
    titleEn: 'How close should we stay?',
    titleAr: 'ما مدى القرب الذي تريده من المنتج المرجعي؟',
    required: true,
    allowNote: true,
    options: [
      {
        value: 'match-closely',
        labelEn: 'Match as closely as possible',
        labelAr: 'مطابقة قدر الإمكان',
        description: 'A faithful recreation of the reference.',
        descriptionAr: 'إعادة إنتاج أمينة للمنتج المرجعي.',
      },
      {
        value: 'match-improve',
        labelEn: 'Match and improve',
        labelAr: 'مطابقة مع تحسين',
        description: 'Keep what works, fix what does not.',
        descriptionAr: 'الحفاظ على ما ينجح وإصلاح ما دون ذلك.',
      },
      {
        value: 'inspired',
        labelEn: 'Create an inspired version',
        labelAr: 'نسخة مستوحاة',
        description: 'Same spirit, our own formulation.',
        descriptionAr: 'نفس الروح، بتركيبة من عندنا.',
      },
    ],
  },
];

async function seedBranchFlows() {
  const dev = await BriefQuestion.findOne({ scope: 'general', questionKey: 'developmentType' }).lean();
  if (!dev) {
    console.warn('! developmentType question not found — skipping branch seeding');
    return;
  }
  const baseOrder = (dev as { order: number }).order;

  const groups: Array<{ value: string; seeds: Seed[] }> = [
    { value: 'reformulation', seeds: REFORMULATION },
    { value: 'benchmark', seeds: BENCHMARK },
  ];

  // Insert the branch questions immediately after developmentType by shifting
  // everything below them down.
  const shift = REFORMULATION.length + BENCHMARK.length;
  await BriefQuestion.updateMany(
    { scope: 'general', order: { $gt: baseOrder } },
    { $inc: { order: shift } }
  );

  let order = baseOrder + 1;
  for (const group of groups) {
    for (const seed of group.seeds) {
      const doc = {
        ...seed,
        scope: 'general',
        scopeKey: '',
        order: order++,
        active: true,
        conditions: [{ questionKey: 'developmentType', value: [group.value] }],
      };
      const res = await BriefQuestion.updateOne(
        { scope: 'general', scopeKey: '', questionKey: seed.questionKey },
        { $set: doc },
        { upsert: true }
      );
      console.log(
        `  ${res.upsertedCount ? '+ created' : '~ updated'} ${seed.questionKey} (${group.value}, order ${doc.order})`
      );
    }
  }
}

/* ------------------------------------------------------------------ */

async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('ERROR: MONGODB_URI not found in .env.local');
    process.exit(1);
  }
  await mongoose.connect(uri);
  console.log('connected.\n');

  console.log('— step 1: move category questions —');
  await moveCategoryQuestions();

  console.log('\n— step 1b: canonical order per category —');
  await applyCanonicalOrder();

  console.log('\n— step 2: seed development-type branches —');
  await seedBranchFlows();

  console.log('\n— result —');
  const counts = await BriefQuestion.collection
    .aggregate([
      { $group: { _id: { scope: '$scope', scopeKey: '$scopeKey' }, n: { $sum: 1 } } },
      { $sort: { '_id.scope': 1, '_id.scopeKey': 1 } },
    ])
    .toArray();
  for (const c of counts) {
    console.log(`  ${String(c._id.scope).padEnd(8)} ${String(c._id.scopeKey || '—').padEnd(14)} ${c.n}`);
  }

  await mongoose.disconnect();
  console.log('\ndone.');
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
