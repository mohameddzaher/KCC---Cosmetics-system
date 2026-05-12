/**
 * Non-destructive migration:
 *  - Ensures `productCategory` brief question exists at order 5,
 *    bumping later questions (primaryHairType … desiredFinish) to 6–13.
 *  - Ensures `fragrance-intensity` spec category exists with Light/Medium/Strong.
 *
 * Runs against the live DB (MONGODB_URI from .env.local). Idempotent — run twice
 * and the second run reports "already up to date".
 *
 * Usage: npx tsx scripts/migrate-add-product-category-and-intensity.ts
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') });

import mongoose from 'mongoose';
import BriefQuestion from '../src/models/BriefQuestion';
import SpecOptionMaster from '../src/models/SpecOptionMaster';

const PRODUCT_CATEGORY_QUESTION = {
  questionKey: 'productCategory',
  order: 5,
  widget: 'cards' as const,
  titleEn: 'What category is this product for?',
  titleAr: 'المنتج لأي فئة؟',
  subtitleEn: 'Pick the lane — the next questions adapt to what you choose.',
  subtitleAr: 'اختار المسار — الأسئلة الجاية بتتكيّف على اختيارك.',
  required: true,
  active: true,
  allowNote: true,
  category: 'general' as const,
  options: [
    { value: 'hair-care', labelEn: 'Hair', labelAr: 'العناية بالشعر', description: 'Shampoo, conditioner, masks, styling, serums.' },
    { value: 'skin-care', labelEn: 'Skin', labelAr: 'العناية بالبشرة', description: 'Moisturizers, cleansers, serums, masks.' },
    { value: 'sun-care', labelEn: 'Sun', labelAr: 'العناية من الشمس', description: 'Sunscreens and after-sun care.' },
    { value: 'baby-care', labelEn: 'Baby', labelAr: 'العناية بالأطفال', description: 'Gentle, dermatologically-tested formulas.' },
  ],
};

// Keys that need to shift from N to N+1 when we insert productCategory at 5.
const SHIFT_KEYS_IN_ORDER = [
  'primaryHairType',   // 5 -> 6
  'hairCondition',     // 6 -> 7
  'scalpCondition',    // 7 -> 8
  'mainConcerns',      // 8 -> 9
  'marketingClaims',   // 9 -> 10
  'heroIngredient',    // 10 -> 11
  'preferredTexture',  // 11 -> 12
  'desiredFinish',     // 12 -> 13
];

const FRAGRANCE_INTENSITY = {
  categoryKey: 'fragrance-intensity',
  defaultTitleEn: 'Fragrance intensity',
  defaultTitleAr: 'قوة الرائحة',
  defaultSubtitleEn: 'How strong should the scent be on the final product?',
  defaultSubtitleAr: 'قد إيه تكون الرائحة قوية في المنتج النهائي؟',
  widget: 'chips-single',
  options: [
    { value: 'light', labelEn: 'Light', labelAr: 'خفيفة' },
    { value: 'medium', labelEn: 'Medium', labelAr: 'متوسطة' },
    { value: 'strong', labelEn: 'Strong / Long-lasting', labelAr: 'قوية / تدوم طويلاً' },
  ],
};

async function migrate() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('ERROR: MONGODB_URI not set');
    process.exit(1);
  }

  console.log('Connecting to MongoDB…');
  await mongoose.connect(uri);
  console.log('Connected.\n');

  /* ─── Brief questions ─── */
  const existing = await BriefQuestion.findOne({ questionKey: 'productCategory' });
  if (existing) {
    console.log('✓ productCategory already exists — skipping insert.');
  } else {
    console.log('→ Inserting productCategory at order 5…');

    // Bump downstream questions BEFORE inserting (highest order first to avoid collisions on a unique-ish index).
    // We iterate in reverse so 12→13 happens before 11→12, etc.
    const reversed = [...SHIFT_KEYS_IN_ORDER].reverse();
    for (const key of reversed) {
      const q = await BriefQuestion.findOne({ questionKey: key });
      if (q && q.order < q.order + 1 + 100) {
        // Bump by +1 if it is currently sitting at its old order (or earlier).
        const oldOrder = q.order;
        const newOrder = oldOrder + 1;
        await BriefQuestion.updateOne({ _id: q._id }, { $set: { order: newOrder } });
        console.log(`  ${key}: ${oldOrder} → ${newOrder}`);
      }
    }

    await BriefQuestion.create(PRODUCT_CATEGORY_QUESTION);
    console.log('  ✓ productCategory inserted.');
  }

  /* ─── Fragrance intensity spec ─── */
  const fi = await SpecOptionMaster.findOne({ categoryKey: 'fragrance-intensity' });
  if (fi) {
    console.log('✓ fragrance-intensity spec category already exists — skipping.');
  } else {
    console.log('→ Inserting fragrance-intensity spec category…');
    await SpecOptionMaster.create(FRAGRANCE_INTENSITY);
    console.log('  ✓ fragrance-intensity inserted.');
  }

  /* ─── Final state report ─── */
  console.log('\n── Brief Questions (after) ──');
  const all = await BriefQuestion.find().sort({ order: 1 }).lean();
  for (const q of all) {
    console.log(`  ${String(q.order).padStart(2, ' ')}. ${q.questionKey} ${q.active ? '' : '(hidden)'}`);
  }

  console.log('\n── Spec Categories (after) ──');
  const cats = await SpecOptionMaster.find().sort({ categoryKey: 1 }).lean();
  for (const c of cats) {
    console.log(`  - ${c.categoryKey}`);
  }

  await mongoose.disconnect();
  console.log('\nDone.');
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
